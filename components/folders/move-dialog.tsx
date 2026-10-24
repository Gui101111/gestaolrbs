"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Folder, FolderRoot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { buildFolderTree, folderColor, type FolderNode } from "@/components/folders/folder-colors";
import { useFolders } from "@/components/folders/folders-context";
import type { FolderItem } from "@/components/app-shell/nav";
import { moveProjectsAction } from "@/lib/actions/folders";
import { cn } from "@/lib/utils";

/** "Mover para…": escolhe a pasta de destino de um ou mais vídeos. */
export function MoveDialog({
  open,
  onOpenChange,
  ids,
  currentFolderId,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ids: string[];
  currentFolderId?: string | null;
  onDone?: () => void;
}) {
  const folders = useFolders();
  const tree = React.useMemo(() => buildFolderTree(folders), [folders]);
  const router = useRouter();
  const [target, setTarget] = React.useState<string | null>(currentFolderId ?? null);
  const [pending, start] = React.useTransition();

  const flat: FolderNode<FolderItem>[] = [];
  const walk = (nodes: FolderNode<FolderItem>[]) => nodes.forEach((n) => (flat.push(n), walk(n.children)));
  walk(tree);

  const submit = () =>
    start(async () => {
      const res = await moveProjectsAction(ids, target);
      if (!res.ok) return void toast.error(res.error);
      toast.success(ids.length > 1 ? `${ids.length} vídeos movidos.` : "Vídeo movido.");
      onOpenChange(false);
      onDone?.();
      router.refresh();
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Mover para…</DialogTitle>
          <DialogDescription>{ids.length > 1 ? `${ids.length} vídeos selecionados.` : "Escolha a pasta de destino."}</DialogDescription>
        </DialogHeader>
        <div className="max-h-72 space-y-1 overflow-y-auto" role="radiogroup" aria-label="Pasta de destino" data-lenis-prevent>
          <Option active={target === null} onClick={() => setTarget(null)} depth={1}>
            <FolderRoot className="size-4 text-fg-2" /> Projetos (sem pasta)
          </Option>
          {flat.map((f) => (
            <Option key={f.id} active={target === f.id} onClick={() => setTarget(f.id)} depth={f.depth + 1}>
              <Folder className="size-4" style={{ color: folderColor(f.color) }} /> {f.name}
            </Option>
          ))}
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" variant="gold" loading={pending} onClick={submit} disabled={target === (currentFolderId ?? null)}>
            Mover
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Option({ active, onClick, depth, children }: { active: boolean; onClick: () => void; depth: number; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      style={{ paddingLeft: 12 + (depth - 1) * 16 }}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xl py-2.5 pr-3 text-left text-sm transition",
        active ? "bg-cyan/[0.1] text-fg shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--cyan)_45%,transparent)]" : "text-fg-2 hover:bg-fg/[0.05] hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}
