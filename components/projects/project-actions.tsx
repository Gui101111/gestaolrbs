"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ContextMenu as ContextMenuPrimitive } from "radix-ui";
import { Download, Eye, FolderInput, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MoveDialog } from "@/components/folders/move-dialog";
import { deleteProjectAction, renameProjectAction } from "@/lib/actions/projects";
import { ROUTES } from "@/lib/routes";
import { startDownload } from "@/lib/download";
import { cn } from "@/lib/utils";

export function useProjectMutations() {
  const router = useRouter();
  const [pending, start] = React.useTransition();

  const rename = (id: string, name: string, done?: () => void) =>
    start(async () => {
      const res = await renameProjectAction(id, name);
      if (!res.ok) return void toast.error(res.error);
      toast.success("Vídeo renomeado.");
      done?.();
      router.refresh();
    });

  const remove = (id: string, redirectTo?: string) =>
    start(async () => {
      const res = await deleteProjectAction(id);
      if (!res.ok) return void toast.error(res.error);
      toast.success("Vídeo excluído.");
      if (redirectTo) router.replace(redirectTo);
      router.refresh();
    });

  return { pending, rename, remove };
}

type ActionTarget = {
  id: string;
  name: string;
  status: string;
  canDownload: boolean;
  folderId?: string | null;
  /** Na própria página do vídeo: sem "Abrir" e, ao excluir, volta para Projetos. */
  inPage?: boolean;
};

type Item =
  | { kind: "link"; label: string; icon: React.ComponentType; href: string; download?: boolean }
  | { kind: "action"; label: string; icon: React.ComponentType; onSelect: () => void; destructive?: boolean; disabled?: boolean }
  | { kind: "separator" };

/** Itens do menu do vídeo + diálogos (renomear, mover, excluir), para menu suspenso e menu de contexto. */
function useProjectActionItems(t: ActionTarget) {
  const [renameOpen, setRenameOpen] = React.useState(false);
  const [moveOpen, setMoveOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [value, setValue] = React.useState(t.name);
  const { pending, rename, remove } = useProjectMutations();
  const href = t.status === "draft" ? `${ROUTES.newVideo}?id=${t.id}` : ROUTES.video(t.id);

  const items: Item[] = [
    ...(t.inPage ? [] : [{ kind: "link" as const, label: t.status === "draft" ? "Continuar envio" : "Abrir", icon: Eye, href }]),
    ...(t.canDownload ? [{ kind: "link" as const, label: "Baixar MP4", icon: Download, href: `/api/projects/${t.id}/download`, download: true }] : []),
    {
      kind: "action",
      label: "Renomear",
      icon: Pencil,
      onSelect: () => {
        setValue(t.name);
        setRenameOpen(true);
      },
    },
    { kind: "action", label: "Mover para…", icon: FolderInput, onSelect: () => setMoveOpen(true) },
    { kind: "separator" },
    { kind: "action", label: "Excluir", icon: Trash2, onSelect: () => setDeleteOpen(true), destructive: true },
  ];

  const dialogs = (
    <>
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Renomear vídeo</DialogTitle>
            <DialogDescription>O nome aparece nos projetos e nos arquivos baixados.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              rename(t.id, value, () => setRenameOpen(false));
            }}
            className="space-y-5"
          >
            <Input id={`rename-${t.id}`} value={value} onChange={(e) => setValue(e.target.value)} maxLength={140} autoFocus aria-label="Nome do vídeo" />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setRenameOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="gold" loading={pending}>
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <MoveDialog open={moveOpen} onOpenChange={setMoveOpen} ids={[t.id]} currentFolderId={t.folderId ?? null} />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir “{t.name}”?</AlertDialogTitle>
            <AlertDialogDescription>O vídeo original e as versões editadas serão removidos. Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => remove(t.id, t.inPage ? ROUTES.projects : undefined)}>Excluir definitivamente</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  return { items, dialogs };
}

/** Menu suspenso (botão "…") de um vídeo. */
export function ProjectActionsMenu({ triggerClassName, ...t }: ActionTarget & { triggerClassName?: string }) {
  const { items, dialogs } = useProjectActionItems(t);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={
            triggerClassName ??
            "relative grid size-9 place-items-center rounded-full border border-white/20 bg-black/45 text-white backdrop-blur transition after:absolute after:-inset-0.5 after:content-[''] hover:border-cyan/60 data-[state=open]:border-cyan/60"
          }
          aria-label={`Ações do vídeo ${t.name}`}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          {items.map((it, i) =>
            it.kind === "separator" ? (
              <DropdownMenuSeparator key={i} />
            ) : it.kind === "link" ? (
              <DropdownMenuItem key={i} asChild>
                {it.download ? (
                  <a href={it.href}>
                    <it.icon /> {it.label}
                  </a>
                ) : (
                  <Link href={it.href}>
                    <it.icon /> {it.label}
                  </Link>
                )}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem key={i} onSelect={it.onSelect} disabled={it.disabled} variant={it.destructive ? "destructive" : "default"}>
                <it.icon /> {it.label}
              </DropdownMenuItem>
            ),
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {dialogs}
    </>
  );
}

const ctxItem =
  "relative flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm outline-none select-none transition-colors focus:bg-fg/[0.07] focus:text-fg data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:size-4 [&_svg]:text-fg-3";

/** Menu de contexto (botão direito) com as mesmas ações do menu suspenso. */
export function ProjectContextMenu({ children, ...t }: ActionTarget & { children: React.ReactNode }) {
  const { items, dialogs } = useProjectActionItems(t);
  const router = useRouter();
  return (
    <>
      <ContextMenuPrimitive.Root>
        <ContextMenuPrimitive.Trigger asChild>{children}</ContextMenuPrimitive.Trigger>
        <ContextMenuPrimitive.Portal>
          <ContextMenuPrimitive.Content className="z-50 min-w-48 overflow-hidden rounded-2xl border border-line bg-popover/95 p-1.5 text-fg shadow-[var(--shadow-pop)] backdrop-blur-xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
            {items.map((it, i) =>
              it.kind === "separator" ? (
                <ContextMenuPrimitive.Separator key={i} className="-mx-1.5 my-1.5 h-px bg-line" />
              ) : (
                <ContextMenuPrimitive.Item
                  key={i}
                  disabled={it.kind === "action" ? it.disabled : false}
                  onSelect={() => {
                    if (it.kind === "link") {
                      if (it.download) startDownload(it.href);
                      else router.push(it.href);
                    } else it.onSelect();
                  }}
                  className={cn(ctxItem, it.kind === "action" && it.destructive && "text-destructive focus:bg-destructive/10 focus:text-destructive [&_svg]:text-destructive")}
                >
                  <it.icon /> {it.label}
                </ContextMenuPrimitive.Item>
              ),
            )}
          </ContextMenuPrimitive.Content>
        </ContextMenuPrimitive.Portal>
      </ContextMenuPrimitive.Root>
      {dialogs}
    </>
  );
}
