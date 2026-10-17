import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { manualProvider } from "./providers/manual";
import { externalWorkerProvider } from "./providers/external-worker";
import { claudeAgentProvider } from "./providers/claude-agent";
import { isClaudeConfigured } from "./claude/config";
import type { VideoEditingProvider } from "./types";

const PROVIDERS: Record<string, VideoEditingProvider> = {
  manual: manualProvider,
  external: externalWorkerProvider,
  claude: claudeAgentProvider,
};

export const PROVIDER_KEYS = ["manual", "claude", "external"] as const;
export type ProviderKey = (typeof PROVIDER_KEYS)[number];
export const SETTING_PROVIDER = "editing_provider";

/** Provedor padrão do ambiente (VIDEO_EDITING_PROVIDER; padrão: manual). */
export function getEditingProvider(): VideoEditingProvider {
  const key = (process.env.VIDEO_EDITING_PROVIDER ?? "manual").toLowerCase();
  return PROVIDERS[key] ?? manualProvider;
}

let cache: { key: string | null; at: number } | null = null;

/** Valor salvo pelo admin em app_settings (cache de 15 s). */
export async function providerOverride(): Promise<ProviderKey | null> {
  if (cache && Date.now() - cache.at < 15_000) return cache.key as ProviderKey | null;
  const { data } = await createAdminClient().from("app_settings").select("value").eq("key", SETTING_PROVIDER).maybeSingle();
  const key = typeof data?.value === "string" && (PROVIDER_KEYS as readonly string[]).includes(data.value) ? data.value : null;
  cache = { key, at: Date.now() };
  return key as ProviderKey | null;
}

export function clearProviderCache() {
  cache = null;
}

/**
 * Provedor ativo: a escolha do admin (sem deploy) vence a variável de ambiente.
 * "claude" sem chave configurada cai para o manual, para nenhum vídeo travar.
 */
export async function resolveEditingProvider(): Promise<VideoEditingProvider> {
  const override = await providerOverride().catch(() => null);
  const provider = override ? PROVIDERS[override] : getEditingProvider();
  if (provider.name === "claude" && !isClaudeConfigured()) return manualProvider;
  return provider;
}

/** Provedor por chave, sem fallback (o admin escolheu explicitamente). */
export function providerByKey(key: ProviderKey): VideoEditingProvider {
  return PROVIDERS[key] ?? manualProvider;
}

export * from "./types";
