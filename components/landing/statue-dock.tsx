"use client";

import * as React from "react";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
  type MotionValue,
} from "motion/react";
import { scrollToTop } from "@/components/animations/smooth-scroll";
import { cn } from "@/lib/utils";

/** Trecho final do scroll do hero em que a estátua viaja até o canto. */
export const DOCK_START = 0.82;

type DockContext = {
  heroRef: React.RefObject<HTMLElement | null>;
  statueRef: React.RefObject<HTMLDivElement | null>;
  progress: MotionValue<number>;
};

const Ctx = React.createContext<DockContext | null>(null);

export function useStatueDock() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useStatueDock precisa de <StatueDockProvider>");
  return ctx;
}

/** Compartilha o progresso do hero entre o hero e a estátua acoplada. */
export function StatueDockProvider({ children }: { children: React.ReactNode }) {
  const heroRef = React.useRef<HTMLElement | null>(null);
  const statueRef = React.useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end end"] });
  const value = React.useMemo(() => ({ heroRef, statueRef, progress: scrollYProgress }), [scrollYProgress]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

const ACCENTS: Record<string, string> = {
  gold: "var(--gold)",
  cyan: "var(--cyan)",
  blue: "var(--azure)",
  violet: "var(--violet)",
};

/** Altura da estátua acoplada: 140px no desktop, 84px no tablet, 56px no celular. */
function dockSize(width: number) {
  if (width >= 1024) return 140;
  if (width >= 640) return 84;
  return 56;
}

const RATIO = 720 / 704; // proporção do recorte da estátua
const MARGIN = 24;

/**
 * Estátua acoplada no canto inferior esquerdo.
 * - No fim do scroll do hero, faz crossfade da estátua WebGL para o recorte
 *   e viaja até o canto (FLIP: posição e escala interpoladas a cada quadro).
 * - Acoplada: flutua, inclina com a velocidade do scroll (mola), troca a cor
 *   do halo conforme o bloco visível e volta ao topo no clique.
 * - Sobe junto quando o rodapé aparece e some quando o teclado abre.
 */
export function DockedStatue() {
  const { progress, statueRef, heroRef } = useStatueDock();
  const reduce = useReducedMotion();
  const outerRef = React.useRef<HTMLDivElement>(null);
  const [state, setState] = React.useState<"hidden" | "flying" | "docked">("hidden");
  const [accent, setAccent] = React.useState("gold");
  const [keyboard, setKeyboard] = React.useState(false);

  const t = useTransform(progress, [DOCK_START, 1], [0, 1], { clamp: true });

  // Inclinação de -4° a 4° pela velocidade do scroll, com mola ao voltar
  const { scrollY } = useScroll();
  const velocity = useVelocity(scrollY);
  const tiltRaw = useTransform(velocity, [-2400, 0, 2400], [-4, 0, 4], { clamp: true });
  const tilt = useSpring(tiltRaw, { stiffness: 140, damping: 7, mass: 0.6 });

  const render = React.useCallback(() => {
    const el = outerRef.current;
    if (!el) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const size = dockSize(vw);
    const w = size * RATIO;

    // Rodapé: a estátua sobe junto quando ele entra na tela
    const footer = document.querySelector<HTMLElement>("[data-site-footer]");
    const lift = footer ? Math.max(0, vh - footer.getBoundingClientRect().top) : 0;

    const dockX = MARGIN;
    const dockY = vh - MARGIN - size - lift;

    if (reduce) {
      el.style.transform = `translate3d(${dockX}px, ${dockY}px, 0)`;
      el.style.width = `${w}px`;
      el.style.height = `${size}px`;
      return;
    }

    const p = t.get();
    const hero = statueRef.current?.getBoundingClientRect();
    let x = dockX;
    let y = dockY;
    let s = 1;
    if (p < 1 && hero && hero.width > 0) {
      const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      const s0 = hero.width / w;
      x = hero.left + (dockX - hero.left) * e;
      y = hero.top + (dockY - hero.top) * e;
      s = s0 + (1 - s0) * e;
    }
    el.style.width = `${w}px`;
    el.style.height = `${size}px`;
    el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${s})`;
    el.style.opacity = String(Math.min(1, p / 0.1));
  }, [reduce, statueRef, t]);

  const sync = React.useCallback(() => {
    render();
    if (reduce) return;
    const p = t.get();
    setState(p <= 0.001 ? "hidden" : p >= 0.999 ? "docked" : "flying");
  }, [reduce, render, t]);

  useMotionValueEvent(t, "change", sync);

  // Movimento reduzido: sem voo, só aparece no canto quando o hero sai da tela
  React.useEffect(() => {
    if (!reduce) return;
    const hero = heroRef.current;
    if (!hero) return;
    const io = new IntersectionObserver(([entry]) => setState(entry.isIntersecting ? "hidden" : "docked"));
    io.observe(hero);
    return () => io.disconnect();
  }, [reduce, heroRef]);

  // Rodapé, redimensionamento e teclado virtual
  React.useEffect(() => {
    let raf = 0;
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(sync);
    };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const vv = window.visualViewport;
    const onViewport = () => setKeyboard(vv ? vv.height < window.innerHeight * 0.72 : false);
    vv?.addEventListener("resize", onViewport);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      vv?.removeEventListener("resize", onViewport);
    };
  }, [sync]);

  // Cor do halo conforme o bloco no centro da tela
  React.useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-accent]"));
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setAccent((e.target as HTMLElement).dataset.accent ?? "gold");
      },
      { rootMargin: "-48% 0px -48% 0px" },
    );
    els.forEach((el) => io.observe(el));
    // O bloco Explorar troca de cor ao mudar de aba
    const mo = new MutationObserver((records) => {
      for (const r of records) {
        const el = r.target as HTMLElement;
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight / 2 && rect.bottom > window.innerHeight / 2) setAccent(el.dataset.accent ?? "gold");
      }
    });
    els.forEach((el) => mo.observe(el, { attributes: true, attributeFilter: ["data-accent"] }));
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  const docked = state === "docked";
  const visible = state !== "hidden" && !keyboard;

  return (
    <div
      ref={outerRef}
      aria-hidden={!docked}
      className={cn(
        "pointer-events-none fixed top-0 left-0 z-40 origin-top-left will-change-transform motion-reduce:transition-opacity motion-reduce:duration-700",
        !visible && "!opacity-0",
        reduce && visible && "!opacity-100",
      )}
      style={{ transform: "translate3d(-999px, -999px, 0)", opacity: 0 }}
    >
      <motion.div className="relative size-full origin-bottom" style={{ rotate: reduce ? 0 : tilt }}>
        <div className={cn("relative size-full", docked && !reduce && "animate-float-soft")}>
          {/* Halo que muda de cor conforme o bloco visível */}
          <span
            aria-hidden
            className="absolute inset-[8%] -z-10 rounded-full opacity-60 blur-2xl transition-[background-color] duration-1000"
            style={{ backgroundColor: ACCENTS[accent] ?? ACCENTS.gold }}
          />
          <button
            type="button"
            tabIndex={docked ? 0 : -1}
            onClick={scrollToTop}
            aria-label="Voltar ao topo"
            className={cn(
              "group/dock relative block size-full rounded-full outline-none transition-transform duration-500 ease-[var(--ease-luxe)] hover:scale-[1.06] focus-visible:scale-[1.06]",
              docked ? "pointer-events-auto cursor-pointer" : "pointer-events-none",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/media/justica-alpha.webp"
              alt=""
              width={1440}
              height={1408}
              decoding="async"
              className="size-full object-contain drop-shadow-[0_8px_18px_rgb(0_0_0/0.45)]"
            />
            <span className="glass-strong pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 translate-y-1 rounded-full px-3 py-1 text-[0.6875rem] font-semibold whitespace-nowrap text-fg opacity-0 transition-all duration-300 group-hover/dock:translate-y-0 group-hover/dock:opacity-100 group-focus-visible/dock:translate-y-0 group-focus-visible/dock:opacity-100">
              Voltar ao topo
            </span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
