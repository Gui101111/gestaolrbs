import type { SampleFn } from "@/lib/browser-editor/ai";

/**
 * Capacidades do runtime de artifacts do claude.ai (`window.claude.use`).
 * Fora do claude.ai (app publicado, arquivo local) tudo resolve `null` e a
 * página segue sem IA e com download direto.
 */
type ClaudeWindow = { claude?: { use(name: string): Promise<unknown> } };

export interface DownloadsNs {
  save(req: { filename: string; data: Blob }): Promise<{ status: "saved" | "delivered" }>;
}

export async function capability<T>(name: "sample" | "downloads"): Promise<T | null> {
  const c = (window as unknown as ClaudeWindow).claude;
  if (!c || typeof c.use !== "function") return null;
  try {
    return ((await c.use(name)) as T | null) ?? null;
  } catch {
    return null;
  }
}

export const getSample = () => capability<SampleFn>("sample");
export const getDownloads = () => capability<DownloadsNs>("downloads");

/** Salva o vídeo: pelo diálogo do claude.ai quando existe; senão, link de download comum. */
export async function saveVideo(blob: Blob, filename: string): Promise<"saved" | "declined" | "fallback" | { error: string }> {
  const dl = await getDownloads();
  if (dl) {
    try {
      await dl.save({ filename, data: blob });
      return "saved";
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (code === "declined") return "declined";
      if (code === "rate_limited") return { error: "Já existe um download aguardando confirmação. Confirme ou espere alguns segundos." };
      if (code === "too_large") return { error: "O arquivo ficou grande demais para baixar aqui. Tente um formato por vez." };
      // indisponível nesta visualização: cai para o link comum
    }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  return "fallback";
}
