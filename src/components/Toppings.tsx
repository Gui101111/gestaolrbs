import { Strawberry } from "./IceCream";

/** Pequenos elementos ilustrados que flutuam pelo site. */
export function StrawberryIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="-26 -36 52 64" className={className} aria-hidden="true">
      <Strawberry />
    </svg>
  );
}

export function Sprinkle({ className, color = "#F27C93" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 24 8" className={className} aria-hidden="true">
      <rect width="24" height="8" rx="4" fill={color} />
    </svg>
  );
}

export function Blueberry({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <circle cx="20" cy="20" r="18" fill="#3E4FA3" />
      <circle cx="14" cy="13" r="5" fill="#fff" opacity=".25" />
      <path d="M20 9l2 4 4 1-3 3 1 4-4-2-4 2 1-4-3-3 4-1z" fill="#2B3778" />
    </svg>
  );
}

export function Wafer({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 30 110" className={className} aria-hidden="true">
      <rect x="2" width="26" height="110" rx="8" fill="#E9AE62" />
      <path d="M2 25h26M2 50h26M2 75h26" stroke="#B9712F" strokeWidth="4" />
      <rect x="6" y="4" width="6" height="100" rx="3" fill="#fff" opacity=".25" />
    </svg>
  );
}

export function ChocoChunk({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 36" className={className} aria-hidden="true">
      <path d="M6 4 L34 2 L38 28 L10 34 Z" fill="#5B3220" />
      <path d="M6 4 L34 2 L30 10 L10 12 Z" fill="#7A4A32" />
    </svg>
  );
}

export function Cherry({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 56" className={className} aria-hidden="true">
      <path d="M20 22 C22 10 28 4 34 2" stroke="#3B7A3A" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="18" cy="36" r="16" fill="#D7263D" />
      <circle cx="12" cy="30" r="4" fill="#fff" opacity=".45" />
    </svg>
  );
}
