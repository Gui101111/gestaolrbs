"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown, Film, ImagePlus, RefreshCw, ShieldCheck, Sparkles, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { StylePreview } from "@/components/examples/style-preview";
import { InstagramIcon, LinkedinIcon, MetaIcon, TiktokIcon, YoutubeIcon } from "@/components/brand/social-icons";
import { landing } from "@/content/landing";
import { defaultsFor } from "@/lib/browser-editor/looks";
import { RATIOS, type CaptionStyle, type EditOptions, type Ratio, type StyleId } from "@/lib/browser-editor/types";
import { cn } from "@/lib/utils";

export interface PickedVideo {
  file: File;
  url: string;
  duration: number;
  width: number;
  height: number;
}

const STYLE_IDS: StyleId[] = ["institucional", "dinamico", "cinematografico", "performance", "descontraido"];
const RATIO_ICONS: Record<Ratio, React.ComponentType<{ className?: string }>[]> = {
  "9:16": [TiktokIcon, InstagramIcon, YoutubeIcon],
  "1:1": [InstagramIcon, LinkedinIcon],
  "4:5": [InstagramIcon, MetaIcon],
  "16:9": [YoutubeIcon, LinkedinIcon],
};
const RATIO_LABEL: Record<Ratio, string> = { "9:16": "Reels, TikTok, Shorts", "1:1": "Feed quadrado", "4:5": "Feed e anúncios", "16:9": "YouTube e LinkedIn" };
const CAPTION_STYLES: { value: CaptionStyle; label: string }[] = [
  { value: "palavra", label: "Palavra por palavra" },
  { value: "discreta", label: "Discreta" },
  { value: "caixa_alta", label: "Caixa alta" },
];

