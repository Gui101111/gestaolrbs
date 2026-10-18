import { toast } from "sonner";
import { slugify } from "@/lib/utils";
import { saveVideo } from "@/lib/browser-editor/runtime";
import { db, getFile } from "../demo/db";

/**
 * /api/projects/:id/download na demonstração: acha o vídeo final guardado no
 * navegador e entrega pelo "Salvar" do claude.ai (ou download comum).
 */
export async function startDownload(href: string) {
  const u = new URL(href, "https://tribuna.local");
  const id = u.pathname.split("/")[3];
  const renderId = u.searchParams.get("render");
  const ratio = u.searchParams.get("ratio");
  const r = db
    .rows("renders")
    .filter((x) => x.project_id === id && (!renderId || x.id === renderId) && (!ratio || x.aspect_ratio === ratio))
    .sort((a, b) => Number(b.version) - Number(a.version))[0];
  const project = db.rows("projects").find((p) => p.id === id);
  const blob = r ? await getFile(`${r.bucket}/${r.storage_path}`) : null;
  if (!r || !blob) {
    toast.error("Este vídeo não está mais guardado neste navegador.");
    return;
  }
  const ext = String(r.storage_path).split(".").pop() || "mp4";
  const fileName = `${slugify(String(project?.name ?? "video")) || "video"}_${String(r.aspect_ratio).replace(":", "x")}_v${r.version}.${ext}`;
  const res = await saveVideo(blob, fileName);
  if (res === "saved" || res === "fallback") {
    toast.success(res === "saved" ? "Vídeo salvo." : "Baixando o vídeo.", { description: fileName });
    db.update("projects", (p) => p.id === id && !p.first_downloaded_at, { first_downloaded_at: new Date().toISOString() });
  } else if (typeof res === "object") toast.error(res.error);
}
