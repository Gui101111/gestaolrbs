import { Clapperboard, FolderClosed, GraduationCap, Home, Palette } from "lucide-react";
import { ROUTES } from "@/lib/routes";

export const RAIL_ITEMS = [
  { key: "inicio", href: ROUTES.app, label: "Início", icon: Home },
  { key: "projetos", href: ROUTES.projects, label: "Projetos", icon: FolderClosed },
  { key: "exemplos", href: ROUTES.examples, label: "Exemplos", icon: Clapperboard },
  { key: "marca", href: ROUTES.brand, label: "Marca", icon: Palette },
  { key: "como-fazer", href: ROUTES.howTo, label: "Como fazer", icon: GraduationCap },
] as const;

export type Section = "inicio" | "projetos" | "exemplos" | "marca" | "como-fazer" | "assinatura" | "configuracoes";

/** Seção do app a partir da URL (decide o item ativo do rail e o conteúdo do painel). */
export function sectionOf(pathname: string): Section {
  if (pathname.startsWith("/app/projetos") || pathname.startsWith("/app/video") || pathname.startsWith("/app/novo")) return "projetos";
  if (pathname.startsWith("/app/exemplos")) return "exemplos";
  if (pathname.startsWith("/app/marca")) return "marca";
  if (pathname.startsWith("/app/como-fazer")) return "como-fazer";
  if (pathname.startsWith("/app/assinatura")) return "assinatura";
  if (pathname.startsWith("/app/configuracoes") || pathname.startsWith("/app/perfil")) return "configuracoes";
  return "inicio";
}

export type ShellUser = {
  id: string;
  name: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  isAdmin: boolean;
};

export type ShellUsage = { planName: string | null; used: number; limit: number | null; caption: string; active: boolean };

export type RecentItem = { id: string; name: string; status: string; updated_at: string };

export type FolderItem = { id: string; name: string; color: string; parent_id: string | null; position: number; count: number };
