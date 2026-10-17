import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUCKETS, stepIndex, type PipelineStep } from "@/lib/constants/domain";
import type { Json, Tables } from "@/types/database";
import { addRender, advanceJob, completeProject } from "../lifecycle";
import type { EditBrief } from "../types";
import { claudeConfig } from "./config";
import { getClaudeGateway, type ClaudeGateway, type StopReason } from "./gateway";
import { messageForFollowup } from "./message";
import { outputFileName, outputPaths, type OutputPaths } from "./paths";
import { buildSandboxBrief } from "./sandbox-brief";

type Admin = ReturnType<typeof createAdminClient>;
type EditingSession = Tables<"editing_sessions">;

export type SandboxReport = {
  status: "ok" | "erro";
  versao?: number;
  motivo?: string;
  formatos?: { formato: string; arquivo?: string; miniatura?: string; duracao_s?: number; largura?: number; altura?: number; tamanho_bytes?: number }[];
  cortes?: number;
  duracao_original_s?: number;
  duracao_final_s?: number;
  legendas?: boolean;
  oab_alertas?: { tempo?: string; tempo_s?: number; frase?: string; motivo?: string }[];
  observacoes?: string;
};

export type ComplianceFlag = { tempo: string; tempoSec: number | null; frase: string; motivo: string };

const MOTIVOS: Record<Exclude<StopReason, "end_turn" | null>, string> = {
  requires_action: "A sessão parou esperando uma aprovação de ferramenta.",
  budget_reached: "A sessão atingiu o limite de gasto configurado.",
  retries_exhausted: "A sessão esgotou as novas tentativas automáticas.",
  refusal: "O modelo se recusou a concluir a edição.",
};

/** Texto do editor ("ETAPA: ...") → etapa da linha do tempo do cliente. */
export function stepFromEtapa(etapa: string | null): PipelineStep | null {
  if (!etapa) return null;
  const e = etapa.toLowerCase();
  if (/iniciando|baixando|medindo|extraindo/.test(e)) return "analyzing_audio";
  if (/transcrevendo/.test(e)) return "transcribing";
  if (/rastreando|rosto/.test(e)) return "analyzing_content";
  if (/planejando/.test(e)) return "planning";
  if (/renderizando/.test(e)) return "rendering";
  if (/enviando/.test(e)) return "rendering";
  return null;
}

/** Próxima versão das entregas do projeto (v1, v2...). */
export async function nextVersion(admin: Admin, projectId: string) {
  const [{ data: r }, { data: s }] = await Promise.all([
    admin.from("renders").select("version").eq("project_id", projectId).order("version", { ascending: false }).limit(1).maybeSingle(),
    admin.from("editing_sessions").select("version").eq("project_id", projectId).order("version", { ascending: false }).limit(1).maybeSingle(),
  ]);
  return Math.max(r?.version ?? 0, s?.version ?? 0) + 1;
}

async function storageFile(admin: Admin, path: string) {
  const slash = path.lastIndexOf("/");
  const { data } = await admin.storage.from(BUCKETS.renders).list(path.slice(0, slash), { search: path.slice(slash + 1), limit: 5 });
  const f = data?.find((x) => x.name === path.slice(slash + 1));
  return f ? { size: Number((f.metadata as { size?: number } | null)?.size ?? 0) } : null;
}

async function missingFiles(admin: Admin, paths: OutputPaths) {
  const need = [paths.report, ...Object.values(paths.formats).map((f) => f.video)];
  const out: string[] = [];
  for (const p of need) if (!(await storageFile(admin, p))) out.push(p);
  return out;
}

async function downloadJson<T>(admin: Admin, path: string): Promise<T | null> {
  const { data } = await admin.storage.from(BUCKETS.renders).download(path);
  if (!data) return null;
  try {
    return JSON.parse(await data.text()) as T;
  } catch {
    return null;
  }
}

const MIME: Record<string, string> = { mp4: "video/mp4", jpg: "image/jpeg", json: "application/json" };

