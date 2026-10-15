"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Logo } from "@/components/brand/logo";
import { Progress } from "@/components/ui/progress";
import { ADMIN_NAV_ITEM, APP_NAV, isActive } from "@/components/dashboard/nav-items";
import { cn } from "@/lib/utils";
import type { ShellUsage } from "@/components/dashboard/app-shell";

export function Sidebar({ isAdmin, usage }: { isAdmin: boolean; usage: ShellUsage }) {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[17rem] flex-col border-r border-white/[0.06] bg-[#080a0e]/95 backdrop-blur-xl lg:flex">
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 hairline-v opacity-40" />
      <div className="flex h-20 items-center px-6">
        <Logo href="/app" />
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Navegação do painel">
        {APP_NAV.map((item) => {
          const active = isActive(pathname, item.href, "exact" in item ? item.exact : false);
          const Icon = item.icon;
          if ("highlight" in item && item.highlight) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group relative my-3 flex items-center gap-3 overflow-hidden rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all duration-500",
                  active
                    ? "border-gold/60 bg-gold/15 text-gold-light"
                    : "border-gold/30 bg-gold/[0.06] text-gold-light hover:border-gold/60 hover:bg-gold/10 hover:shadow-[0_0_30px_-10px_rgba(198,161,91,0.7)]",
                )}
              >
                <span className="grid size-7 place-items-center rounded-lg bg-gold-gradient text-ink">
                  <Icon className="size-4" strokeWidth={2.5} />
                </span>
                {item.label}
                <span aria-hidden className="absolute inset-y-0 left-0 w-1/3 -translate-x-full skew-x-[-18deg] bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-shimmer" />
              </Link>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors duration-300",
                active ? "text-ivory" : "text-mist hover:bg-white/[0.03] hover:text-ivory",
              )}
              aria-current={active ? "page" : undefined}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-xl border border-white/[0.08] bg-white/[0.05]"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              {active && <span className="absolute top-1/2 -left-3 h-5 w-0.5 -translate-y-1/2 rounded-full bg-gold shadow-[0_0_12px_rgba(198,161,91,0.9)]" />}
              <Icon className={cn("relative size-[18px]", active ? "text-gold" : "")} />
              <span className="relative">{item.label}</span>
            </Link>
          );
        })}
        {isAdmin && (
          <Link
            href={ADMIN_NAV_ITEM.href}
            className="mt-4 flex items-center gap-3 rounded-xl border border-dashed border-white/10 px-3 py-2.5 text-sm text-mist transition hover:border-gold/40 hover:text-gold-light"
          >
            <ADMIN_NAV_ITEM.icon className="size-[18px]" />
            {ADMIN_NAV_ITEM.label}
          </Link>
        )}
      </nav>
      <div className="m-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-mist">{usage.planName ?? "Sem plano ativo"}</span>
          {usage.limit != null && (
            <span className="font-semibold text-ivory tabular-nums">
              {usage.used}/{usage.limit}
            </span>
          )}
        </div>
        <Progress value={usage.limit ? (usage.used / usage.limit) * 100 : 0} className="mt-3" />
        <p className="mt-2 text-[0.6875rem] text-mist/80">{usage.caption}</p>
        <Link href="/app/assinatura" className="mt-3 inline-block text-xs font-semibold text-gold hover:text-gold-light">
          {usage.active ? "Gerenciar plano" : "Ver planos"} →
        </Link>
      </div>
    </aside>
  );
}
