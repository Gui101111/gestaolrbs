"use client";

import * as React from "react";
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from "motion/react";
import { cn } from "@/lib/utils";

function wrap(min: number, max: number, v: number) {
  const range = max - min;
  return ((((v - min) % range) + range) % range) + min;
}

/**
 * Faixa horizontal contínua. A velocidade e a direção reagem levemente à rolagem.
 */
export function Marquee({
  children,
  baseVelocity = -2.2,
  className,
  itemClassName,
}: {
  children: React.ReactNode;
  baseVelocity?: number;
  className?: string;
  itemClassName?: string;
}) {
  const reduce = useReducedMotion();
  const baseX = useMotionValue(0);
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, { damping: 60, stiffness: 300 });
  const velocityFactor = useTransform(smoothVelocity, [-1500, 0, 1500], [-2.2, 0, 2.2], { clamp: false });
  const x = useTransform(baseX, (v) => `${wrap(-25, 0, v)}%`);
  const directionFactor = React.useRef(1);

  useAnimationFrame((_, delta) => {
    if (reduce) return;
    let moveBy = directionFactor.current * baseVelocity * (delta / 1000);
    const vf = velocityFactor.get();
    if (vf < 0) directionFactor.current = -1;
    else if (vf > 0) directionFactor.current = 1;
    moveBy += directionFactor.current * moveBy * Math.min(Math.abs(vf), 2.5);
    baseX.set(baseX.get() + moveBy * 0.6);
  });

  return (
    <div className={cn("relative flex overflow-hidden whitespace-nowrap mask-fade-x", className)}>
      <motion.div className="flex shrink-0 whitespace-nowrap will-change-transform" style={{ x }}>
        {[0, 1, 2, 3].map((k) => (
          <span key={k} aria-hidden={k > 0} className={cn("flex shrink-0 items-center", itemClassName)}>
            {children}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

/** Palavras que surgem em sequência, uma substituindo a outra suavemente. */
export function WordCycle({
  words,
  className,
  wordClassName,
  interval = 2600,
}: {
  words: string[];
  className?: string;
  wordClassName?: string;
  interval?: number;
}) {
  const [i, setI] = React.useState(0);
  const reduce = useReducedMotion();
  React.useEffect(() => {
    if (reduce) return;
    const t = window.setInterval(() => setI((v) => (v + 1) % words.length), interval);
    return () => window.clearInterval(t);
  }, [words.length, interval, reduce]);
  return (
    <span className={cn("relative inline-grid overflow-hidden align-bottom", className)}>
      {words.map((w, idx) => (
        <motion.span
          key={w}
          className={cn("col-start-1 row-start-1 whitespace-nowrap", wordClassName)}
          initial={false}
          animate={
            idx === i
              ? { opacity: 1, y: "0%", filter: "blur(0px)" }
              : { opacity: 0, y: idx < i ? "-60%" : "60%", filter: "blur(6px)" }
          }
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          aria-hidden={idx !== i}
        >
          {w}
        </motion.span>
      ))}
    </span>
  );
}
