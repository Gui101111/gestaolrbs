import { AudioBufferSink, type InputAudioTrack } from 'mediabunny';

export interface DecodedAudio {
  sampleRate: number;
  channels: Float32Array[];
  duration: number;
}

export const ANALYSIS_RATE = 16_000;

/** Decodifica toda a trilha de áudio do vídeo (no máximo 2 canais). */
export async function decodeAudio(
  track: InputAudioTrack,
  duration: number,
  onProgress: (p: number) => void,
  signal?: AbortSignal,
): Promise<DecodedAudio> {
  const sampleRate = await track.getSampleRate();
  const sourceChannels = await track.getNumberOfChannels();
  // Vídeos longos ficam em mono para economizar memória (a fala não perde nada).
  const channelCount = sourceChannels >= 2 && duration <= 8 * 60 ? 2 : 1;
  const length = Math.ceil((duration + 0.5) * sampleRate);
  const channels = Array.from({ length: channelCount }, () => new Float32Array(length));
  const sink = new AudioBufferSink(track);

  for await (const { buffer, timestamp } of sink.buffers()) {
    if (signal?.aborted) throw new DOMException('Cancelado', 'AbortError');
    const offset = Math.round(timestamp * sampleRate);
    if (offset >= length) break;
    // Amostras com tempo negativo (atraso do codificador) não aparecem no vídeo.
    const skip = Math.max(0, -offset);
    const n = Math.min(buffer.length, length - offset) - skip;
    if (n <= 0) continue;
    const at = offset + skip;
    for (let c = 0; c < channelCount; c++) {
      const target = channels[c];
      if (channelCount === 1 && buffer.numberOfChannels > 1) {
        const l = buffer.getChannelData(0);
        const r = buffer.getChannelData(1);
        for (let i = 0; i < n; i++) target[at + i] = (l[skip + i] + r[skip + i]) * 0.5;
      } else {
        const data = buffer.getChannelData(Math.min(c, buffer.numberOfChannels - 1));
        target.set(data.subarray(skip, skip + n), at);
      }
    }
    onProgress(Math.min(1, timestamp / Math.max(duration, 0.001)));
  }
  onProgress(1);
  return { sampleRate, channels, duration };
}

/** Reamostra para outra taxa usando o Web Audio (com filtro anti-aliasing). */
export async function resample(audio: DecodedAudio, targetRate: number, mono: boolean): Promise<Float32Array[]> {
  const outChannels = mono ? 1 : audio.channels.length;
  const length = Math.ceil(audio.channels[0].length * (targetRate / audio.sampleRate));
  if (audio.sampleRate === targetRate && (!mono || audio.channels.length === 1)) return audio.channels;
  const ctx = new OfflineAudioContext(outChannels, length, targetRate);
  const buffer = ctx.createBuffer(audio.channels.length, audio.channels[0].length, audio.sampleRate);
  audio.channels.forEach((data, c) => buffer.copyToChannel(data as Float32Array<ArrayBuffer>, c));
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.connect(ctx.destination);
  src.start();
  const rendered = await ctx.startRendering();
  return Array.from({ length: outChannels }, (_, c) => rendered.getChannelData(c));
}

const FRAME = 0.02; // 20 ms

/** Volume (dB) a cada 20 ms do áudio mono de análise. */
export function energyProfile(mono: Float32Array, rate = ANALYSIS_RATE): Float32Array {
  const size = Math.round(rate * FRAME);
  const frames = Math.floor(mono.length / size);
  const db = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    let sum = 0;
    for (let i = f * size, end = i + size; i < end; i++) sum += mono[i] * mono[i];
    db[f] = 10 * Math.log10(sum / size + 1e-10);
  }
  return db;
}

function percentile(values: Float32Array, p: number) {
  const sorted = Float32Array.from(values).sort();
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] ?? -100;
}

export interface SilenceOptions {
  /** Silêncio mínimo (s) para ser cortado. */
  minSilence: number;
  /** Respiro mantido antes e depois da fala (s). */
  padding: number;
}

/**
 * Detecta os trechos com voz a partir do perfil de energia. O limiar se adapta ao
 * ruído de fundo do próprio vídeo, então funciona em ambientes silenciosos e barulhentos.
 */
export function detectVoice(db: Float32Array, duration: number, opts: SilenceOptions): [number, number][] {
  if (db.length === 0) return [[0, duration]];
  const floor = percentile(db, 0.1);
  const peak = percentile(db, 0.95);
  if (peak - floor < 8) return [[0, duration]]; // áudio sem contraste: não arrisca cortar
  const threshold = Math.max(floor + Math.max(6, (peak - floor) * 0.28), -58);

  const raw: [number, number][] = [];
  let start = -1;
  for (let f = 0; f < db.length; f++) {
    const loud = db[f] > threshold;
    if (loud && start < 0) start = f;
    if (!loud && start >= 0) {
      raw.push([start * FRAME, f * FRAME]);
      start = -1;
    }
  }
  if (start >= 0) raw.push([start * FRAME, db.length * FRAME]);
  if (raw.length === 0) return [[0, duration]];

  // Junta trechos separados por pausas curtas e descarta estalos isolados.
  const merged: [number, number][] = [];
  for (const seg of raw) {
    const last = merged[merged.length - 1];
    if (last && seg[0] - last[1] < opts.minSilence) last[1] = seg[1];
    else merged.push([...seg]);
  }
  return merged
    .filter(([a, b]) => b - a >= 0.12)
    .map(([a, b]) => [Math.max(0, a - opts.padding), Math.min(duration, b + opts.padding)] as [number, number])
    .reduce<[number, number][]>((acc, seg) => {
      const last = acc[acc.length - 1];
      if (last && seg[0] <= last[1]) last[1] = Math.max(last[1], seg[1]);
      else acc.push(seg);
      return acc;
    }, []);
}

/** Codifica áudio mono em WAV PCM 16 bits. */
export function encodeWav(samples: Float32Array, rate = ANALYSIS_RATE): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const write = (o: number, s: string) => [...s].forEach((ch, i) => view.setUint8(o + i, ch.charCodeAt(0)));
  write(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Divide o áudio em trechos de até ~110 s (limite de tamanho da função na Vercel),
 * cortando sempre no ponto mais silencioso perto do fim de cada trecho.
 */
export function splitForTranscription(mono: Float32Array, db: Float32Array, rate = ANALYSIS_RATE) {
  const maxLen = 110;
  const minLen = 80;
  const total = mono.length / rate;
  const chunks: { start: number; end: number }[] = [];
  let start = 0;
  while (total - start > maxLen) {
    let best = start + maxLen;
    let bestDb = Infinity;
    for (let t = start + minLen; t < start + maxLen; t += FRAME) {
      const v = db[Math.floor(t / FRAME)] ?? 0;
      if (v < bestDb) {
        bestDb = v;
        best = t;
      }
    }
    chunks.push({ start, end: best });
    start = best;
  }
  chunks.push({ start, end: total });
  return chunks.map((c) => ({ ...c, samples: mono.subarray(Math.floor(c.start * rate), Math.floor(c.end * rate)) }));
}
