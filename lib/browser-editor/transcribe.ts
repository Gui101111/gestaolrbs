import { HOP, SAMPLE_RATE } from "@/lib/browser-editor/audio";
import type { Interval, Segment } from "@/lib/browser-editor/types";

/**
 * Transcrição com Whisper rodando no próprio navegador (transformers.js +
 * ONNX Runtime em WebAssembly). Os arquivos do modelo são servidos junto da
 * página, em partes de até 14 MB, e montados aqui antes de carregar.
 */

export interface ModelFile {
  /** Caminho dentro do modelo, ex.: "onnx/encoder_model_quantized.onnx". */
  name: string;
  /** Partes publicadas, relativas à página. */
  parts: string[];
  size: number;
}

export interface WhisperManifest {
  modelId: string;
  files: ModelFile[];
  /** Binário do ONNX Runtime (WebAssembly). */
  wasm: ModelFile;
  /** Pasta (relativa à página) com o .mjs do ONNX Runtime, se o pacote pedir. */
  ortDir: string;
}

type AsrChunk = { timestamp: [number, number | null]; text: string };
type AsrOutput = { text: string; chunks?: AsrChunk[] };
type AsrPipe = (audio: Float32Array, opts: Record<string, unknown>) => Promise<AsrOutput | AsrOutput[]>;

interface CacheLike {
  match(key: string): Promise<Response | undefined>;
  put(key: string, res: Response): Promise<void>;
}

/** O pedaço do @huggingface/transformers que usamos (o host injeta o módulo). */
export interface TransformersLike {
  env: {
    allowLocalModels: boolean;
    allowRemoteModels: boolean;
    remoteHost: string;
    remotePathTemplate: string;
    useBrowserCache: boolean;
    useCustomCache: boolean;
    customCache: CacheLike | null;
    backends: { onnx: { wasm?: { wasmBinary?: ArrayBuffer; wasmPaths?: string; numThreads?: number; proxy?: boolean } } };
  };
  pipeline: (task: "automatic-speech-recognition", model: string, opts?: Record<string, unknown>) => Promise<unknown>;
}

export type LoadProgress = (loaded: number, total: number) => void;

async function fetchParts(base: string, files: ModelFile[], onProgress: LoadProgress) {
  const total = files.reduce((s, f) => s + f.size, 0);
  let loaded = 0;
  const out = new Map<string, Blob>();
  const queue = files.flatMap((f) => f.parts.map((p, i) => ({ f, p, i })));
  const pieces = new Map<string, Blob[]>();
  const worker = async () => {
    for (;;) {
      const job = queue.shift();
      if (!job) return;
      const res = await fetch(new URL(job.p, base));
      if (!res.ok || !res.body) throw new Error(`falha ao baixar ${job.p} (${res.status})`);
      const reader = res.body.getReader();
      const chunks: BlobPart[] = [];
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value as BlobPart);
        loaded += value.byteLength;
        onProgress(Math.min(loaded, total), total);
      }
      const arr = pieces.get(job.f.name) ?? [];
      arr[job.i] = new Blob(chunks);
      pieces.set(job.f.name, arr);
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  for (const f of files) out.set(f.name, new Blob(pieces.get(f.name) ?? []));
  return out;
}

export interface Whisper {
  transcribe(audio: Float32Array, speech: Interval[], onProgress: (done: number, total: number) => void, signal?: AbortSignal): Promise<Segment[]>;
}

let loading: Promise<Whisper> | null = null;
const listeners = new Set<LoadProgress>();
let lastProgress: [number, number] | null = null;

/**
 * Baixa (uma vez por página) e prepara o Whisper. Pode ser chamado antes,
 * em segundo plano, assim que a pessoa escolhe o vídeo: quem chamar depois
 * acompanha o mesmo download.
 */
