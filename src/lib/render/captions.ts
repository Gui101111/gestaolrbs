import type { CaptionPosition, CaptionSettings, CaptionSize, CaptionStyleId } from '../types';

export interface CaptionWord {
  text: string;
  start: number;
  end: number;
  highlight: boolean;
}

export interface CaptionPage {
  start: number;
  end: number;
  words: CaptionWord[];
}

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

interface StyleDef {
  label: string;
  description: string;
  family: string;
  weight: number;
  /** Tamanho da letra em relação ao menor lado do vídeo. */
  size: number;
  maxWords: number;
  maxChars: number;
  forceUpper: boolean;
  /** Contorno, em fração do tamanho da letra (0 = sem contorno). */
  stroke: number;
  shadow: number;
  pill: boolean;
  active: 'none' | 'color' | 'box' | 'karaoke';
  keywordColor: boolean;
  enter: 'pop' | 'fade' | 'slam';
  lineHeight: number;
}

export const CAPTION_STYLES: Record<CaptionStyleId, StyleDef> = {
  recomendada: {
    label: 'Recomendada',
    description: 'Letras fortes, palavra falada em destaque',
    family: 'Montserrat',
    weight: 800,
    size: 0.066,
    maxWords: 4,
    maxChars: 22,
    forceUpper: false,
    stroke: 0.16,
    shadow: 0.12,
    pill: false,
    active: 'color',
    keywordColor: true,
    enter: 'pop',
    lineHeight: 1.18,
  },
  discreta: {
    label: 'Discreta',
    description: 'Menor, com fundo suave e frases inteiras',
    family: 'Figtree',
    weight: 600,
    size: 0.043,
    maxWords: 9,
    maxChars: 44,
    forceUpper: false,
    stroke: 0,
    shadow: 0,
    pill: true,
    active: 'none',
    keywordColor: true,
    enter: 'fade',
    lineHeight: 1.32,
  },
  caixa: {
    label: 'Caixa',
    description: 'Palavra falada dentro de uma caixa colorida',
    family: 'Montserrat',
    weight: 800,
    size: 0.062,
    maxWords: 3,
    maxChars: 18,
    forceUpper: false,
    stroke: 0.1,
    shadow: 0.1,
    pill: false,
    active: 'box',
    keywordColor: false,
    enter: 'pop',
    lineHeight: 1.3,
  },
  karaoke: {
    label: 'Karaokê',
    description: 'O texto vai sendo pintado conforme a fala',
    family: 'Montserrat',
    weight: 800,
    size: 0.058,
    maxWords: 6,
    maxChars: 30,
    forceUpper: false,
    stroke: 0.15,
    shadow: 0.1,
    pill: false,
    active: 'karaoke',
    keywordColor: false,
    enter: 'fade',
    lineHeight: 1.2,
  },
  impacto: {
    label: 'Impacto',
    description: 'Uma ou duas palavras grandes por vez',
    family: 'Anton',
    weight: 400,
    size: 0.105,
    maxWords: 2,
    maxChars: 14,
    forceUpper: true,
    stroke: 0.12,
    shadow: 0.14,
    pill: false,
    active: 'none',
    keywordColor: true,
    enter: 'slam',
    lineHeight: 1.05,
  },
  minimalista: {
    label: 'Minimalista',
    description: 'Fina, sem contorno, quase invisível',
    family: 'Inter',
    weight: 500,
    size: 0.046,
    maxWords: 6,
    maxChars: 34,
    forceUpper: false,
    stroke: 0,
    shadow: 0.22,
    pill: false,
    active: 'none',
    keywordColor: false,
    enter: 'fade',
    lineHeight: 1.25,
  },
};

export const CAPTION_STYLE_IDS = Object.keys(CAPTION_STYLES) as CaptionStyleId[];

const SIZE_FACTOR: Record<CaptionSize, number> = { sm: 0.82, md: 1, lg: 1.2 };

/** Garante que as fontes das legendas estejam carregadas antes de desenhar no canvas. */
export async function loadCaptionFonts() {
  const sample = 'AaÁÉÍÓÚãõçÇ0123';
  await Promise.all(
    [
      ...new Set(Object.values(CAPTION_STYLES).map((s) => `${s.weight} 48px "${s.family}"`)),
      '800 48px "Montserrat"',
      '800 48px "Bricolage Grotesque"',
      '500 48px "Figtree"',
    ].map((f) =>
      document.fonts.load(f, sample).catch(() => []),
    ),
  );
}