/** Plano B: copia de /mnt/session/outputs (Files API) para o Storage o que faltou. */
async function recoverFromSessionFiles(gw: ClaudeGateway, admin: Admin, sessionId: string, paths: OutputPaths) {
  let files = await gw.listOutputFiles(sessionId).catch(() => []);
  if (!files.length) {
    await new Promise((r) => setTimeout(r, 3000)); // indexação leva alguns segundos
    files = await gw.listOutputFiles(sessionId).catch(() => []);
  }
  const wanted = [paths.report, paths.plano, paths.transcricao, ...Object.values(paths.formats).flatMap((f) => [f.video, f.thumb])];
  let copied = 0;
  for (const target of wanted) {
    if (await storageFile(admin, target)) continue;
    const file = files.find((f) => f.name === outputFileName(target));
    if (!file) continue;
    const buf = await gw.downloadFile(file.id);
    const ext = target.slice(target.lastIndexOf(".") + 1);
    const { error } = await admin.storage.from(BUCKETS.renders).upload(target, buf, { contentType: MIME[ext] ?? "application/octet-stream", upsert: true });
    if (!error) copied++;
  }
  return copied;
}

async function notifyAdmins(admin: Admin, input: { title: string; body: string; projectId: string }) {
  const { data: admins } = await admin.from("profiles").select("id").eq("role", "admin");
  if (!admins?.length) return;
  await admin.from("notifications").insert(
    admins.map((a) => ({ user_id: a.id, type: "admin_alert", title: input.title, body: input.body, link: `/admin/projetos/${input.projectId}` })),
  );
}

function sanitizeFlags(report: SandboxReport): ComplianceFlag[] {
  return (report.oab_alertas ?? []).slice(0, 30).map((a) => ({
    tempo: String(a.tempo ?? "").slice(0, 8),
    tempoSec: typeof a.tempo_s === "number" ? a.tempo_s : null,
    frase: String(a.frase ?? "").slice(0, 300),
    motivo: String(a.motivo ?? "").slice(0, 120),
  }));
}

async function recordUsage(gw: ClaudeGateway, admin: Admin, es: EditingSession) {
  const info = await gw.getSession(es.session_id).catch(() => null);
  if (!info) return;
  await admin
    .from("editing_sessions")
    .update({ usage: info.usage as unknown as Json, cost_cents: info.usage.costCents, active_seconds: info.usage.activeSeconds })
    .eq("job_id", es.job_id);
}

/**
 * Falha definitiva do agente: o job volta para a fila manual da equipe.
 * O cliente continua vendo "Editando"; o motivo fica só no admin.
 */
export async function failToManualQueue(es: EditingSession, reason: string, admin: Admin = createAdminClient()) {
  await admin.from("editing_sessions").update({ status: "failed", error: reason.slice(0, 1000), finished_at: new Date().toISOString() }).eq("job_id", es.job_id);
  await admin
    .from("render_jobs")
    .update({ provider: "manual", status: "queued", error_code: "claude_failed", error_message: "Seu vídeo seguiu para a edição da equipe." })
    .eq("id", es.job_id);
  await notifyAdmins(admin, { title: "Edição automática falhou", body: `Projeto na fila manual: ${reason.slice(0, 160)}`, projectId: es.project_id });
}

