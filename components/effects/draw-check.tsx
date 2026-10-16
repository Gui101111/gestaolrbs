"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

/** Check que se desenha, com brilho neon. */
export function DrawCheck({ className, delay = 0, done = true }: { className?: string; delay?: number; done?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={cn("size-5 overflow-visible", className)}>
      <motion.path
        d="M4.5 12.5l4.8 4.8L19.5 7"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: "drop-shadow(0 0 4px currentColor)" }}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={done ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
        transition={{ pathLength: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }, opacity: { duration: 0.2, delay } }}
      />
    </svg>
  );
}
