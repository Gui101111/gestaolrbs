import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUCKETS } from "@/lib/constants/domain";
import { slugify } from "@/lib/utils";

/** Download seguro: valida o dono (RLS) e redireciona para uma URL assinada de curta duração. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.redirect(new URL(`/entrar?next=/app/video/${id}`, request.url));

  const renderId = request.nextUrl.searchParams.get("render");
  const ratio = request.nextUrl.searchParams.get("ratio");
  let query = supabase.from("renders").select("id, storage_path, aspect_ratio, version, projects(name)").eq("project_id", id);
  if (renderId) query = query.eq("id", renderId);
  if (ratio) query = query.eq("aspect_ratio", ratio);
  const { data } = await query.order("version", { ascending: false }).limit(1).maybeSingle();
  if (!data) return NextResponse.redirect(new URL(`/app/video/${id}?erro=download`, request.url));

  const projectName = (data.projects as { name?: string } | null)?.name ?? "video";
  const fileName = `${slugify(projectName) || "video"}_${data.aspect_ratio.replace(":", "x")}_v${data.version}.mp4`;
  const { data: signed } = await supabase.storage.from(BUCKETS.renders).createSignedUrl(data.storage_path, 120, { download: fileName });
  if (!signed?.signedUrl) return NextResponse.redirect(new URL(`/app/video/${id}?erro=download`, request.url));

  // Etapa 4 de "Conclua sua configuração": primeiro download do vídeo
  await createAdminClient()
    .from("projects")
    .update({ first_downloaded_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .is("first_downloaded_at", null);

  return NextResponse.redirect(signed.signedUrl);
}
