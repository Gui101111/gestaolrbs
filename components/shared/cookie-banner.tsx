"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Cookie } from "lucide-react";
import { landing } from "@/content/landing";
import { ROUTES } from "@/lib/routes";

const KEY = "tribuna-cookie-consent";

/** Pílula pequena no canto inferior direito. */
export function CookieBanner() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(KEY);
    } catch {
      stored = null;
    }
    if (!stored) {
      const t = window.setTimeout(() => setVisible(true), 2500);
      return () => window.clearTimeout(t);
    }
  }, []);

  const accept = () => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify({ value: "essential", at: new Date().toISOString() }));
    } catch {
      /* armazenamento indisponível: apenas fecha */
    }
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="region"
          aria-label="Aviso de cookies"
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.96 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="glass-strong fixed right-[max(12px,env(safe-area-inset-right,0px))] bottom-[calc(env(safe-area-inset-bottom,0px)+12px)] z-50 flex items-center gap-2 rounded-full py-1.5 pr-1.5 pl-3 text-xs text-fg-2 shadow-[var(--shadow-pop)]"
        >
          <Cookie className="size-4 shrink-0 text-gold" />
          <span>{landing.cookies.text}</span>
          <Link href={ROUTES.privacy} className="font-semibold text-fg underline-offset-4 hover:underline">
            {landing.cookies.more}
          </Link>
          <button
            type="button"
            onClick={accept}
            className="rounded-full bg-gold px-3 py-1.5 text-xs font-bold text-[#1a1306] transition hover:brightness-110"
          >
            {landing.cookies.accept}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
