"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile, getSessionUser } from "@/lib/auth/dal";
import { errorCode, friendlyError, messageFor } from "@/lib/errors";
import {
  ASPECT_RATIOS,
  BUCKETS,
  DEFAULT_EDIT_SETTINGS,
  EDITING_STYLES,
  EDIT_SETTINGS,
  LEGAL_AREAS,
  OBJECTIVES,
  PLATFORMS,
  ratiosForPlatforms,
} from "@/lib/constants/domain";
import { dispatchJob } from "@/services/editing/dispatch";
import { emailTemplates, sendEmail } from "@/services/email";
import type { ActionResult } from "@/types/domain";
import type { Json, TablesUpdate } from "@/types/database";

const json = (v: unknown) => v as NonNullable<Json>;

const vals = <T extends readonly { value: string }[]>(list: T) => list.map((i) => i.value) as [string, ...string[]];

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
export async function createDraftAction(input: { name?: string; folderId?: string | null }): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireAuth();
    const profile = await getProfile();
    const supabase = await createClient();
    const objective = OBJECTIVES.some((o) => o.value === profile?.main_goal) ? profile?.main_goal : null;
    const platforms = profile?.default_platforms?.length ? profile.default_platforms : [];
    const { data, error } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        name: (input.name?.trim() || "Novo vídeo").slice(0, 140),
        status: "draft",
        folder_id: input.folderId && z.uuid().safeParse(input.folderId).success ? input.folderId : null,
        objective,
        legal_area: profile?.legal_area ?? null,
        editing_style: profile?.default_editing_style ?? null,
        platforms,
        aspect_ratios: ratiosForPlatforms(platforms),
        settings: json(DEFAULT_EDIT_SETTINGS),
      })
      .select("id")
      .single();
    if (error) return fail(error);
    return { ok: true, data: { id: data.id } };
  } catch (e) {
    return fail(e);
  }
}

const settingsKeys = EDIT_SETTINGS.map((s) => s.key) as [string, ...string[]];

const draftPatchSchema = z
  .object({
    name: z.string().trim().min(1, "Dê um nome ao vídeo.").max(140),
    objective: z.enum(vals(OBJECTIVES)).nullable(),
    legal_area: z.enum(vals(LEGAL_AREAS)).nullable(),
    editing_style: z.enum(vals(EDITING_STYLES)).nullable(),
    platforms: z.array(z.enum(vals(PLATFORMS))).max(PLATFORMS.length),
    aspect_ratios: z.array(z.enum(vals(ASPECT_RATIOS))).max(4),
    settings: z.record(z.enum(settingsKeys), z.boolean()),
    options: z.object({
      caption_style: z.enum(["discreta", "palavra", "caixa_alta"]).optional(),
      cta_type: z.enum(["seguir", "site", "whatsapp", "personalizado"]).optional(),
      cta_text: z.string().max(140).optional(),
      target_duration: z.enum(["completo", "60s", "90s", "3min", "cortes"]).optional(),
      audience: z.string().max(200).optional(),
      hook_text: z.string().max(140).optional(),
      music_tone: z.enum(["sobria", "inspiradora", "neutra"]).optional(),
      cut_ranges: z.array(z.object({ start: z.string().max(8), end: z.string().max(8) })).max(10).optional(),
      reference_url: z.string().url("Informe um link válido.").max(300).optional().or(z.literal("")),
      answers: z.record(z.string().max(30), z.enum(["sim", "nao", "outro"])).optional(),
      answers_text: z.record(z.string().max(30), z.string().max(200)).optional(),
      template: z.string().max(60).optional(),
    }),
    folder_id: z.uuid().nullable(),
    instructions: z.string().max(1200, "Use no máximo 1.000 caracteres.").nullable(),
    wizard_step: z.number().int().min(1).max(10),
    rights_confirmed: z.boolean(),
  })
  .partial();

export type DraftPatch = z.input<typeof draftPatchSchema>;

export async function saveDraftAction(id: string, patch: DraftPatch): Promise<ActionResult> {
  try {
    await requireAuth();
    const parsed = draftPatchSchema.safeParse(patch);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    const { rights_confirmed, platforms, aspect_ratios, settings, options, ...rest } = parsed.data;
    const update: TablesUpdate<"projects"> = { ...rest };
    if (platforms) {
      update.platforms = platforms;
      update.aspect_ratios = aspect_ratios?.length ? aspect_ratios : ratiosForPlatforms(platforms);
    } else if (aspect_ratios) update.aspect_ratios = aspect_ratios;
    if (settings) update.settings = json({ ...DEFAULT_EDIT_SETTINGS, ...settings });
    if (options) update.options = json(options);
    if (rights_confirmed !== undefined) update.rights_confirmed_at = rights_confirmed ? new Date().toISOString() : null;

    const supabase = await createClient();
    const { error } = await supabase.from("projects").update(update).eq("id", id).eq("status", "draft");
    if (error) return fail(error);
    return { ok: true };
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

export async function duplicateProjectAction(id: string, asVersion = false): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAuth();
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("duplicate_project", { p_project_id: id, p_as_version: asVersion });
    if (error || !data) return fail(error);
    revalidatePath("/app", "layout");
    return { ok: true, data: { id: data.id } };
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

export async function approveProjectAction(id: string): Promise<ActionResult> {
  try {
    await requireAuth();
    const supabase = await createClient();
    const { error } = await supabase.rpc("approve_project", { p_project_id: id });
    if (error) return fail(error);
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
