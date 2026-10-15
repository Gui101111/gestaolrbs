import "server-only";
import { manualProvider } from "./providers/manual";
import { externalWorkerProvider } from "./providers/external-worker";
import { claudeAgentProvider } from "./providers/claude-agent";
import type { VideoEditingProvider } from "./types";

const PROVIDERS: Record<string, VideoEditingProvider> = {
  manual: manualProvider,
  external: externalWorkerProvider,
  claude: claudeAgentProvider,
};

/** Provedor ativo, escolhido por VIDEO_EDITING_PROVIDER (padrão: manual). */
export function getEditingProvider(): VideoEditingProvider {
  const key = (process.env.VIDEO_EDITING_PROVIDER ?? "manual").toLowerCase();
  return PROVIDERS[key] ?? manualProvider;
}

export * from "./types";
