"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { Logo } from "@/components/brand/logo";
import { GoldDust } from "@/components/animations/gold-dust";
import { WordCycle } from "@/components/animations/marquee";

export function AuthShowcase() {
  return (
    <aside className="relative hidden overflow-hidden border-r border-fg/[0.06] bg-ink-2 lg:flex lg:flex-col lg:justify-between lg:p-12">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_20%_0%,rgba(22,38,61,0.9),transparent_60%)]" />
        <div className="absolute inset-0 bg-gold-lines opacity-60 [mask-image:radial-gradient(ellipse_at_center,#000,transparent_75%)]" />
        <GoldDust density={0.00006} />
      </div>
      <div className="relative">
        <Logo />
      </div>
      <motion.div
        className="relative mx-auto w-full max-w-[460px]"
        initial={{ opacity: 0, y: 30, filter: "blur(14px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div aria-hidden className="absolute inset-[12%] rounded-full bg-[radial-gradient(closest-side,rgba(214,158,78,0.22),transparent)] blur-2xl animate-pulse-glow" />
        <Image
          src="/media/justica-alpha.webp"
          alt="Estátua da Justiça"
          width={1080}
          height={1056}
          priority
          className="relative h-auto w-full animate-float"
        />
      </motion.div>
      <div className="relative">
        <p className="font-display text-4xl leading-tight text-ivory">
          Edição jurídica com{" "}
          <WordCycle wordClassName="text-gold-gradient italic pr-1" words={["precisão.", "autoridade.", "sobriedade.", "inteligência."]} />
        </p>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-mist">
          Envie o vídeo bruto, escolha estilo e formato, e receba um conteúdo pronto para publicar — com a identidade do seu
          escritório.
        </p>
      </div>
    </aside>
  );
}
