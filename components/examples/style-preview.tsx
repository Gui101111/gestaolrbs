"use client";

import * as React from "react";
import { useReducedMotion } from "motion/react";
import { createPainter } from "@/lib/browser-editor/draw";
import { loadFonts } from "@/lib/browser-editor/fonts";
import { defaultsFor, lookFor } from "@/lib/browser-editor/looks";
import type { EditOptions, StyleId, Word } from "@/lib/browser-editor/types";
import { cn } from "@/lib/utils";

/** Frases de exemplo; *palavra* sai destacada. */
const PHRASES: Record<StyleId, string[]> = {
  institucional: ["A *revisão* do benefício", "tem prazo de *dez anos*", "a partir do primeiro pagamento."],
  dinamico: ["Você sabia que pode", "pedir a *revisão*", "do seu *benefício*?"],
  cinematografico: ["Família", "também é", "*planejamento*."],
  performance: ["Caiu no *golpe*", "do *Pix*?", "Faça isto", "*primeiro*."],
  descontraido: ["Voo *cancelado*", "dá direito a", "mais que *reembolso*?"],
};

const SPEED: Record<StyleId, number> = { institucional: 0.34, dinamico: 0.27, cinematografico: 0.42, performance: 0.24, descontraido: 0.3 };

function timeline(style: StyleId): { words: Word[]; total: number } {
  const words: Word[] = [];
  let t = 0.35;
  const per = SPEED[style];
  for (const phrase of PHRASES[style]) {
    for (const raw of phrase.split(" ")) {
      const text = raw.replace(/\*/g, "");
      const len = per * (0.7 + Math.min(1.2, text.length / 7));
      words.push({ text, start: t, end: t + len * 0.92, key: raw.includes("*") });
      t += len;
    }
    t += 0.38;
  }
  return { words, total: t + 0.5 };
}

/**
 * Prévia de cada estilo: fundo preto e as legendas do próprio editor
 * passando, grandes, com a animação, a fonte e as cores do estilo.
 */
export function StylePreview({ style, playing = true, className }: { style: string; playing?: boolean; className?: string }) {
  const id = (style in PHRASES ? style : "institucional") as StyleId;
  const ref = React.useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return setVisible(true);
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "80px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  React.useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const W = 540;
    const H = 960;
    canvas.width = W;
    canvas.height = H;
    const base = defaultsFor(id);
    const look = lookFor({ style: id, captionStyle: base.captionStyle });
    look.captions = { ...look.captions, size: look.captions.size * 1.45, maxWords: Math.min(look.captions.maxWords, 4) };
    const { words, total } = timeline(id);
    const opts = { ...base, style: id, ratios: ["9:16"], captions: true, hook: false, cta: false, vignette: false, zoom: false, effects: false, name: "", oab: "", hookText: "", ctaText: "", logo: null, script: "", framing: {} } as EditOptions;
    const painter = createPainter({
      ratio: "9:16",
      W,
      H,
      look,
      opts,
      words,
      title: "",
      cta: "",
      logo: null,
      srcW: W,
      srcH: H,
      face: { x: 0.5, y: 0.5 },
      introDur: 0,
      outroDur: 0,
      bodyDur: total,
      zoomCuts: [],
      motion: { beats: [], transitions: [], punches: [], cues: [] },
    });
    // legenda no meio da tela, como na prévia de um app de edição
    const draw = (t: number) => {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.translate(0, H * -0.2);
      painter.captionsOnly(ctx, t);
      ctx.restore();
    };
    let raf = 0;
    let cancelled = false;
    const still = words[Math.min(words.length - 1, 4)]?.start ?? 1;
    void loadFonts([look.captions.font]).then(() => {
      if (cancelled) return;
      if (!playing || reduce || !visible) {
        draw(still + 0.3);
        return;
      }
      const t0 = performance.now();
      const loop = () => {
        draw(((performance.now() - t0) / 1000) % total);
        raf = requestAnimationFrame(loop);
      };
      loop();
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [id, playing, reduce, visible]);

  return (
    <div className={cn("relative aspect-[9/16] overflow-hidden rounded-[22px] bg-black shadow-[var(--shadow-pop)]", className)}>
      <canvas ref={ref} aria-hidden className="absolute inset-0 size-full" />
    </div>
  );
}
