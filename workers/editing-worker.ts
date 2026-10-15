/**
 * Worker de edição de referência (VIDEO_EDITING_PROVIDER=external).
 *
 * Recebe o briefing da plataforma, executa o pipeline e reporta o progresso:
 *   download → transcrição (Whisper) → análise (Claude) → plano → FFmpeg por proporção
 *   → upload para o bucket rendered-videos → POST /api/jobs/callback
 *
 * Execução:  npm run worker   (porta 8787)
 * Requisitos: FFmpeg no PATH, TRANSCRIPTION_URL, ANTHROPIC_API_KEY, SUPABASE_SECRET_KEY, JOBS_CALLBACK_SECRET.
 * Em produção, rode em uma máquina com CPU/GPU dedicada (Cloud Run, Fly.io, ECS...).
 */
import http from "node:http";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { getTranscriptionProvider } from "../services/ai/transcription";
import { getAnalysisProvider } from "../services/ai/analysis";
import { OUTPUT_SIZES, buildAssSubtitles, buildFfmpegArgs, keptSegments } from "../services/rendering/ffmpeg";
import type { EditBrief, EditPlan, JobCallback, Transcript } from "../services/editing/types";

const PORT = Number(process.env.WORKER_PORT ?? 8787);
const TOKEN = process.env.EDITING_WORKER_TOKEN ?? "";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, (process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY)!, {
  auth: { persistSession: false },
});

async function callback(brief: EditBrief, payload: Omit<JobCallback, "jobId">) {
  await fetch(brief.job.callbackUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.JOBS_CALLBACK_SECRET}` },
    body: JSON.stringify({ jobId: brief.job.id, ...payload }),
  }).catch((e) => console.error("[worker] callback falhou", e));
}

function run(cmd: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    p.stderr.on("data", (d) => (err = (err + d).slice(-4000)));
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} saiu com ${code}: ${err}`))));
  });
}

async function download(url: string, to: string) {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`download_${res.status}`);
  await writeFile(to, Buffer.from(await res.arrayBuffer()));
}

export async function processBrief(brief: EditBrief) {
  const dir = await mkdtemp(path.join(tmpdir(), "tribuna-"));
  try {
    const source = brief.sources.find((s) => s.kind === "original");
    if (!source?.url) throw new Error("missing_source");
    const input = path.join(dir, "input");
    await callback(brief, { status: "running", step: "analyzing_audio" });
    await download(source.url, input);

    await callback(brief, { step: "transcribing" });
    const transcript: Transcript = await getTranscriptionProvider().transcribe({ url: source.url, language: "pt" });

    await callback(brief, { step: "analyzing_content" });
    const plan: EditPlan = await getAnalysisProvider().plan({ transcript, brief });
    await callback(brief, { step: "planning", editPlan: plan });

    const width = source.width ?? 1920;
    const height = source.height ?? 1080;
    const duration = source.durationSec ?? transcript.durationSec;
    const kept = keptSegments(duration, plan.cuts);
    const outputs: NonNullable<JobCallback["outputs"]> = [];

    await callback(brief, { step: "editing" });
    for (const [i, out] of brief.outputs.entries()) {
      const ass = path.join(dir, `subs-${i}.ass`);
      await writeFile(ass, buildAssSubtitles({ transcript, plan, kept, ratio: out.aspectRatio, brandColor: brief.brand?.colors.primary, font: brief.brand?.font }));
      await callback(brief, { step: i === 0 ? "captioning" : "rendering" });
      const file = path.join(dir, `final-${out.aspectRatio.replace(":", "x")}.mp4`);
      await run("ffmpeg", buildFfmpegArgs({ input, output: file, ratio: out.aspectRatio, source: { width, height, durationSec: duration }, plan, brief, subtitlesPath: ass }));
      const storagePath = `${out.destination.prefix}${out.aspectRatio.replace(":", "x")}-${Date.now()}.mp4`;
      const { error } = await supabase.storage.from(out.destination.bucket).upload(storagePath, await readFile(file), { contentType: "video/mp4" });
      if (error) throw new Error(`upload_failed: ${error.message}`);
      const size = OUTPUT_SIZES[out.aspectRatio];
      outputs.push({
        aspectRatio: out.aspectRatio as "9:16",
        bucket: out.destination.bucket,
        path: storagePath,
        fileName: path.basename(file),
        width: size.w,
        height: size.h,
        durationSec: kept.reduce((s, k) => s + (k.end - k.start), 0),
        sizeBytes: (await stat(file)).size,
      });
    }
    await callback(brief, { step: "rendering", progress: 95, outputs });
    await callback(brief, { status: "succeeded", step: "completed", progress: 100 });
  } catch (e) {
    console.error("[worker] falha", e);
    await callback(brief, { status: "failed", error: { code: "worker_error", message: "Falha no processamento automático." } });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

if (process.argv[1]?.includes("editing-worker")) {
  http
    .createServer(async (req, res) => {
      if (req.method !== "POST" || req.headers.authorization !== `Bearer ${TOKEN}`) {
        res.writeHead(401).end();
        return;
      }
      let body = "";
      for await (const chunk of req) body += chunk;
      const brief = JSON.parse(body) as EditBrief;
      res.writeHead(202, { "Content-Type": "application/json" }).end(JSON.stringify({ id: brief.job.id }));
      void processBrief(brief);
    })
    .listen(PORT, () => console.log(`[worker] ouvindo em :${PORT}`));
}
