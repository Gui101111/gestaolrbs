"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderOpen, LayoutDashboard, Menu, Plus, UserRound } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Logo } from "@/components/brand/logo";
import { ADMIN_NAV_ITEM, APP_NAV, isActive } from "@/components/dashboard/nav-items";
import { cn } from "@/lib/utils";

export function BottomNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => setOpen(false), [pathname]);

  const items = [
    { href: "/app", label: "Início", icon: LayoutDashboard, exact: true },
    { href: "/app/biblioteca", label: "Biblioteca", icon: FolderOpen },
    { href: "/app/projetos/novo", label: "Novo", icon: Plus, center: true },
    { href: "/app/perfil", label: "Perfil", icon: UserRound },
  ];

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.07] bg-ink/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
        aria-label="Navegação inferior"
      >
        <div className="mx-auto grid max-w-md grid-cols-5 items-end px-2 pt-2 pb-2">
          {items.slice(0, 2).map((item) => (
            <NavButton key={item.href} {...item} active={isActive(pathname, item.href, item.exact)} />
          ))}
          <div className="flex justify-center">
            <Link
              href="/app/projetos/novo"
              aria-label="Novo projeto"
              className="-mt-7 grid size-14 place-items-center rounded-full bg-gold-gradient text-ink shadow-[0_10px_30px_-8px_rgba(198,161,91,0.9),0_0_0_6px_#07090c] transition-transform active:scale-95"
            >
              <Plus className="size-6" strokeWidth={2.5} />
            </Link>
          </div>
          <NavButton href="/app/perfil" label="Perfil" icon={UserRound} active={isActive(pathname, "/app/perfil")} />
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex flex-col items-center gap-1 rounded-xl py-1.5 text-[0.625rem] font-medium text-mist"
            aria-label="Mais opções"
          >
            <Menu className="size-5" />
            Mais
          </button>
        </div>
      </nav>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="px-5 pt-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SheetDescription className="sr-only">Navegação do painel</SheetDescription>
          <Logo href="/app" />
          <div className="mt-5 grid grid-cols-2 gap-2">
            {[...APP_NAV, ...(isAdmin ? [ADMIN_NAV_ITEM] : [])].map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href, "exact" in item ? item.exact : false);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-sm transition",
                    active ? "border-gold/40 bg-gold/10 text-gold-light" : "border-white/[0.07] bg-white/[0.02] text-ivory/85",
                  )}
                >
                  <Icon className="size-4 text-gold" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function NavButton({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center gap-1 rounded-xl py-1.5 text-[0.625rem] font-medium transition-colors",
        active ? "text-gold-light" : "text-mist",
      )}
      aria-current={active ? "page" : undefined}
    >
      <Icon className="size-5" />
      {label}
    </Link>
  );
}
