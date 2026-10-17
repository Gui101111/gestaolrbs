import type { Metadata } from "next";
import { AppPageHeader } from "@/components/shared/app-page-header";
import { SettingsTabs } from "@/components/account/settings-tabs";
import { requireOnboardedProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { resolveAvatar } from "@/services/storage";

export const metadata: Metadata = { title: "Configurações" };

export default async function SettingsPage() {
  const { user, profile } = await requireOnboardedProfile();
  const supabase = await createClient();
  const avatarUrl = await resolveAvatar(supabase, profile.avatar_url);
  const prefs = (profile.preferences ?? {}) as { email_notifications?: boolean; product_news?: boolean };
  const treatment = profile.treatment === "dr" || profile.treatment === "dra" ? profile.treatment : "";

  return (
    <div className="mx-auto max-w-3xl space-y-8 pt-2 pb-8">
      <AppPageHeader title="Configurações" subtitle="Conta, segurança e aparência." />
      <SettingsTabs
        userId={user.id}
        email={user.email ?? ""}
        avatarUrl={avatarUrl}
        provider={(user.app_metadata?.provider as string) ?? "email"}
        profile={{
          fullName: profile.full_name ?? "",
          treatment,
          phone: profile.phone ?? "",
          officeName: profile.office_name ?? "",
          oabNumber: profile.oab_number ?? "",
          oabUf: profile.oab_uf ?? "",
          legalArea: profile.legal_area ?? "",
          practiceAreas: profile.practice_areas ?? [],
          mainGoal: profile.main_goal ?? "",
        }}
        preferences={{
          defaultEditingStyle: profile.default_editing_style ?? "",
          defaultPlatforms: profile.default_platforms ?? [],
          emailNotifications: prefs.email_notifications !== false,
          productNews: prefs.product_news === true,
        }}
      />
    </div>
  );
}
