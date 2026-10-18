/**
 * Peças da edição no navegador usadas pelo app e pela demonstração:
 * etapas de progresso, ajustes sem IA e capa do vídeo.
 */
import { bookends } from "@/lib/browser-editor/render";
import type { EditOptions, Progress, RenderOutput } from "@/lib/browser-editor/types";

/**
 * Sem a IA: entende os pedidos de ajuste
 * mais comuns por palavras-chave.
 */
export function localRevision(comment: string): { patch: Partial<EditOptions>; note: string } {
  const c = comment.toLocaleLowerCase("pt-BR");
  const off = /\b(tira|tirar|tire|remove|remover|sem|retira|retirar|esconde|desliga|apaga)\b/.test(c);
  const on = /\b(coloca|colocar|coloque|adiciona|adicionar|põe|poe|inclui|incluir|liga|quero)\b/.test(c);
  const patch: Partial<EditOptions> = {};
  const done: string[] = [];
  const flag = (re: RegExp, key: keyof EditOptions, label: string) => {
    if (!re.test(c)) return;
    if (off) {
      (patch as Record<string, unknown>)[key] = false;
      done.push(`sem ${label}`);
    } else if (on) {
      (patch as Record<string, unknown>)[key] = true;
      done.push(`com ${label}`);
    }
  };
  flag(/legenda/, "captions", "legendas");
  flag(/vinheta/, "vignette", "vinheta");
  flag(/zoom/, "zoom", "zooms");
  flag(/chamada|cta/, "cta", "chamada final");
  flag(/trilha|m[úu]sica/, "music", "trilha sonora");
  flag(/efeito|grafismo|anima[çc]/, "effects", "grafismos e efeitos");
  const quoted = comment.match(/[“"']([^”"']{3,80})[”"']/);
  if (/t[íi]tulo/.test(c)) {
    if (quoted) {
      Object.assign(patch, { hook: true, hookText: quoted[1].trim() });
      done.push(`título “${quoted[1].trim()}”`);
    } else flag(/t[íi]tulo/, "hook", "título");
  }
  if (/pausa|sil[êe]ncio/.test(c) && !off) {
    patch.cutPauses = true;
    done.push("pausas cortadas");
  }
  return {
    patch,
    note: done.length ? `Ajuste aplicado: ${done.join(", ")}.` : "Refizemos a edição com as mesmas escolhas. Para pedidos livres, a revisão com IA precisa estar ligada.",
  };
}

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
