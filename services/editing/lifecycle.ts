import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { PIPELINE_STEPS, progressForStep, type PipelineStep } from "@/lib/constants/domain";
import { emailTemplates, sendEmail } from "@/services/email";
import type { Json } from "@/types/database";

type Admin = ReturnType<typeof createAdminClient>;

/** Atualiza etapa/progresso/status de um job e reflete no projeto. */
export async function advanceJob(
  jobId: string,
  patch: { step?: PipelineStep; progress?: number; status?: "queued" | "running" | "succeeded" | "failed" | "canceled"; externalId?: string; errorCode?: string; errorMessage?: string; editPlan?: unknown },
  admin: Admin = createAdminClient(),
) {
  const { data: job } = await admin.from("render_jobs").select("*").eq("id", jobId).single();
  if (!job) throw new Error("job_not_found");
  const finishing = patch.status === "succeeded" && job.status !== "succeeded";
  if (finishing) {
    // Valida antes de alterar o estado: concluir exige ao menos uma entrega registrada
    const { count } = await admin.from("renders").select("id", { count: "exact", head: true }).eq("project_id", job.project_id);
    if (!count) throw new Error("no_renders");
  }

  const history = Array.isArray(job.step_history) ? (job.step_history as { step: string; at: string }[]) : [];
  if (patch.step && patch.step !== job.current_step) history.push({ step: patch.step, at: new Date().toISOString() });

  const status = patch.status ?? (patch.step && job.status === "queued" ? "running" : job.status);
  const progress = patch.progress ?? (patch.step ? progressForStep(patch.step) : job.progress);

  await admin
    .from("render_jobs")
    .update({
      current_step: patch.step ?? job.current_step,
      progress: Math.max(0, Math.min(100, progress)),
      status,
      external_id: patch.externalId ?? job.external_id,
      error_code: patch.errorCode ?? (status === "failed" ? (job.error_code ?? "processing_failed") : null),
      error_message: patch.errorMessage ?? (status === "failed" ? job.error_message : null),
      edit_plan: patch.editPlan !== undefined ? (patch.editPlan as Json) : job.edit_plan,
      step_history: history as unknown as NonNullable<Json>,
      started_at: job.started_at ?? (status === "running" ? new Date().toISOString() : null),
      completed_at: status === "succeeded" || status === "failed" ? new Date().toISOString() : null,
    })
    .eq("id", jobId);

  if (status === "running") {
    await admin.from("projects").update({ status: job.kind === "revision" ? "revision_requested" : "processing" }).eq("id", job.project_id).in("status", ["queued", "processing", "revision_requested"]);
  }
  if (patch.status === "failed" && job.status !== "failed") await failProject(job.project_id, patch.errorMessage, admin);
  if (finishing) await completeProject(job.project_id, jobId, admin);
  return job;
}

/** Registra um arquivo final (por proporção), versionando automaticamente. */
export async function addRender(
  projectId: string,
  output: { aspectRatio: string; bucket?: string; path: string; fileName?: string; width?: number | null; height?: number | null; durationSec?: number | null; sizeBytes?: number | null; thumbnailPath?: string | null; jobId?: string | null },
  admin: Admin = createAdminClient(),
) {
  const { data: project } = await admin.from("projects").select("id, user_id").eq("id", projectId).single();
  if (!project) throw new Error("project_not_found");
  if (!output.path.startsWith(`${project.user_id}/${projectId}/`)) throw new Error("invalid_path");
  const { data: last } = await admin
    .from("renders")
    .select("version")
    .eq("project_id", projectId)
    .eq("aspect_ratio", output.aspectRatio)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data, error } = await admin
    .from("renders")
    .insert({
      project_id: projectId,
      user_id: project.user_id,
      job_id: output.jobId ?? null,
      aspect_ratio: output.aspectRatio,
      bucket: output.bucket ?? "rendered-videos",
      storage_path: output.path,
      file_name: output.fileName ?? null,
      width: output.width ?? null,
      height: output.height ?? null,
      resolution: output.width && output.height ? `${output.width}x${output.height}` : null,
      duration_sec: output.durationSec ?? null,
      file_size: output.sizeBytes ?? null,
      thumbnail_path: output.thumbnailPath ?? null,
      version: (last?.version ?? 0) + 1,
    })
    .select("id")
    .single();
  if (error) throw new Error("render_insert_failed");
  return data.id;
}

/** Marca o projeto como pronto: job concluído, ajustes resolvidos, notificação e e-mail. */
export async function completeProject(projectId: string, jobId: string | null, admin: Admin = createAdminClient()) {
  const { data: project } = await admin.from("projects").select("id, user_id, name, status").eq("id", projectId).single();
  if (!project) throw new Error("project_not_found");
  const { count } = await admin.from("renders").select("id", { count: "exact", head: true }).eq("project_id", projectId);
  if (!count) throw new Error("no_renders");

  if (project.status === "ready" || project.status === "completed") return; // idempotente
  const wasRevision = project.status === "revision_requested";
  const last = PIPELINE_STEPS[PIPELINE_STEPS.length - 1].value;
  const jobQuery = admin.from("render_jobs").update({ status: "succeeded", current_step: last, progress: 100, completed_at: new Date().toISOString(), error_code: null, error_message: null });
  if (jobId) await jobQuery.eq("id", jobId);
  else await jobQuery.eq("project_id", projectId).in("status", ["queued", "running"]);

  await admin.from("projects").update({ status: "ready", completed_at: null }).eq("id", projectId);
  if (wasRevision) {
    await admin.from("project_revisions").update({ status: "resolved", resolved_at: new Date().toISOString() }).eq("project_id", projectId).neq("status", "resolved");
  }
  await admin.from("notifications").insert({
    user_id: project.user_id,
    type: wasRevision ? "revision_done" : "video_ready",
    title: wasRevision ? "Ajuste concluído" : "Seu vídeo está pronto",
    body: `“${project.name}” já pode ser assistido e baixado.`,
    link: `/app/projetos/${projectId}`,
  });
  const { data: profile } = await admin.from("profiles").select("full_name, email, preferences").eq("id", project.user_id).single();
  const prefs = (profile?.preferences ?? {}) as { email_notifications?: boolean };
  if (profile?.email && prefs.email_notifications !== false) {
    const first = profile.full_name?.split(" ")[0] ?? "";
    const tpl = wasRevision ? emailTemplates.revisionDone(first, project.name, projectId) : emailTemplates.videoReady(first, project.name, projectId);
    await sendEmail({ to: profile.email, ...tpl });
  }
}

export async function failProject(projectId: string, message: string | undefined, admin: Admin = createAdminClient()) {
  const { data: project } = await admin.from("projects").update({ status: "failed" }).eq("id", projectId).select("user_id, name").single();
  if (!project) return;
  await admin.from("notifications").insert({
    user_id: project.user_id,
    type: "processing_failed",
    title: "Houve um problema no processamento",
    body: message ?? `Não foi possível concluir “${project.name}”. Nossa equipe já está verificando.`,
    link: `/app/projetos/${projectId}`,
  });
}
