"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SETTINGS_TABS, type SettingsTab } from "@/components/app-shell/nav";
import { DeleteAccountPanel, ProfileForm, SecurityPanel, type ProfileValues } from "@/components/account/profile-form";
import { AppearancePanel, DefaultsPanel, NotificationsPanel, type PreferenceValues } from "@/components/account/settings-form";
import { ROUTES } from "@/lib/routes";

function isTab(v: string | null): v is SettingsTab {
  return SETTINGS_TABS.some((t) => t.value === v);
}

/** Configurações em abas, sincronizadas com ?aba= (o painel lateral usa os mesmos links). */
export function SettingsTabs({
  userId,
  email,
  avatarUrl,
  provider,
  profile,
  preferences,
}: {
  userId: string;
  email: string;
  avatarUrl: string | null;
  provider: string;
  profile: ProfileValues;
  preferences: PreferenceValues;
}) {
  const params = useSearchParams();
  const raw = params.get("aba");
  const tab: SettingsTab = isTab(raw) ? raw : "conta";

  const select = (value: string) => {
    if (!isTab(value)) return;
    window.history.replaceState(null, "", `${ROUTES.settings}?aba=${value}`);
  };

  return (
    <Tabs value={tab} onValueChange={select} className="space-y-6">
      <TabsList aria-label="Seções de configurações" className="lg:hidden">
        {SETTINGS_TABS.map((t) => (
          <TabsTrigger key={t.value} value={t.value}>
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="conta" className="space-y-5">
        <ProfileForm userId={userId} email={email} avatarUrl={avatarUrl} provider={provider} initial={profile} />
        <DefaultsPanel initial={preferences} />
      </TabsContent>
      <TabsContent value="seguranca">
        <SecurityPanel email={email} />
      </TabsContent>
      <TabsContent value="aparencia">
        <AppearancePanel />
      </TabsContent>
      <TabsContent value="notificacoes">
        <NotificationsPanel initial={preferences} />
      </TabsContent>
      <TabsContent value="excluir">
        <DeleteAccountPanel />
      </TabsContent>
    </Tabs>
  );
}
