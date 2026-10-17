"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";

const PHRASES: Record<string, string[]> = {
  institucional: ["O direito à revisão", "tem prazo de dez anos", "a partir do benefício."],
  dinamico: ["Você sabia que pode", "pedir REVISÃO", "do seu benefício?"],
  cinematografico: ["Família", "é também", "planejamento."],
  performance: ["CAIU NO GOLPE?", "FAÇA ISTO PRIMEIRO", "Saiba mais ↓"],
  descontraido: ["Pergunta que eu mais recebo:", "voo cancelado dá direito", "a mais que reembolso?"],
};

/**
 * Prévia curta e em loop de cada estilo de edição (sem vídeo real):
 * ritmo, tipo de legenda, grade de cor e elementos mudam por estilo.
 */
export function StylePreview({ style, playing = true, className }: { style: string; playing?: boolean; className?: string }) {
  const phrases = PHRASES[style] ?? PHRASES.institucional;
  const [i, setI] = React.useState(0);
  const speed = style === "performance" ? 1100 : style === "dinamico" ? 1400 : style === "descontraido" ? 1700 : 2300;

  React.useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setI((v) => (v + 1) % phrases.length), speed);
    return () => window.clearInterval(id);
  }, [playing, phrases.length, speed]);

  const phrase = phrases[playing ? i : 0];

  return (
    <div className={cn("relative aspect-[9/16] overflow-hidden rounded-[22px] bg-[#0e1014] shadow-[var(--shadow-pop)]", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/media/justica-busto.webp"
        alt=""
        className={cn(
          "absolute inset-0 size-full object-cover",
          style === "institucional" && "saturate-[0.8] brightness-[0.9]",
          style === "cinematografico" && "sepia-[0.25] saturate-[1.2] contrast-[1.15] brightness-[0.85]",
          style === "descontraido" && "saturate-[1.15] brightness-[1.05]",
          playing && style === "dinamico" && "animate-[punch-zoom_2.8s_ease-in-out_infinite]",
          playing && style === "performance" && "animate-[punch-zoom_2.2s_ease-in-out_infinite]",
          playing && style === "cinematografico" && "animate-[cine-drift_8s_ease-in-out_infinite_alternate]",
          playing && style === "institucional" && "animate-[example-push_10s_ease-in-out_infinite_alternate]",
        )}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/75" />

      {style === "cinematografico" && (
        <>
          <div className="absolute inset-x-0 top-0 h-[11%] bg-black" />
          <div className="absolute inset-x-0 bottom-0 h-[11%] bg-black" />
        </>
      )}

      {style === "performance" && (
        <div className="absolute inset-x-3 top-3 h-[3px] overflow-hidden rounded-full bg-white/25">
          <div className={cn("h-full w-1/3 rounded-full bg-gold", playing && "animate-[example-progress_3s_linear_infinite]")} />
        </div>
      )}

      {style === "institucional" && (
        <div className="absolute bottom-[24%] left-3 flex items-center gap-2">
          <span className="h-7 w-[2px] bg-gold" />
          <span className="leading-tight">
            <span className="block text-[0.625rem] font-bold text-white">Dr. Rafael Souza</span>
            <span className="block text-[0.5rem] text-white/70">OAB/MG 98.765</span>
          </span>
        </div>
      )}

      {style === "descontraido" && (
        <motion.span
          className="absolute top-[14%] right-4 grid size-9 place-items-center rounded-full bg-cyan text-base font-black text-[#06222a] shadow-[0_0_16px_var(--cyan)]"
          animate={playing ? { rotate: [-8, 8, -8], y: [0, -4, 0] } : undefined}
          transition={{ duration: 1.6, repeat: Infinity }}
        >
          ?
        </motion.span>
      )}

      <div className={cn("absolute inset-x-3 flex justify-center", style === "cinematografico" ? "bottom-[16%]" : "bottom-[9%]")}>
        <AnimatePresence mode="wait">
          <motion.p
            key={phrase}
            initial={
              style === "dinamico" || style === "performance"
                ? { opacity: 0, scale: 0.6 }
                : style === "descontraido"
                  ? { opacity: 0, y: 12, scale: 0.9 }
                  : { opacity: 0, filter: "blur(6px)" }
            }
            animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, filter: "blur(4px)" }}
            transition={{ duration: style === "performance" || style === "dinamico" ? 0.22 : 0.6, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "text-center",
              style === "institucional" && "text-[0.8125rem] font-medium text-white",
              style === "dinamico" && "text-base font-extrabold text-white [text-shadow:0_2px_10px_rgb(0_0_0/0.6)]",
              style === "cinematografico" && "font-serif text-xl text-white/95 italic",
              style === "performance" && "rounded-lg bg-gold px-2 py-1 text-[0.9375rem] font-black tracking-tight text-[#1a1306] shadow-[0_0_20px_-4px_var(--gold)]",
              style === "descontraido" && "rounded-2xl rounded-bl-sm bg-white px-3 py-1.5 text-[0.8125rem] font-bold text-[#14171c]",
            )}
          >
            {style === "dinamico"
              ? phrase.split(" ").map((w, k) =>
                  w === w.toUpperCase() && w.length > 3 ? (
                    <span key={k} className="rounded-md bg-cyan px-1 text-[#06222a]">
                      {w}{" "}
                    </span>
                  ) : (
                    <span key={k}>{w} </span>
                  ),
                )
              : phrase}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
