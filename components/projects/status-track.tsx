"use client";

import { motion } from "motion/react";
import { DrawCheck } from "@/components/effects/draw-check";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

const STAGES = [
  { key: "sent", label: "Enviado" },
  { key: "editing", label: "Editando" },
  { key: "ready", label: "Pronto" },
  { key: "approved", label: "Aprovado" },
] as const;

function stageIndex(status: string) {
  switch (status) {
    case "queued":
      return 0;
    case "processing":
    case "revision_requested":
      return 1;
    case "ready":
      return 2;
    case "completed":
      return 3;
    default:
      return 0;
  }
}

/** Linha do tempo de status, animada: Enviado → Editando → Pronto → Aprovado. */
export function StatusTrack({ status, className }: { status: string; className?: string }) {
  const current = stageIndex(status);
  const failed = status === "failed";
  return (
    <ol className={cn("relative grid grid-cols-4 gap-2", className)} aria-label="Status do vídeo">
      <span aria-hidden className="absolute top-3.5 right-[12.5%] left-[12.5%] h-px bg-line" />
      <motion.span
        aria-hidden
        className="absolute top-3.5 left-[12.5%] h-px origin-left bg-brand-gradient shadow-[0_0_10px_var(--cyan)]"
        initial={{ width: 0 }}
        animate={{ width: `${(current / (STAGES.length - 1)) * 75}%` }}
        transition={{ duration: 1.2, ease: EASE }}
      />
      {STAGES.map((s, i) => {
        const done = i < current || (i === current && (status === "completed" || status === "ready"));
        const active = i === current && !done;
        const label = i === 1 && status === "revision_requested" ? "Em ajuste" : s.label;
        return (
          <li key={s.key} className="relative flex flex-col items-center gap-2 text-center">
            <span
              className={cn(
                "relative grid size-7 place-items-center rounded-full border-2 bg-canvas transition-all duration-500",
                done && "border-cyan bg-cyan text-[#06222a]",
                active && !failed && "border-cyan text-cyan shadow-[var(--glow-cyan)]",
                active && failed && "border-destructive text-destructive",
                !done && !active && "border-line-strong",
              )}
            >
              {done ? <DrawCheck className="size-3.5 text-[#06222a]" delay={0.15 * i} /> : active ? <span className={cn("size-2 rounded-full", failed ? "bg-destructive" : "bg-cyan animate-pulse")} /> : null}
            </span>
            <span className={cn("text-xs font-semibold", done || active ? "text-fg" : "text-fg-3")}>{failed && active ? "Erro" : label}</span>
          </li>
        );
      })}
    </ol>
  );
}
