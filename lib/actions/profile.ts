"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth/dal";
import { brandKitSchema, onboardingSchema, preferencesSchema, profileSchema } from "@/lib/validations/profile";
import type { BrandKitInput, OnboardingInput, PreferencesInput, ProfileInput } from "@/lib/validations/profile";
import { friendlyError } from "@/lib/errors";
import { emailTemplates, sendEmail } from "@/services/email";
import { BUCKETS } from "@/lib/constants/domain";
import type { ActionResult } from "@/types/domain";

const blank = (v?: string | null) => (v && v.trim() ? v.trim() : null);

export async function completeOnboardingAction(input: OnboardingInput): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: friendlyError("session_expired") };
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message ?? "Verifique os dados.", field: String(issue?.path[0] ?? "") };
  }
  const v = parsed.data;
  const supabase = await createClient();
  const { data: current } = await supabase.from("profiles").select("onboarding_completed_at, terms_accepted_at").eq("id", user.id).single();

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: v.fullName,
      office_name: blank(v.officeName),
      oab_number: blank(v.oabNumber),
      oab_uf: blank(v.oabUf),
      legal_area: v.legalArea,
      practice_areas: [v.legalArea],
      main_goal: v.mainGoal,
      onboarding_completed_at: current?.onboarding_completed_at ?? new Date().toISOString(),
      // Cadastro via Google: o aceite acontece no onboarding
      terms_accepted_at: current?.terms_accepted_at ?? new Date().toISOString(),
    })
    .eq("id", user.id);
  if (error) return { ok: false, error: friendlyError(error) };

  const oabDisplay = v.oabNumber && v.oabUf ? `OAB/${v.oabUf} ${v.oabNumber}` : null;
  await supabase
    .from("brand_kits")
    .upsert(
      { user_id: user.id, office_name: blank(v.officeName), professional_name: v.fullName, oab_display: oabDisplay },
      { onConflict: "user_id" },
    );

  if (!current?.onboarding_completed_at && user.email) {
    const t = emailTemplates.welcome(v.fullName.split(" ")[0] ?? "");
    await sendEmail({ to: user.email, ...t });
  }
  revalidatePath("/app", "layout");
  return { ok: true };
}

export async function updateProfileAction(input: ProfileInput): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: friendlyError("session_expired") };
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message ?? "Verifique os dados.", field: String(issue?.path[0] ?? "") };
  }
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: v.fullName,
      phone: blank(v.phone),
      office_name: blank(v.officeName),
      oab_number: blank(v.oabNumber),
      oab_uf: blank(v.oabUf),
      legal_area: blank(v.legalArea),
      main_goal: blank(v.mainGoal),
    })
    .eq("id", user.id);
  if (error) return { ok: false, error: friendlyError(error) };
  revalidatePath("/app", "layout");
  return { ok: true };
}

export async function updateAvatarAction(path: string | null): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: friendlyError("session_expired") };
  if (path && !path.startsWith(`${user.id}/`)) return { ok: false, error: friendlyError("forbidden") };
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ avatar_url: path ? `storage:${BUCKETS.brand}/${path}` : null }).eq("id", user.id);
  if (error) return { ok: false, error: friendlyError(error) };
  revalidatePath("/app", "layout");
  return { ok: true };
}

export async function saveBrandKitAction(input: BrandKitInput & { logoPath?: string | null }): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: friendlyError("session_expired") };
  const parsed = brandKitSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message ?? "Verifique os dados.", field: String(issue?.path[0] ?? "") };
  }
  if (input.logoPath && !input.logoPath.startsWith(`${user.id}/`)) return { ok: false, error: friendlyError("forbidden") };
  const v = parsed.data;
  const supabase = await createClient();
  const website = blank(v.website);
  const { error } = await supabase.from("brand_kits").upsert(
    {
      user_id: user.id,
      office_name: blank(v.officeName),
      professional_name: blank(v.professionalName),
      oab_display: blank(v.oabDisplay),
      primary_color: v.primaryColor.toUpperCase(),
      secondary_color: v.secondaryColor.toUpperCase(),
      accent_color: v.accentColor.toUpperCase(),
      font: blank(v.font),
      website: website && !/^https?:\/\//i.test(website) ? `https://${website}` : website,
      instagram: blank(v.instagram)?.replace(/^@/, "") ?? null,
      whatsapp: blank(v.whatsapp),
      ...(input.logoPath !== undefined ? { logo_path: input.logoPath } : {}),
    },
    { onConflict: "user_id" },
  );
  if (error) return { ok: false, error: friendlyError(error) };
  revalidatePath("/app/marca");
  return { ok: true };
}

export async function savePreferencesAction(input: PreferencesInput): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: friendlyError("session_expired") };
  const parsed = preferencesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Verifique as preferências." };
  const v = parsed.data;
  const supabase = await createClient();
  const current = await currentPreferences(user.id);
  const { error } = await supabase
    .from("profiles")
    .update({
      default_editing_style: blank(v.defaultEditingStyle),
      default_platforms: v.defaultPlatforms,
      preferences: { ...current, email_notifications: v.emailNotifications, product_news: v.productNews },
    })
    .eq("id", user.id);
  if (error) return { ok: false, error: friendlyError(error) };
  revalidatePath("/app/configuracoes");
  return { ok: true };
}

async function currentPreferences(userId: string): Promise<Record<string, unknown>> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("preferences").eq("id", userId).maybeSingle();
  const prefs = data?.preferences;
  return prefs && typeof prefs === "object" && !Array.isArray(prefs) ? (prefs as Record<string, unknown>) : {};
}

const uiPrefsSchema = z.object({
  setup_hidden: z.boolean().optional(),
  hidden_models: z.array(z.string().max(60)).max(20).optional(),
});

/** Preferências de interface (ocultar etapas, modelos visíveis no Início). Mescla com as atuais. */
export async function setUiPreferencesAction(patch: z.input<typeof uiPrefsSchema>): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: friendlyError("session_expired") };
  const parsed = uiPrefsSchema.safeParse(patch);
  if (!parsed.success) return { ok: false, error: "Preferência inválida." };
  const supabase = await createClient();
  const current = await currentPreferences(user.id);
  const { error } = await supabase
    .from("profiles")
    .update({ preferences: { ...current, ...parsed.data } })
    .eq("id", user.id);
  if (error) return { ok: false, error: friendlyError(error) };
  revalidatePath("/app");
  return { ok: true };
}

/** Exclusão definitiva da conta (LGPD): arquivos, dados e usuário. */
export async function deleteAccountAction(confirmation: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: friendlyError("session_expired") };
  if (confirmation.trim().toUpperCase() !== "EXCLUIR") return { ok: false, error: "Digite EXCLUIR para confirmar.", field: "confirmation" };

  const admin = createAdminClient();
  for (const bucket of Object.values(BUCKETS)) {
    await removeFolder(admin, bucket, user.id);
  }
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { ok: false, error: friendlyError(error) };

  const supabase = await createClient();
  await supabase.auth.signOut();
  return { ok: true };
}

type Admin = ReturnType<typeof createAdminClient>;

async function removeFolder(admin: Admin, bucket: string, prefix: string): Promise<void> {
  const { data } = await admin.storage.from(bucket).list(prefix, { limit: 1000 });
  if (!data?.length) return;
  const files: string[] = [];
  for (const item of data) {
    const path = `${prefix}/${item.name}`;
    if (item.id === null) await removeFolder(admin, bucket, path);
    else files.push(path);
  }
  if (files.length) await admin.storage.from(bucket).remove(files);
}
