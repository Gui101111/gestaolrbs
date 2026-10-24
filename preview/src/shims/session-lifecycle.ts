// Sessões do Claude Managed Agents não existem na demonstração.
export async function archiveProjectSessions(_projectId: string) {}
export async function releaseReview(_jobId: string) {
  return { ok: true };
}
export async function finalizeSession(_sessionId: string) {
  return { outcome: "no_active_job" as const };
}
