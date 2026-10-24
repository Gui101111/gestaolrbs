import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncProgress } from "@/services/editing/claude/session-lifecycle";

/**
 * Chamado pela tela de processamento enquanto o vídeo é editado: lê a última
 * etapa do editor e avança a linha do tempo (o Realtime entrega a mudança).
 * No máximo uma consulta ao agente a cada 20 s por vídeo.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  // RLS: só encontra o job se o projeto for do usuário
  const { data: job } = await supabase
    .from("render_jobs")
    .select("id, status, updated_at")
    .eq("project_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!job || job.status !== "running") return NextResponse.json({ ok: true, step: null });
  if (Date.now() - new Date(job.updated_at).getTime() < 20_000) return NextResponse.json({ ok: true, step: null });
  const step = await syncProgress(job.id).catch(() => null);
  return NextResponse.json({ ok: true, step });
}
