import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { SettingsForm } from "@/components/account/settings-form";
import { requireOnboardedProfile } from "@/lib/auth/dal";

export const metadata: Metadata = { title: "Configurações" };

export default async function SettingsPage() {
  const { user, profile } = await requireOnboardedProfile();
  const prefs = (profile.preferences ?? {}) as { email_notifications?: boolean; product_news?: boolean };
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Configurações" title="Preferências da conta" description="Padrões de edição, notificações e segurança." />
      <SettingsForm
        email={user.email ?? ""}
        initial={{
          defaultEditingStyle: profile.default_editing_style ?? "",
          defaultPlatforms: profile.default_platforms ?? [],
          emailNotifications: prefs.email_notifications !== false,
          productNews: prefs.product_news === true,
        }}
      />
    </div>
  );
}
