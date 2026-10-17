import { createPainter, type Painter, type Scene } from "@/lib/browser-editor/draw";
import { outputSize, seek } from "@/lib/browser-editor/framing";
import type { Look } from "@/lib/browser-editor/looks";
import type { Analysis, EditOptions, Plan, Ratio, RenderOutput, Word } from "@/lib/browser-editor/types";
import { fixWebmDuration } from "@/lib/browser-editor/webm-duration";

const FPS = 30;

/** Formatos de gravação em ordem de preferência (MP4 primeiro). */
export function pickMime(): { mime: string; ext: "mp4" | "webm" } | null {
  if (typeof MediaRecorder === "undefined") return null;
  const candidates: [string, "mp4" | "webm"][] = [
    ["video/mp4;codecs=avc1.640028,mp4a.40.2", "mp4"],
    ["video/mp4;codecs=avc1,mp4a.40.2", "mp4"],
    ["video/mp4;codecs=avc1", "mp4"],
    ["video/mp4", "mp4"],
    ["video/webm;codecs=vp9,opus", "webm"],
    ["video/webm;codecs=vp8,opus", "webm"],
    ["video/webm", "webm"],
  ];
  for (const [mime, ext] of candidates) if (MediaRecorder.isTypeSupported(mime)) return { mime, ext };
  return null;
}

export function canRenderHere(): string | null {
  if (typeof window === "undefined") return "indisponível";
  if (!pickMime()) return "Este navegador não grava vídeo. Use o Chrome, o Edge ou o Safari atualizados.";
  if (typeof HTMLCanvasElement.prototype.captureStream !== "function") return "Este navegador não grava vídeo a partir da tela. Use o Chrome, o Edge ou o Safari atualizados.";
  const w = window as unknown as { AudioContext?: unknown; webkitAudioContext?: unknown };
  if (!w.AudioContext && !w.webkitAudioContext) return "Este navegador não processa áudio. Use o Chrome, o Edge ou o Safari atualizados.";
  return null;
}

export function newAudioContext(): AudioContext {
  const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
  return new (w.AudioContext ?? w.webkitAudioContext)!();
}

interface Graph {
  src: MediaElementAudioSourceNode;
  fade: GainNode;
  dest: MediaStreamAudioDestinationNode;
  chain: AudioNode[];
}
const graphs = new WeakMap<HTMLVideoElement, Graph>();

/**
 * Liga o vídeo ao Web Audio (uma vez por elemento). Chame dentro do clique:
 * no iPhone o primeiro play precisa vir de um toque.
 */
export function primeVideo(ac: AudioContext, video: HTMLVideoElement) {
  if (graphs.has(video)) return;
  const src = ac.createMediaElementSource(video);
  const fade = ac.createGain();
  const dest = ac.createMediaStreamDestination();
  const mute = ac.createGain();
  mute.gain.value = 0;
  fade.connect(dest);
  fade.connect(mute);
  mute.connect(ac.destination);
  src.connect(fade);
  graphs.set(video, { src, fade, dest, chain: [] });
  video.muted = false;
  void ac.resume().catch(() => {});
  const p = video.play();
  if (p) p.then(() => video.pause()).catch(() => {});
}

/** Filtro de voz: corta grave de ruído, dá presença, nivela, normaliza e limita os picos. */
export function voiceChain(ac: BaseAudioContext, speechDb: number | null): { input: AudioNode; output: AudioNode; nodes: AudioNode[] } {
  const hp = ac.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 85;
  const presence = ac.createBiquadFilter();
  presence.type = "peaking";
  presence.frequency.value = 3200;
  presence.Q.value = 0.9;
  presence.gain.value = 2.5;
  const level = ac.createGain();
  level.gain.value = 10 ** (Math.max(-6, Math.min(14, -21 - (speechDb ?? -21))) / 20);
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -20;
  comp.knee.value = 8;
  comp.ratio.value = 3.2;
  comp.attack.value = 0.004;
  comp.release.value = 0.2;
  const makeup = ac.createGain();
  makeup.gain.value = 1.2;
  // limitador: segura os picos abaixo de -1 dBFS
  const limiter = ac.createDynamicsCompressor();
  limiter.threshold.value = -3;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.001;
  limiter.release.value = 0.08;
  const ceiling = ac.createGain();
  ceiling.gain.value = 0.89;
  hp.connect(presence);
  presence.connect(level);
  level.connect(comp);
  comp.connect(makeup);
  makeup.connect(limiter);
  limiter.connect(ceiling);
  return { input: hp, output: ceiling, nodes: [hp, presence, level, comp, makeup, limiter, ceiling] };
}

function setupChain(ac: AudioContext, g: Graph, enhance: boolean, speechDb: number | null) {
  g.src.disconnect();
  for (const n of g.chain) n.disconnect();
  g.chain = [];
  if (!enhance) {
    g.src.connect(g.fade);
    return;
  }
  const chain = voiceChain(ac, speechDb);
  g.src.connect(chain.input);
  chain.output.connect(g.fade);
  g.chain = chain.nodes;
}

