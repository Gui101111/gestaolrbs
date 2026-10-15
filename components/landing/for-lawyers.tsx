"use client";

import * as React from "react";
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "motion/react";
import { BadgeCheck, Building2, FileLock2, Gavel } from "lucide-react";
import { SectionHeading } from "@/components/landing/section-heading";
import { Stagger, StaggerItem } from "@/components/animations/reveal";
import { CountUp } from "@/components/animations/count-up";
import { siteConfig } from "@/config/site";

const PILLARS = [
  {
    icon: Gavel,
    title: "Pensado para o Provimento 205/2021",
    text: "Estilos sóbrios por padrão e revisão que sinaliza falas com promessa de resultado ou captação indevida.",
  },
  {
    icon: FileLock2,
    title: "Sigilo e LGPD",
    text: "Arquivos privados, acesso somente por links temporários e exclusão definitiva a qualquer momento.",
  },
  {
    icon: Building2,
    title: "Identidade do seu escritório",
    text: "Logo, cores, tipografia, nome profissional e OAB aplicados de forma consistente em cada vídeo.",
  },
  {
    icon: BadgeCheck,
    title: "Linguagem jurídica precisa",
    text: "Edição contextualizada por área do Direito, com destaque correto de termos, prazos e dispositivos legais.",
  },
];

const PHRASES = ["Imparcialidade.", "Precisão.", "Autoridade."];

export function ForLawyers() {
  return (
    <section id="para-advogados" className="relative">
      <Approach />
      <div className="relative overflow-hidden bg-navy py-28 md:py-36">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(22,38,61,0.9),transparent_70%)]" />
          <div className="absolute inset-x-0 top-0 hairline" />
          <Columns />
        </div>
        <div className="relative mx-auto max-w-7xl px-6 md:px-10">
          <SectionHeading
            eyebrow="Para advogados"
            title="Feito para a advocacia,"
            highlight="não adaptado a ela."
            description="Uma ferramenta de criação e edição. O conteúdo, a ética e a responsabilidade profissional continuam com você — nós cuidamos do acabamento."
          />
          <Stagger className="mt-16 grid gap-5 md:grid-cols-2" stagger={0.1}>
            {PILLARS.map((p) => (
              <StaggerItem key={p.title}>
                <div className="group flex h-full gap-5 rounded-2xl border border-white/[0.07] bg-ink/40 p-7 backdrop-blur transition-all duration-700 hover:border-gold/30 hover:bg-ink/60">
                  <span className="grid size-12 shrink-0 place-items-center rounded-full border border-gold/30 text-gold transition-all duration-700 group-hover:bg-gold group-hover:text-ink">
                    <p.icon className="size-5" />
                  </span>
                  <div>
                    <h3 className="font-display text-2xl text-ivory">{p.title}</h3>
                    <p className="mt-2 text-[0.9375rem] leading-relaxed text-mist">{p.text}</p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </Stagger>

          <div className="mt-20 grid grid-cols-2 gap-y-10 border-t border-white/[0.08] pt-12 md:grid-cols-4">
            {siteConfig.highlights.map((h) => (
              <div key={h.label} className="px-2">
                <div className="font-display text-5xl text-ivory md:text-6xl">
                  <CountUp value={h.value} suffix={h.suffix} />
                </div>
                <p className="mt-2 text-sm text-gold-light">{h.label}</p>
                <p className="text-xs text-mist">{h.caption}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/** A câmera se aproxima da Justiça conforme a rolagem (vídeo controlado pelo scroll). */
function Approach() {
  const ref = React.useRef<HTMLDivElement>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const reduce = useReducedMotion();
  const [src, setSrc] = React.useState<string | null>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const overlay = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [0.7, 0.35, 0.35, 0.8]);
  const [phrase, setPhrase] = React.useState(-1);

  // Carrega o vídeo só quando a seção se aproxima da tela
  React.useEffect(() => {
    const el = ref.current;
    if (!el || reduce) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSrc(window.innerWidth < 768 ? "/media/aproximacao-sd.mp4" : "/media/aproximacao.mp4");
          io.disconnect();
        }
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduce]);

  const target = React.useRef(0);
  const current = React.useRef(0);
  const raf = React.useRef(0);

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    setPhrase(p < 0.12 ? -1 : p < 0.42 ? 0 : p < 0.7 ? 1 : 2);
    const v = videoRef.current;
    if (!v || !v.duration) return;
    target.current = Math.min(v.duration - 0.05, Math.max(0, p * v.duration));
    if (!raf.current) {
      const tick = () => {
        const vid = videoRef.current;
        if (!vid) return;
        current.current += (target.current - current.current) * 0.18;
        if (Math.abs(vid.currentTime - current.current) > 0.01) vid.currentTime = current.current;
        if (Math.abs(target.current - current.current) > 0.005) raf.current = requestAnimationFrame(tick);
        else raf.current = 0;
      };
      raf.current = requestAnimationFrame(tick);
    }
  });

  React.useEffect(() => () => cancelAnimationFrame(raf.current), []);

  return (
    <div ref={ref} className="relative h-[210vh] bg-ink">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        {reduce || !src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/media/justica-rosto.webp" alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <video
            ref={videoRef}
            src={src}
            muted
            playsInline
            preload="auto"
            poster="/media/justica-busto.webp"
            className="absolute inset-0 h-full w-full object-cover"
            aria-hidden
          />
        )}
        <motion.div className="absolute inset-0 bg-ink" style={{ opacity: overlay }} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(7,9,12,0.9)_100%)]" />
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-ink to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-navy to-transparent" />
        <div className="relative flex h-full flex-col items-center justify-end pb-[16vh] text-center">
          <p className="eyebrow mb-6">O que guia cada edição</p>
          <div className="relative h-[1.2em] w-full font-display text-6xl text-ivory md:text-8xl">
            {PHRASES.map((p, i) => (
              <motion.span
                key={p}
                className="absolute inset-0 italic"
                initial={false}
                animate={
                  phrase === i
                    ? { opacity: 1, y: "0%", filter: "blur(0px)" }
                    : { opacity: 0, y: phrase > i ? "-30%" : "30%", filter: "blur(10px)" }
                }
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              >
                <span className={i === 2 ? "text-gold-gradient text-glow" : ""}>{p}</span>
              </motion.span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Colunas clássicas em traço fino — referência discreta à arquitetura dos tribunais. */
function Columns() {
  return (
    <svg className="absolute right-0 bottom-0 h-[70%] w-auto opacity-[0.07]" viewBox="0 0 400 500" fill="none" aria-hidden>
      <path d="M20 60h360M40 40h320l-20-20H60z" stroke="#C6A15B" />
      {[60, 140, 220, 300].map((x) => (
        <g key={x} stroke="#C6A15B">
          <path d={`M${x} 70h40v400h-40z`} />
          {[8, 16, 24, 32].map((o) => (
            <path key={o} d={`M${x + o} 75v390`} strokeOpacity="0.6" />
          ))}
        </g>
      ))}
      <path d="M20 480h360M10 495h380" stroke="#C6A15B" />
    </svg>
  );
}
