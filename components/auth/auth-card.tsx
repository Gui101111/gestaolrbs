"use client";

import * as React from "react";
import { motion } from "motion/react";
import { AccentText } from "@/components/shared/accent-text";
import { cn } from "@/lib/utils";

/** Card de vidro das telas de acesso. O título aceita *destaque* entre asteriscos. */
export function AuthCard({
  title,
  description,
  children,
  footer,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "glass-strong relative w-full max-w-[440px] rounded-[28px] p-6 shadow-[var(--shadow-pop)] sm:p-8",
        className,
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-12 -top-px h-px bg-[linear-gradient(90deg,transparent,var(--cyan),var(--gold),transparent)] opacity-80"
      />
      <h1 className="text-[2rem] leading-[1.08] text-fg sm:text-[2.25rem]">
        <AccentText text={title} />
      </h1>
      {description && <p className="mt-2 text-[0.9375rem] leading-relaxed text-fg-2">{description}</p>}
      <div className="mt-7">{children}</div>
      {footer && <div className="mt-7 border-t border-line pt-5 text-center text-sm text-fg-2">{footer}</div>}
    </motion.div>
  );
}

export function OrDivider() {
  return (
    <div className="my-6 flex items-center gap-4 text-[0.6875rem] tracking-[0.2em] text-fg-3 uppercase">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-line-strong" />
      ou com e-mail
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-line-strong" />
    </div>
  );
}

export function FormAlert({ tone = "error", children }: { tone?: "error" | "info" | "success"; children: React.ReactNode }) {
  return (
    <motion.div
      role={tone === "error" ? "alert" : "status"}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-xl border px-4 py-3 text-[0.8125rem] leading-relaxed",
        tone === "error" && "border-destructive/35 bg-destructive/10 text-destructive",
        tone === "info" && "border-info/30 bg-info/10 text-info",
        tone === "success" && "border-success/35 bg-success/10 text-success",
      )}
    >
      {children}
    </motion.div>
  );
}

/** Link de texto padrão das telas de acesso. */
export const authLinkClass = "font-semibold text-link underline-offset-4 hover:underline";
