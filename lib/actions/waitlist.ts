"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { emailSchema } from "@/lib/validations/common";
import type { ActionResult } from "@/types/domain";

const schema = z.object({ email: emailSchema, plan: z.string().max(40).optional() });

export async function joinWaitlist(input: { email: string; plan?: string }): Promise<ActionResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos.", field: "email" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("waitlist")
    .insert({ email: parsed.data.email, plan_slug: parsed.data.plan ?? null, source: "landing" });
  // E-mail já cadastrado também é sucesso para o usuário
  if (error && error.code !== "23505") return { ok: false, error: "Não foi possível registrar agora. Tente novamente." };
  return { ok: true };
}
