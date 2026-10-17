"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue } from "motion/react";
import { ArrowRight, Landmark, Lock, Play, RectangleVertical, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedText } from "@/components/animations/animated-text";
import { Magnetic } from "@/components/animations/magnetic";
import { GoldDust } from "@/components/animations/gold-dust";
import { Aurora } from "@/components/effects/aurora";
import { JusticeScale } from "@/components/landing/justice-scale";
import { DOCK_START, useStatueDock } from "@/components/landing/statue-dock";
import { openExploreTab } from "@/components/landing/explore-events";
import { accentSegments } from "@/components/shared/accent-text";
import { landing } from "@/content/landing";
import { ROUTES } from "@/lib/routes";

const EASE = [0.22, 1, 0.36, 1] as const;
const SEAL_ICONS = { landmark: Landmark, lock: Lock, ratio: RectangleVertical } as const;

/**
 * Bloco 1: palco escuro arredondado com a estátua interativa.
 * O hero fica fixo enquanto o scroll aproxima a câmera da estátua; no fim,
 * ela é entregue à estátua acoplada no canto (ver StatueDock).
 */
export function Hero({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  const { heroRef, statueRef, progress } = useStatueDock();
  const reduce = useReducedMotion();
  const still = reduce === true;

  const textOpacity = useTransform(progress, [0.04, 0.45], [1, still ? 1 : 0]);
  const textY = useTransform(progress, [0, 0.6], [0, still ? 0 : -70]);
  const textBlur = useTransform(progress, [0.04, 0.45], ["blur(0px)", still ? "blur(0px)" : "blur(8px)"]);
  const statueScale = useTransform(progress, [0, DOCK_START], [1, still ? 1 : 1.14]);
  const statueY = useTransform(progress, [0, DOCK_START], [0, still ? 0 : 28]);
  const statueOpacity = useTransform(progress, [DOCK_START, DOCK_START + 0.02], [1, still ? 1 : 0]);
  const stageScale = useTransform(progress, [0, DOCK_START], [1, still ? 1 : 0.985]);
  const glow = useTransform(progress, [0, DOCK_START], [0.55, still ? 0.55 : 1]);

  const primaryHref = isAuthenticated ? ROUTES.newVideo : ROUTES.register;
  const h = landing.hero;

  return (
    <section
      ref={heroRef}
      id="topo"
      data-accent="gold"
      className="relative h-[175svh] motion-reduce:h-auto"
      aria-label="Apresentação"
    >
      <div className="sticky top-0 h-[100svh] min-h-[620px] p-2 md:p-3 motion-reduce:relative">
        <motion.div
          style={{ scale: stageScale }}
          className="theme-stage texture-metal relative isolate h-full overflow-hidden rounded-[26px] bg-stage text-fg md:rounded-[32px]"
        >
          {/* Fundo: aurora, grade em perspectiva, partículas e vinheta */}
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
            <Aurora variant="hero" />
            <div className="grid-floor opacity-70" />
            <GoldDust density={0.00004} />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_70%_at_50%_45%,transparent_40%,rgb(8_9_12/0.75)_100%)]" />
          </div>

          <div className="mx-auto grid h-full max-w-7xl grid-rows-[auto_1fr] items-center gap-2 px-5 pt-24 pb-6 md:px-10 lg:grid-cols-[1.05fr_0.95fr] lg:grid-rows-1 lg:gap-6 lg:pt-20 lg:pb-10">
            <motion.div
              style={{ opacity: textOpacity, y: textY, filter: textBlur }}
              className="relative z-10 order-2 text-center lg:order-1 lg:text-left"
            >
              <motion.div
                initial={{ opacity: 0, y: 14, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.9, ease: EASE, delay: 0.25 }}
                className="glass inline-flex items-center gap-2 rounded-full py-1.5 pr-4 pl-1.5"
              >
                <span className="grid size-6 place-items-center rounded-full bg-cyan/15 text-cyan shadow-[0_0_14px_-2px_var(--cyan)]">
                  <Sparkles className="size-3.5" />
                </span>
                <span className="text-xs font-semibold text-fg sm:text-[0.8125rem]">{h.chip}</span>
              </motion.div>

              <AnimatedText
                as="h1"
                trigger="mount"
                delay={0.4}
                stagger={0.07}
                className="mt-5 text-[2.6rem] leading-[1.02] font-extrabold text-balance text-fg sm:text-6xl lg:mt-7 lg:text-[4.5rem] xl:text-[5.1rem]"
                segments={accentSegments(h.title)}
              />

              <motion.p
                initial={{ opacity: 0, y: 14, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 1, ease: EASE, delay: 0.95 }}
                className="mx-auto mt-4 max-w-md text-[0.9375rem] leading-relaxed text-fg-2 md:text-lg lg:mx-0 lg:mt-6"
              >
                {h.subtitle}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, ease: EASE, delay: 1.15 }}
                className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:mt-9 lg:justify-start"
              >
                <Magnetic>
                  <Button asChild variant="gold" size="lg" pulse className="w-full sm:w-auto">
                    <Link href={primaryHref}>
                      {h.primary} <ArrowRight className="transition-transform group-hover/btn:translate-x-1" />
                    </Link>
                  </Button>
                </Magnetic>
                <Button variant="glass" size="lg" onClick={() => openExploreTab("exemplos")} className="w-full sm:w-auto">
                  <span className="grid size-5 place-items-center rounded-full border border-cyan/50 text-cyan">
                    <Play className="size-2.5 fill-current" />
                  </span>
                  {h.secondary}
                </Button>
              </motion.div>

              <motion.ul
                initial="hidden"
                animate="show"
                variants={{ show: { transition: { staggerChildren: 0.08, delayChildren: 1.35 } } }}
                className="mt-6 flex flex-wrap items-center justify-center gap-2 lg:mt-10 lg:justify-start"
              >
                {h.seals.map((s) => {
                  const Icon = SEAL_ICONS[s.icon as keyof typeof SEAL_ICONS];
                  return (
                    <motion.li
                      key={s.label}
                      variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } } }}
                      className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-medium text-fg-2"
                    >
                      <Icon className="size-3.5 text-gold" />
                      {s.label}
                    </motion.li>
                  );
                })}
              </motion.ul>
            </motion.div>

            <div className="relative order-1 flex h-full min-h-0 items-center justify-center lg:order-2">
              <motion.div
                aria-hidden
                style={{ opacity: glow }}
                className="pointer-events-none absolute top-1/2 left-1/2 -z-10 size-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--gold)_38%,transparent),color-mix(in_oklab,var(--cyan)_10%,transparent)_60%,transparent)] blur-2xl animate-pulse-glow"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.96, filter: "blur(12px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                transition={{ duration: 1.6, ease: EASE, delay: 0.1 }}
                className="relative mb-3 w-full max-w-[min(60vw,30svh)] sm:max-w-[min(420px,40svh)] lg:mb-0 lg:max-w-[min(600px,72svh)]"
              >
                <motion.div style={{ scale: statueScale, y: statueY, opacity: statueOpacity }} className="relative">
                  <div ref={statueRef} data-hero-statue>
                    <JusticeScale />
                  </div>
                </motion.div>
                <FloatingChips chips={h.chips} progress={progress} still={still} />
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

