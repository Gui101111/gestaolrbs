"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { Blueberry, Sprinkle, StrawberryIcon } from "./Toppings";

/** Confeitos que caem/sobem em velocidades diferentes conforme o scroll. */
const bits = [
  { el: <Sprinkle color="#F27C93" className="w-7 rotate-45" />, cls: "left-[6%] top-[12%]", speed: 220 },
  { el: <Sprinkle color="#FFD873" className="w-6 -rotate-12" />, cls: "left-[46%] top-[6%]", speed: -160 },
  { el: <Sprinkle color="#25A9D6" className="w-8 rotate-[70deg]" />, cls: "right-[10%] top-[20%]", speed: 300 },
  { el: <StrawberryIcon className="w-9" />, cls: "right-[4%] bottom-[18%]", speed: -240 },
  { el: <Blueberry className="w-6" />, cls: "left-[3%] bottom-[12%]", speed: 180 },
  { el: <Sprinkle color="#A9E4CB" className="w-6 rotate-12" />, cls: "left-[54%] bottom-[8%]", speed: -120 },
];

function Bit({ speed, cls, children, progress }: { speed: number; cls: string; children: React.ReactNode; progress: ReturnType<typeof useScroll>["scrollYProgress"] }) {
  const reduce = useReducedMotion();
  const y = useTransform(progress, [0, 1], reduce ? [0, 0] : [speed * 0.5, -speed * 0.5]);
  const rotate = useTransform(progress, [0, 1], reduce ? [0, 0] : [0, speed]);
  return (
    <motion.div style={{ y, rotate }} className={`absolute ${cls}`}>
      {children}
    </motion.div>
  );
}

export function FloatingBits() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  return (
    <div ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 hidden md:block">
      {bits.map((b, i) => (
        <Bit key={i} speed={b.speed} cls={b.cls} progress={scrollYProgress}>
          {b.el}
        </Bit>
      ))}
    </div>
  );
}
