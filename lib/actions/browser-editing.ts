"use server";

import { z } from "zod";
import { getSessionUser } from "@/lib/auth/dal";
import { BUCKETS, PIPELINE_STEPS, type PipelineStep } from "@/lib/constants/domain";
import { friendlyError } from "@/lib/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import { addRender, advanceJob } from "@/services/editing/lifecycle";
import type { ActionResult } from "@/types/domain";
import type { Json } from "@/types/database";

/**
 * Edição no navegador (provedor "navegador"): o app de quem enviou o vídeo
 * edita e usa estas ações para avisar o progresso, receber URLs de envio
 * dos arquivos finais e concluir. Toda ação confere que o job é da pessoa.
 */

const RATIOS = ["9:16", "1:1", "4:5", "16:9"] as const;
const STEPS = PIPELINE_STEPS.map((s) => s.value) as [PipelineStep, ...PipelineStep[]];

async function ownJob(jobId: string) {
  const user = await getSessionUser();
  if (!user) throw new Error("session_expired");
  const admin = createAdminClient();
  const { data: job } = await admin.from("render_jobs").select("id, user_id, project_id, status, provider, kind").eq("id", jobId).single();
  if (!job || job.user_id !== user.id) throw new Error("not_found");
  if (job.provider !== "navegador") throw new Error("invalid");
  return { job, admin };
}

function fail(e: unknown): { ok: false; error: string } {
  return { ok: false, error: friendlyError(e) };
}

/** Assume o job (fila → em edição). Devolve a próxima versão dos arquivos. */
export async function claimBrowserJobAction(jobId: string): Promise<ActionResult<{ version: number }>> {
  try {
    const { job, admin } = await ownJob(z.uuid().parse(jobId));
    if (!["queued", "running"].includes(job.status)) throw new Error("invalid");
    await advanceJob(job.id, { step: "analyzing_audio", status: "running" }, admin);
    const { data: last } = await admin.from("renders").select("version").eq("project_id", job.project_id).order("version", { ascending: false }).limit(1).maybeSingle();
    return { ok: true, data: { version: (last?.version ?? 0) + 1 } };
  } catch (e) {
    return fail(e);
  }
}

export async function browserProgressAction(jobId: string, step: string, progress: number): Promise<ActionResult> {
  try {
    const { job, admin } = await ownJob(z.uuid().parse(jobId));
    if (job.status !== "running") return { ok: true };
    await advanceJob(job.id, { step: z.enum(STEPS).parse(step), progress: Math.round(z.number().min(0).max(99).parse(progress)) }, admin);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** URLs assinadas para enviar o MP4 e a capa de cada formato. */
export async function browserUploadTargetsAction(
  jobId: string,
  version: number,
  files: { ratio: string; ext: string }[],
): Promise<ActionResult<{ ratio: string; path: string; token: string; posterPath: string; posterToken: string }[]>> {
  try {
    const { job, admin } = await ownJob(z.uuid().parse(jobId));
    const v = z.number().int().min(1).max(999).parse(version);
    const list = z.array(z.object({ ratio: z.enum(RATIOS), ext: z.enum(["mp4", "webm"]) })).min(1).max(4).parse(files);
    const out = [];
    for (const f of list) {
      const base = `${job.user_id}/${job.project_id}/v${v}/${f.ratio.replace(":", "x")}`;
      const bucket = admin.storage.from(BUCKETS.renders);
      const video = await bucket.createSignedUploadUrl(`${base}.${f.ext}`, { upsert: true });
      const poster = await bucket.createSignedUploadUrl(`${base}.jpg`, { upsert: true });
      if (video.error || poster.error) throw new Error("upload_url_failed");
      out.push({ ratio: f.ratio, path: video.data.path, token: video.data.token, posterPath: poster.data.path, posterToken: poster.data.token });
    }
    return { ok: true, data: out };
  } catch (e) {
    return fail(e);
  }
}

const Output = z.object({
  ratio: z.enum(RATIOS),
  path: z.string().max(300),
  posterPath: z.string().max(300).nullable(),
  width: z.number().int().positive().max(8192),
  height: z.number().int().positive().max(8192),
  duration: z.number().positive().max(7200),
  size: z.number().int().positive(),
});

/** Registra os arquivos enviados e conclui (projeto pronto, aviso e e-mail). */
export async function completeBrowserJobAction(
  jobId: string,
  version: number,
  outputs: z.infer<typeof Output>[],
  editPlan: unknown,
  note?: string,
): Promise<ActionResult> {
  try {
    const { job, admin } = await ownJob(z.uuid().parse(jobId));
    const v = z.number().int().min(1).max(999).parse(version);
    const list = z.array(Output).min(1).max(4).parse(outputs);
    const prefix = `${job.user_id}/${job.project_id}/v${v}/`;
    for (const o of list) {
      if (!o.path.startsWith(prefix) || (o.posterPath && !o.posterPath.startsWith(prefix))) throw new Error("invalid");
      await addRender(
        job.project_id,
        {
          aspectRatio: o.ratio,
          path: o.path,
          fileName: o.path.split("/").pop(),
          width: o.width,
          height: o.height,
          durationSec: Math.round(o.duration * 10) / 10,
          sizeBytes: o.size,
          thumbnailPath: o.posterPath,
          jobId: job.id,
          version: v,
          published: true,
        },
        admin,
      );
    }
    const plan = JSON.stringify(editPlan ?? null);
    const msg = note ? z.string().max(400).parse(note) : undefined;
    await advanceJob(job.id, { status: "succeeded", editPlan: plan.length < 400_000 ? (JSON.parse(plan) as Json) : undefined, note: msg }, admin);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function failBrowserJobAction(jobId: string, message: string): Promise<ActionResult> {
  try {
    const { job, admin } = await ownJob(z.uuid().parse(jobId));
    if (job.status === "succeeded") return { ok: true };
    await advanceJob(job.id, { status: "failed", errorCode: "browser_failed", errorMessage: z.string().max(400).parse(message) }, admin);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
