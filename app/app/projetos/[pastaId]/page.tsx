import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ProjectsBrowser } from "@/components/projects-browser/projects-browser";
import { loadProjectsBrowser } from "@/components/projects-browser/load";
import { requireOnboardedProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { ROUTES } from "@/lib/routes";
import type { SearchParams } from "@/lib/search-params";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: { params: Promise<{ pastaId: string }> }): Promise<Metadata> {
  const { pastaId } = await params;
  if (!UUID.test(pastaId)) return { title: "Projetos" };
  const supabase = await createClient();
  const { data } = await supabase.from("folders").select("name").eq("id", pastaId).maybeSingle();
  return { title: data?.name ?? "Projetos" };
}

export default async function FolderPage({ params, searchParams }: { params: Promise<{ pastaId: string }>; searchParams: SearchParams }) {
  const { pastaId } = await params;
  if (!UUID.test(pastaId)) notFound();
  const { user } = await requireOnboardedProfile();
  const data = await loadProjectsBrowser(user.id, pastaId, await searchParams);
  if (!data) {
    // Links antigos (/app/projetos/<id do vídeo>) levam à nova página do vídeo
    const supabase = await createClient();
    const { data: project } = await supabase.from("projects").select("id").eq("id", pastaId).maybeSingle();
    if (project) redirect(ROUTES.video(pastaId));
    notFound();
  }
  return <ProjectsBrowser {...data} />;
}
