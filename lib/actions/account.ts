"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/dal";
import { emailSchema, passwordSchema } from "@/lib/validations/common";
import { friendlyError } from "@/lib/errors";
import type { ActionResult } from "@/types/domain";
import { ROUTES } from "@/lib/routes";

export async function changePasswordAction(password: string, confirm: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: friendlyError("session_expired") };
  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Senha inválida.", field: "password" };
  if (password !== confirm) return { ok: false, error: "As senhas não conferem.", field: "confirm" };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, error: friendlyError(error), field: "password" };
  return { ok: true };
}

export async function changeEmailAction(email: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: friendlyError("session_expired") };
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return { ok: false, error: "Informe um e-mail válido.", field: "email" };
  if (parsed.data === user.email) return { ok: false, error: "Este já é o seu e-mail atual.", field: "email" };
  const h = await headers();
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? `http://${h.get("host")}`;
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ email: parsed.data }, { emailRedirectTo: `${site}/auth/confirm?next=/app/configuracoes` });
  if (error) return { ok: false, error: friendlyError(error), field: "email" };
  return { ok: true };
}

export async function signOutEverywhereAction() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });
  redirect(`${ROUTES.login}?saiu=1`);
}
