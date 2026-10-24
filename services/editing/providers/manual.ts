import type { VideoEditingProvider } from "../types";

/**
 * Modo manual (padrão): o job fica na fila e a equipe entrega pelo painel admin,
 * avançando as etapas e enviando os arquivos editados por formato.
 */
export const manualProvider: VideoEditingProvider = {
  name: "manual",
  async dispatch() {
    return { status: "queued", message: "Aguardando processamento pela equipe." };
  },
};
