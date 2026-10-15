"use client";

import {
  AudioLines,
  Captions,
  Crop,
  Highlighter,
  ImagePlay,
  Mic2,
  Scissors,
  Shapes,
  SlidersHorizontal,
  Sparkles,
  Stamp,
  SunMedium,
  Wand2,
  ZoomIn,
} from "lucide-react";
import { SectionHeading } from "@/components/landing/section-heading";
import { Stagger, StaggerItem } from "@/components/animations/reveal";
import { cn } from "@/lib/utils";

const FEATURES = [
  { icon: Captions, title: "Legendas palavra por palavra", text: "Sincronizadas com a fala, por frase ou por palavra, em português.", span: "md:col-span-2", feature: true },
  { icon: Highlighter, title: "Termos em destaque", text: "Artigos de lei, prazos e palavras-chave ganham ênfase visual." },
  { icon: Scissors, title: "Cortes inteligentes", text: "Silêncios, repetições e tropeços removidos com naturalidade." },
  { icon: ZoomIn, title: "Zoom e enquadramento", text: "Aproximações suaves, pans e crops nos momentos certos." },
  { icon: ImagePlay, title: "B-roll contextual", text: "Imagens de apoio coerentes com a área do Direito tratada.", span: "md:col-span-2", feature: true },
  { icon: SunMedium, title: "Luz e cor", text: "Correção de exposição, contraste e temperatura." },
  { icon: AudioLines, title: "Ruído e eco", text: "Ambiente mais limpo, sem reverberação de sala." },
  { icon: Mic2, title: "Voz realçada", text: "Presença vocal clara, mesmo gravando no celular." },
  { icon: Shapes, title: "Motion graphics", text: "Ícones, setas e grafismos discretos, sem exageros." },
  { icon: Stamp, title: "Sua marca", text: "Logo, cores, nome e OAB aplicados automaticamente." },
  { icon: Crop, title: "Reenquadramento", text: "9:16, 1:1, 4:5 e 16:9 mantendo você no centro." },
  { icon: Wand2, title: "Melhores takes", text: "Arquitetura pronta para escolher o melhor entre várias gravações." },
  { icon: SlidersHorizontal, title: "Instruções livres", text: "Peça em texto: “mais sóbrio”, “destaque a parte da aposentadoria”." },
];

export function FeaturesSection() {
  return (
    <section id="recursos" className="relative overflow-hidden py-28 md:py-40">
      <div aria-hidden className="pointer-events-none absolute -top-20 left-[-10%] h-[500px] w-[500px] rounded-full bg-gold/[0.05] blur-[120px]" />
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <SectionHeading
          eyebrow="Recursos"
          title="Tudo o que um editor faria,"
          highlight="decidido pelo que você disse."
          description="A inteligência analisa a fala e decide onde cortar, onde aproximar, quais palavras destacar e quando usar imagens de apoio."
        />
        <Stagger className="mt-16 grid gap-4 sm:grid-cols-2 md:grid-cols-4" stagger={0.06}>
          {FEATURES.map((f) => (
            <StaggerItem key={f.title} className={cn(f.span)}>
              <article
                className={cn(
                  "group relative h-full overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 transition-all duration-700 ease-[var(--ease-luxe)]",
                  "hover:-translate-y-1 hover:border-gold/30 hover:bg-gold/[0.035] hover:shadow-[0_24px_50px_-30px_rgba(198,161,91,0.55)]",
                  f.feature && "bg-gradient-to-br from-navy-deep/80 to-white/[0.01] md:p-8",
                )}
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute -top-16 -right-16 size-40 rounded-full bg-gold/10 opacity-0 blur-3xl transition-opacity duration-700 group-hover:opacity-100"
                />
                <span className="relative grid size-11 place-items-center rounded-xl border border-gold/25 bg-gold/[0.06] text-gold transition-all duration-700 group-hover:scale-110 group-hover:rotate-[-6deg] group-hover:text-gold-light group-hover:shadow-[0_0_24px_-6px_rgba(198,161,91,0.9)]">
                  <f.icon className="size-5" />
                </span>
                <h3 className={cn("relative mt-5 font-sans text-[0.9375rem] font-semibold text-ivory", f.feature && "font-display text-2xl font-medium")}>
                  {f.title}
                </h3>
                <p className="relative mt-2 text-sm leading-relaxed text-mist">{f.text}</p>
                {f.feature && (
                  <span className="relative mt-6 inline-flex items-center gap-2 text-xs text-gold-light">
                    <Sparkles className="size-3.5" /> Decidido automaticamente pela IA
                  </span>
                )}
              </article>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
