/**
 * Monta um vídeo de exemplo no navegador: o personagem ilustrado faz o papel
 * da gravação e o motor de edição da TRIBUNA (lib/browser-editor) aplica
 * título, legendas, grafismos, transições, trilha e efeitos sonoros.
 * Rodado por scripts/gerar-exemplos.mjs (Chromium sem tela).
 */
import { ArrayBufferTarget, Muxer } from "mp4-muxer";
import { ADVOGADOS, exemplos } from "@/content/exemplos";
import { createPainter } from "@/lib/browser-editor/draw";
import { loadFonts } from "@/lib/browser-editor/fonts";
import { defaultsFor, lookFor } from "@/lib/browser-editor/looks";
import { planMotion, type PlannedMoment } from "@/lib/browser-editor/motion";
import { renderAudio } from "@/lib/browser-editor/render";
import { STYLE_MOOD } from "@/lib/browser-editor/sound";
import { markKeywords } from "@/lib/browser-editor/timeline";
import type { EditOptions, Word } from "@/lib/browser-editor/types";
import { createPersonaPainter, HELENA, RAFAEL } from "./personagem";

const W = 720;
const H = 1280;
const FPS = 30;
const US = 1_000_000;
const TOTAL = 10;

function timeline(fala: string, start: number): Word[] {
  const out: Word[] = [];
  let t = start;
  for (const text of fala.split(/\s+/).filter(Boolean)) {
    const len = 0.14 + text.replace(/[^\p{L}\p{N}]/gu, "").length * 0.04;
    out.push({ text, start: t, end: t + len * 0.9 });
    t += len + (/[.?!]$/.test(text) ? 0.26 : /,$/.test(text) ? 0.1 : 0);
  }
  return out;
}

async function compor(id: string) {
  const ex = exemplos.find((e) => e.id === id);
  if (!ex) throw new Error(`exemplo ${id} não existe`);
  await loadFonts(["Sora", "Manrope", "Instrument Serif"]);
  const lawyer = ADVOGADOS[ex.lawyer];
  const style = ex.style;
  const base = defaultsFor(style);
  const look = lookFor({ style, captionStyle: base.captionStyle });
  const vignette = style === "institucional" || style === "cinematografico";
  const outroDur = vignette ? 2.8 : 0;
  const bodyDur = TOTAL - outroDur;
  const words = markKeywords(timeline(ex.fala, 0.4), ex.destaques);
  const opts: EditOptions = {
    ...base,
    style,
    ratios: ["9:16"],
    name: lawyer.name,
    office: lawyer.office,
    oab: "",
    hook: true,
    hookText: ex.title,
    cta: Boolean(ex.cta),
    ctaText: ex.cta ?? "",
    vignette,
    effects: true,
    music: true,
    logo: null,
    script: "",
    framing: {},
  };
  const moments: PlannedMoment[] = [];
  for (const m of ex.momentos) {
    const w = words.find((x) => x.text === m.palavra || x.text.replace(/[^\p{L}\p{N}%]/gu, "") === m.palavra.replace(/[^\p{L}\p{N}%]/gu, ""));
    if (w) moments.push({ at: w.start, kind: m.tipo, text: m.texto, icon: m.icone, value: m.valor });
  }
  const ctaInBody = opts.cta && !vignette;
  const motion = planMotion({ words, moments, keep: [{ start: 0, end: bodyDur }], bodyDur, introDur: 0, outroDur, look, opts, hasTitle: true, ctaInBody });
  const painter = createPainter({
    ratio: "9:16",
    W,
    H,
    look,
    opts,
    words,
    title: ex.title,
    cta: opts.ctaText,
    logo: null,
    srcW: W,
    srcH: H,
    face: { x: 0.5, y: 0.36 },
    introDur: 0,
    outroDur,
    bodyDur,
    zoomCuts: [0, 3.2, ...motion.punches].sort((a, b) => a - b),
    motion,
  });
  const persona = createPersonaPainter(W, H, ex.lawyer === "helena" ? HELENA : RAFAEL, {
    words: words.map((w) => ({ start: w.start, end: w.end })),
    emphasis: moments.map((m) => m.at),
  });

  // áudio: trilha do estilo e efeitos (o exemplo não tem voz)
  const audio = await renderAudio(null, [{ start: 0, end: bodyDur }], false, null, {
    music: { mood: STYLE_MOOD[style], seed: id.length * 7 + 3 },
    cues: motion.cues,
    sfxLevel: look.motion.sfxLevel * 1.3,
    voice: [],
    introDur: 0,
    outroDur,
    total: TOTAL,
  });

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: "vp9", width: W, height: H, frameRate: FPS },
    audio: { codec: "opus", numberOfChannels: 1, sampleRate: audio.sampleRate },
    fastStart: "in-memory",
    firstTimestampBehavior: "offset",
  });
  const aenc = new AudioEncoder({ output: (c, m) => muxer.addAudioChunk(c, m), error: (e) => console.error(e) });
  aenc.configure({ codec: "opus", sampleRate: audio.sampleRate, numberOfChannels: 1, bitrate: 160_000 });
  const data = audio.getChannelData(0);
  const step = audio.sampleRate / 10;
  for (let i = 0; i < data.length; i += step) {
    const frames = data.slice(i, Math.min(data.length, i + step));
    const ad = new AudioData({ format: "f32-planar", sampleRate: audio.sampleRate, numberOfFrames: frames.length, numberOfChannels: 1, timestamp: Math.round((i / audio.sampleRate) * US), data: frames });
    aenc.encode(ad);
    ad.close();
  }
  await aenc.flush();

  const venc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: (e) => console.error(e) });
  venc.configure({ codec: "vp09.00.40.08", width: W, height: H, bitrate: 8_000_000, framerate: FPS });
  const out = document.createElement("canvas");
  out.width = W;
  out.height = H;
  const ctx = out.getContext("2d", { alpha: false })!;
  const src = document.createElement("canvas");
  src.width = W;
  src.height = H;
  const sctx = src.getContext("2d", { alpha: false })!;
  const frames = TOTAL * FPS;
  for (let k = 0; k < frames; k++) {
    const t = k / FPS;
    persona(sctx, t);
    if (t < bodyDur) painter.body(ctx, src, t);
    else painter.outro(ctx, src, t - bodyDur);
    const vf = new VideoFrame(out, { timestamp: Math.round((k * US) / FPS), duration: Math.round(US / FPS) });
    venc.encode(vf, { keyFrame: k % (FPS * 2) === 0 });
    vf.close();
    while (venc.encodeQueueSize > 6) await new Promise((r) => setTimeout(r, 5));
  }
  await venc.flush();
  muxer.finalize();
  const buf = new Uint8Array(muxer.target.buffer);
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return { b64: btoa(bin), beats: motion.beats.map((b) => `${b.kind}@${b.at.toFixed(1)}`) };
}

(window as unknown as { compor: typeof compor }).compor = compor;
