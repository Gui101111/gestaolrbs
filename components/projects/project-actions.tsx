"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Download, Eye, FolderInput, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
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
import { deleteProjectAction, duplicateProjectAction, renameProjectAction } from "@/lib/actions/projects";
import { MoveDialog } from "@/components/folders/move-dialog";
import { ROUTES } from "@/lib/routes";

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

  const duplicate = (id: string, asVersion = false) =>
    start(async () => {
      const res = await duplicateProjectAction(id, asVersion);
      if (!res.ok) return void toast.error(res.error);
      toast.success(asVersion ? "Nova versão criada. Ajuste e envie." : "Briefing duplicado como rascunho.");
      router.push(`${ROUTES.newVideo}?id=${res.data.id}`);
    });

  const remove = (id: string, redirectTo?: string) =>
    start(async () => {
      const res = await deleteProjectAction(id);
      if (!res.ok) return void toast.error(res.error);
      toast.success("Vídeo excluído.");
      if (redirectTo) router.replace(redirectTo);
      router.refresh();
    });

  return { pending, rename, duplicate, remove };
}

export function ProjectActionsMenu({
  id,
  name,
  status,
  canDownload,
  triggerClassName,
  folderId = null,
}: {
  id: string;
  name: string;
  status: string;
  canDownload: boolean;
  triggerClassName?: string;
  folderId?: string | null;
}) {
  const [renameOpen, setRenameOpen] = React.useState(false);
  const [moveOpen, setMoveOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [value, setValue] = React.useState(name);
  const { pending, rename, duplicate, remove } = useProjectMutations();
  const href = status === "draft" ? `${ROUTES.newVideo}?id=${id}` : ROUTES.video(id);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={
            triggerClassName ??
            "grid size-8 place-items-center rounded-full border border-white/20 bg-black/45 text-white backdrop-blur transition hover:border-cyan/60"
          }
          aria-label={`Ações do vídeo ${name}`}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem asChild>
            <Link href={href}>
              <Eye /> {status === "draft" ? "Continuar edição" : "Visualizar"}
            </Link>
          </DropdownMenuItem>
          {canDownload && (
            <DropdownMenuItem asChild>
              <a href={`/api/projects/${id}/download`}>
                <Download /> Baixar MP4
              </a>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onSelect={() => {
              setValue(name);
              setRenameOpen(true);
            }}
          >
            <Pencil /> Renomear
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setMoveOpen(true)}>
            <FolderInput /> Mover para…
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => duplicate(id)} disabled={pending}>
            <Copy /> Duplicar briefing
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
            <Trash2 /> Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Renomear vídeo</DialogTitle>
            <DialogDescription>O nome aparece nos projetos e nos arquivos baixados.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              rename(id, value, () => setRenameOpen(false));
            }}
            className="space-y-5"
          >
            <Input value={value} onChange={(e) => setValue(e.target.value)} maxLength={140} autoFocus aria-label="Nome do vídeo" />
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

      <MoveDialog open={moveOpen} onOpenChange={setMoveOpen} ids={[id]} currentFolderId={folderId} />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir “{name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              O vídeo original e as versões editadas serão removidos. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => remove(id)}>Excluir definitivamente</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
