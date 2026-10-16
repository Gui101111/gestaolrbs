"use client";

import * as React from "react";
import { motion, useMotionTemplate, useMotionValue, useSpring } from "motion/react";
import { useFinePointer, usePrefersReducedMotion } from "@/hooks/use-media-query";

/** Spotlight dourado bem fraco que segue o cursor (somente desktop). */
export function CursorSpotlight() {
  const fine = useFinePointer();
  const reduce = usePrefersReducedMotion();
  const x = useMotionValue(-1000);
  const y = useMotionValue(-1000);
  const sx = useSpring(x, { stiffness: 90, damping: 22, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 90, damping: 22, mass: 0.6 });
  const bg = useMotionTemplate`radial-gradient(520px circle at ${sx}px ${sy}px, color-mix(in oklab, var(--cyan) 6%, transparent), transparent 65%)`;

  React.useEffect(() => {
    if (!fine || reduce) return;
    const onMove = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [fine, reduce, x, y]);

  if (!fine || reduce) return null;
  return <motion.div aria-hidden className="pointer-events-none fixed inset-0 z-[1]" style={{ background: bg }} />;
}
