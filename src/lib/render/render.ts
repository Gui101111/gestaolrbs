import {
  ALL_FORMATS,
  AudioBufferSource,
  BlobSource,
  BufferTarget,
  CanvasSource,
  Input,
  Mp4OutputFormat,
  Output,
  Quality,
  VideoSampleSink,
  WebMOutputFormat,
  canEncodeAudio,
  getFirstEncodableAudioCodec,
  getFirstEncodableVideoCodec,
  type VideoCodec,
  type VideoSample,
} from 'mediabunny';
import { resample, type DecodedAudio } from '../pipeline/audio';
import type { CaptionSettings, FitMode, FormatId, VinhetaSettings } from '../types';
import { drawCaptions, drawHook, loadCaptionFonts, type CaptionPage } from './captions';
import { zoomAt, type Timeline } from './timeline';
import { INTRO_DURATION, VINHETA_FADE, drawVinheta, renderVinhetaSound, type VinhetaContent } from './vinheta';

export const FPS = 30;

export interface RenderOptions {
  file: Blob;
  audio: DecodedAudio | null;
  timeline: Timeline;
  format: FormatId;
  fit: FitMode;
  captions: CaptionSettings;
  vinheta: VinhetaSettings;
  logo: ImageBitmap | null;
  onProgress: (p: number) => void;
  signal?: AbortSignal;
}

export interface RenderResult {
  blob: Blob;
  ext: 'mp4' | 'webm';
  codec: string;
  thumbnail: string | null;
  width: number;
  height: number;
}

export class RenderError extends Error {}

const even = (v: number) => Math.max(2, Math.round(v / 2) * 2);

export function outputSize(format: FormatId, srcW: number, srcH: number): [number, number] {
  if (format === '9:16') return [1080, 1920];
  if (format === '1:1') return [1080, 1080];
  if (format === '16:9') return [1920, 1080];
  const scale = Math.min(1, 1920 / Math.max(srcW, srcH));
  return [even(srcW * scale), even(srcH * scale)];
}

