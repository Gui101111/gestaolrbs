"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";

const KEY = "tribuna-cookie-consent";

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

  const decide = (value: "all" | "essential") => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify({ value, at: new Date().toISOString() }));
    } catch {
      /* armazenamento indisponível: apenas fecha */
    }
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 24, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-[70] md:inset-x-auto md:right-6 md:bottom-6 md:max-w-md"
          role="region"
          aria-label="Aviso de cookies"
        >
          <div className="panel gold-ring rounded-2xl p-5">
            <div className="flex gap-3">
              <Cookie className="mt-0.5 size-5 shrink-0 text-gold" />
              <p className="text-[0.8125rem] leading-relaxed text-mist">
                Usamos cookies essenciais para manter sua sessão segura e, com sua permissão, cookies de desempenho.
                Saiba mais na{" "}
                <Link href="/privacidade" className="text-gold-light underline-offset-4 hover:underline">
                  Política de Privacidade
                </Link>
                .
              </p>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => decide("essential")}>
                Somente essenciais
              </Button>
              <Button variant="gold" size="sm" onClick={() => decide("all")}>
                Aceitar
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
