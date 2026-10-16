"use client";

import { motion } from "motion/react";
import type * as React from "react";
import { CountUp } from "@/components/animations/count-up";
import { cn } from "@/lib/utils";

export function StatCard({
  icon,
  label,
  value,
  suffix,
  caption,
  index = 0,
  decimals = 0,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
  caption?: string;
  index?: number;
  decimals?: number;
  accent?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.08 * index, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-fg/[0.07] bg-fg/[0.02] p-5 transition-all duration-700 hover:border-gold/25 md:p-6",
        accent && "bg-gradient-to-br from-navy-deep/80 to-fg/[0.01]",
      )}
    >
      <span aria-hidden className="pointer-events-none absolute -top-12 -right-12 size-32 rounded-full bg-gold/10 opacity-0 blur-2xl transition-opacity duration-700 group-hover:opacity-100" />
      <div className="flex items-center justify-between">
        <p className="text-[0.8125rem] text-mist">{label}</p>
        <span className="grid size-9 place-items-center rounded-xl border border-gold/20 bg-gold/[0.06] text-gold">
          {icon}
        </span>
      </div>
      <p className="mt-4 font-display text-4xl text-ivory md:text-5xl">
        <CountUp value={value} suffix={suffix} decimals={decimals} duration={1.6} />
      </p>
      {caption && <p className="mt-1 text-xs text-mist/80">{caption}</p>}
    </motion.div>
  );
}
