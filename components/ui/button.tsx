"use client";

import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Botão base da TRIBUNA (Grafite Neon).
 * - gold: neon dourado, o botão principal;
 * - glass / outline: vidro com borda que acende em ciano;
 * - neon: ciano, para estados ativos e ações secundárias fortes;
 * - metal / subtle / ghost / link / destructive para a interface.
 * Em todos: faixa de luz que atravessa no hover, escala 0,97 no clique e ripple.
 */
const buttonVariants = cva(
  [
    "group/btn relative inline-flex shrink-0 items-center justify-center gap-2 overflow-hidden whitespace-nowrap",
    "font-sans font-semibold select-none outline-none",
    "transition-[transform,box-shadow,background-color,border-color,color,opacity] duration-500 ease-[var(--ease-luxe)]",
    "active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50",
    "focus-visible:ring-2 focus-visible:ring-cyan/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ].join(" "),
  {
    variants: {
      variant: {
        gold: [
          "text-[#1a1306] bg-[linear-gradient(135deg,#f7d898_0%,#f2c46d_45%,#c99a3b_100%)]",
          "shadow-[0_1px_0_0_rgb(255_255_255/0.5)_inset,0_0_0_1px_rgb(242_196_109/0.55),0_10px_30px_-12px_rgb(242_196_109/0.75)]",
          "hover:-translate-y-px hover:shadow-[0_1px_0_0_rgb(255_255_255/0.6)_inset,0_0_0_1px_rgb(247_216_152/0.8),0_0_32px_-4px_rgb(242_196_109/0.6),0_18px_40px_-14px_rgb(242_196_109/0.9)]",
        ].join(" "),
        neon: [
          "text-cyan bg-cyan/[0.1] border border-cyan/40",
          "hover:bg-cyan/[0.16] hover:border-cyan/70 hover:shadow-[var(--glow-cyan)]",
        ].join(" "),
        glass: [
          "glass text-fg",
          "hover:border-cyan/45 hover:shadow-[var(--glow-cyan)]",
        ].join(" "),
        outline: [
          "text-fg bg-fg/[0.03] border border-line-strong",
          "hover:border-cyan/50 hover:bg-cyan/[0.06] hover:shadow-[var(--glow-cyan)]",
        ].join(" "),
        metal: "metal text-fg hover:border-line-strong hover:-translate-y-px",
        subtle: "text-fg bg-fg/[0.06] border border-line hover:bg-fg/[0.1] hover:border-line-strong",
        ghost: "text-fg-2 hover:text-fg hover:bg-fg/[0.06]",
        link: "text-cyan hover:text-fg underline-offset-4 hover:underline px-0 h-auto",
        destructive:
          "text-destructive bg-destructive/[0.1] border border-destructive/35 hover:bg-destructive/[0.18] hover:border-destructive/60",
        navy: "metal text-fg hover:border-line-strong",
      },
      size: {
        sm: "h-9 rounded-full px-4 text-[0.8125rem]",
        md: "h-11 rounded-full px-5 text-sm",
        lg: "h-12 rounded-full px-7 text-[0.9375rem]",
        xl: "h-14 rounded-full px-9 text-base",
        icon: "size-10 rounded-full",
        "icon-sm": "size-8 rounded-full",
      },
    },
    defaultVariants: { variant: "subtle", size: "md" },
  },
);

type RippleState = { x: number; y: number; id: number };

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  /** Desliga a faixa de luz que atravessa o botão. */
  noShine?: boolean;
  /** Glow pulsando devagar (CTA principal). */
  pulse?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, loading = false, noShine, pulse, children, onPointerDown, disabled, ...props },
    ref,
  ) => {
    const [ripples, setRipples] = React.useState<RippleState[]>([]);
    const Comp = asChild ? Slot.Root : "button";
    const showShine = !noShine && variant !== "link" && variant !== "ghost";

    const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
      onPointerDown?.(e);
      const rect = e.currentTarget.getBoundingClientRect();
      const id = Date.now() + Math.random();
      setRipples((r) => [...r, { x: e.clientX - rect.left, y: e.clientY - rect.top, id }]);
      window.setTimeout(() => setRipples((r) => r.filter((rp) => rp.id !== id)), 700);
    };

    const classes = cn(buttonVariants({ variant, size }), pulse && "cta-pulse", className);

    const decorations = (
      <>
        {showShine && (
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-y-0 left-0 w-1/2 -translate-x-[120%] skew-x-[-18deg] bg-gradient-to-r from-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover/btn:animate-shimmer group-hover/btn:opacity-100",
              variant === "gold" ? "via-white/60" : "via-fg/15",
            )}
          />
        )}
        {ripples.map((r) => (
          <span
            key={r.id}
            aria-hidden
            className="btn-ripple pointer-events-none absolute size-3 rounded-full"
            style={{ left: r.x, top: r.y }}
          />
        ))}
      </>
    );

    if (asChild) {
      return (
        <Comp ref={ref} className={classes} onPointerDown={handlePointerDown} {...props}>
          {children}
        </Comp>
      );
    }

    return (
      <button
        ref={ref}
        className={classes}
        onPointerDown={handlePointerDown}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {decorations}
        {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
        <span className="relative z-[1] inline-flex items-center gap-2">{children}</span>
      </button>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
