"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile, getSessionUser } from "@/lib/auth/dal";
import { PIPELINE_STEPS } from "@/lib/constants/domain";
import { addRender, advanceJob, completeProject, failProject } from "@/services/editing/lifecycle";
import { dispatchJob } from "@/services/editing/dispatch";
import { PROVIDER_KEYS, SETTING_PROVIDER, clearProviderCache, type ProviderKey } from "@/services/editing";
import { releaseReview } from "@/services/editing/claude/session-lifecycle";
import { isClaudeConfigured } from "@/services/editing/claude/config";
import type { ActionResult } from "@/types/domain";

async function assertAdmin() {
  const user = await getSessionUser();
  const profile = await getProfile();
  if (!user || profile?.role !== "admin") throw new Error("forbidden");
  return user;
}

function err(e: unknown): { ok: false; error: string } {
  const code = e instanceof Error ? e.message : "unknown";
  const map: Record<string, string> = {
    forbidden: "Acesso restrito à equipe.",
    no_renders: "Envie ao menos um vídeo editado antes de marcar como pronto.",
    invalid_path: "Caminho de arquivo inválido.",
    job_not_found: "Job não encontrado.",
    not_in_review: "Este vídeo não está aguardando revisão.",
    claude_provider_not_configured: "Configure a chave da Anthropic (ANTHROPIC_API_KEY, CLAUDE_AGENT_ID e CLAUDE_ENVIRONMENT_ID) antes de usar o Claude.",
  };
  return { ok: false, error: map[code] ?? "Não foi possível concluir a ação." };
}

const stepValues = PIPELINE_STEPS.map((s) => s.value) as [string, ...string[]];

