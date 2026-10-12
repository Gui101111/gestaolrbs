"use client";

import { useEffect, useState } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { business, formatRating } from "@/data/business";
import { combos } from "@/lib/flavors";
import { ease } from "@/lib/animations";
import { ButtonLink } from "./Button";
import { IceCream } from "./IceCream";
import { Blueberry, ChocoChunk, Cherry, Sprinkle, StrawberryIcon, Wafer } from "./Toppings";
import { GoogleIcon } from "./icons";

const titleLines = ["O seu momento", "fica mais gostoso", "na Berry's."];

function Floater({
  children,
  className,
  depth,
  mx,
  my,
  float = 12,
  duration = 5,
  delay = 0,
  rotate = 8,
}: {
  children: React.ReactNode;
  className: string;
  depth: number;
  mx: MotionValue<number>;
  my: MotionValue<number>;
  float?: number;
  duration?: number;
  delay?: number;
  rotate?: number;
}) {
  const reduce = useReducedMotion();
  const x = useTransform(mx, (v) => v * depth);
  const y = useTransform(my, (v) => v * depth);
  return (
    <motion.div style={{ x, y }} className={`pointer-events-none absolute ${className}`} aria-hidden="true">
      <motion.div
        initial={{ opacity: 0, scale: 0.4 }}
        animate={
          reduce
            ? { opacity: 1, scale: 1 }
            : { opacity: 1, scale: 1, y: [0, -float, 0], rotate: [0, rotate, 0] }
        }
        transition={{
          opacity: { delay: 0.8 + delay, duration: 0.6 },
          scale: { delay: 0.8 + delay, type: "spring", stiffness: 200, damping: 14 },
          y: { delay: 1.4 + delay, duration, repeat: Infinity, ease: "easeInOut" },
          rotate: { delay: 1.4 + delay, duration: duration * 1.3, repeat: Infinity, ease: "easeInOut" },
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

export function Hero() {
  const reduce = useReducedMotion();
  const [combo, setCombo] = useState(0);
  const [auto, setAuto] = useState(true);

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const mx = useSpring(rawX, { stiffness: 50, damping: 18 });
  const my = useSpring(rawY, { stiffness: 50, damping: 18 });

  const { scrollY } = useScroll();
  const coneY = useTransform(scrollY, [0, 800], [0, reduce ? 0 : 160]);
  const coneRotate = useTransform(scrollY, [0, 800], [0, reduce ? 0 : 14]);
  const coneScale = useTransform(scrollY, [0, 800], [1, reduce ? 1 : 0.86]);
  const wordX = useTransform(scrollY, [0, 900], ["0%", reduce ? "0%" : "-22%"]);
  const blobRotate = useTransform(scrollY, [0, 900], [0, reduce ? 0 : 25]);

  // Troca de sabor automática
  useEffect(() => {
    if (!auto || reduce) return;
    const t = setInterval(() => setCombo((c) => (c + 1) % combos.length), 2800);
    return () => clearInterval(t);
  }, [auto, reduce]);

  useEffect(() => {
    if (reduce || !window.matchMedia("(pointer: fine)").matches) return;
    const onMove = (e: PointerEvent) => {
      rawX.set((e.clientX / window.innerWidth - 0.5) * 2);
      rawY.set((e.clientY / window.innerHeight - 0.5) * 2);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduce, rawX, rawY]);

  const current = combos[combo];

  return (
    <section
      id="inicio"
      aria-labelledby="hero-title"
      className="relative isolate overflow-hidden bg-offwhite pt-[var(--header-h)]"
    >
      {/* fundo: mancha azul orgânica */}
      <motion.svg
        aria-hidden="true"
        viewBox="0 0 600 600"
        style={{ rotate: blobRotate }}
        className="absolute -right-[30%] top-[38%] -z-10 w-[130%] max-w-none sm:-right-[12%] sm:w-[90%] lg:-right-[8%] lg:top-[-6%] lg:w-[62%]"
      >
        <defs>
          <linearGradient id="hero-blob" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#50C1E8" />
            <stop offset="1" stopColor="#087AA9" />
          </linearGradient>
        </defs>
        <motion.path
          fill="url(#hero-blob)"
          initial={false}
          animate={
            reduce
              ? undefined
              : {
                  d: [
                    "M436,77C495,121,543,191,548,265C553,339,515,417,456,474C397,531,317,567,236,553C155,539,73,475,47,394C21,313,51,215,103,149C155,83,229,49,302,40C375,31,377,33,436,77Z",
                    "M452,96C512,148,549,224,540,299C531,374,476,448,410,500C344,552,267,582,191,557C115,532,40,452,33,366C26,280,87,188,151,127C215,66,282,36,345,44C408,52,392,44,452,96Z",
                    "M436,77C495,121,543,191,548,265C553,339,515,417,456,474C397,531,317,567,236,553C155,539,73,475,47,394C21,313,51,215,103,149C155,83,229,49,302,40C375,31,377,33,436,77Z",
                  ],
                }
          }
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          d="M436,77C495,121,543,191,548,265C553,339,515,417,456,474C397,531,317,567,236,553C155,539,73,475,47,394C21,313,51,215,103,149C155,83,229,49,302,40C375,31,377,33,436,77Z"
        />
      </motion.svg>
      {/* manchas de vaquinha */}
      <span aria-hidden="true" className="absolute right-[6%] top-[18%] -z-10 hidden size-24 rounded-[48%_52%_40%_60%] bg-white/25 lg:block" />
      <span aria-hidden="true" className="absolute bottom-[14%] right-[38%] -z-10 hidden size-14 rounded-[60%_40%_55%_45%] bg-navy/20 lg:block" />

      {/* palavra gigante de fundo */}
      <motion.p
        aria-hidden="true"
        style={{ x: wordX }}
        className="pointer-events-none absolute bottom-[4%] left-0 -z-10 select-none whitespace-nowrap font-display text-[26vw] font-extrabold leading-none tracking-tighter text-transparent [-webkit-text-stroke:2px_rgb(37_169_214/0.18)] lg:bottom-[2%] lg:text-[17vw]"
      >
        SORVETE • SORVETE
      </motion.p>

      <div className="container-x grid min-h-[calc(100svh-var(--header-h))] items-center gap-4 pb-16 pt-6 lg:grid-cols-[1.15fr_1fr] lg:pb-10">
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } } }}
          className="relative z-10 max-w-2xl"
        >
          <motion.p
            variants={{ hidden: { opacity: 0, y: 12, rotate: -4 }, show: { opacity: 1, y: 0, rotate: -4, transition: { duration: 0.6, ease } } }}
            className="font-script text-[1.9rem] leading-none text-berry-deep sm:text-[2.3rem]"
          >
            #loucos por sorvete
          </motion.p>

          <h1 id="hero-title" className="mt-4 text-[2.6rem] font-extrabold leading-[0.98] text-navy sm:text-6xl lg:text-[3.9rem] xl:text-[4.4rem]">
            <span className="sr-only">{titleLines.join(" ")}</span>
            {titleLines.map((line, i) => (
              <span key={line} aria-hidden="true" className="block overflow-hidden pb-[0.07em]">
                <motion.span
                  className={`block ${i === 2 ? "text-berry-deep" : ""}`}
                  variants={{ hidden: { y: "110%", rotate: 4 }, show: { y: "0%", rotate: 0, transition: { duration: 0.95, ease } } }}
                >
                  {line}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.p
            variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } } }}
            className="mt-6 max-w-md text-base leading-relaxed text-ink/75 sm:text-lg"
          >
            Sorvete artesanal, variedade e uma experiência self-service para você montar cada combinação do seu jeito.
          </motion.p>

          <motion.div
            variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease } } }}
            className="mt-8 flex flex-col gap-3 sm:flex-row"
          >
            <ButtonLink href="#a-berrys" variant="primary" arrow className="w-full sm:w-auto">
              Conheça a Berry&apos;s
            </ButtonLink>
            <ButtonLink href="#localizacao" variant="outline" className="w-full bg-white/70 sm:w-auto">
              Como chegar
            </ButtonLink>
          </motion.div>

          <motion.ul
            variants={{ show: { transition: { staggerChildren: 0.08 } } }}
            className="mt-6 flex flex-wrap gap-2 sm:mt-8 sm:gap-2.5"
          >
            {[
              { icon: <GoogleIcon className="size-4" />, text: `${formatRating(business.rating)} no Google` },
              { icon: <span className="text-berry-deep">✦</span>, text: "Self-service" },
              { icon: <span className="text-berry-deep">✦</span>, text: "Sorvete artesanal" },
            ].map((b) => (
              <motion.li
                key={b.text}
                variants={{ hidden: { opacity: 0, scale: 0.8 }, show: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 260, damping: 18 } } }}
                className="flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-sm font-semibold text-navy shadow-soft"
              >
                {b.icon}
                {b.text}
              </motion.li>
            ))}
          </motion.ul>
        </motion.div>

        {/* sorvete */}
        <div className="relative mx-auto -mt-4 h-[380px] w-full max-w-[460px] sm:h-[520px] lg:mt-0 lg:h-[640px] lg:max-w-none">
          <Floater mx={mx} my={my} depth={-22} className="left-[4%] top-[18%] w-10 sm:w-14" duration={4.5}>
            <StrawberryIcon className="w-full" />
          </Floater>
          <Floater mx={mx} my={my} depth={18} className="right-[6%] top-[12%] w-8 sm:w-10" duration={5.5} delay={0.2}>
            <Blueberry className="w-full" />
          </Floater>
          <Floater mx={mx} my={my} depth={-14} className="right-[2%] top-[52%] w-6 sm:w-8" duration={4} delay={0.3} rotate={-20}>
            <Wafer className="w-full rotate-[30deg]" />
          </Floater>
          <Floater mx={mx} my={my} depth={26} className="left-[10%] top-[62%] w-9 sm:w-11" duration={6} delay={0.1}>
            <ChocoChunk className="w-full" />
          </Floater>
          <Floater mx={mx} my={my} depth={12} className="left-[22%] top-[6%] w-7" duration={4.2} delay={0.4} rotate={40}>
            <Sprinkle className="w-full" color="#FFD873" />
          </Floater>
          <Floater mx={mx} my={my} depth={-30} className="right-[22%] top-[4%] w-6" duration={3.8} delay={0.5} rotate={-50}>
            <Sprinkle className="w-full" color="#ffffff" />
          </Floater>
          <Floater mx={mx} my={my} depth={20} className="bottom-[16%] right-[14%] w-8 sm:w-10" duration={5} delay={0.25}>
            <Cherry className="w-full" />
          </Floater>
          <Floater mx={mx} my={my} depth={-8} className="bottom-[30%] left-[2%] w-6" duration={4.6} delay={0.6} rotate={70}>
            <Sprinkle className="w-full" color="#F27C93" />
          </Floater>

          <motion.div style={{ y: coneY, rotate: coneRotate, scale: coneScale }} className="absolute inset-0 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, y: 80, rotate: -10 }}
              animate={reduce ? { opacity: 1, y: 0, rotate: 0 } : { opacity: 1, y: [0, -16, 0], rotate: [-2, 2, -2] }}
              transition={{
                opacity: { duration: 0.8, delay: 0.3 },
                y: { duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1.1 },
                rotate: { duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1.1 },
              }}
              className="h-[88%] drop-shadow-[0_30px_40px_rgb(11_70_105/0.25)]"
            >
              <IceCream
                flavors={current.scoops}
                sauce={current.sauce}
                sprinkles
                topper={combo % 2 === 0}
                wafer={combo % 2 === 1}
                className="h-full w-auto"
                title={`Ilustração de sorvete de casquinha: ${current.label}`}
              />
            </motion.div>
          </motion.div>

          {/* seletor de combinação */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.6, ease }}
            className="absolute bottom-0 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/90 p-2 shadow-lift backdrop-blur"
            role="group"
            aria-label="Trocar a combinação do sorvete"
          >
            {combos.map((c, i) => (
              <button
                key={c.label}
                type="button"
                onClick={() => {
                  setAuto(false);
                  setCombo(i);
                }}
                aria-pressed={combo === i}
                aria-label={c.label}
                className="relative grid size-9 place-items-center rounded-full transition-transform duration-300 hover:scale-110"
              >
                {combo === i && (
                  <motion.span layoutId="combo-ring" className="absolute inset-0 rounded-full ring-2 ring-berry-deep" transition={{ type: "spring", stiffness: 400, damping: 30 }} />
                )}
                <span className="flex size-6 overflow-hidden rounded-full shadow-inner" aria-hidden="true">
                  <span className="h-full w-1/2" style={{ background: c.scoops[1] }} />
                  <span className="h-full w-1/2" style={{ background: c.scoops[0] }} />
                </span>
              </button>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
