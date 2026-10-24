"use client";

import { MotionConfig } from "motion/react";

/**
 * Respeita prefers-reduced-motion globalmente: transformações e layout ficam instantâneos,
 * mantendo apenas transições de opacidade. Evita bifurcar a renderização entre servidor e cliente.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