function makeCanvas(w: number, h: number): OffscreenCanvas | HTMLCanvasElement {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

function ctxOf(canvas: OffscreenCanvas | HTMLCanvasElement): Ctx2D {
  const ctx = canvas.getContext('2d', { alpha: false }) as Ctx2D | null;
  if (!ctx) throw new RenderError('Seu navegador não permitiu desenhar o vídeo.');
  return ctx;
}

let aacReady: Promise<void> | null = null;

/** Nem todo navegador codifica AAC; nesses casos usamos um codificador em WASM (melhor compatibilidade com redes sociais). */
function ensureAac() {
  aacReady ??= (async () => {
    if (await canEncodeAudio('aac')) return;
    const { registerAacEncoder } = await import('@mediabunny/aac-encoder');
    registerAacEncoder();
  })().catch(() => undefined);
  return aacReady;
}

async function pickVideoCodec(width: number, height: number) {
  const bitrate = Math.max(2_500_000, Math.round(6_500_000 * ((width * height) / (1080 * 1920))));
  const quality = new Quality({ bitrate });
  const codec = await getFirstEncodableVideoCodec(['avc', 'vp9', 'av1', 'hevc', 'vp8'], { width, height, quality, frameRate: FPS });
  return codec ? { codec, quality } : null;
}

export async function renderVideo(opts: RenderOptions): Promise<RenderResult> {
  if (typeof VideoEncoder === 'undefined') {
    throw new RenderError('Este navegador não consegue gerar vídeos. Use o Chrome, Edge ou Safari atualizados.');
  }
  await loadCaptionFonts();

  const input = new Input({ source: new BlobSource(opts.file), formats: ALL_FORMATS });
  try {
    return await renderWith(input, opts);
  } finally {
    input.dispose();
  }
}

async function renderWith(input: Input, opts: RenderOptions): Promise<RenderResult> {
  const { timeline, captions, vinheta, signal } = opts;
  const track = await input.getPrimaryVideoTrack();
  if (!track) throw new RenderError('Não encontramos imagem neste arquivo.');
  if (!(await track.canDecode())) throw new RenderError('O formato de vídeo deste arquivo não é suportado pelo navegador. Tente exportá-lo em MP4 (H.264).');

  let [W, H] = outputSize(opts.format, await track.getDisplayWidth(), await track.getDisplayHeight());
  let picked = await pickVideoCodec(W, H);
  if (!picked) {
    // Alguns aparelhos não codificam 1080p: tenta em 720p.
    [W, H] = [even(W * (2 / 3)), even(H * (2 / 3))];
    picked = await pickVideoCodec(W, H);
  }
  if (!picked) throw new RenderError('Seu navegador não tem um codificador de vídeo disponível. Use o Chrome ou o Edge atualizados.');
  const videoCodec: VideoCodec = picked.codec;

  // ── Áudio de saída: trechos mantidos + sons da vinheta ──
  const wantsSound = vinheta.sound && (timeline.intro > 0 || timeline.outro > 0);
  const outRate = opts.audio && [44100, 48000].includes(opts.audio.sampleRate) ? opts.audio.sampleRate : 48000;
  let outAudio: Float32Array<ArrayBuffer>[] | null = null;
  if (opts.audio || wantsSound) {
    const src = opts.audio ? (opts.audio.sampleRate === outRate ? opts.audio.channels : await resample(opts.audio, outRate, false)) : null;
    const channels = src?.length ?? 1;
    const total = Math.ceil(timeline.total * outRate) + 1;
    outAudio = Array.from({ length: channels }, () => new Float32Array(total));
    if (src) {
      for (const seg of timeline.segments) {
        const a = Math.round(seg.srcStart * outRate);
        const dst = Math.round(seg.outStart * outRate);
        const len = Math.min(Math.round(seg.srcEnd * outRate) - a, total - dst, src[0].length - a);
        const fade = Math.min(Math.round(0.006 * outRate), Math.floor(len / 2));
        for (let c = 0; c < channels; c++) {
          const from = src[c];
          const to = outAudio[c];
          for (let i = 0; i < len; i++) {
            const g = i < fade ? i / fade : i > len - fade ? (len - i) / fade : 1;
            to[dst + i] = from[a + i] * g;
          }
        }
      }
    }
    if (wantsSound) {
      const mix = async (kind: 'intro' | 'outro', at: number) => {
        const sound = await renderVinhetaSound(kind, outRate);
        const data = sound.getChannelData(0);
        const start = Math.round(at * outRate);
        for (const ch of outAudio!) {
          for (let i = 0; i < data.length && start + i < ch.length; i++) ch[start + i] = Math.max(-1, Math.min(1, ch[start + i] + data[i]));
        }
      };
      if (timeline.intro > 0) await mix('intro', 0);
      if (timeline.outro > 0) await mix('outro', timeline.total - timeline.outro);
    }
  }

  if (outAudio) await ensureAac();
  const audioCodec = outAudio
    ? await getFirstEncodableAudioCodec(['aac', 'opus'], { numberOfChannels: outAudio.length, sampleRate: outRate })
    : null;
  if (outAudio && !audioCodec) throw new RenderError('Seu navegador não tem um codificador de áudio disponível.');

  const useMp4 = videoCodec !== 'vp8';
  const output = new Output({
    format: useMp4 ? new Mp4OutputFormat({ fastStart: 'in-memory' }) : new WebMOutputFormat(),
    target: new BufferTarget(),
  });

  const canvas = makeCanvas(W, H);
  const ctx = ctxOf(canvas);
  ctx.imageSmoothingQuality = 'high';
  const videoSource = new CanvasSource(canvas, { codec: videoCodec, quality: picked.quality, keyFrameInterval: 2 });
  output.addVideoTrack(videoSource, { frameRate: FPS });
  const audioSource = audioCodec ? new AudioBufferSource({ codec: audioCodec, quality: new Quality({ bitrate: audioCodec === 'aac' ? 160_000 : 128_000 }) }) : null;
  if (audioSource) output.addAudioTrack(audioSource);

  const abort = async () => {
    await output.cancel().catch(() => undefined);
    throw new DOMException('Cancelado', 'AbortError');
  };

  await output.start();

  // Fundo desfocado (modo "mostrar inteiro"): desenha pequeno e amplia.
  const blurSmall = opts.fit === 'blur' ? makeCanvas(even(W / 24), even(H / 24)) : null;
  const blurMid = opts.fit === 'blur' ? makeCanvas(even(W / 6), even(H / 6)) : null;

  const drawSource = (sample: VideoSample, zoom: number) => {
    const dw = sample.displayWidth;
    const dh = sample.displayHeight;
    if (blurSmall && blurMid) {
      const sctx = ctxOf(blurSmall);
      const cover = Math.max(blurSmall.width / dw, blurSmall.height / dh);
      sample.draw(sctx, (blurSmall.width - dw * cover) / 2, (blurSmall.height - dh * cover) / 2, dw * cover, dh * cover);
      const mctx = ctxOf(blurMid);
      mctx.imageSmoothingQuality = 'high';
      mctx.drawImage(blurSmall, 0, 0, blurMid.width, blurMid.height);
      ctx.drawImage(blurMid, 0, 0, W, H);
      ctx.fillStyle = 'rgba(0,0,0,0.38)';
      ctx.fillRect(0, 0, W, H);
      const s = Math.min(W / dw, H / dh) * zoom;
      sample.draw(ctx, (W - dw * s) / 2, (H - dh * s) / 2, dw * s, dh * s);
    } else {
      const s = Math.max(W / dw, H / dh) * zoom;
      sample.draw(ctx, (W - dw * s) / 2, (H - dh * s) * 0.42, dw * s, dh * s);
    }
  };

  const introContent: VinhetaContent = { style: vinheta.style, color: vinheta.color, title: vinheta.title, subtitle: vinheta.subtitle, logo: opts.logo };
  const outroContent: VinhetaContent = { ...introContent, title: vinheta.outroTitle, subtitle: vinheta.outroSubtitle };

  const totalFrames = Math.max(1, Math.round(timeline.total * FPS));
  const introFrames = Math.round(timeline.intro * FPS);
  const contentEndFrame = Math.round((timeline.intro + timeline.content) * FPS);
  const outroStart = timeline.intro + timeline.content;

  // Tempo de origem de cada quadro do conteúdo (sempre crescente).
  const srcTimes: number[] = [];
  const segOf: number[] = [];
  let s = 0;
  const segs = timeline.segments;
  for (let f = introFrames; f < contentEndFrame; f++) {
    const t = f / FPS;
    while (s < segs.length - 1 && t >= segs[s].outStart + (segs[s].srcEnd - segs[s].srcStart)) s++;
    const seg = segs[s];
    srcTimes.push(Math.max(seg.srcStart, Math.min(seg.srcEnd - 0.001, seg.srcStart + (t - seg.outStart))));
    segOf.push(s);
  }

  const sink = new VideoSampleSink(track);
  const frames = sink.samplesAtTimestamps(srcTimes)[Symbol.asyncIterator]();
  const thumbFrame = introFrames + Math.floor((contentEndFrame - introFrames) * 0.3);
  let thumbnail: string | null = null;
  let pageIdx = 0;
  const pages: CaptionPage[] = timeline.pages;

  const chunk = Math.round(outRate); // 1 s de áudio por vez
  let audioPos = 0;
  const pushAudioUntil = async (time: number) => {
    if (!audioSource || !outAudio) return;
    const limit = Math.min(outAudio[0].length, Math.round(time * outRate));
    while (audioPos < limit) {
      const len = Math.min(chunk, outAudio[0].length - audioPos);
      const buf = new AudioBuffer({ length: len, numberOfChannels: outAudio.length, sampleRate: outRate });
      outAudio.forEach((ch, c) => buf.copyToChannel(ch.subarray(audioPos, audioPos + len), c));
      await audioSource.add(buf);
      audioPos += len;
    }
  };

  try {
    for (let f = 0; f < totalFrames; f++) {
      if (signal?.aborted) await abort();
      const t = f / FPS;
      if (f < introFrames) {
        drawVinheta(ctx, t, W, H, introContent, 'intro');
      } else if (f < contentEndFrame) {
        const k = f - introFrames;
        const { value: sample } = await frames.next();
        const seg = segs[segOf[k]];
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, W, H);
        if (sample) {
          drawSource(sample, zoomAt(timeline, seg, t));
          sample.close();
        }
        if (timeline.hook && t >= timeline.hook.start && t < timeline.hook.end) {
          drawHook(ctx, timeline.hook.text, t - timeline.hook.start, timeline.hook.end - t, W, H, captions.color);
        }
        if (captions.enabled) {
          while (pageIdx < pages.length && pages[pageIdx].end <= t) pageIdx++;
          const page = pages[pageIdx];
          if (page && t >= page.start) drawCaptions(ctx, page, t, W, H, captions);
        }
        if (timeline.intro > 0 && t - timeline.intro < VINHETA_FADE) {
          ctx.globalAlpha = 1 - (t - timeline.intro) / VINHETA_FADE;
          drawVinheta(ctx, INTRO_DURATION, W, H, introContent, 'intro');
          ctx.globalAlpha = 1;
        }
        if (timeline.outro > 0 && outroStart - t < VINHETA_FADE) {
          ctx.globalAlpha = 1 - (outroStart - t) / VINHETA_FADE;
          drawVinheta(ctx, 0, W, H, outroContent, 'outro');
          ctx.globalAlpha = 1;
        }
        if (f === thumbFrame) thumbnail = await makeThumbnail(canvas, W, H);
      } else {
        drawVinheta(ctx, t - outroStart, W, H, outroContent, 'outro');
      }
      await videoSource.add(t, 1 / FPS);
      await pushAudioUntil(t + 1);
      if (f % 6 === 0) opts.onProgress(f / totalFrames);
    }
    await frames.return?.(undefined);
    await pushAudioUntil(timeline.total + 1);
    if (!thumbnail) thumbnail = await makeThumbnail(canvas, W, H);
    await output.finalize();
  } catch (error) {
    if (output.state !== 'canceled' && output.state !== 'finalized') await output.cancel().catch(() => undefined);
    throw error;
  }

  opts.onProgress(1);
  const buffer = (output.target as BufferTarget).buffer;
  if (!buffer) throw new RenderError('A renderização terminou sem gerar o arquivo.');
  const mime = await output.getMimeType().catch(() => (useMp4 ? 'video/mp4' : 'video/webm'));
  return {
    blob: new Blob([buffer], { type: mime.split(';')[0] }),
    ext: useMp4 ? 'mp4' : 'webm',
    codec: mime,
    thumbnail,
    width: W,
    height: H,
  };
}