export function loadWhisper(manifest: WhisperManifest, importTransformers: () => Promise<TransformersLike>, onProgress?: LoadProgress): Promise<Whisper> {
  if (onProgress) {
    listeners.add(onProgress);
    if (lastProgress) onProgress(...lastProgress);
  }
  if (!loading) {
    loading = (async () => {
      const base = new URL(".", window.location.href).href;
      const blobs = await fetchParts(base, [...manifest.files, manifest.wasm], (l, t) => {
        lastProgress = [l, t];
        listeners.forEach((fn) => fn(l, t));
      });
      const T = await importTransformers();
      const wasm = T.env.backends.onnx.wasm;
      if (wasm) {
        wasm.wasmBinary = await blobs.get(manifest.wasm.name)!.arrayBuffer();
        wasm.wasmPaths = new URL(manifest.ortDir, base).href;
        wasm.numThreads = 1;
        wasm.proxy = false;
      }
      Object.assign(T.env, {
        allowLocalModels: false,
        allowRemoteModels: true,
        remoteHost: new URL("modelos/", base).href,
        remotePathTemplate: "{model}/",
        useBrowserCache: false,
        useCustomCache: true,
        customCache: {
          async match(key: string) {
            const f = manifest.files.find((m) => key.endsWith(`/${m.name}`));
            const blob = f && blobs.get(f.name);
            return blob ? new Response(blob, { headers: { "content-length": String(blob.size) } }) : undefined;
          },
          async put() {},
        },
      });
      const pipe = (await T.pipeline("automatic-speech-recognition", manifest.modelId, { dtype: "q8", device: "wasm" })) as AsrPipe;
      return { transcribe: (audio, speech, p, s) => runWindows(pipe, audio, speech, p, s) };
    })();
    loading.catch(() => {
      loading = null;
      lastProgress = null;
    });
  }
  const p = loading;
  if (onProgress) void p.finally(() => listeners.delete(onProgress)).catch(() => {});
  return p;
}

const MAX_WINDOW = 28;

/** Janelas de até 28 s que começam e terminam em pausas (o Whisper lê 30 s por vez). */
export function speechWindows(speech: Interval[], duration: number): Interval[] {
  const pieces: Interval[] = [];
  for (const r of speech) {
    let s = r.start;
    while (r.end - s > MAX_WINDOW) {
      pieces.push({ start: s, end: s + 24 });
      s += 24;
    }
    pieces.push({ start: s, end: r.end });
  }
  const windows: Interval[] = [];
  for (const p of pieces) {
    const last = windows[windows.length - 1];
    if (last && p.end - last.start <= MAX_WINDOW && p.start - last.end < 4) last.end = p.end;
    else windows.push({ ...p });
  }
  return windows.map((w) => ({ start: Math.max(0, w.start - 0.25), end: Math.min(duration, w.end + 0.25) }));
}

const HALLUCINATIONS = [/amara\.org/i, /legendas? (pela|por)/i, /inscreva-se/i, /obrigad[oa] por assistir/i, /^\W*$/];

async function runWindows(pipe: AsrPipe, audio: Float32Array, speech: Interval[], onProgress: (done: number, total: number) => void, signal?: AbortSignal) {
  const duration = audio.length / SAMPLE_RATE;
  const windows = speechWindows(speech.length ? speech : [{ start: 0, end: duration }], duration);
  const segments: Segment[] = [];
  onProgress(0, windows.length);
  for (let i = 0; i < windows.length; i++) {
    if (signal?.aborted) throw new DOMException("cancelado", "AbortError");
    const w = windows[i];
    const slice = audio.subarray(Math.floor(w.start * SAMPLE_RATE), Math.ceil(w.end * SAMPLE_RATE));
    const res = await pipe(slice, { language: "portuguese", task: "transcribe", return_timestamps: true });
    const out = Array.isArray(res) ? res[0] : res;
    const chunks = out?.chunks?.length ? out.chunks : [{ timestamp: [0, w.end - w.start] as [number, number], text: out?.text ?? "" }];
    for (const c of chunks) {
      const text = c.text.replace(/\s+/g, " ").trim();
      if (!text || HALLUCINATIONS.some((h) => h.test(text))) continue;
      const start = w.start + (c.timestamp[0] ?? 0);
      const end = Math.min(w.end, w.start + (c.timestamp[1] ?? w.end - w.start));
      if (end - start < HOP) continue;
      segments.push({ id: segments.length, text, start, end });
    }
    onProgress(i + 1, windows.length);
    // devolve a vez para a interface atualizar entre as janelas
    await new Promise((r) => setTimeout(r, 0));
  }
  return segments;
}
