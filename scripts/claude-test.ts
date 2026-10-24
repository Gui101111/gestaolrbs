/**
 * Teste de ponta a ponta da edição automática (Parte 2, seção 2.9).
 *
 *   npm run claude:test -- caminho/do/video.mp4 [--formatos 9:16,1:1] [--estilo dinamico]
 *
 * Cria (ou reaproveita) um usuário de teste, sobe o vídeo, cria o projeto e o
 * job, inicia a sessão do agente e acompanha até o fim. Imprime o report.json,
 * o tempo total, o custo e os links dos vídeos. Com CLAUDE_LOCAL_SANDBOX=1 roda
 * na sandbox local (sem a API); senão, no Claude Managed Agents de verdade.
 *
 * Sugestões de vídeo (2.9): vertical de celular, horizontal, com silêncio longo e
 * com uma frase que deveria gerar alerta da OAB. Gere um sintético com:
 *   npm run sandbox:teste -- --saida /tmp/teste --imagem public/media/justica-busto.webp [--vertical]
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUCKETS } from "@/lib/constants/domain";
import { platformsForRatios, recommendedFor, settingsFromAnswers } from "@/lib/constants/questions";
import { dispatchJob } from "@/services/editing/dispatch";
import { getClaudeGateway } from "@/services/editing/claude/gateway";
import { finalizeSession } from "@/services/editing/claude/session-lifecycle";

const argv = process.argv.slice(2);
const flag = (name: string, fallback: string) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const videoPath = argv.find((a) => !a.startsWith("--") && !argv[argv.indexOf(a) - 1]?.startsWith("--"));
const ratios = flag("formatos", "9:16,16:9").split(",").map((s) => s.trim());
const style = flag("estilo", "dinamico");
const provider = flag("provedor", "claude") as "claude" | "external";
const EMAIL = process.env.CLAUDE_TEST_EMAIL ?? "teste.claude@tribuna.local";

function probe(file: string) {
  const out = execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:format=duration", "-of", "json", file]).toString();
  const j = JSON.parse(out) as { streams: { width: number; height: number }[]; format: { duration: string } };
  return { width: j.streams[0]?.width ?? null, height: j.streams[0]?.height ?? null, duration: Number(j.format.duration) };
}

async function ensureUser(admin: ReturnType<typeof createAdminClient>) {
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  let user = list?.users.find((u) => u.email === EMAIL);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({ email: EMAIL, password: crypto.randomUUID(), email_confirm: true, user_metadata: { full_name: "Dra. Teste Claude" } });
    if (error || !data.user) throw new Error(`não criou o usuário de teste: ${error?.message}`);
    user = data.user;
  }
  await admin
    .from("profiles")
    .update({ full_name: "Dra. Teste Claude", oab_number: "123456", oab_uf: "SP", office_name: "Teste Advocacia", onboarding_completed_at: new Date().toISOString() })
    .eq("id", user.id);
  return user.id;
}

async function main() {
  if (!videoPath || !fs.existsSync(videoPath)) throw new Error("Informe o caminho de um vídeo: npm run claude:test -- video.mp4");
  const admin = createAdminClient();
  const gw = provider === "claude" ? await getClaudeGateway() : null;
  if (provider === "claude" && !gw) throw new Error("Claude não configurado: defina ANTHROPIC_API_KEY, CLAUDE_AGENT_ID e CLAUDE_ENVIRONMENT_ID (ou CLAUDE_LOCAL_SANDBOX=1)");
  if (provider === "external" && !process.env.EDITING_WORKER_URL) throw new Error("Defina EDITING_WORKER_URL (rode o worker com npm run worker)");
  const modo = provider === "external" ? "worker próprio" : gw?.name === "claude-local" ? "sandbox local" : "Claude Managed Agents";
  console.log(`Modo: ${modo} · formatos ${ratios.join(", ")} · estilo ${style}`);

  const userId = await ensureUser(admin);
  const info = probe(videoPath);
  const answers = recommendedFor(style);
  const { data: project, error: pErr } = await admin
    .from("projects")
    .insert({
      user_id: userId,
      name: `Teste ${path.basename(videoPath)} ${new Date().toLocaleString("pt-BR")}`,
      status: "queued",
      editing_style: style,
      aspect_ratios: ratios,
      platforms: platformsForRatios(ratios),
      legal_area: "previdenciario",
      objective: "conteudo_organico",
      settings: settingsFromAnswers(answers),
      options: { answers, answers_text: {} },
      instructions: "Teste automático do fluxo de edição.",
      submitted_at: new Date().toISOString(),
      source_width: info.width,
      source_height: info.height,
    })
    .select("*")
    .single();
  if (pErr || !project) throw new Error(`não criou o projeto: ${pErr?.message}`);

  const storagePath = `${userId}/${project.id}/${Date.now()}-${path.basename(videoPath).replace(/[^\w.-]/g, "_")}`;
  const { error: upErr } = await admin.storage.from(BUCKETS.originals).upload(storagePath, fs.readFileSync(videoPath), { contentType: "video/mp4" });
  if (upErr) throw new Error(`upload falhou: ${upErr.message}`);
  await admin.from("project_files").insert({
    project_id: project.id,
    user_id: userId,
    kind: "original",
    bucket: BUCKETS.originals,
    storage_path: storagePath,
    file_name: path.basename(videoPath),
    mime_type: "video/mp4",
    size_bytes: fs.statSync(videoPath).size,
    status: "uploaded",
    width: info.width,
    height: info.height,
    duration_sec: info.duration,
  });
  const { data: job } = await admin.from("render_jobs").insert({ project_id: project.id, user_id: userId, kind: "initial" }).select("*").single();
  if (!job) throw new Error("não criou o job");

  const started = Date.now();
  const res = await dispatchJob(job, { provider });
  if (!res.ok) throw new Error(`dispatch falhou: ${res.code}`);

  if (provider === "external") {
    for (;;) {
      await new Promise((r) => setTimeout(r, 5_000));
      const { data: p } = await admin.from("projects").select("status").eq("id", project.id).single();
      const { data: j } = await admin.from("render_jobs").select("current_step, status, error_code").eq("id", job.id).single();
      console.log(`  ${Math.round((Date.now() - started) / 1000)}s · ${j?.current_step} · ${j?.status}`);
      if (p?.status === "ready" || j?.status === "failed") break;
      if (Date.now() - started > 60 * 60_000) throw new Error("tempo esgotado (60 min)");
    }
    const { data: p } = await admin.from("projects").select("status").eq("id", project.id).single();
    const { data: renders } = await admin.from("renders").select("aspect_ratio, storage_path, duration_sec, thumbnail_path").eq("project_id", project.id);
    console.log(`\n=== Resultado ===\nStatus do projeto: ${p?.status} · tempo total ${Math.round((Date.now() - started) / 1000)} s`);
    for (const r of renders ?? []) console.log(`${r.aspect_ratio} (${r.duration_sec}s): ${r.storage_path}${r.thumbnail_path ? " + miniatura" : ""}`);
    return;
  }

  const { data: es0 } = await admin.from("editing_sessions").select("session_id").eq("job_id", job.id).single();
  console.log(`Sessão ${es0?.session_id} iniciada para o projeto ${project.id}`);
  const claudeGw = gw!;

  let lastStep = "";
  for (;;) {
    await new Promise((r) => setTimeout(r, 10_000));
    const { data: es } = await admin.from("editing_sessions").select("*").eq("job_id", job.id).single();
    if (!es) throw new Error("sessão sumiu");
    if (["in_review", "delivered", "failed"].includes(es.status)) break;
    const step = await claudeGw.lastStep(es.session_id).catch(() => null);
    if (step && step !== lastStep) {
      lastStep = step;
      console.log(`  ${Math.round((Date.now() - started) / 1000)}s · ${step}`);
    }
    const s = await claudeGw.getSession(es.session_id);
    if (s.status === "idle" && es.status === "running") {
      const r = await finalizeSession(es.session_id);
      console.log(`  finalização: ${r.outcome}`);
    }
    if (s.status === "terminated") throw new Error("sessão encerrada sem entregar");
    if (Date.now() - started > 90 * 60_000) throw new Error("tempo esgotado (90 min)");
  }

  const { data: es } = await admin.from("editing_sessions").select("*").eq("job_id", job.id).single();
  const { data: renders } = await admin.from("renders").select("aspect_ratio, storage_path, duration_sec, published").eq("job_id", job.id);
  console.log("\n=== Resultado ===");
  console.log(`Status: ${es?.status}${es?.error ? ` · ${es.error}` : ""}`);
  console.log(`Tempo total: ${Math.round((Date.now() - started) / 1000)} s · tempo ativo do agente: ${es?.active_seconds ?? "?"} s`);
  console.log(`Custo (preço de lista): ${es?.cost_cents != null ? `US$ ${(es.cost_cents / 100).toFixed(2)}` : "—"}`);
  console.log(`Uso: ${JSON.stringify(es?.usage ?? {})}`);
  console.log("report.json:");
  console.log(JSON.stringify(es?.report ?? null, null, 2));
  for (const r of renders ?? []) {
    const { data } = await admin.storage.from(BUCKETS.renders).createSignedUrl(r.storage_path, 60 * 60);
    console.log(`${r.aspect_ratio} (${r.duration_sec}s${r.published ? "" : ", aguardando liberação"}): ${data?.signedUrl}`);
  }
  console.log(`\nAdmin: ${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/admin/projetos/${project.id}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Falhou:", e instanceof Error ? e.message : e);
    process.exit(1);
  });
