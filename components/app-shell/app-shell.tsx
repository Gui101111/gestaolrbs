"use client";

import * as React from "react";
import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";
import { Rail } from "@/components/app-shell/rail";
import { MobileNav } from "@/components/app-shell/mobile-nav";
import { NotificationsMenu } from "@/components/app-shell/notifications-menu";
import { FoldersProvider } from "@/components/folders/folders-context";
import { BrowserEditingRunner } from "@/components/editing/browser-runner";
import type { FolderItem, ShellUser } from "@/components/app-shell/nav";
import type { Notification } from "@/types/domain";
import { ROUTES } from "@/lib/routes";

/**
 * Layout do app, bem simples: barra de ícones no desktop (enviar vídeo,
 * Início, Projetos, Conta) e barra inferior com o + central no celular.
 */
export function AppShell({
  user,
  notifications,
  folders,
  children,
}: {
  user: ShellUser;
  notifications: Notification[];
  folders: FolderItem[];
  children: React.ReactNode;
}) {
  return (
    <FoldersProvider folders={folders}>
    <div className="texture-metal relative min-h-dvh bg-page">
      <Rail user={user} />

      <div className="relative lg:pl-[84px]">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 px-4 md:px-6 lg:h-[4.5rem] lg:px-8">
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-canvas via-canvas/85 to-transparent" />
          <Link href={ROUTES.app} aria-label="Início" className="relative grid size-10 place-items-center lg:hidden">
            <LogoMark className="size-8" />
          </Link>
          <div className="relative ml-auto flex items-center gap-2">
            <NotificationsMenu userId={user.id} initial={notifications} />
          </div>
        </header>

        <main className="relative mx-auto max-w-6xl px-4 pb-32 md:px-6 lg:px-8 lg:pb-16">{children}</main>
      </div>

      <MobileNav />
    </div>
      <BrowserEditingRunner userId={user.id} />
    </FoldersProvider>
  );
}
