"use client";

import * as React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

/** Estado vazio elegante com ilustração jurídica minimalista (balança + quadro de vídeo). */
export function EmptyState({
  title,
  description,
  action,
  className,
  compact,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "relative flex flex-col items-center overflow-hidden rounded-3xl border border-dashed border-fg/10 bg-fg/[0.015] px-6 text-center",
        compact ? "py-10" : "py-16 md:py-20",
        className,
      )}
    >
      <div aria-hidden className="pointer-events-none absolute top-0 left-1/2 h-40 w-[420px] -translate-x-1/2 rounded-full bg-gold/[0.08] blur-3xl" />
      <ScaleIllustration className={cn("relative", compact ? "h-20" : "h-28")} />
      <h3 className="relative mt-6 font-display text-2xl text-ivory md:text-3xl">{title}</h3>
      {description && <p className="relative mt-2 max-w-md text-sm leading-relaxed text-mist">{description}</p>}
      {action && <div className="relative mt-7">{action}</div>}
    </motion.div>
  );
}

function ScaleIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 120" fill="none" className={className} aria-hidden>
      <defs>
        <linearGradient id="es-gold" x1="0" y1="0" x2="160" y2="120" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8C6B2F" />
          <stop offset="0.5" stopColor="#E1C487" />
          <stop offset="1" stopColor="#8C6B2F" />
        </linearGradient>
      </defs>
      <rect x="44" y="30" width="72" height="54" rx="8" stroke="rgba(255,255,255,0.12)" />
      <path d="M74 50v14l12-7z" fill="rgba(198,161,91,0.5)" />
      <motion.g
        style={{ originX: "80px", originY: "14px" }}
        animate={{ rotate: [-4, 4, -4] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        <path d="M30 14h100" stroke="url(#es-gold)" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M34 14 24 40h20zM126 14l-10 26h20z" stroke="url(#es-gold)" strokeWidth="1" strokeLinejoin="round" opacity="0.8" />
        <path d="M22 40c2 5 6 7 12 7s10-2 12-7M114 40c2 5 6 7 12 7s10-2 12-7" stroke="url(#es-gold)" strokeWidth="1.5" strokeLinecap="round" />
      </motion.g>
      <circle cx="80" cy="12" r="3" fill="url(#es-gold)" />
      <path d="M80 15v15M64 104h32M80 84v20" stroke="url(#es-gold)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
