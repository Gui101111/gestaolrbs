import type { Metadata } from "next";
import { SubscriptionView } from "@/components/billing/subscription-view";
import { AppPageHeader } from "@/components/shared/app-page-header";
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
    <div className="space-y-8 pt-2 pb-8">
      <AppPageHeader title="Assinatura" subtitle="Uso do mês, cobranças e troca de plano." />
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
