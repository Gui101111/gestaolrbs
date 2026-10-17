import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell/app-shell";
import type { FolderItem, ShellUsage } from "@/components/app-shell/nav";
import { requireOnboardedProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { getBillingInfo } from "@/services/projects/queries";
import { resolveAvatar } from "@/services/storage";
import { formatDate, welcomeName } from "@/lib/utils";

export const metadata: Metadata = { title: { default: "Início", template: "%s · TRIBUNA" }, robots: { index: false } };

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireOnboardedProfile();
  const supabase = await createClient();
  const [billing, { data: notifications }, avatarUrl, { data: recents }, { data: folders }, { data: folderRefs }] = await Promise.all([
    getBillingInfo(user.id),
    supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(15),
    resolveAvatar(supabase, profile.avatar_url),
    supabase.from("projects").select("id, name, status, updated_at").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(5),
    supabase.from("folders").select("id, name, color, parent_id, position").eq("owner_id", user.id),
    supabase.from("projects").select("folder_id").eq("user_id", user.id).not("folder_id", "is", null),
  ]);

  const counts = new Map<string, number>();
  folderRefs?.forEach((r) => r.folder_id && counts.set(r.folder_id, (counts.get(r.folder_id) ?? 0) + 1));
  const folderItems: FolderItem[] = (folders ?? []).map((f) => ({ ...f, count: counts.get(f.id) ?? 0 }));

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

  const name = profile.full_name ?? user.email ?? "Usuário";

  return (
    <AppShell
      user={{
        id: user.id,
        name,
        displayName: welcomeName(profile.full_name, profile.treatment) || name,
        email: user.email ?? "",
        avatarUrl,
        isAdmin: profile.role === "admin",
      }}
      usage={usage}
      notifications={notifications ?? []}
      recents={recents ?? []}
      folders={folderItems}
    >
      {children}
    </AppShell>
  );
}
