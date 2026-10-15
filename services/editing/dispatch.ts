import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEditingProvider } from "./index";
import { buildEditBrief } from "./brief";
import type { RenderJob } from "@/types/domain";
import type { Json } from "@/types/database";

/**
 * Entrega um job ao provedor configurado. Nunca lança para o usuário:
 * falhas ficam registradas no job (para nova tentativa pelo admin/worker).
 */
export async function dispatchJob(job: RenderJob) {
  const admin = createAdminClient();
  const provider = getEditingProvider();
  try {
    const brief = await buildEditBrief(job);
    await admin.from("render_jobs").update({ brief: brief as unknown as Json, provider: provider.name }).eq("id", job.id);
    const result = await provider.dispatch(job, brief);
    await admin
      .from("render_jobs")
      .update({
        provider: provider.name,
        external_id: result.externalId ?? null,
        status: result.status ?? "queued",
        attempts: job.attempts + 1,
        started_at: result.status === "running" ? new Date().toISOString() : null,
        error_code: null,
        error_message: null,
      })
      .eq("id", job.id);
    if (result.status === "running") {
      await admin.from("projects").update({ status: "processing" }).eq("id", job.project_id);
    }
    return { ok: true as const };
  } catch (e) {
    const code = e instanceof Error ? e.message : "dispatch_failed";
    await admin
      .from("render_jobs")
      .update({ attempts: job.attempts + 1, error_code: code.slice(0, 80), error_message: "Falha ao enviar para o processador." })
      .eq("id", job.id);
    console.error("[editing] falha ao despachar job", job.id, code);
    return { ok: false as const, code };
  }
}
