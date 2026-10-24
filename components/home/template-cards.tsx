"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Building2, ChevronLeft, ChevronRight, Coffee, Lightbulb, Megaphone, MessageCircleQuestion, Scale, ScrollText, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { onSpotlightMove } from "@/components/effects/spotlight";
import { modelos, type Modelo } from "@/config/modelos";
import { setUiPreferencesAction } from "@/lib/actions/profile";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { useTilt } from "@/components/effects/use-tilt";

const ICONS: Record<Modelo["icon"], React.ComponentType<{ className?: string }>> = {
  "message-circle-question": MessageCircleQuestion,
  scale: Scale,
  building: Building2,
  megaphone: Megaphone,
  "scroll-text": ScrollText,
  coffee: Coffee,
};

const HUES: Record<Modelo["hue"], string> = {
  gold: "var(--gold)",
  cyan: "var(--cyan)",
  azure: "var(--azure)",
  violet: "var(--violet)",
};

/** "Comece por um modelo": cards grandes que pré-preenchem o Novo vídeo. */
export function TemplateCards({ hidden }: { hidden: string[] }) {
  const scroller = React.useRef<HTMLDivElement>(null);
  const [customize, setCustomize] = React.useState(false);
  const visible = modelos.filter((m) => !hidden.includes(m.id));
  const scrollBy = (dir: 1 | -1) => scroller.current?.scrollBy({ left: dir * 380, behavior: "smooth" });

  return (
    <section id="modelos" aria-labelledby="modelos-title" className="scroll-mt-24">
      <div className="mb-4 flex items-center justify-between gap-3 px-1">
        <h2 id="modelos-title" className="flex items-center gap-2 font-sans text-[0.9375rem] font-bold tracking-normal text-fg">
          <Lightbulb className="size-4 text-gold" /> Comece por um modelo
        </h2>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => setCustomize(true)} className="flex items-center gap-1.5 text-sm font-semibold text-fg-2 underline-offset-4 transition hover:text-cyan hover:underline">
            <SlidersHorizontal className="size-3.5" /> Personalizar
          </button>
          <Button variant="glass" size="icon-sm" onClick={() => scrollBy(-1)} aria-label="Anterior" className="ml-2 hidden md:inline-flex">
            <ChevronLeft />
          </Button>
          <Button variant="glass" size="icon-sm" onClick={() => scrollBy(1)} aria-label="Próximo" className="hidden md:inline-flex">
            <ChevronRight />
          </Button>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="glass rounded-[20px] px-5 py-8 text-center text-sm text-fg-2">
          Todos os modelos estão ocultos.{" "}
          <button type="button" className="font-semibold text-cyan" onClick={() => setCustomize(true)}>
            Mostrar modelos
          </button>
        </div>
      ) : (
        <div ref={scroller} className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2">
          {visible.map((m, i) => (
            <TemplateCard key={m.id} modelo={m} index={i} />
          ))}
        </div>
      )}

      <CustomizeDialog open={customize} onOpenChange={setCustomize} hidden={hidden} />
    </section>
  );
}

function TemplateCard({ modelo, index }: { modelo: Modelo; index: number }) {
  const Icon = ICONS[modelo.icon];
  const hue = HUES[modelo.hue];
  const tilt = useTilt();
  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      onPointerMove={(e) => {
        onSpotlightMove(e);
        tilt.onPointerMove(e);
      }}
      onPointerLeave={tilt.onPointerLeave}
      style={tilt.style}
      className="spotlight sheen group relative aspect-[16/10] w-[82%] shrink-0 snap-start overflow-hidden rounded-[22px] bg-[#111317] sm:w-[360px] lg:w-[calc((100%-2rem)/3)]"
    >
      <span aria-hidden className="sheen-layer" />
      {modelo.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={modelo.image} alt="" className="absolute inset-0 size-full object-cover transition-transform duration-[1.4s] group-hover:scale-[1.05]" />
      ) : (
        <>
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse 80% 90% at 85% 20%, color-mix(in oklab, ${hue} 55%, transparent), transparent 65%), linear-gradient(160deg, #1d2127, #101216 70%)`,
            }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/media/justica-busto.webp"
            alt=""
            aria-hidden
            className="absolute right-[-6%] bottom-0 h-[92%] w-auto object-contain opacity-90 mix-blend-screen transition-transform duration-[1.4s] ease-[var(--ease-luxe)] group-hover:scale-[1.06]"
          />
          <Icon className="absolute top-5 right-5 size-6 text-white/70" />
        </>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/25" />
      <div className="relative flex h-full flex-col justify-between p-5">
        <div>
          <h3 className="max-w-[70%] text-2xl leading-tight font-extrabold text-white md:text-[1.7rem]">{modelo.title}</h3>
          <p className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-white/15 px-2 py-0.5 text-[0.625rem] font-bold tracking-[0.08em] text-white uppercase backdrop-blur">{modelo.styleLabel}</span>
            {modelo.formats.map((f) => (
              <span key={f} className="rounded-full bg-white/10 px-2 py-0.5 font-mono text-[0.625rem] text-white/85 backdrop-blur">
                {f}
              </span>
            ))}
          </p>
        </div>
        <div className="flex items-end justify-between gap-3">
          <Link
            href={`${ROUTES.newVideo}?modelo=${modelo.id}`}
            className="flex items-center gap-1.5 rounded-full border border-white/30 bg-white/12 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md transition hover:border-white/60 hover:bg-white/20"
          >
            Criar agora <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <p className="hidden max-w-[45%] translate-y-2 text-right text-[0.6875rem] leading-snug text-white/80 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100 sm:block">
            {modelo.tip}
          </p>
        </div>
      </div>
    </motion.article>
  );
}

function CustomizeDialog({ open, onOpenChange, hidden }: { open: boolean; onOpenChange: (v: boolean) => void; hidden: string[] }) {
  const router = useRouter();
  const [draft, setDraft] = React.useState<string[]>(hidden);
  const [pending, start] = React.useTransition();

  const save = () =>
    start(async () => {
      const res = await setUiPreferencesAction({ hidden_models: draft });
      if (!res.ok) return void toast.error(res.error);
      onOpenChange(false);
      router.refresh();
    });

  return (
    <Dialog open={open} onOpenChange={(v) => (setDraft(hidden), onOpenChange(v))}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Personalizar modelos</DialogTitle>
          <DialogDescription>Escolha quais aparecem no Início.</DialogDescription>
        </DialogHeader>
        <ul className="space-y-1">
          {modelos.map((m) => {
            const on = !draft.includes(m.id);
            return (
              <li key={m.id} className="flex items-center justify-between gap-3 rounded-xl px-2 py-2.5 hover:bg-fg/[0.04]">
                <label htmlFor={`modelo-${m.id}`} className={cn("text-sm", on ? "text-fg" : "text-fg-3")}>
                  {m.title}
                  <span className="ml-2 text-xs text-fg-3">{m.styleLabel}</span>
                </label>
                <Switch
                  id={`modelo-${m.id}`}
                  checked={on}
                  onCheckedChange={(v) => setDraft((d) => (v ? d.filter((x) => x !== m.id) : [...d, m.id]))}
                />
              </li>
            );
          })}
        </ul>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="gold" onClick={save} loading={pending}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
