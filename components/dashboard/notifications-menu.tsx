"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { formatRelative, cn } from "@/lib/utils";
import type { Notification } from "@/types/domain";

export function NotificationsMenu({ userId, initial }: { userId: string; initial: Notification[] }) {
  const [items, setItems] = React.useState<Notification[]>(initial);
  const unread = items.filter((n) => !n.read_at).length;

  React.useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => setItems((prev) => [payload.new as Notification, ...prev].slice(0, 15)),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const markAll = async () => {
    const ids = items.filter((n) => !n.read_at).map((n) => n.id);
    if (!ids.length) return;
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })));
    await createClient().from("notifications").update({ read_at: now }).in("id", ids);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="relative grid size-10 place-items-center rounded-full border border-fg/[0.08] text-mist transition hover:border-gold/40 hover:text-ivory"
        aria-label={unread ? `Notificações (${unread} não lidas)` : "Notificações"}
      >
        <Bell className="size-[18px]" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full bg-gold px-1 text-[0.5625rem] font-bold text-on-gold shadow-[0_0_10px_rgba(198,161,91,0.8)]">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(92vw,22rem)] p-0">
        <div className="flex items-center justify-between border-b border-fg/[0.07] px-4 py-3">
          <p className="text-sm font-semibold">Notificações</p>
          <button type="button" onClick={markAll} className="flex items-center gap-1.5 text-xs text-gold hover:text-gold-light disabled:opacity-40" disabled={!unread}>
            <CheckCheck className="size-3.5" /> Marcar como lidas
          </button>
        </div>
        <div className="max-h-96 overflow-y-auto p-1.5" data-lenis-prevent>
          {items.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-mist">Nenhuma notificação por enquanto.</p>
          ) : (
            items.map((n) => (
              <Link
                key={n.id}
                href={n.link ?? "/app"}
                className={cn("flex gap-3 rounded-lg px-3 py-3 transition hover:bg-fg/[0.04]", !n.read_at && "bg-gold/[0.04]")}
              >
                <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read_at ? "bg-fg/15" : "bg-gold shadow-[0_0_8px_rgba(198,161,91,0.9)]")} />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-ivory">{n.title}</span>
                  {n.body && <span className="mt-0.5 block text-xs leading-relaxed text-mist">{n.body}</span>}
                  <span className="mt-1 block text-[0.6875rem] text-mist/60">{formatRelative(n.created_at)}</span>
                </span>
              </Link>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
