import type { Metadata } from "next";
import Link from "next/link";
import { Shield } from "lucide-react";
import { AppPageHeader } from "@/components/shared/app-page-header";
import { DeleteAccountPanel, ProfileForm, SignOutPanel } from "@/components/account/profile-form";
import { AppearancePanel } from "@/components/account/settings-form";
import { Button } from "@/components/ui/button";
import { requireOnboardedProfile } from "@/lib/auth/dal";
import { NO_LOGIN } from "@/lib/no-login";
import { createClient } from "@/lib/supabase/server";
import { resolveAvatar } from "@/services/storage";

export const metadata: Metadata = { title: "Conta" };

/** Conta: nome, e-mail, tema, sair e excluir conta (sem login: só nome e tema). */
export default async function AccountPage() {
  const { user, profile } = await requireOnboardedProfile();
  const supabase = await createClient();
  const avatarUrl = await resolveAvatar(supabase, profile.avatar_url);

  return (
    <div className="mx-auto max-w-3xl space-y-5 pt-2 pb-8">
      <AppPageHeader title="Conta" className="mb-6" />
      <ProfileForm
        email={user.email ?? ""}
        avatarUrl={avatarUrl}
        initialName={profile.full_name ?? ""}
        provider={(user.app_metadata?.provider as string) ?? "email"}
      />
      <AppearancePanel />
      {!NO_LOGIN && <SignOutPanel />}
      {profile.role === "admin" && (
        <Button asChild variant="outline" className="w-full">
          <Link href="/admin">
            <Shield /> Painel admin
          </Link>
        </Button>
      )}
      {!NO_LOGIN && <DeleteAccountPanel />}
    </div>
  );
}
