import type { CaptionStyle, EditOptions, StyleId } from "@/lib/browser-editor/types";

/** Como cada estilo de edição aparece no vídeo final. */
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
  };
  titleFont: string;
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
    zoomAmount: 0.04,
    progressBar: false,
    accent: GOLD,
    captions: { font: "Manrope", weight: 700, italic: false, upper: false, maxWords: 6, size: 0.05, color: "#ffffff", active: null, box: "pill", pop: false },
    titleFont: "Instrument Serif",
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
    captions: { font: "Sora", weight: 800, italic: false, upper: true, maxWords: 3, size: 0.066, color: "#ffffff", active: CYAN, box: "none", pop: true },
    titleFont: "Sora",
  },
  cinematografico: {
    minPause: 0.8,
    pad: 0.16,
    grade: "contrast(1.1) saturate(0.82) sepia(0.12) brightness(0.98)",
    vignette: 0.38,
    zoom: "push",
    zoomAmount: 0.06,
    progressBar: false,
    accent: GOLD,
    captions: { font: "Instrument Serif", weight: 400, italic: true, upper: false, maxWords: 5, size: 0.068, color: "#fbf3e2", active: GOLD, box: "none", pop: false },
    titleFont: "Instrument Serif",
  },
  performance: {
    minPause: 0.3,
    pad: 0.08,
    grade: "contrast(1.12) saturate(1.16)",
    vignette: 0.1,
    zoom: "punch",
    zoomAmount: 0.15,
    progressBar: true,
    accent: GOLD,
    captions: { font: "Sora", weight: 800, italic: false, upper: true, maxWords: 2, size: 0.078, color: "#ffffff", active: "#141414", box: "word", pop: true },
    titleFont: "Sora",
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
    captions: { font: "Manrope", weight: 800, italic: false, upper: false, maxWords: 4, size: 0.06, color: "#ffffff", active: "#ffd166", box: "pill", pop: true },
    titleFont: "Manrope",
  },
};

/** O estilo de legenda escolhido no formulário ajusta o padrão do estilo. */
export function lookFor(opts: Pick<EditOptions, "style" | "captionStyle">): Look {
  const base = LOOKS[opts.style] ?? LOOKS.institucional;
  const c = { ...base.captions };
  const s: CaptionStyle = opts.captionStyle;
  if (s === "discreta") Object.assign(c, { upper: false, maxWords: Math.max(c.maxWords, 6), size: Math.min(c.size, 0.05), box: "pill", pop: false, active: null });
  if (s === "palavra" && !c.active) c.active = base.accent;
  if (s === "caixa_alta") Object.assign(c, { upper: true, weight: Math.max(c.weight, 800), font: c.font === "Instrument Serif" ? "Sora" : c.font, italic: false });
  return { ...base, captions: c };
}

/** Respostas recomendadas por estilo (iguais às do Novo vídeo do app). */
export function defaultsFor(style: StyleId): Pick<EditOptions, "cutPauses" | "removeMistakes" | "captions" | "lowerThird" | "hook" | "cta" | "vignette" | "zoom" | "enhanceAudio" | "oabReview" | "captionStyle"> {
  const on = (styles: StyleId[]) => styles.includes(style);
  return {
    cutPauses: true,
    removeMistakes: true,
    captions: true,
    captionStyle: on(["institucional", "cinematografico"]) ? "discreta" : on(["performance"]) ? "caixa_alta" : "palavra",
    lowerThird: !on(["performance"]),
    hook: on(["dinamico", "performance"]),
    cta: on(["dinamico", "performance"]),
    vignette: on(["institucional", "cinematografico"]),
    zoom: !on(["institucional"]),
    enhanceAudio: true,
    oabReview: true,
  };
}
