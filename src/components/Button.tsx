import { cn } from "@/lib/utils";

type Variant = "primary" | "white" | "outline" | "outline-light" | "whatsapp";

const styles: Record<Variant, string> = {
  primary: "bg-berry-deep text-white hover:bg-navy shadow-soft",
  white: "bg-white text-navy hover:bg-mist shadow-soft",
  outline: "border border-navy/20 text-navy hover:border-navy/40 hover:bg-white",
  "outline-light": "border border-white/50 text-white hover:bg-white/10 hover:border-white backdrop-blur-sm",
  whatsapp: "bg-[#0f7a3d] text-white hover:bg-[#0b6331] shadow-soft",
};

export function ButtonLink({
  href,
  children,
  variant = "primary",
  icon,
  arrow,
  external,
  className,
  ...rest
}: {
  href: string;
  children: React.ReactNode;
  variant?: Variant;
  icon?: React.ReactNode;
  arrow?: boolean;
  external?: boolean;
  className?: string;
} & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={cn(
        "group inline-flex min-h-12 items-center justify-center gap-2.5 rounded-[14px] px-6 py-3 font-display text-[0.95rem] font-bold tracking-[0.01em] transition-all duration-300 ease-out-soft hover:-translate-y-0.5 active:translate-y-0",
        variant === "outline-light" || variant === "whatsapp" ? "on-dark" : "",
        styles[variant],
        className,
      )}
      {...rest}
    >
      {icon && <span className="transition-transform duration-300 group-hover:scale-110">{icon}</span>}
      <span>{children}</span>
      {arrow && (
        <svg viewBox="0 0 20 20" fill="none" className="size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true">
          <path d="M4 10h11m-4-4 4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </a>
  );
}
