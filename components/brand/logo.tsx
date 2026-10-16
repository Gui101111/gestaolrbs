import Link from "next/link";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site";

/**
 * Balança em traço neon (ciano → dourado), com um brilho fino.
 * `useId` não é necessário: o gradiente usa userSpaceOnUse e ids estáveis.
 */
export function LogoMark({ className, glow = true }: { className?: string; glow?: boolean }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" aria-hidden className={cn("size-9 overflow-visible", className)}>
      <defs>
        <linearGradient id="tribuna-neon" x1="6" y1="6" x2="34" y2="34" gradientUnits="userSpaceOnUse">
          <stop style={{ stopColor: "var(--cyan)" }} />
          <stop offset="0.5" stopColor="#7FA8FF" />
          <stop offset="1" style={{ stopColor: "var(--gold)" }} />
        </linearGradient>
        <filter id="tribuna-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g stroke="url(#tribuna-neon)" strokeLinecap="round" strokeLinejoin="round" filter={glow ? "url(#tribuna-glow)" : undefined}>
        <path d="M20 8.5v22" strokeWidth="1.6" />
        <path d="M9.5 12.8h21" strokeWidth="1.6" />
        <circle cx="20" cy="8" r="1.4" style={{ fill: "var(--gold)" }} stroke="none" />
        <path d="M10.6 13.2 7.4 21.2M10.6 13.2l3.2 8M29.4 13.2l-3.2 8M29.4 13.2l3.2 8" strokeWidth="1" />
        <path d="M6.6 21.4c.7 2 2.3 3 4 3s3.3-1 4-3M25.4 21.4c.7 2 2.3 3 4 3s3.3-1 4-3" strokeWidth="1.5" />
        <path d="M14.5 31.5h11" strokeWidth="1.6" />
      </g>
    </svg>
  );
}

export function Logo({
  className,
  href = "/",
  compact = false,
}: {
  className?: string;
  href?: string;
  compact?: boolean;
}) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2.5", className)} aria-label={`${siteConfig.name} — início`}>
      <LogoMark className="transition-transform duration-700 ease-[var(--ease-luxe)] group-hover:rotate-[8deg]" />
      {!compact && (
        <span className="font-display text-[1.05rem] leading-none font-bold tracking-[0.32em] text-fg">{siteConfig.name}</span>
      )}
    </Link>
  );
}
