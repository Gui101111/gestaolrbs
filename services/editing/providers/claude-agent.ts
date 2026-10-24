import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getClaudeGateway } from "../claude/gateway";
import { messageForNew, messageForRevision } from "../claude/message";
import { buildSandboxBrief } from "../claude/sandbox-brief";
import { nextVersion } from "../claude/session-lifecycle";
import type { VideoEditingProvider } from "../types";

/**
 * Edição automática com Claude Managed Agents.
 *
 * Cria a sessão do agente com o brief e as URLs assinadas e responde na hora:
 * o agente baixa o original direto do Storage, edita na sandbox e envia os
 * arquivos de volta pelas URLs assinadas. O fim chega pelo webhook
 * /api/webhooks/claude (session.status_idled). O id da sessão fica só em
 * editing_sessions (admin), nunca no navegador.
 *
 * Ajustes: nova mensagem na mesma sessão (os arquivos de trabalho continuam
 * lá); se ela não existir mais, abre uma nova com o plano da versão anterior.
 */
export const claudeAgentProvider: VideoEditingProvider = {
  name: "claude",
  async dispatch(job, brief) {
    const gw = await getClaudeGateway();
    if (!gw) throw new Error("claude_provider_not_configured");
    const admin = createAdminClient();
    const version = await nextVersion(admin, job.project_id);
    const isRevision = job.kind === "revision";

    const { data: previous } = await admin
      .from("editing_sessions")
      .select("session_id, version, archived_at, status")
      .eq("project_id", job.project_id)
      .neq("job_id", job.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let sessionId: string | null = null;
    if (isRevision && previous && !previous.archived_at && previous.status !== "failed") {
      const info = await gw.getSession(previous.session_id).catch(() => null);
      if (info && info.status === "idle" && !info.archived) {
        const { sandbox } = await buildSandboxBrief(admin, { brief, userId: job.user_id, version, kind: "ajuste", previousVersion: previous.version });
        await gw.sendMessage(previous.session_id, messageForRevision(sandbox));
        sessionId = previous.session_id;
      }
    }
    if (!sessionId) {
      const { sandbox } = await buildSandboxBrief(admin, {
        brief,
        userId: job.user_id,
        version,
        kind: isRevision ? "ajuste" : "novo",
        previousVersion: isRevision ? (previous?.version ?? (version > 1 ? version - 1 : null)) : null,
      });
      const started = await gw.startSession({
        title: `projeto ${job.project_id} v${version}`,
        message: isRevision ? messageForRevision(sandbox) : messageForNew(sandbox),
        metadata: { project_id: job.project_id, job_id: job.id, version: String(version) },
      });
      sessionId = started.sessionId;
    }

    const { error } = await admin.from("editing_sessions").upsert({
      job_id: job.id,
      project_id: job.project_id,
      user_id: job.user_id,
      provider: gw.name,
      session_id: sessionId,
      version,
      status: "running",
      stop_reason: null,
      followups: 0,
      error: null,
      report: null,
      started_at: new Date().toISOString(),
      finished_at: null,
    });
    if (error) throw new Error("editing_session_insert_failed");
    await admin.from("render_jobs").update({ output_version: version, review_status: "none", compliance_flags: [] }).eq("id", job.id);
    // externalId nulo de propósito: render_jobs é lido pelo cliente
    return { externalId: null, status: "running", message: "Edição automática iniciada." };
  },
};
