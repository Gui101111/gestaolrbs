"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, ChevronDown, Cloud, CloudOff, Loader2, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Aurora } from "@/components/effects/aurora";
import { StepSend } from "@/components/new-video/step-send";
import { StepStyle } from "@/components/new-video/step-style";
import { StepDetails } from "@/components/new-video/step-details";
import { SummaryPanel } from "@/components/new-video/summary-panel";
import { SuccessOverlay } from "@/components/new-video/success-overlay";
import { toPatch, type Draft, type DraftVideo } from "@/components/new-video/types";
import type { UploadedVideo } from "@/components/upload/video-uploader";
import {
  createDraftAction,
  registerFileAction,
  removeOriginalAction,
  saveDraftAction,
  setThumbnailAction,
  submitProjectAction,
} from "@/lib/actions/projects";
import { createClient } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/routes";
import { cn, safeFileName } from "@/lib/utils";
import { notifyEditingQueued } from "@/components/editing/browser-runner";

const EASE = [0.22, 1, 0.36, 1] as const;

const STEPS = [
  { key: "enviar", label: "Enviar", title: "Envie a gravação" },
  { key: "estilo", label: "Estilo e formato", title: "Estilo e formato" },
  { key: "detalhes", label: "Detalhes", title: "Detalhes" },
] as const;

type SaveState = "idle" | "saving" | "saved" | "error";

export type NewVideoProps = {
  userId: string;
  initial: Draft;
  video: DraftVideo | null;
  tip: string | null;
  limits: { maxBytes: number; maxDurationSec: number | null; allowedRatios: string[] };
  billing: { active: boolean; planName: string | null; remaining: number | null };
  brand: { hasLogo: boolean; whatsapp: string | null; instagram: string | null; website: string | null };
};

