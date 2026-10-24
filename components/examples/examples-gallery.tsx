"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExampleCard } from "@/components/examples/example-card";
import { ADVOGADOS, exemplos, type Example } from "@/content/exemplos";
import { ROUTES } from "@/lib/routes";

/** Vídeos de exemplo (advogados fictícios) feitos com o editor da TRIBUNA. */
export function ExamplesGallery() {
  const [open, setOpen] = React.useState<Example | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {exemplos.map((ex, i) => (
          <motion.div key={ex.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: Math.min(i * 0.06, 0.4), ease: [0.22, 1, 0.36, 1] }}>
            <ExampleCard example={ex} onOpen={() => setOpen(ex)} />
          </motion.div>
        ))}
      </div>
      <p className="mt-2 text-center text-xs text-fg-3">Animações com advogados fictícios, editadas pela TRIBUNA. Ative o som para ouvir a trilha e os efeitos.</p>
      <ExampleDialog example={open} onClose={() => setOpen(null)} />
    </>
  );
}

/** Player do exemplo, com som, e atalho para usar o mesmo estilo. */
export function ExampleDialog({ example, onClose }: { example: Example | null; onClose: () => void }) {
  return (
    <Dialog open={example !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl p-4 sm:p-6">
        {example && (
          <div className="grid gap-5 md:grid-cols-[minmax(0,17rem)_1fr] md:items-center">
            <video key={example.id} src={example.video} poster={example.poster} controls autoPlay playsInline className="mx-auto aspect-[9/16] w-full max-w-[17rem] rounded-[20px] border border-line bg-black" />
            <div>
              <DialogHeader>
                <DialogTitle>{example.title}</DialogTitle>
                <DialogDescription>{ADVOGADOS[example.lawyer].name} é uma personagem fictícia.</DialogDescription>
              </DialogHeader>
              <dl className="mt-4 space-y-2 text-sm">
                {[
                  ["Estilo", example.styleLabel],
                  ["Área", example.areaLabel],
                  ["Formato", "9:16"],
                  ["Duração", example.duration],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3">
                    <dt className="text-fg-3">{k}</dt>
                    <dd className="font-medium text-fg">{v}</dd>
                  </div>
                ))}
              </dl>
              <Button asChild variant="gold" className="mt-5 w-full" pulse>
                <Link href={`${ROUTES.newVideo}?estilo=${example.style}&formato=${encodeURIComponent("9:16")}`}>
                  Usar este estilo <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
