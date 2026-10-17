"use client";

import * as React from "react";
import { motion } from "motion/react";
import {
  Award,
  Banknote,
  Briefcase,
  Building2,
  CircleDashed,
  GraduationCap,
  Gavel,
  HeartHandshake,
  Home,
  Landmark,
  Megaphone,
  MonitorPlay,
  Music2,
  Receipt,
  Scale,
  ShieldAlert,
  ShoppingBag,
  Square,
  Sprout,
  Users,
} from "lucide-react";
import { OptionCard } from "@/components/projects/option-card";
import { InstagramIcon, LinkedinIcon, YoutubeIcon } from "@/components/brand/social-icons";
import { EDITING_STYLES, LEGAL_AREAS, OBJECTIVES, PLATFORMS } from "@/lib/constants/domain";
import { cn } from "@/lib/utils";

const OBJECTIVE_ICONS: Record<string, React.ReactNode> = {
  trafego_pago: <Megaphone className="size-5" />,
  conteudo_organico: <Sprout className="size-5" />,
  institucional: <Building2 className="size-5" />,
  educacional: <GraduationCap className="size-5" />,
  autoridade: <Award className="size-5" />,
};

export function ObjectiveSelector({ value, onChange }: { value: string | null; onChange: (v: string) => void }) {
  return (
    <div role="radiogroup" aria-label="Objetivo do vídeo" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {OBJECTIVES.map((o) => (
        <OptionCard
          key={o.value}
          selected={value === o.value}
          onSelect={() => onChange(o.value)}
          icon={OBJECTIVE_ICONS[o.value]}
          title={o.label}
          description={o.description}
        />
      ))}
    </div>
  );
}

const AREA_ICONS: Record<string, React.ReactNode> = {
  previdenciario: <Landmark className="size-4" />,
  consumidor: <ShoppingBag className="size-4" />,
  fraudes_bancarias: <ShieldAlert className="size-4" />,
  trabalhista: <Briefcase className="size-4" />,
  criminal: <Gavel className="size-4" />,
  familia: <Users className="size-4" />,
  civel: <Scale className="size-4" />,
  empresarial: <Building2 className="size-4" />,
  tributario: <Receipt className="size-4" />,
  imobiliario: <Home className="size-4" />,
  institucional: <HeartHandshake className="size-4" />,
  outro: <Banknote className="size-4" />,
};

export function LegalAreaSelector({ value, onChange }: { value: string | null; onChange: (v: string) => void }) {
  return (
    <div role="radiogroup" aria-label="Área jurídica" className="flex flex-wrap gap-2.5">
      {LEGAL_AREAS.map((a) => {
        const selected = value === a.value;
        return (
          <motion.button
            key={a.value}
            type="button"
            role="radio"
            aria-checked={selected}
            whileTap={{ scale: 0.96 }}
            onClick={() => onChange(a.value)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm transition-all duration-400",
              selected
                ? "border-gold/60 bg-gold/15 text-gold-light shadow-[0_0_24px_-8px_color-mix(in_oklab,var(--gold)_80%,transparent)]"
                : "border-fg/10 bg-fg/[0.02] text-ivory/80 hover:border-fg/25 hover:text-ivory",
            )}
          >
            <span className={selected ? "text-gold-light" : "text-mist"}>{AREA_ICONS[a.value]}</span>
            {a.label}
          </motion.button>
        );
      })}
    </div>
  );
}

