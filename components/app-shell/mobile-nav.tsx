"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Clapperboard, FolderClosed, Home, Plus, UserRound } from "lucide-react";
import { sectionOf } from "@/components/app-shell/nav";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

/** Celular: Início · Projetos · [+] · Exemplos · Perfil. */
export function MobileNav() {
  const section = sectionOf(usePathname());
  const items = [
    { key: "inicio", href: ROUTES.app, label: "Início", icon: Home },
    { key: "projetos", href: ROUTES.projects, label: "Projetos", icon: FolderClosed },
    null,
    { key: "exemplos", href: ROUTES.examples, label: "Exemplos", icon: Clapperboard },
    { key: "configuracoes", href: ROUTES.settings, label: "Perfil", icon: UserRound },
  ] as const;

  return (
    <nav
      aria-label="Navegação inferior"
      className="glass-strong fixed inset-x-0 bottom-0 z-40 border-x-0 border-b-0 pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-5 items-end px-2 pt-1.5 pb-1.5">
        {items.map((item) =>
          item === null ? (
            <div key="novo" className="flex justify-center">
              <Link
                href={ROUTES.newVideo}
                aria-label="Novo vídeo"
                className="cta-pulse -mt-7 grid size-14 place-items-center rounded-full bg-[linear-gradient(135deg,#f7d898,#f2c46d_45%,#c99a3b)] text-[#1a1306] ring-[6px] ring-canvas transition-transform active:scale-95"
              >
                <Plus className="size-6" strokeWidth={2.5} />
              </Link>
            </div>
          ) : (
            <Link
              key={item.key}
              href={item.href}
              aria-current={section === item.key ? "page" : undefined}
              className={cn(
                "relative flex flex-col items-center gap-1 rounded-2xl py-1.5 text-[0.625rem] font-semibold transition-colors",
                section === item.key ? "text-fg" : "text-fg-3",
              )}
            >
              {section === item.key && (
                <motion.span
                  layoutId="mobile-nav-active"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  className="absolute inset-x-2 inset-y-0 rounded-2xl bg-cyan/[0.1]"
                />
              )}
              <item.icon className={cn("relative size-5", section === item.key && "text-cyan")} />
              <span className="relative">{item.label}</span>
            </Link>
          ),
        )}
      </div>
    </nav>
  );
}
