"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Magnetic } from "@/components/animations/magnetic";
import { AnimatedText } from "@/components/animations/animated-text";
import { Aurora } from "@/components/effects/aurora";
import { accentSegments } from "@/components/shared/accent-text";
import { landing } from "@/content/landing";
import { ROUTES } from "@/lib/routes";

/** Bloco 4: uma frase e um botão. */
export function FinalCta({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  return (
    <section data-accent="gold" className="relative px-3 pt-6 pb-16 md:px-5 md:pb-24" aria-label="Começar">
      <div className="theme-stage texture-metal relative mx-auto max-w-6xl overflow-hidden rounded-[28px] bg-stage px-6 py-16 text-center text-fg md:rounded-[34px] md:py-24">
        <Aurora variant="hero" />
        <div aria-hidden className="grid-floor opacity-40" />
        <div className="relative">
          <AnimatedText
            as="h2"
            className="mx-auto max-w-3xl text-4xl leading-[1.05] font-extrabold text-balance md:text-6xl"
            segments={accentSegments(landing.cta.title)}
          />
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="mt-9 flex justify-center"
          >
            <Magnetic>
              <Button asChild variant="gold" size="xl" pulse>
                <Link href={isAuthenticated ? ROUTES.newVideo : ROUTES.register}>
                  {landing.cta.button} <ArrowRight className="transition-transform group-hover/btn:translate-x-1" />
                </Link>
              </Button>
            </Magnetic>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
