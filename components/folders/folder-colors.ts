export const FOLDER_COLORS = [
  { value: "gold", label: "Dourado", css: "var(--gold)" },
  { value: "cyan", label: "Ciano", css: "var(--cyan)" },
  { value: "blue", label: "Azul", css: "var(--azure)" },
  { value: "violet", label: "Violeta", css: "var(--violet)" },
  { value: "mint", label: "Menta", css: "var(--mint)" },
  { value: "gray", label: "Cinza", css: "var(--fg-3)" },
] as const;

export type FolderColor = (typeof FOLDER_COLORS)[number]["value"];

export function folderColor(value: string | null | undefined) {
  return FOLDER_COLORS.find((c) => c.value === value)?.css ?? "var(--gold)";
}

export const MAX_FOLDER_DEPTH = 3;

export type FolderNode<T extends { id: string; parent_id: string | null; position: number; name: string }> = T & {
  children: FolderNode<T>[];
  depth: number;
};

/** Monta a árvore de pastas a partir da lista plana. */
export function buildFolderTree<T extends { id: string; parent_id: string | null; position: number; name: string }>(items: T[]) {
  const byParent = new Map<string | null, T[]>();
  for (const f of items) {
    const list = byParent.get(f.parent_id) ?? [];
    list.push(f);
    byParent.set(f.parent_id, list);
  }
  const build = (parent: string | null, depth: number): FolderNode<T>[] =>
    (byParent.get(parent) ?? [])
      .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name, "pt-BR"))
      .map((f) => ({ ...f, depth, children: depth < 10 ? build(f.id, depth + 1) : [] }));
  return build(null, 1);
}

/** Caminho da raiz até a pasta (para o breadcrumb). */
export function folderPath<T extends { id: string; parent_id: string | null }>(items: T[], id: string | null) {
  const byId = new Map(items.map((f) => [f.id, f]));
  const path: T[] = [];
  let cur = id ? byId.get(id) : undefined;
  let guard = 0;
  while (cur && guard++ < 10) {
    path.unshift(cur);
    cur = cur.parent_id ? byId.get(cur.parent_id) : undefined;
  }
  return path;
}
