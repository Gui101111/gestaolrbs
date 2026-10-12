"use client";

import Image from "next/image";
import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { photos } from "@/data/images";
import { AnimatedSection, MaskTitle, Reveal } from "./AnimatedSection";
import { ParallaxImage } from "./ParallaxImage";

export function EnvironmentSection() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [15, -15]);

  return (
    <section aria-labelledby="env-title" className="bg-offwhite py-24 md:py-32">
      <div className="container-x grid items-center gap-16 lg:grid-cols-12 lg:gap-12">
        <AnimatedSection className="lg:col-span-5">
          <Reveal>
            <p className="eyebrow text-berry-deep">O ambiente</p>
          </Reveal>
          <MaskTitle
            lines={["Um espaço para", "aproveitar cada", "momento."]}
            className="mt-4 text-4xl font-extrabold leading-[1.05] text-navy sm:text-5xl"
          />
          <Reveal>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-ink/75">
              Um ambiente leve, confortável e cheio da identidade Berry&apos;s, no coração de Porto Seguro.
            </p>
          </Reveal>
          <Reveal>
            <div className="mt-8 flex items-center gap-4 text-sm font-medium text-ink/70">
              <span className="h-px w-12 bg-wood" aria-hidden="true" />
              Madeira, azul e muito sabor
            </div>
          </Reveal>
        </AnimatedSection>

        <div ref={ref} className="relative pb-16 pr-6 sm:pb-20 sm:pr-16 lg:col-span-7">
          <AnimatedSection>
            <Reveal>
              <ParallaxImage
                photo={photos.ambiente}
                sizes="(min-width: 1024px) 55vw, 95vw"
                zoom
                className="aspect-[4/3] rounded-[32px] shadow-lift"
              />
            </Reveal>
          </AnimatedSection>
          <motion.div
            style={{ y }}
            initial={{ opacity: 0, scale: 0.94 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="absolute bottom-0 right-0 w-[46%] overflow-hidden rounded-[24px] border-[6px] border-offwhite shadow-lift"
          >
            <div className="relative aspect-[4/5]">
              <Image src={photos.interior.src} alt="Detalhe do interior da Berry's" fill sizes="(min-width: 1024px) 26vw, 45vw" className="object-cover" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