/** Mini prévia animada que comunica o ritmo/linguagem de cada estilo. */
function StyleSwatch({ style, active }: { style: string; active: boolean }) {
  const bars = { institucional: [1, 1], dinamico: [1, 0.6, 0.9, 0.5], cinematografico: [1, 0.85], performance: [0.9, 0.4, 0.8, 0.3, 0.7], descontraido: [0.8, 0.6, 0.9] }[style] ?? [1];
  return (
    <div className="relative h-20 w-full overflow-hidden rounded-xl border border-fg/[0.07] bg-gradient-to-br from-navy-deep to-black/80">
      {style === "cinematografico" && (
        <>
          <span className="absolute inset-x-0 top-0 h-3 bg-black" />
          <span className="absolute inset-x-0 bottom-0 h-3 bg-black" />
        </>
      )}
      <div className="absolute inset-x-3 bottom-3 flex items-end gap-1">
        {bars.map((h, i) => (
          <motion.span
            key={i}
            className={cn("flex-1 rounded-sm", active ? "bg-gold/70" : "bg-fg/15")}
            style={{ height: 6 }}
            animate={active ? { opacity: [0.5, 1, 0.5] } : { opacity: 0.6 }}
            transition={{ duration: 0.6 + i * 0.12, repeat: active ? Infinity : 0 }}
          />
        ))}
      </div>
      <span
        className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap",
          style === "institucional" && "font-display text-sm text-ivory/80 italic",
          style === "dinamico" && "font-sans text-xs font-extrabold text-ivory uppercase",
          style === "cinematografico" && "font-display text-xs tracking-[0.4em] text-ivory/80 uppercase",
          style === "performance" && "rounded bg-ivory px-1.5 py-0.5 font-sans text-[0.625rem] font-extrabold text-on-gold uppercase",
          style === "descontraido" && "rounded-full bg-gold px-2 py-0.5 font-sans text-[0.625rem] font-bold text-on-gold",
        )}
      >
        {{ institucional: "“Autoridade”", dinamico: "SEUS DIREITOS", cinematografico: "Precisão", performance: "Teve o benefício negado?", descontraido: "Vamos por partes" }[style]}
      </span>
    </div>
  );
}

export function EditingStyleSelector({ value, onChange }: { value: string | null; onChange: (v: string) => void }) {
  return (
    <div role="radiogroup" aria-label="Estilo de edição" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {EDITING_STYLES.map((s) => {
        const selected = value === s.value;
        return (
          <OptionCard key={s.value} selected={selected} onSelect={() => onChange(s.value)} title={<span className="sr-only">{s.label}</span>} className="gap-3">
            <StyleSwatch style={s.value} active={selected} />
            <span className="flex w-full items-baseline justify-between gap-3">
              <span className="font-display text-xl text-ivory">{s.label}</span>
              <span className="font-display text-sm text-gold/70">{s.index}</span>
            </span>
            <span className="text-[0.8125rem] leading-relaxed text-mist">{s.description}</span>
            <span className="flex flex-wrap gap-1.5">
              {s.traits.map((t) => (
                <span key={t} className="rounded-full border border-fg/10 px-2 py-0.5 text-[0.6875rem] text-ivory/70">
                  {t}
                </span>
              ))}
            </span>
            <span className="text-xs text-mist/80">
              Ideal para: <span className="text-ivory/85">{s.idealFor}</span>
            </span>
          </OptionCard>
        );
      })}
    </div>
  );
}

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  instagram_reels: <InstagramIcon className="size-5" />,
  tiktok: <Music2 className="size-5" />,
  youtube_shorts: <YoutubeIcon className="size-5" />,
  stories: <CircleDashed className="size-5" />,
  instagram_feed: <Square className="size-5" />,
  meta_ads: <Megaphone className="size-5" />,
  youtube: <MonitorPlay className="size-5" />,
  linkedin: <LinkedinIcon className="size-5" />,
};

function RatioGlyph({ ratio }: { ratio: string }) {
  const [w, h] = ratio.split(":").map(Number);
  const s = 22 / Math.max(w, h);
  return <span className="inline-block rounded-[3px] border border-current" style={{ width: Math.max(6, w * s), height: Math.max(6, h * s) }} />;
}

export function PlatformSelector({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (p: string) => onChange(value.includes(p) ? value.filter((x) => x !== p) : [...value, p]);
  return (
    <div role="group" aria-label="Onde você pretende publicar" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {PLATFORMS.map((p) => (
        <OptionCard
          key={p.value}
          multiple
          selected={value.includes(p.value)}
          onSelect={() => toggle(p.value)}
          icon={PLATFORM_ICONS[p.value]}
          title={p.label}
          badge={
            <span className="flex items-center gap-2 text-xs text-mist">
              <RatioGlyph ratio={p.ratios[0]} />
              {p.ratios.join(" ou ")}
            </span>
          }
        />
      ))}
    </div>
  );
}
