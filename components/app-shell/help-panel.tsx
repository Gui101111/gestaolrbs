"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Search } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { comoFazer, duvidas } from "@/content/como-fazer";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/**
 * "Perguntar à Tribuna": por enquanto, busca nos artigos de Como fazer e nas Dúvidas.
 * (A resposta com IA entra na Parte 2.)
 */
export function HelpPanel({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [q, setQ] = React.useState("");
  const [openFaq, setOpenFaq] = React.useState<string | null>(null);
  const terms = norm(q).split(/\s+/).filter(Boolean);
  const match = (text: string) => terms.every((t) => norm(text).includes(t));

  const articles = comoFazer.filter((a) => !terms.length || match(`${a.title} ${a.summary} ${a.steps.map((s) => `${s.title} ${s.text}`).join(" ")}`));
  const faqs = duvidas.filter((f) => !terms.length || match(`${f.q} ${f.a}`));
  const empty = terms.length > 0 && !articles.length && !faqs.length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[92%] max-w-md gap-0 p-0">
        <div className="relative overflow-hidden border-b border-line px-5 pt-6 pb-5">
          <div aria-hidden className="absolute -top-16 -right-10 size-48 rounded-full bg-cyan/20 blur-3xl" />
          <div className="relative flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl border border-cyan/30 bg-cyan/[0.08]">
              <LogoMark className="size-7" />
            </span>
            <div>
              <SheetTitle className="text-lg font-bold">Perguntar à Tribuna</SheetTitle>
              <SheetDescription>Busque em Como fazer e nas Dúvidas.</SheetDescription>
            </div>
          </div>
          <div className="relative mt-5">
            <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-fg-3" />
            <Input
              id="help-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ex.: como gravar, OAB, formatos"
              className="pl-11"
              aria-label="Buscar ajuda"
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4" data-lenis-prevent>
          {empty && (
            <p className="px-3 py-10 text-center text-sm text-fg-2">
              Nada encontrado para “{q}”. Tente outras palavras ou fale com o suporte.
            </p>
          )}

          {articles.length > 0 && (
            <section className="mb-5">
              <h3 className="px-3 pb-2 font-sans text-[0.6875rem] font-bold tracking-[0.14em] text-fg-3 uppercase">Como fazer</h3>
              {articles.map((a) => (
                <Link
                  key={a.id}
                  href={`${ROUTES.howTo}#${a.id}`}
                  onClick={() => onOpenChange(false)}
                  className="group flex items-start gap-3 rounded-2xl px-3 py-3 transition hover:bg-fg/[0.05]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-fg">{a.title}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-fg-2">{a.summary}</span>
                  </span>
                  <ArrowRight className="mt-1 size-4 shrink-0 text-fg-3 transition group-hover:translate-x-0.5 group-hover:text-cyan" />
                </Link>
              ))}
            </section>
          )}

          {faqs.length > 0 && (
            <section>
              <h3 className="px-3 pb-2 font-sans text-[0.6875rem] font-bold tracking-[0.14em] text-fg-3 uppercase">Dúvidas</h3>
              {faqs.map((f) => {
                const isOpen = openFaq === f.q;
                return (
                  <div key={f.q} className={cn("rounded-2xl transition", isOpen && "bg-fg/[0.04]")}>
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : f.q)}
                      aria-expanded={isOpen}
                      className="w-full px-3 py-3 text-left text-sm font-semibold text-fg transition hover:text-cyan"
                    >
                      {f.q}
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.p
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden px-3 text-sm leading-relaxed text-fg-2"
                        >
                          <span className="block pb-3">{f.a}</span>
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