async function makeThumbnail(canvas: OffscreenCanvas | HTMLCanvasElement, W: number, H: number): Promise<string | null> {
  try {
    const scale = 360 / Math.max(W, H);
    const thumb = document.createElement('canvas');
    thumb.width = Math.round(W * scale);
    thumb.height = Math.round(H * scale);
    thumb.getContext('2d')!.drawImage(canvas, 0, 0, thumb.width, thumb.height);
    return thumb.toDataURL('image/jpeg', 0.74);
  } catch {
    return null;
  }
}

/** Lê duração e dimensões do vídeo sem renderizar nada (não há prévia). */
export async function probeVideo(file: Blob) {
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  try {
    return await probeInput(input);
  } finally {
    input.dispose();
  }
}

async function probeInput(input: Input) {
  if (!(await input.canRead())) throw new RenderError('Não conseguimos ler este arquivo. Envie um vídeo MP4, MOV ou WebM.');
  const video = await input.getPrimaryVideoTrack();
  if (!video) throw new RenderError('Não encontramos imagem neste arquivo.');
  const audio = await input.getPrimaryAudioTrack();
  const duration = await input.computeDuration();
  return {
    duration,
    width: await video.getDisplayWidth(),
    height: await video.getDisplayHeight(),
    hasAudio: Boolean(audio),
  };
}
