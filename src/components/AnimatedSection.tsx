"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { fadeUp, stagger, maskLine, viewportOnce } from "@/lib/animations";

/** Container que dispara stagger nos filhos <Reveal> quando entra no viewport. */
export function AnimatedSection({
  children,
  delay = 0,
  gap = 0.12,
  ...rest
}: { children: React.ReactNode; delay?: number; gap?: number } & HTMLMotionProps<"div">) {
  return (
    <motion.div initial="hidden" whileInView="show" viewport={viewportOnce} variants={stagger(gap, delay)} {...rest}>
      {children}
    </motion.div>
  );
}

export function Reveal({
  children,
  as = "div",
  ...rest
}: { children: React.ReactNode; as?: "div" | "li" } & HTMLMotionProps<"div">) {
  if (as === "li") {
    return (
      <motion.li variants={fadeUp} className={rest.className}>
        {children}
      </motion.li>
    );
  }
  return (
    <motion.div variants={fadeUp} {...rest}>
      {children}
    </motion.div>
  );
}

/** Título com revelação por máscara, linha a linha. */
export function MaskTitle({
  lines,
  as: Tag = "h2",
  className,
}: {
  lines: string[];
  as?: "h1" | "h2" | "h3";
  className?: string;
}) {
  return (
    <Tag className={className}>
      <span className="sr-only">{lines.join(" ")}</span>
      <motion.span aria-hidden="true" className="block" variants={stagger(0.1)}>
        {lines.map((line) => (
          <span key={line} className="block overflow-hidden pb-[0.08em]">
            <motion.span className="block" variants={maskLine}>
              {line}
            </motion.span>
          </span>
        ))}
      </motion.span>
    </Tag>
  );
}
