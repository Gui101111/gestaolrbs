"use client";

import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Botão base da TRIBUNA.
 * - gold: gradiente metálico, brilho que atravessa no hover, profundidade sutil;
 * - outline: borda dourada fina que acende no hover;
 * - ghost / subtle / destructive para a interface.
 * Ripple suave no clique e estado de carregamento com spinner fino.
 */
const buttonVariants = cva(
  [
    "group/btn relative inline-flex shrink-0 items-center justify-center gap-2 overflow-hidden whitespace-nowrap",
    "font-sans font-semibold tracking-[0.02em] select-none outline-none",
    "transition-[transform,box-shadow,background-color,border-color,color,opacity] duration-500 ease-[var(--ease-luxe)]",
    "active:scale-[0.975] disabled:pointer-events-none disabled:opacity-50",
    "focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ].join(" "),
  {
    variants: {
      variant: {
        gold: [
          "text-[#140f06] bg-gold-gradient bg-[length:160%_160%] bg-[position:0%_0%]",
          "shadow-[0_1px_0_0_rgb(255_255_255/0.35)_inset,0_-1px_0_0_rgb(0_0_0/0.25)_inset,0_10px_30px_-12px_rgb(198_161_91/0.7)]",
          "hover:bg-[position:100%_100%] hover:-translate-y-px",
          "hover:shadow-[0_1px_0_0_rgb(255_255_255/0.45)_inset,0_-1px_0_0_rgb(0_0_0/0.25)_inset,0_18px_44px_-14px_rgb(225_196_135/0.85),0_0_0_1px_rgb(225_196_135/0.4)]",
        ].join(" "),
        outline: [
          "text-ivory bg-white/[0.02] border border-gold/35",
          "hover:border-gold-light/80 hover:bg-gold/[0.06] hover:text-gold-light",
          "hover:shadow-[0_0_0_1px_rgb(198_161_91/0.25),0_0_32px_-10px_rgb(198_161_91/0.55)]",
        ].join(" "),
        subtle: "text-ivory bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.08] hover:border-white/[0.14]",
        ghost: "text-mist hover:text-ivory hover:bg-white/[0.05]",
        link: "text-gold hover:text-gold-light underline-offset-4 hover:underline px-0 h-auto",
        destructive:
          "text-ivory bg-destructive/15 border border-destructive/40 hover:bg-destructive/25 hover:border-destructive/70",
        navy: "text-ivory bg-navy-deep border border-white/[0.08] hover:bg-navy-soft hover:border-gold/30",
      },
      size: {
        sm: "h-9 rounded-full px-4 text-[0.8125rem]",
        md: "h-11 rounded-full px-6 text-sm",
        lg: "h-13 rounded-full px-8 text-[0.8125rem] uppercase tracking-[0.16em]",
        xl: "h-15 rounded-full px-10 text-[0.8125rem] uppercase tracking-[0.2em]",
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
  /** Desliga o brilho que atravessa o botão (apenas variante gold). */
  noShine?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, noShine, children, onPointerDown, disabled, ...props }, ref) => {
    const [ripples, setRipples] = React.useState<RippleState[]>([]);
    const Comp = asChild ? Slot.Root : "button";
    const showShine = variant === "gold" && !noShine;

    const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
      onPointerDown?.(e);
      const rect = e.currentTarget.getBoundingClientRect();
      const id = Date.now() + Math.random();
      setRipples((r) => [...r, { x: e.clientX - rect.left, y: e.clientY - rect.top, id }]);
      window.setTimeout(() => setRipples((r) => r.filter((rp) => rp.id !== id)), 700);
    };

    const decorations = (
      <>
        {showShine && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-1/2 -translate-x-[120%] skew-x-[-18deg] bg-gradient-to-r from-transparent via-white/55 to-transparent opacity-0 transition-opacity duration-300 group-hover/btn:animate-shimmer group-hover/btn:opacity-100"
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
        <Comp
          ref={ref}
          className={cn(buttonVariants({ variant, size }), className)}
          onPointerDown={handlePointerDown}
          {...props}
        >
          {children}
        </Comp>
      );
    }

    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
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
