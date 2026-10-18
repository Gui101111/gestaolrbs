import { ArrayBufferTarget, Muxer } from "mp4-muxer";
import { outputSize, seek } from "@/lib/browser-editor/framing";
import { abortError, bookends, loadFonts, renderAudio, soundtrackFor, stage, waitVisible, type RenderParams } from "@/lib/browser-editor/render";
import type { Ratio, RenderOutput } from "@/lib/browser-editor/types";

/**
 * Exportação quadro a quadro com WebCodecs: cada quadro de saída (30 fps)
 * é desenhado e codificado com o tempo exato, e o áudio é montado à parte
 * (OfflineAudioContext), já com os cortes. Aparelho lento só demora mais;
 * o vídeo sai sem quadro perdido e com som em sincronia.
 */

const FPS = 30;
const US = 1_000_000;

type VideoPick = { codec: string; mux: "avc" | "vp9" };
type AudioPick = { codec: string; mux: "aac" | "opus" };

const VIDEO_CODECS: VideoPick[] = [
  { codec: "avc1.640028", mux: "avc" },
  { codec: "avc1.4d0028", mux: "avc" },
  { codec: "avc1.42002a", mux: "avc" },
  { codec: "vp09.00.40.08", mux: "vp9" },
];
const AUDIO_CODECS: AudioPick[] = [
  { codec: "mp4a.40.2", mux: "aac" },
  { codec: "opus", mux: "opus" },
];

export interface EncodePlan {
  video: VideoPick;
  audio: AudioPick | null;
}

/** O navegador codifica MP4 sozinho? Escolhe H.264 (ou VP9) e AAC (ou Opus). */
export async function encodeSupport(ratios: Ratio[], audioRate: number | null): Promise<EncodePlan | null> {
  if (typeof VideoEncoder === "undefined" || typeof VideoFrame === "undefined") return null;
  let video: VideoPick | null = null;
  for (const v of VIDEO_CODECS) {
    try {
      const all = await Promise.all(
        ratios.map(async (r) => {
          const { width, height } = outputSize(r, ratios.length);
          return (await VideoEncoder.isConfigSupported({ codec: v.codec, width, height, bitrate: 6_000_000, framerate: FPS })).supported;
        }),
      );
      if (all.every(Boolean)) {
        video = v;
        break;
      }
    } catch {
      // próximo codec
    }
  }
  if (!video) return null;
  if (audioRate === null) return { video, audio: null };
  if (typeof AudioEncoder === "undefined" || typeof AudioData === "undefined") return null;
  for (const a of AUDIO_CODECS) {
    try {
      if ((await AudioEncoder.isConfigSupported({ codec: a.codec, sampleRate: audioRate, numberOfChannels: 1, bitrate: 128_000 })).supported) return { video, audio: a };
    } catch {
      // próximo codec
    }
  }
  return null;
}

/** Espera o próximo quadro apresentado pelo vídeo (ou desiste em 600 ms). */
function nextVideoFrame(video: HTMLVideoElement): Promise<number> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (t: number) => {
      if (done) return;
      done = true;
      resolve(t);
    };
    const v = video as HTMLVideoElement & { requestVideoFrameCallback?: (cb: (now: number, meta: { mediaTime: number }) => void) => number };
    if (typeof v.requestVideoFrameCallback === "function") v.requestVideoFrameCallback((_, meta) => finish(meta.mediaTime));
    else requestAnimationFrame(() => finish(video.currentTime));
    window.setTimeout(() => finish(video.currentTime), 600);
  });
}

