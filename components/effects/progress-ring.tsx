"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

/** Anel de progresso neon. */
export function ProgressRing({ value, size = 44, className }: { value: number; size?: number; className?: string }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span className={cn("relative grid place-items-center", className)} style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgb(255 255 255 / 0.18)" strokeWidth="3" fill="none" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="var(--cyan)"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (c * Math.max(2, Math.min(100, value))) / 100 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          style={{ filter: "drop-shadow(0 0 4px var(--cyan))" }}
        />
      </svg>
      <span className="relative text-[0.625rem] font-bold text-white tabular-nums">{Math.round(value)}%</span>
    </span>
  );
}
