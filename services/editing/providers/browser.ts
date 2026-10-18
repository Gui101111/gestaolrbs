import type { VideoEditingProvider } from "../types";

/**
 * Edição no próprio navegador de quem enviou (motor de lib/browser-editor):
 * o job fica na fila e o app aberto pega, edita e entrega os MP4 pelas ações
 * de lib/actions/browser-editing.ts. Sem custo de servidor nem de API.
 */
export const browserProvider: VideoEditingProvider = {
  name: "navegador",
  async dispatch() {
    return { status: "queued", message: "A edição começa no seu navegador." };
  },
};
