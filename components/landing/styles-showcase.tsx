"use client";

import * as React from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { SectionHeading } from "@/components/landing/section-heading";
import { Reveal } from "@/components/animations/reveal";
import { EDITING_STYLES } from "@/lib/constants/domain";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

export function StylesShowcase() {
  const [active, setActive] = React.useState(0);
  const style = EDITING_STYLES[active];

  return (
    <section id="estilos" className="relative overflow-hidden py-28 md:py-40">
      <div aria-hidden className="pointer-events-none absolute top-0 right-0 h-[600px] w-[600px] rounded-full bg-navy-soft/50 blur-[150px]" />
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <SectionHeading
          eyebrow="Estilos de edição"
          title="Cinco linguagens."
          highlight="Uma só seriedade."
          description="Cada estilo define ritmo, legendas, movimentos e acabamento. Todos respeitam a sobriedade que a advocacia exige."
        />

        <div className="mt-16 grid items-center gap-12 lg:grid-cols-[1fr_auto] lg:gap-20">
          <Reveal>
            <ul className="divide-y divide-white/[0.07] border-y border-white/[0.07]" role="tablist" aria-label="Estilos">
              {EDITING_STYLES.map((s, i) => {
                const isActive = i === active;
                return (
                  <li key={s.value}>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onMouseEnter={() => setActive(i)}
                      onFocus={() => setActive(i)}
                      onClick={() => setActive(i)}
                      className="group relative grid w-full grid-cols-[3rem_1fr] items-start gap-4 py-6 text-left md:grid-cols-[4rem_1fr_auto] md:py-7"
                    >
                      <motion.span
                        aria-hidden
                        className="absolute inset-y-0 -left-4 w-px bg-gradient-to-b from-transparent via-gold to-transparent"
                        initial={false}
                        animate={{ opacity: isActive ? 1 : 0, scaleY: isActive ? 1 : 0.3 }}
                        transition={{ duration: 0.6, ease: EASE }}
                      />
                      <span className={cn("font-display text-2xl transition-colors duration-500", isActive ? "text-gold" : "text-mist/40")}>
                        {s.index}
                      </span>
                      <span>
                        <span
                          className={cn(
                            "block font-display text-2xl transition-colors duration-500 md:text-3xl",
                            isActive ? "text-ivory" : "text-ivory/55 group-hover:text-ivory/80",
                          )}
                        >
                          {s.label}
                        </span>
                        <motion.span
                          initial={false}
                          animate={{ height: isActive ? "auto" : 0, opacity: isActive ? 1 : 0 }}
                          transition={{ duration: 0.6, ease: EASE }}
                          className="block overflow-hidden"
                        >
                          <span className="block pt-3 text-[0.9375rem] leading-relaxed text-mist">{s.description}</span>
                          <span className="mt-4 flex flex-wrap gap-2">
                            {s.traits.map((t) => (
                              <span key={t} className="rounded-full border border-gold/25 bg-gold/[0.06] px-3 py-1 text-[0.6875rem] text-gold-light">
                                {t}
                              </span>
                            ))}
                          </span>
                          <span className="mt-4 block text-xs text-mist/80">
                            Ideal para: <span className="text-ivory/85">{s.idealFor}</span>
                          </span>
                        </motion.span>
                      </span>
                      <span className="hidden items-center gap-1 self-center md:flex" aria-label={`Ritmo ${s.pace} de 4`}>
                        {[1, 2, 3, 4].map((p) => (
                          <span
                            key={p}
                            className={cn("h-4 w-1 rounded-full transition-colors duration-500", p <= s.pace ? (isActive ? "bg-gold" : "bg-gold/30") : "bg-white/10")}
                          />
                        ))}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Reveal>

          <Reveal delay={0.2} className="mx-auto">
            <div className="relative">
              <div aria-hidden className="absolute -inset-10 rounded-full bg-gold/10 blur-3xl" />
              <div className="relative aspect-[9/16] w-[17rem] overflow-hidden rounded-[2.2rem] border border-gold/30 bg-black shadow-[0_40px_80px_-30px_rgba(0,0,0,1)] md:w-[19rem]">
                <AnimatePresence mode="popLayout">
                  <motion.div
                    key={style.value}
                    className="absolute inset-0"
                    initial={{ opacity: 0, scale: 1.04 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8, ease: EASE }}
                  >
                    <StylePreview value={style.value} />
                  </motion.div>
                </AnimatePresence>
                <div className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/10" />
              </div>
              <p className="mt-5 text-center text-xs text-mist">Prévia ilustrativa do acabamento</p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function StylePreview({ value }: { value: (typeof EDITING_STYLES)[number]["value"] }) {
  const base = (
    <Image
      src="/media/justica-rosto.webp"
      alt=""
      fill
      sizes="320px"
      className={cn(
        "object-cover object-[52%_35%]",
        value === "cinematografico" && "contrast-[1.15] saturate-[0.8] sepia-[0.15]",
        value === "institucional" && "saturate-[0.7] brightness-[0.85]",
        value === "performance" && "saturate-[1.15] brightness-[0.9]",
      )}
    />
  );

  switch (value) {
    case "institucional":
      return (
        <>
          {base}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/30" />
          <div className="absolute inset-x-6 bottom-16 text-center">
            <p className="font-display text-xl leading-snug text-ivory italic">“O direito à informação é o primeiro passo.”</p>
          </div>
          <div className="absolute inset-x-6 bottom-6 flex items-center gap-3">
            <span className="h-8 w-px bg-gold" />
            <span>
              <span className="block text-[0.6875rem] font-semibold tracking-[0.18em] text-ivory uppercase">Seu escritório</span>
              <span className="block text-[0.625rem] text-gold-light">Advocacia & Consultoria</span>
            </span>
          </div>
        </>
      );
    case "dinamico":
      return (
        <>
          <motion.div className="absolute inset-0" animate={{ scale: [1, 1.12, 1.05] }} transition={{ duration: 3, repeat: Infinity, repeatType: "mirror" }}>
            {base}
          </motion.div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute inset-x-4 bottom-24 text-center font-sans text-2xl leading-tight font-extrabold text-ivory uppercase [text-shadow:0_3px_14px_rgba(0,0,0,0.8)]">
            Seus <span className="rounded bg-gold px-1.5 text-ink">direitos</span> em 30 segundos
          </div>
          <div className="absolute top-6 right-4 rounded-full border border-white/20 bg-black/50 px-3 py-1 text-[0.625rem] text-ivory backdrop-blur">B-roll</div>
        </>
      );
    case "cinematografico":
      return (
        <>
          <motion.div className="absolute inset-0" animate={{ scale: [1.02, 1.08] }} transition={{ duration: 8, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}>
            {base}
          </motion.div>
          <div className="absolute inset-x-0 top-0 h-14 bg-black" />
          <div className="absolute inset-x-0 bottom-0 h-14 bg-black" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.7))]" />
          <p className="absolute inset-x-8 bottom-20 text-center font-display text-lg tracking-[0.3em] text-ivory/90 uppercase">Precisão</p>
        </>
      );
    case "performance":
      return (
        <>
          {base}
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/80" />
          <motion.div
            className="absolute inset-x-4 top-10 rounded-xl bg-ivory px-3 py-2 text-center font-sans text-lg font-extrabold text-ink uppercase"
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          >
            Teve o benefício negado?
          </motion.div>
          <div className="absolute inset-x-4 bottom-28 text-center font-sans text-xl font-extrabold text-ivory uppercase [text-shadow:0_3px_14px_rgba(0,0,0,0.8)]">
            Entenda o que <span className="text-gold-light">a lei prevê</span>
          </div>
          <div className="absolute inset-x-6 bottom-8 rounded-full bg-gold-gradient py-2.5 text-center text-xs font-bold tracking-[0.12em] text-ink uppercase">
            Saiba mais
          </div>
        </>
      );
    case "descontraido":
      return (
        <>
          {base}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
          <div className="absolute inset-x-4 bottom-20 space-y-2">
            <div className="w-fit max-w-[85%] rounded-2xl rounded-bl-sm bg-white/90 px-3 py-2 text-xs font-semibold text-ink">
              “Doutor, posso pedir revisão?”
            </div>
            <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-gold px-3 py-2 text-xs font-semibold text-ink">
              Vamos por partes. Primeiro, o prazo.
            </div>
          </div>
          <div className="absolute top-6 left-4 rounded-full bg-black/50 px-3 py-1 text-[0.625rem] font-semibold text-ivory backdrop-blur">
            Perguntas & respostas
          </div>
        </>
      );
  }
}
