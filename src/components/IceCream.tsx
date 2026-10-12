"use client";

import { useId } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

const SCOOPS = [
  { cx: 150, cy: 268, r: 84 },
  { cx: 150, cy: 176, r: 72 },
  { cx: 150, cy: 98, r: 58 },
];

const SPRINKLES = [
  { x: -0.45, y: -0.55, r: 30, c: "#ffffff" },
  { x: -0.1, y: -0.78, r: -40, c: "#FFD873" },
  { x: 0.28, y: -0.62, r: 70, c: "#25A9D6" },
  { x: 0.55, y: -0.3, r: 15, c: "#ffffff" },
  { x: -0.62, y: -0.18, r: -70, c: "#F27C93" },
  { x: 0.05, y: -0.35, r: 100, c: "#A9E4CB" },
  { x: -0.3, y: -0.2, r: 60, c: "#FFD873" },
  { x: 0.38, y: -0.05, r: -20, c: "#F27C93" },
];

function scoopPath(cx: number, cy: number, r: number) {
  const by = cy + r * 0.28;
  const n = 5;
  const w = (2 * r) / n;
  let d = `M${cx - r} ${by} L${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy} L${cx + r} ${by}`;
  for (let i = 0; i < n; i++) {
    const x = cx + r - i * w;
    d += ` Q${x - w / 2} ${by + r * (i % 2 ? 0.2 : 0.3)} ${x - w} ${by}`;
  }
  return d + " Z";
}

function saucePath(cx: number, cy: number, r: number) {
  const top = cy - r * 0.02;
  const drip = (x1: number, x2: number, len: number) => {
    const w = x1 - x2;
    return ` L${x1} ${top + len} A${w / 2} ${w / 2} 0 0 1 ${x2} ${top + len}`;
  };
  let d = `M${cx - r * 0.96} ${top} C${cx - r * 0.95} ${cy - r * 1.32} ${cx + r * 0.95} ${cy - r * 1.32} ${cx + r * 0.96} ${top}`;
  d += drip(cx + r * 0.96, cx + r * 0.78, r * 0.22);
  d += ` L${cx + r * 0.55} ${top + r * 0.08}`;
  d += drip(cx + r * 0.55, cx + r * 0.36, r * 0.62);
  d += ` L${cx + r * 0.05} ${top + r * 0.1}`;
  d += drip(cx + r * 0.05, cx - r * 0.12, r * 0.3);
  d += ` L${cx - r * 0.42} ${top + r * 0.06}`;
  d += drip(cx - r * 0.42, cx - r * 0.62, r * 0.48);
  d += ` L${cx - r * 0.96} ${top + r * 0.04} Z`;
  return d;
}

export type IceCreamProps = {
  /** Cores das bolas, de baixo para cima */
  flavors: string[];
  /** Quantas bolas mostrar (1–3) */
  count?: number;
  sauce?: string | null;
  sprinkles?: boolean;
  topper?: boolean;
  wafer?: boolean;
  className?: string;
  title?: string;
};

