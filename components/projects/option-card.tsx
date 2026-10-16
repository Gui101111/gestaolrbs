"use client";

import * as React from "react";
import { motion } from "motion/react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** Cartão selecionável (radio/checkbox) com brilho dourado no estado ativo. */
export function OptionCard({
  selected,
  onSelect,
  title,
  description,
  icon,
  badge,
  className,
  multiple,
  children,
  disabled,
}: {
  selected: boolean;
  onSelect: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
  multiple?: boolean;
  children?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <motion.button
      type="button"
      role={multiple ? "checkbox" : "radio"}
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      whileTap={{ scale: 0.985 }}
      className={cn(
        "group relative flex w-full flex-col items-start gap-2 overflow-hidden rounded-2xl border p-4 text-left transition-all duration-500 ease-[var(--ease-luxe)] outline-none md:p-5",
        "focus-visible:ring-2 focus-visible:ring-gold/50 disabled:cursor-not-allowed disabled:opacity-40",
        selected
          ? "border-gold/60 bg-gold/[0.07] shadow-[0_0_0_1px_rgba(198,161,91,0.25),0_18px_40px_-24px_rgba(198,161,91,0.7)]"
          : "border-fg/[0.08] bg-fg/[0.02] hover:-translate-y-0.5 hover:border-fg/20 hover:bg-fg/[0.04]",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute -top-10 -right-10 size-28 rounded-full bg-gold/20 blur-2xl transition-opacity duration-700",
          selected ? "opacity-100" : "opacity-0",
        )}
      />
      <span className="relative flex w-full items-start justify-between gap-3">
        {icon && (
          <span
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-xl border transition-all duration-500",
              selected ? "border-gold/50 bg-gold/15 text-gold-light" : "border-fg/10 bg-fg/[0.03] text-mist group-hover:text-ivory",
            )}
          >
            {icon}
          </span>
        )}
        {!icon && <span className="font-medium text-ivory">{title}</span>}
        <span
          className={cn(
            "grid size-5 shrink-0 place-items-center border transition-all duration-500",
            multiple ? "rounded-md" : "rounded-full",
            selected ? "border-gold bg-gold text-on-gold" : "border-fg/20",
          )}
        >
          {selected && <Check className="size-3" strokeWidth={3} />}
        </span>
      </span>
      {icon && <span className="relative mt-1 font-medium text-ivory">{title}</span>}
      {description && <span className="relative text-[0.8125rem] leading-relaxed text-mist">{description}</span>}
      {badge && <span className="relative">{badge}</span>}
      {children}
    </motion.button>
  );
}