export async function encode(p: RenderParams, plan: EncodePlan): Promise<RenderOutput[]> {
  const { video, analysis: a, plan: cut, opts, signal } = p;
  await loadFonts(p.look);
  const { introDur, outroDur } = bookends(opts, p.title, p.cta);
  const totalFrames = Math.round((introDur + cut.bodyDuration + outroDur) * FPS);
  const introFrames = Math.round(introDur * FPS);
  const bodyFrames = Math.round(cut.bodyDuration * FPS);

  // 1) Áudio: montado e codificado antes do vídeo (rápido, não depende de tocar nada)
  const audioChunks: { chunk: EncodedAudioChunk; meta?: EncodedAudioChunkMetadata }[] = [];
  const sound = soundtrackFor(p);
  const hasAudio = Boolean(plan.audio && (a.pcm || sound.music || sound.sfxLevel > 0));
  const audioRate = a.pcm?.rate ?? 48_000;
  if (plan.audio && hasAudio) {
    const rendered = await renderAudio(a.pcm, cut.keep, opts.enhanceAudio, a.speechDb, sound);
    if (signal.aborted) throw abortError();
    const enc = new AudioEncoder({ output: (chunk, meta) => audioChunks.push({ chunk, meta }), error: (e) => console.error("[audio]", e) });
    enc.configure({ codec: plan.audio.codec, sampleRate: rendered.sampleRate, numberOfChannels: 1, bitrate: 128_000 });
    const data = rendered.getChannelData(0);
    const step = rendered.sampleRate / 10;
    for (let i = 0; i < data.length; i += step) {
      const frames = data.slice(i, Math.min(data.length, i + step));
      const ad = new AudioData({ format: "f32-planar", sampleRate: rendered.sampleRate, numberOfFrames: frames.length, numberOfChannels: 1, timestamp: Math.round((i / rendered.sampleRate) * US), data: frames });
      enc.encode(ad);
      ad.close();
    }
    await enc.flush();
    enc.close();
  }

  // 2) Vídeo: um canvas, um codificador e um MP4 por formato
  const outs = opts.ratios.map((ratio) => {
    const st = stage(p, ratio);
    const muxer = new Muxer({
      target: new ArrayBufferTarget(),
      video: { codec: plan.video.mux, width: st.width, height: st.height, frameRate: FPS },
      audio: plan.audio && hasAudio ? { codec: plan.audio.mux, numberOfChannels: 1, sampleRate: audioRate } : undefined,
      fastStart: "in-memory",
      firstTimestampBehavior: "offset",
    });
    let failure: unknown = null;
    const encoder = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: (e) => (failure = e) });
    encoder.configure({
      codec: plan.video.codec,
      width: st.width,
      height: st.height,
      bitrate: Math.round(Math.min(9_000_000, Math.max(2_500_000, st.width * st.height * FPS * 0.13))),
      framerate: FPS,
      latencyMode: "quality",
      ...(plan.video.mux === "avc" ? { avc: { format: "avc" as const } } : {}),
    });
    p.onCanvas?.(st.canvas, ratio);
    return { ratio, ...st, muxer, encoder, failed: () => failure };
  });

  let frame = 0;
  const emit = async (draw: (o: (typeof outs)[number]) => void) => {
    for (const o of outs) {
      draw(o);
      const vf = new VideoFrame(o.canvas, { timestamp: Math.round((frame * US) / FPS), duration: Math.round(US / FPS) });
      o.encoder.encode(vf, { keyFrame: frame % (FPS * 2) === 0 });
      vf.close();
      const err = o.failed();
      if (err) throw err instanceof Error ? err : new Error("O codificador de vídeo falhou.");
    }
    frame++;
    p.onProgress(frame / totalFrames);
  };
  /** Segura o ritmo: espera os codificadores esvaziarem a fila. Devolve true se precisou esperar. */
  const drain = async () => {
    let waited = false;
    while (outs.some((o) => o.encoder.encodeQueueSize > 4)) {
      waited = true;
      await new Promise((r) => setTimeout(r, 8));
    }
    return waited;
  };

  video.muted = true;
  video.playbackRate = 1;
  await seek(video, cut.keep[0].start);

  try {
    // vinheta de abertura
    for (let i = 0; i < introFrames; i++) {
      if (signal.aborted) throw abortError();
      await emit((o) => o.painter.intro(o.ctx, video, i / FPS));
      await drain();
      if (i % 6 === 0) await new Promise((r) => requestAnimationFrame(r));
    }

    // corpo: toca cada trecho (mudo) e grava os quadros que caem nele
    let bodyAt = 0;
    let k = 0;
    let rate = 1;
    for (const seg of cut.keep) {
      const len = seg.end - seg.start;
      const endK = Math.min(bodyFrames, Math.round((bodyAt + len) * FPS));
      const need = () => seg.start + (k / FPS - bodyAt);
      await seek(video, Math.min(seg.end, need()));
      let media = video.currentTime;
      while (k < endK) {
        if (signal.aborted) throw abortError();
        if (document.hidden) {
          video.pause();
          await waitVisible(signal);
          await seek(video, Math.min(seg.end, need()));
          media = video.currentTime;
        }
        const ended = video.ended || media >= seg.end - 0.5 / FPS;
        if (media > need() + 1.5 / FPS && !ended) {
          // ficamos para trás: volta ao quadro certo e desacelera
          video.pause();
          rate = Math.max(0.25, rate * 0.7);
          await seek(video, need());
          media = video.currentTime;
        }
        let behind = false;
        while (k < endK && (need() <= media + 0.5 / FPS || ended)) {
          await emit((o) => o.painter.body(o.ctx, video, k / FPS));
          k++;
          if (await drain()) behind = true;
        }
        if (k >= endK) break;
        if (behind) rate = Math.max(0.25, rate * 0.85);
        if (video.paused) {
          video.playbackRate = rate;
          await video.play().catch(() => {});
        } else if (video.playbackRate !== rate) video.playbackRate = rate;
        media = await nextVideoFrame(video);
        if (video.paused && !video.ended) media = video.currentTime;
      }
      video.pause();
      bodyAt += len;
      if (rate < 1) rate = Math.min(1, rate * 1.25);
    }
    while (k < bodyFrames) {
      await emit((o) => o.painter.body(o.ctx, video, k / FPS));
      k++;
      await drain();
    }

    // encerramento
    const outroFrames = totalFrames - frame;
    for (let i = 0; i < outroFrames; i++) {
      if (signal.aborted) throw abortError();
      await emit((o) => o.painter.outro(o.ctx, video, i / FPS));
      await drain();
      if (i % 6 === 0) await new Promise((r) => requestAnimationFrame(r));
    }

    const results: RenderOutput[] = [];
    for (const o of outs) {
      await o.encoder.flush();
      o.encoder.close();
      for (const { chunk, meta } of audioChunks) o.muxer.addAudioChunk(chunk, meta);
      o.muxer.finalize();
      const blob = new Blob([o.muxer.target.buffer], { type: "video/mp4" });
      results.push({ ratio: o.ratio, blob, url: URL.createObjectURL(blob), mime: "video/mp4", ext: "mp4", width: o.width, height: o.height, duration: frame / FPS });
    }
    p.onProgress(1);
    return results;
  } catch (e) {
    video.pause();
    for (const o of outs) if (o.encoder.state !== "closed") o.encoder.close();
    throw e;
  }
}
