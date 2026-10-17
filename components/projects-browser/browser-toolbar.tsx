"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FolderPlus, LayoutGrid, List, ListFilter, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ASPECT_RATIOS, LEGAL_AREAS, PROJECT_SORTS, STATUS_GROUPS } from "@/lib/constants/domain";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

/** Barra: Nova pasta · Novo vídeo · busca · filtros · ordenar · grade/lista (tudo na URL). */
export function BrowserToolbar({
  folderId,
  canCreateFolder,
  onNewFolder,
  view,
}: {
  folderId: string | null;
  canCreateFolder: boolean;
  onNewFolder: () => void;
  view: "grade" | "lista";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [q, setQ] = React.useState(sp.get("q") ?? "");

  const push = React.useCallback(
    (patch: Record<string, string | null>) => {
      const params = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v) params.set(k, v);
        else params.delete(k);
      }
      router.replace(`${pathname}${params.size ? `?${params}` : ""}`, { scroll: false });
    },
    [pathname, router, sp],
  );

  React.useEffect(() => {
    const t = window.setTimeout(() => {
      if ((sp.get("q") ?? "") !== q) push({ q: q || null });
    }, 350);
    return () => window.clearTimeout(t);
  }, [q, push, sp]);

  const status = sp.get("status");
  const format = sp.get("formato");
  const area = sp.get("area");
  const activeFilters = [status, format, area].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="flex gap-2">
        <Button variant="gold" asChild>
          <Link href={folderId ? `${ROUTES.newVideo}?pasta=${folderId}` : ROUTES.newVideo}>
            <Plus /> Novo vídeo
          </Link>
        </Button>
        {canCreateFolder && (
          <Button variant="glass" onClick={onNewFolder}>
            <FolderPlus /> Nova pasta
          </Button>
        )}
      </div>

      <div className="flex flex-1 flex-wrap items-center gap-2 lg:justify-end">
        <div className="relative min-w-0 flex-1 lg:max-w-72">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-fg-3" />
          <Input
            id="projects-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar vídeos"
            className="h-11 rounded-full pr-10 pl-11"
            aria-label="Buscar vídeos por nome"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1 text-fg-3 hover:text-fg"
              aria-label="Limpar busca"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="glass" className={cn("h-11", activeFilters && "border-cyan/50 text-cyan")}>
              <ListFilter /> Filtros
              {activeFilters > 0 && <span className="grid size-5 place-items-center rounded-full bg-cyan text-[0.625rem] font-bold text-[#06222a]">{activeFilters}</span>}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-[70vh] w-64 overflow-y-auto" data-lenis-prevent>
            <DropdownMenuLabel>Status</DropdownMenuLabel>
            {STATUS_GROUPS.map((g) => (
              <Check key={g.value} active={status === g.value} onSelect={() => push({ status: status === g.value ? null : g.value })}>
                {g.label}
              </Check>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Formato</DropdownMenuLabel>
            {ASPECT_RATIOS.map((r) => (
              <Check key={r.value} active={format === r.value} onSelect={() => push({ formato: format === r.value ? null : r.value })}>
                {r.value} · {r.label}
              </Check>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Área do Direito</DropdownMenuLabel>
            {LEGAL_AREAS.map((a) => (
              <Check key={a.value} active={area === a.value} onSelect={() => push({ area: area === a.value ? null : a.value })}>
                {a.label}
              </Check>
            ))}
            {activeFilters > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => push({ status: null, formato: null, area: null })}>
                  <X /> Limpar filtros
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Select value={sp.get("ordem") ?? "recentes"} onValueChange={(v) => push({ ordem: v === "recentes" ? null : v })}>
          <SelectTrigger className="h-11 w-auto min-w-40 rounded-full" aria-label="Ordenar">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {PROJECT_SORTS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="glass flex h-11 items-center rounded-full p-1" role="radiogroup" aria-label="Visualização">
          {(
            [
              { v: "grade", icon: LayoutGrid, label: "Grade" },
              { v: "lista", icon: List, label: "Lista" },
            ] as const
          ).map((o) => (
            <button
              key={o.v}
              type="button"
              role="radio"
              aria-checked={view === o.v}
              aria-label={o.label}
              onClick={() => push({ vista: o.v === "grade" ? null : o.v })}
              className={cn(
                "grid size-9 place-items-center rounded-full transition-all duration-300",
                view === o.v ? "bg-surface text-cyan shadow-[0_0_0_1px_color-mix(in_oklab,var(--cyan)_40%,transparent)]" : "text-fg-3 hover:text-fg",
              )}
            >
              <o.icon className="size-4" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Check({ active, onSelect, children }: { active: boolean; onSelect: () => void; children: React.ReactNode }) {
  return (
    <DropdownMenuItem onSelect={(e) => (e.preventDefault(), onSelect())} className={cn(active && "text-cyan")}>
      <span className={cn("grid size-4 place-items-center rounded border", active ? "border-cyan bg-cyan" : "border-line-strong")}>
        {active && <span className="size-1.5 rounded-full bg-[#06222a]" />}
      </span>
      {children}
    </DropdownMenuItem>
  );
}
