"use client";

import { motion } from "motion/react";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Check que se desenha com brilho, ao enviar para edição. */
export function SuccessOverlay() {
  return (
    <motion.div
      className="fixed inset-0 z-[80] grid place-items-center bg-canvas/90 backdrop-blur-xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="status"
      aria-live="assertive"
    >
      <div className="text-center">
        <motion.div
          className="relative mx-auto grid size-32 place-items-center"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 160, damping: 14 }}
        >
          <motion.span
            className="absolute inset-0 rounded-full bg-cyan/25 blur-2xl"
            animate={{ scale: [1, 1.25, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.8, repeat: Infinity }}
          />
          <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90 overflow-visible">
            <defs>
              <linearGradient id="ok-ring" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" style={{ stopColor: "var(--cyan)" }} />
                <stop offset="1" style={{ stopColor: "var(--gold)" }} />
              </linearGradient>
            </defs>
            <motion.circle cx="50" cy="50" r="46" fill="none" stroke="url(#ok-ring)" strokeWidth="2.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, ease: EASE }} />
          </svg>
          <svg viewBox="0 0 24 24" className="relative size-12 overflow-visible text-cyan" fill="none">
            <motion.path
              d="M4.5 12.5l4.8 4.8L19.5 7"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ filter: "drop-shadow(0 0 6px var(--cyan))" }}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, delay: 0.75, ease: EASE }}
            />
          </svg>
        </motion.div>
        <motion.h2 className="mt-8 text-3xl text-fg md:text-4xl" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          Enviado para <em>edição</em>.
        </motion.h2>
        <motion.p className="mt-3 text-fg-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}>
          Abrindo o acompanhamento da edição…
        </motion.p>
      </div>
    </motion.div>
  );
}
