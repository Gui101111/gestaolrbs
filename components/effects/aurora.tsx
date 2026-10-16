"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Blob = { color: string; size: string; top: string; left: string; o: number; depth: number };

/** Manchas de cor por variante: posição, tamanho, opacidade e profundidade do parallax. */
const VARIANTS: Record<"hero" | "app" | "subtle" | "statue", Blob[]> = {
  hero: [
    { color: "var(--gold)", size: "46rem", top: "8%", left: "48%", o: 0.34, depth: 26 },
    { color: "var(--cyan)", size: "38rem", top: "-18%", left: "6%", o: 0.26, depth: -18 },
    { color: "var(--azure)", size: "34rem", top: "44%", left: "-10%", o: 0.24, depth: 14 },
    { color: "var(--violet)", size: "28rem", top: "-10%", left: "72%", o: 0.14, depth: -10 },
  ],
  app: [
    { color: "var(--cyan)", size: "34rem", top: "-30%", left: "18%", o: 0.3, depth: 16 },
    { color: "var(--azure)", size: "30rem", top: "-26%", left: "46%", o: 0.32, depth: -14 },
    { color: "var(--violet)", size: "26rem", top: "-34%", left: "64%", o: 0.2, depth: 10 },
    { color: "var(--gold)", size: "22rem", top: "-6%", left: "78%", o: 0.16, depth: -8 },
  ],
  subtle: [
    { color: "var(--cyan)", size: "30rem", top: "-20%", left: "-6%", o: 0.16, depth: 10 },
    { color: "var(--gold)", size: "26rem", top: "40%", left: "70%", o: 0.14, depth: -10 },
    { color: "var(--azure)", size: "24rem", top: "60%", left: "20%", o: 0.12, depth: 8 },
  ],
  statue: [
    { color: "var(--gold)", size: "30rem", top: "10%", left: "20%", o: 0.42, depth: 18 },
    { color: "var(--cyan)", size: "24rem", top: "40%", left: "50%", o: 0.24, depth: -14 },
  ],
};

/**
 * Elemento-assinatura do Grafite Neon: 3 ou 4 manchas desfocadas que flutuam
 * devagar (30 a 45 s por ciclo) e reagem levemente ao mouse. Só CSS: o JS
 * apenas atualiza duas variáveis de posição com o ponteiro.
 */
export function Aurora({
  variant = "hero",
  className,
  interactive = true,
}: {
  variant?: keyof typeof VARIANTS;
  className?: string;
  interactive?: boolean;
}) {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || !interactive) return;
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduce) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty("--px", ((e.clientX / window.innerWidth) * 2 - 1).toFixed(3));
        el.style.setProperty("--py", ((e.clientY / window.innerHeight) * 2 - 1).toFixed(3));
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, [interactive]);

  return (
    <div ref={ref} aria-hidden className={cn("aurora", className)}>
      {VARIANTS[variant].map((b, i) => (
        <span
          key={i}
          className={`aurora__blob aurora__blob--${(i % 4) + 1}`}
          style={
            {
              background: `radial-gradient(circle at center, ${b.color}, transparent 68%)`,
              width: b.size,
              height: b.size,
              top: b.top,
              left: b.left,
              "--o": b.o,
              "--depth": `${b.depth}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
