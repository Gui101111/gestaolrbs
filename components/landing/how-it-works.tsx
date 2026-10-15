"use client";

import * as React from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Download, Palette, UploadCloud, Wand2 } from "lucide-react";
import { TiltCard } from "@/components/animations/tilt-card";
import { SectionHeading } from "@/components/landing/section-heading";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const STEPS = [
  {
    n: "01",
    title: "Envie seu vídeo",
    text: "Grave no celular ou na câmera e arraste o arquivo. MP4, MOV ou WEBM — o upload continua mesmo se a conexão oscilar.",
    icon: UploadCloud,
    visual: "upload",
  },
  {
    n: "02",
    title: "Escolha o estilo",
    text: "Defina objetivo, área do Direito, estilo de edição e onde vai publicar. Poucas escolhas, todas com bons padrões.",
    icon: Palette,
    visual: "style",
  },
  {
    n: "03",
    title: "A IA realiza a edição",
    text: "Transcrição, cortes, legendas, zooms, B-roll e acabamento sonoro — decididos a partir do que você disse.",
    icon: Wand2,
    visual: "ai",
  },
  {
    n: "04",
    title: "Baixe o vídeo pronto",
    text: "Receba o MP4 em cada formato escolhido, compare com o original e publique. Precisa de ajuste? Gere uma nova versão.",
    icon: Download,
    visual: "download",
  },
] as const;

