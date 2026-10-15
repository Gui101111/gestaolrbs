"use client";

import { Scale } from "lucide-react";
import { ScrollLitText } from "@/components/animations/scroll-lit-text";
import { Reveal } from "@/components/animations/reveal";
import { DrawLine } from "@/components/animations/draw-line";

export function Manifesto() {
  return (
    <section aria-label="Manifesto" className="relative overflow-hidden py-28 md:py-44">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold/[0.08]" />
        <div className="absolute top-1/2 left-1/2 h-[820px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold/[0.05]" />
      </div>
      <div className="mx-auto max-w-5xl px-6 md:px-10">
        <Reveal className="flex items-center gap-4">
          <span className="grid size-11 place-items-center rounded-full border border-gold/30 text-gold">
            <Scale className="size-5" />
          </span>
          <span className="eyebrow">Manifesto</span>
          <DrawLine className="flex-1" />
        </Reveal>
        <ScrollLitText
          className="mt-12 font-display text-[2rem] leading-[1.18] font-medium sm:text-5xl md:text-[3.6rem]"
          text="Você domina o Direito. Nós cuidamos de cada *corte,* cada *legenda* e cada *formato,* para que sua mensagem chegue com a *seriedade* que ela merece."
        />
      </div>
    </section>
  );
}
