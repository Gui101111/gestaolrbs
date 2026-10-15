import { PageHeader } from "@/components/shared/page-header";
import { PlansManager } from "@/components/admin/plans-manager";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/dal";

export const metadata = { title: "Planos" };

export default async function AdminPlans() {
  await requireAdmin();
  const { data: plans } = await createAdminClient().from("plans").select("*").order("sort_order");
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Admin" title="Planos" description="Preços, limites e visibilidade. Alterações refletem na landing e no checkout." />
      <PlansManager plans={plans ?? []} />
    </div>
  );
}
