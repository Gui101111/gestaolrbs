/**
 * Personagem ilustrado (advogada ou advogado fictício) desenhado no canvas,
 * com respiração, piscadas, cabeça que acompanha a fala e boca sincronizada
 * com as palavras. Serve de "gravação" para os vídeos de exemplo.
 */

export interface Persona {
  skin: string;
  skinShade: string;
  hair: string;
  hairStyle: "longo" | "curto";
  suit: string;
  shirt: string;
  tie: string | null;
  glasses: boolean;
  /** Parede do escritório (alto e baixo). */
  wall: [string, string];
}

export const HELENA: Persona = {
  skin: "#e9b896",
  skinShade: "#cf9873",
  hair: "#2a1a14",
  hairStyle: "longo",
  suit: "#1f2d4a",
  shirt: "#f4efe6",
  tie: null,
  glasses: false,
  wall: ["#2a2f3d", "#12151c"],
};

export const RAFAEL: Persona = {
  skin: "#b98262",
  skinShade: "#9c6a4c",
  hair: "#18120f",
  hairStyle: "curto",
  suit: "#2b2f36",
  shirt: "#eef2f7",
  tie: "#7a2434",
  glasses: true,
  wall: ["#2c2a26", "#141210"],
};

const TAU = Math.PI * 2;

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Escritório desfocado ao fundo (desenhado uma vez). */
function office(W: number, H: number, p: Persona): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const wall = g.createLinearGradient(0, 0, 0, H);
  wall.addColorStop(0, p.wall[0]);
  wall.addColorStop(1, p.wall[1]);
  g.fillStyle = wall;
  g.fillRect(0, 0, W, H);
  // janela com luz quente à esquerda
  const win = g.createRadialGradient(W * 0.08, H * 0.22, 0, W * 0.08, H * 0.22, W * 0.9);
  win.addColorStop(0, "rgba(255,196,130,0.42)");
  win.addColorStop(1, "rgba(255,196,130,0)");
  g.fillStyle = win;
  g.fillRect(0, 0, W, H);
  g.filter = "blur(7px)";
  // estante à direita
  const rnd = seeded(7);
  const colors = ["#6b4f3a", "#2f4858", "#8a6d3b", "#4a3b5c", "#7a2e2e", "#3d5a40", "#a08050"];
  const x0 = W * 0.6;
  g.fillStyle = "#3a2c22";
  for (const y of [H * 0.16, H * 0.33, H * 0.5]) g.fillRect(x0 - 10, y, W - x0 + 20, 12);
  for (const y of [H * 0.16, H * 0.33, H * 0.5]) {
    let x = x0;
    while (x < W) {
      const w = 14 + rnd() * 16;
      const h = 70 + rnd() * 60;
      g.fillStyle = colors[Math.floor(rnd() * colors.length)];
      g.globalAlpha = 0.75;
      g.fillRect(x, y - h, w - 3, h);
      x += w;
    }
  }
  g.globalAlpha = 1;
  // quadro (diploma) à esquerda
  g.strokeStyle = "#b8924a";
  g.lineWidth = 8;
  g.strokeRect(W * 0.08, H * 0.12, W * 0.2, W * 0.15);
  g.fillStyle = "rgba(240,230,210,0.35)";
  g.fillRect(W * 0.08 + 6, H * 0.12 + 6, W * 0.2 - 12, W * 0.15 - 12);
  // planta
  g.fillStyle = "#2f4a35";
  for (let i = 0; i < 9; i++) {
    g.beginPath();
    g.ellipse(W * 0.12 + Math.cos(i) * 40, H * 0.47 - i * 18, 18, 46, -0.6 + i * 0.15, 0, TAU);
    g.fill();
  }
  g.filter = "none";
  // vinheta suave
  const v = g.createRadialGradient(W / 2, H * 0.45, W * 0.3, W / 2, H * 0.45, H * 0.8);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,0.55)");
  g.fillStyle = v;
  g.fillRect(0, 0, W, H);
  return c;
}

export interface Talk {
  /** Intervalos das palavras "faladas" (s). */
  words: { start: number; end: number }[];
  /** Instantes de ênfase (sobrancelhas sobem, cabeça acena). */
  emphasis: number[];
}

/** Abertura da boca (0 a 1) no instante t. */
function mouthAt(t: number, talk: Talk) {
  for (const w of talk.words) {
    if (t >= w.start - 0.03 && t < w.end) {
      const u = (t - w.start) / Math.max(0.08, w.end - w.start);
      const syl = Math.max(1, Math.round((w.end - w.start) / 0.16));
      return 0.25 + 0.75 * Math.abs(Math.sin(u * Math.PI * syl));
    }
  }
  return 0;
}

