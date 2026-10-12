"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { GalleryItem } from "@/data/gallery";
import { ease } from "@/lib/animations";

export function GalleryLightbox({
  items,
  index,
  onClose,
  onChange,
}: {
  items: GalleryItem[];
  index: number | null;
  onClose: () => void;
  onChange: (i: number) => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const open = index !== null;
  const prev = () => index !== null && onChange((index - 1 + items.length) % items.length);
  const next = () => index !== null && onChange((index + 1) % items.length);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLElement>("[data-close]")?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
      if (e.key === "Tab" && dialogRef.current) {
        const f = dialogRef.current.querySelectorAll<HTMLElement>("button");
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index]);

  const item = index !== null ? items[index] : null;

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={`Foto ${index! + 1} de ${items.length}: ${item.caption}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="on-dark fixed inset-0 z-[70] flex items-center justify-center bg-[#07121a]/92 p-4 backdrop-blur-sm md:p-10"
          onClick={onClose}
        >
          <AnimatePresence mode="wait">
            <motion.figure
              key={item.src}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.4, ease }}
              className="relative flex h-full max-h-[82vh] w-full max-w-5xl flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative flex-1">
                <Image src={item.src} alt={item.alt} fill sizes="100vw" className="rounded-[20px] object-contain" />
              </div>
              <figcaption className="mt-4 text-center text-sm text-white/80">
                {item.caption} · {index! + 1}/{items.length}
              </figcaption>
            </motion.figure>
          </AnimatePresence>

          <button
            data-close
            type="button"
            onClick={onClose}
            aria-label="Fechar galeria"
            className="absolute right-4 top-4 grid size-12 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" /></svg>
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); prev(); }}
            aria-label="Foto anterior"
            className="absolute left-3 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 md:left-6"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m15 6-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); next(); }}
            aria-label="Próxima foto"
            className="absolute right-3 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 md:right-6"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
