import type { Metadata } from "next";
import { AppShell, type ShellUsage } from "@/components/dashboard/app-shell";
import { requireOnboardedProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { getBillingInfo } from "@/services/projects/queries";
import { resolveAvatar } from "@/services/storage";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: { default: "Painel", template: "%s · TRIBUNA" }, robots: { index: false } };

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireOnboardedProfile();
  const supabase = await createClient();
  const [billing, { data: notifications }, avatarUrl] = await Promise.all([
    getBillingInfo(user.id),
    supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(15),
    resolveAvatar(supabase, profile.avatar_url),
  ]);

  const limit = billing.plan?.videos_per_month ?? null;
  const usage: ShellUsage = {
    planName: billing.active ? (billing.plan?.name ?? null) : null,
    used: billing.usage?.videos_created ?? 0,
    limit: billing.active ? limit : null,
    caption: billing.active
      ? billing.subscription?.status === "trialing"
        ? `Avaliação até ${formatDate(billing.subscription.current_period_end)}`
        : `Renova em ${formatDate(billing.subscription?.current_period_end)}`
      : "Assine para enviar novos vídeos",
    active: billing.active,
  };

  return (
    <AppShell
      user={{
        id: user.id,
        name: profile.full_name ?? user.email ?? "Usuário",
        email: user.email ?? "",
        avatarUrl,
        isAdmin: profile.role === "admin",
      }}
      usage={usage}
      notifications={notifications ?? []}
    >
      {children}
    </AppShell>
  );
}
