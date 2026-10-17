"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { Example } from "@/content/exemplos";

const HUES: Record<Example["hue"], string> = {
  gold: "var(--gold)",
  cyan: "var(--cyan)",
  azure: "var(--azure)",
  violet: "var(--violet)",
};

/**
 * Quadro de um exemplo. Com vídeo em `content/exemplos.ts`, toca o vídeo;
 * sem vídeo, monta uma composição: a gravação "bruta" (antes) ou a versão
 * editada com legenda, destaque e identificação (depois).
 */
export function ExampleScene({
  example,
  variant,
  playing = true,
  className,
}: {
  example: Example;
  variant: "before" | "after";
  playing?: boolean;
  className?: string;
}) {
  const media = variant === "before" ? example.before : example.after;
  const videoRef = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (playing) v.play().catch(() => undefined);
    else v.pause();
  }, [playing]);

  if (media.video) {
    return (
      <video
        ref={videoRef}
        src={media.video}
        poster={media.poster}
        muted
        loop
        playsInline
        preload="metadata"
        className={cn("absolute inset-0 size-full object-cover", className)}
      />
    );
  }

  const hue = HUES[example.hue];
  const words = example.caption.split(" ");

  if (variant === "before") {
    return (
      <div className={cn("absolute inset-0 overflow-hidden bg-[#121316]", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/media/justica-busto.webp"
          alt=""
          className="absolute inset-0 size-full scale-[1.28] translate-x-[7%] translate-y-[6%] rotate-[2deg] object-cover brightness-[0.62] contrast-[0.82] grayscale-[0.85]"
        />
        <div className="grain absolute inset-0" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgb(0_0_0/0.6)_100%)]" />
        <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-md bg-black/50 px-2 py-1 font-mono text-[0.625rem] text-white/80">
          <span className="size-1.5 rounded-full bg-[#f06a5e]" />
          REC 00:00:12
        </div>
      </div>
    );
  }

  return (
    <div className={cn("absolute inset-0 overflow-hidden bg-[#0e1014]", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/media/justica-busto.webp"
        alt=""
        className={cn(
          "absolute inset-0 size-full object-cover saturate-[1.15]",
          playing && "animate-[example-push_9s_ease-in-out_infinite_alternate]",
        )}
      />
      <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, transparent 45%, rgb(8 9 12 / 0.85) 100%), radial-gradient(ellipse at 80% 0%, color-mix(in oklab, ${hue} 30%, transparent), transparent 60%)` }} />
      {/* Barra de progresso no topo, como nos Reels */}
      <div className="absolute inset-x-3 top-3 h-[3px] overflow-hidden rounded-full bg-white/20">
        <div className={cn("h-full w-1/3 rounded-full", playing && "animate-[example-progress_6s_linear_infinite]")} style={{ background: hue }} />
      </div>
      {/* Identificação */}
      <div className="absolute bottom-[26%] left-3 flex items-center gap-2">
        <span className="h-7 w-[3px] rounded-full" style={{ background: hue, boxShadow: `0 0 10px ${hue}` }} />
        <span className="leading-tight">
          <span className="block text-[0.6875rem] font-bold text-white">Dra. Ana Lima</span>
          <span className="block text-[0.5625rem] font-medium text-white/70">OAB/SP 123.456</span>
        </span>
      </div>
      {/* Legenda com palavra destacada */}
      <p className="absolute inset-x-3 bottom-[9%] text-center text-[0.8125rem] leading-snug font-extrabold text-white [text-shadow:0_2px_10px_rgb(0_0_0/0.6)]">
        {words.map((w, i) => {
          const hit = w.toLowerCase().replace(/[^\p{L}]/gu, "") === example.highlight.toLowerCase();
          return (
            <React.Fragment key={i}>
              {hit ? (
                <span className="rounded-md px-1 text-[#14171c]" style={{ background: hue, boxShadow: `0 0 14px -2px ${hue}` }}>
                  {w}
                </span>
              ) : (
                w
              )}{" "}
            </React.Fragment>
          );
        })}
      </p>
    </div>
  );
}
