/**
 * Peças da edição no navegador usadas pelo app e pela demonstração:
 * etapas de progresso e capa do vídeo.
 */
import { bookends } from "@/lib/browser-editor/render";
import type { EditOptions, Progress, RenderOutput } from "@/lib/browser-editor/types";

/** Etapas do motor → etapas do app (PIPELINE_STEPS). */
export function stepFor(p: Progress): { step: string; progress: number } {
  switch (p.step) {
    case "ler":
      return { step: "analyzing_audio", progress: 6 };
    case "audio":
      return { step: "analyzing_audio", progress: 12 };
    case "transcrever":
      return { step: "transcribing", progress: Math.round(16 + 26 * (p.value ?? 0)) };
    case "revisar":
      return { step: "analyzing_content", progress: 46 };
    case "enquadrar":
      return { step: "planning", progress: 52 };
    default: {
      const f = p.value ?? 0;
      const step = f < 0.3 ? "editing" : f < 0.6 ? "captioning" : f < 0.85 ? "adding_elements" : "rendering";
      return { step, progress: Math.round(56 + 42 * f) };
    }
  }
}

/** Momento da capa: com o título de impacto já montado na tela. */
export function posterAt(opts: EditOptions, title: string, cta: string, duration: number) {
  const { introDur } = bookends(opts, title, cta);
  return Math.min(duration / 2, introDur + (opts.hook && title ? 1.6 : 2.2));
}

/** Quadro do vídeo editado (720 px no lado maior) para a capa. */
export async function posterFor(out: RenderOutput, at = Math.min(out.duration / 3, 2.2)): Promise<Blob | null> {
  try {
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.src = out.url;
    await new Promise<void>((resolve, reject) => {
      v.onloadeddata = () => resolve();
      v.onerror = () => reject(new Error("poster"));
      window.setTimeout(resolve, 5000);
    });
    v.currentTime = at;
    await new Promise<void>((resolve) => {
      v.onseeked = () => resolve();
      window.setTimeout(resolve, 4000);
    });
    const c = document.createElement("canvas");
    const k = 720 / Math.max(out.width, out.height);
    c.width = Math.round(out.width * k);
    c.height = Math.round(out.height * k);
    c.getContext("2d")!.drawImage(v, 0, 0, c.width, c.height);
    return await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.82));
  } catch {
    return null;
  }
}
