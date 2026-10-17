"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Play, SearchX, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BeforeAfter } from "@/components/examples/before-after";
import { ExampleScene } from "@/components/examples/example-scene";
import { onSpotlightMove } from "@/components/effects/spotlight";
import { exemplos, type Example } from "@/content/exemplos";
import { landing } from "@/content/landing";
import { ASPECT_RATIOS, EDITING_STYLES } from "@/lib/constants/domain";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { useTilt } from "@/components/effects/use-tilt";

const RATIO_CLASS: Record<Example["format"], string> = {
  "9:16": "aspect-[9/16]",
  "1:1": "aspect-square",
  "4:5": "aspect-[4/5]",
  "16:9": "aspect-video",
};

/** Galeria de exemplos com filtros (na URL), prévia ao passar o mouse e modal antes/depois. */
export function ExamplesGallery() {
  const sp = useSearchParams();
  const estilo = sp.get("estilo");
  const formato = sp.get("formato");
  const area = sp.get("area");
  const [open, setOpen] = React.useState<Example | null>(null);

  const items = exemplos.filter(
    (e) => (!estilo || e.style === estilo) && (!formato || e.format === formato) && (!area || e.area === area),
  );
  const filtered = Boolean(estilo || formato || area);

  return (
    <>
      <MobileFilters />
      {items.length === 0 ? (
        <div className="glass rounded-[24px] px-6 py-14 text-center">
          <SearchX className="mx-auto size-8 text-cyan" />
          <p className="mt-4 font-display text-xl text-fg">Nenhum exemplo com esses filtros.</p>
          <Button asChild variant="glass" className="mt-5">
            <Link href={ROUTES.examples}>Limpar filtros</Link>
          </Button>
        </div>
      ) : (
        <div className="columns-2 gap-4 md:columns-3 xl:columns-4 [&>*]:mb-4">
          {items.map((ex, i) => (
            <ExampleCard key={ex.id} example={ex} index={i} onOpen={() => setOpen(ex)} />
          ))}
        </div>
      )}
      {filtered && items.length > 0 && <p className="mt-2 text-center text-xs text-fg-3">{items.length} exemplo(s)</p>}

      <Dialog open={open !== null} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-w-3xl p-4 sm:p-6">
          {open && (
            <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_15rem] md:items-center">
              <BeforeAfter
                example={open}
                className={cn("mx-auto w-full rounded-[20px] border border-line", RATIO_CLASS[open.format], open.format === "9:16" && "max-w-[18rem]")}
              />
              <div>
                <DialogHeader>
                  <DialogTitle>{open.title}</DialogTitle>
                  <DialogDescription>Arraste o divisor para comparar.</DialogDescription>
                </DialogHeader>
                <dl className="mt-4 space-y-2 text-sm">
                  {[
                    ["Estilo", open.styleLabel],
                    ["Formato", open.format],
                    ["Área", open.areaLabel],
                    ["Duração", open.duration],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3">
                      <dt className="text-fg-3">{k}</dt>
                      <dd className="font-medium text-fg">{v}</dd>
                    </div>
                  ))}
                </dl>
                <Button asChild variant="gold" className="mt-5 w-full" pulse>
                  <Link href={`${ROUTES.newVideo}?estilo=${open.style}&formato=${encodeURIComponent(open.format)}`}>
                    Usar este estilo <ArrowRight />
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function ExampleCard({ example, index, onOpen }: { example: Example; index: number; onOpen: () => void }) {
  const [hover, setHover] = React.useState(false);
  const tilt = useTilt();
  return (
    <motion.button
      type="button"
      onClick={onOpen}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      onPointerMove={(e) => {
        onSpotlightMove(e);
        tilt.onPointerMove(e);
      }}
      onPointerLeave={tilt.onPointerLeave}
      style={tilt.style}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: Math.min(index * 0.05, 0.4), ease: [0.22, 1, 0.36, 1] }}
      className="spotlight group relative block w-full break-inside-avoid overflow-hidden rounded-[20px] border border-line bg-surface/70 text-left transition-all duration-500 hover:-translate-y-1 hover:shadow-[var(--shadow-pop)]"
      aria-label={`Ver exemplo: ${example.title}`}
    >
      <div className={cn("theme-stage relative overflow-hidden", RATIO_CLASS[example.format])}>
        <ExampleScene example={example} variant="after" playing={hover} />
        <AnimatePresence>
          {!hover && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute top-1/2 left-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/30 bg-black/40 text-white backdrop-blur"
            >
              <Play className="size-4 fill-current" />
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <div className="p-3.5">
        <div className="flex items-center gap-1.5">
          <span className="rounded-full border border-cyan/35 bg-cyan/10 px-2 py-0.5 text-[0.625rem] font-bold tracking-[0.06em] text-cyan uppercase">
            {example.styleLabel}
          </span>
          <span className="font-mono text-[0.6875rem] text-fg-3">{example.format}</span>
        </div>
        <p className="mt-1.5 truncate text-sm font-semibold text-fg">{example.title}</p>
        <p className="text-xs text-fg-3">{example.areaLabel}</p>
      </div>
    </motion.button>
  );
}

/** No celular o painel de filtros fica escondido: chips horizontais aqui. */
function MobileFilters() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const set = (k: string, v: string | null) => {
    const p = new URLSearchParams(sp.toString());
    if (v === null || p.get(k) === v) p.delete(k);
    else p.set(k, v);
    router.replace(`${pathname}${p.size ? `?${p}` : ""}`, { scroll: false });
  };
  const chips = [
    ...EDITING_STYLES.map((s) => ({ k: "estilo", v: s.value, label: landing.styleNames[s.value] ?? s.label })),
    ...ASPECT_RATIOS.map((r) => ({ k: "formato", v: r.value, label: r.value })),
  ];
  const any = sp.get("estilo") || sp.get("formato") || sp.get("area");
  return (
    <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 lg:hidden">
      {any && (
        <button type="button" onClick={() => router.replace(pathname, { scroll: false })} className="flex shrink-0 items-center gap-1 rounded-full border border-line px-3 py-1.5 text-xs text-fg-2">
          <X className="size-3" /> Limpar
        </button>
      )}
      {chips.map((c) => {
        const active = sp.get(c.k) === c.v;
        return (
          <button
            key={`${c.k}-${c.v}`}
            type="button"
            onClick={() => set(c.k, c.v)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition",
              active ? "border-cyan/50 bg-cyan/10 text-cyan" : "border-line text-fg-2",
            )}
          >
            {c.label}
          </button>
        );
      })}
    </div>
  );
}
