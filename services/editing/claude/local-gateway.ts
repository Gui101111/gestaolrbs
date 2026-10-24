import "server-only";
import { spawn } from "node:child_process";
import { createHmac, randomUUID } from "node:crypto";
import { appendFile, copyFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { briefFromMessage } from "./message";
import type { ClaudeGateway, SessionInfo, StopReason } from "./gateway";

/**
 * Sandbox local (CLAUDE_LOCAL_SANDBOX=1, só em desenvolvimento).
 *
 * Faz o papel da sessão do agente sem chamar a API: roda o mesmo editor de
 * referência (sandbox/tribuna_editor.py) nesta máquina, com as URLs assinadas
 * de verdade, e ao terminar dispara um webhook assinado para
 * /api/webhooks/claude, exatamente como a Anthropic faria. Assim dá para
 * testar envio → edição → entrega de ponta a ponta antes de ter a chave da API.
 */

const ROOT = path.join(os.tmpdir(), "tribuna-local-sandbox");
const EDITOR = path.join(process.cwd(), "sandbox", "tribuna_editor.py");

type State = { status: SessionInfo["status"]; stopReason: StopReason; archived: boolean; etapa: string | null; activeMs: number };

const dirOf = (id: string) => path.join(ROOT, id.replace(/[^\w-]/g, ""));

async function readState(id: string): Promise<State | null> {
  try {
    return JSON.parse(await readFile(path.join(dirOf(id), "state.json"), "utf8")) as State;
  } catch {
    return null;
  }
}

async function writeState(id: string, patch: Partial<State>) {
  const cur = (await readState(id)) ?? { status: "idle", stopReason: null, archived: false, etapa: null, activeMs: 0 };
  await writeFile(path.join(dirOf(id), "state.json"), JSON.stringify({ ...cur, ...patch }), "utf8");
}

/** Assina como a Anthropic (Standard Webhooks: HMAC-SHA256 de "id.timestamp.corpo"). */
export function signWebhook(body: string, key: string, msgId: string, timestamp = Math.floor(Date.now() / 1000)) {
  const secret = Buffer.from(key.replace(/^whsec_/, ""), "base64");
  const sig = createHmac("sha256", secret).update(`${msgId}.${timestamp}.${body}`).digest("base64");
  return { "webhook-id": msgId, "webhook-timestamp": String(timestamp), "webhook-signature": `v1,${sig}` };
}

async function sendWebhook(type: "session.status_idled" | "session.status_terminated", sessionId: string) {
  const key = process.env.ANTHROPIC_WEBHOOK_SIGNING_KEY;
  if (!key) {
    console.error("[sandbox-local] ANTHROPIC_WEBHOOK_SIGNING_KEY ausente: webhook não enviado");
    return;
  }
  const id = `whe_local_${randomUUID()}`;
  const body = JSON.stringify({
    type: "event",
    id,
    created_at: new Date().toISOString(),
    data: { type, id: sessionId, organization_id: "local", workspace_id: "local" },
  });
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${site}/api/webhooks/claude`, {
        method: "POST",
        headers: { "content-type": "application/json", ...signWebhook(body, key, id) },
        body,
      });
      if (res.ok) return;
      console.error("[sandbox-local] webhook respondeu", res.status, await res.text().catch(() => ""));
    } catch (e) {
      console.error("[sandbox-local] falha ao enviar webhook", e);
    }
    await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
  }
}

async function run(sessionId: string, message: string) {
  const brief = briefFromMessage(message);
  const dir = dirOf(sessionId);
  await mkdir(path.join(dir, "work"), { recursive: true });
  await appendFile(path.join(dir, "mensagens.txt"), `${new Date().toISOString()}\n${message}\n\n`);
  if (!brief) {
    await writeState(sessionId, { status: "idle", stopReason: "end_turn" });
    void sendWebhook("session.status_idled", sessionId);
    return;
  }
  // teste: sem whisper nesta máquina, aceita a transcrição esperada do vídeo de teste
  const sidecar = process.env.TRIBUNA_LOCAL_TRANSCRICAO;
  if (sidecar) await copyFile(sidecar, path.join(dir, "work", "transcricao.json")).catch(() => undefined);
  const briefPath = path.join(dir, "brief.json");
  await writeFile(briefPath, JSON.stringify(brief), "utf8");
  await writeState(sessionId, { status: "running", stopReason: null, etapa: "iniciando" });
  const started = Date.now();
  const child = spawn("python3", [EDITOR, "tudo", "--brief", briefPath, "--work", path.join(dir, "work"), "--report-erro"], {
    cwd: process.cwd(),
    env: { ...process.env, TRIBUNA_PRESET: process.env.TRIBUNA_PRESET ?? "veryfast" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const log = path.join(dir, "editor.log");
  const onData = (chunk: Buffer) => {
    const text = chunk.toString();
    void appendFile(log, text);
    const steps = [...text.matchAll(/ETAPA: ([^\n]+)/g)];
    if (steps.length) void writeState(sessionId, { etapa: steps[steps.length - 1][1].trim() });
  };
  child.stdout.on("data", onData);
  child.stderr.on("data", onData);
  child.on("error", async (e) => {
    await appendFile(log, `\n[erro ao iniciar] ${e.message}\n`);
    await writeState(sessionId, { status: "terminated", stopReason: null });
    void sendWebhook("session.status_terminated", sessionId);
  });
  child.on("close", async (code) => {
    const cur = await readState(sessionId);
    await writeState(sessionId, { status: "idle", stopReason: "end_turn", activeMs: (cur?.activeMs ?? 0) + (Date.now() - started) });
    await appendFile(log, `\n[editor terminou com código ${code}]\n`);
    void sendWebhook("session.status_idled", sessionId);
  });
}

export function createLocalGateway(): ClaudeGateway {
  return {
    name: "claude-local",

    async startSession({ message }) {
      const sessionId = `sesn_local_${randomUUID().replace(/-/g, "").slice(0, 20)}`;
      await mkdir(dirOf(sessionId), { recursive: true });
      await writeState(sessionId, { status: "running" });
      void run(sessionId, message);
      return { sessionId };
    },

    async sendMessage(sessionId, message) {
      const st = await readState(sessionId);
      if (!st || st.archived) throw new Error("session_not_found");
      void run(sessionId, message);
    },

    async getSession(sessionId) {
      const st = await readState(sessionId);
      if (!st) throw new Error("session_not_found");
      return {
        status: st.status,
        archived: st.archived,
        usage: { costCents: 0, activeSeconds: Math.round(st.activeMs / 1000), inputTokens: 0, outputTokens: 0, cacheReadTokens: 0 },
      };
    },

    async lastStopReason(sessionId) {
      return (await readState(sessionId))?.stopReason ?? null;
    },

    async lastStep(sessionId) {
      return (await readState(sessionId))?.etapa ?? null;
    },

    async listOutputFiles(sessionId) {
      const out: { id: string; name: string }[] = [];
      for (const sub of ["work/saida", "work"]) {
        const base = path.join(dirOf(sessionId), sub);
        for (const name of await readdir(base).catch(() => [] as string[])) {
          if (/\.(mp4|jpg|json)$/.test(name) && !out.some((o) => o.name === name)) out.push({ id: path.join(base, name), name });
        }
      }
      return out;
    },

    async downloadFile(fileId) {
      if (!path.resolve(fileId).startsWith(ROOT)) throw new Error("invalid_file");
      return readFile(fileId);
    },

    async archive(sessionId) {
      await rm(path.join(dirOf(sessionId), "work"), { recursive: true, force: true });
      await writeState(sessionId, { archived: true, status: "idle" });
    },
  };
}
