"use client";

import * as React from "react";
import Image from "next/image";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { AudioWaveform, Check, Clapperboard, FileText, Film, Route, Sparkles, Video } from "lucide-react";
import { SectionHeading } from "@/components/landing/section-heading";
import { Reveal } from "@/components/animations/reveal";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

const STAGES = [
  { key: "original", label: "Vídeo original", hint: "O arquivo bruto, como foi gravado.", icon: Video },
  { key: "analysis", label: "IA analisando", hint: "Áudio, pausas, ênfases e ruído.", icon: AudioWaveform },
  { key: "transcript", label: "Transcrição", hint: "Cada palavra, com tempo exato.", icon: FileText },
  { key: "plan", label: "Plano de edição", hint: "Cortes, zooms, legendas e B-roll.", icon: Route },
  { key: "edit", label: "Edição automática", hint: "Montagem, ritmo e acabamento.", icon: Clapperboard },
  { key: "final", label: "Vídeo final", hint: "Pronto em todos os formatos.", icon: Film },
] as const;

export function ProductDemo() {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.35 });
  const reduce = useReducedMotion();
  const [active, setActive] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  React.useEffect(() => {
    if (!inView || paused || reduce) return;
    const t = window.setInterval(() => setActive((a) => (a + 1) % STAGES.length), 3200);
    return () => window.clearInterval(t);
  }, [inView, paused, reduce]);

  return (
    <section id="produto" className="relative overflow-hidden py-28 md:py-40">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-1/3 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-navy-soft/40 blur-[140px]" />
      </div>
      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <SectionHeading
          eyebrow="O produto"
          title="Do vídeo bruto ao vídeo final,"
          highlight="sem abrir um editor."
          description="Você grava como sempre gravou. A inteligência da plataforma entende o que foi dito, organiza a edição e entrega um vídeo com acabamento profissional."
        />

        <div ref={ref} className="mt-16 grid gap-8 lg:mt-20 lg:grid-cols-[0.36fr_0.64fr] lg:gap-12">
          {/* Etapas */}
          <Reveal className="relative">
            <ol
              className="no-scrollbar -mx-6 flex snap-x gap-3 overflow-x-auto px-6 pb-2 lg:mx-0 lg:flex-col lg:gap-0 lg:overflow-visible lg:px-0"
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
            >
              <span aria-hidden className="absolute top-6 bottom-6 left-[1.45rem] hidden w-px bg-fg/[0.07] lg:block" />
              <motion.span
                aria-hidden
                className="absolute top-6 left-[1.45rem] hidden w-px origin-top bg-gradient-to-b from-gold-light via-gold to-gold/0 lg:block"
                animate={{ height: `calc(${(active / (STAGES.length - 1)) * 100}% - ${(active / (STAGES.length - 1)) * 3}rem)` }}
                transition={{ duration: 0.9, ease: EASE }}
              />
              {STAGES.map((s, i) => {
                const Icon = s.icon;
                const isActive = i === active;
                const done = i < active;
                return (
                  <li key={s.key} className="snap-start lg:py-1">
                    <button
                      type="button"
                      onClick={() => setActive(i)}
                      className={cn(
                        "group relative flex w-56 items-center gap-4 rounded-2xl border p-3 text-left transition-all duration-500 lg:w-full lg:border-transparent lg:p-3",
                        isActive ? "border-gold/30 bg-gold/[0.06] lg:border-gold/20" : "border-fg/[0.06] hover:bg-fg/[0.03]",
                      )}
                      aria-current={isActive ? "step" : undefined}
                    >
                      <span
                        className={cn(
                          "relative z-10 grid size-10 shrink-0 place-items-center rounded-full border transition-all duration-500",
                          isActive
                            ? "border-gold bg-gold text-on-gold shadow-[0_0_24px_-2px_rgba(198,161,91,0.75)]"
                            : done
                              ? "border-gold/50 bg-ink text-gold"
                              : "border-fg/15 bg-ink text-mist",
                        )}
                      >
                        {done ? <Check className="size-4" /> : <Icon className="size-4" />}
                      </span>
                      <span>
                        <span className={cn("block text-sm font-semibold transition-colors", isActive ? "text-ivory" : "text-ivory/70")}>
                          {s.label}
                        </span>
                        <span className="block text-xs text-mist">{s.hint}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </Reveal>

          {/* Janela do estúdio */}
          <Reveal delay={0.15}>
            <div className="panel gold-ring relative overflow-hidden rounded-[1.75rem] glow-gold-soft">
              <div className="flex items-center justify-between border-b border-fg/[0.06] px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-fg/15" />
                  <span className="size-2.5 rounded-full bg-fg/15" />
                  <span className="size-2.5 rounded-full bg-gold/60" />
                </div>
                <p className="truncate px-4 text-xs text-mist">
                  Projeto · <span className="text-ivory/80">revisao-do-beneficio.mp4</span>
                </p>
                <span className="flex items-center gap-1.5 text-[0.625rem] font-semibold tracking-[0.2em] text-gold uppercase">
                  <Sparkles className="size-3" /> IA
                </span>
              </div>
              <div className="relative aspect-[16/11] sm:aspect-[16/10]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={STAGES[active].key}
                    className="absolute inset-0 p-5 sm:p-8"
                    initial={{ opacity: 0, y: 14, filter: "blur(8px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -10, filter: "blur(6px)" }}
                    transition={{ duration: 0.6, ease: EASE }}
                  >
                    <StageView stage={STAGES[active].key} />
                  </motion.div>
                </AnimatePresence>
              </div>
              <div className="h-0.5 w-full bg-fg/[0.04]">
                <motion.div
                  className="h-full bg-gold-gradient"
                  animate={{ width: `${((active + 1) / STAGES.length) * 100}%` }}
                  transition={{ duration: 0.9, ease: EASE }}
                />
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function StageView({ stage }: { stage: (typeof STAGES)[number]["key"] }) {
  switch (stage) {
    case "original":
      return <OriginalView />;
    case "analysis":
      return <AnalysisView />;
    case "transcript":
      return <TranscriptView />;
    case "plan":
      return <PlanView />;
    case "edit":
      return <EditView />;
    case "final":
      return <FinalView />;
  }
}

function Tag({ children, gold }: { children: React.ReactNode; gold?: boolean }) {
  return (
    <span
      className={cn(
        "rounded-md border px-2 py-0.5 text-[0.625rem] font-semibold tracking-[0.12em] uppercase backdrop-blur",
        gold ? "border-gold/40 bg-gold/15 text-gold-light" : "border-fg/15 bg-black/50 text-ivory/80",
      )}
    >
      {children}
    </span>
  );
}

function OriginalView() {
  const clips = [18, 7, 24, 5, 14, 9, 20, 3];
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="relative flex-1 overflow-hidden rounded-xl border border-fg/10">
        <Image src="/media/justica-busto.webp" alt="" fill sizes="(min-width: 1024px) 700px, 100vw" className="object-cover saturate-[0.55] brightness-[0.62]" />
        <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.03)_0_1px,transparent_1px_3px)]" />
        <div className="absolute top-3 left-3 flex gap-2">
          <Tag>Bruto</Tag>
          <Tag>4:12</Tag>
          <Tag>16:9 · 1080p</Tag>
        </div>
        <div className="absolute bottom-3 left-3 flex items-center gap-2 text-[0.6875rem] text-ivory/70">
          <span className="size-2 animate-[blink-dot_1.2s_infinite] rounded-full bg-destructive" /> REC
        </div>
      </div>
      <div className="flex h-9 items-stretch gap-1 rounded-lg border border-fg/10 bg-black/30 p-1">
        {clips.map((w, i) => (
          <div key={i} style={{ flex: w }} className={cn("rounded-[4px]", i % 3 === 1 ? "bg-fg/[0.06]" : "bg-fg/[0.14]")} />
        ))}
      </div>
    </div>
  );
}

function AnalysisView() {
  const reduce = useReducedMotion();
  const bars = React.useMemo(
    () => Array.from({ length: 64 }, (_, i) => 0.18 + Math.abs(Math.sin(i * 0.55) * Math.cos(i * 0.21)) * 0.82),
    [],
  );
  return (
    <div className="flex h-full flex-col justify-between gap-4">
      <div className="flex flex-wrap gap-2">
        <Tag gold>Fala detectada · 92%</Tag>
        <Tag>Silêncios · 14</Tag>
        <Tag>Ruído · moderado</Tag>
        <Tag>Ênfases · 6</Tag>
      </div>
      <div className="relative flex h-40 items-center gap-[3px] sm:h-52">
        {bars.map((h, i) => {
          const silent = i % 13 === 11 || i % 13 === 12;
          return (
            <motion.span
              key={i}
              className={cn("flex-1 rounded-full", silent ? "bg-fg/10" : i % 9 === 4 ? "bg-gold-light" : "bg-gold/60")}
              initial={{ scaleY: 0.1 }}
              animate={reduce ? { scaleY: h } : { scaleY: silent ? [0.08, 0.12, 0.08] : [h * 0.5, h, h * 0.7] }}
              transition={{ duration: 1.2 + (i % 5) * 0.15, repeat: reduce ? 0 : Infinity, repeatType: "mirror", ease: "easeInOut" }}
              style={{ height: "100%", originY: 0.5 }}
            />
          );
        })}
        <motion.span
          className="absolute inset-y-0 w-px bg-ivory/70 shadow-[0_0_12px_rgba(245,245,242,0.8)]"
          initial={{ left: "0%" }}
          animate={{ left: "100%" }}
          transition={{ duration: 3, ease: "linear" }}
        />
      </div>
      <div className="grid grid-cols-3 gap-3 text-xs">
        {[
          ["Volume médio", "-16 LUFS"],
          ["Eco", "Reduzível"],
          ["Ritmo de fala", "148 ppm"],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg border border-fg/[0.07] bg-fg/[0.02] p-3">
            <p className="text-mist">{k}</p>
            <p className="mt-1 font-semibold text-ivory">{v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const TRANSCRIPT = [
  { t: "00:01", text: "Você sabia que o benefício do INSS pode ser revisado?", keys: ["revisado"] },
  { t: "00:05", text: "Neste vídeo, explico quando a revisão é possível", keys: ["revisão"] },
  { t: "00:09", text: "e quais documentos você precisa reunir antes.", keys: ["documentos"] },
  { t: "00:13", text: "É… né… vamos lá, primeiro ponto:", keys: [], cut: true },
  { t: "00:16", text: "o prazo decadencial é de dez anos.", keys: ["prazo decadencial"] },
];

function TranscriptView() {
  return (
    <div className="flex h-full flex-col gap-2.5 overflow-hidden">
      {TRANSCRIPT.map((line, i) => (
        <motion.div
          key={line.t}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 + i * 0.32, duration: 0.6, ease: EASE }}
          className={cn(
            "flex items-start gap-4 rounded-xl border px-4 py-3",
            line.cut ? "border-destructive/25 bg-destructive/[0.05]" : "border-fg/[0.06] bg-fg/[0.02]",
          )}
        >
          <span className="mt-0.5 font-mono text-[0.6875rem] text-gold/80">{line.t}</span>
          <p className={cn("text-sm leading-relaxed", line.cut ? "text-mist/60 line-through decoration-destructive/60" : "text-ivory/90")}>
            {highlight(line.text, line.keys)}
          </p>
          {line.cut && <span className="ml-auto shrink-0 text-[0.625rem] font-semibold tracking-wider text-[#ec8a80] uppercase">Corte</span>}
        </motion.div>
      ))}
    </div>
  );
}

function highlight(text: string, keys: string[]) {
  if (!keys.length) return text;
  const re = new RegExp(`(${keys.join("|")})`, "gi");
  return text.split(re).map((part, i) =>
    keys.some((k) => k.toLowerCase() === part.toLowerCase()) ? (
      <mark key={i} className="rounded bg-gold/20 px-1 text-gold-light">
        {part}
      </mark>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    ),
  );
}

const TRACKS = [
  { name: "Vídeo", blocks: [[0, 22], [24, 30], [56, 44]], tone: "bg-ivory/25" },
  { name: "Legendas", blocks: [[2, 18], [24, 26], [52, 22], [76, 22]], tone: "bg-gold/70" },
  { name: "Zoom", blocks: [[12, 8], [44, 6], [80, 8]], tone: "bg-info/60" },
  { name: "B-roll", blocks: [[30, 14], [64, 12]], tone: "bg-navy-soft ring-1 ring-gold/40" },
  { name: "Grafismos", blocks: [[6, 10], [58, 10], [88, 12]], tone: "bg-gold-light/40" },
];

function PlanView() {
  return (
    <div className="flex h-full flex-col justify-center gap-3">
      <div className="mb-2 flex items-center justify-between text-[0.6875rem] text-mist">
        <span>Plano gerado · 23 decisões</span>
        <span className="font-mono">00:00 — 01:12</span>
      </div>
      {TRACKS.map((track, ti) => (
        <div key={track.name} className="grid grid-cols-[5.5rem_1fr] items-center gap-3">
          <span className="text-xs text-mist">{track.name}</span>
          <div className="relative h-7 rounded-md bg-fg/[0.03]">
            {track.blocks.map(([start, width], bi) => (
              <motion.span
                key={bi}
                className={cn("absolute inset-y-1 rounded-[5px]", track.tone)}
                style={{ left: `${start}%`, width: `${width}%`, originX: 0 }}
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{ delay: 0.1 + ti * 0.15 + bi * 0.08, duration: 0.7, ease: EASE }}
              />
            ))}
          </div>
        </div>
      ))}
      <motion.div
        className="mt-3 flex flex-wrap gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
      >
        <Tag gold>Gancho em 00:01</Tag>
        <Tag>Destaque: “prazo decadencial”</Tag>
        <Tag>CTA em 01:08</Tag>
      </motion.div>
    </div>
  );
}

function EditView() {
  const words = ["O", "prazo", "decadencial", "é", "de", "dez", "anos."];
  const reduce = useReducedMotion();
  const [w, setW] = React.useState(0);
  React.useEffect(() => {
    if (reduce) return;
    const t = window.setInterval(() => setW((v) => (v + 1) % (words.length + 2)), 380);
    return () => window.clearInterval(t);
  }, [reduce, words.length]);
  return (
    <div className="flex h-full items-center justify-center gap-6">
      <div className="relative aspect-[9/16] h-full overflow-hidden rounded-2xl border border-gold/30 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.9)]">
        <motion.div className="absolute inset-0" animate={reduce ? {} : { scale: [1, 1.08, 1.08, 1] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
          <Image src="/media/justica-rosto.webp" alt="" fill sizes="300px" className="object-cover object-[50%_30%]" />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
        <div className="absolute inset-x-3 top-3 flex items-center gap-2">
          <span className="size-5 rounded-full bg-gold/80" />
          <span className="h-1.5 w-16 rounded-full bg-fg/50" />
        </div>
        <div className="absolute inset-x-3 bottom-[22%] flex flex-wrap justify-center gap-x-1.5 gap-y-0.5 text-center font-sans text-sm leading-tight font-extrabold uppercase sm:text-base">
          {words.map((word, i) => (
            <span
              key={i}
              className={cn(
                "transition-all duration-200",
                i < w ? (word === "decadencial" ? "text-gold-light" : "text-ivory") : "text-ivory/0",
                i === w - 1 && "scale-110",
              )}
              style={{ textShadow: "0 2px 12px rgba(0,0,0,0.8)" }}
            >
              {word}
            </span>
          ))}
        </div>
        <div className="absolute inset-x-3 bottom-4 rounded-lg border border-gold/40 bg-black/60 px-2.5 py-1.5 backdrop-blur">
          <p className="text-[0.625rem] font-bold text-ivory">Dr(a). Seu Nome</p>
          <p className="text-[0.5625rem] text-gold-light">OAB/UF 000.000 · Previdenciário</p>
        </div>
      </div>
      <div className="hidden flex-col gap-2.5 sm:flex">
        {["Silêncios removidos", "Zoom de ênfase", "Legenda palavra a palavra", "Nome e OAB", "Correção de cor", "Voz realçada"].map((t, i) => (
          <motion.div
            key={t}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.18, duration: 0.6, ease: EASE }}
            className="flex items-center gap-2.5 text-sm text-ivory/85"
          >
            <span className="grid size-5 place-items-center rounded-full bg-gold/15 text-gold">
              <Check className="size-3" />
            </span>
            {t}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function FinalView() {
  const formats = [
    { r: "9:16", cls: "aspect-[9/16] h-[78%]", label: "Reels · TikTok · Shorts" },
    { r: "1:1", cls: "aspect-square h-[46%]", label: "Feed · Meta Ads" },
    { r: "16:9", cls: "aspect-video h-[34%]", label: "YouTube · LinkedIn" },
  ];
  return (
    <div className="flex h-full items-end justify-center gap-4 sm:gap-7">
      {formats.map((f, i) => (
        <motion.div
          key={f.r}
          className="flex h-full flex-col items-center justify-end gap-3"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.15, duration: 0.8, ease: EASE }}
        >
          <div className={cn("relative overflow-hidden rounded-xl border border-gold/35 glow-gold-soft", f.cls)}>
            <Image src="/media/justica-rosto.webp" alt="" fill sizes="300px" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <span className="absolute top-2 right-2 grid size-5 place-items-center rounded-full bg-gold text-on-gold">
              <Check className="size-3" strokeWidth={3} />
            </span>
            <span className="absolute bottom-2 left-2 font-mono text-[0.625rem] text-ivory/80">MP4 · {f.r}</span>
          </div>
          <span className="text-center text-[0.625rem] leading-tight text-mist sm:text-xs">{f.label}</span>
        </motion.div>
      ))}
    </div>
  );
}
