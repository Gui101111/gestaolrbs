"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { scoopColors as c, sauceColors as s } from "@/lib/flavors";
import { ease } from "@/lib/animations";
import { IceCream } from "./IceCream";
import { cn } from "@/lib/utils";

const steps = [
  { n: "01", title: "Escolha", text: "Passeie pelo balcão e escolha o que der vontade." },
  { n: "02", title: "Combine", text: "Misture sabores, caldas e complementos." },
  { n: "03", title: "Aproveite", text: "Sente, relaxe e curta o seu momento Berry's." },
];

// Cada etapa do scroll monta um pouco mais do sorvete
const stages = [
  { count: 1, flavors: [c.azul, c.rosa, c.creme], sauce: null, sprinkles: false, topper: false, step: 0 },
  { count: 2, flavors: [c.azul, c.rosa, c.creme], sauce: null, sprinkles: false, topper: false, step: 0 },
  { count: 3, flavors: [c.azul, c.rosa, c.creme], sauce: null, sprinkles: false, topper: false, step: 1 },
  { count: 3, flavors: [c.azul, c.rosa, c.morango], sauce: s.chocolate, sprinkles: false, topper: false, step: 1 },
  { count: 3, flavors: [c.azul, c.rosa, c.morango], sauce: s.chocolate, sprinkles: true, topper: false, step: 1 },
  { count: 3, flavors: [c.azul, c.rosa, c.morango], sauce: s.chocolate, sprinkles: true, topper: true, step: 2 },
];

const bgs = ["#EFF7FA", "#E3F3FA", "#FDEFF4", "#FDF3E7", "#EFF7FA", "#E3F3FA"];

export function BuildYourCup() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const [stage, setStage] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const next = Math.min(stages.length - 1, Math.max(0, Math.floor(v * stages.length * 1.05)));
    setStage((prev) => (prev === next ? prev : next));
  });

  const rotate = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [-8, 6]);
  const ringScale = useTransform(scrollYProgress, [0, 1], [0.7, 1.15]);
  const progressW = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  const st = stages[stage];

  return (
    <section id="experiencia" ref={ref} aria-labelledby="build-title" className="relative h-[340vh]">
      <motion.div
        animate={{ backgroundColor: bgs[stage] }}
        transition={{ duration: 0.8 }}
        className="sticky top-0 flex h-svh items-center overflow-hidden"
      >
        <div className="container-x grid h-full grid-rows-[auto_minmax(0,1fr)] items-center gap-2 pt-[var(--header-h)] lg:grid-cols-2 lg:grid-rows-1 lg:gap-16 lg:pt-0">
          <div className="relative z-10 pt-6 lg:pt-0">
            <p className="font-script text-2xl text-berry-deep sm:text-3xl">self-service</p>
            <h2 id="build-title" className="mt-1 text-[2.3rem] font-extrabold leading-[1.02] text-navy sm:text-5xl lg:text-[3.8rem]">
              Seu sorvete.
              <br />
              <span className="text-berry-deep">Do seu jeito.</span>
            </h2>
            <p className="mt-4 hidden max-w-md text-lg leading-relaxed text-ink/75 sm:block">
              Aqui, cada visita pode virar uma combinação diferente. A experiência self-service permite que você escolha,
              combine e monte o seu sorvete como preferir.
            </p>

            <ol className="mt-5 flex gap-2 sm:mt-8 sm:block sm:space-y-3">
              {steps.map((p, i) => {
                const active = st.step === i;
                const done = st.step > i;
                return (
                  <li
                    key={p.n}
                    className={cn(
                      "flex flex-1 items-center gap-2 rounded-[16px] p-2 transition-all duration-500 sm:items-start sm:gap-4 sm:rounded-[18px] sm:p-4",
                      active ? "bg-white shadow-lift" : "bg-transparent",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-8 shrink-0 place-items-center sm:size-10 rounded-full font-display text-sm font-bold transition-colors duration-500",
                        active ? "bg-berry-deep text-white" : done ? "bg-berry/20 text-berry-deep" : "bg-white text-ink/75",
                      )}
                    >
                      {done ? "✓" : p.n}
                    </span>
                    <div>
                      <h3 className={cn("text-sm font-bold transition-colors duration-500 sm:text-xl", active ? "text-navy" : "text-ink/75")}>{p.title}</h3>
                      <AnimatePresence initial={false}>
                        {active && (
                          <motion.p key="d"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.4, ease }}
                            className="hidden overflow-hidden text-sm leading-relaxed text-ink/70 sm:block sm:text-base"
                          >
                            {p.text}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                  </li>
                );
              })}
            </ol>

            <p className="mt-3 text-sm text-ink/70 sm:hidden" aria-hidden="true">{steps[st.step].text}</p>
            <div className="mt-4 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-white" aria-hidden="true">
              <motion.div style={{ width: progressW }} className="h-full rounded-full bg-gradient-to-r from-berry to-berry-deep" />
            </div>
          </div>

          <div className="relative flex h-full min-h-0 items-center justify-center py-4">
            <motion.div
              aria-hidden="true"
              style={{ scale: ringScale }}
              className="absolute aspect-square w-[78%] max-w-[520px] rounded-full bg-white/70"
            />
            <motion.div aria-hidden="true" style={{ scale: ringScale }} className="absolute aspect-square w-[95%] max-w-[640px] rounded-full border-2 border-dashed border-berry/25" />
            <motion.div style={{ rotate }} className="relative h-[92%] max-h-[620px]">
              <IceCream
                flavors={st.flavors}
                count={st.count}
                sauce={st.sauce}
                sprinkles={st.sprinkles}
                topper={st.topper}
                className="h-full w-auto drop-shadow-[0_30px_40px_rgb(11_70_105/0.22)]"
                title="Ilustração de um sorvete sendo montado"
              />
            </motion.div>
            <AnimatePresence mode="wait">
              <motion.span
                key={stage}
                initial={{ opacity: 0, y: 10, rotate: -6 }}
                animate={{ opacity: 1, y: 0, rotate: -6 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35 }}
                className="absolute right-0 top-[10%] rounded-full lg:top-[16%] bg-white px-4 py-2 font-script text-xl text-berry-deep shadow-lift sm:right-[6%] sm:text-2xl"
                aria-live="polite"
              >
                {["1 bola…", "mais uma!", "três!", "+ calda", "+ confeitos", "pronto! 💙"][stage]}
              </motion.span>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
