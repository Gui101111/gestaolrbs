"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ChevronRight, Folder } from "lucide-react";
import { buildFolderTree, folderColor, type FolderNode } from "@/components/folders/folder-colors";
import type { FolderItem } from "@/components/app-shell/nav";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

/** Árvore de pastas do painel (até 3 níveis), recolhível por nível. */
export function FolderTree({ folders, onNavigate }: { folders: FolderItem[]; onNavigate?: () => void }) {
  const tree = React.useMemo(() => buildFolderTree(folders), [folders]);
  const pathname = usePathname();
  if (!folders.length) return <p className="px-3 py-2 text-xs text-fg-3">Nenhuma pasta ainda.</p>;
  return (
    <ul className="space-y-0.5">
      {tree.map((n) => (
        <TreeNode key={n.id} node={n} pathname={pathname} onNavigate={onNavigate} />
      ))}
    </ul>
  );
}

function TreeNode({ node, pathname, onNavigate }: { node: FolderNode<FolderItem>; pathname: string; onNavigate?: () => void }) {
  const href = ROUTES.folder(node.id);
  const active = pathname === href;
  const [open, setOpen] = React.useState(true);
  const hasChildren = node.children.length > 0;

  return (
    <li>
      <div className={cn("group flex items-center rounded-xl transition-colors", active ? "bg-cyan/[0.08] text-fg" : "text-fg-2 hover:bg-fg/[0.05] hover:text-fg")}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Recolher" : "Expandir"}
          className={cn("grid size-7 shrink-0 place-items-center rounded-lg text-fg-3", !hasChildren && "invisible")}
          style={{ marginLeft: (node.depth - 1) * 12 }}
        >
          <ChevronRight className={cn("size-3.5 transition-transform duration-300", open && "rotate-90")} />
        </button>
        <Link href={href} onClick={onNavigate} className="flex min-w-0 flex-1 items-center gap-2 py-1.5 pr-2 text-sm">
          <Folder className="size-4 shrink-0" style={{ color: folderColor(node.color) }} />
          <span className="truncate">{node.name}</span>
          <span className="ml-auto text-[0.6875rem] text-fg-3 tabular-nums">{node.count}</span>
        </Link>
      </div>
      <AnimatePresence initial={false}>
        {hasChildren && open && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-0.5 overflow-hidden"
          >
            {node.children.map((c) => (
              <TreeNode key={c.id} node={c} pathname={pathname} onNavigate={onNavigate} />
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </li>
  );
}
