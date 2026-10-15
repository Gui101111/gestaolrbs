import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { SubscriptionView } from "@/components/billing/subscription-view";
import { requireOnboardedProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { getBillingInfo } from "@/services/projects/queries";
import { getPublicPlans } from "@/services/billing/plans";
import { getPaymentProvider } from "@/services/payments";

export const metadata: Metadata = { title: "Assinatura" };

export default async function SubscriptionPage() {
  const { user } = await requireOnboardedProfile();
  const supabase = await createClient();
  const [billing, plans, { data: payments }] = await Promise.all([
    getBillingInfo(user.id),
    getPublicPlans(),
    supabase.from("payments").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(24),
  ]);
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Assinatura" title="Plano e pagamentos" description="Acompanhe seu uso, troque de plano e consulte faturas." />
      <SubscriptionView
        email={user.email ?? ""}
        subscription={billing.subscription}
        plan={billing.plan}
        usage={billing.usage}
        active={billing.active}
        plans={plans}
        payments={payments ?? []}
        paymentsEnabled={getPaymentProvider().isConfigured()}
      />
    </div>
  );
}