const CHIP_SPOTS = [
  { className: "top-[14%] -left-[6%] lg:-left-[10%]", depth: 18, spread: [-40, -30], delay: 0 },
  { className: "top-[30%] -right-[4%] lg:-right-[8%]", depth: -22, spread: [46, -18], delay: 0.8 },
  { className: "bottom-[24%] -left-[2%] lg:-left-[6%]", depth: 26, spread: [-52, 26], delay: 1.6 },
  { className: "bottom-[14%] -right-[2%] lg:-right-[4%]", depth: -16, spread: [40, 34], delay: 2.4 },
];

/** Chips de vidro flutuando ao redor da estátua, com parallax do mouse e do scroll. */
function FloatingChips({ chips, progress, still }: { chips: readonly string[]; progress: MotionValue<number>; still: boolean }) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 18 });
  const sy = useSpring(my, { stiffness: 60, damping: 18 });

  React.useEffect(() => {
    if (still || !window.matchMedia("(pointer: fine)").matches) return;
    const onMove = (e: PointerEvent) => {
      mx.set((e.clientX / window.innerWidth) * 2 - 1);
      my.set((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [mx, my, still]);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {chips.map((label, i) => (
        <Chip key={label} label={label} spot={CHIP_SPOTS[i % CHIP_SPOTS.length]} sx={sx} sy={sy} progress={progress} still={still} index={i} />
      ))}
    </div>
  );
}

function Chip({
  label,
  spot,
  sx,
  sy,
  progress,
  still,
  index,
}: {
  label: string;
  spot: (typeof CHIP_SPOTS)[number];
  sx: MotionValue<number>;
  sy: MotionValue<number>;
  progress: MotionValue<number>;
  still: boolean;
  index: number;
}) {
  const x = useTransform(() => (still ? 0 : sx.get() * spot.depth + progress.get() * spot.spread[0] * 2));
  const y = useTransform(() => (still ? 0 : sy.get() * spot.depth + progress.get() * spot.spread[1] * 2));
  const opacity = useTransform(progress, [0.3, 0.7], [1, still ? 1 : 0]);
  const isCheck = label.includes("✓");
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8, filter: "blur(6px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.9, ease: EASE, delay: 1.2 + index * 0.15 }}
      className={`absolute ${spot.className}`}
    >
      <motion.span style={{ x, y, opacity }} className="block">
        <span
          className="glass flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold text-fg shadow-[0_8px_24px_-12px_rgb(0_0_0/0.8)] animate-float-soft sm:px-3 sm:py-1.5 sm:text-xs"
          style={{ animationDelay: `${spot.delay}s` }}
        >
          <span className={`size-1.5 rounded-full ${isCheck ? "bg-success shadow-[0_0_8px_var(--success)]" : "bg-cyan shadow-[0_0_8px_var(--cyan)]"}`} />
          {label}
        </span>
      </motion.span>
    </motion.span>
  );
}
