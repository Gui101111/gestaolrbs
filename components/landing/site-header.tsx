"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Pílula de vidro flutuante que encolhe ao rolar: logo, Entrar e Criar conta. */
export function SiteHeader({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  const { scrollY } = useScroll();
  const [compact, setCompact] = React.useState(false);

  useMotionValueEvent(scrollY, "change", (y) => setCompact(y > 40));

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-[calc(env(safe-area-inset-top,0px)+12px)] md:px-5">
      <motion.nav
        aria-label="Navegação principal"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0, maxWidth: compact ? 860 : 1120 }}
        transition={{ duration: 0.8, ease: EASE }}
        className={cn(
          "glass-strong pointer-events-auto flex w-full items-center gap-2 rounded-full pr-2 pl-4 transition-[padding,box-shadow] duration-500 ease-[var(--ease-luxe)]",
          compact ? "py-1.5 shadow-[var(--shadow-pop)]" : "py-2",
        )}
      >
        <Logo className="shrink-0 sm:hidden" compact />
        <Logo className="hidden shrink-0 sm:inline-flex" />

        <div className="ml-auto flex items-center gap-1.5">
          {isAuthenticated ? (
            <Button asChild variant="gold" size="sm" className="h-10">
              <Link href={ROUTES.app}>
                Abrir o app <ArrowRight />
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="h-10">
                <Link href={ROUTES.login}>Entrar</Link>
              </Button>
              <Button asChild variant="gold" size="sm" className="h-10">
                <Link href={ROUTES.register}>Criar conta</Link>
              </Button>
            </>
          )}
        </div>
      </motion.nav>
    </header>
  );
}
