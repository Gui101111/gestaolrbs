import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { ProcessingTimeline } from "@/components/projects/processing-timeline";
import { ProjectResult, type ResultRender } from "@/components/projects/project-result";
import { ProjectActionsMenu } from "@/components/projects/project-actions";
import { StatusBadge } from "@/components/projects/status-badge";
import { TargetBadge } from "@/components/projects/target-badge";
import { requireOnboardedProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { signedUrlMap } from "@/services/storage";
import { BUCKETS, videoTargetOf } from "@/lib/constants/domain";
import { ROUTES } from "@/lib/routes";
import { formatDateTime } from "@/lib/utils";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  if (!UUID.test(id)) return { title: "Vídeo" };
  const supabase = await createClient();
  const { data } = await supabase.from("projects").select("name").eq("id", id).maybeSingle();
  return { title: data?.name ?? "Vídeo" };
}

export default async function VideoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { user } = await requireOnboardedProfile();
  const supabase = await createClient();
  const { data: project } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
  if (!project || project.user_id !== user.id) notFound();
  // Envio que não terminou: volta para a tela de envio
  if (project.status === "draft") redirect(`${ROUTES.newVideo}?id=${id}`);

  const [{ data: job }, { data: renders }, { data: folder }] = await Promise.all([
    supabase
      .from("render_jobs")
      .select("id, status, progress, current_step, error_message, kind, updated_at")
      .eq("project_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("renders").select("*").eq("project_id", id).order("version", { ascending: false }),
    project.folder_id ? supabase.from("folders").select("id, name").eq("id", project.folder_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  const target = videoTargetOf(project.platforms);
  const done = project.status === "ready" || project.status === "completed";
  let content: React.ReactNode;

  if (done) {
    const urls = await signedUrlMap(
      supabase,
      BUCKETS.renders,
      (renders ?? []).flatMap((r) => [r.storage_path, r.thumbnail_path]),
      60 * 60 * 2,
    );
    // Limite de ajustes só com assinatura paga ativa (fase de testes: sem limite)
    let revisionsLeft: number | null = null;
    const { data: sub } = await supabase.from("subscriptions").select("plan_id, status, current_period_end").eq("user_id", user.id).maybeSingle();
    const paid = sub?.status === "active" && (!sub.current_period_end || new Date(sub.current_period_end) > new Date());
    if (paid && sub?.plan_id) {
      const { data: plan } = await supabase.from("plans").select("revisions_per_video").eq("id", sub.plan_id).maybeSingle();
      if (plan) revisionsLeft = Math.max(0, plan.revisions_per_video - project.revisions_used);
    }
    const list: ResultRender[] = (renders ?? []).map((r) => ({
      id: r.id,
      aspectRatio: r.aspect_ratio,
      url: urls.get(r.storage_path) ?? null,
      resolution: r.resolution,
      width: r.width,
      height: r.height,
      durationSec: r.duration_sec,
      fileSize: r.file_size,
      version: r.version,
      createdAt: r.created_at,
      poster: r.thumbnail_path ? (urls.get(r.thumbnail_path) ?? null) : null,
    }));
    content = <ProjectResult project={{ id: project.id, name: project.name }} renders={list} revisionsLeft={revisionsLeft} target={target} />;
  } else {
    content = (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl text-fg md:text-4xl">{project.name}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-fg-3">
            {target && <TargetBadge target={target} />}
            {project.submitted_at && <span>Enviado em {formatDateTime(project.submitted_at)}</span>}
          </p>
        </div>
        <ProcessingTimeline projectId={project.id} initialJob={job ?? null} projectStatus={project.status} />
      </div>
    );
  }

  const back = folder ? { href: ROUTES.folder(folder.id), label: folder.name } : { href: ROUTES.projects, label: "Projetos" };

  return (
    <div className="space-y-6 pt-2 pb-8">
      <div className="flex items-center justify-between gap-3">
        <Link
          href={back.href}
          className="flex min-h-10 min-w-0 items-center gap-1 rounded-full pr-3 pl-1.5 text-sm font-semibold text-fg-3 transition hover:bg-fg/[0.05] hover:text-fg"
        >
          <ChevronLeft className="size-4 shrink-0" /> <span className="truncate">{back.label}</span>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <StatusBadge status={project.status} />
          <ProjectActionsMenu
            id={project.id}
            name={project.name}
            status={project.status}
            canDownload={done}
            folderId={project.folder_id}
            inPage
            triggerClassName="glass grid size-10 place-items-center rounded-full text-fg-2 transition hover:border-cyan/40 hover:text-fg data-[state=open]:border-cyan/60"
          />
        </div>
      </div>
      {content}
    </div>
  );
}
