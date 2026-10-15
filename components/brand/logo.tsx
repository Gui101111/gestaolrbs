import Link from "next/link";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site";

/** Monograma: balança estilizada dentro de um anel fino dourado. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" aria-hidden className={cn("size-9", className)}>
      <defs>
        <linearGradient id="tribuna-gold" x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8C6B2F" />
          <stop offset="0.45" stopColor="#F1D9A3" />
          <stop offset="0.7" stopColor="#C6A15B" />
          <stop offset="1" stopColor="#8C6B2F" />
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r="18.5" stroke="url(#tribuna-gold)" strokeOpacity="0.55" />
      <path d="M20 9.5v20.5" stroke="url(#tribuna-gold)" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M10.5 13.2h19" stroke="url(#tribuna-gold)" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="20" cy="9.2" r="1.3" fill="url(#tribuna-gold)" />
      <path d="M11.2 13.6 8.4 21h5.6l-2.8-7.4ZM28.8 13.6 26 21h5.6l-2.8-7.4Z" stroke="url(#tribuna-gold)" strokeWidth="0.9" strokeLinejoin="round" />
      <path d="M7.8 21.2c.6 1.7 2 2.6 3.4 2.6s2.8-.9 3.4-2.6M25.4 21.2c.6 1.7 2 2.6 3.4 2.6s2.8-.9 3.4-2.6" stroke="url(#tribuna-gold)" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M15.5 30.5h9" stroke="url(#tribuna-gold)" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className, href = "/", compact = false }: { className?: string; href?: string; compact?: boolean }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-3", className)} aria-label={`${siteConfig.name} — início`}>
      <LogoMark className="transition-transform duration-700 ease-[var(--ease-luxe)] group-hover:rotate-[8deg]" />
      {!compact && (
        <span className="font-display text-[1.35rem] font-semibold leading-none tracking-[0.28em] text-ivory">
          {siteConfig.name}
        </span>
      )}
    </Link>
  );
}
