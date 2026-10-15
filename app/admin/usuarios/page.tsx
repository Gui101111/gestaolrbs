import { PageHeader } from "@/components/shared/page-header";
import { UsersTable, type AdminUserRow } from "@/components/admin/users-table";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/dal";

export const metadata = { title: "Usuários" };

export default async function AdminUsers() {
  await requireAdmin();
  const admin = createAdminClient();
  const [{ data: profiles }, { data: subs }, { data: plans }, { data: usage }, { data: projects }] = await Promise.all([
    admin.from("profiles").select("id, full_name, email, role, created_at").order("created_at", { ascending: false }).limit(500),
    admin.from("subscriptions").select("user_id, plan_id, status, current_period_end"),
    admin.from("plans").select("id, name").order("sort_order"),
    admin.from("usage").select("user_id, videos_created, period_start").order("period_start", { ascending: false }),
    admin.from("projects").select("user_id"),
  ]);
  const planName = new Map((plans ?? []).map((p) => [p.id, p.name]));
  const subBy = new Map((subs ?? []).map((s) => [s.user_id, s]));
  const usageBy = new Map<string, number>();
  (usage ?? []).forEach((u) => !usageBy.has(u.user_id) && usageBy.set(u.user_id, u.videos_created));
  const projectCount = new Map<string, number>();
  (projects ?? []).forEach((p) => projectCount.set(p.user_id, (projectCount.get(p.user_id) ?? 0) + 1));

  const rows: AdminUserRow[] = (profiles ?? []).map((p) => {
    const s = subBy.get(p.id);
    return {
      id: p.id,
      name: p.full_name,
      email: p.email,
      role: p.role,
      createdAt: p.created_at,
      planName: s?.plan_id ? (planName.get(s.plan_id) ?? null) : null,
      subStatus: s?.status ?? null,
      periodEnd: s?.current_period_end ?? null,
      videos: usageBy.get(p.id) ?? 0,
      projects: projectCount.get(p.id) ?? 0,
    };
  });
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Admin" title="Usuários" description="Assinaturas, uso e permissões." />
      <UsersTable users={rows} plans={plans ?? []} />
    </div>
  );
}
