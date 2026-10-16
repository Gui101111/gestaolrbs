"use client";

import Link from "next/link";
import { CreditCard, LogOut, Palette, Settings, Shield, UserRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOutAction } from "@/lib/actions/auth";
import { initials } from "@/lib/utils";

export function UserMenu({ name, email, avatarUrl, isAdmin }: { name: string; email: string; avatarUrl: string | null; isAdmin: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-3 rounded-full p-0.5 pr-0.5 transition hover:bg-fg/[0.04] md:pr-3" aria-label="Menu da conta">
        <Avatar className="size-9">
          {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
          <AvatarFallback>{initials(name)}</AvatarFallback>
        </Avatar>
        <span className="hidden max-w-36 truncate text-left text-sm font-medium text-ivory md:block">{name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>
          <span className="block truncate text-sm font-semibold text-ivory">{name}</span>
          <span className="block truncate text-xs text-mist">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/app/perfil">
            <UserRound /> Perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/app/marca">
            <Palette /> Minha Marca
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/app/assinatura">
            <CreditCard /> Assinatura
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/app/configuracoes">
            <Settings /> Configurações
          </Link>
        </DropdownMenuItem>
        {isAdmin && (
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
