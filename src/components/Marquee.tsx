"use client";

import { useRef } from "react";
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from "framer-motion";
import { cn } from "@/lib/utils";

const wrap = (min: number, max: number, v: number) => {
  const r = max - min;
  return ((((v - min) % r) + r) % r) + min;
};

function Row({
  children,
  baseVelocity,
  className,
}: {
  children: React.ReactNode;
  baseVelocity: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const base = useMotionValue(0);
  const { scrollY } = useScroll();
  const vel = useSpring(useVelocity(scrollY), { damping: 50, stiffness: 400 });
  const factor = useTransform(vel, [0, 1000], [0, 4], { clamp: false });
  const x = useTransform(base, (v) => `${wrap(-50, 0, v)}%`);
  const dir = useRef(1);

  useAnimationFrame((_, delta) => {
    if (reduce) return;
    let move = dir.current * baseVelocity * (delta / 1000);
    const f = factor.get();
    if (f < 0) dir.current = -1;
    else if (f > 0) dir.current = 1;
    move += dir.current * move * Math.abs(f);
    base.set(base.get() + move);
  });

  return (
    <div aria-hidden="true" className={cn("flex overflow-hidden whitespace-nowrap", className)}>
      <motion.div style={{ x }} className="flex shrink-0">
        {children}
        {children}
      </motion.div>
    </div>
  );
}

const words = ["Sorvete artesanal", "Self-service", "#loucosporsorvete", "Porto Seguro", "De Minas Gerais", "Monte do seu jeito"];

export function Marquee() {
  const content = (
    <span className="flex shrink-0 items-center">
      {words.map((w) => (
        <span key={w} className="flex items-center">
          <span className="px-6">{w}</span>
          <span className="text-[0.6em]" aria-hidden="true">✦</span>
        </span>
      ))}
    </span>
  );
  return (
    <section aria-label="Destaques da Berry's" className="relative overflow-hidden bg-offwhite py-10 md:py-14">
      <p className="sr-only">{words.join(" • ")}</p>
      <div className="-rotate-2 bg-berry-deep py-4 shadow-lift md:py-5">
        <Row baseVelocity={-3} className="font-display text-2xl font-extrabold uppercase tracking-tight text-white md:text-4xl">
          {content}
        </Row>
      </div>
      <div aria-hidden="true" className="-mt-2 rotate-1 bg-white py-3 md:py-4">
        <Row baseVelocity={2.4} className="font-script text-2xl text-berry-deep md:text-4xl">
          {content}
        </Row>
      </div>
    </section>
  );
}
