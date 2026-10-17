import "server-only";
import { createClient } from "@/lib/supabase/server";
import { folderPath } from "@/components/folders/folder-colors";
import { listFolderProjects } from "@/services/projects/queries";
import { param } from "@/lib/search-params";

type Sp = Record<string, string | string[] | undefined>;

/** Dados da tela Projetos (raiz ou pasta). Retorna null se a pasta não existir. */
export async function loadProjectsBrowser(userId: string, folderId: string | null, sp: Sp) {
  const supabase = await createClient();
  const [{ data: folders }, { data: refs }] = await Promise.all([
    supabase.from("folders").select("id, name, color, parent_id, position").eq("owner_id", userId),
    supabase.from("projects").select("folder_id").eq("user_id", userId).not("folder_id", "is", null),
  ]);
  const all = folders ?? [];
  const current = folderId ? all.find((f) => f.id === folderId) : null;
  if (folderId && !current) return null;

  const counts = new Map<string, number>();
  refs?.forEach((r) => r.folder_id && counts.set(r.folder_id, (counts.get(r.folder_id) ?? 0) + 1));

  const path = folderPath(all, folderId);
  const depth = path.length;
  const subfolders = all
    .filter((f) => f.parent_id === folderId)
    .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name, "pt-BR"))
    .map((f) => ({
      id: f.id,
      name: f.name,
      color: f.color,
      videos: counts.get(f.id) ?? 0,
      subfolders: all.filter((x) => x.parent_id === f.id).length,
      depth: depth + 1,
    }));

  const q = param(sp, "q")?.slice(0, 80) ?? "";
  const status = param(sp, "status");
  const format = param(sp, "formato");
  const area = param(sp, "area");
  const videos = await listFolderProjects({ userId, folderId, q, status, format, area, sort: param(sp, "ordem") });

  return {
    folder: current ? { id: current.id, name: current.name, color: current.color, depth } : null,
    path: path.map((f) => ({ id: f.id, name: f.name })),
    subfolders,
    videos,
    view: (param(sp, "vista") === "lista" ? "lista" : "grade") as "grade" | "lista",
    searching: Boolean(q),
    filtered: Boolean(status || format || area),
  };
}
