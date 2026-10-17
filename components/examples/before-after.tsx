"use client";

import * as React from "react";
import { animate, motion, useInView, useMotionValue, useMotionValueEvent, useReducedMotion, useTransform } from "motion/react";
import { ChevronsLeftRight } from "lucide-react";
import { ExampleScene } from "@/components/examples/example-scene";
import type { Example } from "@/content/exemplos";
import { cn } from "@/lib/utils";

/**
 * Comparação antes/depois arrastável (mouse, toque e teclado).
 * O "antes" fica à esquerda, recortado até a posição do divisor.
 */
export function BeforeAfter({
  example,
  className,
  playing = true,
  hint = true,
}: {
  example: Example;
  className?: string;
  playing?: boolean;
  hint?: boolean;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const pos = useMotionValue(50);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const dragging = React.useRef(false);
  const [value, setValue] = React.useState(50);

  const clip = useTransform(pos, (p) => `inset(0 ${100 - p}% 0 0)`);
  const left = useTransform(pos, (p) => `${p}%`);
  useMotionValueEvent(pos, "change", (p) => setValue(Math.round(p)));

  // Dica: o divisor passeia uma vez quando o card aparece
  React.useEffect(() => {
    if (!inView || !hint || reduce) return;
    const controls = animate(pos, [50, 74, 30, 50], { duration: 2.2, ease: "easeInOut", delay: 0.3 });
    return () => controls.stop();
  }, [inView, hint, reduce, pos]);

  const setFromClient = (clientX: number) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    pos.set(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)));
  };

  return (
    <div
      ref={ref}
      className={cn("relative touch-pan-y overflow-hidden select-none", className)}
      onPointerDown={(e) => {
        dragging.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        pos.stop();
        setFromClient(e.clientX);
      }}
      onPointerMove={(e) => dragging.current && setFromClient(e.clientX)}
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
    >
      <ExampleScene example={example} variant="after" playing={playing} />
      <motion.div className="absolute inset-0" style={{ clipPath: clip }}>
        <ExampleScene example={example} variant="before" playing={playing} />
      </motion.div>

      <span className="pointer-events-none absolute top-8 left-3 rounded-full bg-black/55 px-2 py-0.5 text-[0.5625rem] font-bold tracking-[0.14em] text-white/85 uppercase backdrop-blur">
        Antes
      </span>
      <span className="pointer-events-none absolute top-8 right-3 rounded-full bg-cyan/90 px-2 py-0.5 text-[0.5625rem] font-bold tracking-[0.14em] text-[#06222a] uppercase">
        Depois
      </span>

      <motion.div className="pointer-events-none absolute inset-y-0 w-0" style={{ left }}>
        <span className="absolute inset-y-0 -left-px w-0.5 bg-white shadow-[0_0_12px_var(--cyan),0_0_2px_#fff]" />
        <button
          type="button"
          role="slider"
          aria-label="Comparar antes e depois"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={value}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") pos.set(Math.max(0, pos.get() - 5));
            if (e.key === "ArrowRight") pos.set(Math.min(100, pos.get() + 5));
          }}
          className="pointer-events-auto absolute top-1/2 left-0 grid size-9 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize place-items-center rounded-full border border-white/60 bg-black/40 text-white shadow-[0_0_18px_-2px_var(--cyan)] backdrop-blur outline-none focus-visible:ring-2 focus-visible:ring-cyan"
        >
          <ChevronsLeftRight className="size-4" />
        </button>
      </motion.div>
    </div>
  );
}
