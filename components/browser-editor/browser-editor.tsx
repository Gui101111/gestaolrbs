"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/brand/logo";
import { StepDetails, StepStyle, StepUpload, type PickedVideo } from "@/components/browser-editor/editor-form";
import { STEPS, WorkingView, type StepView } from "@/components/browser-editor/editor-working";
import { ResultView } from "@/components/browser-editor/editor-result";
import { defaultsFor } from "@/lib/browser-editor/looks";
import { analyze, loadLogo, renderInputs, type EditorDeps } from "@/lib/browser-editor/pipeline";
import { encode, encodeSupport } from "@/lib/browser-editor/encode";
import { canRenderHere, newAudioContext, primeVideo, render, type RenderParams } from "@/lib/browser-editor/render";
import { saveVideo } from "@/lib/browser-editor/runtime";
import { segmentsFromScript } from "@/lib/browser-editor/timeline";
import { loadWhisper } from "@/lib/browser-editor/transcribe";
import type { Analysis, EditOptions, Plan, Progress, Ratio, RenderOutput, Segment, StepId } from "@/lib/browser-editor/types";
import { cn } from "@/lib/utils";

const FORM_STEPS = ["Enviar", "Estilo e formato", "Detalhes"] as const;

const initialOptions = (): EditOptions => ({
  style: "dinamico",
  ratios: ["9:16"],
  ...defaultsFor("dinamico"),
  name: "",
  oab: "",
  hookText: "",
  ctaText: "",
  logo: null,
  script: "",
  framing: {},
});

const freshSteps = (): Record<StepId, StepView> => Object.fromEntries(STEPS.map((s) => [s.id, { state: "pending" }])) as Record<StepId, StepView>;

type Stage = "form" | "working" | "done" | "error";

async function probe(url: string): Promise<Omit<PickedVideo, "file" | "url"> & { thumb: string | null }> {
  const v = document.createElement("video");
  v.muted = true;
  v.playsInline = true;
  v.preload = "auto";
  await new Promise<void>((resolve, reject) => {
    v.onloadeddata = () => resolve();
    v.onerror = () => reject(new Error("ilegível"));
    v.src = url;
  });
  const out = { duration: v.duration, width: v.videoWidth, height: v.videoHeight };
  let thumb: string | null = null;
  try {
    await new Promise<void>((resolve) => {
      v.onseeked = () => resolve();
      v.currentTime = Math.min(1, v.duration / 2);
      window.setTimeout(resolve, 3000);
    });
    const c = document.createElement("canvas");
    const k = 720 / Math.max(v.videoWidth, v.videoHeight);
    c.width = Math.round(v.videoWidth * k);
    c.height = Math.round(v.videoHeight * k);
    c.getContext("2d")!.drawImage(v, 0, 0, c.width, c.height);
    thumb = c.toDataURL("image/jpeg", 0.8);
  } catch {
    thumb = null;
  }
  v.removeAttribute("src");
  v.load();
  return { ...out, thumb };
}

/**
 * Editor completo no navegador: enviar → estilo e formato → detalhes →
 * edição (pausas, legendas, IA, enquadramento) → baixar o MP4.
 */
