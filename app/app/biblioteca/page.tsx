import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ProjectCard } from "@/components/projects/project-card";
import { LibraryToolbar } from "@/components/projects/library-toolbar";
import { requireOnboardedProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { listProjects } from "@/services/projects/queries";
import { LIBRARY_FILTERS } from "@/lib/constants/domain";
import { param, type SearchParams } from "@/lib/search-params";

export const metadata: Metadata = { title: "Biblioteca" };

export default async function LibraryPage({ searchParams }: { searchParams: SearchParams }) {
  const { user } = await requireOnboardedProfile();
  const sp = await searchParams;
  const filter = param(sp, "filtro") ?? "all";
  const q = param(sp, "q")?.slice(0, 80) ?? "";
  const supabase = await createClient();

  const [projects, { data: all }] = await Promise.all([
    listProjects({ userId: user.id, filter, q }),
    supabase.from("projects").select("status").eq("user_id", user.id),
  ]);

  const counts: Record<string, number> = {};
  for (const f of LIBRARY_FILTERS) {
    counts[f.value] = "statuses" in f ? (all ?? []).filter((p) => (f.statuses as readonly string[]).includes(p.status)).length : (all ?? []).length;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Biblioteca"
        title="Seus projetos"
        description="Todos os vídeos enviados, em edição e prontos para publicar."
        actions={
          <Button asChild variant="gold">
            <Link href="/app/projetos/novo">
              <Plus /> Novo projeto
            </Link>
          </Button>
        }
      />
      <Suspense>
        <LibraryToolbar counts={counts} />
      </Suspense>
      {projects.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p, i) => (
            <ProjectCard key={p.id} project={p} index={i} />
          ))}
        </div>
      ) : (all ?? []).length === 0 ? (
        <EmptyState
          title="Você ainda não criou nenhum projeto."
          description="Envie seu primeiro vídeo bruto e acompanhe a edição por aqui."
          action={
            <Button asChild variant="gold" size="lg">
              <Link href="/app/projetos/novo">Criar primeiro vídeo</Link>
            </Button>
          }
        />
      ) : (
        <EmptyState compact title="Nenhum projeto encontrado." description={q ? `Não há projetos com “${q}” neste filtro.` : "Não há projetos neste filtro."} />
      )}
    </div>
  );
}
