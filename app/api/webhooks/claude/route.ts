import { createAdminClient } from "@/lib/supabase/admin";
import { unwrapWebhook } from "@/services/editing/claude/gateway";
import { finalizeSession, syncProgress, terminateSession } from "@/services/editing/claude/session-lifecycle";

// A finalização pode copiar arquivos da sessão para o Storage (plano B).
export const maxDuration = 300;

/**
 * Webhooks do Claude Managed Agents (Console → Webhooks, workspace "tribuna").
 * Eventos assinados: session.status_idled, session.status_terminated
 * (opcional: session.status_run_started, para o progresso).
 * O corpo é lido cru: a assinatura é calculada sobre os bytes recebidos.
 */
export async function POST(request: Request) {
  const body = await request.text();
  let event: ReturnType<typeof unwrapWebhook>;
  try {
    event = unwrapWebhook(body, Object.fromEntries(request.headers));
  } catch {
    return new Response("assinatura inválida", { status: 400 });
  }

  const admin = createAdminClient();
  // reenvios trazem o mesmo id: processa uma vez só
  const { data: seen } = await admin.from("processed_webhooks").select("id").eq("id", event.id).maybeSingle();
  if (seen) return new Response(null, { status: 204 });

  const data = event.data as { type: string; id: string };
  try {
    if (data.type === "session.status_idled") {
      const result = await finalizeSession(data.id);
      console.info("[claude] sessão ociosa", data.id, result.outcome);
    } else if (data.type === "session.status_terminated") {
      const result = await terminateSession(data.id);
      console.info("[claude] sessão encerrada", data.id, result.outcome);
    } else if (data.type === "session.status_run_started") {
      const { data: es } = await admin.from("editing_sessions").select("job_id").eq("session_id", data.id).eq("status", "running").maybeSingle();
      if (es) await syncProgress(es.job_id).catch(() => null);
    }
  } catch (e) {
    console.error("[claude] falha ao processar webhook", data.type, data.id, e);
    // 500 faz a Anthropic reenviar (até 3 tentativas); o cron cobre o resto
    return new Response("erro ao processar", { status: 500 });
  }

  await admin.from("processed_webhooks").insert({ id: event.id, source: "claude" });
  return new Response(null, { status: 204 });
}
