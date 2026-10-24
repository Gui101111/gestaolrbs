"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

/** Linha neon fina que se desenha do centro para as pontas quando entra na tela. */
export function NeonDivider({ className, vertical = false }: { className?: string; vertical?: boolean }) {
  return (
    <motion.div
      aria-hidden
      initial={{ [vertical ? "scaleY" : "scaleX"]: 0, opacity: 0 }}
      whileInView={{ [vertical ? "scaleY" : "scaleX"]: 1, opacity: 1 }}
      viewport={{ once: true, amount: 1 }}
      transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn(vertical ? "neon-line-v" : "neon-line", className)}
    />
  );
}
