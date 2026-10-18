import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 300;

/**
 * Revisão com IA da edição no navegador (texto da fala, cortes, título e
 * grafismos). Só atende quem tem uma edição em andamento: não é um chat aberto.
 * Sem ANTHROPIC_API_KEY, o editor usa a revisão local.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ code: "not_granted" }, { status: 401 });
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ code: "not_granted" }, { status: 503 });
  const body = (await req.json().catch(() => null)) as { prompt?: unknown } | null;
  const prompt = typeof body?.prompt === "string" ? body.prompt : "";
  if (prompt.length < 20 || prompt.length > 180_000) return NextResponse.json({ code: "invalid" }, { status: 400 });

  const admin = createAdminClient();
  const { count } = await admin.from("render_jobs").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("provider", "navegador").eq("status", "running");
  if (!count) return NextResponse.json({ code: "not_granted" }, { status: 403 });

  try {
    const client = new Anthropic();
    const msg = await client.messages
      .stream({
        model: process.env.EDITOR_MODEL ?? "claude-opus-5-5",
        max_tokens: 16_000,
        thinking: { type: "adaptive" },
        messages: [{ role: "user", content: prompt }],
      })
      .finalMessage();
    if (msg.stop_reason === "refusal") return NextResponse.json({ code: "refused" }, { status: 422 });
    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    return NextResponse.json({ text, truncated: msg.stop_reason === "max_tokens" });
  } catch (e) {
    console.error("[editor/ia] falha", e instanceof Error ? e.message : e);
    return NextResponse.json({ code: "error" }, { status: 502 });
  }
}