/** Duração da vinheta de abertura e do encerramento (0 quando não há). */
export function bookends(opts: EditOptions, title: string, cta: string) {
  const introText = opts.name.trim() || (opts.hook ? title : "");
  return {
    introDur: opts.vignette && introText ? 1.7 : 0,
    outroDur: opts.vignette && (opts.name.trim() || (opts.cta && cta)) ? 2.6 : 0,
  };
}

/** Canvas e desenhista de um formato de saída. */
export function stage(p: Pick<RenderParams, "analysis" | "plan" | "opts" | "look" | "words" | "title" | "cta" | "logo">, ratio: Ratio) {
  const { analysis: a, plan, opts } = p;
  const { introDur, outroDur } = bookends(opts, p.title, p.cta);
  const { width, height } = outputSize(ratio, opts.ratios.length);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: false })!;
  const scene: Scene = {
    ratio,
    W: width,
    H: height,
    look: p.look,
    opts,
    words: p.words,
    title: p.title,
    cta: p.cta,
    logo: p.logo,
    srcW: a.width,
    srcH: a.height,
    face: opts.framing[ratio] ?? a.face,
    introDur,
    outroDur,
    bodyDur: plan.bodyDuration,
    zoomCuts: zoomCuts(plan, p.words),
  };
  const painter: Painter = createPainter(scene);
  return { canvas, ctx, painter, width, height };
}

export interface RenderParams {
  video: HTMLVideoElement;
  ac: AudioContext;
  analysis: Analysis;
  plan: Plan;
  opts: EditOptions;
  look: Look;
  /** Palavras no tempo de saída do corpo. */
  words: Word[];
  title: string;
  cta: string;
  logo: CanvasImageSource | null;
  signal: AbortSignal;
  onCanvas?: (canvas: HTMLCanvasElement, ratio: Ratio) => void;
  onProgress: (fraction: number) => void;
  /** Pede um toque à pessoa quando o navegador bloqueia o play; roda `fn` dentro do toque. */
  requestGesture: (fn: () => void) => Promise<void>;
}

const nextFrame = () => new Promise<number>((r) => requestAnimationFrame(r));

export function abortError() {
  return new DOMException("Edição cancelada", "AbortError");
}

export async function waitVisible(signal: AbortSignal) {
  while (document.hidden) {
    if (signal.aborted) throw abortError();
    await new Promise((r) => setTimeout(r, 250));
  }
}

export async function loadFonts(look: Look) {
  const fams = new Set([look.captions.font, look.titleFont, "Sora", "Manrope", "Instrument Serif"]);
  try {
    await Promise.all(
      [...fams].flatMap((f) => [document.fonts.load(`800 48px "${f}"`), document.fonts.load(`italic 400 48px "${f}"`), document.fonts.load(`700 48px "${f}"`)]),
    );
  } catch {
    // sem a fonte, o navegador usa a substituta
  }
}

/** Instantes em que o zoom muda: início de cada trecho e, em trechos longos, a cada ~5 s numa pausa entre palavras. */
export function zoomCuts(plan: Plan, words: Word[]) {
  const cuts: number[] = [];
  let acc = 0;
  for (const k of plan.keep) {
    cuts.push(acc);
    const len = k.end - k.start;
    let last = acc;
    for (const w of words) {
      if (w.start <= last + 4.5 || w.start >= acc + len - 1.5) continue;
      cuts.push(w.start);
      last = w.start;
    }
    acc += len;
  }
  return [...new Set(cuts)].sort((a, b) => a - b);
}

/**
 * Edita de verdade: toca só os trechos que ficam, desenha cada quadro com
 * enquadramento, legendas e grafismos em um canvas por formato e grava com o
 * MediaRecorder (pausando a gravação enquanto pula os cortes).
 */
