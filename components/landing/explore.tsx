"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  HelpCircle,
  LayoutGrid,
  Palette,
  PlayCircle,
  RectangleVertical,
  Upload,
  WalletCards,
} from "lucide-react";
import { Aurora } from "@/components/effects/aurora";
import { BeforeAfter } from "@/components/examples/before-after";
import { StylePreview } from "@/components/examples/style-preview";
import { FormatMorph } from "@/components/examples/format-morph";
import { WaitlistForm } from "@/components/landing/waitlist-form";
import { EXPLORE_EVENT } from "@/components/landing/explore-events";
import { AccentText } from "@/components/shared/accent-text";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { landing, type ExploreTabId } from "@/content/landing";
import { exemplos } from "@/content/exemplos";
import { duvidas } from "@/content/como-fazer";
import { EDITING_STYLES } from "@/lib/constants/domain";
import { ROUTES } from "@/lib/routes";
import { cn, formatCurrency } from "@/lib/utils";
import type { Plan } from "@/types/domain";

const EASE = [0.22, 1, 0.36, 1] as const;
const TABS = landing.explore.tabs;
const TAB_IDS = TABS.map((t) => t.id) as ExploreTabId[];
const TAB_ICONS: Record<ExploreTabId, React.ComponentType<{ className?: string }>> = {
  exemplos: PlayCircle,
  "como-funciona": LayoutGrid,
  estilos: Palette,
  formatos: RectangleVertical,
  planos: WalletCards,
  duvidas: HelpCircle,
};

/* A aba ativa vive no hash da URL (#exemplos, #planos…). */
function subscribeHash(cb: () => void) {
  window.addEventListener("hashchange", cb);
  window.addEventListener(EXPLORE_EVENT, cb);
  return () => {
    window.removeEventListener("hashchange", cb);
    window.removeEventListener(EXPLORE_EVENT, cb);
  };
}
const readHash = () => window.location.hash.slice(1);

function selectTab(id: ExploreTabId) {
  history.replaceState(null, "", `#${id}`);
  window.dispatchEvent(new CustomEvent(EXPLORE_EVENT, { detail: id }));
}

