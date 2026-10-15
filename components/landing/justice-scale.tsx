"use client";

import * as React from "react";
import { Hand } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Estátua da Justiça interativa.
 *
 * A imagem (quadro do vídeo de referência) é deformada em tempo real por um shader:
 * - os braços inclinam como o travessão de uma balança (cisalhamento vertical);
 * - correntes + pratos sobem/descem rigidamente e balançam como pêndulos;
 * - a luz dourada acompanha o cursor/dedo.
 *
 * Fica totalmente estática até a pessoa mover o dedo/mouse sobre ela.
 * Ao soltar, uma mola pouco amortecida devolve a balança ao equilíbrio.
 */

// Geometria medida no recorte 720x704 do quadro original.
const IMG_W = 720;
const IMG_H = 704;
const CENTER_X = 360;
const CENTER_Y = 330;
const THETA_MAX = 0.13; // ~7.4°

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uSize;
uniform float uTheta;
uniform float uPhi;
uniform vec2 uLight;
uniform float uLightAmt;
uniform float uSheen;
uniform float uReveal;

const float CX = 360.0;
const float UH = 181.0;
const vec2 PIV_L = vec2(179.0, 234.0);
const vec2 PIV_R = vec2(541.0, 206.0);

void main() {
  vec2 p = vec2(vUv.x * uSize.x, (1.0 - vUv.y) * uSize.y);
  float u = p.x - CX;
  float au = abs(u);
  bool isLeft = u < 0.0;
  float floorMask = 1.0 - smoothstep(489.0, 544.0, p.y);

  // Braços: cisalhamento vertical (inverso exato, x não muda)
  float r = smoothstep(50.0, 110.0, au);
  float dyArm = uTheta * clamp(u, -UH, UH) * r;
  vec2 sArm = vec2(p.x, p.y - dyArm * floorMask);

  // Pratos e correntes: translação rígida + rotação pendular em torno do gancho
  float D = (isLeft ? -UH : UH) * uTheta;
  vec2 piv = isLeft ? PIV_L : PIV_R;
  vec2 q = p - piv - vec2(0.0, D);
  float c = cos(-uPhi);
  float s = sin(-uPhi);
  vec2 sRig = piv + vec2(c * q.x - s * q.y, s * q.x + c * q.y);

  float armB = isLeft ? 194.0 + (au - 61.0) * 0.38 : 184.0 + (au - 44.0) * 0.17;
  armB = max(armB, 179.0);
  float wR = smoothstep(armB + 2.0, armB + 22.0, p.y) * smoothstep(80.0, 100.0, au) * floorMask;
  vec2 src = mix(sArm, sRig, wR);

  vec3 col = texture2D(uTex, clamp(src / uSize, vec2(0.0), vec2(1.0))).rgb;

  // Ouro mais vivo
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(lum), col, 1.12);
  float warm = smoothstep(0.015, 0.1, col.r - col.b);
  float gold = smoothstep(0.1, 0.5, lum) * warm;

  // Luz que segue o cursor
  vec3 lightCol = vec3(1.0, 0.85, 0.58);
  float d = length(p - uLight);
  float spot = exp(-d * d / (2.0 * 165.0 * 165.0));
  col += gold * spot * uLightAmt * lightCol * 0.45;

  // Reflexo que atravessa a estátua de tempos em tempos
  float band = dot(p, normalize(vec2(1.0, -0.55))) - uSheen;
  col += exp(-band * band / (2.0 * 24.0 * 24.0)) * gold * lightCol * 0.32;

  // Halo quente atrás da figura
  float hd = length((p - vec2(CX, 300.0)) / vec2(250.0, 300.0));
  col += vec3(0.85, 0.66, 0.36) * exp(-hd * hd * 2.2) * 0.07 * (1.0 - gold);

  // Máscara elíptica suave (integra ao fundo da página, sem cantos)
  float ell = 1.0 - smoothstep(0.74, 1.02, length((vUv - vec2(0.5, 0.5)) / vec2(0.5, 0.53)));
  float ey = smoothstep(0.0, 0.12, 1.0 - vUv.y);
  float edge = ell * ey * uReveal;
  // Chave de luminância: o fundo preto do quadro vira transparência (alfa pré-multiplicado),
  // e apenas o ouro e sua luz permanecem sobre o fundo da página.
  col = max(col - vec3(0.032), vec3(0.0)) * 1.035;
  float a = clamp(max(col.r, max(col.g, col.b)) * 1.7, 0.0, 1.0);
  gl_FragColor = vec4(col * edge, a * edge);
}`;

type Phys = {
  theta: number;
  vTheta: number;
  phi: number;
  vPhi: number;
  target: number;
  interacting: boolean;
  light: [number, number];
  lightTarget: [number, number];
  lightAmt: number;
  lightAmtTarget: number;
  sheen: number;
  sheenStart: number;
  reveal: number;
  tiltX: number;
};

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.warn("[JusticeScale] shader", gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

export function JusticeScale({ className, priority = true }: { className?: string; priority?: boolean }) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const [touched, setTouched] = React.useState(false);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false });
    if (!gl) {
      setFailed(true);
      return;
    }

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    const prog = gl.createProgram();
    if (!vs || !fs || !prog) {
      setFailed(true);
      return;
    }
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      setFailed(true);
      return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const U = {
      size: gl.getUniformLocation(prog, "uSize"),
      theta: gl.getUniformLocation(prog, "uTheta"),
      phi: gl.getUniformLocation(prog, "uPhi"),
      light: gl.getUniformLocation(prog, "uLight"),
      lightAmt: gl.getUniformLocation(prog, "uLightAmt"),
      sheen: gl.getUniformLocation(prog, "uSheen"),
      reveal: gl.getUniformLocation(prog, "uReveal"),
      tex: gl.getUniformLocation(prog, "uTex"),
    };
    gl.uniform2f(U.size, IMG_W, IMG_H);
    gl.uniform1i(U.tex, 0);
    gl.clearColor(0, 0, 0, 0);

    const S: Phys = {
      theta: 0,
      vTheta: 0,
      phi: 0,
      vPhi: 0,
      target: 0,
      interacting: false,
      light: [CENTER_X - 120, 160],
      lightTarget: [CENTER_X - 120, 160],
      lightAmt: 0.35,
      lightAmtTarget: 0.35,
      sheen: -2000,
      sheenStart: -1,
      reveal: 0,
      tiltX: 0,
    };

    let raf = 0;
    let revealStart = -1;
    let running = false;
    let last = 0;
    let texReady = false;
    let visible = true;
    let disposed = false;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
      draw();
    };

    const draw = () => {
      if (!texReady) return;
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(U.theta, S.theta);
      gl.uniform1f(U.phi, S.phi);
      gl.uniform2f(U.light, S.light[0], S.light[1]);
      gl.uniform1f(U.lightAmt, S.lightAmt);
      gl.uniform1f(U.sheen, S.sheen);
      gl.uniform1f(U.reveal, S.reveal);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      wrap.style.setProperty("--tilt", `${S.tiltX.toFixed(3)}deg`);
    };

    const step = (dt: number, now: number) => {
      // Mola do travessão: mais firme durante o toque, pouco amortecida ao soltar (oscila até equilibrar)
      const k = S.interacting ? 70 : 36;
      const c = S.interacting ? 13 : reduce ? 12 : 2.6;
      const acc = k * (S.target - S.theta) - c * S.vTheta;
      S.vTheta += acc * dt;
      S.theta += S.vTheta * dt;
      S.theta = Math.max(-THETA_MAX * 1.25, Math.min(THETA_MAX * 1.25, S.theta));

      // Pêndulo dos pratos, excitado pela aceleração do travessão
      const accPhi = -32 * S.phi - 3.2 * S.vPhi - acc * 0.0065;
      S.vPhi += accPhi * dt;
      S.phi += S.vPhi * dt;
      S.phi = Math.max(-0.07, Math.min(0.07, S.phi));

      // Luz
      const lf = 1 - Math.exp(-dt * 6);
      S.light[0] += (S.lightTarget[0] - S.light[0]) * lf;
      S.light[1] += (S.lightTarget[1] - S.light[1]) * lf;
      S.lightAmt += (S.lightAmtTarget - S.lightAmt) * (1 - Math.exp(-dt * 3));

      // Leve rotação 3D acompanhando a inclinação
      S.tiltX += (S.theta * 22 - S.tiltX) * (1 - Math.exp(-dt * 5));

      // Revelação inicial (baseada no tempo, independente do FPS)
      if (S.reveal < 1) S.reveal = revealStart < 0 ? 0 : Math.min(1, Math.max(0, (now - revealStart) / 1400));

      // Reflexo
      if (S.sheenStart >= 0) {
        const t = (now - S.sheenStart) / 1900;
        if (t >= 1) {
          S.sheenStart = -1;
          S.sheen = -2000;
        } else {
          const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
          S.sheen = -250 + e * 1250;
        }
      }
    };

    const settled = () =>
      !S.interacting &&
      Math.abs(S.theta - S.target) < 0.0004 &&
      Math.abs(S.vTheta) < 0.0008 &&
      Math.abs(S.phi) < 0.0004 &&
      Math.abs(S.vPhi) < 0.0008 &&
      Math.abs(S.lightAmt - S.lightAmtTarget) < 0.005 &&
      Math.abs(S.light[0] - S.lightTarget[0]) < 0.5 &&
      Math.abs(S.light[1] - S.lightTarget[1]) < 0.5 &&
      Math.abs(S.tiltX - S.theta * 22) < 0.01 &&
      S.sheenStart < 0 &&
      S.reveal >= 1;

    const loop = (now: number) => {
      if (disposed) return;
      const dt = Math.min(0.033, (now - last) / 1000 || 0.016);
      last = now;
      // sub-passos para estabilidade da mola
      step(dt / 2, now);
      step(dt / 2, now);
      draw();
      if (settled() || !visible) {
        if (settled()) {
          S.theta = S.target;
          S.vTheta = 0;
          S.phi = 0;
          S.vPhi = 0;
          draw();
        }
        running = false;
        return;
      }
      raf = requestAnimationFrame(loop);
    };

    const kick = () => {
      if (running || disposed || !texReady) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };

    // ----- Interação -----
    const toLocal = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((clientX - rect.left) / rect.width) * IMG_W,
        y: ((clientY - rect.top) / rect.height) * IMG_H,
        nx: (clientX - (rect.left + rect.width / 2)) / (rect.width * 0.42),
      };
    };

    let activePointer: number | null = null;
    let markTouched = false;

    const apply = (clientX: number, clientY: number) => {
      const { x, y, nx } = toLocal(clientX, clientY);
      S.interacting = true;
      S.target = Math.max(-1, Math.min(1, nx)) * THETA_MAX;
      S.lightTarget = [Math.max(-80, Math.min(IMG_W + 80, x)), Math.max(-60, Math.min(IMG_H, y))];
      S.lightAmtTarget = 1;
      if (!markTouched) {
        markTouched = true;
        setTouched(true);
      }
      kick();
    };

    const release = () => {
      S.interacting = false;
      S.target = 0;
      S.lightAmtTarget = 0.35;
      S.lightTarget = [CENTER_X - 120, 160];
      activePointer = null;
      kick();
    };

    // Mouse: reage ao passar sobre a área da estátua (zona estendida)
    const onWindowMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const rect = wrap.getBoundingClientRect();
      const padX = rect.width * 0.25;
      const inside =
        e.clientX > rect.left - padX &&
        e.clientX < rect.right + padX &&
        e.clientY > rect.top - 40 &&
        e.clientY < rect.bottom + 20;
      if (inside) apply(e.clientX, e.clientY);
      else if (S.interacting && activePointer === null) release();
    };

    // Toque / caneta: arrastar o dedo sobre a estátua
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse") return;
      activePointer = e.pointerId;
      apply(e.clientX, e.clientY);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "mouse" || activePointer !== e.pointerId) return;
      apply(e.clientX, e.clientY);
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerType === "mouse" || activePointer !== e.pointerId) return;
      release();
    };

    window.addEventListener("pointermove", onWindowMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", release);
    canvas.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);

    // ----- Textura -----
    const img = new Image();
    img.decoding = "async";
    const dpr = window.devicePixelRatio || 1;
    img.src = dpr > 1.2 || window.innerWidth > 900 ? "/media/justica-2x.webp" : "/media/justica-1x.webp";
    img.onload = () => {
      if (disposed) return;
      const tex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
      texReady = true;
      resize();
      setReady(true);
      if (reduce) {
        S.reveal = 1;
        draw();
      } else {
        revealStart = performance.now();
        S.sheenStart = performance.now() + 500;
        kick();
      }
    };
    img.onerror = () => setFailed(true);

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) kick();
    });
    io.observe(canvas);

    // Reflexo dourado ocasional (não move a estátua)
    let sheenTimer = 0;
    if (!reduce) {
      sheenTimer = window.setInterval(() => {
        if (!visible || S.interacting || document.hidden) return;
        S.sheenStart = performance.now();
        kick();
      }, 9000);
    }

    const onLost = (e: Event) => {
      e.preventDefault();
      setFailed(true);
    };
    canvas.addEventListener("webglcontextlost", onLost);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.clearInterval(sheenTimer);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onWindowMove);
      document.documentElement.removeEventListener("pointerleave", release);
      canvas.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("webglcontextlost", onLost);
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className={cn("relative select-none [perspective:1400px]", className)}
      style={{ ["--tilt" as string]: "0deg" }}
    >
      {/* Halo e luz de estúdio atrás da estátua */}
      <div aria-hidden className="pointer-events-none absolute inset-[-12%] -z-10">
        <div className="absolute left-1/2 top-[38%] h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(214,158,78,0.22),rgba(170,110,40,0.07)_55%,transparent)] blur-2xl animate-pulse-glow" />
        <div className="absolute left-1/2 bottom-[6%] h-[14%] w-[62%] -translate-x-1/2 rounded-[100%] bg-[radial-gradient(closest-side,rgba(225,196,135,0.22),transparent)] blur-xl" />
      </div>

      <div
        className="relative aspect-[720/704] w-full transition-transform duration-300 ease-out will-change-transform"
        style={{ transform: "rotateY(var(--tilt)) translateZ(0)" }}
      >
        {/* Imagem estática: aparece antes do WebGL e como fallback */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/media/justica-alpha.webp"
          alt="Estátua dourada da Justiça segurando a balança"
          width={1440}
          height={1408}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          className={cn(
            "absolute inset-0 h-full w-full object-contain transition-opacity duration-700",
            ready && !failed ? "opacity-0" : "opacity-100",
          )}
        />
        <canvas
          ref={canvasRef}
          aria-hidden
          className={cn(
            "absolute inset-0 h-full w-full touch-pan-y transition-opacity duration-1000",
            failed ? "hidden" : ready ? "opacity-100" : "opacity-0",
          )}
        />
      </div>

      {/* Dica de interação */}
      <div
        className={cn(
          "pointer-events-none absolute bottom-[3%] left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-gold/25 bg-ink/70 px-3.5 py-1.5 text-[0.6875rem] font-medium uppercase tracking-[0.2em] text-gold-light/90 backdrop-blur transition-all duration-700",
          touched || failed || !ready ? "translate-y-2 opacity-0" : "opacity-100",
        )}
      >
        <Hand className="size-3.5 animate-[float_2.6s_ease-in-out_infinite]" />
        <span className="hidden md:inline">Mova o cursor para equilibrar</span>
        <span className="md:hidden">Deslize para equilibrar</span>
      </div>
    </div>
  );
}
