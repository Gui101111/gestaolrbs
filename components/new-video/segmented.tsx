"use client";

import { motion } from "motion/react";
import type { Answer } from "@/lib/constants/questions";
import { cn } from "@/lib/utils";

const OPTIONS: { value: Answer; label: string }[] = [
  { value: "sim", label: "Sim" },
  { value: "nao", label: "Não" },
  { value: "outro", label: "Outro" },
];

/** Controle segmentado [Sim | Não | Outro] com pílula que desliza. */
export function Segmented({ id, value, onChange, label }: { id: string; value: Answer | undefined; onChange: (v: Answer) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="relative flex shrink-0 rounded-full border border-line bg-fg/[0.04] p-0.5">
      {OPTIONS.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative z-10 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors duration-300",
              active ? (o.value === "nao" ? "text-fg" : "text-[#06222a]") : "text-fg-2 hover:text-fg",
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                className={cn(
                  "absolute inset-0 -z-10 rounded-full",
                  o.value === "nao" ? "bg-raised shadow-[inset_0_0_0_1px_var(--line-strong)]" : o.value === "sim" ? "bg-cyan shadow-[0_0_14px_-2px_var(--cyan)]" : "bg-gold shadow-[0_0_14px_-2px_var(--gold)]",
                )}
              />
            )}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
