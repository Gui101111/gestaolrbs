"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Bot, ChevronDown, CircleCheck, Download, Info, Plus, RotateCcw, Scissors, ShieldAlert, Sparkles, Subtitles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fmtTime } from "@/components/browser-editor/editor-form";
import { cropFor } from "@/lib/browser-editor/framing";
import type { Analysis, Plan, Ratio, RenderOutput, Segment } from "@/lib/browser-editor/types";
import { cn } from "@/lib/utils";

function Stat({ icon: Icon, children, tone = "default" }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode; tone?: "default" | "ai" }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium", tone === "ai" ? "border-violet/40 bg-violet/10 text-fg" : "border-line text-fg-2")}>
      <Icon className={cn("size-3.5", tone === "ai" ? "text-violet" : "text-cyan")} />
      {children}
    </span>
  );
}

/** Mostra o recorte do formato sobre um quadro do vídeo original, com controle de posição. */
function FramingControl({ ratio, analysis, thumb, value, onChange }: { ratio: Ratio; analysis: Analysis; thumb: string; value: { x: number; y: number }; onChange: (v: { x: number; y: number }) => void }) {
  const c = cropFor(analysis.width, analysis.height, ratio, value);
  const box = { left: (c.sx / analysis.width) * 100, top: (c.sy / analysis.height) * 100, width: (c.sw / analysis.width) * 100, height: (c.sh / analysis.height) * 100 };
  const horizontal = c.sw < analysis.width - 1;
  const vertical = c.sh < analysis.height - 1;
  if (!horizontal && !vertical) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-fg">Enquadramento {ratio}</p>
      <div className="relative max-w-full overflow-hidden rounded-xl bg-black" style={{ aspectRatio: `${analysis.width} / ${analysis.height}`, height: analysis.width >= analysis.height ? 150 : 220 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={thumb} alt="" className="absolute inset-0 size-full object-fill opacity-50" />
        <div className="absolute border-2 border-cyan shadow-[0_0_0_9999px_rgb(0_0_0/0.45)]" style={{ left: `${box.left}%`, top: `${box.top}%`, width: `${box.width}%`, height: `${box.height}%` }} />
      </div>
      {horizontal && (
        <input type="range" min={0} max={1} step={0.01} value={value.x} onChange={(e) => onChange({ ...value, x: Number(e.target.value) })} className="w-full accent-[var(--cyan)]" aria-label={`Posição horizontal no ${ratio}`} />
      )}
      {vertical && (
        <input type="range" min={0} max={1} step={0.01} value={value.y} onChange={(e) => onChange({ ...value, y: Number(e.target.value) })} className="w-full accent-[var(--cyan)]" aria-label={`Posição vertical no ${ratio}`} />
      )}
    </div>
  );
}

export function ResultView({
  outputs,
  analysis,
  plan,
  thumb,
  framing,
  onFraming,
  onSegments,
  onDownload,
  onRerender,
  onOptions,
  onNew,
}: {
  outputs: RenderOutput[];
  analysis: Analysis;
  plan: Plan;
  thumb: string | null;
  framing: Partial<Record<Ratio, { x: number; y: number }>>;
  onFraming: (ratio: Ratio, v: { x: number; y: number }) => void;
  onSegments: (segments: Segment[]) => void;
  onDownload: (o: RenderOutput) => void;
  onRerender: () => void;
  onOptions: () => void;
  onNew: () => void;
}) {
  const [tab, setTab] = React.useState(outputs[0]?.ratio);
  const [adjust, setAdjust] = React.useState(false);
  const current = outputs.find((o) => o.ratio === tab) ?? outputs[0];
  const review = analysis.review;
  const alerts = review?.alerts ?? [];
  const words = analysis.segments.reduce((s, x) => s + x.text.split(/\s+/).filter(Boolean).length, 0);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
      <div className="space-y-3">
        {outputs.length > 1 && (
          <div className="flex gap-1.5 rounded-full border border-line bg-fg/[0.03] p-1" role="tablist" aria-label="Formatos">
            {outputs.map((o) => (
              <button
                key={o.ratio}
                role="tab"
                aria-selected={o.ratio === current.ratio}
                onClick={() => setTab(o.ratio)}
                className={cn("flex-1 rounded-full px-3 py-1.5 text-xs font-bold transition-all", o.ratio === current.ratio ? "bg-cyan text-[#06222a] shadow-[0_0_14px_-2px_var(--cyan)]" : "text-fg-2 hover:text-fg")}
              >
                {o.ratio}
              </button>
            ))}
          </div>
        )}
        <motion.div
          key={current.url}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mx-auto overflow-hidden rounded-[26px] border border-line bg-black"
          style={{ aspectRatio: `${current.width} / ${current.height}`, width: `min(100%, calc(66svh * ${current.width / current.height}))` }}
        >
          <video src={current.url} controls playsInline className="size-full object-contain" />
        </motion.div>
      </div>

      <div className="space-y-5">
        <div>
          <p className="flex items-center gap-2 font-display text-2xl font-bold text-fg md:text-3xl">
            <CircleCheck className="size-7 text-cyan" /> Seu vídeo está pronto
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Stat icon={Scissors}>
              {fmtTime(analysis.duration)} → {fmtTime(current.duration)}
            </Stat>
            {plan.cutsPauses > 0 && <Stat icon={Scissors}>{plan.cutsPauses} pausas cortadas</Stat>}
            {plan.cutsMistakes > 0 && (
              <Stat icon={Wand2} tone="ai">
                {plan.cutsMistakes} {plan.cutsMistakes === 1 ? "frase repetida removida" : "frases repetidas removidas"}
              </Stat>
            )}
            {words > 0 && <Stat icon={Subtitles}>Legendas: {words} palavras</Stat>}
            {review?.by === "claude" && (
              <Stat icon={Bot} tone="ai">
                Revisado pelo Claude
              </Stat>
            )}
            {analysis.face.by !== "centro" && analysis.face.by !== "manual" && <Stat icon={Sparkles}>Rosto enquadrado</Stat>}
          </div>
        </div>

        <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
          {outputs.map((o) => (
            <Button key={o.ratio} variant={o.ratio === current.ratio ? "gold" : "glass"} size="lg" onClick={() => onDownload(o)}>
              <Download /> Baixar {o.ext.toUpperCase()} {o.ratio}
            </Button>
          ))}
        </div>
        {current.ext === "webm" && (
          <p className="flex items-start gap-2 text-xs text-fg-3">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            Este navegador grava em WebM, aceito pelo YouTube, TikTok e LinkedIn. Para MP4 direto, use o Chrome atualizado ou o Safari.
          </p>
        )}

        {alerts.length > 0 && (
          <section className="rounded-[22px] border border-warning/35 bg-warning/[0.07] p-4">
            <p className="flex items-center gap-2 text-sm font-bold text-fg">
              <ShieldAlert className="size-4 text-warning" /> Pontos de atenção · OAB
            </p>
            <p className="mt-0.5 text-xs text-fg-2">Revise antes de publicar. Nada foi cortado por isso.</p>
            <ul className="mt-3 space-y-2">
              {alerts.map((al, i) => (
                <li key={i} className="rounded-xl border border-line bg-surface/70 p-3">
                  <p className="text-sm text-fg">
                    {al.tempo !== null && <span className="mr-2 font-mono text-xs text-fg-3">{fmtTime(al.tempo)}</span>}“{al.frase}”
                  </p>
                  <p className="mt-1 text-xs font-semibold text-warning">{al.motivo}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {analysis.notes.length > 0 && (
          <ul className="space-y-1.5">
            {analysis.notes.map((n) => (
              <li key={n} className="flex items-start gap-2 text-xs text-fg-3">
                <Info className="mt-0.5 size-3.5 shrink-0" />
                {n}
              </li>
            ))}
          </ul>
        )}

        <div className="rounded-[22px] border border-line bg-fg/[0.02]">
          <button type="button" onClick={() => setAdjust((v) => !v)} aria-expanded={adjust} className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left">
            <span>
              <span className="block text-sm font-semibold text-fg">Pedir ajuste</span>
              <span className="block text-xs text-fg-3">Corrija uma palavra da legenda ou o enquadramento e gere de novo.</span>
            </span>
            <ChevronDown className={cn("size-4 shrink-0 text-fg-3 transition-transform", adjust && "rotate-180")} />
          </button>
          {adjust && (
            <div className="space-y-5 px-4 pb-4">
              {thumb && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {outputs.map((o) => (
                    <FramingControl key={o.ratio} ratio={o.ratio} analysis={analysis} thumb={thumb} value={framing[o.ratio] ?? analysis.face} onChange={(v) => onFraming(o.ratio, v)} />
                  ))}
                </div>
              )}
              {analysis.segments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-fg">Texto das legendas</p>
                  <div className="max-h-72 space-y-2 overflow-y-auto pr-1" data-lenis-prevent>
                    {analysis.segments.map((s) => (
                      <div key={s.id} className="flex items-center gap-2">
                        <span className="w-10 shrink-0 font-mono text-[0.6875rem] text-fg-3">{fmtTime(s.start)}</span>
                        <Input
                          value={s.text}
                          onChange={(e) => onSegments(analysis.segments.map((x) => (x.id === s.id ? { ...x, text: e.target.value } : x)))}
                          className={cn("h-9 text-sm", review?.cutIds.includes(s.id) && "line-through opacity-60")}
                          aria-label={`Legenda em ${fmtTime(s.start)}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button variant="neon" onClick={onRerender}>
                  <RotateCcw /> Gerar de novo
                </Button>
                <Button variant="glass" onClick={onOptions}>
                  Mudar estilo e opções
                </Button>
              </div>
            </div>
          )}
        </div>

        <Button variant="ghost" onClick={onNew}>
          <Plus /> Editar outro vídeo
        </Button>
      </div>
    </div>
  );
}
