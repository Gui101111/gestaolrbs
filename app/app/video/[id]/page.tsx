import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { ProcessingTimeline } from "@/components/projects/processing-timeline";
import { ProjectResult, type ResultRender } from "@/components/projects/project-result";
import { StatusBadge } from "@/components/projects/status-badge";
import { StatusTrack } from "@/components/projects/status-track";
import { ComplianceAlerts, type ComplianceAlert } from "@/components/projects/compliance-alerts";
import { ProjectBriefing } from "@/components/projects/project-briefing";
import { folderPath } from "@/components/folders/folder-colors";
import { requireOnboardedProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { signedUrl, signedUrlMap } from "@/services/storage";
import { BUCKETS, EDITING_STYLES, labelOf } from "@/lib/constants/domain";
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
  if (project.status === "draft") redirect(`${ROUTES.newVideo}?id=${id}`);

  const [{ data: job }, { data: renders }, { data: original }, { data: revisions }, { data: sub }, { data: folders }] = await Promise.all([
    supabase
      .from("render_jobs")
      .select("id, status, progress, current_step, error_message, kind, updated_at, compliance_flags")
      .eq("project_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("renders").select("*").eq("project_id", id).order("version", { ascending: false }),
    supabase.from("project_files").select("*").eq("project_id", id).eq("kind", "original").maybeSingle(),
    supabase.from("project_revisions").select("*").eq("project_id", id).order("created_at", { ascending: false }),
    supabase.from("subscriptions").select("plan_id").eq("user_id", user.id).maybeSingle(),
    supabase.from("folders").select("id, name, parent_id").eq("owner_id", user.id),
  ]);

  const path = folderPath(folders ?? [], project.folder_id);
  const done = project.status === "ready" || project.status === "completed";
  let content: React.ReactNode;

  if (done) {
    const urls = await signedUrlMap(
      supabase,
      BUCKETS.renders,
      (renders ?? []).flatMap((r) => [r.storage_path, r.thumbnail_path]),
      60 * 60 * 2,
    );
    const [originalUrl, poster] = await Promise.all([
      original ? signedUrl(supabase, original.bucket, original.storage_path, { expiresIn: 60 * 60 * 2 }) : null,
      signedUrl(supabase, BUCKETS.thumbnails, project.thumbnail_path),
    ]);
    let revisionsLeft: number | null = null;
    if (sub?.plan_id) {
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
    const ow = original?.width ?? project.source_width;
    const oh = original?.height ?? project.source_height;
    content = (
      <ProjectResult
        project={{ id: project.id, name: project.name, status: project.status, completedAt: project.completed_at, updatedAt: project.updated_at }}
        renders={list}
        original={{ url: originalUrl, poster, aspect: ow && oh ? `${ow}:${oh}` : "16:9" }}
        revisionsLeft={revisionsLeft}
        styleLabel={labelOf(EDITING_STYLES, project.editing_style)}
      />
    );
    const alerts = Array.isArray(job?.compliance_flags) ? (job.compliance_flags as unknown as ComplianceAlert[]) : [];
    if (alerts.length) {
      content = (
        <div className="space-y-8">
          {content}
          <ComplianceAlerts alerts={alerts} />
        </div>
      );
    }
  } else {
    content = (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl text-fg md:text-4xl">{project.name}</h1>
          {project.submitted_at && <p className="mt-1 text-sm text-fg-3">Enviado em {formatDateTime(project.submitted_at)}</p>}
        </div>
        <StatusTrack status={project.status} className="max-w-xl" />
        <ProcessingTimeline projectId={project.id} initialJob={job ?? null} projectStatus={project.status} />
      </div>
    );
  }

  return (
    <div className="space-y-8 pt-2 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Caminho" className="flex min-w-0 flex-wrap items-center gap-1 text-sm">
          <Link href={ROUTES.projects} className="rounded-lg px-2 py-1 text-fg-3 transition hover:bg-fg/[0.05] hover:text-fg">
            Projetos
          </Link>
          {path.map((f) => (
            <span key={f.id} className="flex items-center gap-1">
              <ChevronRight className="size-3.5 text-fg-3" />
              <Link href={ROUTES.folder(f.id)} className="rounded-lg px-2 py-1 text-fg-3 transition hover:bg-fg/[0.05] hover:text-fg">
                {f.name}
              </Link>
            </span>
          ))}
          <ChevronRight className="size-3.5 text-fg-3" />
          <span className="max-w-[16rem] truncate px-2 py-1 font-semibold text-fg" aria-current="page">
            {project.name}
          </span>
        </nav>
        <StatusBadge status={project.status} />
      </div>
      {content}
      <ProjectBriefing project={project} revisions={revisions ?? []} />
    </div>
  );
}
