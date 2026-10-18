import { font } from "@/lib/browser-editor/fonts";
import { cropFor } from "@/lib/browser-editor/framing";
import { drawIcon, type IconName } from "@/lib/browser-editor/icons";
import type { Look } from "@/lib/browser-editor/looks";
import type { Beat, MotionPlan } from "@/lib/browser-editor/motion";
import type { EditOptions, Ratio, Word } from "@/lib/browser-editor/types";

/** Tudo que é desenhado por cima do vídeo em um formato de saída. */
export interface Scene {
  ratio: Ratio;
  W: number;
  H: number;
  look: Look;
  opts: EditOptions;
  /** Palavras no tempo de saída do corpo (sem a vinheta). */
  words: Word[];
  title: string;
  cta: string;
  logo: CanvasImageSource | null;
  srcW: number;
  srcH: number;
  face: { x: number; y: number };
  introDur: number;
  outroDur: number;
  bodyDur: number;
  /** Instantes (tempo do corpo) em que o zoom alterna. */
  zoomCuts: number[];
  motion: MotionPlan;
}

interface Page {
  words: Word[];
  start: number;
  end: number;
}

interface LaidLine {
  y: number;
  width: number;
  words: { w: Word; x: number; width: number; text: string }[];
}

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const easeOut = (t: number) => 1 - (1 - clamp(t)) ** 3;
const easeIn = (t: number) => clamp(t) ** 3;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const easeBack = (t: number, s = 1.70158) => {
  const x = clamp(t) - 1;
  return 1 + (s + 1) * x * x * x + s * x * x;
};
/** Entrada e saída de um elemento que vive `dur` segundos (0 a 1). */
const life = (u: number, dur: number, inT = 0.32, outT = 0.26) => Math.min(clamp(u / inT), clamp((dur - u) / outT));

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.max(0, Math.min(r, h / 2, w / 2));
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function withAlpha(hex: string, a: number) {
  const m = hex.match(/^#([0-9a-f]{6})$/i);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function layoutFor(ratio: Ratio, W: number, H: number) {
  if (ratio === "9:16") return { capY: 0.7 * H, titleY: 0.19 * H, slotY: 0.2 * H, slotX: W / 2, margin: 0.07 * W, textW: 0.84 * W, scale: 1, side: false };
  if (ratio === "16:9") return { capY: 0.85 * H, titleY: 0.2 * H, slotY: 0.3 * H, slotX: 0.77 * W, margin: 0.05 * W, textW: 0.72 * W, scale: 0.82, side: true };
  return { capY: 0.8 * H, titleY: 0.15 * H, slotY: 0.16 * H, slotX: W / 2, margin: 0.06 * W, textW: 0.86 * W, scale: 0.92, side: false };
}

export function paginate(words: Word[], maxWords: number): Page[] {
  const pages: Page[] = [];
  let cur: Word[] = [];
  const flush = () => {
    if (cur.length) pages.push({ words: cur, start: cur[0].start, end: cur[cur.length - 1].end });
    cur = [];
  };
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const prev = cur[cur.length - 1];
    if (prev && (cur.length >= maxWords || w.start - prev.end > 0.7)) flush();
    cur.push(w);
    if (/[.!?…:;]$/.test(w.text) || (/,$/.test(w.text) && cur.length >= Math.ceil(maxWords / 2))) flush();
  }
  flush();
  for (let i = 0; i < pages.length; i++) {
    const next = pages[i + 1];
    pages[i].end = next ? Math.min(next.start, pages[i].end + 0.7) : pages[i].end + 0.9;
  }
  return pages;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (cur && ctx.measureText(next).width > maxW) {
      lines.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Textura de granulação (uma vez por pintor). */
function grainTile(): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = c.height = 160;
  const g = c.getContext("2d");
  if (!g) return null;
  const img = g.createImageData(160, 160);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + (Math.random() - 0.5) * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}

function initials(name: string) {
  const parts = name
    .replace(/^(dra?\.?|dr\.)\s+/i, "")
    .split(/\s+/)
    .filter((p) => p.length > 2 || /^[A-ZÁÉÍÓÚ]/.test(p));
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "")).toLocaleUpperCase("pt-BR");
}

function ctaIcon(text: string): IconName {
  const t = text.toLocaleLowerCase("pt-BR");
  if (/whats|zap|mensagem|fale/.test(t)) return "message-circle";
  if (/site|www|\.com|acesse/.test(t)) return "globe";
  if (/agende|consulta|contato/.test(t)) return "calendar-days";
  if (/siga|@|seguir|inscreva/.test(t)) return "bell";
  return "arrow-right";
}