export const fmtTime = (s: number) => {
  const t = Math.max(0, Math.round(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

function RatioBox({ ratio, active }: { ratio: Ratio; active: boolean }) {
  const [w, h] = ratio.split(":").map(Number);
  const k = 64 / Math.max(w, h);
  return (
    <span
      className={cn("block rounded-md border-2 transition-colors", active ? "border-cyan bg-cyan/10" : "border-line-strong bg-fg/[0.03]")}
      style={{ width: w * k, height: h * k }}
    />
  );
}

export function StepUpload({ video, onPick, opts, update }: { video: PickedVideo | null; onPick: (f: File) => void; opts: EditOptions; update: (p: Partial<EditOptions>) => void }) {
  const input = React.useRef<HTMLInputElement>(null);
  const [drag, setDrag] = React.useState(false);
  const pick = (files: FileList | null) => {
    const f = files?.[0];
    if (f) onPick(f);
  };
  return (
    <div className="space-y-6">
      <input ref={input} type="file" accept="video/*,.mov,.mp4,.m4v,.webm" className="hidden" onChange={(e) => pick(e.target.files)} />
      {!video ? (
        <button
          type="button"
          onClick={() => input.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            pick(e.dataTransfer.files);
          }}
          className={cn(
            "group relative flex w-full flex-col items-center gap-4 overflow-hidden rounded-[26px] border border-dashed px-6 py-12 text-center transition-all duration-500 md:py-16",
            drag ? "border-cyan bg-cyan/[0.08] shadow-[var(--glow-cyan)]" : "border-line-strong bg-fg/[0.02] hover:border-cyan/60 hover:bg-cyan/[0.04]",
          )}
        >
          <span aria-hidden className="pointer-events-none absolute -top-16 left-1/2 size-56 -translate-x-1/2 rounded-full bg-cyan/15 blur-3xl transition-opacity duration-700 group-hover:opacity-100 md:opacity-60" />
          <span className="relative grid size-16 place-items-center rounded-2xl border border-cyan/40 bg-cyan/10 text-cyan shadow-[0_0_24px_-6px_var(--cyan)]">
            <Upload className="size-7" />
          </span>
          <span className="relative">
            <span className="block font-display text-xl font-bold text-fg md:text-2xl">Escolha o vídeo</span>
            <span className="mt-1.5 block text-sm text-fg-2">Gravado no celular ou na câmera. MP4, MOV ou WebM.</span>
          </span>
          <span className="relative inline-flex h-11 items-center gap-2 rounded-full bg-gold px-6 text-sm font-bold text-[#1a1408] shadow-[0_0_24px_-6px_var(--gold)]">
            <Film className="size-4" /> Selecionar arquivo
          </span>
        </button>
      ) : (
        <div className="grid gap-4 rounded-[24px] border border-line bg-fg/[0.02] p-3 sm:grid-cols-[minmax(0,220px)_1fr] sm:items-center sm:p-4">
          <video src={video.url} muted playsInline controls preload="metadata" className="max-h-[42svh] w-full rounded-[16px] bg-black object-contain" />
          <div className="min-w-0 space-y-3 px-1">
            <p className="truncate text-sm font-semibold text-fg">{video.file.name}</p>
            <div className="flex flex-wrap gap-2 text-xs text-fg-2">
              <span className="rounded-full border border-line px-2.5 py-1">{fmtTime(video.duration)}</span>
              <span className="rounded-full border border-line px-2.5 py-1">
                {video.width}×{video.height}
              </span>
              <span className="rounded-full border border-line px-2.5 py-1">{(video.file.size / 1024 / 1024).toFixed(0)} MB</span>
            </div>
            <Button variant="glass" size="sm" onClick={() => input.current?.click()}>
              <RefreshCw /> Trocar vídeo
            </Button>
          </div>
        </div>
      )}

      <p className="flex items-start gap-2 text-[0.8125rem] text-fg-3">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-cyan" />
        A edição acontece aqui, no seu aparelho. O vídeo não é enviado para servidor; só o texto da fala e três quadros vão para a revisão com IA.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Seu nome no vídeo" htmlFor="be-nome" hint="Aparece na identificação e na vinheta.">
          <Input id="be-nome" value={opts.name} maxLength={48} onChange={(e) => update({ name: e.target.value })} placeholder="Dra. Ana Souza" autoComplete="name" />
        </Field>
        <Field label="OAB" htmlFor="be-oab" optional>
          <Input id="be-oab" value={opts.oab} maxLength={32} onChange={(e) => update({ oab: e.target.value })} placeholder="OAB/SP 123.456" />
        </Field>
      </div>
    </div>
  );
}

export function StepStyle({ opts, update, video }: { opts: EditOptions; update: (p: Partial<EditOptions>) => void; video: PickedVideo | null }) {
  const [hover, setHover] = React.useState<string | null>(null);
  const toggle = (r: Ratio) => {
    const has = opts.ratios.includes(r);
    if (has && opts.ratios.length === 1) return;
    update({ ratios: RATIOS.filter((x) => (x === r ? !has : opts.ratios.includes(x))) });
  };
  const srcRatio = video ? video.width / video.height : null;
  return (
    <div className="space-y-9">
      <section aria-labelledby="be-estilo">
        <h3 id="be-estilo" className="mb-3 font-sans text-base font-bold tracking-normal text-fg">
          Estilo
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" role="radiogroup" aria-label="Estilo de edição">
          {STYLE_IDS.map((s) => {
            const active = opts.style === s;
            return (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => update({ style: s, ...defaultsFor(s) })}
                onMouseEnter={() => setHover(s)}
                onMouseLeave={() => setHover(null)}
                className={cn(
                  "group relative rounded-[20px] p-2 text-left transition-all duration-500 ease-[var(--ease-luxe)]",
                  active ? "neon-border bg-surface" : "border border-line bg-fg/[0.02] hover:-translate-y-1 hover:border-line-strong",
                )}
              >
                <StylePreview style={s} playing={active || hover === s} className="rounded-[14px] shadow-none" />
                <span className="flex items-center justify-between gap-2 px-1.5 pt-2.5">
                  <span className="font-display text-sm font-bold text-fg">{landing.styleNames[s]}</span>
                  {active && (
                    <span className="grid size-5 place-items-center rounded-full bg-cyan text-[#06222a]">
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                  )}
                </span>
                <span className="block px-1.5 pt-0.5 pb-1 text-xs leading-snug text-fg-3">{landing.styles[s]}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="be-formatos">
        <h3 id="be-formatos" className="mb-1 font-sans text-base font-bold tracking-normal text-fg">
          Formatos
        </h3>
        <p className="mb-3 text-sm text-fg-3">Um MP4 para cada. Enquadramos você automaticamente.</p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4" role="group" aria-label="Formatos">
          {RATIOS.map((r) => {
            const active = opts.ratios.includes(r);
            const Icons = RATIO_ICONS[r];
            const [w, h] = r.split(":").map(Number);
            const same = srcRatio !== null && Math.abs(w / h - srcRatio) / srcRatio < 0.03;
            return (
              <button
                key={r}
                type="button"
                aria-pressed={active}
                onClick={() => toggle(r)}
                className={cn(
                  "relative flex flex-col items-center gap-3 rounded-[20px] border p-4 transition-all duration-300",
                  active ? "border-cyan/60 bg-cyan/[0.07] shadow-[var(--glow-cyan)]" : "border-line bg-fg/[0.02] hover:border-line-strong",
                )}
              >
                <span className="grid h-20 place-items-center">
                  <RatioBox ratio={r} active={active} />
                </span>
                <span className="w-full text-left">
                  <span className="flex items-center justify-between">
                    <span className="font-display text-base font-bold text-fg">{r}</span>
                    <span className="flex gap-1 text-fg-3">
                      {Icons.map((I, i) => (
                        <I key={i} className="size-3.5" />
                      ))}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-[0.6875rem] text-fg-3">{same ? "Igual ao original" : RATIO_LABEL[r]}</span>
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
        {opts.ratios.length > 2 && <p className="mt-2 text-xs text-fg-3">Com 3 ou mais formatos, gravamos em 720p para caber no celular.</p>}
      </section>
    </div>
  );
}

function Row({ title, hint, checked, onChange, children, badge }: { title: string; hint: string; checked: boolean; onChange: (v: boolean) => void; children?: React.ReactNode; badge?: string }) {
  const id = React.useId();
  return (
    <li className="px-4 py-3.5 md:px-5">
      <div className="flex items-center justify-between gap-4">
        <label htmlFor={id} className="min-w-0 cursor-pointer">
          <span className="flex items-center gap-2 text-sm font-semibold text-fg">
            {title}
            {badge && <span className="rounded-full bg-violet/15 px-2 py-0.5 text-[0.625rem] font-bold tracking-wide text-violet uppercase">{badge}</span>}
          </span>
          <span className="block text-xs text-fg-3">{hint}</span>
        </label>
        <Switch id={id} checked={checked} onCheckedChange={onChange} />
      </div>
      <AnimatePresence initial={false}>
        {checked && children && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
            <div className="pt-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

export function StepDetails({ opts, update, aiReady }: { opts: EditOptions; update: (p: Partial<EditOptions>) => void; aiReady: boolean }) {
  const logoInput = React.useRef<HTMLInputElement>(null);
  const [scriptOpen, setScriptOpen] = React.useState(Boolean(opts.script));
  const [flash, setFlash] = React.useState(false);
  const logoUrl = React.useMemo(() => (opts.logo ? URL.createObjectURL(opts.logo) : null), [opts.logo]);
  React.useEffect(() => () => void (logoUrl && URL.revokeObjectURL(logoUrl)), [logoUrl]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-fg-2">Já deixamos o recomendado para o estilo {landing.styleNames[opts.style]}.</p>
        <Button
          variant="neon"
          size="sm"
          onClick={() => {
            update(defaultsFor(opts.style));
            setFlash(true);
            window.setTimeout(() => setFlash(false), 900);
          }}
        >
          <Sparkles /> Usar recomendado
        </Button>
      </div>

      <ul className={cn("divide-y divide-line overflow-hidden rounded-[22px] border border-line bg-fg/[0.02] transition-shadow duration-700", flash && "shadow-[var(--glow-cyan)]")}>
        <Row title="Cortar pausas e respirações" hint="Silêncios longos saem; o ritmo segue o estilo." checked={opts.cutPauses} onChange={(v) => update({ cutPauses: v })} />
        <Row title="Tirar frases repetidas" hint="Quando você recomeça uma frase, fica só a boa." badge="IA" checked={opts.removeMistakes} onChange={(v) => update({ removeMistakes: v })} />
        <Row title="Legendas automáticas" hint="Transcritas aqui e revisadas pela IA." checked={opts.captions} onChange={(v) => update({ captions: v })}>
          <div className="flex flex-wrap gap-2">
            {CAPTION_STYLES.map((c) => (
              <button
                key={c.value}
                type="button"
                aria-pressed={opts.captionStyle === c.value}
                onClick={() => update({ captionStyle: c.value })}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all",
                  opts.captionStyle === c.value ? "border-cyan/60 bg-cyan/10 text-cyan" : "border-line text-fg-2 hover:border-line-strong hover:text-fg",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        </Row>
        <Row title="Nome e OAB na tela" hint="Identificação elegante no começo do vídeo." checked={opts.lowerThird} onChange={(v) => update({ lowerThird: v })}>
          {!opts.name.trim() && (
            <Input value={opts.name} maxLength={48} onChange={(e) => update({ name: e.target.value })} placeholder="Seu nome, ex.: Dra. Ana Souza" className="h-10 text-sm" aria-label="Seu nome" />
          )}
          {opts.name.trim() && (
            <p className="text-xs text-fg-2">
              {opts.name}
              {opts.oab ? ` · ${opts.oab}` : ""}
            </p>
          )}
        </Row>
        <Row title="Título de impacto" hint="Nos 3 primeiros segundos." badge={opts.hookText.trim() ? undefined : "IA"} checked={opts.hook} onChange={(v) => update({ hook: v })}>
          <Input value={opts.hookText} maxLength={80} onChange={(e) => update({ hookText: e.target.value })} placeholder="Vazio: a IA sugere pela sua fala" className="h-10 text-sm" aria-label="Título de impacto" />
        </Row>
        <Row title="Chamada final" hint="Seguir, site ou WhatsApp, dentro das regras da OAB." checked={opts.cta} onChange={(v) => update({ cta: v })}>
          <Input value={opts.ctaText} maxLength={60} onChange={(e) => update({ ctaText: e.target.value })} placeholder="Ex.: Siga @anasouza.adv para mais" className="h-10 text-sm" aria-label="Chamada final" />
        </Row>
        <Row title="Vinheta" hint="Abertura e encerramento com seu nome." checked={opts.vignette} onChange={(v) => update({ vignette: v })} />
        <Row title="Zooms automáticos" hint="Aproximações nos cortes para manter a atenção." checked={opts.zoom} onChange={(v) => update({ zoom: v })} />
        <Row title="Melhorar o áudio" hint="Tira ruído grave, nivela e realça a voz." checked={opts.enhanceAudio} onChange={(v) => update({ enhanceAudio: v })} />
        <Row title="Revisão OAB" hint="Avisamos falas sensíveis. Nada é cortado." badge="IA" checked={opts.oabReview} onChange={(v) => update({ oabReview: v })} />
        <li className="flex items-center justify-between gap-4 px-4 py-3.5 md:px-5">
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-fg">Logo</span>
            <span className="block text-xs text-fg-3">PNG com fundo transparente, no canto do vídeo.</span>
          </span>
          <input
            ref={logoInput}
            type="file"
            accept="image/png,image/webp,image/jpeg,image/svg+xml"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) update({ logo: f });
              e.target.value = "";
            }}
          />
          {logoUrl ? (
            <span className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoUrl} alt="Logo escolhida" className="h-9 max-w-20 rounded-md bg-fg/[0.06] object-contain p-1" />
              <Button variant="ghost" size="icon-sm" aria-label="Remover logo" onClick={() => update({ logo: null })}>
                <X />
              </Button>
            </span>
          ) : (
            <Button variant="glass" size="sm" onClick={() => logoInput.current?.click()}>
              <ImagePlus /> Escolher
            </Button>
          )}
        </li>
      </ul>

      <div className="rounded-[22px] border border-line bg-fg/[0.02]">
        <button type="button" onClick={() => setScriptOpen((v) => !v)} aria-expanded={scriptOpen} className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left md:px-5">
          <span>
            <span className="block text-sm font-semibold text-fg">Roteiro (opcional)</span>
            <span className="block text-xs text-fg-3">Ajuda a acertar nomes e leis. Vira legenda se a transcrição não rodar no seu navegador.</span>
          </span>
          <ChevronDown className={cn("size-4 shrink-0 text-fg-3 transition-transform", scriptOpen && "rotate-180")} />
        </button>
        {scriptOpen && (
          <div className="px-4 pb-4 md:px-5">
            <Textarea value={opts.script} maxLength={8000} rows={5} onChange={(e) => update({ script: e.target.value })} placeholder="Cole aqui o texto que você falou no vídeo." aria-label="Roteiro" />
          </div>
        )}
      </div>

      {!aiReady && (
        <p className="text-xs text-fg-3">
          A revisão com IA (Claude) funciona quando esta página é aberta no claude.ai. Fora dele, usamos a revisão automática local.
        </p>
      )}
    </div>
  );
}
