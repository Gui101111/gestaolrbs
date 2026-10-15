"use client";

import * as React from "react";
import { motion, useReducedMotion, type HTMLMotionProps, type Variants } from "motion/react";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

type RevealProps = HTMLMotionProps<"div"> & {
  delay?: number;
  y?: number;
  blur?: number;
  once?: boolean;
  amount?: number;
  as?: "div" | "section" | "li" | "article" | "header" | "span";
};

/** Fade + blur + leve subida quando entra no viewport. */
export function Reveal({ children, className, delay = 0, y = 28, blur = 10, once = true, amount = 0.25, as = "div", ...props }: RevealProps) {
  const reduce = useReducedMotion();
  const Comp = motion[as] as typeof motion.div;
  return (
    <Comp
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y, filter: `blur(${blur}px)` }}
      whileInView={reduce ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once, amount }}
      transition={{ duration: reduce ? 0.3 : 1.1, delay, ease: EASE }}
      {...props}
    >
      {children}
    </Comp>
  );
}

const staggerParent: Variants = {
  hidden: {},
  show: (stagger: number = 0.09) => ({ transition: { staggerChildren: stagger, delayChildren: 0.05 } }),
};

const staggerChild: Variants = {
  hidden: { opacity: 0, y: 26, filter: "blur(8px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.95, ease: EASE } },
};

const staggerChildReduced: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.3 } },
};

/** Container que revela seus filhos <StaggerItem> em sequência. */
export function Stagger({
  children,
  className,
  stagger = 0.09,
  amount = 0.2,
  ...props
}: HTMLMotionProps<"div"> & { stagger?: number; amount?: number }) {
  return (
    <motion.div
      className={className}
      variants={staggerParent}
      custom={stagger}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className, ...props }: HTMLMotionProps<"div">) {
  const reduce = useReducedMotion();
  return (
    <motion.div className={cn(className)} variants={reduce ? staggerChildReduced : staggerChild} {...props}>
      {children}
    </motion.div>
  );
}

/** Revelação por máscara (clip-path) — ideal para imagens e blocos. */
export function ClipReveal({
  children,
  className,
  delay = 0,
  direction = "up",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "left";
}) {
  const reduce = useReducedMotion();
  const from = direction === "up" ? "inset(100% 0% 0% 0%)" : "inset(0% 100% 0% 0%)";
  return (
    <motion.div
      className={className}
      initial={reduce ? { opacity: 0 } : { clipPath: from, opacity: 0.4 }}
      whileInView={reduce ? { opacity: 1 } : { clipPath: "inset(0% 0% 0% 0%)", opacity: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 1.4, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}
