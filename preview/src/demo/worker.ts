/**
 * Editor da demonstração: no lugar do Claude Managed Agents, o próprio
 * navegador edita o vídeo enviado (motor de lib/browser-editor) e entrega
 * os MP4 como "renders" do projeto, com as mesmas etapas, notificações e
 * alertas da OAB do app de verdade.
 */
import { localReview } from "@/lib/browser-editor/ai";
import { encode, encodeSupport } from "@/lib/browser-editor/encode";
import { analyze, loadLogo, renderInputs } from "@/lib/browser-editor/pipeline";
import { posterAt, posterFor, stepFor } from "@/lib/browser-editor/jobs";
import { optionsFor } from "@/lib/browser-editor/project-options";
import { newAudioContext, primeVideo, render, type RenderParams } from "@/lib/browser-editor/render";
import { applyRequest, savedOptions } from "@/lib/browser-editor/requests";
import type { Analysis, EditOptions, Progress, RenderOutput } from "@/lib/browser-editor/types";
import { db, getFile, putFile, type Row } from "./db";
import { getEditorDeps, requestGesture } from "./deps";

/** Análise e opções guardadas por projeto (ajustes não reprocessam a fala). */
const memory = new Map<string, { analysis: Analysis; opts: EditOptions }>();
const queue: string[] = [];
let running = false;

const mmss = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

function jobUpdater(jobId: string) {
  let last = 0;
  let lastStep = "";
  return (step: string, progress: number, force = false) => {
    const now = performance.now();
    if (!force && step === lastStep && now - last < 700) return;
    last = now;
    const job = db.rows("render_jobs").find((j) => j.id === jobId);
    if (!job) return;
    const history = (job.step_history as { step: string; at: string }[]) ?? [];
    const patch: Record<string, unknown> = { current_step: step, progress: Math.max(Number(job.progress ?? 0), Math.min(99, progress)) };
    if (step !== lastStep && history[history.length - 1]?.step !== step) patch.step_history = [...history, { step, at: new Date().toISOString() }];
    lastStep = step;
    db.update("render_jobs", (j) => j.id === jobId, patch);
  };
}

