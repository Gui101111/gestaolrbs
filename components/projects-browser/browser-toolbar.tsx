"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FolderPlus, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/lib/routes";

/** Barra: Enviar vídeo · Nova pasta · busca por nome (na URL). */
export function BrowserToolbar({
  folderId,
  canCreateFolder,
  onNewFolder,
}: {
  folderId: string | null;
  canCreateFolder: boolean;
  onNewFolder: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [q, setQ] = React.useState(sp.get("q") ?? "");

  React.useEffect(() => {
    const t = window.setTimeout(() => {
      if ((sp.get("q") ?? "") === q) return;
      const params = new URLSearchParams(sp.toString());
      if (q) params.set("q", q);
      else params.delete("q");
      router.replace(`${pathname}${params.size ? `?${params}` : ""}`, { scroll: false });
    }, 350);
    return () => window.clearTimeout(t);
  }, [q, pathname, router, sp]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex gap-2">
        <Button variant="gold" asChild className="flex-1 sm:flex-none">
          <Link href={folderId ? `${ROUTES.newVideo}?pasta=${folderId}` : ROUTES.newVideo}>
            <Plus /> Enviar vídeo
          </Link>
        </Button>
        {canCreateFolder && (
          <Button variant="glass" onClick={onNewFolder} className="flex-1 sm:flex-none">
            <FolderPlus /> Nova pasta
          </Button>
        )}
      </div>

      <div className="relative min-w-0 flex-1 sm:ml-auto sm:max-w-72">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-fg-3" />
        <Input
          id="projects-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar vídeos"
          className="h-11 rounded-full pr-11 pl-11"
          aria-label="Buscar vídeos por nome"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            className="absolute top-1/2 right-1 grid size-10 -translate-y-1/2 place-items-center rounded-full text-fg-3 hover:text-fg"
            aria-label="Limpar busca"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}
