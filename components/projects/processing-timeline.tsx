"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  AudioWaveform,
  Captions,
  Check,
  Clapperboard,
  CloudUpload,
  FileText,
  Film,
  Layers,
  Route,
  ScanSearch,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PIPELINE_STEPS, progressForStep, stepIndex } from "@/lib/constants/domain";
import { cn } from "@/lib/utils";
import type { RenderJob } from "@/types/domain";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  upload_completed: CloudUpload,
  analyzing_audio: AudioWaveform,
  transcribing: FileText,
  analyzing_content: ScanSearch,
  planning: Route,
  editing: Clapperboard,
  captioning: Captions,
  adding_elements: Layers,
  rendering: Film,
  completed: Check,
};

type JobLite = Pick<RenderJob, "id" | "status" | "progress" | "current_step" | "error_message" | "kind" | "updated_at">;

export function ProcessingTimeline({ projectId, initialJob, projectStatus }: { projectId: string; initialJob: JobLite | null; projectStatus: string }) {
  const router = useRouter();
  const [job, setJob] = React.useState<JobLite | null>(initialJob);
  const [status, setStatus] = React.useState(projectStatus);

  React.useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`project:${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "render_jobs", filter: `project_id=eq.${projectId}` }, (payload) => {
        if (payload.eventType === "DELETE") return;
        setJob(payload.new as JobLite);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "projects", filter: `id=eq.${projectId}` }, (payload) => {
        const next = (payload.new as { status: string }).status;
        setStatus(next);
        router.refresh(); // atualiza selo de status e, quando pronto, troca para o resultado
      })
      .subscribe();

    // Rede de segurança caso o Realtime esteja indisponível
    const poll = window.setInterval(async () => {
      const [{ data: j }, { data: p }] = await Promise.all([
        supabase.from("render_jobs").select("id, status, progress, current_step, error_message, kind, updated_at").eq("project_id", projectId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("projects").select("status").eq("id", projectId).single(),
      ]);
      if (j) setJob(j);
      if (p && p.status !== status) {
        setStatus(p.status);
        router.refresh();
      }
    }, 15000);

    return () => {
      window.clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [projectId, router, status]);

  const failed = status === "failed" || job?.status === "failed";
  const current = stepIndex(job?.current_step);
  const progress = Math.max(job?.progress ?? 0, progressForStep(job?.current_step) - 5, 2);

  return (
    <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12">
      <div className="lg:sticky lg:top-28 lg:self-start">
        <ProgressOrb value={failed ? progress : progress} failed={failed} />
        <div className="mt-8 text-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={failed ? "failed" : current}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="font-display text-3xl text-ivory"
            >
              {failed ? "Encontramos um problema" : (PIPELINE_STEPS[current]?.label ?? "Na fila")}
            </motion.p>
          </AnimatePresence>
          <p className="mx-auto mt-2 max-w-sm text-sm text-mist">
            {failed
              ? "O processamento foi interrompido. Nossa equipe já foi avisada — você pode aguardar a nova tentativa ou falar com o suporte."
              : status === "queued" && current === 0
                ? "Seu vídeo está na fila. Você pode fechar esta página — avisaremos por e-mail quando estiver pronto."
                : (PIPELINE_STEPS[current]?.description ?? "")}
          </p>
          {job?.kind === "revision" && !failed && <p className="mt-3 text-xs text-gold-light">Aplicando o ajuste solicitado</p>}
        </div>
      </div>

      <ol className="relative space-y-2" aria-label="Etapas do processamento">
        <span aria-hidden className="absolute top-6 bottom-6 left-[1.6rem] w-px bg-white/[0.07]" />
        <motion.span
          aria-hidden
          className="absolute top-6 left-[1.6rem] w-px origin-top bg-gradient-to-b from-gold-light via-gold to-gold/20"
          initial={false}
          animate={{ height: `calc(${(current / (PIPELINE_STEPS.length - 1)) * 100}% - ${(current / (PIPELINE_STEPS.length - 1)) * 3}rem)` }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />
        {PIPELINE_STEPS.map((s, i) => {
          const Icon = ICONS[s.value] ?? Check;
          const state = failed && i === current ? "error" : i < current || (i === current && s.value === "completed") ? "done" : i === current ? "active" : "pending";
          return (
            <motion.li
              key={s.value}
              initial={{ opacity: 0, x: 14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05, duration: 0.6 }}
              className={cn(
                "relative flex items-center gap-4 rounded-2xl border px-3 py-3 transition-colors duration-700",
                state === "active" ? "border-gold/30 bg-gold/[0.05]" : state === "error" ? "border-destructive/40 bg-destructive/[0.06]" : "border-transparent",
              )}
            >
              <span
                className={cn(
                  "relative z-10 grid size-[2.2rem] shrink-0 place-items-center rounded-full border transition-all duration-700",
                  state === "done" && "border-gold/60 bg-gold text-ink",
                  state === "active" && "border-gold bg-ink text-gold-light shadow-[0_0_24px_-4px_rgba(198,161,91,0.9)]",
                  state === "pending" && "border-white/10 bg-ink text-mist/50",
                  state === "error" && "border-destructive/60 bg-ink text-[#ec8a80]",
                )}
              >
                {state === "active" && <span className="absolute inset-0 animate-ping rounded-full border border-gold/50" />}
                {state === "done" ? <Check className="size-4" strokeWidth={3} /> : state === "error" ? <AlertTriangle className="size-4" /> : <Icon className="size-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm font-medium", state === "pending" ? "text-mist/60" : "text-ivory")}>{s.label}</p>
                <p className="truncate text-xs text-mist/80">{s.description}</p>
              </div>
              {state === "active" && <StepVisual step={s.value} />}
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}

function ProgressOrb({ value, failed }: { value: number; failed: boolean }) {
  const r = 88;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative mx-auto size-60">
      <div aria-hidden className={cn("absolute inset-6 rounded-full blur-3xl", failed ? "bg-destructive/20" : "bg-gold/20 animate-pulse-glow")} />
      <svg viewBox="0 0 200 200" className="relative size-full -rotate-90">
        <circle cx="100" cy="100" r={r} stroke="rgba(255,255,255,0.06)" strokeWidth="6" fill="none" />
        <circle cx="100" cy="100" r={r - 14} stroke="rgba(198,161,91,0.12)" strokeWidth="1" strokeDasharray="2 6" fill="none" />
        <motion.circle
          cx="100"
          cy="100"
          r={r}
          stroke={failed ? "#d0574d" : "url(#orb-gold)"}
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (c * value) / 100 }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        />
        <defs>
          <linearGradient id="orb-gold" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#8C6B2F" />
            <stop offset="0.5" stopColor="#F1D9A3" />
            <stop offset="1" stopColor="#C6A15B" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <p className="font-display text-6xl text-ivory tabular-nums">
            {Math.round(value)}
            <span className="text-3xl text-gold">%</span>
          </p>
          <p className="mt-1 text-[0.625rem] tracking-[0.3em] text-mist uppercase">Processamento</p>
        </div>
      </div>
    </div>
  );
}

/** Pequena animação específica de cada etapa ativa. */
function StepVisual({ step }: { step: string }) {
  if (step === "analyzing_audio" || step === "transcribing") {
    return (
      <span className="flex h-6 items-center gap-[3px]" aria-hidden>
        {[0.4, 0.9, 0.6, 1, 0.5, 0.8].map((h, i) => (
          <motion.span
            key={i}
            className="w-[3px] rounded-full bg-gold"
            animate={{ height: [`${h * 30}%`, `${h * 100}%`, `${h * 40}%`] }}
            transition={{ duration: 0.9 + i * 0.1, repeat: Infinity, repeatType: "mirror" }}
          />
        ))}
      </span>
    );
  }
  if (step === "rendering" || step === "editing") {
    return (
      <span className="relative h-1.5 w-16 overflow-hidden rounded-full bg-white/10" aria-hidden>
        <motion.span className="absolute inset-y-0 w-1/2 rounded-full bg-gold-gradient" animate={{ x: ["-100%", "200%"] }} transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }} />
      </span>
    );
  }
  return (
    <span className="flex gap-1" aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.span key={i} className="size-1.5 rounded-full bg-gold" animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} />
      ))}
    </span>
  );
}
