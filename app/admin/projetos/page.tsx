import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/projects/status-badge";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/dal";
import { EDITING_STYLES, PIPELINE_STEPS, PROJECT_STATUSES, labelOf } from "@/lib/constants/domain";
import { param, type SearchParams } from "@/lib/search-params";
import { cn, formatDateTime, formatDuration } from "@/lib/utils";

const FILTERS = [
  { value: "fila", label: "Fila", statuses: ["queued", "processing", "revision_requested"] },
  { value: "prontos", label: "Prontos", statuses: ["ready", "completed"] },
  { value: "erro", label: "Erro", statuses: ["failed"] },
  { value: "todos", label: "Todos enviados", statuses: Object.keys(PROJECT_STATUSES).filter((s) => s !== "draft") },
];

export default async function AdminProjects({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin();
  const sp = await searchParams;
  const filter = FILTERS.find((f) => f.value === param(sp, "status")) ?? FILTERS[0];
  const admin = createAdminClient();
  const { data: projects } = await admin
    .from("projects")
    .select("id, name, status, submitted_at, editing_style, aspect_ratios, source_duration_sec, user_id")
    .in("status", filter.statuses as never)
    .order("submitted_at", { ascending: filter.value === "fila" })
    .limit(200);
  const userIds = [...new Set((projects ?? []).map((p) => p.user_id))];
  const [{ data: profiles }, { data: jobs }] = await Promise.all([
    userIds.length ? admin.from("profiles").select("id, full_name, email").in("id", userIds) : Promise.resolve({ data: [] as { id: string; full_name: string | null; email: string | null }[] }),
    (projects ?? []).length
      ? admin.from("render_jobs").select("project_id, current_step, progress, created_at").in("project_id", (projects ?? []).map((p) => p.id)).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as { project_id: string; current_step: string; progress: number; created_at: string }[] }),
  ]);
  const byUser = new Map((profiles ?? []).map((p) => [p.id, p]));
  const lastJob = new Map<string, { current_step: string; progress: number }>();
  (jobs ?? []).forEach((j) => !lastJob.has(j.project_id) && lastJob.set(j.project_id, j));

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Admin" title="Fila de projetos" description="Ordenada por data de envio. Abra um projeto para processar e entregar." />
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={`/admin/projetos?status=${f.value}`}
            className={cn("rounded-full border px-4 py-2 text-sm transition", f.value === filter.value ? "border-gold/50 bg-gold/10 text-gold-light" : "border-white/10 text-mist hover:text-ivory")}
          >
            {f.label}
          </Link>
        ))}
      </div>
      <div className="overflow-x-auto rounded-3xl border border-white/[0.07] bg-white/[0.02]">
        <table className="w-full min-w-[56rem] text-left text-sm">
          <thead className="border-b border-white/[0.06] text-xs text-mist">
            <tr>
              <th className="px-5 py-3 font-medium">Projeto</th>
              <th className="px-5 py-3 font-medium">Cliente</th>
              <th className="px-5 py-3 font-medium">Enviado</th>
              <th className="px-5 py-3 font-medium">Estilo · formatos</th>
              <th className="px-5 py-3 font-medium">Etapa</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {(projects ?? []).map((p) => {
              const u = byUser.get(p.user_id);
              const job = lastJob.get(p.id);
              return (
                <tr key={p.id} className="border-b border-white/[0.04] transition hover:bg-white/[0.02]">
                  <td className="px-5 py-3.5">
                    <Link href={`/admin/projetos/${p.id}`} className="font-medium text-ivory hover:text-gold-light">
                      {p.name}
                    </Link>
                    <p className="text-xs text-mist">{formatDuration(p.source_duration_sec)}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="text-ivory/90">{u?.full_name ?? "—"}</p>
                    <p className="text-xs text-mist">{u?.email}</p>
                  </td>
                  <td className="px-5 py-3.5 text-mist">{formatDateTime(p.submitted_at)}</td>
                  <td className="px-5 py-3.5 text-mist">
                    {labelOf(EDITING_STYLES, p.editing_style)} · {p.aspect_ratios.join(", ")}
                  </td>
                  <td className="px-5 py-3.5 text-mist">
                    {labelOf(PIPELINE_STEPS, job?.current_step)} {job ? `· ${job.progress}%` : ""}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={p.status} />
                  </td>
                </tr>
              );
            })}
            {!projects?.length && (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-mist">
                  Nenhum projeto neste filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
