"use client";

import * as React from "react";
import { useMotionValue, useReducedMotion, useSpring } from "motion/react";

/**
 * Inclinação 3D leve seguindo o cursor, para elementos `motion`
 * (espalhe `style` e os handlers). Em toque e com movimento reduzido
 * o card fica parado.
 */
export function useTilt(max = 3) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(x, { stiffness: 160, damping: 20 });
  const rotateY = useSpring(y, { stiffness: 160, damping: 20 });

  const onPointerMove = React.useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (e.pointerType !== "mouse" || reduce) return;
      const r = e.currentTarget.getBoundingClientRect();
      x.set((0.5 - (e.clientY - r.top) / r.height) * 2 * max);
      y.set(((e.clientX - r.left) / r.width - 0.5) * 2 * max);
    },
    [reduce, max, x, y],
  );
  const onPointerLeave = React.useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  return { style: { rotateX, rotateY, transformPerspective: 1000 }, onPointerMove, onPointerLeave };
}