export async function adminUpdateJobAction(input: { jobId: string; step?: string; progress?: number; status?: "queued" | "running" | "failed" }): Promise<ActionResult> {
  try {
    await assertAdmin();
    const parsed = z
      .object({
        jobId: z.string().uuid(),
        step: z.enum(stepValues).optional(),
        progress: z.number().int().min(0).max(100).optional(),
        status: z.enum(["queued", "running", "failed"]).optional(),
      })
      .parse(input);
    await advanceJob(parsed.jobId, {
      step: parsed.step as never,
      progress: parsed.progress,
      status: parsed.status,
      errorMessage: parsed.status === "failed" ? "O processamento foi interrompido. Nossa equipe está verificando." : undefined,
    });
    revalidatePath("/admin", "layout");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

export async function adminRedispatchAction(jobId: string, provider?: ProviderKey): Promise<ActionResult> {
  try {
    await assertAdmin();
    if (provider === "claude" && !isClaudeConfigured()) throw new Error("claude_provider_not_configured");
    const admin = createAdminClient();
    const { data: job } = await admin.from("render_jobs").select("*").eq("id", jobId).single();
    if (!job) throw new Error("job_not_found");
    await admin.from("render_jobs").update({ status: "queued", error_code: null, error_message: null }).eq("id", jobId);
    await admin.from("projects").update({ status: "queued" }).eq("id", job.project_id).eq("status", "failed");
    const res = await dispatchJob({ ...job, status: "queued" }, provider ? { provider } : undefined);
    if (!res.ok) throw new Error(res.code);
    revalidatePath("/admin", "layout");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

const renderSchema = z.object({
  projectId: z.string().uuid(),
  aspectRatio: z.enum(["9:16", "1:1", "4:5", "16:9"]),
  path: z.string().min(3),
  fileName: z.string().max(255),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  durationSec: z.number().nullable(),
  sizeBytes: z.number().int(),
});

export async function adminRegisterRenderAction(input: z.input<typeof renderSchema>): Promise<ActionResult> {
  try {
    await assertAdmin();
    const r = renderSchema.parse(input);
    const admin = createAdminClient();
    const { data: job } = await admin.from("render_jobs").select("id").eq("project_id", r.projectId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    await addRender(r.projectId, { ...r, jobId: job?.id ?? null }, admin);
    revalidatePath(`/admin/projetos/${r.projectId}`);
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

export async function adminDeleteRenderAction(renderId: string): Promise<ActionResult> {
  try {
    await assertAdmin();
    const admin = createAdminClient();
    const { data: render } = await admin.from("renders").delete().eq("id", renderId).select("project_id, bucket, storage_path").single();
    if (render) await admin.storage.from(render.bucket).remove([render.storage_path]);
    revalidatePath("/admin", "layout");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

export async function adminMarkReadyAction(projectId: string): Promise<ActionResult> {
  try {
    await assertAdmin();
    const admin = createAdminClient();
    const { data: job } = await admin.from("render_jobs").select("id").eq("project_id", projectId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    await completeProject(projectId, job?.id ?? null, admin);
    revalidatePath("/admin", "layout");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

export async function adminMarkFailedAction(projectId: string, message: string): Promise<ActionResult> {
  try {
    await assertAdmin();
    const admin = createAdminClient();
    await admin
      .from("render_jobs")
      .update({ status: "failed", error_code: "manual", error_message: message.slice(0, 500), completed_at: new Date().toISOString() })
      .eq("project_id", projectId)
      .in("status", ["queued", "running"]);
    await failProject(projectId, message || undefined, admin);
    revalidatePath("/admin", "layout");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

export async function adminAddNoteAction(projectId: string, body: string): Promise<ActionResult> {
  try {
    const user = await assertAdmin();
    const text = body.trim();
    if (!text) return { ok: false, error: "Escreva a nota." };
    await createAdminClient().from("project_notes").insert({ project_id: projectId, author_id: user.id, body: text.slice(0, 4000) });
    revalidatePath(`/admin/projetos/${projectId}`);
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

const planSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/, "Use letras minúsculas, números e hífen."),
  name: z.string().min(2).max(60),
  description: z.string().max(300).nullable(),
  price_cents: z.number().int().min(0).nullable(),
  trial_days: z.number().int().positive().nullable(),
  videos_per_month: z.number().int().min(0).nullable(),
  minutes_per_month: z.number().int().min(0).nullable(),
  max_video_duration_sec: z.number().int().positive().nullable(),
  max_upload_mb: z.number().int().positive(),
  revisions_per_video: z.number().int().min(0),
  max_resolution: z.string().max(10),
  storage_gb: z.number().int().positive().nullable(),
  render_priority: z.enum(["standard", "priority", "express"]),
  features: z.array(z.string().max(120)).max(12),
  is_featured: z.boolean(),
  is_active: z.boolean(),
  is_public: z.boolean(),
  sort_order: z.number().int(),
});
export type PlanInput = z.input<typeof planSchema>;

export async function adminSavePlanAction(input: PlanInput): Promise<ActionResult> {
  try {
    await assertAdmin();
    const parsed = planSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    const { id, ...rest } = parsed.data;
    const admin = createAdminClient();
    const { error } = id ? await admin.from("plans").update(rest).eq("id", id) : await admin.from("plans").insert(rest);
    if (error) return { ok: false, error: error.code === "23505" ? "Já existe um plano com este identificador." : "Não foi possível salvar o plano." };
    revalidatePath("/admin/planos");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

export async function adminSetUserPlanAction(input: { userId: string; planId: string; status: "active" | "trialing"; days: number }): Promise<ActionResult> {
  try {
    await assertAdmin();
    const v = z
      .object({ userId: z.string().uuid(), planId: z.string().uuid(), status: z.enum(["active", "trialing"]), days: z.number().int().min(1).max(730) })
      .parse(input);
    const now = new Date();
    const end = new Date(now.getTime() + v.days * 86400000);
    const { error } = await createAdminClient()
      .from("subscriptions")
      .upsert(
        {
          user_id: v.userId,
          plan_id: v.planId,
          status: v.status,
          provider: "manual",
          current_period_start: now.toISOString(),
          current_period_end: end.toISOString(),
          cancel_at_period_end: false,
          canceled_at: null,
        },
        { onConflict: "user_id" },
      );
    if (error) return { ok: false, error: "Não foi possível atualizar a assinatura." };
    revalidatePath("/admin/usuarios");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

export async function adminSetRoleAction(userId: string, role: "user" | "admin"): Promise<ActionResult> {
  try {
    const me = await assertAdmin();
    if (me.id === userId && role !== "admin") return { ok: false, error: "Você não pode remover o próprio acesso de administrador." };
    const { error } = await createAdminClient().from("profiles").update({ role }).eq("id", userId);
    if (error) return { ok: false, error: "Não foi possível alterar o perfil." };
    revalidatePath("/admin/usuarios");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

/** Libera ao cliente o vídeo editado pelo agente (HUMAN_REVIEW=true). */
export async function adminReleaseReviewAction(jobId: string): Promise<ActionResult> {
  try {
    await assertAdmin();
    await releaseReview(z.string().uuid().parse(jobId));
    revalidatePath("/admin", "layout");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}

/** Troca o provedor de edição sem deploy (vale para os próximos envios). */
export async function adminSetEditingProviderAction(key: ProviderKey | "env"): Promise<ActionResult> {
  try {
    const user = await assertAdmin();
    const admin = createAdminClient();
    if (key === "env") {
      await admin.from("app_settings").delete().eq("key", SETTING_PROVIDER);
    } else {
      if (!(PROVIDER_KEYS as readonly string[]).includes(key)) throw new Error("invalid");
      if (key === "claude" && !isClaudeConfigured()) throw new Error("claude_provider_not_configured");
      await admin.from("app_settings").upsert({ key: SETTING_PROVIDER, value: key, updated_by: user.id, updated_at: new Date().toISOString() });
    }
    clearProviderCache();
    revalidatePath("/admin", "layout");
    return { ok: true };
  } catch (e) {
    return err(e);
  }
}
