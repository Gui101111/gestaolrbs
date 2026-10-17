import "server-only";
import { createClient } from "@/lib/supabase/server";
import { BUCKETS, LIBRARY_FILTERS, STATUS_GROUPS } from "@/lib/constants/domain";
import { signedUrlMap } from "@/services/storage";
import type { Plan, Project, RenderJob, Subscription, Usage } from "@/types/domain";

export type ProjectListItem = Project & { thumbnail_url: string | null; job: Pick<RenderJob, "status" | "progress" | "current_step"> | null };

async function withThumbs(projects: Project[]): Promise<ProjectListItem[]> {
  if (!projects.length) return [];
  const supabase = await createClient();
  const thumbs = await signedUrlMap(supabase, BUCKETS.thumbnails, projects.map((p) => p.thumbnail_path));
  const ids = projects.map((p) => p.id);
  const { data: jobs } = await supabase
    .from("render_jobs")
    .select("project_id, status, progress, current_step, created_at")
    .in("project_id", ids)
    .order("created_at", { ascending: false });
  const latest = new Map<string, Pick<RenderJob, "status" | "progress" | "current_step">>();
  jobs?.forEach((j) => {
    if (!latest.has(j.project_id)) latest.set(j.project_id, { status: j.status, progress: j.progress, current_step: j.current_step });
  });
  return projects.map((p) => ({
    ...p,
    thumbnail_url: p.thumbnail_path ? (thumbs.get(p.thumbnail_path) ?? null) : null,
    job: latest.get(p.id) ?? null,
  }));
}

export async function listProjects(opts: { filter?: string; q?: string; limit?: number; userId: string }) {
  const supabase = await createClient();
  let query = supabase.from("projects").select("*").eq("user_id", opts.userId).order("updated_at", { ascending: false });
  const filter = LIBRARY_FILTERS.find((f) => f.value === opts.filter);
  if (filter && "statuses" in filter) query = query.in("status", [...filter.statuses]);
  if (opts.q) query = query.ilike("name", `%${opts.q.replace(/[%_]/g, "")}%`);
  if (opts.limit) query = query.limit(opts.limit);
  const { data, error } = await query;
  if (error) throw new Error("projects_list_failed");
  return withThumbs(data ?? []);
}

/**
 * Vídeos de uma pasta (ou da raiz com folderId = null).
 * Com busca por nome, procura em todas as pastas.
 */
export async function listFolderProjects(opts: {
  userId: string;
  folderId: string | null;
  q?: string;
  status?: string;
  format?: string;
  area?: string;
  sort?: string;
}) {
  const supabase = await createClient();
  let query = supabase.from("projects").select("*").eq("user_id", opts.userId);
  const q = opts.q?.replace(/[%_,()]/g, "").trim();
  if (q) query = query.ilike("name", `%${q}%`);
  else if (opts.folderId) query = query.eq("folder_id", opts.folderId);
  else query = query.is("folder_id", null);

  const group = STATUS_GROUPS.find((g) => g.value === opts.status);
  if (group) query = query.in("status", [...group.statuses]);
  if (opts.format && ["9:16", "1:1", "4:5", "16:9"].includes(opts.format)) query = query.contains("aspect_ratios", [opts.format]);
  if (opts.area) query = query.eq("legal_area", opts.area);

  switch (opts.sort) {
    case "antigos":
      query = query.order("created_at", { ascending: true });
      break;
    case "nome":
      query = query.order("name", { ascending: true });
      break;
    case "duracao":
      query = query.order("source_duration_sec", { ascending: false, nullsFirst: false });
      break;
    default:
      query = query.order("updated_at", { ascending: false });
  }

  const { data, error } = await query.limit(300);
  if (error) throw new Error("projects_list_failed");
  return withThumbs(data ?? []);
}

export type BillingInfo = {
  subscription: Subscription | null;
  plan: Plan | null;
  usage: Usage | null;
  active: boolean;
};

export async function getBillingInfo(userId: string): Promise<BillingInfo> {
  const supabase = await createClient();
  const [{ data: subscription }, { data: usage }] = await Promise.all([
    supabase.from("subscriptions").select("*").eq("user_id", userId).maybeSingle(),
    supabase.rpc("get_my_usage"),
  ]);
  let plan: Plan | null = null;
  if (subscription?.plan_id) {
    const { data } = await supabase.from("plans").select("*").eq("id", subscription.plan_id).maybeSingle();
    plan = data;
  }
  const active =
    !!subscription &&
    (subscription.status === "active" || subscription.status === "trialing") &&
    (!subscription.current_period_end || new Date(subscription.current_period_end) > new Date());
  return { subscription: subscription ?? null, plan, usage: (usage as Usage | null) ?? null, active };
}

export async function getDashboardData(userId: string) {
  const supabase = await createClient();
  const [recent, counts, billing, draft] = await Promise.all([
    listProjects({ userId, limit: 6 }),
    supabase.from("projects").select("status").eq("user_id", userId),
    getBillingInfo(userId),
    supabase
      .from("projects")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "draft")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const statuses = counts.data ?? [];
  const processed = statuses.filter((p) => p.status === "ready" || p.status === "completed").length;
  const processing = statuses.filter((p) => ["queued", "processing", "revision_requested"].includes(p.status)).length;
  const [continueProject] = draft.data ? await withThumbs([draft.data]) : [null];
  const inFlight = recent.filter((p) => ["queued", "processing", "revision_requested"].includes(p.status));
  return { recent, processed, processing, total: statuses.length, billing, continueProject, inFlight };
}
