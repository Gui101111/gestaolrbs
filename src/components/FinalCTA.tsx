"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { mapsSearchUrl, whatsappUrl } from "@/data/business";
import { combos } from "@/lib/flavors";
import { AnimatedSection, MaskTitle, Reveal } from "./AnimatedSection";
import { ButtonLink } from "./Button";
import { WhatsAppIcon } from "./icons";
import { Spot } from "./Blobs";
import { IceCream } from "./IceCream";

const cones = [
  { className: "left-[3%] bottom-[-6%] h-56 -rotate-12 lg:h-72", offset: 0, count: 2 },
  { className: "right-[4%] bottom-[-8%] h-60 rotate-12 lg:h-80", offset: 1, count: 3 },
  { className: "right-[20%] top-[-10%] hidden h-36 rotate-[160deg] opacity-80 lg:block", offset: 2, count: 1 },
];

export function FinalCTA() {
  const reduce = useReducedMotion();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setTick((v) => v + 1), 2400);
    return () => clearInterval(t);
  }, [reduce]);

  return (
    <section id="contato" aria-labelledby="cta-title" className="bg-white px-4 pb-24 md:px-8 md:pb-32">
      <div className="on-dark relative mx-auto max-w-[1240px] overflow-hidden rounded-[36px] bg-berry-deep px-6 pb-56 pt-20 text-center text-white sm:px-12 md:py-28 lg:py-32">
        <Spot className="absolute -left-16 -top-16 size-64 text-white/10" variant={1} />
        <Spot className="absolute -bottom-20 left-1/3 size-72 text-berry/45" variant={0} />

        {cones.map((c, i) => {
          const combo = combos[(tick + c.offset) % combos.length];
          return (
            <motion.div
              key={i}
              aria-hidden="true"
              className={`pointer-events-none absolute ${c.className}`}
              initial={{ y: 120, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 120, damping: 14, delay: 0.2 + i * 0.15 }}
            >
              <motion.div
                animate={reduce ? undefined : { y: [0, -12, 0], rotate: [0, i % 2 ? 4 : -4, 0] }}
                transition={{ duration: 3.5 + i, repeat: Infinity, ease: "easeInOut" }}
                className="h-full"
              >
                <IceCream flavors={combo.scoops} count={c.count} sauce={combo.sauce} sprinkles={i !== 2} className="h-full w-auto" />
              </motion.div>
            </motion.div>
          );
        })}

        <AnimatedSection className="relative mx-auto max-w-2xl">
          <Reveal>
            <p className="font-script text-3xl sm:text-4xl">bateu vontade?</p>
          </Reveal>
          <MaskTitle
            lines={["Seu próximo sorvete", "pode começar por aqui."]}
            className="mt-3 text-[2.2rem] font-extrabold leading-[1.05] sm:text-5xl lg:text-6xl"
          />
          <Reveal>
            <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
              <ButtonLink href={mapsSearchUrl} external variant="white" arrow>
                Como chegar
              </ButtonLink>
              <ButtonLink href={whatsappUrl()} external variant="outline-light" icon={<WhatsAppIcon className="size-[18px]" />}>
                WhatsApp
              </ButtonLink>
            </div>
          </Reveal>
        </AnimatedSection>
      </div>
    </section>
  );
}
