/**
 * Editor da demonstração: no lugar do Claude Managed Agents, o próprio
 * navegador edita o vídeo enviado (motor de lib/browser-editor) e entrega
 * os MP4 como "renders" do projeto, com as mesmas etapas, notificações e
 * alertas da OAB do app de verdade.
 */
import { localReview, reviseWithClaude } from "@/lib/browser-editor/ai";
import { encode, encodeSupport } from "@/lib/browser-editor/encode";
import { defaultsFor } from "@/lib/browser-editor/looks";
import { analyze, loadLogo, renderInputs } from "@/lib/browser-editor/pipeline";
import { newAudioContext, primeVideo, render, type RenderParams } from "@/lib/browser-editor/render";
import { toSource } from "@/lib/browser-editor/timeline";
import type { Analysis, CaptionStyle, EditOptions, Interval, Plan, Progress, Ratio, RenderOutput, StyleId } from "@/lib/browser-editor/types";
import { db, getFile, putFile, type Row } from "./db";
import { getEditorDeps, requestGesture } from "./deps";

const STYLES: StyleId[] = ["institucional", "dinamico", "cinematografico", "performance", "descontraido"];
const RATIOS: Ratio[] = ["9:16", "1:1", "4:5", "16:9"];

/** Análise e opções guardadas por projeto (ajustes não reprocessam a fala). */
const memory = new Map<string, { analysis: Analysis; opts: EditOptions; plan: Plan; introDur: number }>();
const queue: string[] = [];
let running = false;

const mmss = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

function parseTime(v: string): number | null {
  const parts = v.trim().split(":").map(Number);
  if (!parts.length || parts.some((n) => !Number.isFinite(n))) return null;
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}

function ctaFor(type: string | undefined, text: string | undefined, brand: Row | undefined) {
  if (text?.trim()) return text.trim();
  const ig = String(brand?.instagram ?? "").trim();
  const site = String(brand?.website ?? "").trim();
  const zap = String(brand?.whatsapp ?? "").trim();
  if (type === "seguir" && ig) return `Siga ${ig.startsWith("@") ? ig : `@${ig}`}`;
  if (type === "site" && site) return `Acesse ${site.replace(/^https?:\/\//, "")}`;
  if (type === "whatsapp" && zap) return `WhatsApp ${zap}`;
  return "";
}

/** Projeto + marca + perfil → opções do motor (as mesmas perguntas do Novo vídeo). */
export function optionsFor(project: Row, brand: Row | undefined, profile: Row | undefined, logo: Blob | null): EditOptions {
  const o = (project.options ?? {}) as {
    answers?: Record<string, string>;
    answers_text?: Record<string, string>;
    caption_style?: CaptionStyle;
    cta_type?: string;
    cta_text?: string;
    hook_text?: string;
    cut_ranges?: { start: string; end: string }[];
    target_duration?: string;
  };
  const style = (STYLES.includes(project.editing_style as StyleId) ? project.editing_style : "institucional") as StyleId;
  const base = defaultsFor(style);
  const a = o.answers ?? {};
  const yes = (k: string, fallback: boolean) => (a[k] ? a[k] !== "nao" : fallback);
  const ratios = ((project.aspect_ratios as string[]) ?? []).filter((r): r is Ratio => RATIOS.includes(r as Ratio));
  const treatment = profile?.treatment === "dra" ? "Dra. " : profile?.treatment === "dr" ? "Dr. " : "";
  const fullName = String(profile?.full_name ?? "").trim();
  const name = String(brand?.professional_name ?? "").trim() || (fullName ? `${/^(dra?\.?)\s/i.test(fullName) ? "" : treatment}${fullName}` : "");
  const oab = String(brand?.oab_display ?? "").trim() || (profile?.oab_number && profile?.oab_uf ? `OAB/${profile.oab_uf} ${profile.oab_number}` : "");
  const target = { "60s": 60, "90s": 90, "3min": 180 }[o.target_duration ?? ""] ?? null;
  const notes = [String(project.instructions ?? ""), ...Object.entries(o.answers_text ?? {}).map(([k, v]) => `${k}: ${v}`)].filter((s) => s.trim()).join(" · ");
  return {
    style,
    ratios: ratios.length ? ratios : ["9:16"],
    cutPauses: yes("pauses", base.cutPauses),
    removeMistakes: yes("pauses", base.removeMistakes),
    captions: yes("captions", base.captions),
    captionStyle: o.caption_style ?? base.captionStyle,
    lowerThird: yes("lower_third", base.lowerThird) && Boolean(name),
    name,
    oab,
    hook: yes("hook", base.hook),
    hookText: o.hook_text ?? "",
    cta: yes("cta", base.cta),
    ctaText: ctaFor(o.cta_type, o.cta_text, brand),
    vignette: yes("vignette", base.vignette) && Boolean(name),
    zoom: yes("effects", base.zoom),
    enhanceAudio: true,
    oabReview: yes("oab", true),
    logo: yes("brand", true) ? logo : null,
    script: "",
    framing: {},
    extraCuts: (o.cut_ranges ?? [])
      .map((r) => ({ start: parseTime(r.start), end: parseTime(r.end) }))
      .filter((r): r is Interval => r.start !== null && r.end !== null && r.end > r.start),
    notes,
    targetSeconds: target,
  };
}

