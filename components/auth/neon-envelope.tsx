/**
 * Envelope que abre e mostra a carta, com anel neon girando em volta.
 * Animação só em CSS (classes .envelope-*), parada com prefers-reduced-motion.
 */
export function NeonEnvelope() {
  return (
    <div className="relative mx-auto grid size-32 place-items-center" aria-hidden>
      <span className="absolute inset-2 rounded-full bg-cyan/25 blur-2xl animate-pulse-glow motion-reduce:animate-none" />
      <span className="neon-border glow-cyan absolute inset-0 rounded-full bg-surface/80 [--neon-radius:999px]" />
      <span className="absolute top-3 right-5 size-1.5 rounded-full bg-gold shadow-[0_0_10px_var(--gold)] animate-float-soft motion-reduce:animate-none" />
      <span className="absolute bottom-6 left-4 size-1 rounded-full bg-cyan shadow-[0_0_10px_var(--cyan)] animate-float-soft [animation-delay:1.2s] motion-reduce:animate-none" />
      <svg viewBox="0 0 64 64" className="envelope relative size-20 overflow-visible">
        <defs>
          <linearGradient id="envelope-stroke" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="var(--cyan)" />
            <stop offset="0.55" stopColor="#7fa8ff" />
            <stop offset="1" stopColor="var(--gold)" />
          </linearGradient>
        </defs>
        {/* fundo do envelope */}
        <rect x="8" y="24" width="48" height="30" rx="4" fill="var(--surface)" stroke="url(#envelope-stroke)" strokeWidth="1.6" />
        {/* aba: fechada aponta para baixo; ao abrir, gira para cima */}
        <path className="envelope-flap" d="M8.8 25 L32 42 L55.2 25 Z" fill="var(--raised)" stroke="url(#envelope-stroke)" strokeWidth="1.6" strokeLinejoin="round" />
        {/* carta */}
        <g className="envelope-letter">
          <rect x="15" y="22" width="34" height="26" rx="2.5" fill="#f4f5f7" stroke="#d5d9df" strokeWidth="0.8" />
          <rect x="20" y="28" width="18" height="2.4" rx="1.2" fill="var(--cyan)" />
          <rect x="20" y="33" width="24" height="2" rx="1" fill="#c9ccd2" />
          <rect x="20" y="37.5" width="20" height="2" rx="1" fill="#c9ccd2" />
          <circle cx="42" cy="29.2" r="2.2" fill="var(--gold)" />
        </g>
        {/* bolso da frente, cobre a parte de baixo da carta */}
        <path
          d="M8 25.5 L32 43 L56 25.5 V50 a4 4 0 0 1 -4 4 H12 a4 4 0 0 1 -4 -4 Z"
          fill="var(--surface)"
          stroke="url(#envelope-stroke)"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
