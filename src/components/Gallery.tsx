"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { gallery } from "@/data/gallery";
import { AnimatedSection, MaskTitle, Reveal } from "./AnimatedSection";
import { GalleryLightbox } from "./GalleryLightbox";
import { cn } from "@/lib/utils";

export function Gallery() {
  const [index, setIndex] = useState<number | null>(null);
  const lastTrigger = useRef<HTMLButtonElement | null>(null);

  // Cursor "VER" — somente desktop com ponteiro fino
  const [fine, setFine] = useState(false);
  const [hover, setHover] = useState(false);
  const cx = useMotionValue(0);
  const cy = useMotionValue(0);
  const sx = useSpring(cx, { stiffness: 400, damping: 35 });
  const sy = useSpring(cy, { stiffness: 400, damping: 35 });

  useEffect(() => {
    const mq = window.matchMedia("(pointer: fine) and (hover: hover)");
    setFine(mq.matches);
  }, []);

  const close = useCallback(() => {
    setIndex(null);
    lastTrigger.current?.focus();
  }, []);

  return (
    <section id="galeria" aria-labelledby="gallery-title" className="bg-white py-24 md:py-32">
      <div className="container-x">
        <AnimatedSection className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <Reveal>
              <p className="eyebrow text-berry-deep">Galeria</p>
            </Reveal>
            <MaskTitle
              lines={["Um pouco da", "experiência Berry's"]}
              className="mt-4 text-4xl font-extrabold leading-[1.05] text-navy sm:text-5xl"
            />
          </div>
          <Reveal>
            <p className="max-w-sm text-ink/70">Toque em uma foto para ver em tamanho maior.</p>
          </Reveal>
        </AnimatedSection>

        <div
          className="relative mt-12"
          onPointerMove={(e) => {
            cx.set(e.clientX);
            cy.set(e.clientY);
          }}
        >
          <AnimatedSection
            gap={0.08}
            className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 md:mx-0 md:grid md:auto-rows-[220px] md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0 lg:auto-rows-[240px] lg:grid-cols-4"
          >
            {gallery.map((item, i) => (
              <Reveal key={item.src} className={cn("w-[78%] shrink-0 snap-center sm:w-[46%] md:w-auto", item.layout)}>
                <button
                  type="button"
                  onClick={(e) => {
                    lastTrigger.current = e.currentTarget;
                    setIndex(i);
                  }}
                  onPointerEnter={() => setHover(true)}
                  onPointerLeave={() => setHover(false)}
                  aria-label={`Ampliar foto: ${item.caption}`}
                  className={cn(
                    "group relative block aspect-[4/5] w-full overflow-hidden rounded-[24px] bg-mist md:aspect-auto md:h-full",
                    fine && "md:cursor-none",
                  )}
                >
                  <Image
                    src={item.src}
                    alt={item.alt}
                    fill
                    sizes="(min-width: 1024px) 40vw, (min-width: 768px) 50vw, 80vw"
                    className="object-cover transition-transform duration-700 ease-out-soft group-hover:scale-[1.06]"
                  />
                  <span className="absolute inset-0 bg-gradient-to-t from-navy/70 via-transparent to-transparent opacity-80 transition-opacity duration-500 group-hover:opacity-100" />
                  <span className="absolute bottom-4 left-4 font-display text-sm font-bold text-white">{item.caption}</span>
                </button>
              </Reveal>
            ))}
          </AnimatedSection>
        </div>
      </div>

      {fine && (
        <motion.div
          aria-hidden="true"
          style={{ x: sx, y: sy }}
          animate={{ scale: hover && index === null ? 1 : 0, opacity: hover && index === null ? 1 : 0 }}
          transition={{ duration: 0.25 }}
          className="pointer-events-none fixed left-0 top-0 z-40 -ml-10 -mt-10 hidden size-20 place-items-center rounded-full bg-white/90 font-display text-xs font-extrabold tracking-[0.2em] text-navy shadow-lift backdrop-blur md:grid"
        >
          VER
        </motion.div>
      )}

      <GalleryLightbox items={gallery} index={index} onClose={close} onChange={setIndex} />
    </section>
  );
}