/**
 * Sem a IA (página aberta fora do claude.ai): entende os pedidos de ajuste
 * mais comuns por palavras-chave.
 */
function localRevision(comment: string): { patch: Partial<EditOptions>; note: string } {
  const c = comment.toLocaleLowerCase("pt-BR");
  const off = /\b(tira|tirar|tire|remove|remover|sem|retira|retirar|esconde|desliga|apaga)\b/.test(c);
  const on = /\b(coloca|colocar|coloque|adiciona|adicionar|põe|poe|inclui|incluir|liga|quero)\b/.test(c);
  const patch: Partial<EditOptions> = {};
  const done: string[] = [];
  const flag = (re: RegExp, key: keyof EditOptions, label: string) => {
    if (!re.test(c)) return;
    if (off) {
      (patch as Record<string, unknown>)[key] = false;
      done.push(`sem ${label}`);
    } else if (on) {
      (patch as Record<string, unknown>)[key] = true;
      done.push(`com ${label}`);
    }
  };
  flag(/legenda/, "captions", "legendas");
  flag(/vinheta/, "vignette", "vinheta");
  flag(/zoom/, "zoom", "zooms");
  flag(/chamada|cta/, "cta", "chamada final");
  flag(/\b(nome|oab)\b/, "lowerThird", "nome e OAB");
  const quoted = comment.match(/[“"']([^”"']{3,80})[”"']/);
  if (/t[íi]tulo/.test(c)) {
    if (quoted) {
      Object.assign(patch, { hook: true, hookText: quoted[1].trim() });
      done.push(`título “${quoted[1].trim()}”`);
    } else flag(/t[íi]tulo/, "hook", "título");
  }
  if (/pausa|sil[êe]ncio/.test(c) && !off) {
    patch.cutPauses = true;
    done.push("pausas cortadas");
  }
  return {
    patch,
    note: done.length ? `Ajuste aplicado: ${done.join(", ")}.` : "Sem a IA nesta página, refizemos a edição com as mesmas escolhas. Abra no claude.ai para pedidos livres.",
  };
}

/** Etapas do motor → etapas do app (PIPELINE_STEPS). */
function stepFor(p: Progress): { step: string; progress: number } {
  switch (p.step) {
    case "ler":
      return { step: "analyzing_audio", progress: 6 };
    case "audio":
      return { step: "analyzing_audio", progress: 12 };
    case "transcrever":
      return { step: "transcribing", progress: Math.round(16 + 26 * (p.value ?? 0)) };
    case "revisar":
      return { step: "analyzing_content", progress: 46 };
    case "enquadrar":
      return { step: "planning", progress: 52 };
    default: {
      const f = p.value ?? 0;
      const step = f < 0.3 ? "editing" : f < 0.6 ? "captioning" : f < 0.85 ? "adding_elements" : "rendering";
      return { step, progress: Math.round(56 + 42 * f) };
    }
  }
}

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

