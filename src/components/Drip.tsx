"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const drips = [
  { x: 40, w: 46, len: 40 }, { x: 150, w: 34, len: 78 }, { x: 250, w: 56, len: 30 },
  { x: 380, w: 40, len: 96 }, { x: 500, w: 30, len: 52 }, { x: 610, w: 60, len: 36 },
  { x: 740, w: 36, len: 84 }, { x: 860, w: 48, len: 44 }, { x: 990, w: 32, len: 104 },
  { x: 1100, w: 54, len: 38 }, { x: 1230, w: 38, len: 70 }, { x: 1350, w: 44, len: 34 },
];

function dripPath() {
  let d = "M0 0 H1440 V24";
  // percorre da direita para a esquerda desenhando gotas arredondadas
  for (const k of [...drips].reverse()) {
    const r = k.w / 2;
    d += ` L${k.x + k.w + 14} 24 Q${k.x + k.w} 24 ${k.x + k.w} ${24 + 14}`;
    d += ` L${k.x + k.w} ${24 + k.len} A${r} ${r} 0 0 1 ${k.x} ${24 + k.len}`;
    d += ` L${k.x} ${24 + 14} Q${k.x} 24 ${k.x - 14} 24`;
  }
  return d + " L0 24 Z";
}

const D = dripPath();

/** Borda de sorvete derretendo — colocar no topo da seção seguinte, com a cor da seção anterior. */
export function Drip({ color, className }: { color: string; className?: string }) {
  return (
    <div aria-hidden="true" className={cn("pointer-events-none absolute inset-x-0 top-0 z-10 overflow-hidden", className)}>
      <motion.svg
        viewBox="0 0 1440 140"
        preserveAspectRatio="none"
        className="block h-[70px] w-full md:h-[110px]"
        initial={{ scaleY: 0.35 }}
        whileInView={{ scaleY: 1 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformOrigin: "top" }}
      >
        <path d={D} fill={color} />
      </motion.svg>
    </div>
  );
}
