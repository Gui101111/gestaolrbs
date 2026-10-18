"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ChevronRight, Clapperboard, FolderInput, FolderOpen, FolderPlus, MoreHorizontal, Palette, Plus, SearchX, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { Aurora } from "@/components/effects/aurora";
import { FolderDialog } from "@/components/folders/folder-dialog";
import { MoveDialog } from "@/components/folders/move-dialog";
import { folderColor } from "@/components/folders/folder-colors";
import { BrowserToolbar } from "@/components/projects-browser/browser-toolbar";
import { FolderCard, FolderDeleteDialog, useDropTarget, type FolderCardData } from "@/components/projects-browser/folder-card";
import { VideoCard } from "@/components/projects/video-card";
import { deleteProjectsAction } from "@/lib/actions/projects";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { ProjectListItem } from "@/services/projects/queries";

type Crumb = { id: string; name: string };

export function ProjectsBrowser({
  folder,
  path,
  subfolders,
  videos,
  view,
  searching,
  filtered,
}: {
  folder: { id: string; name: string; color: string; depth: number } | null;
  path: Crumb[];
  subfolders: FolderCardData[];
  videos: ProjectListItem[];
  view: "grade" | "lista";
  searching: boolean;
  filtered: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<string[]>([]);
  const [newFolder, setNewFolder] = React.useState(false);
  const [moveOpen, setMoveOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [pending, start] = React.useTransition();
  const depth = folder?.depth ?? 0;
  const canCreateFolder = depth < 3;

  // A seleção só vale para vídeos visíveis (filtros e navegação mudam a lista)
  const visibleSelected = selected.filter((id) => videos.some((v) => v.id === id));

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSelected([]);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const clear = () => setSelected([]);

  const removeSelected = () =>
    start(async () => {
      const res = await deleteProjectsAction(visibleSelected);
      if (!res.ok) return void toast.error(res.error);
      toast.success(res.data.deleted > 1 ? `${res.data.deleted} vídeos excluídos.` : "Vídeo excluído.");
      clear();
      setDeleteOpen(false);
      router.refresh();
    });

  const showFolders = !searching && subfolders.length > 0;
  const empty = videos.length === 0 && !showFolders;

  return (
    <div className="relative space-y-6 pt-2 pb-24">
      {path.length > 0 && <Breadcrumbs path={path} onMoved={clear} />}

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="flex min-w-0 items-center gap-3 text-3xl text-fg md:text-4xl">
          {folder && (
            <span className="size-3 shrink-0 rounded-full" style={{ background: folderColor(folder.color), boxShadow: `0 0 14px ${folderColor(folder.color)}` }} />
          )}
          <span className="truncate">{folder?.name ?? "Projetos"}</span>
        </h1>
        {folder && (
          <FolderHeaderMenu
            folder={{ ...folder, subfolders: subfolders.length }}
            parentHref={path.length > 1 ? ROUTES.folder(path[path.length - 2].id) : ROUTES.projects}
          />
        )}
      </div>

      <BrowserToolbar folderId={folder?.id ?? null} canCreateFolder={canCreateFolder} onNewFolder={() => setNewFolder(true)} view={view} />

      {searching && <p className="text-sm text-fg-3">Buscando em todas as pastas.</p>}

      {showFolders && (
        <section aria-label="Pastas">
          <h2 className="mb-3 px-1 font-sans text-[0.6875rem] font-bold tracking-[0.14em] text-fg-3 uppercase">Pastas</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {subfolders.map((f, i) => (
              <FolderCard key={f.id} folder={f} index={i} onMoved={clear} />
            ))}
          </div>
        </section>
      )}

      {empty ? (
        <EmptyBrowser folderId={folder?.id ?? null} filtered={filtered || searching} canCreateFolder={canCreateFolder} onNewFolder={() => setNewFolder(true)} />
      ) : videos.length > 0 ? (
        <section aria-label="Vídeos">
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="font-sans text-[0.6875rem] font-bold tracking-[0.14em] text-fg-3 uppercase">Vídeos · {videos.length}</h2>
            <button
              type="button"
              onClick={() => setSelected(visibleSelected.length === videos.length ? [] : videos.map((v) => v.id))}
              className="text-xs font-semibold text-fg-3 transition hover:text-cyan"
            >
              {visibleSelected.length === videos.length ? "Desmarcar todos" : "Selecionar todos"}
            </button>
          </div>
          <p className="mb-3 hidden px-1 text-xs text-fg-3 lg:block">Arraste vídeos para uma pasta. Clique com o botão direito para mais ações.</p>
          {view === "lista" ? (
            <div className="space-y-2">
              {videos.map((p) => (
                <VideoCard
                  key={p.id}
                  project={p}
                  layout="list"
                  selectable
                  selected={visibleSelected.includes(p.id)}
                  onToggleSelect={toggle}
                  draggable
                  dragIds={visibleSelected}
                />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {videos.map((p, i) => (
                <VideoCard
                  key={p.id}
                  project={p}
                  index={i}
                  selectable
                  selected={visibleSelected.includes(p.id)}
                  onToggleSelect={toggle}
                  draggable
                  dragIds={visibleSelected}
                />
              ))}
            </div>
          )}
        </section>
      ) : null}

      {/* Barra de seleção múltipla */}
      <AnimatePresence>
        {visibleSelected.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="glass-strong fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom,0px)+84px)] z-40 mx-auto flex max-w-xl items-center gap-2 rounded-full p-1.5 pl-4 shadow-[var(--shadow-pop)] lg:bottom-6"
            role="toolbar"
            aria-label="Ações da seleção"
          >
            <span className="text-sm font-semibold text-fg">
              {visibleSelected.length} {visibleSelected.length === 1 ? "selecionado" : "selecionados"}
            </span>
            <div className="ml-auto flex items-center gap-1">
              <Button variant="neon" size="sm" onClick={() => setMoveOpen(true)} aria-label="Mover para…">
                <FolderInput /> <span className="hidden sm:inline">Mover para…</span>
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)} aria-label="Excluir selecionados">
                <Trash2 /> <span className="hidden sm:inline">Excluir</span>
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={clear} aria-label="Limpar seleção">
                <X />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <FolderDialog open={newFolder} onOpenChange={setNewFolder} parentId={folder?.id ?? null} navigate={false} />
      <MoveDialog open={moveOpen} onOpenChange={setMoveOpen} ids={visibleSelected} currentFolderId={folder?.id ?? null} onDone={clear} />
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Excluir {visibleSelected.length} {visibleSelected.length === 1 ? "vídeo" : "vídeos"}?
            </AlertDialogTitle>
            <AlertDialogDescription>Os originais e as versões editadas serão removidos. Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => (e.preventDefault(), removeSelected())} disabled={pending}>
              Excluir definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** Ações da pasta aberta (renomear, excluir), ao lado do título. */
function FolderHeaderMenu({ folder, parentHref }: { folder: { id: string; name: string; color: string; subfolders: number }; parentHref: string }) {
  const [edit, setEdit] = React.useState(false);
  const [del, setDel] = React.useState(false);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Ações da pasta ${folder.name}`} className="data-[state=open]:bg-fg/[0.06] data-[state=open]:text-fg">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onSelect={() => setEdit(true)}>
            <Palette /> Renomear e cor
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setDel(true)}>
            <Trash2 /> Excluir pasta
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <FolderDialog key={`${folder.name}-${folder.color}`} open={edit} onOpenChange={setEdit} folder={folder} />
      <FolderDeleteDialog folder={folder} open={del} onOpenChange={setDel} redirectTo={parentHref} />
    </>
  );
}

function Breadcrumbs({ path, onMoved }: { path: Crumb[]; onMoved: () => void }) {
  const items: (Crumb & { href: string })[] = [
    { id: "", name: "Projetos", href: ROUTES.projects },
    ...path.map((c) => ({ ...c, href: ROUTES.folder(c.id) })),
  ];
  return (
    <nav aria-label="Caminho" className="flex flex-wrap items-center gap-1 text-sm">
      {items.map((c, i) => (
        <React.Fragment key={c.id || "root"}>
          {i > 0 && <ChevronRight className="size-3.5 text-fg-3" />}
          <CrumbLink crumb={c} last={i === items.length - 1} onMoved={onMoved} />
        </React.Fragment>
      ))}
    </nav>
  );
}

function CrumbLink({ crumb, last, onMoved }: { crumb: Crumb & { href: string }; last: boolean; onMoved: () => void }) {
  const { over, props } = useDropTarget(crumb.id || null, onMoved);
  return (
    <Link
      href={crumb.href}
      aria-current={last ? "page" : undefined}
      {...(last ? {} : props)}
      className={cn(
        "rounded-lg px-2 py-1 transition",
        last ? "font-semibold text-fg" : "text-fg-3 hover:bg-fg/[0.05] hover:text-fg",
        over && "bg-cyan/15 text-cyan shadow-[0_0_0_1px_var(--cyan)]",
      )}
    >
      {crumb.name}
    </Link>
  );
}

function EmptyBrowser({
  folderId,
  filtered,
  canCreateFolder,
  onNewFolder,
}: {
  folderId: string | null;
  filtered: boolean;
  canCreateFolder: boolean;
  onNewFolder: () => void;
}) {
  const Icon = filtered ? SearchX : folderId ? FolderOpen : Clapperboard;
  return (
    <div className="glass relative overflow-hidden rounded-[24px] px-6 py-14 text-center">
      <Aurora variant="subtle" interactive={false} />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative mx-auto grid size-16 place-items-center rounded-2xl border border-cyan/30 bg-cyan/[0.08] shadow-[var(--glow-cyan)]"
      >
        <Icon className="size-7 text-cyan" />
      </motion.div>
      <p className="relative mt-5 font-display text-xl text-fg">
        {filtered ? "Nada encontrado." : folderId ? "Pasta vazia." : "Nenhum vídeo ainda."}
      </p>
      <p className="relative mt-1 text-sm text-fg-2">
        {filtered ? "Ajuste a busca ou os filtros." : folderId ? "Crie um vídeo aqui ou arraste vídeos para esta pasta." : "Envie a primeira gravação."}
      </p>
      {!filtered && (
        <div className="relative mt-6 flex flex-wrap justify-center gap-2">
          <Button asChild variant="gold">
            <Link href={folderId ? `${ROUTES.newVideo}?pasta=${folderId}` : ROUTES.newVideo}>
              <Plus /> {folderId ? "Novo vídeo nesta pasta" : "Criar meu primeiro vídeo"}
            </Link>
          </Button>
          {canCreateFolder && (
            <Button variant="glass" onClick={onNewFolder}>
              <FolderPlus /> Nova pasta
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
