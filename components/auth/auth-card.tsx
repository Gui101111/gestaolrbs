"use client";

import * as React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export function AuthCard({
  eyebrow,
  title,
  description,
  children,
  footer,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, filter: "blur(10px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
      className={cn("w-full max-w-[440px]", className)}
    >
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1 className="mt-3 font-display text-4xl leading-tight font-medium text-ivory md:text-[2.75rem]">{title}</h1>
      {description && <p className="mt-3 text-[0.9375rem] leading-relaxed text-mist">{description}</p>}
      <div className="mt-9">{children}</div>
      {footer && <div className="mt-8 text-center text-sm text-mist">{footer}</div>}
    </motion.div>
  );
}

export function OrDivider() {
  return (
    <div className="my-7 flex items-center gap-4 text-[0.6875rem] tracking-[0.25em] text-mist/60 uppercase">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />
      ou
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
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
        tone === "error" && "border-destructive/35 bg-destructive/10 text-[#f0a49b]",
        tone === "info" && "border-info/30 bg-info/10 text-[#b8d0ec]",
        tone === "success" && "border-gold/35 bg-gold/10 text-gold-light",
      )}
    >
      {children}
    </motion.div>
  );
}
