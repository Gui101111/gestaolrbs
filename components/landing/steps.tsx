"use client";

import { motion } from "motion/react";
import { Download, Scissors, Upload } from "lucide-react";
import { AnimatedText } from "@/components/animations/animated-text";
import { Aurora } from "@/components/effects/aurora";
import { onSpotlightMove } from "@/components/effects/spotlight";
import { accentSegments } from "@/components/shared/accent-text";
import { landing } from "@/content/landing";

const EASE = [0.22, 1, 0.36, 1] as const;
const ICONS = { upload: Upload, scissors: Scissors, download: Download } as const;
const GLOWS = ["var(--cyan)", "var(--azure)", "var(--gold)"];

/** Bloco 2: os três passos (Envie → a TRIBUNA corta e legenda → Baixe e publique). */
export function Steps() {
  const s = landing.steps;
  return (
    <section id="como-funciona" data-accent="cyan" className="relative scroll-mt-24 px-3 py-16 md:px-5 md:py-24" aria-label="Como funciona">
      <div className="relative mx-auto max-w-6xl">
        <Aurora variant="subtle" interactive={false} className="opacity-70" />
        <div className="relative text-center">
          <p className="eyebrow">{s.eyebrow}</p>
          <AnimatedText
            as="h2"
            className="mx-auto mt-3 max-w-2xl text-4xl leading-[1.05] font-extrabold text-balance text-fg md:text-6xl"
            segments={accentSegments(s.title)}
          />
        </div>

        <div className="relative mt-12 md:mt-16">
          {/* Linha neon que liga os passos (desktop) */}
          <motion.span
            aria-hidden
            className="absolute top-16 right-[16%] left-[16%] hidden h-px origin-left bg-brand-gradient shadow-[0_0_12px_var(--cyan)] md:block"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 1.4, ease: EASE, delay: 0.3 }}
          />
          <ol className="relative grid gap-4 md:grid-cols-3 md:gap-6">
            {s.items.map((item, i) => {
              const Icon = ICONS[item.icon];
              return (
                <motion.li
                  key={item.title}
                  initial={{ opacity: 0, y: 28, filter: "blur(10px)" }}
                  whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.9, ease: EASE, delay: i * 0.15 }}
                  onPointerMove={onSpotlightMove}
                  className="spotlight glass group relative overflow-hidden rounded-[26px] p-6 text-center md:p-8"
                >
                  <span
                    className="relative mx-auto grid size-16 place-items-center rounded-2xl border bg-canvas/60 transition-transform duration-500 group-hover:scale-110"
                    style={{ borderColor: `color-mix(in oklab, ${GLOWS[i]} 55%, transparent)`, boxShadow: `0 0 28px -6px ${GLOWS[i]}`, color: GLOWS[i] }}
                  >
                    <Icon className="size-7" />
                    <span className="absolute -top-2 -right-2 grid size-7 place-items-center rounded-full bg-[linear-gradient(135deg,#f7d898,#f2c46d_45%,#c99a3b)] text-xs font-extrabold text-[#1a1306]">
                      {i + 1}
                    </span>
                  </span>
                  <h3 className="mt-6 font-display text-xl font-bold text-fg md:text-2xl">{item.title}</h3>
                  <p className="mx-auto mt-2 max-w-[16rem] text-sm leading-relaxed text-fg-2 md:text-[0.9375rem]">{item.text}</p>
                </motion.li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
