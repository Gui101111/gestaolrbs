"use client";

import * as React from "react";
import Link from "next/link";
import { Sidebar } from "@/components/dashboard/sidebar";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import { NotificationsMenu } from "@/components/dashboard/notifications-menu";
import { UserMenu } from "@/components/dashboard/user-menu";
import { LogoMark } from "@/components/brand/logo";
import type { Notification } from "@/types/domain";

export type ShellUsage = { planName: string | null; used: number; limit: number | null; caption: string; active: boolean };
export type ShellUser = { id: string; name: string; email: string; avatarUrl: string | null; isAdmin: boolean };

export function AppShell({
  user,
  usage,
  notifications,
  children,
}: {
  user: ShellUser;
  usage: ShellUsage;
  notifications: Notification[];
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-dvh bg-ink">
      <div aria-hidden className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_70%_-10%,rgba(22,38,61,0.75),transparent_65%)]" />
        <div className="absolute inset-0 bg-gold-lines opacity-[0.35] [mask-image:linear-gradient(180deg,#000,transparent_45%)]" />
      </div>
      <Sidebar isAdmin={user.isAdmin} usage={usage} />
      <div className="relative lg:pl-[17rem]">
        <header className="sticky top-0 z-30 border-b border-fg/[0.06] bg-ink/75 backdrop-blur-xl">
          <div className="flex h-16 items-center justify-between gap-4 px-4 md:h-20 md:px-8">
            <Link href="/app" className="lg:hidden" aria-label="Início">
              <LogoMark className="size-8" />
            </Link>
            <div className="hidden min-w-0 lg:block" id="app-header-slot" />
            <div className="ml-auto flex items-center gap-2 md:gap-3">
              {usage.limit != null && (
                <Link
                  href="/app/assinatura"
                  className="hidden items-center gap-2 rounded-full border border-fg/[0.08] px-3 py-1.5 text-xs text-mist transition hover:border-gold/30 hover:text-ivory md:flex"
                >
                  <span className="size-1.5 rounded-full bg-gold shadow-[0_0_8px_rgba(198,161,91,0.9)]" />
                  {usage.used} de {usage.limit} vídeos no ciclo
                </Link>
              )}
              <NotificationsMenu userId={user.id} initial={notifications} />
              <UserMenu name={user.name} email={user.email} avatarUrl={user.avatarUrl} isAdmin={user.isAdmin} />
            </div>
          </div>
        </header>
        <main className="relative mx-auto max-w-7xl px-4 pt-6 pb-32 md:px-8 md:pt-10 lg:pb-16">{children}</main>
      </div>
      <BottomNav isAdmin={user.isAdmin} />
    </div>
  );
}
