import { cropFor } from "@/lib/browser-editor/framing";
import type { Look } from "@/lib/browser-editor/looks";
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
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function layoutFor(ratio: Ratio, W: number, H: number) {
  if (ratio === "9:16") return { capY: 0.69 * H, titleY: 0.17 * H, lowerY: 0.57 * H, margin: 0.07 * W, textW: 0.84 * W, scale: 1 };
  if (ratio === "16:9") return { capY: 0.86 * H, titleY: 0.15 * H, lowerY: 0.7 * H, margin: 0.05 * W, textW: 0.72 * W, scale: 0.82 };
  return { capY: 0.8 * H, titleY: 0.13 * H, lowerY: 0.64 * H, margin: 0.06 * W, textW: 0.86 * W, scale: 0.92 };
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

/** Desenhista de um formato: guarda as páginas de legenda já diagramadas. */
export function createPainter(scene: Scene) {
  const { W, H, look, opts } = scene;
  const m = Math.min(W, H);
  const L = layoutFor(scene.ratio, W, H);
  const cap = look.captions;
  const capSize = Math.round(cap.size * m * L.scale);
  const capFont = `${cap.italic ? "italic " : ""}${cap.weight} ${capSize}px "${cap.font}", "Manrope", sans-serif`;
  const pages = opts.captions ? paginate(scene.words, cap.maxWords) : [];
  const laid = new Map<number, LaidLine[]>();
  let vignette: CanvasGradient | null = null;
  const supportsFilter = typeof (document.createElement("canvas").getContext("2d") as CanvasRenderingContext2D | null)?.filter === "string";

  const lowerStart = opts.hook && scene.title ? 3.3 : 0.5;
  const showCtaInBody = opts.cta && !!scene.cta && !(opts.vignette && scene.outroDur > 0);

  function zoomAt(t: number) {
    if (!opts.zoom || look.zoom === "none") return 1;
    if (look.zoom === "push") {
      let s = 0;
      let e = scene.bodyDur;
      for (const c of scene.zoomCuts) {
        if (c <= t) s = c;
        else {
          e = c;
          break;
        }
      }
      return 1 + look.zoomAmount * easeInOut(clamp((t - s) / Math.max(0.5, e - s)));
    }
    let n = 0;
    for (const c of scene.zoomCuts) if (c <= t) n++;
    return n % 2 === 0 ? 1 : 1 + look.zoomAmount;
  }

  function drawVideo(ctx: CanvasRenderingContext2D, video: CanvasImageSource, zoom: number) {
    const c = cropFor(scene.srcW, scene.srcH, scene.ratio, scene.face, zoom);
    if (supportsFilter && look.grade) ctx.filter = look.grade;
    ctx.drawImage(video, c.sx, c.sy, c.sw, c.sh, 0, 0, W, H);
    if (supportsFilter) ctx.filter = "none";
    if (look.vignette > 0) {
      if (!vignette) {
        vignette = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.hypot(W, H) * 0.62);
        vignette.addColorStop(0, "rgba(0,0,0,0)");
        vignette.addColorStop(1, `rgba(0,0,0,${look.vignette})`);
      }
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, W, H);
    }
  }

  function wrap(ctx: CanvasRenderingContext2D, page: Page, index: number): LaidLine[] {
    const hit = laid.get(index);
    if (hit) return hit;
    ctx.font = capFont;
    const space = ctx.measureText(" ").width;
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
    ctx.save();
    if (cap.pop) {
      const k = 0.86 + 0.14 * easeOut((t - page.start) / 0.14);
      ctx.translate(W / 2, L.capY);
      ctx.scale(k, k);
      ctx.translate(-W / 2, -L.capY);
    }
    ctx.font = capFont;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    const padX = capSize * 0.38;
    const padY = capSize * 0.2;
    if (cap.box === "pill") {
      for (const line of lines) {
        ctx.fillStyle = "rgba(10,12,16,0.62)";
        rr(ctx, (W - line.width) / 2 - padX, line.y - capSize * 0.62 - padY / 2, line.width + padX * 2, capSize * 1.24 + padY, capSize * 0.3);
        ctx.fill();
      }
    }
    for (const line of lines) {
      for (const it of line.words) {
        const active = t >= it.w.start && t < it.w.end + 0.04;
        if (cap.box === "word" && active) {
          ctx.fillStyle = look.accent;
          rr(ctx, it.x - capSize * 0.16, line.y - capSize * 0.6, it.width + capSize * 0.32, capSize * 1.2, capSize * 0.22);
          ctx.fill();
        }
        let color = cap.color;
        if (it.w.key) color = look.accent;
        if (active && cap.active) color = cap.box === "word" ? cap.active : cap.active;
        if (cap.box === "none" || (cap.box === "word" && !active)) {
          ctx.lineJoin = "round";
          ctx.lineWidth = Math.max(4, capSize * 0.16);
          ctx.strokeStyle = "rgba(0,0,0,0.88)";
          ctx.strokeText(it.text, it.x, line.y);
        }
        ctx.fillStyle = color;
        ctx.fillText(it.text, it.x, line.y);
      }
    }
    ctx.restore();
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

  function drawTitle(ctx: CanvasRenderingContext2D, t: number) {
    if (!opts.hook || !scene.title || t > 3.1) return;
    const a = Math.min(easeOut(t / 0.3), clamp((3.1 - t) / 0.3));
    const serif = look.titleFont === "Instrument Serif";
    const size = Math.round((serif ? 0.088 : 0.07) * m * L.scale);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = `${serif ? "italic 400" : "800"} ${size}px "${look.titleFont}", "Sora", sans-serif`;
    const text = serif ? scene.title : scene.title.toLocaleUpperCase("pt-BR");
    const lines = wrapText(ctx, text, L.textW * 0.92);
    const lh = size * 1.12;
    const blockH = lines.length * lh;
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
    const y0 = L.titleY - blockH / 2 + (1 - a) * size * 0.4;
    const pad = size * 0.42;
    ctx.fillStyle = "rgba(10,12,16,0.74)";
    rr(ctx, (W - widest) / 2 - pad, y0 - pad * 0.8, widest + pad * 2, blockH + pad * 1.6, size * 0.34);
    ctx.fill();
    ctx.fillStyle = look.accent;
    rr(ctx, W / 2 - size * 0.9, y0 + blockH + pad * 0.8 - size * 0.08, size * 1.8, size * 0.1, size * 0.05);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    lines.forEach((l, i) => ctx.fillText(l, W / 2, y0 + lh * (i + 0.5)));
    ctx.restore();
  }

  function drawLowerThird(ctx: CanvasRenderingContext2D, t: number) {
    if (!opts.lowerThird || !opts.name.trim()) return;
    const local = t - lowerStart;
    if (local < 0 || local > 4.2) return;
    const a = Math.min(easeOut(local / 0.4), clamp((4.2 - local) / 0.35));
    const nameSize = Math.round(0.05 * m * L.scale);
    const subSize = Math.round(0.03 * m * L.scale);
    ctx.save();
    ctx.font = `700 ${nameSize}px "Sora", sans-serif`;
    const nw = ctx.measureText(opts.name.trim()).width;
    ctx.font = `700 ${subSize}px "Manrope", sans-serif`;
    const sub = opts.oab.trim().toLocaleUpperCase("pt-BR");
    const sw = sub ? ctx.measureText(sub).width : 0;
    const boxW = Math.max(nw, sw) + nameSize * 1.4;
    const boxH = nameSize * 1.5 + (sub ? subSize * 1.5 : 0);
    const x = L.margin - (1 - a) * boxW * 0.35;
    const y = L.lowerY - boxH / 2;
    ctx.globalAlpha = a;
    ctx.fillStyle = "rgba(12,14,18,0.78)";
    rr(ctx, x, y, boxW, boxH, nameSize * 0.32);
    ctx.fill();
    ctx.fillStyle = look.accent;
    rr(ctx, x, y + boxH * 0.18, Math.max(5, nameSize * 0.12), boxH * 0.64, 3);
    ctx.fill();
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";
    ctx.font = `700 ${nameSize}px "Sora", sans-serif`;
    ctx.fillText(opts.name.trim(), x + nameSize * 0.7, y + nameSize * 0.8);
    if (sub) {
      ctx.fillStyle = look.accent;
      ctx.font = `700 ${subSize}px "Manrope", sans-serif`;
      ctx.fillText(sub, x + nameSize * 0.7, y + nameSize * 1.5 + subSize * 0.55);
    }
    ctx.restore();
  }

  function drawCta(ctx: CanvasRenderingContext2D, t: number) {
    if (!showCtaInBody) return;
    const local = t - (scene.bodyDur - 3.4);
    if (local < 0) return;
    const a = easeOut(local / 0.35);
    const size = Math.round(0.046 * m * L.scale);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = `800 ${size}px "Sora", sans-serif`;
    const text = scene.cta;
    const tw = ctx.measureText(text).width;
    const w = tw + size * 1.6;
    const h = size * 2;
    const x = (W - w) / 2;
    const y = L.titleY - h / 2 + (1 - a) * size;
    ctx.fillStyle = look.accent;
    rr(ctx, x, y, w, h, h / 2);
    ctx.fill();
    ctx.fillStyle = "#101216";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, W / 2, y + h / 2 + size * 0.04);
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
    ctx.drawImage(img, W - w - 0.045 * m, (scene.ratio === "9:16" ? 0.06 : 0.045) * H, w, h);
    ctx.restore();
  }

  function drawProgress(ctx: CanvasRenderingContext2D, t: number) {
    if (!look.progressBar) return;
    const h = Math.max(4, Math.round(0.006 * H));
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(0, 0, W, h);
    ctx.fillStyle = look.accent;
    ctx.fillRect(0, 0, W * clamp(t / Math.max(0.1, scene.bodyDur)), h);
  }

  function drawCard(ctx: CanvasRenderingContext2D, dark: number, lines: { text: string; font: string; color: string; gap: number }[], lineW: number, alpha: number) {
    ctx.save();
    ctx.fillStyle = `rgba(8,9,12,${dark})`;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = alpha;
    const total = lines.reduce((s, l) => s + l.gap, 0);
    let y = H / 2 - total / 2;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    lines.forEach((l, i) => {
      ctx.font = l.font;
      ctx.fillStyle = l.color;
      ctx.fillText(l.text, W / 2, y + l.gap / 2);
      y += l.gap;
      if (i === 0 && lineW > 0) {
        ctx.fillStyle = look.accent;
        ctx.fillRect(W / 2 - lineW / 2, y - l.gap * 0.08, lineW, Math.max(3, m * 0.004));
      }
    });
    ctx.restore();
  }

  const introText = opts.name.trim() || scene.title;

  return {
    pages,
    /** Quadro do corpo do vídeo. `t` é o tempo do corpo (saída, sem vinheta). */
    body(ctx: CanvasRenderingContext2D, video: CanvasImageSource, t: number) {
      drawVideo(ctx, video, zoomAt(t));
      drawLogo(ctx);
      drawProgress(ctx, t);
      drawTitle(ctx, t);
      drawLowerThird(ctx, t);
      drawCaptions(ctx, t);
      drawCta(ctx, t);
    },
    /** Vinheta de abertura sobre o primeiro quadro. */
    intro(ctx: CanvasRenderingContext2D, video: CanvasImageSource, t: number) {
      drawVideo(ctx, video, 1);
      const d = scene.introDur;
      const fadeOut = clamp((d - t) / 0.35);
      const nameSize = Math.round(0.085 * m * L.scale);
      const subSize = Math.round(0.03 * m * L.scale);
      drawCard(
        ctx,
        0.82 * fadeOut,
        [
          { text: introText, font: `italic 400 ${nameSize}px "Instrument Serif", serif`, color: "#fbf3e2", gap: nameSize * 1.3 },
          ...(opts.oab.trim() ? [{ text: opts.oab.trim().toLocaleUpperCase("pt-BR"), font: `700 ${subSize}px "Manrope", sans-serif`, color: look.accent, gap: subSize * 2.6 }] : []),
        ],
        W * 0.32 * easeOut(t / 0.6),
        easeOut((t - 0.15) / 0.45) * fadeOut,
      );
    },
    /** Encerramento: nome, OAB e chamada. */
    outro(ctx: CanvasRenderingContext2D, video: CanvasImageSource, t: number) {
      drawVideo(ctx, video, zoomAt(scene.bodyDur));
      const d = scene.outroDur;
      const fade = clamp((d - t) / 0.4);
      const nameSize = Math.round(0.075 * m * L.scale);
      const subSize = Math.round(0.03 * m * L.scale);
      const ctaSize = Math.round(0.04 * m * L.scale);
      drawCard(
        ctx,
        0.86 * easeOut(t / 0.4),
        [
          ...(opts.name.trim() ? [{ text: opts.name.trim(), font: `italic 400 ${nameSize}px "Instrument Serif", serif`, color: "#fbf3e2", gap: nameSize * 1.3 }] : []),
          ...(opts.oab.trim() ? [{ text: opts.oab.trim().toLocaleUpperCase("pt-BR"), font: `700 ${subSize}px "Manrope", sans-serif`, color: look.accent, gap: subSize * 2.6 }] : []),
          ...(opts.cta && scene.cta ? [{ text: scene.cta, font: `800 ${ctaSize}px "Sora", sans-serif`, color: "#ffffff", gap: ctaSize * 2.4 }] : []),
        ],
        opts.name.trim() ? W * 0.26 : 0,
        easeOut((t - 0.2) / 0.4),
      );
      if (fade < 1) {
        ctx.fillStyle = `rgba(0,0,0,${1 - fade})`;
        ctx.fillRect(0, 0, W, H);
      }
    },
  };
}

export type Painter = ReturnType<typeof createPainter>;
