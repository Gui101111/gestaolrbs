"use client";

import * as React from "react";
import { Check, Moon, Sun } from "lucide-react";
import { panelClass, panelTitle } from "@/components/account/profile-form";
import { useTheme, type Theme } from "@/components/theme/theme-provider";
import { cn } from "@/lib/utils";

const THEMES: { value: Theme; label: string; text: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "grafite", label: "Grafite", text: "Metal escuro com neon.", icon: Moon },
  { value: "claro", label: "Claro", text: "Metal claro, vidro branco.", icon: Sun },
];

/** Tema Grafite ou Claro (vale para este navegador). */
export function AppearancePanel() {
  const { theme, setTheme } = useTheme();
  return (
    <div className={panelClass}>
      <h2 className={panelTitle}>Tema</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Tema">
        {THEMES.map((t) => {
          const on = theme === t.value;
          return (
            <button
              key={t.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setTheme(t.value)}
              className={cn(
                "group relative overflow-hidden rounded-[20px] p-2 text-left transition-all duration-500",
                on ? "neon-border bg-surface" : "border border-line hover:border-line-strong",
              )}
            >
              <span
                className={cn("block aspect-[16/9] overflow-hidden rounded-[14px] border border-black/10", t.value === "claro" ? "bg-[#eef0f3]" : "bg-[#1a1d22]")}
                aria-hidden
              >
                <span className={cn("flex h-full", t.value === "claro" ? "bg-[#eef0f3]" : "bg-[#1a1d22]")}>
                  <span className={cn("h-full w-[14%]", t.value === "claro" ? "bg-white/80" : "bg-[#22262c]")} />
                  <span className="flex-1 p-3">
                    <span className={cn("block h-2.5 w-1/2 rounded-full", t.value === "claro" ? "bg-[#14171c]" : "bg-white")} />
                    <span className="mt-2 block h-1.5 w-1/3 rounded-full bg-[linear-gradient(90deg,#3be3f0,#7fa8ff,#f2c46d)]" />
                    <span className="mt-3 grid grid-cols-3 gap-1.5">
                      {[0, 1, 2].map((i) => (
                        <span key={i} className={cn("h-6 rounded-md", t.value === "claro" ? "bg-white shadow-sm" : "bg-[#2c3138]")} />
                      ))}
                    </span>
                  </span>
                </span>
              </span>
              <span className="flex items-center justify-between px-1.5 pt-2.5 pb-1">
                <span className="flex items-center gap-2 text-sm font-bold text-fg">
                  <t.icon className="size-4 text-cyan" /> {t.label}
                </span>
                {on && (
                  <span className="grid size-5 place-items-center rounded-full bg-cyan text-[#06222a]">
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                )}
              </span>
              <span className="block px-1.5 pb-1 text-xs text-fg-3">{t.text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
