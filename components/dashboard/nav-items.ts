import { CreditCard, FolderOpen, LayoutDashboard, Palette, Plus, Settings, Shield, UserRound } from "lucide-react";

export const APP_NAV = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/app/projetos/novo", label: "Novo Projeto", icon: Plus, highlight: true },
  { href: "/app/biblioteca", label: "Biblioteca", icon: FolderOpen },
  { href: "/app/marca", label: "Minha Marca", icon: Palette },
  { href: "/app/assinatura", label: "Assinatura", icon: CreditCard },
  { href: "/app/perfil", label: "Perfil", icon: UserRound },
  { href: "/app/configuracoes", label: "Configurações", icon: Settings },
] as const;

export const ADMIN_NAV_ITEM = { href: "/admin", label: "Painel admin", icon: Shield } as const;

export function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
