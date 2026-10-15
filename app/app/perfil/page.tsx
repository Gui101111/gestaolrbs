import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { ProfileForm } from "@/components/account/profile-form";
import { requireOnboardedProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { resolveAvatar } from "@/services/storage";

export const metadata: Metadata = { title: "Perfil" };

export default async function ProfilePage() {
  const { user, profile } = await requireOnboardedProfile();
  const supabase = await createClient();
  const avatarUrl = await resolveAvatar(supabase, profile.avatar_url);
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Perfil" title="Seus dados" description="Informações profissionais usadas nos vídeos e na sua conta." />
      <ProfileForm
        userId={user.id}
        email={user.email ?? ""}
        avatarUrl={avatarUrl}
        provider={(user.app_metadata?.provider as string) ?? "email"}
        initial={{
          fullName: profile.full_name ?? "",
          phone: profile.phone ?? "",
          officeName: profile.office_name ?? "",
          oabNumber: profile.oab_number ?? "",
          oabUf: profile.oab_uf ?? "",
          legalArea: profile.legal_area ?? "",
          mainGoal: profile.main_goal ?? "",
        }}
      />
    </div>
  );
}
