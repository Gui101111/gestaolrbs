import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { StatusBadge } from "@/components/projects/status-badge";
import { ProjectBriefing } from "@/components/projects/project-briefing";
import { AdminProjectConsole } from "@/components/admin/admin-project-console";
import { AgentPanel } from "@/components/admin/agent-panel";
import { isClaudeConfigured } from "@/services/editing/claude/config";
import type { SandboxReport } from "@/services/editing/claude/session-lifecycle";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/dal";
import { signedUrl, signedUrlMap } from "@/services/storage";
import { slugify, formatDateTime } from "@/lib/utils";

export default async function AdminProjectPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const admin = createAdminClient();
  const { data: project } = await admin.from("projects").select("*").eq("id", id).maybeSingle();
  if (!project) notFound();

  const [{ data: owner }, { data: original }, { data: job }, { data: renders }, { data: revisions }, { data: notes }, { data: brand }] = await Promise.all([
    admin.from("profiles").select("full_name, email, oab_number, oab_uf, office_name").eq("id", project.user_id).single(),
    admin.from("project_files").select("*").eq("project_id", id).eq("kind", "original").maybeSingle(),
    admin.from("render_jobs").select("*").eq("project_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    admin.from("renders").select("*").eq("project_id", id).order("created_at", { ascending: false }),
    admin.from("project_revisions").select("*").eq("project_id", id).order("created_at", { ascending: false }),
    admin.from("project_notes").select("id, body, created_at").eq("project_id", id).order("created_at", { ascending: false }),
    admin.from("brand_kits").select("*").eq("user_id", project.user_id).maybeSingle(),
  ]);

  const { data: agent } = job ? await admin.from("editing_sessions").select("*").eq("job_id", job.id).maybeSingle() : { data: null };
  const report = (agent?.report ?? null) as SandboxReport | null;
  const alerts = Array.isArray(job?.compliance_flags) ? (job.compliance_flags as { tempo: string; frase: string; motivo: string }[]) : [];

  const originalUrl = original
    ? await signedUrl(admin, original.bucket, original.storage_path, { expiresIn: 60 * 60, download: `${slugify(project.name) || "original"}-original.${original.file_name.split(".").pop() ?? "mp4"}` })
    : null;
  const renderUrls = await signedUrlMap(admin, "rendered-videos", (renders ?? []).map((r) => r.storage_path));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <Link href="/admin/projetos" className="inline-flex items-center gap-2 text-sm text-mist hover:text-ivory">
          <ArrowLeft className="size-4" /> Fila
        </Link>
        <StatusBadge status={project.status} />
      </div>
      <div>
        <p className="eyebrow">Projeto</p>
        <h1 className="mt-2 font-display text-4xl text-ivory">{project.name}</h1>
        <p className="mt-2 text-sm text-mist">
          {owner?.full_name} · {owner?.email}
          {owner?.oab_number ? ` · OAB/${owner.oab_uf} ${owner.oab_number}` : ""} · enviado em {formatDateTime(project.submitted_at)}
        </p>
      </div>

      {job && (agent || job.review_status !== "none" || alerts.length > 0) && (
        <AgentPanel
          jobId={job.id}
          reviewStatus={job.review_status}
          alerts={alerts}
          claudeReady={isClaudeConfigured()}
          session={
            agent
              ? {
                  provider: agent.provider,
                  status: agent.status,
                  version: agent.version,
                  costCents: agent.cost_cents,
                  activeSeconds: agent.active_seconds,
                  followups: agent.followups,
                  stopReason: agent.stop_reason,
                  error: agent.error,
                  startedAt: agent.started_at,
                  finishedAt: agent.finished_at,
                  observacoes: report?.observacoes ?? null,
                  cortes: report?.cortes ?? null,
                  duracaoOriginal: report?.duracao_original_s ?? null,
                  duracaoFinal: report?.duracao_final_s ?? null,
                }
              : null
          }
        />
      )}

      <AdminProjectConsole
        projectId={project.id}
        ownerId={project.user_id}
        status={project.status}
        ratios={project.aspect_ratios}
        originalUrl={originalUrl}
        job={job ? { id: job.id, status: job.status, current_step: job.current_step, progress: job.progress, provider: job.provider, error_message: job.error_message, kind: job.kind } : null}
        renders={(renders ?? []).map((r) => ({ id: r.id, aspect_ratio: r.aspect_ratio, version: r.version, url: renderUrls.get(r.storage_path) ?? null, file_size: r.file_size, duration_sec: r.duration_sec, created_at: r.created_at, published: r.published }))}
        notes={notes ?? []}
      />

      <ProjectBriefing project={project} revisions={revisions ?? []} />

      {brand && (
        <section className="rounded-3xl border border-fg/[0.07] bg-fg/[0.02] p-6">
          <h2 className="font-display text-2xl text-ivory">Identidade visual do cliente</h2>
          <div className="mt-4 flex flex-wrap items-center gap-6 text-sm text-mist">
            <span className="flex gap-1.5">
              {[brand.primary_color, brand.secondary_color, brand.accent_color].map((c) => (
                <span key={c} className="size-6 rounded-full ring-1 ring-fg/20" style={{ background: c }} title={c} />
              ))}
            </span>
            <span>{brand.professional_name ?? "—"}</span>
            <span>{brand.oab_display ?? "—"}</span>
            <span>{brand.font ?? "Fonte padrão"}</span>
            <span>{brand.instagram ? `@${brand.instagram}` : ""}</span>
            <span>{brand.website ?? ""}</span>
            <span>{brand.whatsapp ?? ""}</span>
          </div>
        </section>
      )}

      {job?.brief && (
        <details className="rounded-3xl border border-fg/[0.07] bg-fg/[0.02] p-6">
          <summary className="cursor-pointer font-display text-xl text-ivory">Briefing JSON enviado ao processador</summary>
          <pre className="mt-4 max-h-96 overflow-auto rounded-xl bg-black/50 p-4 text-xs text-mist" data-lenis-prevent>
            {JSON.stringify(job.brief, (k, v) => (k === "url" || k === "logoUrl" ? (v ? "[url assinada]" : v) : v), 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
