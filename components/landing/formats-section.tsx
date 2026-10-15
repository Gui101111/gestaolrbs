"use client";

import * as React from "react";
import Image from "next/image";
import { motion, useInView, useReducedMotion } from "motion/react";
import { SectionHeading } from "@/components/landing/section-heading";
import { Reveal } from "@/components/animations/reveal";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

const FORMATS = [
  { r: "9:16", w: 9, h: 16, title: "Vertical", platforms: ["Instagram Reels", "TikTok", "YouTube Shorts", "Stories", "Meta Ads"] },
  { r: "1:1", w: 1, h: 1, title: "Quadrado", platforms: ["Feed do Instagram", "Facebook", "LinkedIn", "Meta Ads"] },
  { r: "4:5", w: 4, h: 5, title: "Retrato", platforms: ["Feed do Instagram", "Meta Ads"] },
  { r: "16:9", w: 16, h: 9, title: "Horizontal", platforms: ["YouTube", "LinkedIn", "Site do escritório"] },
];

export function FormatsSection() {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.4 });
  const reduce = useReducedMotion();
  const [i, setI] = React.useState(0);
  const [hold, setHold] = React.useState(false);
  const f = FORMATS[i];

  React.useEffect(() => {
    if (!inView || hold || reduce) return;
    const t = window.setInterval(() => setI((v) => (v + 1) % FORMATS.length), 2600);
    return () => window.clearInterval(t);
  }, [inView, hold, reduce]);

  // Caixa de 320px no maior lado
  const max = 320;
  const scale = max / Math.max(f.w, f.h);
  const width = f.w * scale;
  const height = f.h * scale;

  return (
    <section id="formatos" className="relative overflow-hidden bg-ink-2 py-28 md:py-40">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gold-lines opacity-40 [mask-image:radial-gradient(ellipse_at_center,#000,transparent_70%)]" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-6 md:px-10 lg:grid-cols-2">
        <div>
          <SectionHeading
            eyebrow="Formatos"
            title="Um vídeo."
            highlight="Todas as telas."
            description="Escolha onde vai publicar e receba cada versão reenquadrada, mantendo você no centro da imagem."
          />
          <Reveal delay={0.2}>
            <div className="mt-10 grid grid-cols-2 gap-3" onMouseLeave={() => setHold(false)}>
              {FORMATS.map((fmt, idx) => (
                <button
                  key={fmt.r}
                  type="button"
                  onClick={() => {
                    setI(idx);
                    setHold(true);
                  }}
                  onMouseEnter={() => {
                    setI(idx);
                    setHold(true);
                  }}
                  className={cn(
                    "rounded-2xl border p-4 text-left transition-all duration-500",
                    idx === i ? "border-gold/50 bg-gold/[0.07] shadow-[0_0_30px_-12px_rgba(198,161,91,0.7)]" : "border-white/[0.07] hover:border-white/15",
                  )}
                >
                  <span className="flex items-center justify-between">
                    <span className="font-display text-2xl text-ivory">{fmt.r}</span>
                    <span className="text-[0.6875rem] tracking-[0.18em] text-gold uppercase">{fmt.title}</span>
                  </span>
                  <span className="mt-2 block text-xs leading-relaxed text-mist">{fmt.platforms.join(" · ")}</span>
                </button>
              ))}
            </div>
          </Reveal>
        </div>

        <div ref={ref} className="relative flex h-[380px] items-center justify-center md:h-[420px]">
          <div aria-hidden className="absolute size-[340px] rounded-full border border-dashed border-gold/15 animate-spin-slow" />
          <motion.div
            className="relative overflow-hidden rounded-2xl border border-gold/50 shadow-[0_0_0_1px_rgba(198,161,91,0.15),0_0_60px_-10px_rgba(198,161,91,0.45)]"
            animate={{ width, height }}
            transition={{ duration: 1.1, ease: EASE }}
          >
            <Image src="/media/justica-busto.webp" alt="" fill sizes="400px" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            {["top-2 left-2 border-t border-l", "top-2 right-2 border-t border-r", "bottom-2 left-2 border-b border-l", "bottom-2 right-2 border-b border-r"].map((c) => (
              <span key={c} className={cn("absolute size-4 border-gold-light", c)} />
            ))}
            <motion.span
              key={f.r}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-gold/40 bg-black/60 px-3 py-1 font-mono text-xs text-gold-light backdrop-blur"
            >
              {f.r}
            </motion.span>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
