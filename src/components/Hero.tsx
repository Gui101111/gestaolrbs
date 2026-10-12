"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { photos } from "@/data/images";
import { ButtonLink } from "./Button";
import { ease } from "@/lib/animations";

const titleLines = ["O seu momento", "fica mais gostoso", "na Berry's."];

function FloatingBlob({
  className,
  depth,
  mx,
  my,
}: {
  className: string;
  depth: number;
  mx: ReturnType<typeof useSpring>;
  my: ReturnType<typeof useSpring>;
}) {
  const x = useTransform(mx, (v) => v * depth);
  const y = useTransform(my, (v) => v * depth);
  return <motion.span aria-hidden="true" style={{ x, y }} className={`pointer-events-none absolute rounded-full ${className}`} />;
}

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const mx = useSpring(rawX, { stiffness: 60, damping: 20 });
  const my = useSpring(rawY, { stiffness: 60, damping: 20 });

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const imgY = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["0%", "12%"]);
  const contentY = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["0%", "18%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  useEffect(() => {
    if (reduce || !window.matchMedia("(pointer: fine)").matches) return;
    const onMove = (e: PointerEvent) => {
      rawX.set((e.clientX / window.innerWidth - 0.5) * 2);
      rawY.set((e.clientY / window.innerHeight - 0.5) * 2);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduce, rawX, rawY]);

  return (
    <section
      id="inicio"
      ref={ref}
      aria-labelledby="hero-title"
      className="relative isolate flex min-h-[88svh] items-end overflow-hidden bg-navy text-white md:min-h-[94svh] lg:items-center"
    >
      <motion.div style={{ y: imgY }} className="absolute inset-0 -z-20">
        <motion.div
          initial={{ scale: reduce ? 1 : 1.04 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.8, ease }}
          className="absolute inset-0"
        >
          <Image src={photos.interior.src} alt={photos.interior.alt} fill priority sizes="100vw" className="object-cover object-center" />
        </motion.div>
      </motion.div>

      {/* Gradiente azul: legibilidade sem escurecer a foto inteira */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-navy/90 via-navy/45 to-navy/10 lg:bg-gradient-to-r lg:from-navy/85 lg:via-berry-deep/40 lg:to-transparent" />
      <div aria-hidden="true" className="absolute inset-x-0 top-0 -z-10 h-40 bg-gradient-to-b from-navy/50 to-transparent" />

      <FloatingBlob mx={mx} my={my} depth={14} className="right-[8%] top-[22%] hidden size-40 bg-berry-light/25 blur-2xl md:block" />
      <FloatingBlob mx={mx} my={my} depth={-10} className="right-[22%] top-[58%] hidden size-5 border border-white/50 md:block" />
      <FloatingBlob mx={mx} my={my} depth={8} className="right-[12%] top-[44%] hidden size-3 bg-white/70 md:block" />
      <FloatingBlob mx={mx} my={my} depth={-6} className="left-[46%] top-[18%] hidden size-2.5 bg-white/60 lg:block" />
      <FloatingBlob mx={mx} my={my} depth={5} className="-left-16 bottom-20 size-56 bg-berry/20 blur-3xl" />

      <motion.div style={{ y: contentY, opacity: contentOpacity }} className="container-x relative pb-24 pt-32 md:pb-28 lg:pb-0 lg:pt-16">
        <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.12, delayChildren: 0.3 } } }} className="max-w-2xl">
          <motion.p
            variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease } } }}
            className="eyebrow inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-white backdrop-blur-sm"
          >
            <span className="size-1.5 rounded-full bg-berry-light" aria-hidden="true" />
            Sorvete artesanal • Porto Seguro
          </motion.p>

          <h1 id="hero-title" className="mt-6 text-[2.55rem] font-extrabold leading-[1.02] sm:text-6xl lg:text-[4.6rem]">
            <span className="sr-only">{titleLines.join(" ")}</span>
            {titleLines.map((line, i) => (
              <span key={line} aria-hidden="true" className="block overflow-hidden pb-[0.06em]">
                <motion.span
                  className={`block ${i === 2 ? "text-berry-light" : ""}`}
                  variants={{ hidden: { y: "105%" }, show: { y: "0%", transition: { duration: 0.95, ease } } }}
                >
                  {line}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.p
            variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } } }}
            className="mt-6 max-w-lg text-base leading-relaxed text-white/90 sm:text-lg"
          >
            Sorvete artesanal, variedade e uma experiência self-service para você montar cada combinação do seu jeito.
          </motion.p>

          <motion.div
            variants={{ show: { transition: { staggerChildren: 0.1 } } }}
            className="mt-9 flex flex-col gap-3 sm:flex-row"
          >
            <motion.div variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease } } }}>
              <ButtonLink href="#a-berrys" variant="white" arrow className="w-full sm:w-auto">
                Conheça a Berry&apos;s
              </ButtonLink>
            </motion.div>
            <motion.div variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease } } }}>
              <ButtonLink href="#localizacao" variant="outline-light" className="w-full sm:w-auto" icon={<PinIcon />}>
                Como chegar
              </ButtonLink>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>

      <motion.a
        href="#experiencia"
        aria-label="Rolar para a próxima seção"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { delay: 1.4, duration: 0.8 } }}
        className="on-dark absolute bottom-7 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.25em] text-white/80 md:flex"
      >
        <span className="relative flex h-10 w-6 justify-center rounded-full border border-white/60 pt-2">
          <span className="animate-scroll-dot block size-1.5 rounded-full bg-white" />
        </span>
        Role
      </motion.a>
    </section>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-[18px]" aria-hidden="true">
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" strokeLinejoin="round" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}
