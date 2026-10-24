"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile, getSessionUser } from "@/lib/auth/dal";
import { errorCode, friendlyError, messageFor } from "@/lib/errors";
import { BUCKETS, DEFAULT_EDIT_SETTINGS, DEFAULT_VIDEO_TARGET, isVideoTarget, type VideoTarget } from "@/lib/constants/domain";
import { dispatchJob } from "@/services/editing/dispatch";
import { emailTemplates, sendEmail } from "@/services/email";
import type { ActionResult } from "@/types/domain";
import type { Json } from "@/types/database";

const json = (v: unknown) => v as NonNullable<Json>;

/**
 * Envio sem perguntas: o banco ainda pede objetivo, área, estilo e
 * plataformas preenchidos, então o vídeo leva valores fixos (o motor de
 * edição não usa mais essas escolhas). A única escolha é o destino.
 */
const SIMPLE_PROJECT = {
  objective: "conteudo_organico",
  legal_area: "outro",
  editing_style: "dinamico",
  settings: json({ ...DEFAULT_EDIT_SETTINGS, lower_third: false, compliance_review: false }),
};

/** Reels ou TikTok: sempre vertical 9:16 (o motor reenquadra vídeos deitados). */
function formatFor(target: unknown) {
  const t: VideoTarget = isVideoTarget(target) ? target : DEFAULT_VIDEO_TARGET;
  return { aspect_ratios: ["9:16"], platforms: [t] };
}

async function requireAuth() {
  const user = await getSessionUser();
  if (!user) throw new Error("session_expired");
  return user;
}

function fail(e: unknown): { ok: false; error: string } {
  return { ok: false, error: friendlyError(e) };
}

// ---------------------------------------------------------------------------
// Rascunho
// ---------------------------------------------------------------------------
/** Cria o vídeo (rascunho) assim que a pessoa escolhe o arquivo: o caminho do envio depende do id. */
export async function createDraftAction(input: { name?: string; folderId?: string | null; target?: VideoTarget }): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireAuth();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        name: (input.name?.trim() || "Novo vídeo").slice(0, 140),
        status: "draft",
        folder_id: input.folderId && z.uuid().safeParse(input.folderId).success ? input.folderId : null,
        ...SIMPLE_PROJECT,
        ...formatFor(input.target),
      })
      .select("id")
      .single();
    if (error) return fail(error);
    return { ok: true, data: { id: data.id } };
  } catch (e) {
    return fail(e);
  }
}

// ---------------------------------------------------------------------------
// Arquivos
// ---------------------------------------------------------------------------
const fileSchema = z.object({
  projectId: z.string().uuid(),
  path: z.string().min(3).max(500),
  fileName: z.string().min(1).max(255),
  mimeType: z.enum(["video/mp4", "video/quicktime", "video/webm"]),
  sizeBytes: z.number().int().positive(),
  durationSec: z.number().nonnegative().nullable(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  kind: z.enum(["original", "take"]).default("original"),
});

export async function registerFileAction(input: z.input<typeof fileSchema>): Promise<ActionResult<{ fileId: string }>> {
  try {
    const user = await requireAuth();
    const parsed = fileSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: messageFor("invalid_file") };
    const f = parsed.data;
    if (!f.path.startsWith(`${user.id}/${f.projectId}/`)) return { ok: false, error: messageFor("forbidden") };

    const supabase = await createClient();
    // Confirma que o objeto existe no Storage antes de registrar
    const folder = f.path.slice(0, f.path.lastIndexOf("/"));
    const name = f.path.slice(f.path.lastIndexOf("/") + 1);
    const { data: listed } = await supabase.storage.from(BUCKETS.originals).list(folder, { search: name, limit: 1 });
    if (!listed?.some((o) => o.name === name)) return { ok: false, error: messageFor("upload_interrupted") };

    // Um original por projeto (múltiplos takes ficam como "take")
    if (f.kind === "original") {
      const { data: previous } = await supabase
        .from("project_files")
        .select("id, storage_path")
        .eq("project_id", f.projectId)
        .eq("kind", "original");
      if (previous?.length) {
        await supabase.from("project_files").delete().in("id", previous.map((p) => p.id));
        await removeUnreferenced(BUCKETS.originals, previous.map((p) => p.storage_path));
      }
    }

    const { data, error } = await supabase
      .from("project_files")
      .insert({
        project_id: f.projectId,
        user_id: user.id,
        kind: f.kind,
        bucket: BUCKETS.originals,
        storage_path: f.path,
        file_name: f.fileName,
        mime_type: f.mimeType,
        size_bytes: f.sizeBytes,
        duration_sec: f.durationSec,
        width: f.width,
        height: f.height,
        status: "uploaded",
      })
      .select("id")
      .single();
    if (error) return fail(error);

    if (f.kind === "original") {
      await supabase
        .from("projects")
        .update({
          source_duration_sec: f.durationSec,
          source_width: f.width,
          source_height: f.height,
          source_size_bytes: f.sizeBytes,
        })
        .eq("id", f.projectId);
    }
    return { ok: true, data: { fileId: data.id } };
  } catch (e) {
    return fail(e);
  }
}