export function captionLimits(style: CaptionStyleId) {
  const def = CAPTION_STYLES[style];
  return { maxWords: def.maxWords, maxChars: def.maxChars };
}

export function captionCenterY(position: CaptionPosition, width: number, height: number) {
  const aspect = width / height;
  if (position === 'middle') return height * 0.5;
  if (aspect < 0.8) return height * (position === 'bottom' ? 0.73 : 0.22);
  if (aspect < 1.3) return height * (position === 'bottom' ? 0.8 : 0.2);
  return height * (position === 'bottom' ? 0.85 : 0.15);
}

function unitOf(width: number, height: number) {
  return Math.min(width, height) * (width > height ? 0.8 : 1);
}

export function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export const textOn = (hex: string) => (luminance(hex) > 0.45 ? '#111111' : '#FFFFFF');

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const easeOutBack = (x: number) => 1 + 2.2 * (x - 1) ** 3 + 1.2 * (x - 1) ** 2;
const easeOutCubic = (x: number) => 1 - (1 - x) ** 3;

interface Placed {
  word: CaptionWord;
  text: string;
  width: number;
  next: CaptionWord | undefined;
}

export function drawCaptions(ctx: Ctx, page: CaptionPage, t: number, width: number, height: number, settings: CaptionSettings, sizeBoost = 1) {
  const def = CAPTION_STYLES[settings.style];
  const px = unitOf(width, height) * def.size * SIZE_FACTOR[settings.size] * sizeBoost;
  const upper = def.forceUpper || settings.uppercase;
  const accent = settings.color;
  ctx.font = `${def.weight} ${px}px "${def.family}"`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.lineJoin = 'round';

  // Quebra de linhas.
  const maxWidth = width * 0.84;
  const space = ctx.measureText(' ').width;
  const lines: { items: Placed[]; width: number }[] = [];
  let current: Placed[] = [];
  let currentWidth = 0;
  page.words.forEach((word, k) => {
    const text = upper ? word.text.toLocaleUpperCase('pt-BR') : word.text;
    const w = ctx.measureText(text).width;
    const add = current.length ? space + w : w;
    if (current.length && currentWidth + add > maxWidth) {
      lines.push({ items: current, width: currentWidth });
      current = [];
      currentWidth = 0;
    }
    current.push({ word, text, width: w, next: page.words[k + 1] });
    currentWidth += current.length > 1 ? space + w : w;
  });
  if (current.length) lines.push({ items: current, width: currentWidth });

  const lineH = px * def.lineHeight;
  const cy = captionCenterY(settings.position, width, height);
  const top = cy - (lines.length * lineH) / 2;

  // Entrada.
  const age = t - page.start;
  let scale = 1;
  let alpha = 1;
  let lift = 0;
  if (def.enter === 'pop') {
    const p = clamp01(age / 0.16);
    scale = 0.84 + 0.16 * easeOutBack(p);
    alpha = clamp01(age / 0.07);
  } else if (def.enter === 'slam') {
    const p = clamp01(age / 0.12);
    scale = 1.28 - 0.28 * easeOutCubic(p);
    alpha = clamp01(age / 0.05);
  } else {
    alpha = clamp01(age / 0.14);
    lift = (1 - easeOutCubic(clamp01(age / 0.2))) * px * 0.18;
  }

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(width / 2, cy + lift);
  ctx.scale(scale, scale);
  ctx.translate(-width / 2, -cy);

  if (def.pill) {
    ctx.fillStyle = 'rgba(8, 10, 12, 0.62)';
    lines.forEach((line, li) => {
      const padX = px * 0.55;
      const padY = px * 0.2;
      const y = top + li * lineH;
      roundRect(ctx, width / 2 - line.width / 2 - padX, y - padY * 0.2, line.width + padX * 2, lineH + padY * 0.4, px * 0.35);
    });
  }

  lines.forEach((line, li) => {
    const y = top + li * lineH + lineH / 2;
    let x = width / 2 - line.width / 2;
    for (const item of line.items) {
      const { word } = item;
      const activeUntil = item.next ? Math.max(word.end, item.next.start) : word.end + 0.25;
      const active = t >= word.start && t < activeUntil;
      const spoken = t >= word.start;
      let fill = '#FFFFFF';
      if (def.keywordColor && word.highlight) fill = accent;
      if (def.active === 'color' && active) fill = accent;
      if (def.active === 'karaoke') fill = spoken ? accent : accent.toUpperCase() === '#FFFFFF' ? 'rgba(255,255,255,0.5)' : '#FFFFFF';

      let wordScale = 1;
      if (def.active === 'color' && active) wordScale = 1.07;
      if (def.active === 'box' && active) {
        const padX = px * 0.16;
        ctx.fillStyle = accent;
        roundRect(ctx, x - padX, y - px * 0.62, item.width + padX * 2, px * 1.2, px * 0.2);
        fill = textOn(accent);
      }

      ctx.save();
      if (wordScale !== 1) {
        ctx.translate(x + item.width / 2, y);
        ctx.scale(wordScale, wordScale);
        ctx.translate(-(x + item.width / 2), -y);
      }
      const boxed = def.active === 'box' && active;
      if (def.stroke > 0 && !boxed) {
        ctx.strokeStyle = 'rgba(0,0,0,0.92)';
        ctx.lineWidth = px * def.stroke;
        if (def.shadow > 0) {
          ctx.shadowColor = 'rgba(0,0,0,0.45)';
          ctx.shadowBlur = px * def.shadow;
          ctx.shadowOffsetY = px * 0.04;
        }
        ctx.strokeText(item.text, x, y);
        ctx.shadowColor = 'transparent';
      } else if (def.shadow > 0 && !boxed) {
        ctx.shadowColor = 'rgba(0,0,0,0.7)';
        ctx.shadowBlur = px * def.shadow;
        ctx.shadowOffsetY = px * 0.03;
      }
      ctx.fillStyle = fill;
      ctx.fillText(item.text, x, y);
      ctx.restore();
      x += item.width + space;
    }
  });
  ctx.restore();
}

