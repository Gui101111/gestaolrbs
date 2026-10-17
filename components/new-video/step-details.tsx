"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Segmented } from "@/components/new-video/segmented";
import { CAPTION_STYLES, CTA_TYPES } from "@/lib/constants/domain";
import { DETAIL_QUESTIONS, recommendedFor, type Answer, type QuestionId } from "@/lib/constants/questions";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { Draft } from "@/components/new-video/types";

const EASE = [0.22, 1, 0.36, 1] as const;

export function StepDetails({
  d,
  update,
  brand,
}: {
  d: Draft;
  update: (patch: Partial<Draft>) => void;
  brand: { hasLogo: boolean; whatsapp: string | null; instagram: string | null; website: string | null };
}) {
  const [flash, setFlash] = React.useState(false);
  const setAnswer = (id: QuestionId, a: Answer) => update({ answers: { ...d.answers, [id]: a } });
  const useRecommended = () => {
    update({ answers: recommendedFor(d.editing_style) });
    setFlash(true);
    window.setTimeout(() => setFlash(false), 900);
  };
  const ranges = d.cut_ranges;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-fg-2">Responda rápido. Na dúvida, use o recomendado.</p>
        <Button variant="neon" size="sm" onClick={useRecommended}>
          <Sparkles /> Usar recomendado para este estilo
        </Button>
      </div>

      <ul className={cn("divide-y divide-line overflow-hidden rounded-[22px] border border-line bg-fg/[0.02] transition-shadow duration-700", flash && "shadow-[var(--glow-cyan)]")}>
        {DETAIL_QUESTIONS.map((q) => {
          const a = d.answers[q.id];
          const on = a === "sim" || a === "outro";
          return (
            <li key={q.id} className="px-4 py-3.5 md:px-5">
              <div className="flex items-center justify-between gap-4">
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-fg">{q.label}</span>
                  <span className="block truncate text-xs text-fg-3">{q.hint}</span>
                </span>
                <Segmented id={q.id} value={a} onChange={(v) => setAnswer(q.id, v)} label={q.label} />
              </div>

              <AnimatePresence initial={false}>
                {a === "outro" && (
                  <Inline key="outro">
                    <Input
                      id={`outro-${q.id}`}
                      value={d.answers_text[q.id] ?? ""}
                      maxLength={200}
                      onChange={(e) => update({ answers_text: { ...d.answers_text, [q.id]: e.target.value } })}
                      placeholder="Conte como prefere"
                      className="h-10 text-sm"
                      aria-label={`${q.label}: como prefere`}
                    />
                  </Inline>
                )}
                {on && q.id === "captions" && (
                  <Inline key="captions">
                    <Chips options={CAPTION_STYLES} value={d.caption_style} onChange={(v) => update({ caption_style: v })} />
                  </Inline>
                )}
                {on && q.id === "music" && (
                  <Inline key="music">
                    <Chips
                      options={[
                        { value: "sobria", label: "Sóbria" },
                        { value: "inspiradora", label: "Inspiradora" },
                        { value: "neutra", label: "Neutra" },
                      ] as const}
                      value={d.music_tone}
                      onChange={(v) => update({ music_tone: v })}
                    />
                  </Inline>
                )}
                {on && q.id === "hook" && (
                  <Inline key="hook">
                    <Input
                      id="hook-text"
                      value={d.hook_text}
                      maxLength={140}
                      onChange={(e) => update({ hook_text: e.target.value })}
                      placeholder="Opcional: “Teve o benefício negado?”. Vazio, sugerimos pela sua fala."
                      className="h-10 text-sm"
                      aria-label="Título de impacto"
                    />
                  </Inline>
                )}
                {on && q.id === "cta" && (
                  <Inline key="cta">
                    <Chips options={CTA_TYPES} value={d.cta_type} onChange={(v) => update({ cta_type: v })} />
                    <Input
                      id="cta-text"
                      className="mt-2.5 h-10 text-sm"
                      value={d.cta_text}
                      maxLength={140}
                      onChange={(e) => update({ cta_text: e.target.value })}
                      placeholder={
                        d.cta_type === "whatsapp"
                          ? brand.whatsapp
                            ? `WhatsApp: ${brand.whatsapp}`
                            : "WhatsApp com DDD"
                          : d.cta_type === "site"
                            ? (brand.website ?? "Site do escritório")
                            : d.cta_type === "seguir"
                              ? brand.instagram
                                ? `@${brand.instagram}`
                                : "@seuperfil"
                              : "Texto da chamada"
                      }
                      aria-label="Texto da chamada final"
                    />
                  </Inline>
                )}
                {on && q.id === "brand" && !brand.hasLogo && (
                  <Inline key="brand">
                    <p className="text-xs text-warning">
                      Você ainda não enviou sua logo.{" "}
                      <Link href={ROUTES.brand} className="font-semibold underline underline-offset-4">
                        Enviar em Marca
                      </Link>
                    </p>
                  </Inline>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>

      <div className="grid gap-6 rounded-[22px] border border-line bg-fg/[0.02] p-5 md:p-6">
        <Field label="Trechos para remover" optional hint="Minutos:segundos, como 01:20 a 01:35.">
          <div className="space-y-2">
            {ranges.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  className="h-10 w-24 text-center font-mono text-sm"
                  value={r.start}
                  maxLength={8}
                  placeholder="00:00"
                  aria-label="Início"
                  onChange={(e) => update({ cut_ranges: ranges.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)) })}
                />
                <span className="text-xs text-fg-3">a</span>
                <Input
                  className="h-10 w-24 text-center font-mono text-sm"
                  value={r.end}
                  maxLength={8}
                  placeholder="00:00"
                  aria-label="Fim"
                  onChange={(e) => update({ cut_ranges: ranges.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)) })}
                />
                <Button variant="ghost" size="icon-sm" onClick={() => update({ cut_ranges: ranges.filter((_, j) => j !== i) })} aria-label="Remover trecho">
                  <Trash2 />
                </Button>
              </div>
            ))}
            {ranges.length < 10 && (
              <Button variant="subtle" size="sm" onClick={() => update({ cut_ranges: [...ranges, { start: "", end: "" }] })}>
                <Plus /> Adicionar trecho
              </Button>
            )}
          </div>
        </Field>
        <Field label="Vídeo de referência" htmlFor="reference" optional hint="Link de um vídeo com o estilo que você gosta.">
          <Input id="reference" type="url" value={d.reference_url} maxLength={300} onChange={(e) => update({ reference_url: e.target.value })} placeholder="https://" />
        </Field>
        <Field
          label="Observações"
          htmlFor="instructions"
          optional
          error={d.instructions.length > 1000 ? "Use no máximo 1.000 caracteres." : undefined}
        >
          <Textarea
            id="instructions"
            rows={4}
            value={d.instructions}
            onChange={(e) => update({ instructions: e.target.value.slice(0, 1100) })}
            placeholder="Ex.: destacar a parte sobre aposentadoria especial e usar poucas animações."
          />
        </Field>
        <p className={cn("-mt-4 text-right text-xs tabular-nums", d.instructions.length > 1000 ? "text-destructive" : "text-fg-3")}>{d.instructions.length}/1000</p>
      </div>
    </div>
  );
}

function Inline({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease: EASE }} className="overflow-hidden">
      <div className="pt-3">{children}</div>
    </motion.div>
  );
}

function Chips<T extends string>({ options, value, onChange }: { options: readonly { value: T; label: string }[]; value: T | undefined; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
            value === o.value ? "border-cyan/60 bg-cyan/10 text-cyan" : "border-line text-fg-2 hover:text-fg",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
