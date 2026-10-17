import type { Interval } from "@/lib/browser-editor/types";

export const SAMPLE_RATE = 16_000;
/** Quadro de análise de energia: 20 ms. */
export const HOP = 0.02;

type OfflineCtor = new (channels: number, length: number, rate: number) => OfflineAudioContext;

function offlineCtor(): OfflineCtor | null {
  const w = window as unknown as { OfflineAudioContext?: OfflineCtor; webkitOfflineAudioContext?: OfflineCtor };
  return w.OfflineAudioContext ?? w.webkitOfflineAudioContext ?? null;
}

function decode(ctx: BaseAudioContext, data: ArrayBuffer): Promise<AudioBuffer> {
  // Safari antigo só aceita a forma com callbacks.
  return new Promise((resolve, reject) => {
    const p = ctx.decodeAudioData(data, resolve, reject);
    if (p && typeof p.then === "function") p.then(resolve, reject);
  });
}

/** Reamostragem simples (média por janela + interpolação linear) para 16 kHz. */
function resample(input: Float32Array, from: number): Float32Array {
  if (from === SAMPLE_RATE) return input;
  const ratio = from / SAMPLE_RATE;
  const out = new Float32Array(Math.floor(input.length / ratio));
  const half = Math.max(0, Math.floor(ratio / 2));
  for (let i = 0; i < out.length; i++) {
    const c = i * ratio;
    const a = Math.max(0, Math.floor(c) - half);
    const b = Math.min(input.length - 1, Math.floor(c) + half);
    let s = 0;
    for (let k = a; k <= b; k++) s += input[k];
    out[i] = s / (b - a + 1);
  }
  return out;
}

/** Áudio mono do vídeo, na taxa de saída (48 kHz): base da trilha editada e da análise. */
export interface Pcm {
  data: Float32Array;
  rate: number;
}

/**
 * Extrai o áudio do vídeo como mono 48 kHz. Devolve null se o arquivo não
 * tem áudio ou o navegador não sabe decodificar.
 */
export async function decodeAudio(file: Blob): Promise<Pcm | null> {
  const Ctor = offlineCtor();
  if (!Ctor) return null;
  const bytes = await file.arrayBuffer();
  for (const rate of [48_000, 44_100]) {
    try {
      const ctx = new Ctor(1, rate, rate);
      const buf = await decode(ctx, bytes.slice(0));
      const n = buf.length;
      const mono = new Float32Array(n);
      for (let c = 0; c < buf.numberOfChannels; c++) {
        const d = buf.getChannelData(c);
        for (let i = 0; i < n; i++) mono[i] += d[i] / buf.numberOfChannels;
      }
      return { data: mono, rate: buf.sampleRate };
    } catch {
      // tenta a próxima taxa (alguns navegadores recusam 48 kHz no contexto)
    }
  }
  return null;
}

/** Mono 16 kHz (o formato do Whisper e da análise de pausas). */
export const to16k = (pcm: Pcm) => resample(pcm.data, pcm.rate);

/** Energia RMS por quadro de 20 ms, em dBFS. */
export function frameEnergy(audio: Float32Array): Float32Array {
  const hop = Math.round(HOP * SAMPLE_RATE);
  const frames = Math.floor(audio.length / hop);
  const db = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    let s = 0;
    const o = f * hop;
    for (let i = 0; i < hop; i++) s += audio[o + i] * audio[o + i];
    db[f] = 10 * Math.log10(s / hop + 1e-10);
  }
  return db;
}

function percentile(values: Float32Array, p: number) {
  const a = Array.from(values).sort((x, y) => x - y);
  return a[Math.min(a.length - 1, Math.max(0, Math.floor(p * (a.length - 1))))] ?? -90;
}

/**
 * Onde há fala: limiar adaptativo entre o ruído de fundo (percentil 10) e o
 * pico da voz (percentil 95), com histerese, sem buracos menores que 150 ms
 * e sem estalos isolados menores que 80 ms.
 */
export function detectSpeech(db: Float32Array): { speech: Interval[]; speechDb: number | null } {
  if (db.length < 5) return { speech: [], speechDb: null };
  const floor = percentile(db, 0.1);
  const peak = percentile(db, 0.95);
  if (peak - floor < 8) {
    // dinâmica pequena demais: ou é tudo fala contínua, ou tudo ruído
    return peak > -45 ? { speech: [{ start: 0, end: db.length * HOP }], speechDb: peak - 6 } : { speech: [], speechDb: null };
  }
  const high = floor + Math.max(7, (peak - floor) * 0.32);
  const low = floor + Math.max(5, (peak - floor) * 0.22);
  const on = new Uint8Array(db.length);
  let state = 0;
  for (let i = 0; i < db.length; i++) {
    state = state ? (db[i] > low ? 1 : 0) : db[i] > high ? 1 : 0;
    on[i] = state;
  }
  const regions: Interval[] = [];
  let s = -1;
  for (let i = 0; i <= on.length; i++) {
    if (i < on.length && on[i]) {
      if (s < 0) s = i;
    } else if (s >= 0) {
      regions.push({ start: s * HOP, end: i * HOP });
      s = -1;
    }
  }
  const merged: Interval[] = [];
  for (const r of regions) {
    const last = merged[merged.length - 1];
    if (last && r.start - last.end < 0.15) last.end = r.end;
    else merged.push({ ...r });
  }
  const speech = merged.filter((r) => r.end - r.start >= 0.08);

  let sum = 0;
  let count = 0;
  for (const r of speech) {
    for (let f = Math.floor(r.start / HOP); f < Math.min(db.length, Math.ceil(r.end / HOP)); f++) {
      sum += 10 ** (db[f] / 10);
      count++;
    }
  }
  return { speech, speechDb: count ? 10 * Math.log10(sum / count) : null };
}

/**
 * Pausas que podem sair: o espaço entre falas maior que `minPause`, deixando
 * `pad` de respiro dos dois lados; também o silêncio do começo e do fim.
 */
export function cuttableSilences(speech: Interval[], duration: number, minPause: number, pad: number): Interval[] {
  if (!speech.length) return [];
  const out: Interval[] = [];
  const lead = speech[0].start - pad * 1.5;
  if (lead > 0.2) out.push({ start: 0, end: lead });
  for (let i = 1; i < speech.length; i++) {
    const gap = speech[i].start - speech[i - 1].end;
    if (gap >= minPause) out.push({ start: speech[i - 1].end + pad, end: speech[i].start - pad });
  }
  const tail = speech[speech.length - 1].end + pad * 2.5;
  if (duration - tail > 0.2) out.push({ start: tail, end: duration });
  return out.filter((c) => c.end - c.start > 0.12);
}
