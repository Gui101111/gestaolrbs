"use server";

import Anthropic from "@anthropic-ai/sdk";
import { getSessionUser } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { ASSISTENTE_SISTEMA } from "@/lib/claude/assistente";
import type { ActionResult } from "@/types/domain";

const LIMITE_DIA = () => Math.max(1, Number(process.env.ASSISTANT_DAILY_LIMIT ?? "20") || 20);

/** Início do dia em Brasília (UTC-3), para o limite diário. */
function inicioDoDia() {
  const agora = new Date(Date.now() - 3 * 3600_000);
  return new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate()) + 3 * 3600_000).toISOString();
}

/**
 * "Perguntar à Tribuna" com IA (Claude Haiku). Responde só sobre a plataforma,
 * gravação e regras gerais da OAB; limite diário por usuário.
 */
export async function askTribunaAction(question: string): Promise<ActionResult<{ answer: string; remaining: number }> & { unavailable?: boolean }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Entre na sua conta para perguntar." };
  const q = String(question ?? "").trim();
  if (q.length < 3) return { ok: false, error: "Escreva sua pergunta." };
  if (q.length > 600) return { ok: false, error: "Pergunta longa demais (até 600 caracteres)." };
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, unavailable: true, error: "O assistente com IA ainda não foi ligado. Veja as respostas de Como fazer abaixo." };
  }

  const admin = createAdminClient();
  const { count } = await admin.from("assistant_messages").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", inicioDoDia());
  const limite = LIMITE_DIA();
  if ((count ?? 0) >= limite) return { ok: false, error: `Você chegou ao limite de ${limite} perguntas por dia. Volte amanhã ou veja Como fazer.` };

  try {
    const client = new Anthropic();
    const res = await client.messages.create({
      model: process.env.ASSISTANT_MODEL ?? "claude-haiku-5-5",
      max_tokens: 700,
      system: [{ type: "text", text: ASSISTENTE_SISTEMA, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: q }],
    });
    const answer =
      res.stop_reason === "refusal"
        ? "Não consigo ajudar com essa pergunta. Posso explicar como usar a plataforma ou como gravar seus vídeos."
        : res.content
            .filter((b): b is Anthropic.TextBlock => b.type === "text")
            .map((b) => b.text)
            .join("\n")
            .trim();
    await admin.from("assistant_messages").insert({ user_id: user.id, question: q, answer: answer.slice(0, 4000) });
    return { ok: true, data: { answer, remaining: Math.max(0, limite - (count ?? 0) - 1) } };
  } catch (e) {
    console.error("[assistente] falha", e instanceof Error ? e.message : e);
    return { ok: false, error: "O assistente não respondeu agora. Tente de novo em instantes." };
  }
}
