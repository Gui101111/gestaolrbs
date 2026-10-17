"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { InstagramIcon, LinkedinIcon, MetaIcon, TiktokIcon, YoutubeIcon } from "@/components/brand/social-icons";
import { cn } from "@/lib/utils";

const ICONS = {
  tiktok: TiktokIcon,
  instagram: InstagramIcon,
  youtube: YoutubeIcon,
  linkedin: LinkedinIcon,
  meta: MetaIcon,
} as const;

export type FormatItem = { ratio: string; platforms: readonly string[]; label: string };

function ratioOf(r: string) {
  const [w, h] = r.split(":").map(Number);
  return w / h;
}

/** Moldura que se transforma em loop entre as proporções, com as plataformas de cada uma. */
export function FormatMorph({ formats, className }: { formats: readonly FormatItem[]; className?: string }) {
  const [i, setI] = React.useState(0);
  const [auto, setAuto] = React.useState(true);
  const reduce = useReducedMotion();

  React.useEffect(() => {
    if (!auto || reduce) return;
    const id = window.setInterval(() => setI((v) => (v + 1) % formats.length), 2400);
    return () => window.clearInterval(id);
  }, [auto, reduce, formats.length]);

  const f = formats[i];
  const r = ratioOf(f.ratio);
  const width = r >= 1 ? 100 : r * 100;
  const height = r >= 1 ? 100 / r : 100;

  return (
    <div className={cn("flex flex-col items-center gap-5", className)}>
      <div className="relative grid aspect-square w-full max-w-[340px] place-items-center">
        <motion.div
          className="relative overflow-hidden rounded-[18px] border border-cyan/50 bg-[#0e1014] shadow-[0_0_0_1px_color-mix(in_oklab,var(--cyan)_20%,transparent),0_0_40px_-10px_var(--cyan)]"
          animate={{ width: `${width}%`, height: `${height}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 18 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/media/justica-busto.webp" alt="" className="absolute inset-0 size-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <AnimatePresence mode="wait">
            <motion.div
              key={f.ratio}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35 }}
              className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 p-3"
            >
              <span className="font-display text-lg font-bold text-white">{f.ratio}</span>
              <span className="flex gap-1.5">
                {f.platforms.map((p) => {
                  const Icon = ICONS[p as keyof typeof ICONS];
                  return Icon ? (
                    <span key={p} className="grid size-7 place-items-center rounded-full bg-white/15 text-white backdrop-blur">
                      <Icon className="size-3.5" />
                    </span>
                  ) : null;
                })}
              </span>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>

      <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Proporções">
        {formats.map((it, k) => (
          <button
            key={it.ratio}
            type="button"
            onClick={() => {
              setI(k);
              setAuto(false);
            }}
            aria-pressed={k === i}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all duration-300",
              k === i ? "border-cyan/60 bg-cyan/10 text-cyan shadow-[var(--glow-cyan)]" : "border-line text-fg-2 hover:text-fg",
            )}
          >
            {it.ratio}
          </button>
        ))}
      </div>
      <p className="text-sm text-fg-2">{f.label}</p>
    </div>
  );
}
