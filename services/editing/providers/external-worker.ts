import type { VideoEditingProvider } from "../types";

/**
 * Envia o briefing para um worker HTTP (FFmpeg/Remotion/GPU na nuvem).
 * O worker baixa a mídia pela URL assinada, processa e reporta progresso em
 * POST /api/jobs/callback (Authorization: Bearer JOBS_CALLBACK_SECRET).
 */
export const externalWorkerProvider: VideoEditingProvider = {
  name: "external",
  async dispatch(job, brief) {
    const url = process.env.EDITING_WORKER_URL;
    if (!url) throw new Error("editing_worker_not_configured");
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.EDITING_WORKER_TOKEN ?? ""}`,
        "Idempotency-Key": job.id,
      },
      body: JSON.stringify(brief),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`editing_worker_${res.status}`);
    const data = (await res.json().catch(() => ({}))) as { id?: string };
    return { externalId: data.id ?? null, status: "running" };
  },
  async cancel(job) {
    const url = process.env.EDITING_WORKER_URL;
    if (!url || !job.external_id) return;
    await fetch(`${url.replace(/\/$/, "")}/${encodeURIComponent(job.external_id)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${process.env.EDITING_WORKER_TOKEN ?? ""}` },
      signal: AbortSignal.timeout(10_000),
    }).catch(() => undefined);
  },
};
