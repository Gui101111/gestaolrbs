"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Hand, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { browserProgressAction, browserUploadTargetsAction, claimBrowserJobAction, completeBrowserJobAction, failBrowserJobAction } from "@/lib/actions/browser-editing";
import { localReview, reviseWithClaude, type SampleFn } from "@/lib/browser-editor/ai";
import { decodeAudio, to16k } from "@/lib/browser-editor/audio";
import { encode, encodeSupport } from "@/lib/browser-editor/encode";
import { localRevision, posterAt, posterFor, stepFor } from "@/lib/browser-editor/jobs";
import { localFile } from "@/lib/browser-editor/local-files";
import { analyze, loadLogo, renderInputs, type EditorDeps } from "@/lib/browser-editor/pipeline";
import { optionsFor } from "@/lib/browser-editor/project-options";
import { bookends, newAudioContext, primeVideo, render, type RenderParams } from "@/lib/browser-editor/render";
import { toSource } from "@/lib/browser-editor/timeline";
import type { TransformersLike } from "@/lib/browser-editor/transcribe";
import type { Analysis, EditOptions, RenderOutput } from "@/lib/browser-editor/types";
import { BUCKETS } from "@/lib/constants/domain";
import { createClient } from "@/lib/supabase/client";

/** Avisa o executor que há edição nova na fila (depois de enviar ou pedir ajuste). */
export const EDITING_EVENT = "tribuna:edicao";
export function notifyEditingQueued() {
  window.dispatchEvent(new Event(EDITING_EVENT));
}

type Status = { name: string; progress: number; detail: string } | null;

/** Trava entre abas: só uma edita cada job. */
const lockKey = (id: string) => `tribuna-edicao-${id}`;
function takeLock(id: string) {
  try {
    const v = Number(localStorage.getItem(lockKey(id)) ?? 0);
    if (Date.now() - v < 20_000) return false;
    localStorage.setItem(lockKey(id), String(Date.now()));
  } catch {
    // sem localStorage: segue
  }
  return true;
}
function touchLock(id: string) {
  try {
    localStorage.setItem(lockKey(id), String(Date.now()));
  } catch {
    // ignora
  }
}
function dropLock(id: string) {
  try {
    localStorage.removeItem(lockKey(id));
  } catch {
    // ignora
  }
}

/** Claude pelo servidor (/api/editor/ia), com a mesma interface da capacidade sample. */
function serverSample(): SampleFn {
  const call = async (input: string) => {
    const res = await fetch("/api/editor/ia", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt: input }) });
    const body = (await res.json().catch(() => ({}))) as { text?: string; truncated?: boolean; code?: string };
    if (!res.ok || typeof body.text !== "string") throw { code: body.code ?? "error" };
    return { text: body.text, truncated: Boolean(body.truncated) };
  };
  const fn = (async (input: string) => call(input)) as SampleFn;
  fn.json = async <T,>(input: string) => {
    const { text } = await call(input);
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw { code: "error" };
    return JSON.parse(m[0]) as T;
  };
  fn.limits = async () => ({ maxPromptBytes: 180_000 });
  return fn;
}

let asr: Promise<TransformersLike> | null = null;
function loadAsr(): Promise<TransformersLike> {
  const w = window as unknown as { TribunaASR?: TransformersLike };
  if (w.TribunaASR) return Promise.resolve(w.TribunaASR);
  asr ??= new Promise<TransformersLike>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "/vendor/asr/asr.js";
    s.async = true;
    s.onload = () => (w.TribunaASR ? resolve(w.TribunaASR) : reject(new Error("asr.js sem o módulo")));
    s.onerror = () => reject(new Error("asr.js não carregou"));
    document.head.appendChild(s);
  }).catch((e) => {
    asr = null;
    throw e;
  });
  return asr;
}

const deps = (): EditorDeps => ({
  sample: serverSample(),
  whisper: { remote: { modelId: "Xenova/whisper-base", wasmPaths: "/vendor/asr/" }, importTransformers: loadAsr },
});

