"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LineReveal } from "@/components/animations/animated-text";
import { Magnetic } from "@/components/animations/magnetic";
import { Reveal } from "@/components/animations/reveal";
import { GoldDust } from "@/components/animations/gold-dust";

export function FinalCta({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  return (
    <section className="relative overflow-hidden px-4 pb-28 md:px-6 md:pb-36">
      <div className="panel gold-ring relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] px-6 py-24 text-center md:rounded-[2.5rem] md:py-32">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <Image src="/media/justica-rosto.webp" alt="" fill sizes="100vw" className="object-cover opacity-[0.16] mix-blend-luminosity" />
          <div className="absolute inset-0 bg-gradient-to-b from-ink/60 via-ink/80 to-ink" />
          <div className="absolute top-1/2 left-1/2 h-[420px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/15 blur-[110px] animate-pulse-glow" />
          <GoldDust density={0.00005} />
        </div>
        <div className="relative">
          <p className="eyebrow">Comece hoje</p>
          <h2 className="mx-auto mt-6 max-w-4xl font-display text-4xl leading-[1.08] font-medium text-ivory sm:text-6xl md:text-7xl">
            <LineReveal lines={["O advogado não precisa editar.", <span key="b" className="text-gold-gradient italic">A inteligência edita para ele.</span>]} />
          </h2>
          <Reveal delay={0.4}>
            <p className="mx-auto mt-8 max-w-xl text-base text-mist md:text-lg">
              Envie seu primeiro vídeo e veja o resultado com a identidade do seu escritório.
            </p>
            <div className="mt-10 flex justify-center">
              <Magnetic>
                <Button asChild variant="gold" size="xl" className="glow-gold">
                  <Link href={isAuthenticated ? "/app/projetos/novo" : "/register"}>
                    Criar primeiro projeto <ArrowRight />
                  </Link>
                </Button>
              </Magnetic>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
