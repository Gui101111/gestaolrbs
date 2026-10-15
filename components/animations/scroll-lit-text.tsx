"use client";

import * as React from "react";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Parágrafo que "acende" palavra por palavra conforme a rolagem.
 * Palavras marcadas com *asteriscos* ficam douradas ao acender.
 */
export function ScrollLitText({ text, className }: { text: string; className?: string }) {
  const ref = React.useRef<HTMLParagraphElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 85%", "end 45%"] });
  const tokens = text.split(/\s+/).filter(Boolean);
  const plain = text.replace(/\*/g, "");

  if (reduce) {
    return (
      <p ref={ref} className={className}>
        {tokens.map((t, i) => {
          const gold = t.startsWith("*");
          return (
            <span key={i} className={gold ? "text-gold-light" : "text-ivory"}>
              {t.replace(/\*/g, "")}{" "}
            </span>
          );
        })}
      </p>
    );
  }

  return (
    <p ref={ref} className={cn("flex flex-wrap", className)} aria-label={plain}>
      {tokens.map((t, i) => (
        <Word key={i} progress={scrollYProgress} range={[i / tokens.length, (i + 1.5) / tokens.length]} gold={t.startsWith("*")}>
          {t.replace(/\*/g, "")}
        </Word>
      ))}
    </p>
  );
}

function Word({
  children,
  progress,
  range,
  gold,
}: {
  children: React.ReactNode;
  progress: MotionValue<number>;
  range: [number, number];
  gold: boolean;
}) {
  const opacity = useTransform(progress, range, [0.14, 1]);
  const blur = useTransform(progress, range, [3, 0]);
  const filter = useTransform(blur, (b) => `blur(${b}px)`);
  return (
    <span aria-hidden className="relative mr-[0.26em] mb-[0.06em]">
      <motion.span style={{ opacity, filter }} className={gold ? "text-gold-gradient text-glow" : "text-ivory"}>
        {children}
      </motion.span>
    </span>
  );
}
