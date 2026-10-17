"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { ArrowRight, Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { openExploreTab } from "@/components/landing/explore-events";
import { landing, type ExploreTabId } from "@/content/landing";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Pílula de vidro flutuante que encolhe ao rolar. */
export function SiteHeader({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  const { scrollY } = useScroll();
  const [compact, setCompact] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  useMotionValueEvent(scrollY, "change", (y) => setCompact(y > 40));

  const go = (tab: ExploreTabId) => (e: React.MouseEvent) => {
    e.preventDefault();
    setOpen(false);
    if (!openExploreTab(tab)) router.push(`/#${tab}`);
  };

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-[calc(env(safe-area-inset-top,0px)+12px)] md:px-5">
      <motion.nav
        aria-label="Navegação principal"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0, maxWidth: compact ? 860 : 1120 }}
        transition={{ duration: 0.8, ease: EASE }}
        className={cn(
          "glass-strong pointer-events-auto flex w-full items-center gap-2 rounded-full pr-2 pl-4 transition-[padding,box-shadow] duration-500 ease-[var(--ease-luxe)]",
          compact ? "py-1.5 shadow-[var(--shadow-pop)]" : "py-2.5",
        )}
      >
        <Logo className="shrink-0" />

        <div className="mx-auto hidden items-center gap-1 md:flex">
          {landing.nav.map((l) => (
            <a
              key={l.tab}
              href={`/#${l.tab}`}
              onClick={go(l.tab)}
              className="rounded-full px-4 py-2 text-[0.8125rem] font-medium text-fg-2 transition-colors duration-300 hover:bg-fg/[0.06] hover:text-fg"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1.5 md:ml-0">
          {isAuthenticated ? (
            <Button asChild variant="gold" size="sm">
              <Link href={ROUTES.app}>
                Abrir app <ArrowRight />
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href={ROUTES.login}>Entrar</Link>
              </Button>
              <Button asChild variant="gold" size="sm">
                <Link href={ROUTES.register}>Começar</Link>
              </Button>
            </>
          )}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="menu-mobile"
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            className="grid size-9 place-items-center rounded-full text-fg-2 transition hover:bg-fg/[0.08] hover:text-fg md:hidden"
          >
            {open ? <X className="size-4.5" /> : <Menu className="size-4.5" />}
          </button>
        </div>
      </motion.nav>

      <AnimatePresence>
        {open && (
          <motion.div
            id="menu-mobile"
            initial={{ opacity: 0, y: -10, scale: 0.98, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -8, scale: 0.98, filter: "blur(6px)" }}
            transition={{ duration: 0.35, ease: EASE }}
            className="glass-strong pointer-events-auto absolute inset-x-3 top-[calc(env(safe-area-inset-top,0px)+72px)] rounded-3xl p-2 shadow-[var(--shadow-pop)] md:hidden"
          >
            {landing.nav.map((l) => (
              <a
                key={l.tab}
                href={`/#${l.tab}`}
                onClick={go(l.tab)}
                className="block rounded-2xl px-4 py-3 text-[0.9375rem] font-medium text-fg transition hover:bg-fg/[0.06]"
              >
                {l.label}
              </a>
            ))}
            {!isAuthenticated && (
              <Link
                href={ROUTES.login}
                onClick={() => setOpen(false)}
                className="block rounded-2xl px-4 py-3 text-[0.9375rem] font-medium text-fg-2 transition hover:bg-fg/[0.06] hover:text-fg"
              >
                Entrar
              </Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