/** Desenhista de um formato: guarda as páginas de legenda já diagramadas. */
export function createPainter(scene: Scene) {
  const { W, H, look, opts } = scene;
  const M = look.motion;
  const m = Math.min(W, H);
  const L = layoutFor(scene.ratio, W, H);
  const S = m * L.scale;
  const accent = look.accent;
  const cap = look.captions;
  const capSize = Math.round(cap.size * S);
  const capFont = font(cap.weight, capSize, cap.font, cap.italic);
  const pages = opts.captions ? paginate(scene.words, cap.maxWords) : [];
  const laid = new Map<number, LaidLine[]>();
  let vignette: CanvasGradient | null = null;
  const supportsFilter = typeof (document.createElement("canvas").getContext("2d") as CanvasRenderingContext2D | null)?.filter === "string";
  const grain = M.grain > 0 ? grainTile() : null;
  let grainPattern: CanvasPattern | null = null;
  const beats = scene.motion.beats;
  const transitions = scene.motion.transitions;
  const bar = M.letterbox * H;
  const showCtaInBody = opts.cta && !!scene.cta && !(opts.vignette && scene.outroDur > 0);
  const name = opts.name.trim();
  const office = (opts.office ?? "").trim();
  const serifTitle = look.titleFont === "Instrument Serif";

  /* -------------------------------- vídeo -------------------------------- */

  function zoomAt(t: number) {
    let z = 1;
    if (opts.zoom && look.zoom === "push") {
      let s = 0;
      let e = scene.bodyDur;
      for (const c of scene.zoomCuts) {
        if (c <= t) s = c;
        else {
          e = c;
          break;
        }
      }
      z = 1 + look.zoomAmount * easeInOut(clamp((t - s) / Math.max(0.5, e - s)));
    } else if (opts.zoom && look.zoom === "punch") {
      let n = 0;
      for (const c of scene.zoomCuts) if (c <= t) n++;
      z = n % 2 === 0 ? 1 : 1 + look.zoomAmount;
    }
    for (const tr of transitions) {
      const d = t - tr.at;
      if (tr.kind === "zoom") {
        if (d >= -0.12 && d < 0) z *= 1 + 0.12 * easeIn((d + 0.12) / 0.12);
        else if (d >= 0 && d < 0.3) z *= 1 + 0.16 * (1 - easeOut(d / 0.3));
      } else if (tr.kind === "flash" && d >= 0 && d < 0.25) z *= 1 + 0.06 * (1 - easeOut(d / 0.25));
    }
    return z;
  }

  function whipOffset(t: number) {
    for (const tr of transitions) {
      if (tr.kind !== "whip") continue;
      const d = t - tr.at;
      if (d >= -0.12 && d < 0) return -W * 0.38 * easeIn((d + 0.12) / 0.12);
      if (d >= 0 && d < 0.16) return W * 0.38 * (1 - easeOut(d / 0.16));
    }
    return 0;
  }

  function drawVideo(ctx: CanvasRenderingContext2D, video: CanvasImageSource | null, zoom: number, t: number | null) {
    if (!video) {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);
      return;
    }
    const c = cropFor(scene.srcW, scene.srcH, scene.ratio, scene.face, zoom);
    const off = t === null ? 0 : whipOffset(t);
    if (supportsFilter && look.grade) ctx.filter = look.grade;
    if (off) {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);
      for (let k = -2; k <= 2; k++) {
        ctx.globalAlpha = k === 0 ? 1 : 0.28;
        ctx.drawImage(video, c.sx, c.sy, c.sw, c.sh, off + k * Math.sign(off) * W * 0.035, 0, W, H);
      }
      ctx.globalAlpha = 1;
    } else ctx.drawImage(video, c.sx, c.sy, c.sw, c.sh, 0, 0, W, H);
    if (supportsFilter) ctx.filter = "none";
    if (look.vignette > 0) {
      if (!vignette) {
        vignette = ctx.createRadialGradient(W / 2, H / 2, m * 0.35, W / 2, H / 2, Math.hypot(W, H) * 0.62);
        vignette.addColorStop(0, "rgba(0,0,0,0)");
        vignette.addColorStop(1, `rgba(0,0,0,${look.vignette})`);
      }
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, W, H);
    }
  }

  /** Luz vazada, granulação, faixas de cinema e moldura. */
  function drawOverlays(ctx: CanvasRenderingContext2D, t: number) {
    if (M.leaks) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      const strength = M.grain > 0 ? 0.2 : 0.11;
      const spots: [number, number, string][] = [
        [W * (0.15 + 0.12 * Math.sin(t * 0.37)), H * (0.12 + 0.06 * Math.cos(t * 0.29)), `rgba(255,150,70,${strength})`],
        [W * (0.88 + 0.08 * Math.cos(t * 0.23)), H * (0.82 + 0.05 * Math.sin(t * 0.31)), withAlpha(accent, strength * 0.8)],
      ];
      for (const [x, y, col] of spots) {
        const g = ctx.createRadialGradient(x, y, 0, x, y, m * 0.75);
        g.addColorStop(0, col);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      }
      ctx.restore();
    }
    if (grain) {
      if (!grainPattern) grainPattern = ctx.createPattern(grain, "repeat");
      if (grainPattern) {
        ctx.save();
        ctx.globalAlpha = M.grain;
        ctx.globalCompositeOperation = "overlay";
        ctx.translate(((t * 997) % 160) | 0, ((t * 613) % 160) | 0);
        ctx.fillStyle = grainPattern;
        ctx.fillRect(-160, -160, W + 320, H + 320);
        ctx.restore();
      }
    }
    if (bar > 0) {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, bar);
      ctx.fillRect(0, H - bar, W, bar);
    }
    if (M.frame) {
      const inset = 0.035 * m;
      const len = 0.075 * m * (1 + 0.06 * Math.sin(t * 4));
      ctx.save();
      ctx.strokeStyle = accent;
      ctx.lineWidth = Math.max(4, 0.007 * m);
      ctx.lineCap = "round";
      ctx.shadowColor = withAlpha(accent, 0.7);
      ctx.shadowBlur = 0.02 * m;
      ctx.beginPath();
      for (const [x, y, dx, dy] of [
        [inset, inset, 1, 1],
        [W - inset, inset, -1, 1],
        [inset, H - inset, 1, -1],
        [W - inset, H - inset, -1, -1],
      ]) {
        ctx.moveTo(x, y + dy * len);
        ctx.lineTo(x, y);
        ctx.lineTo(x + dx * len, y);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawTransitionOverlay(ctx: CanvasRenderingContext2D, t: number) {
    for (const tr of transitions) {
      const d = Math.abs(t - tr.at);
      let a = 0;
      let color = "0,0,0";
      if (tr.kind === "flash" && d < 0.1) {
        a = 0.6 * (1 - d / 0.1) ** 2;
        color = "255,255,255";
      } else if (tr.kind === "dip" && d < 0.14) a = 0.92 * (1 - d / 0.14);
      else if (tr.kind === "fade" && d < 0.11) a = 0.45 * (1 - d / 0.11);
      if (a > 0) {
        ctx.fillStyle = `rgba(${color},${a})`;
        ctx.fillRect(0, 0, W, H);
      }
    }
  }

  /* ------------------------------ grafismos ------------------------------ */

  /** Painel de um destaque (ícone + texto), no estilo do look. */
  function drawPanel(ctx: CanvasRenderingContext2D, cx: number, cy: number, text: string, icon: IconName, u: number, dur: number) {
    const a = life(u, dur);
    if (a <= 0) return;
    const kind = M.callout;
    const upper = kind === "solid" || kind === "badge";
    const label = upper ? text.toLocaleUpperCase("pt-BR") : text;
    const px = Math.round((kind === "badge" ? 0.064 : kind === "minimal" ? 0.066 : 0.058) * S);
    const f =
      kind === "minimal"
        ? font(400, px, "Instrument Serif", true)
        : kind === "solid" || kind === "badge"
          ? font(800, px, "Sora")
          : font(800, px, "Manrope");
    ctx.save();
    ctx.font = f;
    const tw = Math.min(ctx.measureText(label).width, L.textW * (L.side ? 0.42 : 0.9));
    const h = px * 2.15;
    const iconBox = kind === "minimal" ? px * 1.3 : h * 0.72;
    const padL = kind === "minimal" ? 0 : (h - iconBox) / 2;
    const gap = px * 0.55;
    const w = padL + iconBox + gap + tw + px * 0.85;
    const x0 = L.side ? Math.min(W - L.margin - w, cx - w / 2) : cx - w / 2;
    const y0 = cy - h / 2;
    const ix = x0 + padL + iconBox / 2;

    // animação de entrada por tipo
    const inP = clamp(u / 0.38);
    let scale = 1;
    let rot = 0;
    let dy = 0;
    if (kind === "glass") dy = (1 - easeOut(inP)) * px * 0.8;
    if (kind === "minimal") dy = (1 - easeOut(inP)) * px * 0.4;
    if (kind === "solid") scale = 0.55 + 0.45 * easeBack(inP, 2.2);
    if (kind === "badge") {
      scale = 1 + 0.4 * (1 - easeOut(clamp(u / 0.18)));
      rot = -0.035;
      if (u < 0.3) {
        dy += Math.sin(u * 90) * px * 0.12 * (1 - u / 0.3);
      }
    }
    if (kind === "sticker") {
      scale = 0.3 + 0.7 * easeBack(inP, 2.6);
      rot = -0.07 + Math.sin(u * 5) * 0.02;
    }
    const exitP = clamp((dur - u) / 0.26);
    if (exitP < 1) scale *= 0.85 + 0.15 * exitP;
    ctx.globalAlpha = a;
    ctx.translate(x0 + w / 2, cy + dy);
    ctx.rotate(rot);
    ctx.scale(scale, scale);
    ctx.translate(-(x0 + w / 2), -cy);

    if (kind === "glass") {
      ctx.fillStyle = "rgba(12,14,18,0.74)";
      rr(ctx, x0, y0, w, h, h / 2);
      ctx.fill();
      ctx.lineWidth = Math.max(2, px * 0.05);
      ctx.strokeStyle = withAlpha(accent, 0.65);
      ctx.stroke();
      ctx.strokeStyle = accent;
      ctx.lineWidth = Math.max(2, px * 0.05);
      ctx.beginPath();
      ctx.arc(ix, cy, iconBox / 2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * easeOut(u / 0.6));
      ctx.stroke();
      drawIcon(ctx, icon, ix, cy, iconBox * 0.56, accent, { draw: (u - 0.1) / 0.5, lineWidth: 2 });
      ctx.fillStyle = "#ffffff";
    } else if (kind === "solid") {
      ctx.shadowColor = withAlpha(accent, 0.55);
      ctx.shadowBlur = px * 0.9;
      ctx.fillStyle = accent;
      rr(ctx, x0, y0, w, h, h / 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(ix, cy, iconBox / 2, 0, Math.PI * 2);
      ctx.fill();
      drawIcon(ctx, icon, ix, cy, iconBox * 0.58, look.ink, { draw: (u - 0.08) / 0.4, lineWidth: 2.4 });
      ctx.fillStyle = look.ink;
    } else if (kind === "badge") {
      ctx.shadowColor = "rgba(0,0,0,0.45)";
      ctx.shadowBlur = px * 0.6;
      ctx.shadowOffsetY = px * 0.15;
      ctx.fillStyle = "#ffffff";
      rr(ctx, x0, y0, w, h, px * 0.25);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.fillStyle = accent;
      rr(ctx, x0 + padL * 0.6, y0 + padL * 0.6, iconBox + padL * 0.8, h - padL * 1.2, px * 0.18);
      ctx.fill();
      drawIcon(ctx, icon, ix, cy, iconBox * 0.6, look.ink, { lineWidth: 2.6 });
      ctx.fillStyle = "#141414";
    } else if (kind === "sticker") {
      ctx.shadowColor = "rgba(0,0,0,0.4)";
      ctx.shadowBlur = px * 0.7;
      ctx.shadowOffsetY = px * 0.18;
      ctx.fillStyle = "#ffffff";
      rr(ctx, x0, y0, w, h, px * 0.55);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.lineWidth = Math.max(3, px * 0.09);
      ctx.strokeStyle = accent;
      ctx.stroke();
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(ix, cy, iconBox / 2, 0, Math.PI * 2);
      ctx.fill();
      drawIcon(ctx, icon, ix, cy, iconBox * 0.6, look.ink, { lineWidth: 2.4 });
      ctx.fillStyle = "#1d1f24";
      if (M.sparkles) sparkles(ctx, x0 + w, y0, px, u);
    } else {
      // minimal: ícone, texto serifado e uma linha que se desenha
      ctx.shadowColor = "rgba(0,0,0,0.75)";
      ctx.shadowBlur = px * 0.5;
      drawIcon(ctx, icon, ix, cy, iconBox * 0.8, accent, { draw: (u - 0.05) / 0.6, lineWidth: 1.6 });
      ctx.fillStyle = withAlpha(accent, 0.9);
      ctx.fillRect(x0 + padL + iconBox + gap, cy + px * 0.72, (tw + px * 0.2) * easeOut((u - 0.15) / 0.7), Math.max(2, px * 0.04));
      ctx.fillStyle = "#fbf3e2";
    }
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    const tx = x0 + padL + iconBox + gap;
    ctx.save();
    ctx.beginPath();
    ctx.rect(tx - 2, y0 - h, (tw + px) * easeOut((u - 0.1) / 0.35), h * 3);
    ctx.clip();
    ctx.fillText(label, tx, cy + px * 0.04, tw);
    ctx.restore();
    ctx.restore();
  }

  function sparkles(ctx: CanvasRenderingContext2D, x: number, y: number, px: number, u: number) {
    ctx.save();
    ctx.fillStyle = accent;
    const stars: [number, number, number][] = [
      [0.1, -0.5, 0.42],
      [0.7, 0.1, 0.28],
      [-0.2, 0.6, 0.22],
    ];
    for (const [dx, dy, s] of stars) {
      const k = Math.max(0, Math.sin(u * 6 + dx * 9)) * s * px;
      if (k <= 0.5) continue;
      const cx = x + dx * px * 1.4;
      const cy = y + dy * px * 1.4;
      ctx.beginPath();
      ctx.moveTo(cx, cy - k);
      ctx.quadraticCurveTo(cx, cy, cx + k, cy);
      ctx.quadraticCurveTo(cx, cy, cx, cy + k);
      ctx.quadraticCurveTo(cx, cy, cx - k, cy);
      ctx.quadraticCurveTo(cx, cy, cx, cy - k);
      ctx.fill();
    }
    ctx.restore();
  }

  /** Número em destaque que conta do zero. */
  function drawStat(ctx: CanvasRenderingContext2D, b: Extract<Beat, { kind: "stat" }>, u: number) {
    const a = life(u, b.dur);
    if (a <= 0) return;
    const match = b.value.match(/\d+(?:[.,]\d+)?/);
    let shown = b.value;
    if (match) {
      const target = parseFloat(match[0].replace(".", "").replace(",", "."));
      const k = easeOut(clamp((u - 0.1) / 0.7));
      const decimals = match[0].includes(",") ? 1 : 0;
      const grouping = match[0].includes(".") || target >= 10_000;
      const cur = (target * k).toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: grouping });
      shown = b.value.replace(match[0], cur);
    }
    const kind = M.callout;
    const big = Math.round((kind === "badge" ? 0.14 : 0.125) * S);
    const lbl = Math.round(0.04 * S);
    ctx.save();
    ctx.globalAlpha = a;
    const cx = L.side ? L.slotX : W / 2;
    const cy = L.slotY + big * 0.15;
    const s = kind === "badge" || kind === "sticker" || kind === "solid" ? 0.6 + 0.4 * easeBack(clamp(u / 0.35), 2) : 1;
    ctx.translate(cx, cy + (1 - easeOut(u / 0.35)) * (kind === "glass" || kind === "minimal" ? big * 0.3 : 0));
    ctx.scale(s, s);
    ctx.font = font(800, big, kind === "minimal" ? "Instrument Serif" : "Sora", kind === "minimal");
    const vw = ctx.measureText(b.value).width;
    const iconS = big * 0.72;
    const totalW = iconS + big * 0.35 + vw;
    const panelH = big * 1.55 + (b.label ? lbl * 1.8 : 0);
    const panelW = totalW + big * 0.9;
    const top = -panelH / 2;
    if (kind === "glass" || kind === "minimal") {
      ctx.fillStyle = "rgba(12,14,18,0.72)";
      rr(ctx, -panelW / 2, top, panelW, panelH, big * 0.32);
      ctx.fill();
      ctx.strokeStyle = withAlpha(accent, 0.5);
      ctx.lineWidth = Math.max(2, big * 0.025);
      ctx.stroke();
    } else if (kind === "solid" || kind === "sticker") {
      ctx.fillStyle = kind === "solid" ? accent : "#ffffff";
      rr(ctx, -panelW / 2, top, panelW, panelH, big * 0.4);
      ctx.fill();
      if (kind === "sticker") {
        ctx.strokeStyle = accent;
        ctx.lineWidth = Math.max(3, big * 0.06);
        ctx.stroke();
      }
    }
    const textColor = kind === "solid" ? look.ink : kind === "sticker" ? "#1d1f24" : kind === "badge" ? accent : "#ffffff";
    const iconColor = kind === "solid" ? look.ink : accent;
    const rowY = top + (b.label ? lbl * 1.8 : 0) + panelH * 0.02 + big * 0.78;
    if (b.label) {
      ctx.font = font(700, lbl, "Manrope");
      ctx.fillStyle = kind === "solid" ? withAlpha(look.ink, 0.75) : kind === "sticker" ? "#5b606b" : withAlpha("#ffffff", 0.8);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(b.label.toLocaleUpperCase("pt-BR"), 0, top + lbl * 1.3, panelW * 0.9);
    }
    drawIcon(ctx, b.icon, -totalW / 2 + iconS / 2, rowY, iconS, iconColor, { draw: (u - 0.05) / 0.5, lineWidth: 2.2 });
    ctx.font = font(800, big, kind === "minimal" ? "Instrument Serif" : "Sora", kind === "minimal");
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    if (kind === "badge") {
      ctx.lineJoin = "round";
      ctx.lineWidth = big * 0.14;
      ctx.strokeStyle = "#141414";
      ctx.strokeText(shown, -totalW / 2 + iconS + big * 0.35, rowY);
    }
    ctx.fillStyle = textColor;
    ctx.fillText(shown, -totalW / 2 + iconS + big * 0.35, rowY);
    ctx.restore();
  }

  /** Cartão animado em tela cheia (no lugar de um B-roll). */
  function drawCard(ctx: CanvasRenderingContext2D, b: Extract<Beat, { kind: "card" }>, u: number) {
    const d = b.dur;
    if (u < 0 || u > d) return;
    const out = clamp((d - u) / 0.28);
    const reveal = easeOut(u / 0.42);
    ctx.save();
    ctx.globalAlpha = out;
    ctx.beginPath();
    ctx.arc(W / 2, H * 0.42, Math.hypot(W, H) * reveal, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "rgba(9,10,13,0.9)";
    ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(W / 2, H * 0.4, 0, W / 2, H * 0.4, m * 0.9);
    glow.addColorStop(0, withAlpha(accent, 0.28));
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
    // grade fina que desliza
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    const step = m * 0.08;
    const shift = (u * step * 0.6) % step;
    ctx.beginPath();
    for (let x = -step + shift; x < W + step; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
    }
    for (let y = -step + shift; y < H + step; y += step) {
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
    }
    ctx.stroke();

    const R = 0.15 * m;
    const cy = scene.ratio === "16:9" ? H * 0.36 : H * 0.38;
    ctx.save();
    ctx.translate(W / 2, cy);
    ctx.rotate(u * 0.9);
    ctx.setLineDash([R * 0.18, R * 0.12]);
    ctx.strokeStyle = withAlpha(accent, 0.55);
    ctx.lineWidth = Math.max(2, R * 0.03);
    ctx.beginPath();
    ctx.arc(0, 0, R * 1.3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    const pop = 0.5 + 0.5 * easeBack(clamp((u - 0.08) / 0.4), 1.8);
    ctx.save();
    ctx.translate(W / 2, cy);
    ctx.scale(pop, pop);
    ctx.fillStyle = withAlpha(accent, 0.14);
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = Math.max(3, R * 0.045);
    ctx.shadowColor = withAlpha(accent, 0.8);
    ctx.shadowBlur = R * 0.3;
    ctx.stroke();
    ctx.shadowBlur = 0;
    drawIcon(ctx, b.icon, 0, 0, R * 1.05, accent, { draw: (u - 0.15) / 0.55, lineWidth: 1.8, glow: withAlpha(accent, 0.6) });
    ctx.restore();

    const size = Math.round((serifTitle ? 0.09 : 0.072) * S);
    ctx.font = serifTitle ? font(400, size, "Instrument Serif", true) : font(800, size, look.titleFont === "Manrope" ? "Manrope" : "Sora");
    const text = serifTitle ? b.title : b.title.toLocaleUpperCase("pt-BR");
    const lines = wrapText(ctx, text, L.textW * 0.9);
    const lh = size * 1.15;
    let y = cy + R * 1.75;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    let wi = 0;
    for (const line of lines) {
      const parts = line.split(" ");
      const total = ctx.measureText(line).width;
      let x = W / 2 - total / 2;
      for (const p of parts) {
        const pw = ctx.measureText(p).width;
        const k = easeOut(clamp((u - 0.25 - wi * 0.07) / 0.3));
        ctx.globalAlpha = out * k;
        ctx.fillStyle = "#ffffff";
        ctx.fillText(p, x + pw / 2, y + (1 - k) * size * 0.5);
        x += pw + ctx.measureText(" ").width;
        wi++;
      }
      y += lh;
    }
    if (b.sub) {
      const sub = Math.round(0.034 * S);
      ctx.globalAlpha = out * easeOut(clamp((u - 0.55) / 0.3));
      ctx.font = font(700, sub, "Manrope");
      ctx.fillStyle = accent;
      ctx.fillText(b.sub.toLocaleUpperCase("pt-BR"), W / 2, y + sub * 0.6, L.textW);
    }
    ctx.restore();
  }

  function drawBeats(ctx: CanvasRenderingContext2D, t: number, layer: "card" | "top") {
    for (const b of beats) {
      const u = t - b.at;
      if (u < 0 || u > b.dur) continue;
      if (b.kind === "card") {
        if (layer === "card") drawCard(ctx, b, u);
      } else if (layer === "top") {
        if (b.kind === "stat") drawStat(ctx, b, u);
        else drawPanel(ctx, L.slotX, L.slotY, b.text, b.icon, u, b.dur);
      }
    }
  }

  /* ------------------------------- legendas ------------------------------ */

  function wrap(ctx: CanvasRenderingContext2D, page: Page, index: number): LaidLine[] {
    const hit = laid.get(index);
    if (hit) return hit;
    ctx.font = capFont;
    const space = ctx.measureText(" ").width * (cap.upper ? 1.3 : 1.12);
    const lines: LaidLine["words"][] = [[]];
    let width = 0;
    for (const w of page.words) {
      const text = cap.upper ? w.text.toLocaleUpperCase("pt-BR") : w.text;
      const ww = ctx.measureText(text).width;
      const line = lines[lines.length - 1];
      if (line.length && width + space + ww > L.textW) {
        lines.push([]);
        width = 0;
      }
      const cur = lines[lines.length - 1];
      cur.push({ w, x: width + (cur.length ? space : 0), width: ww, text });
      width += (cur.length > 1 ? space : 0) + ww;
    }
    const lh = capSize * 1.22;
    const out = lines.map((ws, i) => {
      const lw = ws.length ? ws[ws.length - 1].x + ws[ws.length - 1].width : 0;
      const x0 = (W - lw) / 2;
      return { y: L.capY + (i - (lines.length - 1) / 2) * lh, width: lw, words: ws.map((x) => ({ ...x, x: x0 + x.x })) };
    });
    laid.set(index, out);
    return out;
  }

  function drawCaptions(ctx: CanvasRenderingContext2D, t: number) {
    let index = -1;
    for (let i = 0; i < pages.length; i++) {
      if (t >= pages[i].start - 0.05 && t < pages[i].end) {
        index = i;
        break;
      }
    }
    if (index < 0) return;
    const page = pages[index];
    const lines = wrap(ctx, page, index);
    const anim = cap.anim;
    const since = t - page.start;
    ctx.save();
    if (anim === "fade") {
      ctx.globalAlpha = easeOut(since / 0.18);
      ctx.translate(0, (1 - easeOut(since / 0.25)) * capSize * 0.25);
    }
    if (cap.pop || anim === "pop" || anim === "box") {
      const k = 0.84 + 0.16 * easeBack(since / 0.18, 2);
      ctx.translate(W / 2, L.capY);
      ctx.scale(k, k);
      ctx.translate(-W / 2, -L.capY);
    }
    ctx.font = capFont;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    const padX = capSize * 0.38;
    const padY = capSize * 0.2;
    if (cap.box === "pill" && anim !== "bounce") {
      for (const line of lines) {
        ctx.fillStyle = "rgba(10,12,16,0.66)";
        rr(ctx, (W - line.width) / 2 - padX, line.y - capSize * 0.62 - padY / 2, line.width + padX * 2, capSize * 1.24 + padY, capSize * 0.3);
        ctx.fill();
      }
    }
    for (const line of lines) {
      for (const it of line.words) {
        const started = t >= it.w.start - 0.04;
        const active = t >= it.w.start && t < it.w.end + 0.04;
        let alpha = 1;
        let scale = 1;
        let dy = 0;
        if (anim === "reveal") {
          alpha = clamp((t - it.w.start + 0.06) / 0.2);
          dy = (1 - easeOut((t - it.w.start + 0.06) / 0.3)) * capSize * 0.18;
        } else if (anim === "bounce") {
          if (!started) continue;
          const k = clamp((t - it.w.start + 0.04) / 0.28);
          scale = 0.35 + 0.65 * easeBack(k, 2.4);
          dy = (1 - easeOut(k)) * capSize * 0.35;
        } else if (anim === "pop" && active) scale = 1.05;
        if (alpha <= 0) continue;
        const cx = it.x + it.width / 2;
        ctx.save();
        ctx.globalAlpha *= alpha;
        if (scale !== 1 || dy) {
          ctx.translate(cx, line.y + dy);
          ctx.scale(scale, scale);
          ctx.translate(-cx, -line.y);
        }
        if (anim === "bounce" && cap.box === "pill" && !it.w.key) {
          ctx.fillStyle = "rgba(10,12,16,0.7)";
          rr(ctx, it.x - capSize * 0.2, line.y - capSize * 0.6, it.width + capSize * 0.4, capSize * 1.2, capSize * 0.3);
          ctx.fill();
        }
        if (anim === "bounce" && it.w.key) {
          ctx.fillStyle = withAlpha(accent, 0.9);
          ctx.save();
          ctx.translate(cx, line.y);
          ctx.rotate(-0.03);
          rr(ctx, -it.width / 2 - capSize * 0.14, -capSize * 0.5, it.width + capSize * 0.28, capSize * 1.0, capSize * 0.2);
          ctx.fill();
          ctx.restore();
        }
        if (cap.box === "word" && active) {
          ctx.fillStyle = accent;
          rr(ctx, it.x - capSize * 0.16, line.y - capSize * 0.6, it.width + capSize * 0.32, capSize * 1.2, capSize * 0.22);
          ctx.fill();
        }
        let color = cap.color;
        if (it.w.key) color = anim === "bounce" ? look.ink : accent;
        if (active && cap.active && !(anim === "bounce" && it.w.key)) color = cap.active;
        if (cap.box === "none" || (cap.box === "word" && !active)) {
          ctx.lineJoin = "round";
          ctx.lineWidth = Math.max(4, capSize * (anim === "reveal" ? 0.1 : 0.17));
          ctx.strokeStyle = "rgba(0,0,0,0.88)";
          if (anim === "reveal") {
            ctx.shadowColor = "rgba(0,0,0,0.85)";
            ctx.shadowBlur = capSize * 0.35;
          }
          ctx.strokeText(it.text, it.x, line.y);
          ctx.shadowBlur = 0;
        }
        if (anim === "pop" && active && cap.active) {
          ctx.shadowColor = withAlpha(cap.active.startsWith("#") ? cap.active : accent, 0.7);
          ctx.shadowBlur = capSize * 0.4;
        }
        ctx.fillStyle = color;
        ctx.fillText(it.text, it.x, line.y);
        ctx.restore();
      }
    }
    ctx.restore();
  }

  /* -------------------------------- título ------------------------------- */

  function drawTitle(ctx: CanvasRenderingContext2D, t: number) {
    if (!opts.hook || !scene.title || t > 3.1) return;
    const kind = M.title;
    const a = Math.min(easeOut(t / 0.3), clamp((3.1 - t) / 0.3));
    ctx.save();
    if (kind === "classic" || kind === "cinema") {
      const size = Math.round((kind === "cinema" ? 0.1 : 0.088) * S);
      ctx.font = font(400, size, "Instrument Serif", true);
      const lines = wrapText(ctx, scene.title, L.textW * 0.92);
      const lh = size * 1.1;
      const blockH = lines.length * lh;
      const y0 = L.titleY - blockH / 2;
      const band = ctx.createLinearGradient(0, y0 - size * 1.6, 0, y0 + blockH + size * 1.6);
      band.addColorStop(0, "rgba(0,0,0,0)");
      band.addColorStop(0.5, `rgba(0,0,0,${0.55 * a})`);
      band.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = band;
      ctx.fillRect(0, y0 - size * 1.6, W, blockH + size * 3.2);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      let ci = 0;
      lines.forEach((l, i) => {
        const y = y0 + lh * (i + 0.5);
        if (kind === "cinema") {
          // letra a letra, de desfocado para nítido
          const total = ctx.measureText(l).width;
          let x = W / 2 - total / 2;
          for (const ch of l) {
            const cw = ctx.measureText(ch).width;
            const k = clamp((t - 0.1 - ci * 0.025) / 0.45);
            ctx.globalAlpha = a * k;
            ctx.shadowColor = "rgba(255,240,210,0.9)";
            ctx.shadowBlur = (1 - k) * size * 0.6;
            ctx.fillStyle = "#fbf3e2";
            ctx.fillText(ch, x + cw / 2, y);
            x += cw;
            ci++;
          }
          ctx.shadowBlur = 0;
        } else {
          ctx.globalAlpha = a;
          ctx.fillStyle = "#ffffff";
          ctx.fillText(l, W / 2, y + (1 - easeOut(t / 0.5)) * size * 0.3);
        }
      });
      ctx.globalAlpha = a;
      const lw = W * 0.18 * easeOut((t - 0.2) / 0.7);
      ctx.fillStyle = accent;
      const ly = y0 + blockH + size * 0.45;
      ctx.fillRect(W / 2 - lw, ly, lw * 2, Math.max(2, size * 0.035));
      if (kind === "cinema") ctx.fillRect(W / 2 - lw * 0.5, y0 - size * 0.55, lw, Math.max(2, size * 0.03));
    } else if (kind === "stagger") {
      const size = Math.round(0.078 * S);
      ctx.font = font(800, size, "Sora");
      const lines = wrapText(ctx, scene.title.toLocaleUpperCase("pt-BR"), L.textW * 0.9);
      const lh = size * 1.12;
      const y0 = L.titleY - (lines.length * lh) / 2;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      let wi = 0;
      const longest = lines.flatMap((l) => l.split(" ")).reduce((p, c) => (c.length > p.length ? c : p), "");
      lines.forEach((l, i) => {
        const parts = l.split(" ");
        const total = ctx.measureText(l).width;
        let x = W / 2 - total / 2;
        const y = y0 + lh * (i + 0.5);
        for (const p of parts) {
          const pw = ctx.measureText(p).width;
          const k = clamp((t - wi * 0.08) / 0.3);
          const s = 0.4 + 0.6 * easeBack(k, 2.4);
          ctx.save();
          ctx.globalAlpha = a * clamp(k * 3);
          ctx.translate(x + pw / 2, y);
          ctx.scale(s, s);
          if (p === longest) {
            ctx.fillStyle = accent;
            rr(ctx, -pw / 2 - size * 0.15, -size * 0.58, pw + size * 0.3, size * 1.12, size * 0.16);
            ctx.fill();
            ctx.fillStyle = look.ink;
            ctx.fillText(p, 0, size * 0.04);
          } else {
            ctx.lineJoin = "round";
            ctx.lineWidth = size * 0.16;
            ctx.strokeStyle = "rgba(0,0,0,0.85)";
            ctx.strokeText(p, 0, size * 0.04);
            ctx.fillStyle = "#ffffff";
            ctx.fillText(p, 0, size * 0.04);
          }
          ctx.restore();
          x += pw + ctx.measureText(" ").width;
          wi++;
        }
      });
    } else if (kind === "slam") {
      const size = Math.round(0.082 * S);
      ctx.font = font(800, size, "Sora");
      const lines = wrapText(ctx, scene.title.toLocaleUpperCase("pt-BR"), L.textW * 0.86);
      const lh = size * 1.12;
      const blockH = lines.length * lh;
      const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
      const k = easeOut(clamp(t / 0.16));
      const s = 1.6 - 0.6 * k;
      const shake = t < 0.4 ? Math.sin(t * 95) * size * 0.08 * (1 - t / 0.4) : 0;
      ctx.globalAlpha = a;
      ctx.translate(W / 2 + shake, L.titleY);
      ctx.rotate(-0.03);
      ctx.scale(s, s);
      const pad = size * 0.4;
      ctx.fillStyle = accent;
      rr(ctx, -widest / 2 - pad, -blockH / 2 - pad * 0.7, widest + pad * 2, blockH + pad * 1.4, size * 0.18);
      ctx.fill();
      ctx.fillStyle = look.ink;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      lines.forEach((l, i) => ctx.fillText(l, 0, -blockH / 2 + lh * (i + 0.5) + size * 0.04));
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (t < 0.12) {
        ctx.fillStyle = `rgba(255,255,255,${0.7 * (1 - t / 0.12)})`;
        ctx.fillRect(0, 0, W, H);
      }
    } else {
      // sticker
      const size = Math.round(0.068 * S);
      ctx.font = font(800, size, "Manrope");
      const lines = wrapText(ctx, scene.title, L.textW * 0.8);
      const lh = size * 1.15;
      const blockH = lines.length * lh;
      const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
      const s = 0.3 + 0.7 * easeBack(clamp(t / 0.4), 2.6);
      ctx.globalAlpha = a;
      ctx.translate(W / 2, L.titleY);
      ctx.rotate(-0.05 + Math.sin(t * 3) * 0.012);
      ctx.scale(s, s);
      const pad = size * 0.55;
      ctx.shadowColor = "rgba(0,0,0,0.4)";
      ctx.shadowBlur = size * 0.6;
      ctx.shadowOffsetY = size * 0.15;
      ctx.fillStyle = "#ffffff";
      rr(ctx, -widest / 2 - pad, -blockH / 2 - pad * 0.8, widest + pad * 2, blockH + pad * 1.6, size * 0.5);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.strokeStyle = accent;
      ctx.lineWidth = size * 0.1;
      ctx.stroke();
      ctx.fillStyle = "#1d1f24";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      lines.forEach((l, i) => ctx.fillText(l, 0, -blockH / 2 + lh * (i + 0.5)));
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(widest / 2 + pad * 0.9, -blockH / 2 - pad * 0.7, size * 0.62, 0, Math.PI * 2);
      ctx.fill();
      drawIcon(ctx, "sparkles", widest / 2 + pad * 0.9, -blockH / 2 - pad * 0.7, size * 0.72, look.ink, { lineWidth: 2.4 });
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    ctx.restore();
  }

  /* ---------------------------- marca e chamada --------------------------- */

  function drawCta(ctx: CanvasRenderingContext2D, t: number) {
    if (!showCtaInBody) return;
    const local = t - (scene.bodyDur - 3.4);
    if (local < 0) return;
    const a = easeOut(local / 0.35);
    const size = Math.round(0.054 * S);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = font(800, size, "Sora");
    const text = scene.cta;
    const tw = ctx.measureText(text).width;
    const iconS = size * 1.2;
    const w = tw + iconS + size * 2;
    const h = size * 2.1;
    const pulse = 1 + 0.035 * Math.sin(local * 6);
    const y = L.titleY + (1 - easeBack(local / 0.45, 2)) * size * 2;
    ctx.translate(W / 2, y);
    ctx.scale(pulse, pulse);
    ctx.shadowColor = withAlpha(accent, 0.6);
    ctx.shadowBlur = size * 0.9;
    ctx.fillStyle = accent;
    rr(ctx, -w / 2, -h / 2, w, h, h / 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    drawIcon(ctx, ctaIcon(text), -w / 2 + size * 0.75 + iconS / 2, 0, iconS, look.ink, { lineWidth: 2.4, draw: (local - 0.1) / 0.4 });
    ctx.fillStyle = look.ink;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(text, -w / 2 + size * 1.05 + iconS, size * 0.04);
    ctx.restore();
  }

  function drawLogo(ctx: CanvasRenderingContext2D) {
    const img = scene.logo as (CanvasImageSource & { width: number; height: number }) | null;
    if (!img || !img.width) return;
    const max = 0.12 * m;
    const k = Math.min(max / img.width, max / img.height);
    const w = img.width * k;
    const h = img.height * k;
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.drawImage(img, W - w - (M.frame ? 0.08 : 0.045) * m, Math.max(bar + 0.02 * m, (scene.ratio === "9:16" ? 0.06 : 0.045) * H), w, h);
    ctx.restore();
  }

  function drawProgress(ctx: CanvasRenderingContext2D, t: number) {
    if (!look.progressBar) return;
    const h = Math.max(5, Math.round(0.007 * H));
    const y = bar;
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    ctx.fillRect(0, y, W, h);
    ctx.save();
    ctx.shadowColor = accent;
    ctx.shadowBlur = h * 2;
    ctx.fillStyle = accent;
    ctx.fillRect(0, y, W * clamp(t / Math.max(0.1, scene.bodyDur)), h);
    ctx.restore();
  }

  /** Marca no centro: anel que se desenha com o logo ou as iniciais. */
  function drawEmblem(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number, t: number) {
    ctx.save();
    ctx.strokeStyle = accent;
    ctx.lineWidth = Math.max(3, R * 0.05);
    ctx.shadowColor = withAlpha(accent, 0.7);
    ctx.shadowBlur = R * 0.25;
    ctx.beginPath();
    ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * easeOut(t / 0.7));
    ctx.stroke();
    ctx.shadowBlur = 0;
    const k = easeBack(clamp((t - 0.25) / 0.45), 1.8);
    ctx.globalAlpha = clamp((t - 0.25) / 0.3);
    const img = scene.logo as (CanvasImageSource & { width: number; height: number }) | null;
    if (img && img.width) {
      const s = (R * 1.3 * k) / Math.max(img.width, img.height);
      ctx.drawImage(img, cx - (img.width * s) / 2, cy - (img.height * s) / 2, img.width * s, img.height * s);
    } else {
      const ini = initials(name || scene.title);
      if (ini) {
        ctx.font = font(400, R * 0.95 * k, "Instrument Serif", true);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#fbf3e2";
        ctx.fillText(ini, cx, cy + R * 0.05);
      } else drawIcon(ctx, "scale", cx, cy, R * 1.1 * k, accent, { lineWidth: 1.6 });
    }
    ctx.restore();
  }

  function drawNameBlock(ctx: CanvasRenderingContext2D, top: number, t: number, main: string) {
    const nameSize = Math.round(0.078 * S);
    const subSize = Math.round(0.03 * S);
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = font(400, nameSize, "Instrument Serif", true);
    const nw = Math.min(ctx.measureText(main).width, L.textW);
    ctx.beginPath();
    ctx.rect(W / 2 - nw / 2 - 4, top - nameSize, (nw + 8) * easeOut((t - 0.45) / 0.6), nameSize * 2);
    ctx.clip();
    ctx.fillStyle = "#fbf3e2";
    ctx.fillText(main, W / 2, top, L.textW);
    ctx.restore();
    const lw = W * 0.16 * easeOut((t - 0.6) / 0.6);
    ctx.fillStyle = accent;
    ctx.fillRect(W / 2 - lw, top + nameSize * 0.75, lw * 2, Math.max(2, m * 0.003));
    if (office) {
      ctx.save();
      ctx.globalAlpha = clamp((t - 0.85) / 0.4);
      ctx.font = font(700, subSize, "Manrope");
      ctx.fillStyle = accent;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const spaced = office.toLocaleUpperCase("pt-BR").split("").join(" ");
      ctx.fillText(spaced, W / 2, top + nameSize * 0.75 + subSize * 1.9, L.textW);
      ctx.restore();
    }
  }

  function darkCard(ctx: CanvasRenderingContext2D, alpha: number) {
    ctx.fillStyle = `rgba(8,9,12,${alpha})`;
    ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(W / 2, H * 0.42, 0, W / 2, H * 0.42, m * 0.8);
    g.addColorStop(0, withAlpha(accent, 0.18 * alpha));
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  const introText = name || scene.title;

  return {
    pages,
    /** Quadro do corpo do vídeo. `t` é o tempo do corpo (saída, sem vinheta). */
    body(ctx: CanvasRenderingContext2D, video: CanvasImageSource | null, t: number) {
      drawVideo(ctx, video, zoomAt(t), t);
      drawOverlays(ctx, t);
      drawBeats(ctx, t, "card");
      drawLogo(ctx);
      drawProgress(ctx, t);
      drawTitle(ctx, t);
      drawBeats(ctx, t, "top");
      drawCaptions(ctx, t);
      drawCta(ctx, t);
      drawTransitionOverlay(ctx, t);
    },
    /** Só as legendas sobre fundo preto (prévia dos estilos). */
    captionsOnly(ctx: CanvasRenderingContext2D, t: number) {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);
      drawCaptions(ctx, t);
    },
    /** Vinheta de abertura: anel, iniciais ou logo, nome e escritório; abre em círculo para o vídeo. */
    intro(ctx: CanvasRenderingContext2D, video: CanvasImageSource | null, t: number) {
      drawVideo(ctx, video, 1, null);
      const d = scene.introDur;
      const open = clamp((t - (d - 0.45)) / 0.45);
      ctx.save();
      if (open > 0) {
        ctx.beginPath();
        ctx.rect(0, 0, W, H);
        ctx.arc(W / 2, H * 0.42, Math.hypot(W, H) * easeIn(open), 0, Math.PI * 2, true);
        ctx.clip("evenodd");
      }
      darkCard(ctx, 0.9);
      const R = 0.11 * m;
      const cy = H * (scene.ratio === "16:9" ? 0.36 : 0.4);
      drawEmblem(ctx, W / 2, cy, R, t);
      drawNameBlock(ctx, cy + R * 2.1, t, introText);
      ctx.restore();
      drawOverlays(ctx, t);
    },
    /** Encerramento: marca, nome, escritório e chamada. */
    outro(ctx: CanvasRenderingContext2D, video: CanvasImageSource | null, t: number) {
      drawVideo(ctx, video, zoomAt(scene.bodyDur), null);
      const d = scene.outroDur;
      const k = easeOut(t / 0.45);
      ctx.save();
      ctx.beginPath();
      ctx.arc(W / 2, H * 0.42, Math.hypot(W, H) * k, 0, Math.PI * 2);
      ctx.clip();
      darkCard(ctx, 0.92);
      const R = 0.1 * m;
      const cy = H * (scene.ratio === "16:9" ? 0.3 : 0.34);
      drawEmblem(ctx, W / 2, cy, R, t);
      if (name) drawNameBlock(ctx, cy + R * 2.1, t, name);
      if (opts.cta && scene.cta) {
        const size = Math.round(0.042 * S);
        const local = t - 0.9;
        if (local > 0) {
          ctx.save();
          ctx.globalAlpha = easeOut(local / 0.35);
          ctx.font = font(800, size, "Sora");
          const tw = ctx.measureText(scene.cta).width;
          const iconS = size * 1.15;
          const w = Math.min(L.textW, tw + iconS + size * 2);
          const h = size * 2.1;
          const y = cy + R * 2.1 + (name ? size * 4.6 : 0) + (1 - easeBack(local / 0.45, 2)) * size;
          const pulse = 1 + 0.03 * Math.sin(local * 5);
          ctx.translate(W / 2, y);
          ctx.scale(pulse, pulse);
          ctx.fillStyle = accent;
          ctx.shadowColor = withAlpha(accent, 0.6);
          ctx.shadowBlur = size;
          rr(ctx, -w / 2, -h / 2, w, h, h / 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          drawIcon(ctx, ctaIcon(scene.cta), -w / 2 + size * 0.75 + iconS / 2, 0, iconS, look.ink, { lineWidth: 2.4 });
          ctx.fillStyle = look.ink;
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.fillText(scene.cta, -w / 2 + size * 1.05 + iconS, size * 0.04, w - iconS - size * 1.6);
          ctx.restore();
        }
      }
      ctx.restore();
      drawOverlays(ctx, scene.bodyDur + t);
      const fade = clamp((d - t) / 0.45);
      if (fade < 1) {
        ctx.fillStyle = `rgba(0,0,0,${1 - fade})`;
        ctx.fillRect(0, 0, W, H);
      }
    },
  };
}

export type Painter = ReturnType<typeof createPainter>;
