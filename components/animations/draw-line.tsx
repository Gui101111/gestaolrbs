"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/** Linha dourada que se desenha da esquerda para a direita ao entrar na tela. */
export function DrawLine({ className, delay = 0, vertical = false }: { className?: string; delay?: number; vertical?: boolean }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      aria-hidden
      className={cn(vertical ? "hairline-v" : "hairline", vertical ? "origin-top" : "origin-left", className)}
      initial={reduce ? { opacity: 0 } : vertical ? { scaleY: 0 } : { scaleX: 0 }}
      whileInView={reduce ? { opacity: 1 } : vertical ? { scaleY: 1 } : { scaleX: 1 }}
      viewport={{ once: true, amount: 0.8 }}
      transition={{ duration: 1.6, delay, ease: [0.22, 1, 0.36, 1] }}
    />
  );
}
