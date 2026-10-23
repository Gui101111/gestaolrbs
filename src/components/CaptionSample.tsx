import { useEffect, useRef } from 'react';
import { captionLimits, drawCaptions, drawHook, loadCaptionFonts, type CaptionPage } from '../lib/render/captions';
import type { CaptionSettings, FormatId } from '../lib/types';

const SAMPLE = 'Esse é o jeito mais simples de deixar seus vídeos prontos para postar.';
const KEYWORDS = new Set([5, 10]);
const WORD_TIME = 0.34;

function samplePages(settings: CaptionSettings): { pages: CaptionPage[]; length: number } {
  const { maxWords, maxChars } = captionLimits(settings.style);
  const words = SAMPLE.split(' ').map((text, i) => ({ text, start: 0.3 + i * WORD_TIME, end: 0.3 + (i + 1) * WORD_TIME - 0.04, highlight: KEYWORDS.has(i) }));
  const pages: CaptionPage[] = [];
  let current: typeof words = [];
  let chars = 0;
  for (const w of words) {
    if (current.length && (current.length >= maxWords || chars + w.text.length > maxChars || /[.,]$/.test(current[current.length - 1].text))) {
      pages.push({ start: current[0].start, end: w.start, words: current });
      current = [];
      chars = 0;
    }
    current.push(w);
    chars += w.text.length + 1;
  }
  if (current.length) pages.push({ start: current[0].start, end: current[current.length - 1].end + 0.6, words: current });
  return { pages, length: pages[pages.length - 1].end + 0.5 };
}

export const FORMAT_DIMS: Record<FormatId, [number, number]> = {
  '9:16': [1080, 1920],
  '1:1': [1080, 1080],
  '16:9': [1920, 1080],
  original: [1080, 1920],
};

function drawScene(ctx: CanvasRenderingContext2D, W: number, H: number, plain: boolean) {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#2b4a52');
  bg.addColorStop(1, '#13262b');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  if (plain) return;
  // Silhueta de quem fala, só para dar referência de posição.
  const u = Math.min(W, H);
  const cx = W / 2;
  const headY = H * 0.36;
  ctx.fillStyle = '#3c6069';
  ctx.beginPath();
  ctx.arc(cx, headY, u * 0.13, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx, headY + u * 0.5, u * 0.36, u * 0.3, 0, Math.PI, 0);
  ctx.lineTo(cx + u * 0.36, H);
  ctx.lineTo(cx - u * 0.36, H);
  ctx.fill();
}

/**
 * Amostra animada do estilo de legenda escolhido. Não é uma prévia do vídeo do
 * usuário: só mostra a cara da legenda e onde ela fica na tela.
 */
export function CaptionSample({
  settings,
  format,
  dims,
  plain = false,
  sizeBoost = 1,
  hook,
  className = '',
}: {
  settings: CaptionSettings;
  format?: FormatId;
  dims?: [number, number];
  plain?: boolean;
  /** Aumenta a letra (usado nas miniaturas dos estilos). */
  sizeBoost?: number;
  hook?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [W, H] = dims ?? FORMAT_DIMS[format ?? '9:16'];
  const settingsKey = JSON.stringify(settings);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let raf = 0;
    let visible = true;
    let fontsReady = false;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const { pages, length } = samplePages(settings);
    const started = performance.now();

    /** Desenha um quadro; sem `at`, usa o relógio da animação. */
    const draw = (at?: number) => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cw = Math.max(1, Math.round(rect.width * dpr));
      const ch = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw;
        canvas.height = ch;
      }
      const t = at ?? ((performance.now() - started) / 1000) % length;
      ctx.setTransform(cw / W, 0, 0, ch / H, 0, 0);
      drawScene(ctx, W, H, plain);
      if (hook) drawHook(ctx, 'Seu título aqui', 1, 1, W, H, settings.color);
      if (settings.enabled && fontsReady) {
        const page = pages.find((p) => t >= p.start && t < p.end);
        if (page) drawCaptions(ctx, page, t, W, H, settings, sizeBoost);
      }
    };
    // Quadro parado com uma legenda visível (antes da animação ou com movimento reduzido).
    const still = pages[0].words[1]?.start ?? 0.6;
    const loop = () => {
      draw();
      raf = requestAnimationFrame(loop);
    };
    const restart = () => {
      cancelAnimationFrame(raf);
      if (visible && !reduced) loop();
      else draw(still);
    };

    loadCaptionFonts().then(() => {
      fontsReady = true;
      restart();
    });
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      restart();
    });
    io.observe(canvas);
    draw(still);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [settingsKey, W, H, hook, plain, sizeBoost]);

  return (
    <canvas
      ref={ref}
      className={`block w-full rounded-[14px] bg-raised ${className}`}
      style={{ aspectRatio: `${W} / ${H}` }}
      role="img"
      aria-label={settings.enabled ? 'Amostra do estilo de legenda escolhido' : 'Legendas desligadas'}
    />
  );
}
