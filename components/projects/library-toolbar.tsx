"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LIBRARY_FILTERS } from "@/lib/constants/domain";

export function LibraryToolbar({ counts }: { counts: Record<string, number> }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [q, setQ] = React.useState(sp.get("q") ?? "");
  const filter = sp.get("filtro") ?? "all";

  const push = React.useCallback(
    (next: { q?: string; filtro?: string }) => {
      const params = new URLSearchParams(sp.toString());
      if (next.q !== undefined) {
        if (next.q) params.set("q", next.q);
        else params.delete("q");
      }
      if (next.filtro !== undefined) {
        if (next.filtro !== "all") params.set("filtro", next.filtro);
        else params.delete("filtro");
      }
      router.replace(`${pathname}${params.size ? `?${params}` : ""}`, { scroll: false });
    },
    [pathname, router, sp],
  );

  React.useEffect(() => {
    const t = window.setTimeout(() => {
      if ((sp.get("q") ?? "") !== q) push({ q });
    }, 350);
    return () => window.clearTimeout(t);
  }, [q, push, sp]);

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <Tabs value={filter} onValueChange={(v) => push({ filtro: v })}>
        <TabsList>
          {LIBRARY_FILTERS.map((f) => (
            <TabsTrigger key={f.value} value={f.value}>
              {f.label}
              <span className="rounded-full bg-fg/10 px-1.5 text-[0.625rem] tabular-nums">{counts[f.value] ?? 0}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <div className="relative w-full md:w-72">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-mist" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome" className="h-11 rounded-full pr-10 pl-11" aria-label="Buscar projetos por nome" />
        {q && (
          <button type="button" onClick={() => setQ("")} className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1 text-mist hover:text-ivory" aria-label="Limpar busca">
            <X className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}
