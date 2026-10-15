"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { emailSchema, nameSchema, passwordSchema } from "@/lib/validations/common";
import { errorCode, friendlyError } from "@/lib/errors";
import type { ActionResult } from "@/types/domain";

async function siteUrl() {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Evita open redirect: só aceita caminhos internos. */
function safeNext(next: unknown, fallback = "/app") {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}

// ---------------------------------------------------------------------------
const signUpSchema = z.object({
  fullName: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  terms: z.literal(true, { error: "Aceite os Termos de Uso e a Política de Privacidade." }),
});

export async function signUpAction(input: z.input<typeof signUpSchema>): Promise<ActionResult<{ email: string }>> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message ?? "Verifique os dados.", field: String(issue?.path[0] ?? "") };
  }
  const { fullName, email, password } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${await siteUrl()}/auth/confirm?next=/onboarding`,
      data: { full_name: fullName, terms_accepted: true },
    },
  });
  if (error) {
    const code = errorCode(error);
    return { ok: false, error: friendlyError(error), field: code === "user_already_exists" ? "email" : undefined };
  }
  // Supabase não revela se o e-mail já existe quando a confirmação está ativa (identities vazio)
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    return { ok: false, error: friendlyError("user_already_exists"), field: "email" };
  }
  return { ok: true, data: { email } };
}

// ---------------------------------------------------------------------------
const signInSchema = z.object({ email: emailSchema, password: z.string().min(1, "Informe sua senha.") });

export async function signInAction(
  input: z.input<typeof signInSchema> & { next?: string },
): Promise<ActionResult<{ redirectTo: string }> & { unconfirmed?: boolean }> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message ?? "Verifique os dados.", field: String(issue?.path[0] ?? "") };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    const code = errorCode(error);
    return { ok: false, error: friendlyError(error), unconfirmed: code === "email_not_confirmed" };
  }
  return { ok: true, data: { redirectTo: safeNext(input.next) } };
}

// ---------------------------------------------------------------------------
export async function signInWithGoogleAction(next?: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${await siteUrl()}/auth/callback?next=${encodeURIComponent(safeNext(next))}`,
      queryParams: { prompt: "select_account" },
    },
  });
  if (error || !data.url) {
    redirect(`/login?error=${encodeURIComponent("google")}`);
  }
  redirect(data.url);
}

// ---------------------------------------------------------------------------
export async function resendConfirmationAction(email: string): Promise<ActionResult> {
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return { ok: false, error: "Informe um e-mail válido." };
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data,
    options: { emailRedirectTo: `${await siteUrl()}/auth/confirm?next=/onboarding` },
  });
  if (error) return { ok: false, error: friendlyError(error) };
  return { ok: true };
}

// ---------------------------------------------------------------------------
export async function forgotPasswordAction(email: string): Promise<ActionResult> {
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return { ok: false, error: "Informe um e-mail válido.", field: "email" };
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${await siteUrl()}/auth/confirm?next=/reset-password`,
  });
  // Não revela se a conta existe; só reporta limites de envio
  if (error && errorCode(error).startsWith("over_")) return { ok: false, error: friendlyError(error) };
  return { ok: true };
}

// ---------------------------------------------------------------------------
const resetSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: "As senhas não conferem.", path: ["confirm"] });

export async function updatePasswordAction(input: z.input<typeof resetSchema>): Promise<ActionResult> {
  const parsed = resetSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message ?? "Verifique os dados.", field: String(issue?.path[0] ?? "") };
  }
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, error: friendlyError("session_expired") };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, error: friendlyError(error), field: "password" };
  return { ok: true };
}

// ---------------------------------------------------------------------------
export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login?saiu=1");
}
