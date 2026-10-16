"use client";

import * as React from "react";

/**
 * Partículas douradas flutuando devagar (canvas 2D, no máximo 40).
 * Pausam fora da tela e com a aba oculta; desligadas com movimento reduzido.
 */
export function GoldDust({ density = 0.00007, className }: { density?: number; className?: string }) {
  const ref = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let raf = 0;
    let visible = true;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    type P = { x: number; y: number; r: number; vx: number; vy: number; a: number; tw: number; ph: number };
    let particles: P[] = [];

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(40, Math.round(w * h * density));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.3 + 0.3,
        vx: (Math.random() - 0.5) * 0.08,
        vy: -(Math.random() * 0.12 + 0.03),
        a: Math.random() * 0.5 + 0.15,
        tw: Math.random() * 0.02 + 0.004,
        ph: Math.random() * Math.PI * 2,
      }));
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -4) {
          p.y = h + 4;
          p.x = Math.random() * w;
        }
        if (p.x < -4) p.x = w + 4;
        if (p.x > w + 4) p.x = -4;
        const alpha = p.a * (0.55 + 0.45 * Math.sin(t * p.tw * 0.06 + p.ph));
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
        g.addColorStop(0, `rgba(247,216,152,${alpha})`);
        g.addColorStop(1, "rgba(242,196,109,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
        ctx.fill();
      }
      if (visible && !document.hidden) raf = requestAnimationFrame(draw);
    };

    resize();
    raf = requestAnimationFrame(draw);
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const restart = () => {
      cancelAnimationFrame(raf);
      if (visible && !document.hidden) raf = requestAnimationFrame(draw);
    };
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      restart();
    });
    io.observe(canvas);
    document.addEventListener("visibilitychange", restart);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", restart);
    };
  }, [density]);

  return <canvas ref={ref} aria-hidden className={className ?? "pointer-events-none absolute inset-0 h-full w-full"} />;
}
