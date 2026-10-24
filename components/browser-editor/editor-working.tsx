"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Check, Hand, Loader2, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { StepId } from "@/lib/browser-editor/types";
import { cn } from "@/lib/utils";

export type StepState = "pending" | "active" | "done" | "skipped";
export type StepView = { state: StepState; detail?: string; value?: number };

export const STEPS: { id: StepId; label: string; weight: number }[] = [
  { id: "ler", label: "Lendo o vídeo", weight: 2 },
  { id: "audio", label: "Achando as pausas", weight: 5 },
  { id: "transcrever", label: "Transcrevendo a fala", weight: 25 },
  { id: "revisar", label: "Revisão com IA (Claude)", weight: 10 },
  { id: "enquadrar", label: "Enquadrando você", weight: 3 },
  { id: "montar", label: "Montando e gravando o vídeo", weight: 55 },
];

export function overallProgress(steps: Record<StepId, StepView>) {
  let done = 0;
  let total = 0;
  for (const s of STEPS) {
    const v = steps[s.id];
    if (v.state === "skipped") continue;
    total += s.weight;
    if (v.state === "done") done += s.weight;
    else if (v.state === "active") done += s.weight * Math.min(1, v.value ?? 0.15);
  }
  return total ? done / total : 0;
}

export function WorkingView({
  steps,
  previewHost,
  thumb,
  onCancel,
  gesture,
}: {
  steps: Record<StepId, StepView>;
  previewHost: React.RefObject<HTMLDivElement | null>;
  thumb: string | null;
  onCancel: () => void;
  gesture: (() => void) | null;
}) {
  const pct = Math.round(overallProgress(steps) * 100);
  const rendering = steps.montar.state === "active";
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
      <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-[26px] border border-line bg-[#0b0c0f] lg:max-w-none">
        <div ref={previewHost} className={cn("grid min-h-[38svh] place-items-center [&>canvas]:max-h-[62svh] [&>canvas]:w-auto [&>canvas]:max-w-full", !rendering && "hidden")} />
        {!rendering && (
          <div className="relative grid min-h-[38svh] place-items-center overflow-hidden">
            {thumb && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumb} alt="" className="absolute inset-0 size-full object-cover opacity-40 blur-[2px]" />
            )}
            <motion.div
              aria-hidden
              className="absolute inset-x-0 h-24 bg-[linear-gradient(180deg,transparent,color-mix(in_oklab,var(--cyan)_35%,transparent),transparent)]"
              animate={{ top: ["-20%", "100%"] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
            />
            <span className="relative font-display text-5xl font-extrabold text-fg tabular-nums">{pct}%</span>
          </div>
        )}
        {rendering && <span className="absolute top-3 left-3 rounded-full bg-black/60 px-2.5 py-1 text-[0.6875rem] font-semibold text-fg backdrop-blur">Prévia ao vivo</span>}
      </div>

      <div className="space-y-5">
        <div>
          <p className="font-display text-2xl font-bold text-fg">Editando seu vídeo</p>
          <p className="mt-1 text-sm text-fg-2">Mantenha esta tela aberta e o aparelho desbloqueado. Leva de alguns segundos a poucos minutos, conforme o aparelho.</p>
        </div>
        <Progress value={pct} aria-label="Progresso da edição" />
        <ol className="space-y-2">
          {STEPS.map((s) => {
            const v = steps[s.id];
            return (
              <li
                key={s.id}
                className={cn(
                  "flex items-start gap-3 rounded-2xl border px-3.5 py-3 transition-colors duration-500",
                  v.state === "active" ? "border-cyan/45 bg-cyan/[0.06]" : "border-line bg-fg/[0.02]",
                  v.state === "skipped" && "opacity-50",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full",
                    v.state === "done" && "bg-cyan text-[#06222a]",
                    v.state === "active" && "text-cyan",
                    (v.state === "pending" || v.state === "skipped") && "border border-line-strong text-fg-3",
                  )}
                >
                  {v.state === "done" ? <Check className="size-3.5" strokeWidth={3} /> : v.state === "active" ? <Loader2 className="size-4 animate-spin" /> : v.state === "skipped" ? <Minus className="size-3" /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-fg">{s.label}</span>
                  {v.detail && <span className="block text-xs text-fg-3">{v.detail}</span>}
                  {v.state === "active" && typeof v.value === "number" && <Progress value={v.value * 100} className="mt-2 h-1" />}
                </span>
              </li>
            );
          })}
        </ol>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
      </div>

      {gesture && (
        <div className="fixed inset-0 z-[95] grid place-items-center bg-black/70 p-6 backdrop-blur-sm">
          <div className="max-w-sm rounded-[26px] border border-line bg-surface p-6 text-center shadow-[var(--shadow-pop)]">
            <Hand className="mx-auto size-8 text-gold" />
            <p className="mt-3 font-display text-lg font-bold text-fg">Toque para continuar</p>
            <p className="mt-1 text-sm text-fg-2">O navegador pede um toque para tocar o vídeo enquanto gravamos a edição.</p>
            <Button variant="gold" size="lg" className="mt-5 w-full" onClick={gesture}>
              Continuar a edição
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
