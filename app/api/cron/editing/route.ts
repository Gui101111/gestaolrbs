import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { claudeConfig } from "@/services/editing/claude/config";
import { getClaudeGateway } from "@/services/editing/claude/gateway";
import { archiveSession, failToManualQueue, finalizeSession, syncProgress, terminateSession } from "@/services/editing/claude/session-lifecycle";

export const maxDuration = 300;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!secret || !token) return false;
  const a = Buffer.from(secret);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

const MIN = 60_000;

/**
 * Vercel Cron (a cada 10 min, ver vercel.json). Webhooks podem se perder:
 * aqui conferimos as sessões em andamento, atualizamos o progresso na tela e
 * arquivamos sessões entregues há mais de 7 dias.
 */
export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const gw = await getClaudeGateway();
  if (!gw) return NextResponse.json({ ok: true, skipped: "claude_not_configured" });
  const admin = createAdminClient();
  const now = Date.now();
  const summary = { progress: 0, finalized: 0, terminated: 0, timedOut: 0, unlocked: 0, archived: 0, errors: 0 };

  // trava esquecida por uma finalização que caiu no meio
  const { data: stuck } = await admin
    .from("editing_sessions")
    .update({ status: "running" })
    .eq("status", "finalizing")
    .lt("updated_at", new Date(now - 15 * MIN).toISOString())
    .select("job_id");
  summary.unlocked = stuck?.length ?? 0;

  const { data: active } = await admin.from("editing_sessions").select("*").in("status", ["running", "awaiting_followup"]).order("started_at").limit(50);
  for (const es of active ?? []) {
    try {
      if (await syncProgress(es.job_id)) summary.progress++;
      const age = now - new Date(es.updated_at).getTime();
      if (age < claudeConfig.staleMinutes() * MIN) continue;
      const info = await gw.getSession(es.session_id);
      if (info.status === "idle") {
        await finalizeSession(es.session_id);
        summary.finalized++;
      } else if (info.status === "terminated") {
        await terminateSession(es.session_id);
        summary.terminated++;
      } else if (now - new Date(es.started_at).getTime() > 3 * 60 * MIN) {
        await failToManualQueue(es, "A edição passou de 3 horas sem terminar.", admin);
        summary.timedOut++;
      }
    } catch (e) {
      summary.errors++;
      console.error("[cron] sessão", es.session_id, e);
    }
  }

  const { data: old } = await admin
    .from("editing_sessions")
    .select("session_id, job_id")
    .in("status", ["delivered", "failed"])
    .is("archived_at", null)
    .lt("finished_at", new Date(now - 7 * 24 * 60 * MIN).toISOString())
    .limit(50);
  for (const es of old ?? []) {
    await archiveSession(es, admin);
    summary.archived++;
  }

  return NextResponse.json({ ok: true, ...summary });
}