/** Título de gancho exibido no topo nos primeiros segundos. */
export function drawHook(ctx: Ctx, text: string, age: number, remaining: number, width: number, height: number, accent: string) {
  const px = unitOf(width, height) * 0.054;
  ctx.font = `800 ${px}px "Montserrat"`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  const words = text.split(/\s+/).filter(Boolean);
  const wrapAt = (limit: number) => {
    const out: string[] = [];
    let line = '';
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (line && ctx.measureText(test).width > limit) {
        out.push(line);
        line = w;
      } else line = test;
    }
    if (line) out.push(line);
    return out;
  };
  // Quebra equilibrada: evita uma palavra sozinha na última linha.
  const maxWidth = width * 0.78;
  let lines = wrapAt(maxWidth);
  if (lines.length > 1) {
    const balanced = wrapAt(Math.min(maxWidth, (ctx.measureText(text).width / lines.length) * 1.12));
    if (balanced.length === lines.length) lines = balanced;
  }

  const lineH = px * 1.22;
  const boxW = Math.max(...lines.map((l) => ctx.measureText(l).width)) + px * 1.2;
  const boxH = lines.length * lineH + px * 0.7;
  const cy = height * (width / height < 0.8 ? 0.11 : 0.12) + boxH / 2;
  const p = clamp01(age / 0.3);
  const out = clamp01(remaining / 0.3);
  ctx.save();
  ctx.globalAlpha = Math.min(clamp01(age / 0.12), out);
  ctx.translate(width / 2, cy);
  const s = 0.9 + 0.1 * easeOutBack(p);
  ctx.scale(s, s);
  ctx.rotate(-0.012);
  ctx.fillStyle = accent;
  roundRect(ctx, -boxW / 2, -boxH / 2, boxW, boxH, px * 0.32);
  ctx.fillStyle = textOn(accent);
  lines.forEach((l, i) => ctx.fillText(l, 0, -boxH / 2 + px * 0.35 + lineH * i + lineH / 2));
  ctx.restore();
}
