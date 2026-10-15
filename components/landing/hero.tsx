"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { ArrowRight, Landmark, Lock, Play, Scale, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedText } from "@/components/animations/animated-text";
import { Magnetic } from "@/components/animations/magnetic";
import { CountUp } from "@/components/animations/count-up";
import { GoldDust } from "@/components/animations/gold-dust";
import { scrollToId } from "@/components/animations/smooth-scroll";
import { JusticeScale } from "@/components/landing/justice-scale";
import { siteConfig } from "@/config/site";

const EASE = [0.22, 1, 0.36, 1] as const;

export function Hero({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  const ref = React.useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const statueY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 120]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -60]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.7], [1, reduce ? 1 : 0]);
  const bgWordY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 180]);

  const primaryHref = isAuthenticated ? "/app/projetos/novo" : "/register";

  return (
    <section ref={ref} id="topo" className="grain relative isolate min-h-[100svh] overflow-hidden pt-28 pb-10 md:pt-32">
      {/* Fundo: luz de estúdio, grade dourada e feixes */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_85%_65%_at_10%_0%,rgba(22,38,61,0.9),transparent_62%),radial-gradient(ellipse_50%_60%_at_25%_85%,rgba(16,29,45,0.75),transparent_70%)]" />
        <div className="absolute top-[8%] right-[2%] h-[80%] w-[52%] rounded-full bg-[radial-gradient(closest-side,rgba(40,28,12,0.55),transparent)]" />
        <div className="absolute inset-0 bg-gold-lines [mask-image:radial-gradient(ellipse_70%_60%_at_60%_40%,#000_10%,transparent_75%)]" />
        <LightBeams />
        <GoldDust />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-ink" />
      </div>

      {/* Palavra monumental ao fundo */}
      <motion.div
        aria-hidden
        style={{ y: bgWordY }}
        className="pointer-events-none absolute top-[16%] right-[-4%] -z-10 hidden select-none font-display text-[19vw] leading-none font-semibold tracking-[0.04em] text-stroke-gold opacity-[0.18] lg:block"
      >
        IUSTITIA
      </motion.div>

      <div className="mx-auto grid max-w-7xl items-center gap-6 px-6 md:px-10 lg:grid-cols-[1.08fr_0.92fr] lg:gap-4">
        <motion.div style={{ y: textY, opacity: textOpacity }} className="relative z-10 order-2 lg:order-1">
          <motion.div
            initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 1, ease: EASE, delay: 0.3 }}
            className="gold-ring inline-flex items-center gap-2.5 rounded-full bg-white/[0.03] py-1.5 pr-4 pl-1.5 backdrop-blur"
          >
            <span className="grid size-7 place-items-center rounded-full bg-gold/15 text-gold-light shadow-[0_0_16px_-2px_rgba(198,161,91,0.6)]">
              <Scale className="size-3.5" />
            </span>
            <span className="text-[0.75rem] font-medium tracking-[0.08em] text-ivory/90">Desenvolvido para advogados</span>
          </motion.div>

          <AnimatedText
            as="h1"
            trigger="mount"
            delay={0.45}
            stagger={0.055}
            className="mt-7 font-display text-[2.75rem] leading-[1.02] font-medium text-ivory sm:text-6xl lg:text-[4.6rem] xl:text-[5.2rem]"
            segments={[
              { text: "Transforme vídeos jurídicos em " },
              { text: "conteúdo profissional", className: "text-gold-gradient italic" },
              { text: " com IA." },
            ]}
          />

          <motion.p
            initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 1.1, ease: EASE, delay: 1.15 }}
            className="mt-7 max-w-xl text-base leading-relaxed text-mist md:text-lg"
          >
            Envie seu vídeo. Nossa inteligência analisa a fala, estrutura a edição e prepara conteúdos profissionais para
            redes sociais e anúncios.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: EASE, delay: 1.35 }}
            className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <Magnetic>
              <Button asChild variant="gold" size="lg" className="w-full sm:w-auto">
                <Link href={primaryHref}>
                  Criar primeiro projeto <ArrowRight className="transition-transform group-hover/btn:translate-x-1" />
                </Link>
              </Button>
            </Magnetic>
            <Button variant="outline" size="lg" onClick={() => scrollToId("como-funciona")} className="group/watch">
              <span className="grid size-6 place-items-center rounded-full border border-gold/50 transition-colors group-hover/watch:bg-gold/20">
                <Play className="size-2.5 fill-current" />
              </span>
              Ver como funciona
            </Button>
          </motion.div>

          <motion.ul
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.1, delayChildren: 1.6 } } }}
            className="mt-12 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-white/[0.08]"
          >
            {[
              { icon: Landmark, title: "Provimento 205/2021", text: "Sem promessas" },
              { icon: Lock, title: "Sigilo e LGPD", text: "Arquivos privados" },
              { icon: Sparkles, title: "Pronto para publicar", text: "Reels, Ads, YouTube" },
            ].map(({ icon: Icon, title, text }) => (
              <motion.li
                key={title}
                variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } } }}
                className="flex items-center gap-3 sm:px-5 sm:first:pl-0"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-gold/25 bg-gold/[0.06] text-gold">
                  <Icon className="size-4" />
                </span>
                <span className="leading-tight">
                  <span className="block text-[0.8125rem] font-semibold whitespace-nowrap text-ivory">{title}</span>
                  <span className="block text-xs whitespace-nowrap text-mist">{text}</span>
                </span>
              </motion.li>
            ))}
          </motion.ul>
        </motion.div>

        <motion.div
          style={{ y: statueY }}
          initial={{ opacity: 0, scale: 0.96, filter: "blur(12px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 1.8, ease: EASE, delay: 0.1 }}
          className="relative order-1 mx-auto w-full max-w-[min(88vw,420px)] sm:max-w-[480px] lg:order-2 lg:max-w-[640px]"
        >
          <JusticeScale />
        </motion.div>
      </div>

      {/* Faixa de destaques */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, ease: EASE, delay: 1.8 }}
        className="relative z-10 mx-auto mt-10 max-w-5xl px-6 md:mt-4 md:px-10"
      >
        <div className="panel gold-ring grid grid-cols-2 gap-y-6 rounded-3xl px-4 py-6 md:grid-cols-4 md:divide-x md:divide-white/[0.07] md:px-2">
          {siteConfig.highlights.map((h) => (
            <div key={h.label} className="px-3 text-center md:px-6">
              <div className="font-display text-4xl font-medium text-gold-gradient md:text-5xl">
                <CountUp value={h.value} suffix={h.suffix} />
              </div>
              <p className="mt-1 text-[0.8125rem] font-semibold text-ivory">{h.label}</p>
              <p className="mt-0.5 text-[0.6875rem] tracking-wide text-mist">{h.caption}</p>
            </div>
          ))}
        </div>
      </motion.div>

      <ScrollCue />
    </section>
  );
}