/** Novo vídeo em 3 passos, em tela cheia sobre o app, com resumo ao vivo. */
export function NewVideoFlow({ userId, initial, video: initialVideo, tip, limits, billing, brand }: NewVideoProps) {
  const router = useRouter();
  const [d, setD] = React.useState<Draft>(initial);
  const [video, setVideo] = React.useState<DraftVideo | null>(initialVideo);
  const [step, setStep] = React.useState(Math.min(Math.max(initial.step, 1), STEPS.length) - 1);
  const [dir, setDir] = React.useState(1);
  const [save, setSave] = React.useState<SaveState>("idle");
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [showSummary, setShowSummary] = React.useState(false);
  const idRef = React.useRef<string | null>(initial.id);
  const debounce = React.useRef<number | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const persist = React.useCallback(async (draft: Draft, wizardStep?: number) => {
    const id = idRef.current;
    if (!id) return true;
    setSave("saving");
    const res = await saveDraftAction(id, toPatch(draft, wizardStep));
    setSave(res.ok ? "saved" : "error");
    if (!res.ok) toast.error(res.error);
    return res.ok;
  }, []);

  const update = (patch: Partial<Draft>) =>
    setD((prev) => {
      const next = { ...prev, ...patch };
      if (idRef.current) {
        if (debounce.current) window.clearTimeout(debounce.current);
        debounce.current = window.setTimeout(() => void persist(next), 800);
      }
      return next;
    });

  React.useEffect(
    () => () => {
      if (debounce.current) window.clearTimeout(debounce.current);
    },
    [],
  );

  // Esc fecha (volta ao app)
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector("[role=dialog],[role=listbox],[role=menu]")) router.push(ROUTES.app);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  // ------------------------------------------------------------ upload
  const ensurePath = async (file: File) => {
    let id = idRef.current;
    if (!id) {
      const base = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim().slice(0, 80);
      const name = d.name && d.name !== "Novo vídeo" ? d.name : base || "Novo vídeo";
      const res = await createDraftAction({ name, folderId: d.folder_id });
      if (!res.ok) {
        toast.error(res.error);
        return null;
      }
      id = res.data.id;
      idRef.current = id;
      const next = { ...d, id, name };
      setD(next);
      window.history.replaceState(null, "", `${ROUTES.newVideo}?id=${id}`);
      await saveDraftAction(id, toPatch(next, step + 1));
    }
    return `${userId}/${id}/${Date.now()}-${safeFileName(file.name)}`;
  };

  const onUploaded = async (v: UploadedVideo) => {
    const id = idRef.current;
    if (!id) return;
    const res = await registerFileAction({
      projectId: id,
      path: v.path,
      fileName: v.fileName,
      mimeType: v.mimeType,
      sizeBytes: v.sizeBytes,
      durationSec: v.durationSec,
      width: v.width,
      height: v.height,
      kind: "original",
    });
    if (!res.ok) return void toast.error(res.error);
    let thumbnailUrl: string | null = null;
    if (v.thumbnail) {
      const path = `${userId}/${id}/thumb-${Date.now()}.jpg`;
      const { error } = await createClient().storage.from("thumbnails").upload(path, v.thumbnail, { contentType: "image/jpeg", upsert: true });
      if (!error) {
        await setThumbnailAction(id, path);
        thumbnailUrl = URL.createObjectURL(v.thumbnail);
      }
    }
    setVideo({ fileName: v.fileName, sizeBytes: v.sizeBytes, durationSec: v.durationSec, width: v.width, height: v.height, previewUrl: v.previewUrl, thumbnailUrl });
    toast.success("Vídeo enviado.");
  };

  const onRemove = async () => {
    if (!idRef.current) return;
    const res = await removeOriginalAction(idRef.current);
    if (!res.ok) return void toast.error(res.error);
    setVideo(null);
  };

  // ------------------------------------------------------------ navegação
  const valid = [
    Boolean(video) && d.name.trim().length > 0 && Boolean(d.legal_area),
    Boolean(d.editing_style) && d.aspect_ratios.length > 0,
    d.instructions.length <= 1000,
  ];
  const canSubmit = valid.every(Boolean) && d.rights_confirmed && billing.active && billing.remaining !== 0;

  const goTo = async (target: number) => {
    if (target === step || target < 0 || target >= STEPS.length) return;
    if (target > step && !valid.slice(0, target).every(Boolean)) return;
    setDir(target > step ? 1 : -1);
    setStep(target);
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    if (debounce.current) window.clearTimeout(debounce.current);
    await persist(d, target + 1);
  };

  const submit = async () => {
    const id = idRef.current;
    if (!id) return;
    setSubmitting(true);
    if (debounce.current) window.clearTimeout(debounce.current);
    const ok = await persist(d, STEPS.length);
    if (!ok) return setSubmitting(false);
    window.history.replaceState(null, "", `${ROUTES.newVideo}?id=${id}&enviado=1`);
    const res = await submitProjectAction(id);
    if (!res.ok) {
      window.history.replaceState(null, "", `${ROUTES.newVideo}?id=${id}`);
      setSubmitting(false);
      toast.error(res.error);
      return;
    }
    setDone(true);
    notifyEditingQueued();
    window.setTimeout(() => {
      router.push(ROUTES.app);
      router.refresh();
    }, 2300);
  };

  const missing = !valid[0] ? (!video ? "Envie o vídeo" : !d.legal_area ? "Escolha a área do Direito" : "Dê um título") : !valid[1] ? (!d.editing_style ? "Escolha o estilo" : "Escolha ao menos um formato") : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-page">
      <Aurora variant="subtle" className="opacity-70" />

      {/* Topo: fechar, passos e salvamento */}
      <header className="relative z-10 flex items-center gap-3 border-b border-line px-4 py-3 md:px-6">
        <Button asChild variant="ghost" size="icon" aria-label="Fechar">
          <Link href={ROUTES.app}>
            <X />
          </Link>
        </Button>
        <p className="hidden font-display text-base font-bold text-fg sm:block">Novo vídeo</p>
        <ol className="mx-auto flex items-center gap-1.5 md:gap-3" aria-label="Passos">
          {STEPS.map((s, i) => {
            const reachable = i <= step || valid.slice(0, i).every(Boolean);
            const state = i < step ? "done" : i === step ? "active" : "todo";
            return (
              <li key={s.key} className="flex items-center gap-1.5 md:gap-3">
                {i > 0 && (
                  <span className="relative h-px w-6 overflow-hidden bg-line md:w-12">
                    <motion.span
                      className="absolute inset-0 origin-left bg-brand-gradient"
                      initial={false}
                      animate={{ scaleX: i <= step ? 1 : 0 }}
                      transition={{ duration: 0.6, ease: EASE }}
                    />
                  </span>
                )}
                <button
                  type="button"
                  disabled={!reachable || i === step}
                  onClick={() => void goTo(i)}
                  aria-current={state === "active" ? "step" : undefined}
                  className="flex items-center gap-2 rounded-full py-1 pr-1 text-sm font-semibold disabled:cursor-default"
                >
                  <span
                    className={cn(
                      "grid size-7 place-items-center rounded-full border text-xs transition-all duration-500",
                      state === "done" && "border-cyan bg-cyan text-[#06222a]",
                      state === "active" && "border-cyan text-cyan shadow-[var(--glow-cyan)]",
                      state === "todo" && "border-line-strong text-fg-3",
                    )}
                  >
                    {state === "done" ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
                  </span>
                  <span className={cn("hidden md:inline", state === "todo" ? "text-fg-3" : "text-fg")}>{s.label}</span>
                </button>
              </li>
            );
          })}
        </ol>
        <SaveIndicator state={save} hasId={Boolean(d.id)} />
      </header>

      {/* Conteúdo + resumo */}
      <div ref={scrollRef} className="relative flex-1 overflow-y-auto" data-lenis-prevent>
        <div className="mx-auto grid max-w-[1240px] gap-6 px-4 pt-6 pb-36 md:px-6 lg:grid-cols-[1fr_320px] lg:gap-8 lg:pt-10">
          <div className="min-w-0">
            {/* Resumo recolhível no celular */}
            <div className="mb-5 lg:hidden">
              <button
                type="button"
                onClick={() => setShowSummary((v) => !v)}
                aria-expanded={showSummary}
                className="glass flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold text-fg"
              >
                Resumo
                <ChevronDown className={cn("size-4 transition-transform duration-300", showSummary && "rotate-180")} />
              </button>
              <AnimatePresence initial={false}>
                {showSummary && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <SummaryPanel d={d} video={video} className="mt-2" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <AnimatePresence mode="wait" custom={dir}>
              <motion.section
                key={STEPS[step].key}
                initial={{ opacity: 0, x: dir * 28, filter: "blur(6px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)", transitionEnd: { filter: "none" } }}
                exit={{ opacity: 0, x: dir * -28, filter: "blur(6px)" }}
                transition={{ duration: 0.45, ease: EASE }}
                aria-labelledby="passo-titulo"
              >
                <h1 id="passo-titulo" className="mb-6 text-3xl text-fg md:text-4xl">
                  {STEPS[step].title}
                </h1>
                {step === 0 && (
                  <StepSend d={d} update={update} video={video} limits={limits} tip={tip} ensurePath={ensurePath} onUploaded={onUploaded} onRemove={onRemove} />
                )}
                {step === 1 && <StepStyle d={d} update={update} video={video} allowedRatios={limits.allowedRatios} />}
                {step === 2 && <StepDetails d={d} update={update} brand={brand} />}
              </motion.section>
            </AnimatePresence>
          </div>

          <div className="hidden lg:block">
            <div className="sticky top-6">
              <SummaryPanel d={d} video={video} />
            </div>
          </div>
        </div>
      </div>

      {/* Rodapé fixo */}
      <footer className="glass-strong relative z-10 border-x-0 border-b-0 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] md:px-6">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-3">
          {step === STEPS.length - 1 ? (
            <label htmlFor="rights" className="flex min-w-0 flex-1 cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-fg-2 md:items-center md:text-sm">
              <Checkbox id="rights" checked={d.rights_confirmed} onCheckedChange={(v) => update({ rights_confirmed: v === true })} className="mt-0.5 md:mt-0" />
              Tenho direito de uso da imagem e do conteúdo, que segue as normas éticas da advocacia.
            </label>
          ) : (
            <p className="min-w-0 flex-1 truncate text-sm text-fg-3">{missing ?? `Passo ${step + 1} de ${STEPS.length}`}</p>
          )}
          <div className="ml-auto flex items-center gap-2">
            {step > 0 && (
              <Button variant="ghost" onClick={() => void goTo(step - 1)} disabled={submitting}>
                <ArrowLeft /> <span className="hidden sm:inline">Voltar</span>
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button variant="gold" size="lg" onClick={() => void goTo(step + 1)} disabled={!valid[step]}>
                Continuar <ArrowRight />
              </Button>
            ) : billing.active && billing.remaining !== 0 ? (
              <Button variant="gold" size="lg" pulse={canSubmit} onClick={() => void submit()} loading={submitting} disabled={!canSubmit}>
                Enviar para edição {!submitting && <Send />}
              </Button>
            ) : (
              <Button asChild variant="gold" size="lg">
                <Link href={ROUTES.billing}>{billing.active ? "Limite do plano atingido" : "Ver planos"}</Link>
              </Button>
            )}
          </div>
        </div>
        {step === STEPS.length - 1 && billing.active && billing.remaining != null && billing.remaining > 0 && (
          <p className="mx-auto mt-2 max-w-[1240px] text-xs text-fg-3">
            Este envio usa 1 dos {billing.remaining} vídeos restantes no ciclo.
          </p>
        )}
      </footer>

      <AnimatePresence>{done && <SuccessOverlay />}</AnimatePresence>
    </div>
  );
}

function SaveIndicator({ state, hasId }: { state: SaveState; hasId: boolean }) {
  if (!hasId) return <span className="hidden w-28 text-right text-xs text-fg-3 md:block">Salva ao enviar</span>;
  return (
    <span className="flex w-28 items-center justify-end gap-1.5 text-xs text-fg-3" aria-live="polite">
      {state === "saving" ? (
        <>
          <Loader2 className="size-3.5 animate-spin" /> <span className="hidden md:inline">Salvando…</span>
        </>
      ) : state === "error" ? (
        <>
          <CloudOff className="size-3.5 text-destructive" /> <span className="hidden md:inline">Não salvo</span>
        </>
      ) : (
        <>
          <Cloud className="size-3.5 text-cyan" /> <span className="hidden md:inline">Salvo</span>
        </>
      )}
    </span>
  );
}
