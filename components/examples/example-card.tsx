"use client";

import * as React from "react";
import { useReducedMotion } from "motion/react";
import { Play } from "lucide-react";
import { ADVOGADOS, type Example } from "@/content/exemplos";
import { cn } from "@/lib/utils";

/**
 * Card de um vídeo de exemplo: toca sem som enquanto está na tela e abre
 * o player com som ao clicar.
 */
export function ExampleCard({ example, onOpen, className }: { example: Example; onOpen: () => void; className?: string }) {
  const ref = React.useRef<HTMLVideoElement>(null);
  const reduce = useReducedMotion();

  React.useEffect(() => {
    const v = ref.current;
    if (!v || reduce || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) void v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.6 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, [reduce]);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group relative block w-full overflow-hidden rounded-[20px] border border-line bg-black text-left transition-all duration-500 hover:-translate-y-1 hover:border-cyan/40 hover:shadow-[var(--shadow-pop)]",
        className,
      )}
      aria-label={`Assistir: ${example.title}`}
    >
      <video
        ref={ref}
        src={example.video}
        poster={example.poster}
        muted
        loop
        playsInline
        preload="metadata"
        className="aspect-[9/16] w-full object-cover"
      />
      <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-3 pt-10">
        <span className="block text-sm leading-snug font-semibold text-white">{example.title}</span>
        <span className="mt-1 flex items-center gap-1.5 text-[0.6875rem] text-white/70">
          <span className="rounded-full bg-white/15 px-1.5 py-0.5 font-semibold text-white/90">{example.styleLabel}</span>
          {example.areaLabel}
        </span>
      </span>
      <span className="absolute top-3 right-3 grid size-9 place-items-center rounded-full bg-black/45 text-white opacity-0 backdrop-blur transition-opacity duration-300 group-hover:opacity-100">
        <Play className="size-4 fill-current" />
      </span>
      <span className="sr-only">{ADVOGADOS[example.lawyer].name}, personagem fictício</span>
    </button>
  );
}
