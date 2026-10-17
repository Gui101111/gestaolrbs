import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { Profile } from "@/types/domain";
import { ROUTES } from "@/lib/routes";

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

/** Exige usuário com onboarding concluído. */
export async function requireOnboardedProfile() {
  const user = await requireUser();
  const profile = await getProfile();
  if (!profile) redirect(`${ROUTES.login}?error=perfil`);
  if (!profile.onboarding_completed_at) redirect("/onboarding");
  return { user, profile };
}

export async function requireAdmin() {
  const user = await requireUser("/admin");
  const profile = await getProfile();
  if (!profile || profile.role !== "admin") redirect("/app");
  return { user, profile };
}
