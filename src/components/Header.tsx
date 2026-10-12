"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { navLinks, whatsappUrl } from "@/data/business";
import { Logo } from "./Logo";
import { WhatsAppIcon } from "./icons";
import { MobileMenu } from "./MobileMenu";
import { cn } from "@/lib/utils";
import { ease } from "@/lib/animations";

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const solid = scrolled && !open;

  return (
    <>
      <motion.header
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease }}
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,backdrop-filter] duration-300",
          solid ? "bg-white/85 shadow-[0_6px_24px_-14px_rgb(16_77_114/0.35)] backdrop-blur-md" : "bg-transparent",
        )}
      >
        <div className="container-x flex h-[var(--header-h)] items-center justify-between gap-6">
          <a href="#inicio" aria-label="Berry's — voltar ao início">
            <Logo tone={open ? "light" : "dark"} />
          </a>

          <nav aria-label="Principal" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {navLinks.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    className={cn(
                      "group relative rounded-lg px-3.5 py-2 text-[0.92rem] font-medium transition-colors duration-300",
                      "text-ink/80 hover:text-berry-deep",
                    )}
                  >
                    {l.label}
                    <span className="absolute inset-x-3.5 bottom-1 h-px origin-left scale-x-0 bg-current transition-transform duration-300 ease-out-soft group-hover:scale-x-100" />
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            <a
              href={whatsappUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "group hidden items-center gap-2 rounded-[12px] px-4 py-2.5 font-display text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 sm:inline-flex",
                "bg-berry-deep text-white hover:bg-navy",
              )}
            >
              <WhatsAppIcon className="size-[18px] transition-transform duration-300 group-hover:rotate-[-10deg] group-hover:scale-110" />
              Falar no WhatsApp
            </a>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="menu-mobile"
              aria-label={open ? "Fechar menu" : "Abrir menu"}
              className={cn(
                "relative z-[60] grid size-11 place-items-center rounded-xl transition-colors lg:hidden",
                open ? "on-dark text-white" : "text-navy hover:bg-mist",
              )}
            >
              <span className="relative block h-3.5 w-6" aria-hidden="true">
                <span className={cn("absolute left-0 top-0 h-0.5 w-6 rounded bg-current transition-transform duration-300", open && "translate-y-[6px] rotate-45")} />
                <span className={cn("absolute left-0 top-[6px] h-0.5 w-6 rounded bg-current transition-opacity duration-200", open && "opacity-0")} />
                <span className={cn("absolute left-0 top-3 h-0.5 w-6 rounded bg-current transition-transform duration-300", open && "-translate-y-[6px] -rotate-45")} />
              </span>
            </button>
          </div>
        </div>
      </motion.header>
      <MobileMenu open={open} onClose={() => setOpen(false)} />
    </>
  );
}
