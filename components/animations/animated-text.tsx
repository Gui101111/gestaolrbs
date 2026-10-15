"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

type Segment = { text: string; className?: string };

/**
 * Revelação de texto palavra por palavra (fade + blur + subida).
 * Aceita segmentos para destacar trechos (ex.: palavras em dourado).
 * Acessível: o texto completo fica no aria-label.
 */
export function AnimatedText({
  text,
  segments,
  as = "h2",
  className,
  wordClassName,
  delay = 0,
  stagger = 0.06,
  duration = 1,
  once = true,
  trigger = "view",
}: {
  text?: string;
  segments?: Segment[];
  as?: "h1" | "h2" | "h3" | "p" | "span" | "div";
  className?: string;
  wordClassName?: string;
  delay?: number;
  stagger?: number;
  duration?: number;
  once?: boolean;
  trigger?: "view" | "mount";
}) {
  const reduce = useReducedMotion();
  const segs: Segment[] = segments ?? [{ text: text ?? "" }];
  const label = segs.map((s) => s.text).join("");
  const Tag = motion[as] as typeof motion.h2;

  let index = 0;
  const words = segs.flatMap((seg, si) =>
    seg.text
      .split(/(\s+)/)
      .filter((w) => w.length > 0)
      .map((w, wi) => {
        if (/^\s+$/.test(w)) {
          return w.includes("\n") ? <br key={`br-${si}-${wi}`} /> : <span key={`sp-${si}-${wi}`}> </span>;
        }
        const i = index++;
        return (
          <span key={`w-${si}-${wi}`} className="inline-block overflow-hidden pb-[0.08em] align-bottom -mb-[0.08em]">
            <motion.span
              className={cn("inline-block will-change-transform", seg.className, wordClassName)}
              variants={{
                hidden: reduce ? { opacity: 0 } : { opacity: 0, y: "65%", filter: "blur(10px)" },
                show: reduce
                  ? { opacity: 1, transition: { duration: 0.3 } }
                  : {
                      opacity: 1,
                      y: "0%",
                      filter: "blur(0px)",
                      transition: { duration, ease: EASE, delay: delay + i * stagger },
                    },
              }}
            >
              {w}
            </motion.span>
          </span>
        );
      }),
  );

  const animateProps =
    trigger === "mount"
      ? { initial: "hidden", animate: "show" }
      : { initial: "hidden", whileInView: "show", viewport: { once, amount: 0.4 } };

  return (
    <Tag className={className} aria-label={label} {...animateProps}>
      <span aria-hidden>{words}</span>
    </Tag>
  );
}

/** Linhas que surgem por máscara, uma de cada vez. */
export function LineReveal({
  lines,
  className,
  lineClassName,
  delay = 0,
  stagger = 0.12,
  trigger = "view",
}: {
  lines: React.ReactNode[];
  className?: string;
  lineClassName?: string;
  delay?: number;
  stagger?: number;
  trigger?: "view" | "mount";
}) {
  const reduce = useReducedMotion();
  const animateProps =
    trigger === "mount"
      ? { initial: "hidden", animate: "show" }
      : { initial: "hidden", whileInView: "show", viewport: { once: true, amount: 0.4 } };
  return (
    <motion.span className={cn("block", className)} {...animateProps}>
      {lines.map((line, i) => (
        <span key={i} className="block overflow-hidden pb-[0.1em]">
          <motion.span
            className={cn("block will-change-transform", lineClassName)}
            variants={{
              hidden: reduce ? { opacity: 0 } : { y: "105%", opacity: 0 },
              show: reduce
                ? { opacity: 1 }
                : { y: "0%", opacity: 1, transition: { duration: 1.2, ease: EASE, delay: delay + i * stagger } },
            }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </motion.span>
  );
}