export async function removeOriginalAction(projectId: string): Promise<ActionResult> {
  try {
    await requireAuth();
    const supabase = await createClient();
    const { data: files } = await supabase.from("project_files").select("id, storage_path").eq("project_id", projectId).eq("kind", "original");
    if (files?.length) {
      await supabase.from("project_files").delete().in("id", files.map((f) => f.id));
      await removeUnreferenced(BUCKETS.originals, files.map((f) => f.storage_path));
    }
    await supabase
      .from("projects")
      .update({ source_duration_sec: null, source_width: null, source_height: null, source_size_bytes: null, thumbnail_path: null })
      .eq("id", projectId)
      .eq("status", "draft");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function setThumbnailAction(projectId: string, path: string): Promise<ActionResult> {
  try {
    const user = await requireAuth();
    if (!path.startsWith(`${user.id}/${projectId}/`)) return { ok: false, error: messageFor("forbidden") };
    const supabase = await createClient();
    const { error } = await supabase.from("projects").update({ thumbnail_path: path }).eq("id", projectId);
    if (error) return fail(error);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ---------------------------------------------------------------------------
// Envio para edição
// ---------------------------------------------------------------------------
/**
 * Vídeo enviado → edição, sem perguntas: grava o destino (Reels ou TikTok,
 * sempre 9:16), registra a confirmação de direito de uso (aviso junto ao
 * envio) e manda para a fila.
 */
export async function startEditingAction(id: string, target: VideoTarget): Promise<ActionResult<{ jobId: string }> & { code?: string }> {
  try {
    await requireAuth();
    if (!z.uuid().safeParse(id).success) return { ok: false, error: messageFor("project_not_found") };
    const supabase = await createClient();
    const { data: project } = await supabase.from("projects").select("status").eq("id", id).maybeSingle();
    if (!project) return { ok: false, error: messageFor("project_not_found") };
    if (project.status === "draft") {
      const { error } = await supabase
        .from("projects")
        .update({
          ...SIMPLE_PROJECT,
          ...formatFor(target),
          rights_confirmed_at: new Date().toISOString(),
          wizard_step: 3,
        })
        .eq("id", id)
        .eq("status", "draft");
      if (error) return fail(error);
    }
    return await submitProjectAction(id);
  } catch (e) {
    return fail(e);
  }
}

export async function submitProjectAction(id: string): Promise<ActionResult<{ jobId: string }> & { code?: string }> {
  try {
    const user = await requireAuth();
    const supabase = await createClient();
    const { data: job, error } = await supabase.rpc("submit_project", { p_project_id: id });
    if (error || !job) {
      const code = errorCode(error);
      return { ok: false, error: friendlyError(error), code };
    }
    await dispatchJob(job);

    const { data: project } = await supabase.from("projects").select("name").eq("id", id).single();
    const profile = await getProfile();
    if (user.email && project) {
      const prefs = (profile?.preferences ?? {}) as { email_notifications?: boolean };
      if (prefs.email_notifications !== false) {
        await sendEmail({ to: user.email, ...emailTemplates.projectReceived(profile?.full_name?.split(" ")[0] ?? "", project.name, id) });
      }
      if (process.env.ADMIN_NOTIFICATIONS_EMAIL) {
        await sendEmail({ to: process.env.ADMIN_NOTIFICATIONS_EMAIL, ...emailTemplates.adminNewProject(project.name, id, user.email) });
      }
    }
    revalidatePath("/app", "layout");
    return { ok: true, data: { jobId: job.id } };
  } catch (e) {
    return fail(e);
  }
}

// ---------------------------------------------------------------------------
// Gestão
// ---------------------------------------------------------------------------
export async function renameProjectAction(id: string, name: string): Promise<ActionResult> {
  try {
    await requireAuth();
    const clean = name.trim();
    if (clean.length < 1 || clean.length > 140) return { ok: false, error: "Use um nome entre 1 e 140 caracteres." };
    const supabase = await createClient();
    const { error } = await supabase.from("projects").update({ name: clean }).eq("id", id);
    if (error) return fail(error);
    revalidatePath("/app", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteProjectAction(id: string): Promise<ActionResult> {
  try {
    const user = await requireAuth();
    const supabase = await createClient();
    const { data: project } = await supabase.from("projects").select("id, user_id, thumbnail_path").eq("id", id).single();
    if (!project || project.user_id !== user.id) return { ok: false, error: messageFor("project_not_found") };

    const [{ data: files }, { data: renders }] = await Promise.all([
      supabase.from("project_files").select("storage_path").eq("project_id", id),
      supabase.from("renders").select("storage_path, thumbnail_path").eq("project_id", id),
    ]);

    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) return fail(error);

    await removeUnreferenced(BUCKETS.originals, (files ?? []).map((f) => f.storage_path));
    const admin = createAdminClient();
    const renderPaths = (renders ?? []).map((r) => r.storage_path);
    if (renderPaths.length) await admin.storage.from(BUCKETS.renders).remove(renderPaths);
    const thumbs = [project.thumbnail_path, ...(renders ?? []).map((r) => r.thumbnail_path)].filter((p): p is string => Boolean(p));
    await removeUnreferencedThumbs(thumbs);

    revalidatePath("/app", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Exclui vários vídeos (seleção múltipla em Projetos). */
export async function deleteProjectsAction(ids: string[]): Promise<ActionResult<{ deleted: number }>> {
  const parsed = z.array(z.uuid()).min(1).max(100).safeParse(ids);
  if (!parsed.success) return { ok: false, error: "Selecione ao menos um vídeo." };
  let deleted = 0;
  for (const id of parsed.data) {
    const res = await deleteProjectAction(id);
    if (!res.ok) return { ok: false, error: res.error };
    deleted++;
  }
  return { ok: true, data: { deleted } };
}

export async function requestRevisionAction(id: string, comment: string, timestampSec: number | null): Promise<ActionResult> {
  try {
    const user = await requireAuth();
    const text = comment.trim();
    if (text.length < 3) return { ok: false, error: "Descreva o ajuste desejado." };
    const supabase = await createClient();
    const { error } = await supabase.rpc("request_revision", {
      p_project_id: id,
      p_comment: text,
      p_timestamp_sec: timestampSec ?? undefined,
    });
    if (error) return fail(error);

    // Envia o job de ajuste ao provedor
    const { data: job } = await supabase
      .from("render_jobs")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (job) await dispatchJob(job);
    if (process.env.ADMIN_NOTIFICATIONS_EMAIL) {
      await sendEmail({
        to: process.env.ADMIN_NOTIFICATIONS_EMAIL,
        subject: "[Fila] Ajuste solicitado",
        html: `<p>${user.email} solicitou ajuste no projeto ${id}.</p>`,
      });
    }
    revalidatePath(`/app/video/${id}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ---------------------------------------------------------------------------
// Limpeza de Storage (só remove objetos sem outras referências)
// ---------------------------------------------------------------------------
async function removeUnreferenced(bucket: string, paths: string[]) {
  if (!paths.length) return;
  const admin = createAdminClient();
  const { data: still } = await admin.from("project_files").select("storage_path").eq("bucket", bucket).in("storage_path", paths);
  const referenced = new Set((still ?? []).map((r) => r.storage_path));
  const orphan = paths.filter((p) => !referenced.has(p));
  if (orphan.length) await admin.storage.from(bucket).remove(orphan);
}

async function removeUnreferencedThumbs(paths: string[]) {
  if (!paths.length) return;
  const admin = createAdminClient();
  const { data: still } = await admin.from("projects").select("thumbnail_path").in("thumbnail_path", paths);
  const referenced = new Set((still ?? []).map((r) => r.thumbnail_path));
  const orphan = paths.filter((p) => !referenced.has(p));
  if (orphan.length) await admin.storage.from(BUCKETS.thumbnails).remove(orphan);
}
