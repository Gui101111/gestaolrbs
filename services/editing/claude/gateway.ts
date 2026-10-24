import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { TOOLKIT_MOUNT } from "@/lib/claude/guia-edicao";
import { claudeConfig } from "./config";

export type SessionUsage = {
  costCents: number | null;
  activeSeconds: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  cacheReadTokens: number | null;
};

export type SessionInfo = { status: "idle" | "running" | "rescheduling" | "terminated"; archived: boolean; usage: SessionUsage };

export type StopReason = "end_turn" | "requires_action" | "retries_exhausted" | "budget_reached" | "refusal" | null;

/**
 * Operações que a plataforma faz numa sessão do agente. Há duas implementações:
 * a real (API da Anthropic) e a local (sandbox nesta máquina, só para desenvolvimento).
 */
export interface ClaudeGateway {
  readonly name: "claude" | "claude-local";
  startSession(input: { title: string; message: string; metadata: Record<string, string> }): Promise<{ sessionId: string }>;
  sendMessage(sessionId: string, message: string): Promise<void>;
  getSession(sessionId: string): Promise<SessionInfo>;
  lastStopReason(sessionId: string): Promise<StopReason>;
  /** Última etapa impressa pelo editor ("ETAPA: ..."), para o progresso na tela. */
  lastStep(sessionId: string): Promise<string | null>;
  listOutputFiles(sessionId: string): Promise<{ id: string; name: string }[]>;
  downloadFile(fileId: string): Promise<Buffer>;
  archive(sessionId: string): Promise<void>;
}

const MA_BETA = "managed-agents-2026-04-01" as const;

function client() {
  return new Anthropic({ apiKey: claudeConfig.apiKey() });
}

function cents(amount: string | undefined | null) {
  const n = Number(amount);
  return Number.isFinite(n) ? n : null;
}

export const anthropicGateway: ClaudeGateway = {
  name: "claude",

  async startSession({ title, message, metadata }) {
    const toolkit = claudeConfig.toolkitFileId();
    const session = await client().beta.sessions.create({
      agent: claudeConfig.agentId(),
      environment_id: claudeConfig.environmentId(),
      title,
      metadata,
      budget: { type: "limit", max_list_cost: { amount: String(Math.round(claudeConfig.budgetUsd() * 100)), currency: "USD" } },
      resources: toolkit ? [{ type: "file", file_id: toolkit, mount_path: TOOLKIT_MOUNT }] : undefined,
      // cria a sessão já trabalhando: a primeira mensagem vai junto
      initial_events: [{ type: "user.message", content: [{ type: "text", text: message }] }],
    });
    return { sessionId: session.id };
  },

  async sendMessage(sessionId, message) {
    await client().beta.sessions.events.send(sessionId, {
      events: [{ type: "user.message", content: [{ type: "text", text: message }] }],
    });
  },

  async getSession(sessionId) {
    const s = await client().beta.sessions.retrieve(sessionId);
    return {
      status: s.status,
      archived: Boolean(s.archived_at),
      usage: {
        costCents: cents(s.usage?.list_cost?.amount),
        activeSeconds: s.usage?.active_seconds ?? null,
        inputTokens: s.usage?.input_tokens ?? null,
        outputTokens: s.usage?.output_tokens ?? null,
        cacheReadTokens: s.usage?.cache_read_input_tokens ?? null,
      },
    };
  },

  async lastStopReason(sessionId) {
    const page = await client().beta.sessions.events.list(sessionId, { order: "desc", types: ["session.status_idle"], limit: 1 });
    const ev = page.data[0];
    if (!ev || ev.type !== "session.status_idle") return null;
    return ev.stop_reason.type as StopReason;
  },

  async lastStep(sessionId) {
    const page = await client().beta.sessions.events.list(sessionId, { order: "desc", limit: 40 });
    for (const ev of page.data) {
      const all = [...JSON.stringify(ev).matchAll(/ETAPA: ([^"\\\n]+)/g)];
      if (all.length) return all[all.length - 1][1].trim();
    }
    return null;
  },

  async listOutputFiles(sessionId) {
    const out: { id: string; name: string }[] = [];
    for await (const f of client().beta.files.list({ scope_id: sessionId, betas: [MA_BETA] })) {
      out.push({ id: f.id, name: f.filename });
    }
    return out;
  },

  async downloadFile(fileId) {
    const res = await client().beta.files.download(fileId);
    return Buffer.from(await res.arrayBuffer());
  },

  async archive(sessionId) {
    await client().beta.sessions.archive(sessionId);
  },
};

let localGateway: ClaudeGateway | null = null;

/** Gateway ativo: sandbox local (dev) ou API da Anthropic; null se nada estiver configurado. */
export async function getClaudeGateway(): Promise<ClaudeGateway | null> {
  if (claudeConfig.localSandbox()) {
    localGateway ??= (await import("./local-gateway")).createLocalGateway();
    return localGateway;
  }
  if (claudeConfig.apiKey() && claudeConfig.agentId() && claudeConfig.environmentId()) return anthropicGateway;
  return null;
}

/** Valida e lê um webhook da Anthropic (assinatura Standard Webhooks). */
export function unwrapWebhook(body: string, headers: Record<string, string>) {
  const key = claudeConfig.webhookKey();
  if (!key) throw new Error("webhook_key_missing");
  return new Anthropic({ apiKey: claudeConfig.apiKey() || "unused" }).beta.webhooks.unwrap(body, { headers, key });
}
