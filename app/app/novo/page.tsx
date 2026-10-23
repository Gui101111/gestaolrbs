import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, Folder } from "lucide-react";
import { Aurora } from "@/components/effects/aurora";
import { QuickUpload, type DraftVideo } from "@/components/upload/quick-upload";
import { requireOnboardedProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { BUCKETS } from "@/lib/constants/domain";
import { ROUTES } from "@/lib/routes";
import { param, type SearchParams } from "@/lib/search-params";
import { getUploadLimits } from "@/services/projects/queries";
import { signedUrl } from "@/services/storage";

export const metadata: Metadata = { title: "Enviar vídeo" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Enviar vídeo: a mesma tela única do Início (o + do celular abre aqui). */
export default async function NewVideoPage({ searchParams }: { searchParams: SearchParams }) {
  const { user } = await requireOnboardedProfile();
  const sp = await searchParams;
  const id = param(sp, "id");
  const pasta = param(sp, "pasta");
  const supabase = await createClient();
  const limits = await getUploadLimits(user.id);

  // Envio que não terminou (rascunho): retoma com o arquivo, se já foi enviado
  let draft: { id: string; video: DraftVideo | null } | null = null;
  let draftName: string | null = null;
  if (id && UUID.test(id)) {
    const { data: project } = await supabase.from("projects").select("id, name, status, thumbnail_path").eq("id", id).maybeSingle();
    if (!project) redirect(ROUTES.newVideo);
    if (project.status !== "draft") redirect(ROUTES.video(project.id));
    const { data: file } = await supabase
      .from("project_files")
      .select("*")
      .eq("project_id", project.id)
      .eq("kind", "original")
      .eq("status", "uploaded")
      .maybeSingle();
    let video: DraftVideo | null = null;
    if (file) {
      const [previewUrl, thumbnailUrl] = await Promise.all([
        signedUrl(supabase, file.bucket, file.storage_path, { expiresIn: 60 * 60 * 3 }),
        signedUrl(supabase, BUCKETS.thumbnails, project.thumbnail_path),
      ]);
      video = { fileName: file.file_name, sizeBytes: file.size_bytes, durationSec: file.duration_sec, width: file.width, height: file.height, previewUrl, thumbnailUrl };
    }
    draft = { id: project.id, video };
    draftName = project.name;
  }

  let folder: { id: string; name: string } | null = null;
  if (!draft && pasta && UUID.test(pasta)) {
    const { data } = await supabase.from("folders").select("id, name").eq("id", pasta).eq("owner_id", user.id).maybeSingle();
    folder = data;
  }

  return (
    <div className="relative space-y-8 pt-4 pb-8 md:pt-8">
      <Aurora variant="app" className="-inset-x-24 -top-28 -bottom-10" />
      <div className="relative text-center">
        <h1 className="text-[2.1rem] leading-[1.05] font-extrabold text-fg sm:text-5xl">
          {draftName ? "Terminar o envio" : "Enviar vídeo"}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-[0.9375rem] text-fg-2 md:text-lg">
          {draftName ?? "Solte o vídeo. A TRIBUNA corta as pausas e coloca as legendas sozinha."}
        </p>
        {folder && (
          <Link
            href={ROUTES.folder(folder.id)}
            className="glass mt-4 inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold text-fg transition hover:border-cyan/40"
          >
            <ChevronLeft className="size-4 text-fg-3" />
            <Folder className="size-4 text-gold" /> Na pasta {folder.name}
          </Link>
        )}
      </div>
      <div className="relative mx-auto max-w-3xl">
        <QuickUpload
          key={draft?.id ?? folder?.id ?? "novo"}
          userId={user.id}
          folderId={folder?.id ?? null}
          draft={draft}
          maxBytes={limits.maxBytes}
          maxDurationSec={limits.maxDurationSec}
        />
      </div>
    </div>
  );
}
