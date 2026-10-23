/**
 * Diogo Automates monogram.
 *
 * D and A locked as a single pair — same cap height, same weight, cut as solid
 * shapes so neither letter outranks the other. Drawn on a 24 grid and checked
 * down to 16px, where lighter or stacked treatments stop being readable.
 */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M1.5 5H6c3.7 0 5.5 2.6 5.5 7s-1.8 7-5.5 7H1.5V5Zm3 3v8H6c1.7 0 2.5-1.4 2.5-4S7.7 8 6 8H4.5Z" />
      <path fillRule="evenodd" d="M15.5 5h3.2L23 19h-3.1l-.8-3h-4l-.8 3h-3.1L15.5 5Zm1.6 3.9-1.3 4.5h2.6l-1.3-4.5Z" />
    </svg>
  );
}

/** Mark in its gradient tile, as it appears in the sidebar and on the home page. */
export function LogoTile({ className = "size-8" }: { className?: string }) {
  return (
    <span
      className={`brand-gradient grid shrink-0 place-items-center rounded-[10px] text-accent-ink shadow-[0_0_22px_-4px_var(--glow)] ${className}`}
    >
      <Logo className="size-[62%]" />
    </span>
  );
}
