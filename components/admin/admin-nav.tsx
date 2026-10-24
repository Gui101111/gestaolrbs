"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin", label: "Visão geral", exact: true },
  { href: "/admin/projetos", label: "Fila de projetos" },
  { href: "/admin/planos", label: "Planos" },
  { href: "/admin/usuarios", label: "Usuários" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4" aria-label="Admin">
      {ITEMS.map((i) => {
        const active = i.exact ? pathname === i.href : pathname.startsWith(i.href);
        return (
          <Link key={i.href} href={i.href} className={cn("relative rounded-full px-4 py-2 text-sm whitespace-nowrap transition-colors", active ? "text-fg" : "text-fg-2 hover:text-fg")}>
            {active && <motion.span layoutId="admin-nav" className="absolute inset-0 rounded-full bg-surface shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--cyan)_45%,transparent),0_0_18px_-6px_var(--cyan)]" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
            <span className="relative">{i.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
