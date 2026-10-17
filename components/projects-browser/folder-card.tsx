"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ContextMenu as ContextMenuPrimitive } from "radix-ui";
import { Folder, FolderOpen, FolderPlus, MoreHorizontal, Palette, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FolderDialog } from "@/components/folders/folder-dialog";
import { folderColor } from "@/components/folders/folder-colors";
import { DRAG_MIME } from "@/components/projects/video-card";
import { deleteFolderAction, moveProjectsAction } from "@/lib/actions/folders";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

export type FolderCardData = { id: string; name: string; color: string; videos: number; subfolders: number; depth: number };

/** Lê os ids de vídeos arrastados. */
export function readDragIds(e: React.DragEvent): string[] | null {
  const raw = e.dataTransfer.getData(DRAG_MIME);
  if (!raw) return null;
  try {
    const ids = JSON.parse(raw);
    return Array.isArray(ids) ? ids.filter((x) => typeof x === "string") : null;
  } catch {
    return null;
  }
}

/** Hook de destino de arrastar: realça em neon e move os vídeos soltos. */
export function useDropTarget(folderId: string | null, onMoved?: () => void) {
  const router = useRouter();
  const [over, setOver] = React.useState(false);
  const props = {
    onDragOver: (e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes(DRAG_MIME)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (!over) setOver(true);
    },
    onDragLeave: () => setOver(false),
    onDrop: async (e: React.DragEvent) => {
      setOver(false);
      const ids = readDragIds(e);
      if (!ids?.length) return;
      e.preventDefault();
      const res = await moveProjectsAction(ids, folderId);
      if (!res.ok) return void toast.error(res.error);
      toast.success(ids.length > 1 ? `${ids.length} vídeos movidos.` : "Vídeo movido.");
      onMoved?.();
      router.refresh();
    },
  };
  return { over, props };
}

export function FolderCard({ folder, index, onMoved }: { folder: FolderCardData; index: number; onMoved?: () => void }) {
  const { over, props } = useDropTarget(folder.id, onMoved);
  const router = useRouter();
  const [edit, setEdit] = React.useState(false);
  const [sub, setSub] = React.useState(false);
  const [del, setDel] = React.useState(false);
  const [pending, start] = React.useTransition();
  const color = folderColor(folder.color);
  const canNest = folder.depth < 3;

  const remove = () =>
    start(async () => {
      const res = await deleteFolderAction(folder.id);
      if (!res.ok) return void toast.error(res.error);
      toast.success("Pasta excluída. Os vídeos voltaram para Projetos.");
      router.refresh();
    });

  const items = [
    { label: "Abrir", icon: FolderOpen, onSelect: () => router.push(ROUTES.folder(folder.id)) },
    { label: "Renomear e cor", icon: Palette, onSelect: () => setEdit(true) },
    ...(canNest ? [{ label: "Nova subpasta", icon: FolderPlus, onSelect: () => setSub(true) }] : []),
  ];

  return (
    <>
      <ContextMenuPrimitive.Root>
        <ContextMenuPrimitive.Trigger asChild>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: Math.min(index * 0.04, 0.3), ease: [0.22, 1, 0.36, 1] }}
            {...props}
            className={cn(
              "group relative rounded-[20px] border bg-surface/70 transition-all duration-300",
              over ? "scale-[1.03] border-cyan shadow-[0_0_0_1px_var(--cyan),0_0_32px_-6px_var(--cyan)]" : "border-line hover:-translate-y-0.5 hover:border-line-strong",
            )}
          >
            <Link href={ROUTES.folder(folder.id)} className="flex items-center gap-3 p-4 pr-12">
              <span className="relative grid size-11 shrink-0 place-items-center rounded-2xl" style={{ background: `color-mix(in oklab, ${color} 14%, transparent)` }}>
                {over ? <FolderOpen className="size-5" style={{ color }} /> : <Folder className="size-5" style={{ color }} />}
                <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full" style={{ background: color, boxShadow: `0 0 10px ${color}` }} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-fg">{folder.name}</span>
                <span className="block text-xs text-fg-3">
                  {folder.videos} {folder.videos === 1 ? "vídeo" : "vídeos"}
                  {folder.subfolders > 0 && ` · ${folder.subfolders} ${folder.subfolders === 1 ? "pasta" : "pastas"}`}
                </span>
              </span>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger
                className="absolute top-1/2 right-3 grid size-8 -translate-y-1/2 place-items-center rounded-full text-fg-3 transition hover:bg-fg/[0.08] hover:text-fg md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
                aria-label={`Ações da pasta ${folder.name}`}
              >
                <MoreHorizontal className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {items.map((it) => (
                  <DropdownMenuItem key={it.label} onSelect={it.onSelect}>
                    <it.icon /> {it.label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => setDel(true)}>
                  <Trash2 /> Excluir pasta
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </motion.div>
        </ContextMenuPrimitive.Trigger>
        <ContextMenuPrimitive.Portal>
          <ContextMenuPrimitive.Content className="z-50 min-w-48 rounded-2xl border border-line bg-popover/95 p-1.5 text-fg shadow-[var(--shadow-pop)] backdrop-blur-xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
            {items.map((it) => (
              <ContextMenuPrimitive.Item
                key={it.label}
                onSelect={it.onSelect}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm outline-none focus:bg-fg/[0.07] [&_svg]:size-4 [&_svg]:text-fg-3"
              >
                <it.icon /> {it.label}
              </ContextMenuPrimitive.Item>
            ))}
            <ContextMenuPrimitive.Separator className="-mx-1.5 my-1.5 h-px bg-line" />
            <ContextMenuPrimitive.Item
              onSelect={() => setDel(true)}
              className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-destructive outline-none focus:bg-destructive/10 [&_svg]:size-4"
            >
              <Trash2 /> Excluir pasta
            </ContextMenuPrimitive.Item>
          </ContextMenuPrimitive.Content>
        </ContextMenuPrimitive.Portal>
      </ContextMenuPrimitive.Root>

      <FolderDialog open={edit} onOpenChange={setEdit} folder={folder} />
      <FolderDialog open={sub} onOpenChange={setSub} parentId={folder.id} navigate={false} />
      <AlertDialog open={del} onOpenChange={setDel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir a pasta “{folder.name}”?</AlertDialogTitle>
            <AlertDialogDescription>As subpastas também serão excluídas. Os vídeos não são apagados: voltam para Projetos.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={remove} disabled={pending}>
              Excluir pasta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