async function posterFor(out: RenderOutput): Promise<Blob | null> {
  try {
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.src = out.url;
    await new Promise<void>((resolve, reject) => {
      v.onloadeddata = () => resolve();
      v.onerror = () => reject(new Error("poster"));
      window.setTimeout(resolve, 5000);
    });
    v.currentTime = Math.min(out.duration / 3, 2.2);
    await new Promise<void>((resolve) => {
      v.onseeked = () => resolve();
      window.setTimeout(resolve, 4000);
    });
    const c = document.createElement("canvas");
    const k = 720 / Math.max(out.width, out.height);
    c.width = Math.round(out.width * k);
    c.height = Math.round(out.height * k);
    c.getContext("2d")!.drawImage(v, 0, 0, c.width, c.height);
    return await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.82));
  } catch {
    return null;
  }
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

    if (job.kind === "revision" && cached) {
      update("planning", 45, true);
      analysis = cached.analysis;
      opts = { ...opts, ...cached.opts, logo: opts.logo, name: opts.name, oab: opts.oab, framing: cached.opts.framing };
      const rev = db
        .rows("project_revisions")
        .filter((r) => r.project_id === project.id && r.status === "open")
        .sort((x, y) => String(y.created_at).localeCompare(String(x.created_at)))[0];
      if (rev && deps.sample) {
        const at = rev.timestamp_sec != null ? toSource(cached.plan.keep, Math.max(0, Number(rev.timestamp_sec) - cached.introDur)).t : null;
        const patch = await reviseWithClaude(deps.sample, String(rev.comment), at, opts, analysis.segments).catch(() => null);
        if (patch) {
          const { cuts, restore, fixes, note: n, ...rest } = patch;
          note = n;
          opts = { ...opts, ...rest, extraCuts: restore ? [] : [...(opts.extraCuts ?? []), ...(cuts ?? [])] };
          if (fixes?.length) {
            const segs = analysis.segments.map((s) => {
              const f = fixes.find((x) => x.id === s.id);
              return f ? { ...s, text: f.text } : s;
            });
            analysis = { ...analysis, segments: segs, review: analysis.review ? { ...analysis.review, segments: segs } : null };
          }
        }
      } else if (rev) {
        const local = localRevision(String(rev.comment));
        opts = { ...opts, ...local.patch };
        note = local.note;
      }
    } else {
      analysis = await analyze(blob, url, opts, deps, (p) => {
        const s = stepFor(p);
        update(s.step, s.progress);
      }, signal);
      if (!analysis.review && analysis.segments.length) analysis = { ...analysis, review: localReview(analysis.segments) };
    }

    update("editing", 56, true);
    const inputs = renderInputs(analysis, opts);
    const logo = await loadLogo(opts.logo);
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
      signal,
      onProgress: (f) => {
        const s = stepFor({ step: "montar", value: f });
        update(s.step, s.progress);
      },
      requestGesture,
    };
    let outs: RenderOutput[] | null = null;
    const support = await encodeSupport(opts.ratios, analysis.pcm?.rate ?? null).catch(() => null);
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
      const poster = await posterFor(out);
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
    memory.set(String(project.id), { analysis, opts, plan: inputs.plan, introDur: Math.max(0, outs[0].duration - inputs.plan.bodyDuration - (opts.vignette ? 2.6 : 0)) });

    const alerts = (analysis.review?.alerts ?? []).map((al) => ({ tempo: al.tempo !== null ? mmss(al.tempo) : "", tempoSec: al.tempo, frase: al.frase, motivo: al.motivo }));
    const report = {
      status: "ok",
      cortes: inputs.plan.cutsPauses + inputs.plan.cutsMistakes,
      duracao_original_s: Math.round(analysis.duration * 10) / 10,
      duracao_final_s: Math.round(outs[0].duration * 10) / 10,
      revisado_por: analysis.review?.by ?? "local",
      observacoes: [note, ...analysis.notes].filter(Boolean).join(" "),
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
