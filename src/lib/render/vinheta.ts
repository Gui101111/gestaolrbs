import type { VinhetaStyle } from '../types';
import { luminance, textOn } from './captions';

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export const INTRO_DURATION = 2.2;
export const OUTRO_DURATION = 2.8;
/** Tempo da transição entre a vinheta e o vídeo. */
export const VINHETA_FADE = 0.35;

export interface VinhetaContent {
  style: VinhetaStyle;
  color: string;
  title: string;
  subtitle: string;
  logo: ImageBitmap | null;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const ease = (x: number) => 1 - (1 - clamp01(x)) ** 3;
const easeBack = (x: number) => {
  const p = clamp01(x);
  return 1 + 2.4 * (p - 1) ** 3 + 1.4 * (p - 1) ** 2;
};

function palette(style: VinhetaStyle, accent: string) {
  if (style === 'clean') return { bg: '#F5F6F4', fg: '#14181A', sub: '#4B5357', line: accent === '#FFFFFF' || luminance(accent) > 0.8 ? '#14181A' : accent };
  if (style === 'vibrante') return { bg: accent, fg: textOn(accent), sub: textOn(accent) === '#111111' ? 'rgba(17,17,17,0.72)' : 'rgba(255,255,255,0.8)', line: textOn(accent) };
  return { bg: '#0E1517', fg: '#FFFFFF', sub: 'rgba(255,255,255,0.7)', line: accent };
}

function wrap(ctx: Ctx, text: string, maxWidth: number) {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const test = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(test).width > maxWidth) {
      lines.push(line);
      line = word;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

/**
 * Desenha um quadro da vinheta. `t` é o tempo dentro da vinheta e `kind` define a
 * animação: a abertura constrói os elementos; o encerramento faz o mesmo e termina
 * escurecendo.
 */
export function drawVinheta(ctx: Ctx, t: number, width: number, height: number, content: VinhetaContent, kind: 'intro' | 'outro') {
  const total = kind === 'intro' ? INTRO_DURATION : OUTRO_DURATION;
  const colors = palette(content.style, content.color);
  const unit = Math.min(width, height);

  ctx.save();
  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, width, height);

  if (content.style === 'escura') {
    const glow = ctx.createRadialGradient(width / 2, height * 0.42, 0, width / 2, height * 0.42, unit * 0.9);
    glow.addColorStop(0, hexToRgba(content.color, 0.28 * ease(t / 0.8)));
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
  }
  if (content.style === 'vibrante') {
    // Faixas diagonais que atravessam a tela no início.
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = colors.fg;
    const shift = ease(t / 1.2) * width * 0.4;
    for (let i = -2; i < 6; i++) {
      ctx.beginPath();
      const x = i * unit * 0.32 - shift;
      ctx.moveTo(x, height);
      ctx.lineTo(x + unit * 0.12, height);
      ctx.lineTo(x + unit * 0.12 + height * 0.5, 0);
      ctx.lineTo(x + height * 0.5, 0);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  let y = height * 0.5;
  const hasLogo = Boolean(content.logo);
  const titlePx = unit * 0.1;
  const subPx = unit * 0.046;
  ctx.font = `800 ${titlePx}px "Bricolage Grotesque", "Montserrat"`;
  const titleLines = wrap(ctx, content.title, width * 0.8);
  ctx.font = `500 ${subPx}px "Figtree"`;
  const subLines = wrap(ctx, content.subtitle, width * 0.8);

  const logoSize = unit * 0.2;
  const blockH = (hasLogo ? logoSize + unit * 0.05 : 0) + titleLines.length * titlePx * 1.08 + unit * 0.05 + subLines.length * subPx * 1.3;
  y = height * 0.5 - blockH / 2;

  if (content.logo) {
    const p = easeBack((t - 0.05) / 0.45);
    const lw = content.logo.width;
    const lh = content.logo.height;
    const s = (logoSize / Math.max(lw, lh)) * p;
    ctx.globalAlpha = clamp01((t - 0.05) / 0.15);
    ctx.drawImage(content.logo, width / 2 - (lw * s) / 2, y + logoSize / 2 - (lh * s) / 2, lw * s, lh * s);
    ctx.globalAlpha = 1;
    y += logoSize + unit * 0.05;
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const titleP = ease((t - 0.2) / 0.5);
  ctx.globalAlpha = titleP;
  ctx.fillStyle = colors.fg;
  ctx.font = `800 ${titlePx}px "Bricolage Grotesque", "Montserrat"`;
  titleLines.forEach((line, i) => ctx.fillText(line, width / 2, y + i * titlePx * 1.08 + (1 - titleP) * unit * 0.04));
  y += titleLines.length * titlePx * 1.08;

  // Linha de destaque que cresce do centro.
  const lineP = ease((t - 0.1) / 0.6);
  ctx.globalAlpha = 1;
  ctx.fillStyle = colors.line;
  const lineW = unit * 0.16 * lineP;
  ctx.beginPath();
  ctx.roundRect(width / 2 - lineW / 2, y + unit * 0.018, lineW, unit * 0.012, unit * 0.006);
  ctx.fill();
  y += unit * 0.05;

  const subP = ease((t - 0.42) / 0.5);
  ctx.globalAlpha = subP;
  ctx.fillStyle = colors.sub;
  ctx.font = `500 ${subPx}px "Figtree"`;
  subLines.forEach((line, i) => ctx.fillText(line, width / 2, y + i * subPx * 1.3 + (1 - subP) * unit * 0.03));

  if (kind === 'outro') {
    const fade = clamp01((t - (total - 0.5)) / 0.5);
    ctx.globalAlpha = fade;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
  }
  ctx.restore();
}

function hexToRgba(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** Sons curtos gerados na hora: um "whoosh" na abertura e um toque no encerramento. */
export async function renderVinhetaSound(kind: 'intro' | 'outro', sampleRate: number): Promise<AudioBuffer> {
  const duration = kind === 'intro' ? 1.0 : 1.2;
  const ctx = new OfflineAudioContext(1, Math.ceil(duration * sampleRate), sampleRate);
  if (kind === 'intro') {
    const noise = ctx.createBuffer(1, ctx.length, sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1.4;
    filter.frequency.setValueAtTime(260, 0);
    filter.frequency.exponentialRampToValueAtTime(3200, 0.45);
    filter.frequency.exponentialRampToValueAtTime(900, 0.9);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, 0);
    gain.gain.exponentialRampToValueAtTime(0.32, 0.38);
    gain.gain.exponentialRampToValueAtTime(0.0001, 0.95);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start();
  } else {
    for (const [freq, delay] of [
      [784, 0],
      [1175, 0.09],
    ] as const) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, delay);
      gain.gain.exponentialRampToValueAtTime(0.16, delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, delay + 1.0);
      osc.connect(gain).connect(ctx.destination);
      osc.start(delay);
      osc.stop(delay + 1.05);
    }
  }
  return ctx.startRendering();
}