/** session.status_idled: confere os arquivos, registra a entrega e decide revisão ou "Pronto". */
export async function finalizeSession(sessionId: string): Promise<{ ok: boolean; outcome: string }> {
  const admin = createAdminClient();
  const gw = await getClaudeGateway();
  if (!gw) throw new Error("claude_provider_not_configured");

  const { data: rows } = await admin
    .from("editing_sessions")
    .select("*")
    .eq("session_id", sessionId)
    .in("status", ["running", "awaiting_followup"])
    .order("created_at", { ascending: false })
    .limit(1);
  const es = rows?.[0];
  if (!es) return { ok: true, outcome: "no_active_job" };

  // trava: só um processo finaliza (webhook duplicado, cron e reenvios)
  const { data: locked } = await admin
    .from("editing_sessions")
    .update({ status: "finalizing" })
    .eq("job_id", es.job_id)
    .in("status", ["running", "awaiting_followup"])
    .select("*")
    .maybeSingle();
  if (!locked) return { ok: true, outcome: "already_finalizing" };

  try {
    const stop = await gw.lastStopReason(sessionId);
    await admin.from("editing_sessions").update({ stop_reason: stop }).eq("job_id", es.job_id);
    if (stop && stop !== "end_turn") {
      await recordUsage(gw, admin, es);
      await failToManualQueue(es, MOTIVOS[stop], admin);
      return { ok: true, outcome: `failed_${stop}` };
    }

    const { data: job } = await admin.from("render_jobs").select("*").eq("id", es.job_id).single();
    const { data: project } = await admin.from("projects").select("id, aspect_ratios, user_id").eq("id", es.project_id).single();
    if (!job || !project) throw new Error("job_not_found");
    const paths = outputPaths(es.user_id, es.project_id, es.version, project.aspect_ratios);

    let missing = await missingFiles(admin, paths);
    if (missing.length) {
      await recoverFromSessionFiles(gw, admin, sessionId, paths);
      missing = await missingFiles(admin, paths);
    }
    // o agente já desistiu e explicou: não adianta pedir para concluir
    const early = missing.includes(paths.report) ? null : await downloadJson<SandboxReport>(admin, paths.report);
    if (early?.status === "erro") {
      await recordUsage(gw, admin, es);
      await admin.from("editing_sessions").update({ report: early as unknown as Json }).eq("job_id", es.job_id);
      await failToManualQueue(es, `O agente informou erro: ${early.motivo ?? "sem motivo"}`, admin);
      return { ok: true, outcome: "failed_report" };
    }
    if (missing.length) {
      if (es.followups < 1 && job.brief) {
        const { sandbox } = await buildSandboxBrief(admin, { brief: job.brief as unknown as EditBrief, userId: es.user_id, version: es.version, kind: "ajuste" });
        await gw.sendMessage(sessionId, messageForFollowup(sandbox, missing.map(outputFileName)));
        await admin.from("editing_sessions").update({ status: "awaiting_followup", followups: es.followups + 1 }).eq("job_id", es.job_id);
        return { ok: true, outcome: "followup_sent" };
      }
      await recordUsage(gw, admin, es);
      await failToManualQueue(es, `Arquivos ausentes após a nova tentativa: ${missing.map(outputFileName).join(", ")}`, admin);
      return { ok: true, outcome: "failed_missing_files" };
    }

    const report = await downloadJson<SandboxReport>(admin, paths.report);
    if (!report || report.status !== "ok") {
      await recordUsage(gw, admin, es);
      await admin.from("editing_sessions").update({ report: (report ?? null) as unknown as Json }).eq("job_id", es.job_id);
      await failToManualQueue(es, report?.motivo ? `O agente informou erro: ${report.motivo}` : "report.json inválido.", admin);
      return { ok: true, outcome: "failed_report" };
    }
    const plan = await downloadJson<Json>(admin, paths.plano);

    // registra as entregas (idempotente por caminho)
    const humanReview = claudeConfig.humanReview();
    const { data: existing } = await admin.from("renders").select("storage_path").eq("project_id", es.project_id);
    const known = new Set((existing ?? []).map((r) => r.storage_path));
    for (const [ratio, p] of Object.entries(paths.formats)) {
      if (known.has(p.video)) continue;
      const info = report.formatos?.find((f) => f.formato === ratio);
      const thumb = await storageFile(admin, p.thumb);
      const video = await storageFile(admin, p.video);
      await addRender(
        es.project_id,
        {
          aspectRatio: ratio,
          bucket: BUCKETS.renders,
          path: p.video,
          fileName: outputFileName(p.video),
          width: info?.largura ?? null,
          height: info?.altura ?? null,
          durationSec: info?.duracao_s ?? null,
          sizeBytes: info?.tamanho_bytes ?? video?.size ?? null,
          thumbnailPath: thumb ? p.thumb : null,
          jobId: es.job_id,
          version: es.version,
          published: !humanReview,
        },
        admin,
      );
    }

    await admin
      .from("render_jobs")
      .update({ compliance_flags: sanitizeFlags(report) as unknown as NonNullable<Json>, edit_plan: plan ?? job.edit_plan, output_version: es.version })
      .eq("id", es.job_id);
    await admin
      .from("editing_sessions")
      .update({ report: report as unknown as Json, finished_at: new Date().toISOString(), status: humanReview ? "in_review" : "delivered" })
      .eq("job_id", es.job_id);
    await recordUsage(gw, admin, es);

    if (humanReview) {
      await admin.from("render_jobs").update({ review_status: "pending" }).eq("id", es.job_id);
      await advanceJob(es.job_id, { step: "rendering", progress: 96 }, admin);
      await notifyAdmins(admin, { title: "Vídeo aguardando revisão", body: "A edição automática terminou. Confira e libere para o cliente.", projectId: es.project_id });
      return { ok: true, outcome: "in_review" };
    }
    await completeProject(es.project_id, es.job_id, admin);
    return { ok: true, outcome: "delivered" };
  } catch (e) {
    // erro inesperado (rede, banco): libera a trava para o reenvio do webhook ou o cron tentar de novo
    await admin.from("editing_sessions").update({ status: "running" }).eq("job_id", es.job_id).eq("status", "finalizing");
    throw e;
  }
}

