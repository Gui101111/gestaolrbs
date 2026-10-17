"use client";

import * as React from "react";
import { Check, Lock } from "lucide-react";
import { StylePreview } from "@/components/examples/style-preview";
import { InstagramIcon, LinkedinIcon, MetaIcon, TiktokIcon, YoutubeIcon } from "@/components/brand/social-icons";
import { landing } from "@/content/landing";
import { ASPECT_RATIOS, EDITING_STYLES, TARGET_DURATIONS } from "@/lib/constants/domain";
import { cn } from "@/lib/utils";
import type { Draft, DraftVideo } from "@/components/new-video/types";

const RATIO_PLATFORMS: Record<string, React.ComponentType<{ className?: string }>[]> = {
  "9:16": [TiktokIcon, InstagramIcon, YoutubeIcon],
  "1:1": [InstagramIcon, LinkedinIcon],
  "4:5": [InstagramIcon, MetaIcon],
  "16:9": [YoutubeIcon, LinkedinIcon],
};

export function StepStyle({
  d,
  update,
  video,
  allowedRatios,
}: {
  d: Draft;
  update: (patch: Partial<Draft>) => void;
  video: DraftVideo | null;
  allowedRatios: string[];
}) {
  const [hover, setHover] = React.useState<string | null>(null);
  const toggleRatio = (r: string) =>
    update({ aspect_ratios: d.aspect_ratios.includes(r) ? d.aspect_ratios.filter((x) => x !== r) : ASPECT_RATIOS.map((a) => a.value).filter((v) => v === r || d.aspect_ratios.includes(v)) });

  return (
    <div className="space-y-10">
      <section aria-labelledby="estilo-titulo">
        <h2 id="estilo-titulo" className="mb-4 font-sans text-base font-bold tracking-normal text-fg">
          Estilo
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5" role="radiogroup" aria-label="Estilo de edição">
          {EDITING_STYLES.map((s) => {
            const active = d.editing_style === s.value;
            return (
              <button
                key={s.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => update({ editing_style: s.value })}
                onMouseEnter={() => setHover(s.value)}
                onMouseLeave={() => setHover(null)}
                className={cn(
                  "group relative rounded-[20px] p-2 text-left transition-all duration-500 ease-[var(--ease-luxe)]",
                  active ? "neon-border bg-surface" : "border border-line bg-fg/[0.02] hover:-translate-y-1 hover:border-line-strong",
                )}
              >
                <StylePreview style={s.value} playing={active || hover === s.value} className="rounded-[14px] shadow-none" />
                <span className="flex items-center justify-between gap-2 px-1.5 pt-2.5">
                  <span className="font-display text-sm font-bold text-fg">{landing.styleNames[s.value]}</span>
                  {active && (
                    <span className="grid size-5 place-items-center rounded-full bg-cyan text-[#06222a]">
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                  )}
                </span>
                <span className="block px-1.5 pt-0.5 pb-1 text-xs leading-snug text-fg-3">{landing.styles[s.value]}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="formato-titulo">
        <h2 id="formato-titulo" className="mb-1 font-sans text-base font-bold tracking-normal text-fg">
          Formatos
        </h2>
        <p className="mb-4 text-sm text-fg-3">Escolha um ou mais. Você recebe um MP4 para cada.</p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4" role="group" aria-label="Formatos">
          {ASPECT_RATIOS.map((r) => {
            const active = d.aspect_ratios.includes(r.value);
            const allowed = allowedRatios.includes(r.value);
            const Icons = RATIO_PLATFORMS[r.value] ?? [];
            return (
              <button
                key={r.value}
                type="button"
                aria-pressed={active}
                disabled={!allowed}
                onClick={() => toggleRatio(r.value)}
                className={cn(
                  "relative flex flex-col items-center gap-3 rounded-[20px] border p-4 transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-45",
                  active ? "border-cyan/60 bg-cyan/[0.07] shadow-[var(--glow-cyan)]" : "border-line bg-fg/[0.02] hover:border-line-strong",
                )}
              >
                <span className="grid h-24 w-full place-items-center">
                  <span
                    className={cn("relative block overflow-hidden rounded-lg border bg-[#0e1014] transition-colors", active ? "border-cyan" : "border-line-strong")}
                    style={r.ratio >= 1 ? { width: Math.min(76 * r.ratio, 120), height: Math.min(76 * r.ratio, 120) / r.ratio } : { height: 76, width: 76 * r.ratio }}
                  >
                    {video?.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={video.thumbnailUrl} alt="" className="absolute inset-0 size-full object-cover" />
                    ) : (
                      <span className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--cyan)_25%,transparent),transparent_70%)]" />
                    )}
                  </span>
                </span>
                <span className="flex w-full items-center justify-between">
                  <span className="font-display text-base font-bold text-fg">{r.value}</span>
                  <span className="flex gap-1 text-fg-3">
                    {allowed ? Icons.map((I, i) => <I key={i} className="size-3.5" />) : <Lock className="size-3.5" />}
                  </span>
                </span>
                {active && (
                  <span className="absolute top-2.5 right-2.5 grid size-5 place-items-center rounded-full bg-cyan text-[#06222a]">
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {allowedRatios.length < 4 && <p className="mt-3 text-xs text-fg-3">Alguns formatos não estão no seu plano.</p>}
      </section>

      <section aria-labelledby="duracao-titulo">
        <h2 id="duracao-titulo" className="mb-4 font-sans text-base font-bold tracking-normal text-fg">
          Duração final
        </h2>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Duração final">
          {TARGET_DURATIONS.map((t) => {
            const active = d.duration === t.value;
            return (
              <button
                key={t.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => update({ duration: t.value })}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-medium transition-all duration-300",
                  active ? "border-cyan/60 bg-cyan/10 text-cyan shadow-[var(--glow-cyan)]" : "border-line text-fg-2 hover:border-line-strong hover:text-fg",
                )}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
