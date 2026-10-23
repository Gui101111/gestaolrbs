import type { Mood, Sfx } from "@/lib/browser-editor/sound";
import type { CaptionStyle, EditOptions, StyleId } from "@/lib/browser-editor/types";

export type TransitionKind = "cut" | "fade" | "dip" | "flash" | "whip" | "zoom";
export type CaptionAnim = "fade" | "pop" | "reveal" | "box" | "bounce";
export type CalloutKind = "glass" | "solid" | "minimal" | "badge" | "sticker";
export type TitleKind = "classic" | "stagger" | "cinema" | "slam" | "sticker";

/** Como cada estilo de edição aparece (e soa) no vídeo final. */
export interface Look {
  /** Pausa mínima que vale cortar (s). */
  minPause: number;
  /** Respiro mantido antes e depois da fala (s). */
  pad: number;
  /** Grade de cor (CanvasRenderingContext2D.filter). */
  grade: string;
  vignette: number;
  zoom: "punch" | "push" | "none";
  zoomAmount: number;
  progressBar: boolean;
  accent: string;
  /** Cor de contraste do acento (texto sobre o acento). */
  ink: string;
  captions: {
    font: string;
    weight: number;
    italic: boolean;
    upper: boolean;
    /** Palavras por tela de legenda. */
    maxWords: number;
    /** Tamanho em fração do menor lado do vídeo. */
    size: number;
    color: string;
    active: string | null;
    /** "pill": caixa atrás da linha; "word": caixa só na palavra falada; "none": contorno. */
    box: "pill" | "word" | "none";
    pop: boolean;
    anim: CaptionAnim;
  };
  titleFont: string;
  motion: {
    /** Segundos entre grafismos (antes do ajuste pela duração do vídeo). */
    spacing: number;
    /** Cartões em tela cheia (estilo B-roll animado). */
    cards: boolean;
    callout: CalloutKind;
    title: TitleKind;
    transition: TransitionKind;
    /** Distância mínima entre transições (s). */
    transitionGap: number;
    grain: number;
    leaks: boolean;
    /** Faixas pretas (fração da altura). */
    letterbox: number;
    frame: boolean;
    sparkles: boolean;
    mood: Mood;
    sfxLevel: number;
    titleSfx: Sfx[];
    beatSfx: Sfx;
    riser: boolean;
  };
}

const GOLD = "#f2c46d";
const CYAN = "#3be3f0";

export const LOOKS: Record<StyleId, Look> = {
  institucional: {
    minPause: 0.75,
    pad: 0.14,
    grade: "contrast(1.05) saturate(0.92) brightness(1.02)",
    vignette: 0.22,
    zoom: "push",
    zoomAmount: 0.05,
    progressBar: false,
    accent: GOLD,
    ink: "#17130a",
    captions: { font: "Manrope", weight: 700, italic: false, upper: false, maxWords: 6, size: 0.06, color: "#ffffff", active: null, box: "pill", pop: false, anim: "fade" },
    titleFont: "Instrument Serif",
    motion: {
      spacing: 5,
      cards: true,
      callout: "glass",
      title: "classic",
      transition: "fade",
      transitionGap: 4,
      grain: 0,
      leaks: false,
      letterbox: 0,
      frame: false,
      sparkles: false,
      mood: "sobria",
      sfxLevel: 0.28,
      titleSfx: ["swish"],
      beatSfx: "swish",
      riser: false,
    },
  },
  dinamico: {
    minPause: 0.35,
    pad: 0.1,
    grade: "contrast(1.08) saturate(1.1)",
    vignette: 0.12,
    zoom: "punch",
    zoomAmount: 0.12,
    progressBar: true,
    accent: CYAN,
    ink: "#04191c",
    captions: { font: "Sora", weight: 800, italic: false, upper: true, maxWords: 3, size: 0.07, color: "#ffffff", active: CYAN, box: "none", pop: true, anim: "pop" },
    titleFont: "Sora",
    motion: {
      spacing: 2.6,
      cards: true,
      callout: "solid",
      title: "stagger",
      transition: "zoom",
      transitionGap: 1.8,
      grain: 0,
      leaks: false,
      letterbox: 0,
      frame: false,
      sparkles: false,
      mood: "neutra",
      sfxLevel: 0.42,
      titleSfx: ["whoosh", "pop"],
      beatSfx: "pop",
      riser: true,
    },
  },
  cinematografico: {
    minPause: 0.8,
    pad: 0.16,
    grade: "contrast(1.12) saturate(0.82) sepia(0.12) brightness(0.97)",
    vignette: 0.4,
    zoom: "push",
    zoomAmount: 0.07,
    progressBar: false,
    accent: GOLD,
    ink: "#17130a",
    captions: { font: "Instrument Serif", weight: 400, italic: true, upper: false, maxWords: 5, size: 0.086, color: "#fbf3e2", active: GOLD, box: "none", pop: false, anim: "reveal" },
    titleFont: "Instrument Serif",
    motion: {
      spacing: 4.4,
      cards: true,
      callout: "minimal",
      title: "cinema",
      transition: "dip",
      transitionGap: 3.2,
      grain: 0.07,
      leaks: true,
      letterbox: 0.06,
      frame: false,
      sparkles: false,
      mood: "inspiradora",
      sfxLevel: 0.4,
      titleSfx: ["impact"],
      beatSfx: "swish",
      riser: false,
    },
  },
  performance: {
    minPause: 0.3,
    pad: 0.08,
    grade: "contrast(1.12) saturate(1.16)",
    vignette: 0.1,
    zoom: "punch",
    zoomAmount: 0.15,
    progressBar: true,
    accent: "#ffd23f",
    ink: "#141414",
    captions: { font: "Sora", weight: 800, italic: false, upper: true, maxWords: 2, size: 0.085, color: "#ffffff", active: "#141414", box: "word", pop: true, anim: "box" },
    titleFont: "Sora",
    motion: {
      spacing: 2.2,
      cards: true,
      callout: "badge",
      title: "slam",
      transition: "flash",
      transitionGap: 1.5,
      grain: 0,
      leaks: false,
      letterbox: 0,
      frame: true,
      sparkles: false,
      mood: "energica",
      sfxLevel: 0.48,
      titleSfx: ["impact", "whoosh"],
      beatSfx: "pop",
      riser: true,
    },
  },
  descontraido: {
    minPause: 0.5,
    pad: 0.12,
    grade: "saturate(1.08) brightness(1.03) contrast(1.03)",
    vignette: 0.1,
    zoom: "punch",
    zoomAmount: 0.08,
    progressBar: false,
    accent: "#ffd166",
    ink: "#2a1d00",
    captions: { font: "Manrope", weight: 800, italic: false, upper: false, maxWords: 4, size: 0.074, color: "#ffffff", active: "#ffd166", box: "pill", pop: true, anim: "bounce" },
    titleFont: "Manrope",
    motion: {
      spacing: 2.8,
      cards: true,
      callout: "sticker",
      title: "sticker",
      transition: "whip",
      transitionGap: 2.2,
      grain: 0,
      leaks: true,
      letterbox: 0,
      frame: false,
      sparkles: true,
      mood: "leve",
      sfxLevel: 0.4,
      titleSfx: ["pop", "sparkle"],
      beatSfx: "pop",
      riser: false,
    },
  },
};