export function BrowserEditor({ open, onClose, deps }: { open: boolean; onClose: () => void; deps: () => Promise<EditorDeps> }) {
  const [stage, setStage] = React.useState<Stage>("form");
  const [step, setStep] = React.useState(0);
  const [video, setVideo] = React.useState<PickedVideo | null>(null);
  const [thumb, setThumb] = React.useState<string | null>(null);
  const [opts, setOpts] = React.useState<EditOptions>(initialOptions);
  const [steps, setSteps] = React.useState(freshSteps);
  const [outputs, setOutputs] = React.useState<RenderOutput[]>([]);
  const [analysis, setAnalysis] = React.useState<Analysis | null>(null);
  const [plan, setPlan] = React.useState<Plan | null>(null);
  const [error, setError] = React.useState("");
  const [gesture, setGesture] = React.useState<(() => void) | null>(null);
  const [aiReady, setAiReady] = React.useState(false);

  const depsRef = React.useRef<Promise<EditorDeps> | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);
  const acRef = React.useRef<AudioContext | null>(null);
  const renderVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const previewHost = React.useRef<HTMLDivElement | null>(null);
  const scroller = React.useRef<HTMLDivElement | null>(null);
  const cache = React.useRef<{ url: string; analysis: Analysis } | null>(null);

  const update = React.useCallback((p: Partial<EditOptions>) => setOpts((o) => ({ ...o, ...p })), []);

  // Abre: trava a rolagem da landing e carrega as dependências (IA e Whisper)
  React.useEffect(() => {
    if (!open) return;
    const lenis = (window as unknown as { __lenis?: { stop(): void; start(): void } }).__lenis;
    lenis?.stop();
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    depsRef.current ??= deps();
    void depsRef.current.then((d) => setAiReady(Boolean(d.sample)));
    return () => {
      document.documentElement.style.overflow = prev;
      lenis?.start();
    };
  }, [open, deps]);

  React.useEffect(() => {
    scroller.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [step, stage]);

  const unsupported = React.useMemo(() => (open ? canRenderHere() : null), [open]);

  async function onPick(file: File) {
    if (!file.type.startsWith("video/") && !/\.(mp4|mov|m4v|webm|mkv)$/i.test(file.name)) {
      toast.error("Escolha um arquivo de vídeo (MP4, MOV ou WebM).");
      return;
    }
    const url = URL.createObjectURL(file);
    try {
      const info = await probe(url);
      if (video) URL.revokeObjectURL(video.url);
      cache.current = null;
      setVideo({ file, url, duration: info.duration, width: info.width, height: info.height });
      setThumb(info.thumb);
      // já baixa o reconhecimento de fala enquanto a pessoa escolhe estilo e detalhes
      void (depsRef.current ??= deps()).then((d) => (d.whisper && "manifest" in d.whisper ? loadWhisper(d.whisper.manifest, d.whisper.importTransformers) : null)).catch(() => {});
      if (info.duration > 600) toast.warning("Vídeo longo: a edição no navegador leva mais ou menos o tempo do vídeo. Até 3 minutos é o ideal.");
    } catch {
      URL.revokeObjectURL(url);
      toast.error("Este navegador não conseguiu abrir o vídeo.", { description: "Vídeos HEVC do iPhone abrem no Safari. No Chrome, exporte como MP4 (H.264) ou grave em “Mais compatível”." });
    }
  }

  const onProgress = React.useCallback((p: Progress) => {
    setSteps((prev) => {
      const next = { ...prev };
      const order = STEPS.map((s) => s.id);
      const idx = order.indexOf(p.step);
      // etapas sequenciais anteriores terminam quando a próxima começa (o enquadramento corre em paralelo)
      if (p.step !== "enquadrar") {
        for (let i = 0; i < idx; i++) {
          const id = order[i];
          if (id === "enquadrar") continue;
          if (next[id].state === "active") next[id] = { ...next[id], state: "done", value: undefined };
          else if (next[id].state === "pending") next[id] = { state: "skipped" };
        }
      }
      next[p.step] = { state: "active", detail: p.detail ?? prev[p.step].detail, value: p.value };
      return next;
    });
  }, []);

  /** Clique em "Editar meu vídeo": prepara o áudio e o vídeo dentro do toque (exigência do iPhone). */
  function start(reuse: boolean) {
    if (!video) return;
    const ac = acRef.current ?? newAudioContext();
    acRef.current = ac;
    let v = renderVideoRef.current;
    if (!v || v.dataset.src !== video.url) {
      v = document.createElement("video");
      v.playsInline = true;
      v.setAttribute("playsinline", "");
      v.preload = "auto";
      v.dataset.src = video.url;
      v.src = video.url;
      v.style.cssText = "position:fixed;left:-9999px;top:0;width:2px;height:2px;opacity:0;pointer-events:none";
      document.body.appendChild(v);
      renderVideoRef.current?.remove();
      renderVideoRef.current = v;
      primeVideo(ac, v);
    } else {
      void ac.resume();
      const p = v.play();
      if (p) p.then(() => v!.pause()).catch(() => {});
    }
    void run(v, ac, reuse);
  }

  async function run(v: HTMLVideoElement, ac: AudioContext, reuse: boolean) {
    if (!video) return;
    abortRef.current?.abort();
    const ctl = new AbortController();
    abortRef.current = ctl;
    outputs.forEach((o) => URL.revokeObjectURL(o.url));
    setOutputs([]);
    setError("");
    setStage("working");
    setSteps(freshSteps());
    try {
      const d = await (depsRef.current ??= deps());
      let a: Analysis;
      if (reuse && cache.current?.url === video.url && analysis) {
        a = analysis;
        if (!a.segments.length && opts.script.trim()) a = { ...a, segments: segmentsFromScript(opts.script, a.speech, a.duration), transcriptBy: "roteiro" };
        setSteps((s) => Object.fromEntries(Object.entries(s).map(([k, x]) => [k, k === "montar" ? x : { state: "done" }])) as Record<StepId, StepView>);
      } else {
        a = await analyze(video.file, video.url, opts, d, onProgress, ctl.signal);
        cache.current = { url: video.url, analysis: a };
      }
      setAnalysis(a);
      const inputs = renderInputs(a, opts);
      setPlan(inputs.plan);
      const logo = await loadLogo(opts.logo);
      const base = `${inputs.plan.keep.length} trechos · ${opts.ratios.join(", ")}`;
      onProgress({ step: "montar", value: 0, detail: base });
      const t0 = performance.now();
      setSteps((s) => ({ ...s, enquadrar: s.enquadrar.state === "pending" ? { state: "skipped" } : { state: "done" } }));
      if (previewHost.current) previewHost.current.replaceChildren();
      let last = 0;
      const params: RenderParams = {
        video: v,
        ac,
        analysis: a,
        plan: inputs.plan,
        opts,
        look: inputs.look,
        words: inputs.words,
        title: inputs.title,
        cta: inputs.cta,
        logo,
        motion: inputs.motion,
        signal: ctl.signal,
        onCanvas: (canvas) => {
          if (previewHost.current && !previewHost.current.firstChild) previewHost.current.appendChild(canvas);
        },
        onProgress: (f) => {
          const now = performance.now();
          if (now - last < 200 && f < 1) return;
          last = now;
          const left = f > 0.04 ? ((now - t0) / 1000) * ((1 - f) / f) : null;
          const eta = left === null ? "" : left < 50 ? " · menos de 1 minuto" : ` · faltam uns ${Math.ceil(left / 60)} min`;
          setSteps((s) => ({ ...s, montar: { state: "active", value: f, detail: `${base}${eta}` } }));
        },
        requestGesture: (fn) =>
          new Promise<void>((resolve) => {
            setGesture(() => () => {
              fn();
              setGesture(null);
              resolve();
            });
          }),
      };
      // MP4 quadro a quadro (WebCodecs) quando dá; senão grava em tempo real (MediaRecorder)
      const support = await encodeSupport(opts.ratios, a.pcm?.rate ?? (opts.music || opts.effects ? 48_000 : null)).catch(() => null);
      let outs: RenderOutput[] | null = null;
      if (support) {
        try {
          outs = await encode(params, support);
        } catch (e) {
          if ((e as Error)?.name === "AbortError") throw e;
          console.warn("[editor] WebCodecs falhou, gravando em tempo real", e);
          if (previewHost.current) previewHost.current.replaceChildren();
        }
      }
      outs ??= await render(params);
      setOutputs(outs);
      setStage("done");
    } catch (e) {
      if ((e as Error)?.name === "AbortError") {
        setStage("form");
        return;
      }
      console.error("[editor]", e);
      setError(e instanceof Error ? e.message : "Algo deu errado na edição.");
      setStage("error");
    } finally {
      setGesture(null);
    }
  }

  async function download(o: RenderOutput) {
    const base = (opts.name.trim() || video?.file.name.replace(/\.[^.]+$/, "") || "video").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
    const filename = `${base || "video"}-tribuna-${o.ratio.replace(":", "x")}.${o.ext}`;
    const r = await saveVideo(o.blob, filename);
    if (r === "saved") toast.success("Vídeo salvo.", { description: filename });
    else if (r === "fallback") toast.success("Baixando o vídeo.", { description: filename });
    else if (typeof r === "object") toast.error(r.error);
  }

  function close() {
    if (stage === "working" && !window.confirm("Cancelar a edição em andamento?")) return;
    abortRef.current?.abort();
    onClose();
  }

  function reset() {
    abortRef.current?.abort();
    outputs.forEach((o) => URL.revokeObjectURL(o.url));
    setOutputs([]);
    setAnalysis(null);
    cache.current = null;
    if (video) URL.revokeObjectURL(video.url);
    setVideo(null);
    setThumb(null);
    setOpts((o) => ({ ...initialOptions(), name: o.name, oab: o.oab, logo: o.logo }));
    setStep(0);
    setStage("form");
  }

  const canNext = step === 0 ? Boolean(video) : step === 1 ? opts.ratios.length > 0 : true;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="editor"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          role="dialog"
          aria-modal="true"
          aria-label="Editor de vídeo"
          className="theme-stage fixed inset-0 z-[80] bg-canvas text-fg"
        >
          <div ref={scroller} data-lenis-prevent className="h-full overflow-y-auto overscroll-contain">
            <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_60%_100%_at_50%_0%,color-mix(in_oklab,var(--cyan)_14%,transparent),transparent)]" />
            <header className="sticky top-0 z-10 border-b border-line bg-canvas/80 backdrop-blur-xl">
              <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 md:px-8">
                <span className="flex items-center gap-2.5">
                  <LogoMark className="size-8" />
                  <span className="font-display text-[0.95rem] font-bold tracking-[0.3em] text-fg">TRIBUNA</span>
                  <span className="hidden rounded-full border border-cyan/40 bg-cyan/10 px-2.5 py-0.5 text-[0.6875rem] font-semibold text-cyan sm:inline">Editor</span>
                </span>
                {stage === "form" && (
                  <ol className="hidden items-center gap-1 md:flex" aria-label="Etapas">
                    {FORM_STEPS.map((label, i) => (
                      <li key={label} className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={i > step && !(i === 1 && video) && !(i === 2 && video)}
                          onClick={() => setStep(i)}
                          className={cn(
                            "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                            i === step ? "bg-fg/[0.08] text-fg" : "text-fg-3 hover:text-fg disabled:hover:text-fg-3",
                          )}
                        >
                          <span className={cn("grid size-5 place-items-center rounded-full text-[0.625rem]", i <= step ? "bg-cyan text-[#06222a]" : "border border-line-strong")}>{i + 1}</span>
                          {label}
                        </button>
                        {i < FORM_STEPS.length - 1 && <span className="h-px w-5 bg-line-strong" />}
                      </li>
                    ))}
                  </ol>
                )}
                <Button variant="ghost" size="icon" onClick={close} aria-label="Fechar o editor">
                  <X />
                </Button>
              </div>
            </header>

            <main className="relative mx-auto max-w-6xl px-4 pt-6 pb-32 md:px-8 md:pt-10">
              {unsupported ? (
                <div className="mx-auto max-w-lg rounded-[26px] border border-line bg-surface p-6 text-center">
                  <p className="font-display text-xl font-bold">Navegador sem suporte</p>
                  <p className="mt-2 text-sm text-fg-2">{unsupported}</p>
                </div>
              ) : stage === "form" ? (
                <>
                  <div className="mb-6 md:mb-8">
                    <p className="text-xs font-semibold tracking-[0.2em] text-cyan uppercase md:hidden">
                      Etapa {step + 1} de 3 · {FORM_STEPS[step]}
                    </p>
                    <h2 className="mt-1 font-display text-3xl font-extrabold text-balance text-fg md:text-4xl">
                      {step === 0 ? (
                        <>
                          Envie o vídeo. <span className="font-serif font-normal text-gold italic">A IA edita.</span>
                        </>
                      ) : step === 1 ? (
                        <>
                          Escolha o <span className="font-serif font-normal text-gold italic">tom</span> e as telas.
                        </>
                      ) : (
                        <>
                          Últimos <span className="font-serif font-normal text-gold italic">detalhes</span>.
                        </>
                      )}
                    </h2>
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.div key={step} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
                      {step === 0 && <StepUpload video={video} onPick={onPick} opts={opts} update={update} />}
                      {step === 1 && <StepStyle opts={opts} update={update} video={video} />}
                      {step === 2 && <StepDetails opts={opts} update={update} aiReady={aiReady} />}
                    </motion.div>
                  </AnimatePresence>
                </>
              ) : stage === "working" ? (
                <WorkingView steps={steps} previewHost={previewHost} thumb={thumb} onCancel={() => abortRef.current?.abort()} gesture={gesture} />
              ) : stage === "done" && analysis && plan ? (
                <ResultView
                  outputs={outputs}
                  analysis={analysis}
                  plan={plan}
                  thumb={thumb}
                  framing={opts.framing}
                  onFraming={(ratio: Ratio, v) => update({ framing: { ...opts.framing, [ratio]: v } })}
                  onSegments={(segments: Segment[]) => {
                    const a = { ...analysis, segments, review: analysis.review ? { ...analysis.review, segments } : null };
                    setAnalysis(a);
                    if (cache.current) cache.current = { ...cache.current, analysis: a };
                  }}
                  onDownload={download}
                  onRerender={() => start(true)}
                  onOptions={() => {
                    setStage("form");
                    setStep(1);
                  }}
                  onNew={reset}
                />
              ) : (
                <div className="mx-auto max-w-lg rounded-[26px] border border-destructive/40 bg-destructive/[0.06] p-6 text-center">
                  <p className="font-display text-xl font-bold">A edição parou</p>
                  <p className="mt-2 text-sm text-fg-2">{error}</p>
                  <div className="mt-5 flex justify-center gap-2">
                    <Button variant="gold" onClick={() => start(Boolean(cache.current))}>
                      Tentar de novo
                    </Button>
                    <Button variant="ghost" onClick={() => setStage("form")}>
                      Voltar
                    </Button>
                  </div>
                </div>
              )}
            </main>

            {stage === "form" && !unsupported && (
              <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-canvas/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-8">
                  <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className={cn(step === 0 && "invisible")}>
                    <ArrowLeft /> Voltar
                  </Button>
                  {step < 2 ? (
                    <Button variant="gold" size="lg" disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
                      Continuar <ArrowRight />
                    </Button>
                  ) : (
                    <Button variant="gold" size="lg" pulse disabled={!video} onClick={() => start(Boolean(cache.current && analysis))}>
                      <Sparkles /> Editar meu vídeo
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
