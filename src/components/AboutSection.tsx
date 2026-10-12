"use client";

import Image from "next/image";
import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { photos } from "@/data/images";
import { AnimatedSection, MaskTitle, Reveal } from "./AnimatedSection";
import { Drip } from "./Drip";

// Mesmo azul do fundo da arte original da vaquinha, para a imagem se fundir à seção
const SKY = "#42B2DC";

const spots = [
  "left-[4%] top-[14%] size-40 rounded-[42%_58%_63%_37%/41%_44%_56%_59%]",
  "right-[8%] top-[8%] size-28 rounded-[63%_37%_54%_46%/55%_48%_52%_45%]",
  "left-[38%] top-[46%] size-20 rounded-[50%_50%_33%_67%/55%_27%_73%_45%]",
  "left-[-4%] bottom-[30%] size-32 rounded-[37%_63%_48%_52%/45%_52%_48%_55%]",
];

export function AboutSection() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const cowY = useTransform(scrollYProgress, [0, 0.6], reduce ? [0, 0] : [120, 0]);
  const spotY = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [-40, 60]);

  return (
    <section
      id="a-berrys"
      ref={ref}
      aria-labelledby="about-title"
      className="relative overflow-hidden text-[#0B3550]"
      style={{ backgroundColor: SKY }}
    >
      <Drip color="#ffffff" />
      {/* manchas de vaca, como na arte da marca */}
      <motion.div style={{ y: spotY }} aria-hidden="true" className="absolute inset-0">
        {spots.map((s) => (
          <span key={s} className={`absolute bg-white/12 ${s}`} />
        ))}
      </motion.div>

      <div className="container-x relative grid items-end gap-6 pt-32 md:pt-40 lg:grid-cols-[1fr_1.1fr] lg:gap-10">
        <AnimatedSection className="pb-10 lg:pb-32">
          <Reveal>
            <p className="font-script text-3xl text-navy sm:text-4xl">uma experiência Berry&apos;s</p>
          </Reveal>
          <MaskTitle
            lines={["De Minas Gerais", "para Porto Seguro."]}
            className="mt-2 text-[2.4rem] font-extrabold leading-[1.02] sm:text-5xl lg:text-[3.6rem]"
          />
          <Reveal>
            <p className="mt-6 max-w-lg text-lg font-medium leading-relaxed">
              Chegamos diretamente de Minas Gerais para adoçar os seus dias com o melhor sorvete artesanal.
            </p>
          </Reveal>
          <Reveal>
            <p className="mt-4 max-w-lg leading-relaxed">
              Aqui, acreditamos que a sua experiência muda absolutamente tudo — e por isso escolhemos o modelo{" "}
              <strong>self-service</strong>.
            </p>
          </Reveal>
          <Reveal>
            <div className="mt-8 inline-flex items-center gap-3 rounded-full bg-white px-5 py-3 font-display text-sm font-bold text-navy shadow-lift">
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-berry opacity-60 [animation-iteration-count:3]" />
                <span className="relative inline-flex size-2.5 rounded-full bg-berry" />
              </span>
              Av. 22 de Abril, Centro – Porto Seguro
            </div>
          </Reveal>
        </AnimatedSection>

        <motion.div style={{ y: cowY }} className="relative -mx-5 md:mx-0">
          <Image
            src={photos.vaquinha.src}
            alt={photos.vaquinha.alt}
            width={photos.vaquinha.width}
            height={photos.vaquinha.height}
            sizes="(min-width: 1024px) 55vw, 100vw"
            className="block h-auto w-full [mask-composite:intersect] [mask-image:linear-gradient(to_bottom,transparent,black_16%),linear-gradient(to_right,transparent,black_12%,black_88%,transparent)] [-webkit-mask-composite:source-in]"
          />
        </motion.div>
      </div>
    </section>
  );
}