/** Edição simples (padrão do app): só a legenda, bem legível e bonita, e zoom suave para disfarçar os cortes. */
export const SIMPLE: Look = {
  minPause: 0.4,
  pad: 0.08,
  grade: "contrast(1.06) saturate(1.06) brightness(1.02)",
  vignette: 0.14,
  zoom: "punch",
  zoomAmount: 0.06,
  progressBar: false,
  accent: "#ffd23f",
  ink: "#141414",
  captions: { font: "Sora", weight: 800, italic: false, upper: false, maxWords: 4, size: 0.064, color: "#ffffff", active: "#ffffff", box: "none", pop: true, anim: "pop" },
  titleFont: "Sora",
  motion: {
    spacing: 6,
    cards: false,
    callout: "minimal",
    title: "classic",
    transition: "cut",
    transitionGap: 99,
    grain: 0,
    leaks: false,
    letterbox: 0,
    frame: false,
    sparkles: false,
    mood: "neutra",
    sfxLevel: 0,
    titleSfx: [],
    beatSfx: "pop",
    riser: false,
  },
};

const HEX = /^#([0-9a-f]{6})$/i;

/** Cor da marca usável como acento (descarta tons muito escuros ou muito claros). */
export function usableAccent(color: string | null | undefined): string | null {
  const m = color?.trim().match(HEX);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum < 0.28 || lum > 0.93 ? null : color!.trim();
}

/** O estilo de legenda escolhido, a cor da marca e os ajustes pedidos mudam o padrão do estilo. */
export function lookFor(opts: Pick<EditOptions, "style" | "simple" | "captionStyle" | "accentColor" | "captionScale" | "captionColor" | "energy">): Look {
  const base = opts.simple ? SIMPLE : (LOOKS[opts.style] ?? LOOKS.institucional);
  const c = { ...base.captions };
  const s: CaptionStyle = opts.captionStyle;
  if (s === "discreta") Object.assign(c, { upper: false, maxWords: Math.max(c.maxWords, 6), size: Math.min(c.size, 0.06), box: "pill", pop: false, active: null, anim: "fade" });
  if (s === "palavra" && !c.active) c.active = base.accent;
  if (s === "caixa_alta") Object.assign(c, { upper: true, weight: Math.max(c.weight, 800), font: c.font === "Instrument Serif" ? "Sora" : c.font, italic: false });
  const accent = usableAccent(opts.accentColor) ?? base.accent;
  if (accent !== base.accent && c.active === base.accent) c.active = accent;
  if (opts.captionScale) c.size *= Math.min(1.7, Math.max(0.6, opts.captionScale));
  if (opts.captionColor && HEX.test(opts.captionColor)) c.color = opts.captionColor;
  // mais (ou menos) animação: grafismos e transições mais próximos, zoom mais forte
  const e = Math.min(2.2, Math.max(0.4, opts.energy ?? 1));
  const motion = e === 1 ? base.motion : { ...base.motion, spacing: base.motion.spacing / e, transitionGap: base.motion.transitionGap / e };
  const zoomAmount = e === 1 ? base.zoomAmount : Math.min(0.22, base.zoomAmount * (0.6 + 0.4 * e));
  return { ...base, accent, zoomAmount, motion, captions: c };
}

/** Respostas recomendadas por estilo (iguais às do Novo vídeo do app). */
export function defaultsFor(style: StyleId): Pick<EditOptions, "cutPauses" | "removeMistakes" | "captions" | "lowerThird" | "hook" | "cta" | "vignette" | "zoom" | "effects" | "music" | "enhanceAudio" | "oabReview" | "captionStyle"> {
  const on = (styles: StyleId[]) => styles.includes(style);
  return {
    cutPauses: true,
    removeMistakes: true,
    captions: true,
    captionStyle: on(["institucional"]) ? "discreta" : on(["performance"]) ? "caixa_alta" : "palavra",
    lowerThird: false,
    hook: true,
    cta: on(["dinamico", "performance", "descontraido"]),
    vignette: on(["institucional", "cinematografico"]),
    zoom: true,
    effects: true,
    music: true,
    enhanceAudio: true,
    oabReview: false,
  };
}