/** Bloco 3: um painel de vidro com abas laterais. Mouse, toque, teclado e hash. */
export function Explore({ plans, isAuthenticated = false }: { plans: Plan[]; isAuthenticated?: boolean }) {
  const hash = React.useSyncExternalStore(subscribeHash, readHash, () => "");
  const active: ExploreTabId = (TAB_IDS as string[]).includes(hash) ? (hash as ExploreTabId) : "exemplos";
  const tab = TABS.find((t) => t.id === active) ?? TABS[0];
  const refs = React.useRef<Record<string, HTMLButtonElement | null>>({});

  // No celular, mantém o chip ativo visível na faixa rolável
  React.useEffect(() => {
    const el = refs.current[active];
    const list = el?.parentElement;
    if (!el || !list || list.scrollWidth <= list.clientWidth) return;
    list.scrollTo({ left: el.offsetLeft - list.clientWidth / 2 + el.clientWidth / 2, behavior: "smooth" });
  }, [active]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const i = TAB_IDS.indexOf(active);
    let next = -1;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") next = (i + 1) % TAB_IDS.length;
    if (e.key === "ArrowUp" || e.key === "ArrowLeft") next = (i - 1 + TAB_IDS.length) % TAB_IDS.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = TAB_IDS.length - 1;
    if (next < 0) return;
    e.preventDefault();
    selectTab(TAB_IDS[next]);
    refs.current[TAB_IDS[next]]?.focus();
  };

  return (
    <section id="explorar" data-accent={tab.accent} className="relative scroll-mt-24 px-3 py-14 md:px-5 md:py-24" aria-label="Explorar">
      {TAB_IDS.map((id) => (
        <span key={id} id={id} aria-hidden className="absolute top-0 left-0 scroll-mt-24" />
      ))}
      <div className="relative mx-auto max-w-6xl">
        <Aurora variant="subtle" className="-inset-x-10 -inset-y-16 rounded-[48px]" />
        <motion.div
          initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 1, ease: EASE }}
          className="glass relative grid gap-3 rounded-[28px] p-2.5 shadow-[var(--shadow-pop)] md:rounded-[34px] md:p-3.5 lg:grid-cols-[230px_1fr]"
        >
          <div className="flex min-w-0 flex-col gap-3 lg:py-3 lg:pl-2">
            <p className="eyebrow hidden px-3 lg:block">{landing.explore.eyebrow}</p>
            <div
              role="tablist"
              aria-orientation="vertical"
              aria-label="Seções"
              onKeyDown={onKeyDown}
              className="no-scrollbar flex gap-1.5 overflow-x-auto p-1 lg:flex-col lg:overflow-visible lg:p-0"
            >
              {TABS.map((t) => {
                const Icon = TAB_ICONS[t.id];
                const selected = t.id === active;
                return (
                  <button
                    key={t.id}
                    ref={(el) => {
                      refs.current[t.id] = el;
                    }}
                    id={`tab-${t.id}`}
                    role="tab"
                    type="button"
                    aria-selected={selected}
                    aria-controls="explorar-painel"
                    tabIndex={selected ? 0 : -1}
                    onClick={() => selectTab(t.id)}
                    className={cn(
                      "relative flex shrink-0 items-center gap-2.5 rounded-full px-4 py-2.5 text-left text-sm font-semibold whitespace-nowrap transition-colors duration-300 outline-none lg:rounded-2xl lg:py-3",
                      selected ? "text-fg" : "text-fg-2 hover:bg-fg/[0.05] hover:text-fg",
                      "focus-visible:ring-2 focus-visible:ring-cyan/60",
                    )}
                  >
                    {selected && (
                      <motion.span
                        layoutId="explore-indicator"
                        transition={{ type: "spring", stiffness: 380, damping: 32 }}
                        className="absolute inset-0 rounded-[inherit] border border-cyan/45 bg-cyan/[0.08] shadow-[0_0_0_1px_color-mix(in_oklab,var(--cyan)_14%,transparent),0_0_22px_-6px_var(--cyan)]"
                      />
                    )}
                    <Icon className={cn("relative size-4", selected ? "text-cyan" : "text-fg-3")} />
                    <span className="relative">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div
            id="explorar-painel"
            role="tabpanel"
            aria-labelledby={`tab-${active}`}
            className="relative min-h-[520px] min-w-0 overflow-hidden rounded-[22px] border border-line bg-fg/[0.02] p-5 md:rounded-[26px] md:p-8 lg:min-h-[580px]"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 14, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -8, filter: "blur(6px)" }}
                transition={{ duration: 0.45, ease: EASE }}
                className="flex h-full flex-col"
              >
                <h2 className="text-3xl leading-tight text-fg md:text-4xl">
                  <AccentText text={tab.title} />
                </h2>
                <div className="mt-6 flex-1 md:mt-8">
                  {active === "exemplos" && <ExamplesTab />}
                  {active === "como-funciona" && <HowTab />}
                  {active === "estilos" && <StylesTab />}
                  {active === "formatos" && <FormatMorph formats={landing.formats} />}
                  {active === "planos" && <PlansTab plans={plans} isAuthenticated={isAuthenticated} />}
                  {active === "duvidas" && <FaqTab />}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ---------------------------------- Exemplos --------------------------------- */

function ExamplesTab() {
  const scroller = React.useRef<HTMLDivElement>(null);
  const items = exemplos.filter((e) => e.format === "9:16");
  const scrollBy = (dir: 1 | -1) => scroller.current?.scrollBy({ left: dir * 240, behavior: "smooth" });

  return (
    <div className="relative">
      <div className="absolute -top-[4.25rem] right-0 hidden gap-2 md:flex">
        <Button variant="glass" size="icon-sm" onClick={() => scrollBy(-1)} aria-label="Exemplo anterior">
          <ChevronLeft />
        </Button>
        <Button variant="glass" size="icon-sm" onClick={() => scrollBy(1)} aria-label="Próximo exemplo">
          <ChevronRight />
        </Button>
      </div>
      <div ref={scroller} className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2">
        {items.map((ex, i) => (
          <motion.article
            key={ex.id}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.08 * i }}
            className="w-[200px] shrink-0 snap-start md:w-[218px]"
          >
            <BeforeAfter example={ex} className="aspect-[9/16] rounded-[20px] border border-line" hint={i === 0} />
            <div className="mt-3 flex items-center gap-2">
              <span className="rounded-full border border-cyan/35 bg-cyan/10 px-2 py-0.5 text-[0.625rem] font-bold tracking-[0.08em] text-cyan uppercase">
                {ex.styleLabel}
              </span>
              <span className="text-xs text-fg-3">{ex.duration}</span>
            </div>
            <p className="mt-1.5 text-sm font-semibold text-fg">{ex.title}</p>
            <p className="text-xs text-fg-3">{ex.areaLabel}</p>
          </motion.article>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------- Como funciona ------------------------------- */

const STEP_ICONS = { upload: Upload, palette: Palette, download: Download } as const;

function HowTab() {
  return (
    <div className="relative grid gap-8 pt-2 md:grid-cols-3 md:gap-6 md:pt-10">
      {/* Linha neon que se desenha entre os passos */}
      <div aria-hidden className="absolute top-[3.25rem] right-[16%] left-[16%] hidden h-px bg-line md:block">
        <motion.span
          className="absolute inset-0 origin-left bg-brand-gradient shadow-[0_0_12px_var(--cyan)]"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.6, ease: EASE, delay: 0.3 }}
        />
        <span className="absolute -top-[3px] left-0 size-[7px] rounded-full bg-white shadow-[0_0_12px_var(--cyan)] animate-[travel_3.2s_var(--ease-luxe)_1.9s_infinite]" />
      </div>
      <div aria-hidden className="absolute top-10 bottom-10 left-10 w-px bg-line md:hidden">
        <motion.span
          className="absolute inset-0 origin-top bg-brand-gradient shadow-[0_0_12px_var(--cyan)]"
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 1.6, ease: EASE, delay: 0.3 }}
        />
      </div>
      {landing.steps.map((s, i) => {
        const Icon = STEP_ICONS[s.icon as keyof typeof STEP_ICONS];
        return (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.25 + i * 0.35 }}
            className="relative flex items-center gap-5 md:flex-col md:text-center"
          >
            <span className="neon-border relative grid size-20 shrink-0 place-items-center rounded-full [--neon-radius:999px] bg-surface md:size-[6.5rem]">
              <Icon className="size-8 text-cyan md:size-10" />
              <span className="absolute -top-1 -right-1 grid size-7 place-items-center rounded-full bg-gold font-display text-xs font-bold text-[#1a1306] shadow-[0_0_12px_-2px_var(--gold)]">
                {i + 1}
              </span>
            </span>
            <span>
              <span className="block font-display text-lg font-bold text-fg md:mt-5 md:text-xl">{s.title}</span>
              <span className="mt-1 block text-sm text-fg-2">{s.text}</span>
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ---------------------------------- Estilos ---------------------------------- */

function StylesTab() {
  const [active, setActive] = React.useState<string>(EDITING_STYLES[1].value);
  return (
    <div className="grid items-center gap-6 md:grid-cols-[1fr_auto] md:gap-10">
      <div className="flex flex-col gap-2">
        {EDITING_STYLES.map((s) => {
          const selected = s.value === active;
          return (
            <button
              key={s.value}
              type="button"
              onMouseEnter={() => setActive(s.value)}
              onFocus={() => setActive(s.value)}
              onClick={() => setActive(s.value)}
              aria-pressed={selected}
              className={cn(
                "group relative rounded-2xl border px-4 py-3 text-left transition-all duration-500 ease-[var(--ease-luxe)]",
                selected ? "border-cyan/45 bg-cyan/[0.07] shadow-[var(--glow-cyan)]" : "border-line hover:border-line-strong",
              )}
            >
              <span className="flex items-center justify-between gap-3">
                <span className={cn("font-display text-base font-bold", selected ? "text-fg" : "text-fg-2")}>
                  {landing.styleNames[s.value]}
                </span>
                <span className="flex gap-0.5" aria-label={`Ritmo ${s.pace} de 4`}>
                  {[1, 2, 3, 4].map((n) => (
                    <span key={n} className={cn("h-3 w-1 rounded-full", n <= s.pace ? "bg-cyan" : "bg-fg/15")} />
                  ))}
                </span>
              </span>
              <AnimatePresence initial={false}>
                {selected && (
                  <motion.span
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.35, ease: EASE }}
                    className="block overflow-hidden text-sm text-fg-2"
                  >
                    <span className="block pt-1">{landing.styles[s.value]}</span>
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </div>
      <div className="mx-auto w-[min(62vw,230px)]">
        <StylePreview key={active} style={active} />
      </div>
    </div>
  );
}

/* ---------------------------------- Planos ----------------------------------- */

function PlansTab({ plans, isAuthenticated }: { plans: Plan[]; isAuthenticated: boolean }) {
  const [waitlist, setWaitlist] = React.useState<string | null>(null);

  if (plans.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-10 text-center">
        <p className="font-display text-2xl font-bold text-fg">{landing.plans.empty}</p>
        <p className="text-sm text-fg-2">{landing.plans.emptyHint}</p>
        <WaitlistForm />
      </div>
    );
  }

  return (
    <div>
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan, i) => {
          const hasPrice = plan.price_cents !== null && plan.price_cents > 0;
          const featured = plan.is_featured;
          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE, delay: 0.08 * i }}
              className={cn(
                "relative flex flex-col rounded-[22px] p-5 md:p-6",
                featured ? "neon-border bg-silver text-[#14171c]" : "border border-line bg-fg/[0.03]",
              )}
            >
              {featured && (
                <span className="absolute -top-3 left-5 rounded-full bg-[#14171c] px-2.5 py-1 text-[0.625rem] font-bold tracking-[0.12em] text-cyan uppercase">
                  {landing.plans.featured}
                </span>
              )}
              <p className={cn("font-display text-lg font-bold", featured ? "text-[#14171c]" : "text-fg")}>{plan.name.replace("Plano ", "")}</p>
              <p className={cn("mt-3 font-display text-3xl font-extrabold", featured ? "text-[#14171c]" : "text-fg")}>
                {hasPrice ? formatCurrency(plan.price_cents) : <span className="font-serif text-2xl font-normal italic">{landing.plans.soon}</span>}
                {hasPrice && <span className={cn("ml-1 text-sm font-medium", featured ? "text-[#4a515c]" : "text-fg-3")}>/mês</span>}
              </p>
              <ul className="mt-4 space-y-2">
                {plan.features.slice(0, 4).map((f) => (
                  <li key={f} className={cn("flex items-start gap-2 text-sm", featured ? "text-[#2c3138]" : "text-fg-2")}>
                    <Check className={cn("mt-0.5 size-4 shrink-0", featured ? "text-[#0fb5c6]" : "text-cyan")} />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-5">
                {hasPrice ? (
                  <Button asChild variant={featured ? "gold" : "outline"} className="w-full">
                    <Link href={isAuthenticated ? ROUTES.billing : `${ROUTES.register}?plano=${plan.slug}`}>
                      Assinar <ArrowRight />
                    </Link>
                  </Button>
                ) : waitlist === plan.slug ? (
                  <WaitlistForm plan={plan.slug} compact onDone={() => setWaitlist(null)} />
                ) : (
                  <Button variant={featured ? "gold" : "outline"} className="w-full" onClick={() => setWaitlist(plan.slug)}>
                    Avise-me
                  </Button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
      <p className="mt-5 text-center text-sm text-fg-3">{landing.plans.trial}</p>
    </div>
  );
}

/* ---------------------------------- Dúvidas ---------------------------------- */

function FaqTab() {
  return (
    <Accordion type="single" collapsible defaultValue="q-0" className="max-w-2xl">
      {duvidas.slice(0, 5).map((f, i) => (
        <AccordionItem key={f.q} value={`q-${i}`}>
          <AccordionTrigger>{f.q}</AccordionTrigger>
          <AccordionContent>{f.a}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