async function process(jobId: string) {
  const job = db.rows("render_jobs").find((j) => j.id === jobId);
  if (!job || !["queued", "running"].includes(String(job.status))) return;
  const project = db.rows("projects").find((p) => p.id === job.project_id);
  if (!project) return;
  const uid = String(project.user_id);
  const update = jobUpdater(jobId);
  const startedAt = new Date().toISOString();
  db.update("render_jobs", (j) => j.id === jobId, { status: "running", started_at: startedAt, provider: "navegador", attempts: Number(job.attempts ?? 0) + 1 });
  db.update("projects", (p) => p.id === project.id, { status: "processing" });

  try {
    const file = db.rows("project_files").find((f) => f.project_id === project.id && f.kind === "original" && f.status === "uploaded");
    const blob = file ? await getFile(`${file.bucket}/${file.storage_path}`) : null;
    if (!blob) throw new Error("O vídeo original não está mais guardado neste navegador. Envie de novo para editar.");
    const brand = db.rows("brand_kits").find((b) => b.user_id === uid);
    const profile = db.rows("profiles").find((p) => p.id === uid);
    const logoBlob = brand?.logo_path ? await getFile(`brand-assets/${brand.logo_path}`) : null;
    let opts = optionsFor(project, brand, profile, logoBlob);
    const deps = await getEditorDeps();
    const url = URL.createObjectURL(blob);
    const signal = new AbortController().signal;
    const cached = memory.get(String(project.id));
    let analysis: Analysis;
    let note: string | null = null;

    if (cached) analysis = cached.analysis;
    else {
      analysis = await analyze(blob, url, opts, deps, (p) => {
        const s = stepFor(p);
        update(s.step, s.progress);
      }, signal);
      if (!analysis.review && analysis.segments.length) analysis = { ...analysis, review: localReview(analysis.segments) };
    }
    if (job.kind === "revision") {
      // ajuste: parte das escolhas da última edição (da memória ou do que ficou salvo)
      const last = db
        .rows("render_jobs")
        .filter((j) => j.project_id === project.id && j.status === "completed" && j.id !== jobId)
        .sort((x, y) => String(y.completed_at).localeCompare(String(x.completed_at)))[0];
      const prev = cached?.opts ?? ((last?.edit_plan as { opcoes?: Partial<EditOptions> } | null)?.opcoes ?? null);
      if (prev) opts = { ...opts, ...prev, logo: opts.logo, name: opts.name, office: opts.office, oab: opts.oab, framing: prev.framing ?? opts.framing };
      else if (opts.notes?.trim()) ({ opts, analysis } = await applyRequest({ kind: "observacoes", text: opts.notes, atOut: null, sample: deps.sample, opts, analysis, signal }));
      const rev = db
        .rows("project_revisions")
        .filter((r) => r.project_id === project.id && r.status === "open")
        .sort((x, y) => String(y.created_at).localeCompare(String(x.created_at)))[0];
      if (rev) {
        update("planning", 45, true);
        const r = await applyRequest({ kind: "ajuste", text: String(rev.comment), atOut: rev.timestamp_sec != null ? Number(rev.timestamp_sec) : null, sample: deps.sample, opts, analysis, signal });
        ({ opts, analysis } = r);
        note = r.note;
      }
    } else if (opts.notes?.trim()) {
      // observações do Novo vídeo também mudam a edição (não só o texto)
      update("planning", 50, true);
      const r = await applyRequest({ kind: "observacoes", text: opts.notes, atOut: null, sample: deps.sample, opts, analysis, signal });
      ({ opts, analysis } = r);
      note = r.note;
    }

    update("editing", 56, true);
    const inputs = renderInputs(analysis, opts);
    const logo = await loadLogo(opts.hideLogo ? null : opts.logo);
    const video = document.createElement("video");
    video.playsInline = true;
    video.muted = true;
    video.preload = "auto";
    video.src = url;
    video.style.cssText = "position:fixed;left:-9999px;top:0;width:2px;height:2px;opacity:0;pointer-events:none";
    document.body.appendChild(video);
    await new Promise<void>((resolve) => {
      video.onloadeddata = () => resolve();
      window.setTimeout(resolve, 8000);
    });
    const params: RenderParams = {
      video,
      ac: null as unknown as AudioContext,
      analysis,
      plan: inputs.plan,
      opts,
      look: inputs.look,
      words: inputs.words,
      title: inputs.title,
      cta: inputs.cta,
      logo,
      motion: inputs.motion,
      signal,
      onProgress: (f) => {
        const s = stepFor({ step: "montar", value: f });
        update(s.step, s.progress);
      },
      requestGesture,
    };
    let outs: RenderOutput[] | null = null;
    const support = await encodeSupport(opts.ratios, analysis.pcm?.rate ?? (opts.music || opts.effects ? 48_000 : null)).catch(() => null);
    if (support) {
      try {
        outs = await encode(params, support);
      } catch (e) {
        console.warn("[demo] WebCodecs falhou, gravando em tempo real", e);
      }
    }
    if (!outs) {
      // gravação em tempo real: o áudio passa pelo Web Audio e o navegador pode pedir um toque
      const ac = newAudioContext();
      await requestGesture(() => {
        primeVideo(ac, video);
      });
      outs = await render({ ...params, ac });
    }
    video.remove();
    URL.revokeObjectURL(url);

    // Entrega: um MP4 por formato, com miniatura
    const version = Math.max(0, ...db.rows("renders").filter((r) => r.project_id === project.id).map((r) => Number(r.version))) + 1;
    for (const out of outs) {
      const base = `${uid}/${project.id}/v${version}/${out.ratio.replace(":", "x")}`;
      await putFile(`rendered-videos/${base}.${out.ext}`, out.blob);
      const poster = await posterFor(out, posterAt(opts, inputs.title, inputs.cta, out.duration));
      if (poster) await putFile(`rendered-videos/${base}.jpg`, poster);
      db.insert("renders", {
        project_id: project.id,
        user_id: uid,
        job_id: jobId,
        aspect_ratio: out.ratio,
        storage_path: `${base}.${out.ext}`,
        thumbnail_path: poster ? `${base}.jpg` : null,
        file_name: `${out.ratio.replace(":", "x")}.${out.ext}`,
        resolution: `${Math.min(out.width, out.height)}p`,
        width: out.width,
        height: out.height,
        duration_sec: Math.round(out.duration * 100) / 100,
        file_size: out.blob.size,
        version,
        published: true,
      });
    }
    memory.set(String(project.id), { analysis, opts });

    const alerts = (analysis.review?.alerts ?? []).map((al) => ({ tempo: al.tempo !== null ? mmss(al.tempo) : "", tempoSec: al.tempo, frase: al.frase, motivo: al.motivo }));
    const report = {
      status: "ok",
      cortes: inputs.plan.cutsPauses + inputs.plan.cutsMistakes,
      duracao_original_s: Math.round(analysis.duration * 10) / 10,
      duracao_final_s: Math.round(outs[0].duration * 10) / 10,
      revisado_por: analysis.review?.by ?? "local",
      observacoes: [note, ...analysis.notes].filter(Boolean).join(" "),
      opcoes: savedOptions(opts),
    };
    const done = new Date().toISOString();
    db.update("render_jobs", (j) => j.id === jobId, {
      status: "completed",
      progress: 100,
      current_step: "completed",
      completed_at: done,
      compliance_flags: alerts,
      edit_plan: report,
      step_history: [...((db.rows("render_jobs").find((j) => j.id === jobId)?.step_history as unknown[]) ?? []), { step: "completed", at: done }],
    });
    if (job.kind === "revision") db.update("project_revisions", (r) => r.project_id === project.id && r.status === "open", { status: "resolved", resolved_at: done });
    db.update("projects", (p) => p.id === project.id, { status: "ready", completed_at: done });
    db.insert("notifications", {
      user_id: uid,
      type: "project_ready",
      title: job.kind === "revision" ? "Ajuste pronto" : "Seu vídeo está pronto",
      body: note ? `“${project.name}”: ${note}` : `“${project.name}” está pronto para baixar.`,
      link: `/app/video/${project.id}`,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "A edição parou.";
    console.error("[demo] edição falhou", e);
    db.update("render_jobs", (j) => j.id === jobId, { status: "failed", error_message: message, error_code: "browser_editor" });
    db.update("projects", (p) => p.id === project.id, { status: "failed" });
    db.insert("notifications", { user_id: uid, type: "project_failed", title: "A edição parou", body: `“${project.name}”: ${message}`, link: `/app/video/${project.id}` });
  }
}

async function pump() {
  if (running) return;
  running = true;
  try {
    for (let id = queue.shift(); id; id = queue.shift()) await process(id);
  } finally {
    running = false;
  }
}

/** Mesmo contrato do dispatch do app: recebe o job e começa a edição. */
export async function dispatchJob(job: { id: string }) {
  if (!queue.includes(job.id)) queue.push(job.id);
  void pump();
  return { ok: true as const };
}

/** Ao abrir a página, retoma o que ficou na fila ou parou no meio. */
export function resumePendingJobs() {
  for (const j of db.rows("render_jobs").filter((x) => x.status === "queued" || x.status === "running")) {
    db.update("render_jobs", (x) => x.id === j.id, { status: "queued" });
    void dispatchJob({ id: j.id });
  }
}
