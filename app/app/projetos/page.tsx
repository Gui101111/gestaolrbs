import type { Metadata } from "next";
import { ProjectsBrowser } from "@/components/projects-browser/projects-browser";
import { loadProjectsBrowser } from "@/components/projects-browser/load";
import { requireOnboardedProfile } from "@/lib/auth/dal";
import type { SearchParams } from "@/lib/search-params";

export const metadata: Metadata = { title: "Projetos" };

export default async function ProjectsPage({ searchParams }: { searchParams: SearchParams }) {
  const { user } = await requireOnboardedProfile();
  const data = await loadProjectsBrowser(user.id, null, await searchParams);
  return <ProjectsBrowser {...data!} />;
}