export function HowItWorks() {
  const sectionRef = React.useRef<HTMLElement>(null);
  const trackRef = React.useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        const track = trackRef.current;
        const section = sectionRef.current;
        if (!track || !section) return;
        const distance = () => Math.max(0, track.scrollWidth - window.innerWidth + 80);
        const tween = gsap.to(track, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: () => `+=${distance()}`,
            pin: true,
            scrub: 1,
            invalidateOnRefresh: true,
            anticipatePin: 1,
          },
        });
        gsap.utils.toArray<HTMLElement>("[data-step-card]").forEach((card) => {
          gsap.fromTo(
            card.querySelector("[data-step-num]"),
            { yPercent: 40, opacity: 0.2 },
            {
              yPercent: 0,
              opacity: 1,
              ease: "none",
              scrollTrigger: { trigger: card, containerAnimation: tween, start: "left 95%", end: "left 45%", scrub: true },
            },
          );
        });
      });
      return () => mm.revert();
    },
    { scope: sectionRef },
  );

  return (
    <section ref={sectionRef} id="como-funciona" className="relative overflow-hidden bg-ink-2 py-28 lg:flex lg:h-[100svh] lg:flex-col lg:justify-center lg:py-0 motion-reduce:lg:h-auto motion-reduce:lg:py-40">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gold-lines opacity-50 [mask-image:linear-gradient(180deg,transparent,#000_30%,#000_70%,transparent)]" />
        <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-gold/[0.06] blur-[120px]" />
      </div>
      <div className="relative mx-auto w-full max-w-7xl px-6 md:px-10">
        <SectionHeading
          eyebrow="Como funciona"
          title="Quatro passos."
          highlight="Nenhuma linha do tempo."
          description="O advogado não precisa editar. A inteligência artificial edita para ele."
        />
      </div>
      <div
        ref={trackRef}
        className="relative mt-14 flex flex-col gap-5 px-6 md:px-10 lg:mt-16 lg:w-max lg:flex-row lg:gap-7 lg:pr-[20vw] lg:pl-[max(2.5rem,calc((100vw-80rem)/2+2.5rem))] motion-reduce:lg:mx-auto motion-reduce:lg:grid motion-reduce:lg:w-full motion-reduce:lg:max-w-7xl motion-reduce:lg:grid-cols-2 motion-reduce:lg:px-10"
      >
        {STEPS.map((s) => (
          <div key={s.n} data-step-card className="lg:w-[min(36rem,42vw)] motion-reduce:lg:w-auto">
            <TiltCard className="h-full" innerClassName="p-7 md:p-9">
              <div className="flex h-full flex-col">
                <div className="flex items-start justify-between gap-6">
                  <span
                    data-step-num
                    className="font-display text-7xl leading-none font-semibold text-stroke-gold md:text-8xl"
                  >
                    {s.n}
                  </span>
                  <span className="grid size-12 place-items-center rounded-2xl border border-gold/30 bg-gold/[0.07] text-gold-light shadow-[0_0_30px_-10px_rgba(198,161,91,0.7)] transition-transform duration-700 group-hover/tilt:rotate-[-8deg] group-hover/tilt:scale-110">
                    <s.icon className="size-5" />
                  </span>
                </div>
                <h3 className="mt-8 font-display text-3xl font-medium text-ivory md:text-4xl">{s.title}</h3>
                <p className="mt-3 max-w-md text-[0.9375rem] leading-relaxed text-mist">{s.text}</p>
                <div className="mt-8 flex-1">
                  <StepVisual kind={s.visual} />
                </div>
              </div>
            </TiltCard>
          </div>
        ))}
      </div>
    </section>
  );
}

function StepVisual({ kind }: { kind: (typeof STEPS)[number]["visual"] }) {
  if (kind === "upload") {
    return (
      <div className="flex h-32 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-gold/30 bg-gold/[0.03] text-center">
        <UploadCloud className="size-6 text-gold animate-[float_3s_ease-in-out_infinite]" />
        <p className="text-xs text-mist">Arraste seu vídeo ou clique para selecionar</p>
        <div className="mt-1 h-1 w-40 overflow-hidden rounded-full bg-white/[0.06]">
          <div className="h-full w-2/3 rounded-full bg-gold-gradient" />
        </div>
      </div>
    );
  }
  if (kind === "style") {
    return (
      <div className="flex h-32 flex-wrap content-center gap-2">
        {["Institucional", "Dinâmico", "Cinematográfico", "Meta Ads", "Descontraído"].map((t, i) => (
          <span
            key={t}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
              i === 2 ? "border-gold bg-gold/15 text-gold-light shadow-[0_0_20px_-6px_rgba(198,161,91,0.8)]" : "border-white/10 text-mist",
            )}
          >
            {t}
          </span>
        ))}
      </div>
    );
  }
  if (kind === "ai") {
    return (
      <div className="flex h-32 items-center gap-5">
        <div className="relative size-24 shrink-0">
          <svg viewBox="0 0 100 100" className="size-full -rotate-90">
            <circle cx="50" cy="50" r="44" stroke="rgba(255,255,255,0.06)" strokeWidth="4" fill="none" />
            <circle cx="50" cy="50" r="44" stroke="url(#ring-gold)" strokeWidth="4" fill="none" strokeLinecap="round" strokeDasharray="276" strokeDashoffset="80" />
            <defs>
              <linearGradient id="ring-gold" x1="0" x2="1">
                <stop stopColor="#8C6B2F" />
                <stop offset="1" stopColor="#E1C487" />
              </linearGradient>
            </defs>
          </svg>
          <span className="absolute inset-0 grid place-items-center font-display text-2xl text-ivory">71%</span>
        </div>
        <ul className="space-y-1.5 text-xs">
          <li className="text-ivory/80">✓ Transcrição</li>
          <li className="text-ivory/80">✓ Plano de edição</li>
          <li className="text-gold-light">● Criando legendas</li>
          <li className="text-mist/60">○ Renderizando</li>
        </ul>
      </div>
    );
  }
  return (
    <div className="flex h-32 items-center justify-between gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-5">
      <div>
        <p className="text-sm font-semibold text-ivory">revisao-beneficio_9x16.mp4</p>
        <p className="text-xs text-mist">1080 × 1920 · 01:12 · 38 MB</p>
      </div>
      <span className="grid size-11 place-items-center rounded-full bg-gold-gradient text-ink shadow-[0_10px_30px_-10px_rgba(198,161,91,0.9)]">
        <Download className="size-4" />
      </span>
    </div>
  );
}
