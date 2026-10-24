import type { EditorDeps } from "@/lib/browser-editor/pipeline";
import { getSample } from "@/lib/browser-editor/runtime";
import type { TransformersLike, WhisperManifest } from "@/lib/browser-editor/transcribe";

/** Modelos servidos com a página, do mais preciso (small) ao mais leve (base). */
declare const __WHISPER__: WhisperManifest[] | null;

/** transformers.js fica em asr.js e só é baixado quando a transcrição roda. */
function loadAsr(): Promise<TransformersLike> {
  const w = window as unknown as { TribunaASR?: TransformersLike };
  if (w.TribunaASR) return Promise.resolve(w.TribunaASR);
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "asr.js";
    s.charset = "utf-8";
    s.async = true;
    s.onload = () => (w.TribunaASR ? resolve(w.TribunaASR) : reject(new Error("asr.js sem o módulo")));
    s.onerror = () => reject(new Error("asr.js não carregou"));
    document.head.appendChild(s);
  });
}

let deps: Promise<EditorDeps> | null = null;

/** IA (Claude, pela capacidade sample do artifact) e Whisper no navegador. */
export function getEditorDeps(): Promise<EditorDeps> {
  deps ??= (async () => ({
    sample: await getSample(),
    // o small vem com a página (não depende do Hugging Face); o base fica de reserva para aparelhos com pouca memória
    whisper: __WHISPER__ ? { manifests: __WHISPER__, importTransformers: loadAsr } : null,
  }))();
  return deps;
}

// ---------------------------------------------------------------------------
// Pedido de toque: alguns navegadores só tocam o vídeo depois de um toque.

type GestureListener = (fn: (() => void) | null) => void;
const gestureListeners = new Set<GestureListener>();
let pending: (() => void) | null = null;

export function onGesture(fn: GestureListener) {
  gestureListeners.add(fn);
  fn(pending);
  return () => void gestureListeners.delete(fn);
}

export function requestGesture(run: () => void): Promise<void> {
  return new Promise((resolve) => {
    pending = () => {
      run();
      pending = null;
      gestureListeners.forEach((l) => l(null));
      resolve();
    };
    gestureListeners.forEach((l) => l(pending));
  });
}
