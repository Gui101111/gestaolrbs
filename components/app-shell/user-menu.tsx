"use client";

import Link from "next/link";
import { LogOut, Moon, Settings, Shield, Sun } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/components/theme/theme-provider";
import type { ShellUser } from "@/components/app-shell/nav";
import { signOutAction } from "@/lib/actions/auth";
import { ROUTES } from "@/lib/routes";
import { cn, initials } from "@/lib/utils";

/** Avatar com menu: Configurações, tema Grafite/Claro e Sair. */
export function UserMenu({ user, side = "bottom" }: { user: ShellUser; side?: "bottom" | "right" }) {
  const { theme, setTheme } = useTheme();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full outline-none transition hover:ring-2 hover:ring-cyan/40 focus-visible:ring-2 focus-visible:ring-cyan" aria-label="Menu da conta">
        <Avatar className="size-10">
          {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
          <AvatarFallback>{initials(user.name)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent side={side} align="end" className="w-64">
        <DropdownMenuLabel>
          <span className="block truncate text-sm font-semibold text-fg">{user.displayName || user.name}</span>
          <span className="block truncate text-xs text-fg-3">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={ROUTES.settings}>
            <Settings /> Configurações
          </Link>
        </DropdownMenuItem>
        <div className="px-1.5 py-1.5">
          <p className="px-1 pb-1.5 text-xs text-fg-3">Tema</p>
          <div className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-fg/[0.03] p-1" role="radiogroup" aria-label="Tema">
            {(
              [
                { value: "grafite", label: "Grafite", icon: Moon },
                { value: "claro", label: "Claro", icon: Sun },
              ] as const
            ).map((t) => (
              <button
                key={t.value}
                type="button"
                role="radio"
                aria-checked={theme === t.value}
                onClick={() => setTheme(t.value)}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-all duration-300",
                  theme === t.value ? "bg-surface text-fg shadow-[0_0_0_1px_color-mix(in_oklab,var(--cyan)_45%,transparent)]" : "text-fg-2 hover:text-fg",
                )}
              >
                <t.icon className="size-3.5" />
                {t.label}
              </button>
            ))}
          </div>
        </div>
        {user.isAdmin && (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <Shield /> Painel admin
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => void signOutAction()}>
          <LogOut /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
