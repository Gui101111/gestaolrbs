import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell/app-shell";
import type { FolderItem } from "@/components/app-shell/nav";
import { requireOnboardedProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { resolveAvatar } from "@/services/storage";
import { welcomeName } from "@/lib/utils";

export const metadata: Metadata = { title: { default: "Início", template: "%s · TRIBUNA" }, robots: { index: false } };

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireOnboardedProfile();
  const supabase = await createClient();
  const [{ data: notifications }, avatarUrl, { data: folders }, { data: folderRefs }] = await Promise.all([
    supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(15),
    resolveAvatar(supabase, profile.avatar_url),
    supabase.from("folders").select("id, name, color, parent_id, position").eq("owner_id", user.id),
    supabase.from("projects").select("folder_id").eq("user_id", user.id).not("folder_id", "is", null),
  ]);

  const counts = new Map<string, number>();
  folderRefs?.forEach((r) => r.folder_id && counts.set(r.folder_id, (counts.get(r.folder_id) ?? 0) + 1));
  const folderItems: FolderItem[] = (folders ?? []).map((f) => ({ ...f, count: counts.get(f.id) ?? 0 }));

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
      notifications={notifications ?? []}
      folders={folderItems}
    >
      {children}
    </AppShell>
  );
}
