"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { ArrowRight, Menu, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Magnetic } from "@/components/animations/magnetic";
import { cn } from "@/lib/utils";

export const NAV_LINKS = [
  { href: "#produto", label: "Produto" },
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#recursos", label: "Recursos" },
  { href: "#para-advogados", label: "Para advogados" },
  { href: "#planos", label: "Planos" },
];

export function SiteHeader({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState<string | null>(null);
  const pathname = usePathname();
  const onHome = pathname === "/";

  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 24));

  React.useEffect(() => {
    if (!onHome) return;
    const ids = NAV_LINKS.map((l) => l.href.slice(1));
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [onHome]);

  React.useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  const href = (h: string) => (onHome ? h : `/${h}`);

  return (
    <>
      <motion.header
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        className="fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-3 md:px-6 md:pt-4"
      >
        <div
          className={cn(
            "flex w-full max-w-7xl items-center justify-between gap-4 rounded-full border px-4 transition-all duration-700 ease-[var(--ease-luxe)] md:px-6",
            scrolled
              ? "h-14 border-fg/[0.08] bg-ink/70 shadow-[0_20px_40px_-24px_rgba(0,0,0,0.9)] backdrop-blur-xl md:h-16"
              : "h-16 border-transparent bg-transparent md:h-20",
          )}
        >
          <Logo />

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Navegação principal">
            {NAV_LINKS.map((l) => {
              const isActive = active === l.href.slice(1);
              return (
                <Link
                  key={l.href}
                  href={href(l.href)}
                  className={cn(
                    "relative rounded-full px-4 py-2 text-[0.8125rem] font-medium transition-colors duration-300",
                    isActive ? "text-gold-light" : "text-mist hover:text-ivory",
                  )}
                >
                  {l.label}
                  <span
                    className={cn(
                      "absolute inset-x-4 -bottom-0.5 h-px origin-center bg-gradient-to-r from-transparent via-gold to-transparent transition-transform duration-500",
                      isActive ? "scale-x-100" : "scale-x-0",
                    )}
                  />
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            {isAuthenticated ? (
              <Magnetic>
                <Button asChild variant="gold" size="sm" className="h-10 px-5">
                  <Link href="/app">
                    Abrir painel <ArrowRight />
                  </Link>
                </Button>
              </Magnetic>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="h-10">
                  <Link href="/login">Entrar</Link>
                </Button>
                <Magnetic>
                  <Button asChild variant="gold" size="sm" className="h-10 px-5">
                    <Link href="/register">
                      Criar conta <ArrowRight />
                    </Link>
                  </Button>
                </Magnetic>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="grid size-10 place-items-center rounded-full border border-fg/10 text-ivory transition hover:border-gold/40 lg:hidden"
            aria-label="Abrir menu"
            aria-expanded={open}
          >
            <Menu className="size-5" />
          </button>
        </div>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[60] flex flex-col bg-ink/95 backdrop-blur-2xl lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.35 } }}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
          >
            <div className="pointer-events-none absolute inset-0 bg-gold-lines opacity-40" />
            <div className="pointer-events-none absolute -top-40 right-[-20%] size-[480px] rounded-full bg-gold/10 blur-[120px]" />
            <div className="relative flex h-16 items-center justify-between px-7 pt-3">
              <Logo />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid size-10 place-items-center rounded-full border border-fg/10 text-ivory"
                aria-label="Fechar menu"
              >
                <X className="size-5" />
              </button>
            </div>
            <nav className="relative flex flex-1 flex-col justify-center gap-2 px-7">
              {NAV_LINKS.map((l, i) => (
                <motion.div
                  key={l.href}
                  initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ delay: 0.08 + i * 0.07, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Link
                    href={href(l.href)}
                    onClick={() => setOpen(false)}
                    className="group flex items-baseline gap-4 border-b border-fg/[0.06] py-4 font-display text-4xl text-ivory"
                  >
                    <span className="font-sans text-xs tracking-[0.2em] text-gold">0{i + 1}</span>
                    <span className="transition-colors group-hover:text-gold-light">{l.label}</span>
                  </Link>
                </motion.div>
              ))}
            </nav>
            <motion.div
              className="relative grid gap-3 px-7 pb-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
            >
              {isAuthenticated ? (
                <Button asChild variant="gold" size="lg">
                  <Link href="/app">Abrir painel</Link>
                </Button>
              ) : (
                <>
                  <Button asChild variant="gold" size="lg">
                    <Link href="/register">Criar conta</Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href="/login">Entrar</Link>
                  </Button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
