import { FolderClosed, Home, UserRound } from "lucide-react";
import { ROUTES } from "@/lib/routes";

/** Navegação do app: só Início, Projetos e Conta (+ o botão de enviar vídeo). */
export const NAV_ITEMS = [
  { key: "inicio", href: ROUTES.app, label: "Início", hint: "Enviar e acompanhar vídeos", icon: Home },
  { key: "projetos", href: ROUTES.projects, label: "Projetos", hint: "Pastas e vídeos", icon: FolderClosed },
  { key: "conta", href: ROUTES.settings, label: "Conta", hint: "Nome, tema e sair", icon: UserRound },
] as const;

export type Section = (typeof NAV_ITEMS)[number]["key"] | "novo";

/** Seção do app a partir da URL (decide o item ativo da navegação). */
export function sectionOf(pathname: string): Section {
  if (pathname.startsWith(ROUTES.newVideo)) return "novo";
  if (pathname.startsWith(ROUTES.projects) || pathname.startsWith("/app/video")) return "projetos";
  if (pathname.startsWith(ROUTES.settings) || pathname.startsWith("/app/perfil")) return "conta";
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

export type FolderItem = { id: string; name: string; color: string; parent_id: string | null; position: number; count: number };
