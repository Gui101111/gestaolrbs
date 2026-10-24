"use client";

import { motion } from "motion/react";

const EASE = [0.22, 1, 0.36, 1] as const;

/** "Olá, Ana" com o nome no degradê da marca. */
export function WelcomeTitle({ name }: { name: string }) {
  return (
    <h1 className="relative text-[2.1rem] leading-[1.05] font-extrabold text-balance text-fg sm:text-5xl md:text-[3.6rem]">
      <motion.span
        className="inline-block"
        initial={{ opacity: 0, y: 14, filter: "blur(10px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.8, ease: EASE }}
      >
        Olá{name ? "," : "!"}
      </motion.span>{" "}
      {name && (
        <motion.span
          className="text-brand-gradient animate-shine inline-block"
          initial={{ opacity: 0, y: 14, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.8, delay: 0.15, ease: EASE }}
        >
          {name}
        </motion.span>
      )}
    </h1>
  );
}
