import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { JobCallbackSchema } from "@/services/editing/types";
import { addRender, advanceJob } from "@/services/editing/lifecycle";
import { createAdminClient } from "@/lib/supabase/admin";

function authorized(request: Request) {
  const secret = process.env.JOBS_CALLBACK_SECRET;
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!secret || !token) return false;
  const a = Buffer.from(secret);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Callback de processadores externos (worker FFmpeg/Remotion, agente de IA).
 * Reporta etapa/progresso, registra saídas e conclui ou falha o job.
 */
export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const parsed = JobCallbackSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_payload", issues: parsed.error.issues.slice(0, 5) }, { status: 422 });
  const cb = parsed.data;

  const admin = createAdminClient();
  const { data: job } = await admin.from("render_jobs").select("id, project_id").eq("id", cb.jobId).maybeSingle();
  if (!job) return NextResponse.json({ error: "job_not_found" }, { status: 404 });

  try {
    for (const output of cb.outputs ?? []) {
      await addRender(job.project_id, { ...output, jobId: job.id }, admin);
    }
    await advanceJob(
      job.id,
      {
        step: cb.step,
        progress: cb.progress,
        status: cb.status,
        externalId: cb.externalId,
        errorCode: cb.error?.code,
        errorMessage: cb.error?.message,
        editPlan: cb.editPlan,
      },
      admin,
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    const code = e instanceof Error ? e.message : "callback_failed";
    return NextResponse.json({ error: code }, { status: code === "no_renders" ? 409 : 400 });
  }
}
