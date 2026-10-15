"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

/** Linha dourada que se desenha da esquerda para a direita ao entrar na tela. */
export function DrawLine({ className, delay = 0, vertical = false }: { className?: string; delay?: number; vertical?: boolean }) {
  return (
    <motion.div
      aria-hidden
      className={cn(vertical ? "hairline-v" : "hairline", vertical ? "origin-top" : "origin-left", className)}
      initial={vertical ? { scaleY: 0 } : { scaleX: 0 }}
      whileInView={vertical ? { scaleY: 1 } : { scaleX: 1 }}
      viewport={{ once: true, amount: 0.8 }}
      transition={{ duration: 1.6, delay, ease: [0.22, 1, 0.36, 1] }}
    />
  );
}
