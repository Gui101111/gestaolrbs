"use client";

import * as React from "react";
import type { FolderItem } from "@/components/app-shell/nav";

const FoldersContext = React.createContext<FolderItem[]>([]);

/** Pastas do usuário disponíveis para menus "Mover para…" e destinos de arrastar. */
export function FoldersProvider({ folders, children }: { folders: FolderItem[]; children: React.ReactNode }) {
  return <FoldersContext.Provider value={folders}>{children}</FoldersContext.Provider>;
}

export function useFolders() {
  return React.useContext(FoldersContext);
}
