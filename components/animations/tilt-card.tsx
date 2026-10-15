"use client";

import * as React from "react";
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Card com inclinação 3D leve e borda dourada que acende seguindo o cursor.
 * Em toque ou com movimento reduzido, mantém apenas o brilho estático.
 */
export function TiltCard({
  children,
  className,
  innerClassName,
  max = 6,
  glow = true,
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
  max?: number;
  glow?: boolean;
  as?: "div" | "article" | "li";
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const hovered = useMotionValue(0);
  const rx = useSpring(useTransform(py, [0, 1], [max, -max]), { stiffness: 160, damping: 20 });
  const ry = useSpring(useTransform(px, [0, 1], [-max, max]), { stiffness: 160, damping: 20 });
  const glowOpacity = useSpring(hovered, { stiffness: 120, damping: 20 });
  const mx = useTransform(px, (v) => `${v * 100}%`);
  const my = useTransform(py, (v) => `${v * 100}%`);
  const borderBg = useMotionTemplate`radial-gradient(420px circle at ${mx} ${my}, rgba(225,196,135,0.75), rgba(198,161,91,0.12) 40%, transparent 70%)`;
  const surfaceBg = useMotionTemplate`radial-gradient(520px circle at ${mx} ${my}, rgba(198,161,91,0.10), transparent 60%)`;

  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
    hovered.set(1);
  };
  const onLeave = () => {
    px.set(0.5);
    py.set(0.5);
    hovered.set(0);
  };

  const Comp = motion[as] as typeof motion.div;

  return (
    <Comp
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={reduce ? undefined : { rotateX: rx, rotateY: ry, transformPerspective: 1000 }}
      className={cn("group/tilt relative rounded-2xl will-change-transform", className)}
    >
      {glow && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -inset-px rounded-[inherit] p-px [mask-composite:exclude] [-webkit-mask-composite:xor] [mask:linear-gradient(#000_0_0)_content-box,linear-gradient(#000_0_0)]"
          style={{ background: borderBg, opacity: glowOpacity }}
        />
      )}
      <div className={cn("panel relative h-full overflow-hidden rounded-[inherit]", innerClassName)}>
        <motion.div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: surfaceBg, opacity: glowOpacity }} />
        <div className="relative h-full">{children}</div>
      </div>
    </Comp>
  );
}