export function createPersonaPainter(W: number, H: number, p: Persona, talk: Talk) {
  const bg = office(W, H, p);
  const blinks = [1.6, 4.4, 6.9, 9.2, 11.8];
  let mouth = 0;

  return function draw(ctx: CanvasRenderingContext2D, t: number) {
    ctx.drawImage(bg, 0, 0);
    const cx = W / 2;
    const breathe = Math.sin(t * 1.7) * 0.008;
    mouth += (mouthAt(t, talk) - mouth) * 0.55;
    const talking = talk.words.some((w) => t >= w.start && t < w.end + 0.2);
    const emph = talk.emphasis.reduce((acc, e) => Math.max(acc, t >= e && t < e + 0.7 ? Math.sin(((t - e) / 0.7) * Math.PI) : 0), 0);
    const tilt = Math.sin(t * 1.1) * 0.03 + (talking ? Math.sin(t * 4.3) * 0.012 : 0);
    const nod = emph * 10 + (talking ? Math.sin(t * 6.1) * 2.5 : 0);

    // corpo
    ctx.save();
    ctx.translate(cx, H);
    ctx.scale(1 + breathe * 0.5, 1 + breathe);
    ctx.translate(-cx, -H);
    const shoulderY = H * 0.53;
    const neckW = W * 0.075;
    // pescoço
    ctx.fillStyle = p.skinShade;
    ctx.fillRect(cx - neckW, H * 0.43, neckW * 2, H * 0.12);
    // paletó
    const suit = ctx.createLinearGradient(cx - W * 0.45, 0, cx + W * 0.45, 0);
    suit.addColorStop(0, shade(p.suit, 1.18));
    suit.addColorStop(0.5, p.suit);
    suit.addColorStop(1, shade(p.suit, 0.78));
    ctx.fillStyle = suit;
    ctx.beginPath();
    ctx.moveTo(cx - W * 0.5, H);
    ctx.lineTo(cx - W * 0.47, shoulderY + H * 0.08);
    ctx.quadraticCurveTo(cx - W * 0.44, shoulderY - H * 0.005, cx - W * 0.3, shoulderY - H * 0.012);
    ctx.lineTo(cx - neckW * 1.15, shoulderY - H * 0.03);
    ctx.lineTo(cx + neckW * 1.15, shoulderY - H * 0.03);
    ctx.lineTo(cx + W * 0.3, shoulderY - H * 0.012);
    ctx.quadraticCurveTo(cx + W * 0.44, shoulderY - H * 0.005, cx + W * 0.47, shoulderY + H * 0.08);
    ctx.lineTo(cx + W * 0.5, H);
    ctx.closePath();
    ctx.fill();
    // camisa em V
    ctx.fillStyle = p.shirt;
    ctx.beginPath();
    ctx.moveTo(cx - neckW * 1.15, shoulderY - H * 0.03);
    ctx.lineTo(cx + neckW * 1.15, shoulderY - H * 0.03);
    ctx.lineTo(cx, shoulderY + H * 0.2);
    ctx.closePath();
    ctx.fill();
    // gola da camisa
    ctx.fillStyle = shade(p.shirt, 0.9);
    ctx.beginPath();
    ctx.moveTo(cx - neckW * 1.05, shoulderY - H * 0.032);
    ctx.lineTo(cx, shoulderY + H * 0.025);
    ctx.lineTo(cx - neckW * 0.2, shoulderY + H * 0.045);
    ctx.lineTo(cx - neckW * 1.25, shoulderY - H * 0.005);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + neckW * 1.05, shoulderY - H * 0.032);
    ctx.lineTo(cx, shoulderY + H * 0.025);
    ctx.lineTo(cx + neckW * 0.2, shoulderY + H * 0.045);
    ctx.lineTo(cx + neckW * 1.25, shoulderY - H * 0.005);
    ctx.closePath();
    ctx.fill();
    if (p.tie) {
      ctx.fillStyle = p.tie;
      ctx.beginPath();
      ctx.moveTo(cx - neckW * 0.32, shoulderY + H * 0.012);
      ctx.lineTo(cx + neckW * 0.32, shoulderY + H * 0.012);
      ctx.lineTo(cx + neckW * 0.22, shoulderY + H * 0.04);
      ctx.lineTo(cx + neckW * 0.42, shoulderY + H * 0.2);
      ctx.lineTo(cx, shoulderY + H * 0.24);
      ctx.lineTo(cx - neckW * 0.42, shoulderY + H * 0.2);
      ctx.lineTo(cx - neckW * 0.22, shoulderY + H * 0.04);
      ctx.closePath();
      ctx.fill();
    } else {
      // colar dourado
      ctx.strokeStyle = "#d9b45a";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, shoulderY - H * 0.05, neckW * 1.05, 0.25 * Math.PI, 0.75 * Math.PI);
      ctx.stroke();
      ctx.fillStyle = "#e8c66e";
      ctx.beginPath();
      ctx.arc(cx, shoulderY - H * 0.05 + neckW * 1.05 + 5, 7, 0, TAU);
      ctx.fill();
    }
    // lapelas
    ctx.fillStyle = shade(p.suit, 0.72);
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + s * neckW * 1.15, shoulderY - H * 0.03);
      ctx.lineTo(cx + s * W * 0.2, shoulderY + H * 0.02);
      ctx.lineTo(cx + s * W * 0.12, shoulderY + H * 0.08);
      ctx.lineTo(cx + s * W * 0.16, shoulderY + H * 0.1);
      ctx.lineTo(cx + s * neckW * 0.15, shoulderY + H * 0.24);
      ctx.closePath();
      ctx.fill();
    }
    // botão
    ctx.fillStyle = shade(p.suit, 0.6);
    ctx.beginPath();
    ctx.arc(cx, H * 0.86, 7, 0, TAU);
    ctx.fill();
    ctx.restore();

    // cabeça
    const headY = H * 0.36;
    const rx = W * 0.15;
    const ry = W * 0.185;
    ctx.save();
    ctx.translate(cx, headY + nod + Math.sin(t * 1.7) * 2);
    ctx.rotate(tilt);
    // cabelo de trás
    ctx.fillStyle = p.hair;
    if (p.hairStyle === "longo") {
      ctx.beginPath();
      ctx.moveTo(-rx * 1.12, -ry * 0.2);
      ctx.quadraticCurveTo(-rx * 1.45, ry * 1.2, -rx * 1.05, ry * 1.65);
      ctx.lineTo(rx * 1.05, ry * 1.65);
      ctx.quadraticCurveTo(rx * 1.45, ry * 1.2, rx * 1.12, -ry * 0.2);
      ctx.closePath();
      ctx.fill();
    }
    // orelhas
    ctx.fillStyle = p.skinShade;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(s * rx * 0.98, ry * 0.08, rx * 0.16, ry * 0.2, 0, 0, TAU);
      ctx.fill();
    }
    // rosto
    const face = ctx.createRadialGradient(-rx * 0.3, -ry * 0.25, rx * 0.2, 0, 0, ry * 1.1);
    face.addColorStop(0, shade(p.skin, 1.06));
    face.addColorStop(1, p.skinShade);
    ctx.fillStyle = face;
    ctx.beginPath();
    ctx.moveTo(0, -ry);
    ctx.bezierCurveTo(rx * 0.85, -ry, rx * 1.02, -ry * 0.45, rx, ry * 0.05);
    ctx.bezierCurveTo(rx * 0.98, ry * 0.6, rx * 0.55, ry * 0.98, 0, ry);
    ctx.bezierCurveTo(-rx * 0.55, ry * 0.98, -rx * 0.98, ry * 0.6, -rx, ry * 0.05);
    ctx.bezierCurveTo(-rx * 1.02, -ry * 0.45, -rx * 0.85, -ry, 0, -ry);
    ctx.fill();
    // bochechas
    for (const s of [-1, 1]) {
      const b = ctx.createRadialGradient(s * rx * 0.55, ry * 0.32, 0, s * rx * 0.55, ry * 0.32, rx * 0.3);
      b.addColorStop(0, "rgba(230,110,110,0.28)");
      b.addColorStop(1, "rgba(230,110,110,0)");
      ctx.fillStyle = b;
      ctx.fillRect(s * rx * 0.55 - rx * 0.3, ry * 0.02, rx * 0.6, rx * 0.6);
    }
    // cabelo da frente
    ctx.fillStyle = p.hair;
    ctx.beginPath();
    if (p.hairStyle === "longo") {
      ctx.moveTo(-rx * 1.1, ry * 0.25);
      ctx.bezierCurveTo(-rx * 1.25, -ry * 0.9, -rx * 0.3, -ry * 1.3, rx * 0.35, -ry * 1.08);
      ctx.bezierCurveTo(rx * 1.05, -ry * 0.92, rx * 1.25, -ry * 0.25, rx * 1.1, ry * 0.3);
      ctx.bezierCurveTo(rx * 0.95, -ry * 0.2, rx * 0.55, -ry * 0.55, -rx * 0.15, -ry * 0.62);
      ctx.bezierCurveTo(-rx * 0.6, -ry * 0.45, -rx * 0.95, -ry * 0.1, -rx * 1.1, ry * 0.25);
    } else {
      ctx.moveTo(-rx * 1.04, -ry * 0.05);
      ctx.bezierCurveTo(-rx * 1.15, -ry * 1.05, rx * 0.2, -ry * 1.35, rx * 0.9, -ry * 0.85);
      ctx.bezierCurveTo(rx * 1.12, -ry * 0.6, rx * 1.08, -ry * 0.25, rx * 1.03, -ry * 0.05);
      ctx.bezierCurveTo(rx * 0.95, -ry * 0.5, rx * 0.4, -ry * 0.68, -rx * 0.2, -ry * 0.62);
      ctx.bezierCurveTo(-rx * 0.75, -ry * 0.55, -rx * 0.95, -ry * 0.3, -rx * 1.04, -ry * 0.05);
    }
    ctx.closePath();
    ctx.fill();
    // sobrancelhas
    const brow = -ry * 0.3 - emph * ry * 0.06;
    ctx.strokeStyle = p.hair;
    ctx.lineCap = "round";
    ctx.lineWidth = rx * 0.07;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * rx * 0.18, brow + ry * 0.02);
      ctx.quadraticCurveTo(s * rx * 0.4, brow - ry * 0.06, s * rx * 0.6, brow + ry * 0.01);
      ctx.stroke();
    }
    // olhos
    const blink = blinks.some((b) => t >= b && t < b + 0.14) ? 0.12 : 1;
    for (const s of [-1, 1]) {
      ctx.fillStyle = "#1c1412";
      ctx.beginPath();
      ctx.ellipse(s * rx * 0.39, -ry * 0.08, rx * 0.085, rx * 0.1 * blink, 0, 0, TAU);
      ctx.fill();
      if (blink > 0.5) {
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.beginPath();
        ctx.arc(s * rx * 0.39 + rx * 0.03, -ry * 0.11, rx * 0.025, 0, TAU);
        ctx.fill();
      }
    }
    if (p.glasses) {
      ctx.strokeStyle = "#141414";
      ctx.lineWidth = rx * 0.035;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.roundRect(s * rx * 0.39 - rx * 0.24, -ry * 0.21, rx * 0.48, ry * 0.25, rx * 0.1);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(-rx * 0.15, -ry * 0.12);
      ctx.lineTo(rx * 0.15, -ry * 0.12);
      ctx.stroke();
    }
    // nariz
    ctx.strokeStyle = shade(p.skinShade, 0.85);
    ctx.lineWidth = rx * 0.04;
    ctx.beginPath();
    ctx.moveTo(-rx * 0.02, ry * 0.05);
    ctx.quadraticCurveTo(rx * 0.1, ry * 0.25, -rx * 0.08, ry * 0.3);
    ctx.stroke();
    // boca
    const my = ry * 0.55;
    const mw = rx * 0.34;
    if (mouth > 0.08) {
      const open = ry * 0.16 * mouth;
      ctx.fillStyle = "#5a1e1e";
      ctx.beginPath();
      ctx.moveTo(-mw, my);
      ctx.quadraticCurveTo(0, my - open * 0.35, mw, my);
      ctx.quadraticCurveTo(0, my + open * 1.6, -mw, my);
      ctx.fill();
      ctx.fillStyle = "#f6f1ea";
      ctx.beginPath();
      ctx.moveTo(-mw * 0.75, my - open * 0.05);
      ctx.quadraticCurveTo(0, my - open * 0.3, mw * 0.75, my - open * 0.05);
      ctx.lineTo(mw * 0.6, my + open * 0.18);
      ctx.quadraticCurveTo(0, my + open * 0.05, -mw * 0.6, my + open * 0.18);
      ctx.fill();
    } else {
      ctx.strokeStyle = "#8a3b3b";
      ctx.lineWidth = rx * 0.05;
      ctx.beginPath();
      ctx.moveTo(-mw, my);
      ctx.quadraticCurveTo(0, my + ry * 0.12, mw, my);
      ctx.stroke();
    }
    ctx.restore();

    // luz da janela no contorno
    const rim = ctx.createLinearGradient(0, 0, W, 0);
    rim.addColorStop(0, "rgba(255,190,120,0.12)");
    rim.addColorStop(0.5, "rgba(255,190,120,0)");
    ctx.fillStyle = rim;
    ctx.fillRect(0, 0, W, H);
  };
}

function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${c((n >> 16) & 255)},${c((n >> 8) & 255)},${c(n & 255)})`;
}
