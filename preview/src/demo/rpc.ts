/**
 * Funções do banco (RPC) da demonstração, com a mesma lógica das migrations:
 * submit_project, request_revision, approve_project, duplicate_project e
 * get_my_usage.
 */
import { db, type Row } from "./db";
import { currentUserId } from "./supabase";

type Result = { data: unknown; error: { message: string; code?: string } | null };
const fail = (message: string, code = "P0001"): Result => ({ data: null, error: { message, code } });

function ensureUsage(uid: string): Row {
  const sub = db.rows("subscriptions").find((s) => s.user_id === uid);
  const t = Date.now();
  let start: string;
  let end: string;
  if (sub?.current_period_start && sub.current_period_end && t >= Date.parse(String(sub.current_period_start)) && t <= Date.parse(String(sub.current_period_end))) {
    start = String(sub.current_period_start);
    end = String(sub.current_period_end);
  } else {
    const d = new Date();
    start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
    end = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString();
  }
  return db.rows("usage").find((u) => u.user_id === uid && u.period_start === start) ?? db.insert("usage", { user_id: uid, period_start: start, period_end: end });
}

function activePlan(uid: string) {
  const sub = db.rows("subscriptions").find((s) => s.user_id === uid);
  if (!sub || !["active", "trialing"].includes(String(sub.status))) return null;
  if (sub.current_period_end && Date.parse(String(sub.current_period_end)) < Date.now()) return null;
  return db.rows("plans").find((p) => p.id === sub.plan_id) ?? null;
}

export async function rpc(fn: string, args: Record<string, unknown>): Promise<Result> {
  const uid = currentUserId();
  if (!uid) return fail("not_authenticated", "28000");
  const now = new Date().toISOString();

  switch (fn) {
    case "get_my_usage":
      return { data: ensureUsage(uid), error: null };

    case "submit_project": {
      const p = db.rows("projects").find((x) => x.id === args.p_project_id && x.user_id === uid);
      if (!p) return fail("project_not_found", "P0002");
      if (p.status !== "draft") return fail("project_not_draft");
      if (!p.objective || !p.legal_area || !p.editing_style || !(p.platforms as string[])?.length) return fail("project_incomplete");
      if (!p.rights_confirmed_at) return fail("rights_not_confirmed");
      if (!db.rows("project_files").some((f) => f.project_id === p.id && f.kind === "original" && f.status === "uploaded")) return fail("missing_video");
      const plan = activePlan(uid);
      if (!plan) return fail("subscription_required");
      if (plan.max_video_duration_sec && Number(p.source_duration_sec ?? 0) > Number(plan.max_video_duration_sec)) return fail("video_too_long");
      const usage = ensureUsage(uid);
      if (plan.videos_per_month != null && Number(usage.videos_created) >= Number(plan.videos_per_month)) return fail("quota_exceeded");
      const minutes = Math.round((Number(p.source_duration_sec ?? 0) / 60) * 100) / 100;
      if (plan.minutes_per_month != null && Number(usage.minutes_used) + minutes > Number(plan.minutes_per_month)) return fail("minutes_exceeded");
      db.update("usage", (u) => u.id === usage.id, { videos_created: Number(usage.videos_created) + 1, minutes_used: Number(usage.minutes_used) + minutes });
      db.update("projects", (x) => x.id === p.id, { status: "queued", submitted_at: now });
      const job = db.insert("render_jobs", {
        project_id: p.id,
        user_id: uid,
        status: "queued",
        progress: 0,
        current_step: "upload_completed",
        kind: p.parent_project_id ? "version" : "initial",
        step_history: [{ step: "upload_completed", at: now }],
      });
      db.insert("notifications", { user_id: uid, type: "project_submitted", title: "Vídeo enviado para edição", body: `“${p.name}” entrou na fila de edição.`, link: `/app/video/${p.id}` });
      return { data: job, error: null };
    }

    case "request_revision": {
      const p = db.rows("projects").find((x) => x.id === args.p_project_id && x.user_id === uid);
      if (!p) return fail("project_not_found", "P0002");
      if (!["ready", "completed"].includes(String(p.status))) return fail("project_not_ready");
      const plan = activePlan(uid);
      if (plan && Number(p.revisions_used) >= Number(plan.revisions_per_video)) return fail("revisions_exceeded");
      const rev = db.insert("project_revisions", { project_id: p.id, user_id: uid, comment: String(args.p_comment ?? "").trim().slice(0, 2000), timestamp_sec: args.p_timestamp_sec ?? null });
      db.update("projects", (x) => x.id === p.id, { status: "revision_requested", revisions_used: Number(p.revisions_used) + 1, completed_at: null });
      db.insert("render_jobs", { project_id: p.id, user_id: uid, status: "queued", progress: 40, current_step: "planning", kind: "revision", step_history: [{ step: "planning", at: now }] });
      return { data: rev, error: null };
    }

    case "approve_project": {
      const rows = db.update("projects", (x) => x.id === args.p_project_id && x.user_id === uid && x.status === "ready", { status: "completed", completed_at: now });
      return rows.length ? { data: rows[0], error: null } : fail("project_not_ready");
    }

    case "duplicate_project": {
      const src = db.rows("projects").find((x) => x.id === args.p_project_id && x.user_id === uid);
      if (!src) return fail("project_not_found", "P0002");
      const asVersion = Boolean(args.p_as_version);
      const root = (src.parent_project_id as string) ?? src.id;
      const version = asVersion ? Math.max(1, ...db.rows("projects").filter((x) => x.id === root || x.parent_project_id === root).map((x) => Number(x.version))) + 1 : 1;
      const copy = db.insert("projects", {
        user_id: src.user_id,
        name: String(asVersion ? src.name : `${src.name} (cópia)`).slice(0, 140),
        status: "draft",
        objective: src.objective,
        legal_area: src.legal_area,
        editing_style: src.editing_style,
        platforms: src.platforms,
        aspect_ratios: src.aspect_ratios,
        settings: src.settings,
        options: src.options,
        instructions: src.instructions,
        wizard_step: asVersion ? 3 : 2,
        source_duration_sec: src.source_duration_sec,
        source_width: src.source_width,
        source_height: src.source_height,
        source_size_bytes: src.source_size_bytes,
        thumbnail_path: src.thumbnail_path,
        parent_project_id: asVersion ? root : null,
        version,
        folder_id: src.folder_id,
      });
      for (const f of db.rows("project_files").filter((x) => x.project_id === src.id && x.status === "uploaded")) {
        const { id: _id, created_at: _c, updated_at: _u, ...rest } = f;
        void _id;
        void _c;
        void _u;
        db.insert("project_files", { ...rest, project_id: copy.id });
      }
      return { data: copy, error: null };
    }

    default:
      return fail(`função ${fn} indisponível na demonstração`);
  }
}
