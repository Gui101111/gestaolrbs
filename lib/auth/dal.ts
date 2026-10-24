import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { emailTemplates, sendEmail } from "@/services/email";
import type { Profile } from "@/types/domain";
import { ROUTES } from "@/lib/routes";
import { firstName } from "@/lib/utils";

/** Usuário autenticado (validado no servidor do Supabase Auth). */
export const getSessionUser = cache(async () => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
});

export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getSessionUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return data;
});

export async function requireUser(next?: string) {
  const user = await getSessionUser();
  if (!user) redirect(next ? `${ROUTES.login}?next=${encodeURIComponent(next)}` : ROUTES.login);
  return user;
}

/**
 * Sem perguntas de boas-vindas: no primeiro acesso o perfil já fica pronto
 * (o aceite dos termos vem do cadastro ou do aviso nas telas de acesso, que
 * vale também para o Google) e o e-mail de boas-vindas sai uma única vez.
 */
const markOnboarded = cache(async (): Promise<Profile | null> => {
  const profile = await getProfile();
  if (!profile || profile.onboarding_completed_at) return profile;
  const now = new Date().toISOString();
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .update({ onboarding_completed_at: now, terms_accepted_at: profile.terms_accepted_at ?? now })
    .eq("id", profile.id)
    .is("onboarding_completed_at", null)
    .select("*")
    .maybeSingle();
  const user = await getSessionUser();
  if (data && user?.email) await sendEmail({ to: user.email, ...emailTemplates.welcome(firstName(data.full_name)) });
  return data ?? { ...profile, onboarding_completed_at: now, terms_accepted_at: profile.terms_accepted_at ?? now };
});

/** Exige usuário com perfil (marcado como pronto no primeiro acesso). */
export async function requireOnboardedProfile() {
  const user = await requireUser();
  const profile = await markOnboarded();
  if (!profile) redirect(`${ROUTES.login}?error=perfil`);
  return { user, profile };
}

export async function requireAdmin() {
  const user = await requireUser("/admin");
  const profile = await getProfile();
  if (!profile || profile.role !== "admin") redirect("/app");
  return { user, profile };
}
