"use client";

import Image from "next/image";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { gallery } from "@/data/gallery";
import { GalleryLightbox } from "./GalleryLightbox";
import { cn } from "@/lib/utils";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function Gallery() {
  const [index, setIndex] = useState<number | null>(null);
  const lastTrigger = useRef<HTMLButtonElement | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [distance, setDistance] = useState(0);
  const [desktop, setDesktop] = useState(false);

  // Cursor "VER" — somente com mouse
  const [fine, setFine] = useState(false);
  const [hover, setHover] = useState(false);
  const cx = useMotionValue(0);
  const cy = useMotionValue(0);
  const sx = useSpring(cx, { stiffness: 400, damping: 35 });
  const sy = useSpring(cy, { stiffness: 400, damping: 35 });

  useIsoLayoutEffect(() => {
    const mqFine = window.matchMedia("(pointer: fine) and (hover: hover)");
    const mqDesk = window.matchMedia("(min-width: 1024px)");
    const measure = () => {
      setFine(mqFine.matches);
      setDesktop(mqDesk.matches);
      if (trackRef.current) setDistance(Math.max(0, trackRef.current.scrollWidth - window.innerWidth));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const horizontal = desktop && !reduce;
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
  const x = useTransform(scrollYProgress, [0.05, 0.95], [0, -distance]);

  const close = useCallback(() => {
    setIndex(null);
    lastTrigger.current?.focus();
  }, []);

  return (
    <section
      id="galeria"
      ref={sectionRef}
      aria-labelledby="gallery-title"
      className="relative bg-white"
      style={horizontal ? { height: `calc(100vh + ${distance}px)` } : undefined}
      onPointerMove={(e) => {
        cx.set(e.clientX);
        cy.set(e.clientY);
      }}
    >
      <div className={cn(horizontal ? "sticky top-0 flex h-screen flex-col justify-center overflow-hidden" : "py-24 md:py-32")}>
        <div className="container-x flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-script text-2xl text-berry-deep sm:text-3xl">vem dar uma olhada</p>
            <h2 id="gallery-title" className="mt-1 text-4xl font-extrabold leading-[1.05] text-navy sm:text-5xl">
              Um pouco da experiência Berry&apos;s
            </h2>
          </div>
          <p className="max-w-xs text-ink/70">
            {horizontal ? "Continue rolando para passear pela loja. Clique para ampliar." : "Deslize para o lado e toque para ampliar."}
          </p>
        </div>

        <motion.div
          ref={trackRef}
          style={horizontal ? { x } : undefined}
          className={cn(
            "mt-10 flex gap-4 px-5 md:px-8 lg:gap-6",
            horizontal ? "w-max lg:px-[max(2rem,calc((100vw-1240px)/2+2rem))]" : "no-scrollbar snap-x snap-mandatory overflow-x-auto pb-4",
          )}
        >
          {gallery.map((item, i) => (
            <motion.div
              key={item.src}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.7, delay: (i % 3) * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                "shrink-0 snap-center",
                i % 2 ? "w-[72vw] sm:w-[44vw] lg:mt-16 lg:w-[30vw] lg:max-w-[420px]" : "w-[78vw] sm:w-[50vw] lg:w-[36vw] lg:max-w-[520px]",
              )}
            >
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
                  "group relative block w-full overflow-hidden rounded-[28px] bg-mist shadow-soft",
                  i % 2 ? "aspect-[4/5]" : "aspect-[5/4]",
                  fine && "cursor-none",
                )}
              >
                <Image
                  src={item.src}
                  alt={item.alt}
                  fill
                  sizes="(min-width: 1024px) 36vw, 80vw"
                  className="object-cover transition-transform duration-700 ease-out-soft group-hover:scale-[1.07]"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-navy/75 via-navy/0 to-transparent" />
                <span className="absolute bottom-5 left-5 flex items-center gap-3 font-display text-base font-bold text-white">
                  <span className="grid size-8 place-items-center rounded-full bg-white/20 text-xs backdrop-blur">{String(i + 1).padStart(2, "0")}</span>
                  {item.caption}
                </span>
              </button>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {fine && (
        <motion.div
          aria-hidden="true"
          style={{ x: sx, y: sy }}
          animate={{ scale: hover && index === null ? 1 : 0, opacity: hover && index === null ? 1 : 0 }}
          transition={{ duration: 0.25 }}
          className="pointer-events-none fixed left-0 top-0 z-40 -ml-11 -mt-11 grid size-22 place-items-center rounded-full bg-berry font-display text-xs font-extrabold tracking-[0.2em] text-white shadow-lift"
        >
          VER
        </motion.div>
      )}

      <GalleryLightbox items={gallery} index={index} onClose={close} onChange={setIndex} />
    </section>
  );
}
