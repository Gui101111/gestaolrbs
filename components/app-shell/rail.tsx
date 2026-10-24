"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Plus } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { UserMenu } from "@/components/app-shell/user-menu";
import { NAV_ITEMS, sectionOf, type ShellUser } from "@/components/app-shell/nav";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { NeonDivider } from "@/components/effects/neon-divider";

/** Barra de ícones (desktop): enviar vídeo, Início, Projetos e Conta, com pílula ativa que desliza. */
export function Rail({ user }: { user: ShellUser }) {
  const section = sectionOf(usePathname());

  return (
    <aside
      aria-label="Navegação do app"
      className="glass-strong fixed inset-y-0 left-0 z-40 hidden w-[84px] flex-col items-center border-y-0 border-l-0 py-4 lg:flex"
    >
      <Link href={ROUTES.app} aria-label="Início" className="mb-4 grid size-11 place-items-center rounded-2xl transition hover:bg-fg/[0.06]">
        <LogoMark className="size-8" />
      </Link>

      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={ROUTES.newVideo}
            aria-label="Enviar vídeo"
            aria-current={section === "novo" ? "page" : undefined}
            className="cta-pulse mb-4 grid size-12 place-items-center rounded-2xl bg-[linear-gradient(135deg,#f7d898,#f2c46d_45%,#c99a3b)] text-[#1a1306] shadow-[0_10px_30px_-12px_rgb(242_196_109/0.75)] transition-transform hover:-translate-y-0.5 active:scale-95"
          >
            <Plus className="size-6" strokeWidth={2.5} />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">Enviar vídeo</TooltipContent>
      </Tooltip>

      <NeonDivider className="mb-3 w-8" />

      <nav className="flex w-full flex-1 flex-col items-center gap-1.5 px-1.5">
        {NAV_ITEMS.map((item) => {
          const active = section === item.key;
          const Icon = item.icon;
          return (
            <Tooltip key={item.key}>
              <TooltipTrigger asChild>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group/rail relative flex w-full flex-col items-center gap-1 rounded-2xl py-2.5 text-[0.6875rem] font-semibold transition-colors duration-300",
                    active ? "text-fg" : "text-fg-3 hover:text-fg",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="rail-active"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      className="absolute inset-0 rounded-2xl bg-cyan/[0.08]"
                    >
                      <span aria-hidden className="neon-border block size-full rounded-[inherit] [--neon-radius:16px]" />
                    </motion.span>
                  )}
                  <Icon
                    className={cn(
                      "relative size-5 transition-transform duration-500 ease-[var(--ease-luxe)] group-hover/rail:-translate-y-0.5 group-hover/rail:scale-110",
                      active && "text-cyan drop-shadow-[0_0_6px_var(--cyan)]",
                    )}
                  />
                  <span className="relative leading-none">{item.label}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">{item.hint}</TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      <UserMenu user={user} side="right" />
    </aside>
  );
}
