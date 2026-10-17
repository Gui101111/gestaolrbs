"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ChevronsRight, Menu } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Rail } from "@/components/app-shell/rail";
import { SidePanel } from "@/components/app-shell/side-panel";
import { MobileNav } from "@/components/app-shell/mobile-nav";
import { HelpPanel } from "@/components/app-shell/help-panel";
import { NotificationsMenu } from "@/components/app-shell/notifications-menu";
import { UserMenu } from "@/components/app-shell/user-menu";
import { usePanelCollapsed } from "@/components/app-shell/panel-store";
import { FoldersProvider } from "@/components/folders/folders-context";
import type { FolderItem, RecentItem, ShellUsage, ShellUser } from "@/components/app-shell/nav";
import type { Notification } from "@/types/domain";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Layout do app: rail (72px) · painel recolhível (248px) · conteúdo.
 * No celular: barra inferior com o botão central de Novo vídeo e o painel em gaveta.
 */
export function AppShell({
  user,
  usage,
  notifications,
  recents,
  folders,
  children,
}: {
  user: ShellUser;
  usage: ShellUsage;
  notifications: Notification[];
  recents: RecentItem[];
  folders: FolderItem[];
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = usePanelCollapsed();
  const [drawer, setDrawer] = React.useState(false);
  const [help, setHelp] = React.useState(false);
  const pathname = usePathname();
  const immersive = pathname.startsWith(ROUTES.newVideo);

  return (
    <FoldersProvider folders={folders}>
    <div className="texture-metal relative min-h-dvh bg-canvas" data-panel={collapsed ? "closed" : "open"}>
      <Rail user={user} usage={usage} />

      {/* Painel secundário (desktop) */}
      <AnimatePresence initial={false}>
        {!collapsed && !immersive && (
          <motion.aside
            key="panel"
            aria-label="Painel"
            initial={{ x: -24, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -24, opacity: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="fixed inset-y-0 left-[72px] z-30 hidden w-[248px] border-r border-line bg-surface/60 backdrop-blur-xl lg:block"
          >
            <SidePanel recents={recents} folders={folders} onCollapse={() => setCollapsed(true)} />
          </motion.aside>
        )}
      </AnimatePresence>

      <div
        className={cn(
          "relative transition-[padding] duration-500 ease-[var(--ease-luxe)] lg:pl-[72px]",
          !collapsed && !immersive && "lg:pl-[320px]",
        )}
      >
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 px-4 md:px-6 lg:h-[4.5rem] lg:px-8">
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-canvas via-canvas/85 to-transparent" />
          <button
            type="button"
            onClick={() => setDrawer(true)}
            aria-label="Abrir painel"
            className="relative grid size-10 place-items-center rounded-full text-fg-2 transition hover:bg-fg/[0.06] hover:text-fg lg:hidden"
          >
            <Menu className="size-5" />
          </button>
          <Link href={ROUTES.app} aria-label="Início" className="relative lg:hidden">
            <LogoMark className="size-8" />
          </Link>
          {collapsed && !immersive && (
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              aria-label="Abrir painel"
              className="glass relative hidden size-10 place-items-center rounded-full text-fg-2 transition hover:text-fg lg:grid"
            >
              <ChevronsRight className="size-4" />
            </button>
          )}

          <div className="relative ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setHelp(true)}
              className="glass group relative flex h-10 items-center gap-2 rounded-full pr-4 pl-1.5 text-sm font-semibold text-fg transition hover:border-cyan/40 hover:shadow-[var(--glow-cyan)]"
            >
              <span className="relative grid size-7 place-items-center rounded-full bg-cyan/[0.12]">
                <LogoMark className="size-5" glow={false} />
                <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-gold shadow-[0_0_8px_var(--gold)]" />
              </span>
              <span className="hidden sm:inline">Perguntar à Tribuna</span>
              <span className="sm:hidden">Ajuda</span>
            </button>
            <NotificationsMenu userId={user.id} initial={notifications} />
            <div className="lg:hidden">
              <UserMenu user={user} />
            </div>
          </div>
        </header>

        <main className={cn("relative mx-auto px-4 pb-32 md:px-6 lg:px-8 lg:pb-16", immersive ? "max-w-[1400px]" : "max-w-6xl")}>{children}</main>
      </div>

      <MobileNav />

      {/* Painel em gaveta (celular) */}
      <Sheet open={drawer} onOpenChange={setDrawer}>
        <SheetContent side="left" className="w-[84%] max-w-[300px] gap-0 p-0">
          <SheetTitle className="sr-only">Painel</SheetTitle>
          <SheetDescription className="sr-only">Criar, recentes e pastas</SheetDescription>
          <SidePanel recents={recents} folders={folders} onNavigate={() => setDrawer(false)} />
        </SheetContent>
      </Sheet>

      <HelpPanel open={help} onOpenChange={setHelp} />
    </div>
    </FoldersProvider>
  );
}