export async function render(p: RenderParams): Promise<RenderOutput[]> {
  const picked = pickMime();
  if (!picked) throw new Error("Este navegador não grava vídeo.");
  const { video, ac, analysis: a, plan, opts, look, signal } = p;
  const g = graphs.get(video);
  if (!g) throw new Error("vídeo não preparado");
  setupChain(ac, g, opts.enhanceAudio, a.speechDb);
  await loadFonts(look);

  const { introDur, outroDur } = bookends(opts, p.title, p.cta);
  const total = introDur + plan.bodyDuration + outroDur;

  const outs = opts.ratios.map((ratio) => {
    const { canvas, ctx, painter, width, height } = stage(p, ratio);
    const stream = canvas.captureStream(FPS);
    const track = g.dest.stream.getAudioTracks()[0];
    if (track) stream.addTrack(track.clone());
    const bits = Math.round(Math.min(9_000_000, Math.max(2_500_000, width * height * FPS * 0.13)));
    const rec = new MediaRecorder(stream, { mimeType: picked.mime, videoBitsPerSecond: bits, audioBitsPerSecond: 160_000 });
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => {
      if (e.data && e.data.size) chunks.push(e.data);
    };
    p.onCanvas?.(canvas, ratio);
    return { ratio, canvas, ctx, painter, rec, chunks, stream, width, height };
  });

  const pauseAll = () => outs.forEach((o) => o.rec.state === "recording" && o.rec.pause());
  const resumeAll = () => outs.forEach((o) => o.rec.state === "paused" && o.rec.resume());
  const fadeTo = (v: number, tc: number) => {
    g.fade.gain.cancelScheduledValues(ac.currentTime);
    g.fade.gain.setTargetAtTime(v, ac.currentTime, tc);
  };

  async function ensurePlaying() {
    if (ac.state !== "running") await ac.resume().catch(() => {});
    try {
      await video.play();
    } catch {
      await p.requestGesture(() => {
        void ac.resume();
        void video.play().catch(() => {});
      });
      for (let i = 0; i < 40 && video.paused; i++) await new Promise((r) => setTimeout(r, 50));
      if (video.paused) await video.play();
    }
    if (ac.state !== "running") {
      await p.requestGesture(() => void ac.resume());
    }
  }

  /** Quadros parados (vinheta e encerramento) por `dur` segundos. */
  async function hold(dur: number, base: number, draw: (o: (typeof outs)[number], t: number) => void) {
    for (const o of outs) draw(o, 0);
    await nextFrame();
    resumeAll();
    let start = performance.now();
    for (;;) {
      if (signal.aborted) throw abortError();
      if (document.hidden) {
        const pausedAt = performance.now();
        pauseAll();
        await waitVisible(signal);
        resumeAll();
        start += performance.now() - pausedAt;
      }
      const t = Math.min(dur, (performance.now() - start) / 1000);
      for (const o of outs) draw(o, t);
      p.onProgress((base + t) / total);
      if (t >= dur) {
        await nextFrame();
        pauseAll();
        return;
      }
      await nextFrame();
    }
  }

  video.muted = false;
  video.volume = 1;
  video.playbackRate = 1;
  fadeTo(0, 0.005);
  await seek(video, plan.keep[0].start);
  if (signal.aborted) throw abortError();
  // a gravação só corre enquanto há quadro novo: pausada nos saltos entre trechos
  for (const o of outs) {
    o.rec.start(1000);
    o.rec.pause();
  }

  try {
    if (introDur) await hold(introDur, 0, (o, t) => o.painter.intro(o.ctx, video, t));

    let bodyAt = 0;
    for (let i = 0; i < plan.keep.length; i++) {
      const seg = plan.keep[i];
      if (i > 0) await seek(video, seg.start);
      // primeiro quadro do trecho já desenhado antes de tocar
      for (const o of outs) o.painter.body(o.ctx, video, bodyAt);
      await ensurePlaying();
      resumeAll();
      fadeTo(1, 0.012);
      let faded = false;
      for (;;) {
        if (signal.aborted) throw abortError();
        if (document.hidden) {
          video.pause();
          pauseAll();
          await waitVisible(signal);
          await ensurePlaying();
          resumeAll();
        }
        const ct = video.currentTime;
        const t = bodyAt + Math.max(0, Math.min(seg.end, ct) - seg.start);
        for (const o of outs) o.painter.body(o.ctx, video, t);
        p.onProgress((introDur + t) / total);
        if (!faded && ct >= seg.end - 0.035) {
          fadeTo(0, 0.008);
          faded = true;
        }
        if (ct >= seg.end - 0.5 / FPS || video.ended) break;
        await nextFrame();
      }
      pauseAll();
      video.pause();
      fadeTo(0, 0.005);
      bodyAt += seg.end - seg.start;
    }

    if (outroDur) await hold(outroDur, introDur + plan.bodyDuration, (o, t) => o.painter.outro(o.ctx, video, t));
  } catch (e) {
    video.pause();
    for (const o of outs) if (o.rec.state !== "inactive") o.rec.stop();
    for (const o of outs) o.stream.getTracks().forEach((t) => t.stop());
    throw e;
  }

  const blobs = await Promise.all(
    outs.map(
      (o) =>
        new Promise<Blob>((resolve) => {
          o.rec.onstop = () => resolve(new Blob(o.chunks, { type: picked.mime.split(";")[0] }));
          o.rec.stop();
        }),
    ),
  );
  for (const o of outs) o.stream.getTracks().forEach((t) => t.stop());
  p.onProgress(1);

  const results: RenderOutput[] = [];
  for (let i = 0; i < outs.length; i++) {
    const blob = picked.ext === "webm" ? await fixWebmDuration(blobs[i], total) : blobs[i];
    results.push({
      ratio: outs[i].ratio,
      blob,
      url: URL.createObjectURL(blob),
      mime: blob.type,
      ext: picked.ext,
      width: outs[i].width,
      height: outs[i].height,
      duration: total,
    });
  }
  return results;
}
