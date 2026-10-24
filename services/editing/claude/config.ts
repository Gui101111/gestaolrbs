/**
 * Configuração do editor com Claude Managed Agents (lida do ambiente).
 * Nada aqui vai para o navegador.
 */
export const claudeConfig = {
  apiKey: () => process.env.ANTHROPIC_API_KEY ?? "",
  agentId: () => process.env.CLAUDE_AGENT_ID ?? "",
  environmentId: () => process.env.CLAUDE_ENVIRONMENT_ID ?? "",
  /** Editor de referência enviado pela Files API no setup (montado em cada sessão). */
  toolkitFileId: () => process.env.CLAUDE_TOOLKIT_FILE_ID ?? "",
  webhookKey: () => process.env.ANTHROPIC_WEBHOOK_SIGNING_KEY ?? "",
  /** Limite de gasto por sessão, em dólares (preço de lista). */
  budgetUsd: () => {
    const v = Number(process.env.CLAUDE_SESSION_BUDGET_USD ?? "5");
    return Number.isFinite(v) && v > 0 ? v : 5;
  },
  /** true: a equipe revisa no /admin antes de liberar ao cliente. */
  humanReview: () => (process.env.HUMAN_REVIEW ?? "true").toLowerCase() !== "false",
  /** Sandbox local (só desenvolvimento): roda o editor nesta máquina, sem a API. */
  localSandbox: () => process.env.CLAUDE_LOCAL_SANDBOX === "1" && process.env.NODE_ENV !== "production",
  /** Minutos até o cron considerar uma sessão sem resposta. */
  staleMinutes: () => Number(process.env.CLAUDE_STALE_MINUTES ?? "45"),
};

export function isClaudeConfigured() {
  return claudeConfig.localSandbox() || Boolean(claudeConfig.apiKey() && claudeConfig.agentId() && claudeConfig.environmentId());
}
