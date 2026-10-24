/**
 * Teste de contrato do gateway real (API da Anthropic) contra um servidor falso.
 *   npm run test:claude
 *
 * Confere o que o app envia (rotas, header beta, budget, initial_events, toolkit)
 * e exercita a finalização com o plano B: o "agente" não subiu nada para o
 * Storage, só gravou em /mnt/session/outputs; a plataforma lista e baixa pela
 * Files API, registra as entregas, o custo e manda para revisão.
 * Requer o Supabase local (usa o banco e o Storage de verdade).
 */
import http from "node:http";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AddressInfo } from "node:net";

type Req = { method: string; url: string; headers: http.IncomingHttpHeaders; body: string };
const requests: Req[] = [];
let pass = 0;
let fail = 0;
const check = (name: string, ok: boolean, extra = "") => {
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? "✓" : "✗"} ${name}${extra ? `  — ${extra}` : ""}`);
};

// arquivos que o "agente" deixou em /mnt/session/outputs
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "tribuna-contrato-"));
const ff = (args: string[]) => execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...args]);
ff(["-f", "lavfi", "-i", "color=c=0x1c1f24:s=1080x1920:r=30:d=2", "-f", "lavfi", "-i", "sine=f=220:d=2", "-shortest", "-c:v", "libx264", "-c:a", "aac", path.join(tmp, "9x16.mp4")]);
ff(["-i", path.join(tmp, "9x16.mp4"), "-frames:v", "1", path.join(tmp, "9x16.jpg")]);
fs.writeFileSync(
  path.join(tmp, "report.json"),
  JSON.stringify({
    status: "ok",
    versao: 1,
    formatos: [{ formato: "9:16", arquivo: "9x16.mp4", miniatura: "9x16.jpg", duracao_s: 2, largura: 1080, altura: 1920 }],
    cortes: 3,
    duracao_original_s: 4,
    duracao_final_s: 2,
    oab_alertas: [{ tempo: "00:01", tempo_s: 1, frase: "Eu garanto o resultado.", motivo: "promessa de resultado" }],
    observacoes: "contrato",
  }),
);
fs.writeFileSync(path.join(tmp, "plano.json"), JSON.stringify({ versao: 1, cortes: [] }));
const FILES = ["9x16.mp4", "9x16.jpg", "report.json", "plano.json"].map((name, i) => ({ id: `file_${i}`, name }));

const SESSION = "sesn_contrato_01";
const json = (res: http.ServerResponse, body: unknown, status = 200) => {
  res.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(body));
};

const server = http.createServer(async (req, res) => {
  let body = "";
  for await (const c of req) body += c;
  requests.push({ method: req.method ?? "", url: req.url ?? "", headers: req.headers, body });
  const url = new URL(req.url ?? "/", "http://x");
  const p = url.pathname;
  const session = { type: "session", id: SESSION, status: "idle", archived_at: null, usage: { list_cost: { amount: "137", currency: "USD" }, active_seconds: 412, input_tokens: 9000, output_tokens: 1200 } };
  if (req.method === "POST" && p === "/v1/sessions") return json(res, { ...session, status: "running" });
  if (req.method === "GET" && p === `/v1/sessions/${SESSION}`) return json(res, session);
  if (req.method === "GET" && p === `/v1/sessions/${SESSION}/events`) {
    return json(res, { data: [{ type: "session.status_idle", id: "sevt_1", processed_at: new Date().toISOString(), stop_reason: { type: "end_turn" } }], next_page: null });
  }
  if (req.method === "POST" && p === `/v1/sessions/${SESSION}/events`) return json(res, { data: [] });
  if (req.method === "POST" && p === `/v1/sessions/${SESSION}/archive`) return json(res, { ...session, archived_at: new Date().toISOString() });
  if (req.method === "GET" && p === "/v1/files") {
    return json(res, { data: FILES.map((f) => ({ type: "file", id: f.id, filename: f.name, size_bytes: 1, mime_type: "application/octet-stream", created_at: "" })), next_page: null, has_more: false });
  }
  const dl = p.match(/^\/v1\/files\/(file_\d)\/content$/);
  if (req.method === "GET" && dl) {
    const f = FILES.find((x) => x.id === dl[1]);
    res.writeHead(200, { "content-type": "application/octet-stream" }).end(fs.readFileSync(path.join(tmp, f!.name)));
    return;
  }
  json(res, { type: "error", error: { type: "not_found_error", message: `${req.method} ${p}` } }, 404);
});

async function main() {
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const port = (server.address() as AddressInfo).port;
  Object.assign(process.env, {
    ANTHROPIC_BASE_URL: `http://127.0.0.1:${port}`,
    ANTHROPIC_API_KEY: "sk-ant-teste",
    CLAUDE_AGENT_ID: "agent_teste",
    CLAUDE_ENVIRONMENT_ID: "env_teste",
    CLAUDE_TOOLKIT_FILE_ID: "file_toolkit",
    CLAUDE_LOCAL_SANDBOX: "0",
    CLAUDE_SESSION_BUDGET_USD: "4.5",
    HUMAN_REVIEW: "true",
  });

  const { anthropicGateway } = await import("@/services/editing/claude/gateway");
  const { finalizeSession } = await import("@/services/editing/claude/session-lifecycle");
  const { createAdminClient } = await import("@/lib/supabase/admin");

  // 1) criação da sessão
  const { sessionId } = await anthropicGateway.startSession({ title: "projeto x v1", message: "NOVO VÍDEO", metadata: { project_id: "x" } });
  const create = requests.find((r) => r.method === "POST" && r.url.startsWith("/v1/sessions"))!;
  const cb = JSON.parse(create.body);
  check("sessions.create chama POST /v1/sessions", Boolean(create) && sessionId === SESSION);
  check("header beta managed-agents", String(create.headers["anthropic-beta"] ?? "").includes("managed-agents-2026-04-01"), String(create.headers["anthropic-beta"]));
  check("chave enviada no header x-api-key", create.headers["x-api-key"] === "sk-ant-teste");
  check("agente e ambiente do .env", cb.agent === "agent_teste" && cb.environment_id === "env_teste");
  check("budget em centavos de dólar", cb.budget?.type === "limit" && cb.budget.max_list_cost.amount === "450" && cb.budget.max_list_cost.currency === "USD", JSON.stringify(cb.budget));
  check("primeira mensagem em initial_events", cb.initial_events?.[0]?.type === "user.message" && cb.initial_events[0].content[0].text === "NOVO VÍDEO");
  check("toolkit montado como arquivo", cb.resources?.[0]?.type === "file" && cb.resources[0].file_id === "file_toolkit" && cb.resources[0].mount_path === "/tribuna/tribuna_editor.py");

  // 2) mensagem de ajuste
  await anthropicGateway.sendMessage(SESSION, "AJUSTE");
  const send = requests.find((r) => r.method === "POST" && r.url.split("?")[0] === `/v1/sessions/${SESSION}/events`)!;
  check("ajuste vai como user.message na mesma sessão", JSON.parse(send.body).events?.[0]?.type === "user.message");

  // 3) motivo da parada e arquivos
  check("lê stop_reason do último session.status_idle", (await anthropicGateway.lastStopReason(SESSION)) === "end_turn");
  const evReq = requests.filter((r) => r.url.startsWith(`/v1/sessions/${SESSION}/events?`)).pop()!;
  check("events.list filtra por tipo e ordem desc", evReq.url.includes("order=desc") && evReq.url.includes("session.status_idle"), evReq.url);
  const files = await anthropicGateway.listOutputFiles(SESSION);
  const fReq = requests.find((r) => r.url.startsWith("/v1/files?"))!;
  check("files.list usa scope_id da sessão", fReq.url.includes(`scope_id=${SESSION}`), fReq.url);
  check("files.list envia o beta managed-agents", String(fReq.headers["anthropic-beta"] ?? "").includes("managed-agents-2026-04-01"), String(fReq.headers["anthropic-beta"]));
  check("lista os 4 arquivos de saída", files.length === 4);

  // 4) finalização com plano B (nada no Storage, tudo vem da Files API)
  const admin = createAdminClient();
  const { data: users } = await admin.auth.admin.listUsers({ perPage: 1 });
  const userId = users.users[0].id;
  const { data: project } = await admin.from("projects").insert({ user_id: userId, name: "Contrato Claude", status: "processing", aspect_ratios: ["9:16"] }).select("id").single();
  const { data: job } = await admin.from("render_jobs").insert({ project_id: project!.id, user_id: userId, status: "running", kind: "initial", provider: "claude" }).select("id").single();
  await admin.from("editing_sessions").insert({ job_id: job!.id, project_id: project!.id, user_id: userId, provider: "claude", session_id: SESSION, version: 1 });
  const out = await finalizeSession(SESSION);
  check("finalização termina em revisão humana", out.outcome === "in_review", out.outcome);
  const { data: es } = await admin.from("editing_sessions").select("*").eq("job_id", job!.id).single();
  check("custo e tempo registrados", es?.cost_cents === 137 && es?.active_seconds === 412, `${es?.cost_cents} / ${es?.active_seconds}`);
  const { data: renders } = await admin.from("renders").select("storage_path, published, thumbnail_path").eq("job_id", job!.id);
  check("entrega copiada da Files API para o Storage", renders?.length === 1 && renders[0].storage_path.endsWith("/v1/9x16.mp4") && Boolean(renders[0].thumbnail_path));
  check("entrega oculta até a liberação", renders?.[0]?.published === false);
  const { data: rj } = await admin.from("render_jobs").select("review_status, compliance_flags").eq("id", job!.id).single();
  check("alertas da OAB salvos no job", Array.isArray(rj?.compliance_flags) && (rj!.compliance_flags as unknown[]).length === 1 && rj?.review_status === "pending");
  const again = await finalizeSession(SESSION);
  check("webhook repetido não duplica a entrega", again.outcome === "no_active_job", again.outcome);

  // limpeza
  const { data: objs } = await admin.storage.from("rendered-videos").list(`${userId}/${project!.id}/v1`);
  await admin.storage.from("rendered-videos").remove((objs ?? []).map((o) => `${userId}/${project!.id}/v1/${o.name}`));
  await admin.from("projects").delete().eq("id", project!.id);
  fs.rmSync(tmp, { recursive: true, force: true });
  server.close();
  console.log(`\n${pass} passaram, ${fail} falharam`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error("Falhou:", e);
  server.close();
  process.exit(1);
});
