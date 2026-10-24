"use client";

import * as React from "react";
import { motion } from "motion/react";
import {
  Check,
  Circle,
  Clock,
  Landmark,
  MessageSquare,
  Mic,
  Monitor,
  Palette,
  Play,
  RectangleVertical,
  RefreshCw,
  ScanFace,
  Send,
  ShieldCheck,
  Smartphone,
  Square,
  Sun,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { onSpotlightMove } from "@/components/effects/spotlight";
import { comoFazer, duvidas, type HowToArticle } from "@/content/como-fazer";

const EASE = [0.22, 1, 0.36, 1] as const;

const CARD_ICONS: Record<HowToArticle["icon"], React.ComponentType<{ className?: string }>> = {
  smartphone: Smartphone,
  upload: Upload,
  ratio: RectangleVertical,
  landmark: Landmark,
  message: MessageSquare,
};

/** Ícones dos passos ilustrados (nomes usados em content/como-fazer.ts). */
const STEP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  sun: Sun,
  "scan-face": ScanFace,
  mic: Mic,
  upload: Upload,
  palette: Palette,
  send: Send,
  smartphone: Smartphone,
  square: Square,
  monitor: Monitor,
  check: Check,
  x: X,
  "shield-check": ShieldCheck,
  clock: Clock,
  "message-square": MessageSquare,
  "refresh-cw": RefreshCw,
};

function stepIcon(name: string) {
  return STEP_ICONS[name] ?? Circle;
}

export function HowToView() {
  const [open, setOpen] = React.useState<HowToArticle | null>(null);

  return (
    <div className="space-y-12">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {comoFazer.map((a, i) => {
          const Icon = CARD_ICONS[a.icon];
          return (
            <motion.article
              key={a.id}
              id={a.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: i * 0.06, ease: EASE }}
              onPointerMove={onSpotlightMove}
              className="spotlight group relative flex scroll-mt-24 flex-col rounded-[22px] border border-line bg-surface/70 p-5 transition-all duration-500 hover:-translate-y-1 hover:shadow-[var(--shadow-pop)]"
            >
              <span className="grid size-12 place-items-center rounded-2xl border border-cyan/30 bg-cyan/[0.08] text-cyan transition-transform duration-500 group-hover:scale-110 group-hover:rotate-[-6deg]">
                <Icon className="size-5" />
              </span>
              <h2 className="mt-4 font-sans text-base font-bold tracking-normal text-fg">{a.title}</h2>
              <p className="mt-1 flex-1 text-sm leading-relaxed text-fg-2">{a.summary}</p>
              <Button variant="glass" size="sm" className="mt-5 self-start" onClick={() => setOpen(a)}>
                <Play className="size-3.5 fill-current" /> Assistir
              </Button>
            </motion.article>
          );
        })}
      </div>

      <section id="duvidas" className="scroll-mt-24" aria-labelledby="duvidas-titulo">
        <h2 id="duvidas-titulo" className="mb-2 text-2xl text-fg">
          Dúvidas
        </h2>
        <Accordion type="single" collapsible className="glass rounded-[22px] px-5 md:px-6">
          {duvidas.map((f, i) => (
            <AccordionItem key={f.q} value={`q-${i}`} className={i === duvidas.length - 1 ? "border-b-0" : undefined}>
              <AccordionTrigger>{f.q}</AccordionTrigger>
              <AccordionContent>{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <Dialog open={open !== null} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-w-2xl">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle>{open.title}</DialogTitle>
                <DialogDescription>{open.summary}</DialogDescription>
              </DialogHeader>
              {open.video ? (
                <video src={open.video} controls autoPlay muted playsInline className="theme-stage w-full rounded-2xl bg-black" />
              ) : (
                <ol className="grid gap-3 sm:grid-cols-3">
                  {open.steps.map((s, i) => {
                    const I = stepIcon(s.icon);
                    return (
                      <motion.li
                        key={s.title}
                        initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        transition={{ duration: 0.5, delay: 0.15 + i * 0.25, ease: EASE }}
                        className="relative rounded-2xl border border-line bg-fg/[0.03] p-4"
                      >
                        <span className="absolute top-3 right-3 font-display text-xs font-bold text-fg-3">{i + 1}</span>
                        <motion.span
                          className="grid size-11 place-items-center rounded-xl bg-cyan/10 text-cyan"
                          animate={{ y: [0, -3, 0] }}
                          transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.3 }}
                        >
                          <I className="size-5" />
                        </motion.span>
                        <p className="mt-3 text-sm font-bold text-fg">{s.title}</p>
                        <p className="mt-1 text-xs leading-relaxed text-fg-2">{s.text}</p>
                      </motion.li>
                    );
                  })}
                </ol>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