export function IceCream({
  flavors,
  count = 3,
  sauce = null,
  sprinkles = false,
  topper = false,
  wafer = false,
  className,
  title,
}: IceCreamProps) {
  const id = useId().replace(/:/g, "");
  const visible = SCOOPS.slice(0, Math.max(1, Math.min(3, count)));
  const top = visible[visible.length - 1];

  return (
    <svg
      viewBox="0 0 300 560"
      className={cn("overflow-visible", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <defs>
        <linearGradient id={`cone-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F2C27E" />
          <stop offset="1" stopColor="#C77F3A" />
        </linearGradient>
        <clipPath id={`clip-${id}`}>
          <path d="M72 300 L228 300 L157 540 Q150 556 143 540 Z" />
        </clipPath>
        <radialGradient id={`shine-${id}`} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* sombra no chão */}
      <ellipse cx="150" cy="552" rx="46" ry="6" fill="#0B4669" opacity="0.12" />

      {/* casquinha */}
      <path d="M72 300 L228 300 L157 540 Q150 556 143 540 Z" fill={`url(#cone-${id})`} />
      <g clipPath={`url(#clip-${id})`} stroke="#A9662C" strokeWidth="3" opacity="0.5">
        {Array.from({ length: 9 }).map((_, i) => (
          <line key={`a${i}`} x1={40 + i * 26} y1="290" x2={-60 + i * 26} y2="560" />
        ))}
        {Array.from({ length: 9 }).map((_, i) => (
          <line key={`b${i}`} x1={40 + i * 26} y1="290" x2={140 + i * 26} y2="560" />
        ))}
      </g>
      <rect x="62" y="286" width="176" height="30" rx="15" fill="#D99550" />
      <rect x="62" y="286" width="176" height="12" rx="6" fill="#F0BA76" opacity="0.6" />

      {wafer && (
        <g transform={`translate(${top.cx + top.r * 0.45} ${top.cy - top.r * 0.55}) rotate(28)`}>
          <rect x="-11" y="-70" width="22" height="88" rx="6" fill="#E9AE62" />
          <path d="M-11 -50h22M-11 -30h22M-11 -10h22" stroke="#B9712F" strokeWidth="3" />
        </g>
      )}

      {/* bolas */}
      <AnimatePresence initial={false}>
        {visible.map((s, i) => (
          <motion.g
            key={i}
            initial={{ y: -220, opacity: 0, scaleY: 1.15 }}
            animate={{ y: 0, opacity: 1, scaleY: 1 }}
            exit={{ y: -160, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 18, mass: 0.9 }}
            style={{ transformOrigin: `${s.cx}px ${s.cy + s.r}px` }}
          >
            <motion.path
              d={scoopPath(s.cx, s.cy, s.r)}
              initial={false}
              animate={{ fill: flavors[i] ?? flavors[0] }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
            />
            <path d={scoopPath(s.cx, s.cy, s.r)} fill={`url(#shine-${id})`} />
            <ellipse cx={s.cx + s.r * 0.38} cy={s.cy + s.r * 0.08} rx={s.r * 0.5} ry={s.r * 0.3} fill="#000" opacity="0.06" />
            <ellipse
              cx={s.cx - s.r * 0.42}
              cy={s.cy - s.r * 0.42}
              rx={s.r * 0.2}
              ry={s.r * 0.1}
              transform={`rotate(-35 ${s.cx - s.r * 0.42} ${s.cy - s.r * 0.42})`}
              fill="#fff"
              opacity="0.7"
            />
          </motion.g>
        ))}
      </AnimatePresence>

      {/* calda */}
      <AnimatePresence>
        {sauce && (
          <motion.path
            key={`sauce-${visible.length}`}
            d={saucePath(top.cx, top.cy, top.r)}
            initial={{ scaleY: 0, opacity: 0 }}
            animate={{ scaleY: 1, opacity: 1, fill: sauce }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: `${top.cx}px ${top.cy - top.r}px` }}
          />
        )}
      </AnimatePresence>

      {/* confeitos */}
      <AnimatePresence>
        {sprinkles &&
          SPRINKLES.map((p, i) => (
            <motion.rect
              key={`sp-${visible.length}-${i}`}
              x={top.cx + p.x * top.r - 6}
              y={top.cy + p.y * top.r - 2}
              width="12"
              height="4.5"
              rx="2.25"
              fill={p.c}
              transform={`rotate(${p.r} ${top.cx + p.x * top.r} ${top.cy + p.y * top.r})`}
              initial={{ opacity: 0, y: -40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: i * 0.04, type: "spring", stiffness: 300, damping: 16 }}
            />
          ))}
      </AnimatePresence>

      {/* morango no topo */}
      <AnimatePresence>
        {topper && (
          <motion.g
            key={`top-${visible.length}`}
            initial={{ y: -120, opacity: 0, rotate: -30 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: -80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 12 }}
            style={{ transformOrigin: `${top.cx}px ${top.cy - top.r}px` }}
          >
            <g transform={`translate(${top.cx + 4} ${top.cy - top.r - 16})`}>
              <Strawberry />
            </g>
          </motion.g>
        )}
      </AnimatePresence>
    </svg>
  );
}

export function Strawberry() {
  return (
    <g>
      <path d="M0 -16 C16 -18 23 -4 16 9 C10 20 3 25 0 25 C-3 25 -10 20 -16 9 C-23 -4 -16 -18 0 -16 Z" fill="#E8394B" />
      <path d="M-8 -12 C-14 -8 -15 0 -12 6" stroke="#fff" strokeOpacity=".35" strokeWidth="3" fill="none" strokeLinecap="round" />
      {[[-6, -4], [5, -6], [9, 4], [-9, 6], [0, 12], [3, 0], [-3, 18]].map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx="1.4" ry="2" fill="#FFE08A" />
      ))}
      <path d="M0 -16 L-12 -24 L-4 -17 L-8 -28 L0 -18 L8 -28 L4 -17 L12 -24 Z" fill="#3FA34D" />
      <rect x="-1.5" y="-34" width="3" height="10" rx="1.5" fill="#2E7D3A" />
    </g>
  );
}
