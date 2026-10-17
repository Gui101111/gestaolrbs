import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ProcessingTimeline } from "@/components/projects/processing-timeline";
import { ProjectResult, type ResultRender } from "@/components/projects/project-result";
import { StatusBadge } from "@/components/projects/status-badge";
import { ProjectBriefing } from "@/components/projects/project-briefing";
import { requireOnboardedProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { signedUrl, signedUrlMap } from "@/services/storage";
import { BUCKETS, EDITING_STYLES, labelOf } from "@/lib/constants/domain";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Projeto" };

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await requireOnboardedProfile();
  const supabase = await createClient();
  const { data: project } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
  if (!project || project.user_id !== user.id) notFound();
  if (project.status === "draft") redirect(`/app/novo?id=${id}`);

  const [{ data: job }, { data: renders }, { data: original }, { data: revisions }, { data: sub }] = await Promise.all([
    supabase.from("render_jobs").select("id, status, progress, current_step, error_message, kind, updated_at").eq("project_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("renders").select("*").eq("project_id", id).order("version", { ascending: false }),
    supabase.from("project_files").select("*").eq("project_id", id).eq("kind", "original").maybeSingle(),
    supabase.from("project_revisions").select("*").eq("project_id", id).order("created_at", { ascending: false }),
    supabase.from("subscriptions").select("plan_id").eq("user_id", user.id).maybeSingle(),
  ]);

  const done = project.status === "ready" || project.status === "completed";
  let content: React.ReactNode;

  if (done) {
    const urls = await signedUrlMap(supabase, BUCKETS.renders, (renders ?? []).map((r) => r.storage_path), 60 * 60 * 2);
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
  } else {
    content = (
      <>
        <div className="mb-10">
          <p className="eyebrow">Processamento</p>
          <h1 className="mt-2 font-display text-4xl text-ivory md:text-5xl">{project.name}</h1>
          <p className="mt-2 text-sm text-mist">Enviado em {formatDateTime(project.submitted_at)}</p>
        </div>
        <ProcessingTimeline projectId={project.id} initialJob={job ?? null} projectStatus={project.status} />
      </>
    );
  }

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between gap-4">
        <Link href="/app/projetos" className="inline-flex items-center gap-2 text-sm text-mist transition hover:text-ivory">
          <ArrowLeft className="size-4" /> Biblioteca
        </Link>
        <StatusBadge status={project.status} />
      </div>
      {content}
      <ProjectBriefing project={project} revisions={revisions ?? []} />
    </div>
  );
}