/** O que guardamos do job para ajustes futuros (sem refazer a transcrição). */
type SavedPlan = { segments: Analysis["segments"]; review: Analysis["review"]; speech: Analysis["speech"]; face: Analysis["face"]; duration: number; width: number; height: number; speechDb: number | null; transcriptBy: Analysis["transcriptBy"]; opts: Partial<EditOptions> };

/**
 * Executor da edição no navegador: pega os jobs do provedor "navegador"
 * desta conta, edita com o motor de lib/browser-editor e entrega os MP4 no
 * Storage. Fica montado no layout do app; a aba precisa ficar aberta.
 */
export function BrowserEditingRunner({ userId }: { userId: string }) {
  const [status, setStatus] = React.useState<Status>(null);
  const [gesture, setGesture] = React.useState<(() => void) | null>(null);
  const busy = React.useRef(false);

  const requestGesture = React.useCallback(
    (fn: () => void) =>
      new Promise<void>((resolve) => {
        setGesture(() => () => {
          fn();
          setGesture(null);
          resolve();
        });
      }),
    [],
  );

  const run = React.useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    const supabase = createClient();
    try {
      for (;;) {
        const { data: jobs } = await supabase
          .from("render_jobs")
          .select("id, project_id, kind, status")
          .eq("user_id", userId)
          .eq("provider", "navegador")
          .in("status", ["queued", "running"])
          .order("created_at", { ascending: true })
          .limit(5);
        const job = (jobs ?? []).find((j) => takeLock(j.id));
        if (!job) break;
        const beat = window.setInterval(() => touchLock(job.id), 5000);
        try {
          await processJob(job, supabase, setStatus, requestGesture);
        } catch (e) {
          console.error("[edição] falhou", e);
          const msg = e instanceof Error && e.message ? e.message : "Não conseguimos editar este vídeo no navegador.";
          await failBrowserJobAction(job.id, msg.slice(0, 380)).catch(() => {});
        } finally {
          window.clearInterval(beat);
          dropLock(job.id);
          setStatus(null);
        }
      }
    } finally {
      busy.current = false;
    }
  }, [userId, requestGesture]);

  React.useEffect(() => {
    void run();
    const onQueued = () => void run();
    window.addEventListener(EDITING_EVENT, onQueued);
    const t = window.setInterval(() => void run(), 20_000);
    return () => {
      window.removeEventListener(EDITING_EVENT, onQueued);
      window.clearInterval(t);
    };
  }, [run]);

  // sair da página no meio da edição perde o trabalho
  React.useEffect(() => {
    if (!status) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [status]);

  return (
    <>
      <AnimatePresence>
        {status && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            role="status"
            className="glass-strong fixed right-4 bottom-24 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-[18px] p-3.5 shadow-[var(--shadow-pop)] lg:bottom-5"
          >
            <div className="flex items-center gap-3">
              <Loader2 className="size-4 shrink-0 animate-spin text-cyan" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-fg">Editando “{status.name}”</p>
                <p className="truncate text-xs text-fg-3">{status.detail || "Mantenha esta aba aberta"}</p>
              </div>
              <span className="font-display text-sm font-bold text-cyan tabular-nums">{Math.round(status.progress)}%</span>
            </div>
            <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-fg/10">
              <div className="h-full rounded-full bg-brand-gradient transition-[width] duration-500" style={{ width: `${status.progress}%` }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {gesture && (
        <div className="fixed inset-0 z-[95] grid place-items-center bg-black/70 p-6 backdrop-blur-sm">
          <div className="max-w-sm rounded-[26px] border border-line bg-surface p-6 text-center shadow-[var(--shadow-pop)]">
            <Hand className="mx-auto size-8 text-gold" />
            <p className="mt-3 font-display text-lg font-bold text-fg">Toque para continuar</p>
            <p className="mt-1 text-sm text-fg-2">Este navegador pede um toque para tocar o vídeo enquanto gravamos a edição.</p>
            <Button variant="gold" size="lg" className="mt-5 w-full" onClick={() => gesture()}>
              Continuar a edição
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

type Supabase = ReturnType<typeof createClient>;

async function processJob(
  job: { id: string; project_id: string; kind: string },
  supabase: Supabase,
  setStatus: (s: Status) => void,
  requestGesture: (fn: () => void) => Promise<void>,
) {
  const claim = await claimBrowserJobAction(job.id);
  if (!claim.ok) throw new Error(claim.error);
  const version = claim.data!.version;

  const { data: project } = await supabase.from("projects").select("*").eq("id", job.project_id).single();
  if (!project) throw new Error("Projeto não encontrado.");
  const name = String(project.name ?? "Vídeo");
  let lastSent = 0;
  const report = (step: string, progress: number, detail = "") => {
    setStatus({ name, progress, detail });
    const now = performance.now();
    if (now - lastSent < 1500 && progress < 99) return;
    lastSent = now;
    void browserProgressAction(job.id, step, Math.min(99, progress)).catch(() => {});
  };
  report("analyzing_audio", 4, "Preparando o vídeo");

  const [{ data: file }, { data: brand }, { data: profile }] = await Promise.all([
    supabase.from("project_files").select("bucket, storage_path").eq("project_id", job.project_id).eq("kind", "original").eq("status", "uploaded").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("brand_kits").select("*").eq("user_id", project.user_id).maybeSingle(),
    supabase.from("profiles").select("*").eq("id", project.user_id).maybeSingle(),
  ]);
  if (!file) throw new Error("O vídeo original não foi encontrado.");
  let blob = localFile(file.storage_path);
  if (!blob) {
    report("analyzing_audio", 5, "Baixando o vídeo enviado");
    const { data: signed } = await supabase.storage.from(file.bucket).createSignedUrl(file.storage_path, 3600);
    if (!signed?.signedUrl) throw new Error("Não foi possível abrir o vídeo enviado.");
    const res = await fetch(signed.signedUrl);
    if (!res.ok) throw new Error("Não foi possível baixar o vídeo enviado.");
    blob = await res.blob();
  }
  const logoBlob = brand?.logo_path ? ((await supabase.storage.from(BUCKETS.brand).download(brand.logo_path)).data ?? null) : null;
  let opts = optionsFor(project as unknown as Record<string, unknown>, brand as unknown as Record<string, unknown> | null, profile as unknown as Record<string, unknown> | null, logoBlob);
  const d = deps();
  const url = URL.createObjectURL(blob);
  const signal = new AbortController().signal;

  try {
    let analysis: Analysis | null = null;
    if (job.kind === "revision") {
      // ajuste: reaproveita a transcrição salva no job anterior
      const { data: prev } = await supabase
        .from("render_jobs")
        .select("edit_plan")
        .eq("project_id", job.project_id)
        .eq("status", "succeeded")
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const saved = (prev?.edit_plan ?? null) as SavedPlan | null;
      if (saved?.segments) {
        const pcm = await decodeAudio(blob).catch(() => null);
        analysis = { ...saved, audio: pcm ? to16k(pcm) : null, pcm, frameDb: null, silences: [], notes: [] };
        opts = { ...opts, ...saved.opts, logo: opts.logo, name: opts.name, office: opts.office, accentColor: opts.accentColor };
        const { data: rev } = await supabase.from("project_revisions").select("comment, timestamp_sec").eq("project_id", job.project_id).eq("status", "open").order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (rev) {
          report("planning", 40, "Aplicando o seu pedido de ajuste");
          const intro = bookends(opts, analysis.review?.title ?? "", analysis.review?.cta ?? "").introDur;
          const plan0 = renderInputs(analysis, opts).plan;
          const at = rev.timestamp_sec != null ? toSource(plan0.keep, Math.max(0, Number(rev.timestamp_sec) - intro)).t : null;
          const patch = d.sample ? await reviseWithClaude(d.sample, rev.comment, at, opts, analysis.segments).catch(() => null) : null;
          if (patch) {
            const { cuts, restore, fixes, ...rest } = patch;
            delete (rest as { note?: string }).note;
            opts = { ...opts, ...rest, extraCuts: restore ? [] : [...(opts.extraCuts ?? []), ...(cuts ?? [])] };
            if (fixes?.length) {
              const segs = analysis.segments.map((s) => {
                const f = fixes.find((x) => x.id === s.id);
                return f ? { ...s, text: f.text } : s;
              });
              analysis = { ...analysis, segments: segs, review: analysis.review ? { ...analysis.review, segments: segs } : null };
            }
          } else opts = { ...opts, ...localRevision(rev.comment).patch };
        }
      }
    }
    if (!analysis) {
      analysis = await analyze(blob, url, opts, d, (p) => {
        const s = stepFor(p);
        report(s.step, s.progress, p.detail ?? "");
      }, signal);
      if (!analysis.review && analysis.segments.length) analysis = { ...analysis, review: localReview(analysis.segments) };
    }

    report("editing", 56, "Montando a edição");
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
      motion: inputs.motion,
      signal,
      onProgress: (f) => {
        const s = stepFor({ step: "montar", value: f });
        report(s.step, s.progress, "Renderizando · mantenha esta aba aberta");
      },
      requestGesture,
    };
    let outs: RenderOutput[] | null = null;
    const support = await encodeSupport(opts.ratios, analysis.pcm?.rate ?? (opts.music || opts.effects ? 48_000 : null)).catch(() => null);
    if (support) {
      try {
        outs = await encode(params, support);
      } catch (e) {
        console.warn("[edição] WebCodecs falhou, gravando em tempo real", e);
      }
    }
    if (!outs) {
      const ac = newAudioContext();
      await requestGesture(() => primeVideo(ac, video));
      outs = await render({ ...params, ac });
    }
    video.remove();

    // entrega: um arquivo por formato, com capa
    report("rendering", 97, "Salvando na sua conta");
    const targets = await browserUploadTargetsAction(job.id, version, outs.map((o) => ({ ratio: o.ratio, ext: o.ext })));
    if (!targets.ok) throw new Error(targets.error);
    const delivered = [];
    for (const o of outs) {
      const t = targets.data!.find((x) => x.ratio === o.ratio)!;
      const up = await supabase.storage.from(BUCKETS.renders).uploadToSignedUrl(t.path, t.token, o.blob, { contentType: o.mime });
      if (up.error) throw new Error("Falha ao salvar o vídeo editado. Verifique a conexão e tente de novo.");
      const poster = await posterFor(o, posterAt(opts, inputs.title, inputs.cta, o.duration));
      let posterPath: string | null = null;
      if (poster) {
        const pu = await supabase.storage.from(BUCKETS.renders).uploadToSignedUrl(t.posterPath, t.posterToken, poster, { contentType: "image/jpeg" });
        if (!pu.error) posterPath = t.posterPath;
      }
      delivered.push({ ratio: o.ratio, path: t.path, posterPath, width: o.width, height: o.height, duration: o.duration, size: o.blob.size });
      URL.revokeObjectURL(o.url);
    }
    const plan: SavedPlan = {
      segments: analysis.segments,
      review: analysis.review,
      speech: analysis.speech,
      face: analysis.face,
      duration: analysis.duration,
      width: analysis.width,
      height: analysis.height,
      speechDb: analysis.speechDb,
      transcriptBy: analysis.transcriptBy,
      opts: { ...opts, logo: null },
    };
    const done = await completeBrowserJobAction(job.id, version, delivered, plan);
    if (!done.ok) throw new Error(done.error);
  } finally {
    URL.revokeObjectURL(url);
  }
}
