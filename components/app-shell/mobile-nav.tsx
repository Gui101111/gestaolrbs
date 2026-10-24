"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Plus } from "lucide-react";
import { NAV_ITEMS, sectionOf } from "@/components/app-shell/nav";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

type Item = (typeof NAV_ITEMS)[number];

/** Celular: Início · Projetos · [+ enviar vídeo] · Conta (o + fica no centro da tela). */
export function MobileNav() {
  const section = sectionOf(usePathname());
  const [inicio, projetos, conta] = NAV_ITEMS;

  const tab = (item: Item) => {
    const active = section === item.key;
    return (
      <Link
        key={item.key}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative flex min-h-12 flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-1.5 text-[0.6875rem] font-semibold transition-colors",
          active ? "text-fg" : "text-fg-3",
        )}
      >
        {active && (
          <motion.span
            layoutId="mobile-nav-active"
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            className="absolute inset-x-1 inset-y-0 rounded-2xl bg-cyan/[0.1]"
          />
        )}
        <item.icon className={cn("relative size-5", active && "text-cyan")} />
        <span className="relative">{item.label}</span>
      </Link>
    );
  };

  return (
    <nav
      aria-label="Navegação inferior"
      className="glass-strong fixed inset-x-0 bottom-0 z-40 border-x-0 border-b-0 pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-[1fr_auto_1fr] items-end gap-2 px-2 pt-1.5 pb-1.5">
        <div className="flex">
          {tab(inicio)}
          {tab(projetos)}
        </div>
        <Link
          href={ROUTES.newVideo}
          aria-label="Enviar vídeo"
          aria-current={section === "novo" ? "page" : undefined}
          className="cta-pulse -mt-7 grid size-14 place-items-center rounded-full bg-[linear-gradient(135deg,#f7d898,#f2c46d_45%,#c99a3b)] text-[#1a1306] ring-[6px] ring-canvas transition-transform active:scale-95"
        >
          <Plus className="size-6" strokeWidth={2.5} />
        </Link>
        <div className="flex">{tab(conta)}</div>
      </div>
    </nav>
  );
}
