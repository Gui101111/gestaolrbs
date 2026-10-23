export function LogoMark({ className = 'size-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <rect width="64" height="64" rx="16" fill="#173139" />
      <rect x="14" y="30" width="26" height="7" rx="3.5" fill="#eaf2ef" />
      <rect x="14" y="41" width="36" height="9" rx="4.5" fill="#ffd43b" />
      <circle cx="47" cy="17" r="5" fill="#ffd43b" />
    </svg>
  );
}

export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark />
      <span className="font-display text-[22px] font-extrabold tracking-[-0.02em] text-text">Tribuna</span>
    </span>
  );
}
