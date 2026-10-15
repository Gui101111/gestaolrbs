"use client";

import { Marquee } from "@/components/animations/marquee";

const WORDS = [
  "Edição Jurídica",
  "Inteligência Artificial",
  "Vídeos Profissionais",
  "Tráfego Pago",
  "Conteúdo Orgânico",
  "Automação",
];

export function MarqueeBand() {
  return (
    <section aria-label="Pilares da plataforma" className="relative border-y border-white/[0.06] bg-ink-2 py-7 md:py-9">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 hairline opacity-60" />
      <Marquee baseVelocity={-1.6} itemClassName="gap-10 pr-10 md:gap-16 md:pr-16">
        {WORDS.map((w, i) => (
          <span key={w} className="flex items-center gap-10 md:gap-16">
            <span
              className={
                i % 2 === 0
                  ? "font-display text-4xl font-medium tracking-[0.04em] text-ivory uppercase md:text-6xl"
                  : "font-display text-4xl font-medium tracking-[0.04em] uppercase italic text-stroke-gold md:text-6xl"
              }
            >
              {w}
            </span>
            <svg viewBox="0 0 24 24" className="size-5 text-gold md:size-6" aria-hidden>
              <path d="M12 2 13.8 10.2 22 12l-8.2 1.8L12 22l-1.8-8.2L2 12l8.2-1.8Z" fill="currentColor" opacity="0.85" />
            </svg>
          </span>
        ))}
      </Marquee>
    </section>
  );
}
