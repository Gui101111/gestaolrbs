"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { business, navLinks, whatsappUrl } from "@/data/business";
import { InstagramIcon, WhatsAppIcon } from "./icons";
import { Logo } from "./Logo";
import { Spot } from "./Blobs";
import { ease } from "@/lib/animations";

export function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    panelRef.current?.querySelector<HTMLElement>("a")?.focus();
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          id="menu-mobile"
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          initial={{ clipPath: "circle(0% at calc(100% - 42px) 38px)" }}
          animate={{ clipPath: "circle(150% at calc(100% - 42px) 38px)" }}
          exit={{ clipPath: "circle(0% at calc(100% - 42px) 38px)" }}
          transition={{ duration: 0.55, ease }}
          className="on-dark fixed inset-0 z-[55] flex flex-col overflow-y-auto bg-berry-deep text-white lg:hidden"
        >
          <Spot className="absolute -right-24 top-24 size-72 text-white/10" variant={1} />
          <Spot className="absolute -left-20 bottom-10 size-64 text-navy/40" variant={2} />

          <div className="container-x flex h-[var(--header-h)] shrink-0 items-center">
            <a href="#inicio" onClick={onClose} aria-label="Berry's — voltar ao início">
              <Logo tone="light" />
            </a>
          </div>

          <nav aria-label="Menu mobile" className="container-x relative flex flex-1 flex-col justify-center py-8">
            <motion.ul
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.06, delayChildren: 0.15 } } }}
              className="space-y-1"
            >
              {navLinks.map((l, i) => (
                <motion.li
                  key={l.href}
                  variants={{ hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0, transition: { duration: 0.5, ease } } }}
                >
                  <a
                    href={l.href}
                    onClick={onClose}
                    className="flex items-baseline gap-4 py-2 font-display text-[2.1rem] font-extrabold tracking-tight transition-opacity hover:opacity-75"
                  >
                    <span className="text-xs font-semibold tracking-widest text-white/60">0{i + 1}</span>
                    {l.label}
                  </a>
                </motion.li>
              ))}
            </motion.ul>
          </nav>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.45, duration: 0.5, ease } }}
            className="container-x relative space-y-3 pb-10"
          >
            <a
              href={whatsappUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-14 items-center justify-center gap-2.5 rounded-[14px] bg-white font-display font-bold text-navy"
            >
              <WhatsAppIcon className="size-5" /> Falar no WhatsApp
            </a>
            <a
              href={business.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-14 items-center justify-center gap-2.5 rounded-[14px] border border-white/40 font-display font-bold"
            >
              <InstagramIcon className="size-5" /> {business.instagram}
            </a>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
