"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Gem } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { UserMenu } from "@/components/app-shell/user-menu";
import { RAIL_ITEMS, sectionOf, type ShellUsage, type ShellUser } from "@/components/app-shell/nav";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

/** Barra de ícones (72px) com rótulo embaixo e pílula ativa que desliza. */
export function Rail({ user, usage }: { user: ShellUser; usage: ShellUsage }) {
  const section = sectionOf(usePathname());

  return (
    <aside
      aria-label="Navegação do app"
      className="glass-strong fixed inset-y-0 left-0 z-40 hidden w-[72px] flex-col items-center border-y-0 border-l-0 py-4 lg:flex"
    >
      <Link href={ROUTES.app} aria-label="Início" className="mb-5 grid size-11 place-items-center rounded-2xl transition hover:bg-fg/[0.06]">
        <LogoMark className="size-8" />
      </Link>

      <nav className="flex w-full flex-1 flex-col items-center gap-1.5 px-1.5">
        {RAIL_ITEMS.map((item) => {
          const active = section === item.key;
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group/rail relative flex w-full flex-col items-center gap-1 rounded-2xl py-2.5 text-[0.625rem] font-semibold transition-colors duration-300",
                active ? "text-fg" : "text-fg-3 hover:text-fg",
              )}
            >
              {active && (
                <motion.span
                  layoutId="rail-active"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  className="absolute inset-0 rounded-2xl border border-cyan/30 bg-cyan/[0.08] shadow-[0_0_20px_-8px_var(--cyan)]"
                />
              )}
              <Icon
                className={cn(
                  "relative size-5 transition-transform duration-500 ease-[var(--ease-luxe)] group-hover/rail:-translate-y-0.5 group-hover/rail:scale-110",
                  active && "text-cyan drop-shadow-[0_0_6px_var(--cyan)]",
                )}
              />
              <span className="relative leading-none">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col items-center gap-3">
        <span aria-hidden className="h-px w-8 bg-line" />
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href={ROUTES.billing}
              aria-label="Assinatura"
              aria-current={section === "assinatura" ? "page" : undefined}
              className="group/gem relative grid size-11 place-items-center rounded-full"
            >
              <span
                aria-hidden
                className={cn(
                  "absolute inset-0 rounded-full border-2 transition-shadow duration-500",
                  section === "assinatura" ? "border-cyan shadow-[0_0_16px_var(--cyan)]" : "border-cyan/60 group-hover/gem:shadow-[0_0_14px_var(--cyan)]",
                )}
              />
              <Gem className="size-[18px] text-gold transition-transform duration-500 group-hover/gem:rotate-12 group-hover/gem:scale-110" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">
            {usage.planName ?? "Assinatura"}
            {usage.limit != null && ` · ${usage.used}/${usage.limit} vídeos`}
          </TooltipContent>
        </Tooltip>
        <UserMenu user={user} side="right" />
      </div>
    </aside>
  );
}
