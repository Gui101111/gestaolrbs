import type { VideoEditingProvider } from "../types";

/**
 * Esqueleto do provedor baseado em Claude Managed Agents.
 *
 * TODO (quando habilitar VIDEO_EDITING_PROVIDER=claude):
 *  1. Criar (uma vez, fora do caminho da requisição) um Agent com ambiente que tenha
 *     FFmpeg + Whisper instalados e as instruções de edição jurídica da plataforma.
 *  2. Aqui, abrir uma Session referenciando o agent id salvo em env, anexando
 *     o briefing (JSON) e a URL assinada do vídeo original.
 *  3. Acompanhar os eventos da sessão em um worker (não no request do Next) e
 *     traduzir o progresso em chamadas a /api/jobs/callback.
 *  4. Ao final, enviar os MP4 ao bucket rendered-videos e reportar `outputs`.
 *
 * Enquanto isso, a análise semântica isolada já está disponível em
 * services/ai/analysis.ts (Claude → plano de edição estruturado).
 */
export const claudeAgentProvider: VideoEditingProvider = {
  name: "claude",
  async dispatch() {
    if (!process.env.ANTHROPIC_API_KEY || !process.env.CLAUDE_EDITING_AGENT_ID) {
      throw new Error("claude_provider_not_configured");
    }
    throw new Error("claude_provider_not_implemented");
  },
};
