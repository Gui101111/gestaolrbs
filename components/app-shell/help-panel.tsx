"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Search, Sparkles } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { askTribunaAction } from "@/lib/actions/assistant";
import { comoFazer, duvidas } from "@/content/como-fazer";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/**
 * "Perguntar à Tribuna": a busca filtra Como fazer e Dúvidas enquanto você digita;
 * Enter (ou "Perguntar") envia a pergunta ao assistente com IA, quando ligado.
 */
export function HelpPanel({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [q, setQ] = React.useState("");
  const [openFaq, setOpenFaq] = React.useState<string | null>(null);
  const [answer, setAnswer] = React.useState<{ text: string; remaining: number } | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);
  const [asking, start] = React.useTransition();
  const ask = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim().length < 3) return;
    setInfo(null);
    start(async () => {
      const res = await askTribunaAction(q);
      if (res.ok) setAnswer({ text: res.data.answer, remaining: res.data.remaining });
      else {
        setAnswer(null);
        setInfo(res.error);
      }
    });
  };
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
              <SheetDescription>Pergunte ou busque nos guias.</SheetDescription>
            </div>
          </div>
          <form onSubmit={ask} className="relative mt-5 flex gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-fg-3" />
              <Input
                id="help-search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Ex.: como gravar com pouca luz?"
                className="pl-11"
                aria-label="Pergunte ou busque"
                maxLength={600}
                autoFocus
              />
            </div>
            <Button type="submit" variant="neon" size="icon" loading={asking} disabled={q.trim().length < 3} aria-label="Perguntar à Tribuna">
              {!asking && <Sparkles />}
            </Button>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4" data-lenis-prevent>
          {answer && (
            <section aria-live="polite" className="mx-1 mb-5 rounded-2xl border border-cyan/30 bg-cyan/[0.06] p-4">
              <p className="flex items-center gap-2 text-xs font-bold tracking-[0.12em] text-cyan uppercase">
                <Sparkles className="size-3.5" /> Resposta da Tribuna
              </p>
              <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-fg">{answer.text}</p>
              <p className="mt-3 text-[0.6875rem] text-fg-3">
                Gerado por IA a partir dos guias. Não é orientação jurídica. Restam {answer.remaining} perguntas hoje.
              </p>
            </section>
          )}
          {info && <p className="mx-1 mb-4 rounded-2xl border border-line bg-fg/[0.03] p-3 text-xs text-fg-2">{info}</p>}
          {empty && !answer && (
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