function ScrollCue() {
  return (
    <motion.button
      type="button"
      onClick={() => scrollToId("produto")}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 2.4, duration: 1 }}
      className="mx-auto mt-10 hidden flex-col items-center gap-3 text-[0.625rem] font-semibold tracking-[0.35em] text-mist/70 uppercase transition-colors hover:text-gold-light md:flex"
      aria-label="Rolar para o produto"
    >
      Role
      <span className="relative h-12 w-px overflow-hidden bg-white/10">
        <span className="absolute inset-x-0 top-0 h-1/2 animate-[scroll-cue_2.2s_cubic-bezier(0.65,0,0.35,1)_infinite] bg-gradient-to-b from-transparent via-gold to-transparent" />
      </span>
    </motion.button>
  );
}

/** Feixes de luz dourada diagonais, muito sutis (inspirados em luz de estúdio). */
function LightBeams() {
  return (
    <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 1440 900" aria-hidden>
      <defs>
        <linearGradient id="beam" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#C6A15B" stopOpacity="0" />
          <stop offset="0.5" stopColor="#E1C487" stopOpacity="0.55" />
          <stop offset="1" stopColor="#C6A15B" stopOpacity="0" />
        </linearGradient>
        <filter id="beam-blur">
          <feGaussianBlur stdDeviation="1.2" />
        </filter>
      </defs>
      {[
        { d: "M-100 760 C 300 620, 700 700, 1540 260", w: 1.2, o: 0.5, dur: "14s" },
        { d: "M-100 820 C 420 700, 860 760, 1540 380", w: 0.8, o: 0.35, dur: "18s" },
        { d: "M-100 120 C 380 220, 900 80, 1540 160", w: 0.6, o: 0.25, dur: "22s" },
      ].map((b, i) => (
        <path key={i} d={b.d} stroke="url(#beam)" strokeWidth={b.w} fill="none" opacity={b.o} filter="url(#beam-blur)" strokeDasharray="600 1400">
          <animate attributeName="stroke-dashoffset" from="2000" to="0" dur={b.dur} repeatCount="indefinite" />
        </path>
      ))}
    </svg>
  );
}