/** session.status_terminated: a sessão acabou sem entregar. */
export async function terminateSession(sessionId: string) {
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("editing_sessions")
    .select("*")
    .eq("session_id", sessionId)
    .in("status", ["running", "awaiting_followup", "finalizing"])
    .order("created_at", { ascending: false })
    .limit(1);
  const es = rows?.[0];
  if (!es) return { ok: true, outcome: "no_active_job" };
  await failToManualQueue(es, "A sessão do agente foi encerrada antes de entregar.", admin);
  return { ok: true, outcome: "failed_terminated" };
}

/** Liberação pela equipe (HUMAN_REVIEW=true): publica as entregas e avisa o cliente. */
export async function releaseReview(jobId: string, admin: Admin = createAdminClient()) {
  const { data: job } = await admin.from("render_jobs").select("id, project_id, review_status").eq("id", jobId).single();
  if (!job) throw new Error("job_not_found");
  if (job.review_status !== "pending") throw new Error("not_in_review");
  await admin.from("renders").update({ published: true }).eq("job_id", jobId);
  await admin.from("render_jobs").update({ review_status: "released" }).eq("id", jobId);
  await admin.from("editing_sessions").update({ status: "delivered" }).eq("job_id", jobId);
  await completeProject(job.project_id, jobId, admin);
}

/** Atualiza a etapa na tela do cliente a partir do que o editor imprimiu. */
export async function syncProgress(jobId: string) {
  const admin = createAdminClient();
  const { data: es } = await admin.from("editing_sessions").select("*").eq("job_id", jobId).maybeSingle();
  if (!es || !["running", "awaiting_followup"].includes(es.status)) return null;
  const gw = await getClaudeGateway();
  if (!gw) return null;
  const step = stepFromEtapa(await gw.lastStep(es.session_id).catch(() => null));
  if (!step) return null;
  const { data: job } = await admin.from("render_jobs").select("current_step, status").eq("id", jobId).single();
  if (!job || job.status !== "running" || stepIndex(step) <= stepIndex(job.current_step)) return null;
  await advanceJob(jobId, { step }, admin);
  return step;
}

/** Arquiva a sessão (menos retenção de dados). Depois disso, ajustes abrem sessão nova. */
export async function archiveSession(es: Pick<EditingSession, "session_id" | "job_id">, admin: Admin = createAdminClient()) {
  const gw = await getClaudeGateway();
  if (gw) await gw.archive(es.session_id).catch(() => undefined);
  await admin.from("editing_sessions").update({ status: "archived", archived_at: new Date().toISOString() }).eq("session_id", es.session_id).in("status", ["delivered", "failed"]);
}

/** Arquiva as sessões de um projeto aprovado pelo cliente. */
export async function archiveProjectSessions(projectId: string) {
  const admin = createAdminClient();
  const { data } = await admin.from("editing_sessions").select("session_id, job_id").eq("project_id", projectId).in("status", ["delivered", "failed"]).is("archived_at", null);
  const seen = new Set<string>();
  for (const es of data ?? []) {
    if (seen.has(es.session_id)) continue;
    seen.add(es.session_id);
    await archiveSession(es, admin);
  }
}
