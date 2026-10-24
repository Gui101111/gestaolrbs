import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPaymentProvider } from "@/services/payments";
import { emailTemplates, sendEmail } from "@/services/email";
import type { Database } from "@/types/database";

type PaymentStatus = Database["public"]["Enums"]["payment_status"];

const STATUS: Record<string, PaymentStatus> = {
  payment_created: "pending",
  payment_confirmed: "confirmed",
  payment_overdue: "overdue",
  payment_refunded: "refunded",
  payment_canceled: "canceled",
};

/**
 * Webhook do gateway. Idempotente: pode ser reenviado sem efeitos duplicados.
 * Autenticado pelo header asaas-access-token (ASAAS_WEBHOOK_TOKEN).
 */
export async function POST(request: Request) {
  const provider = getPaymentProvider();
  const event = await provider.parseWebhook(request);
  if (!event) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (event.type === "ignored") return NextResponse.json({ ok: true });

  const admin = createAdminClient();
  const [refUser, refPlan] = (event.externalReference ?? "").split("|");

  let { data: sub } = event.providerSubscriptionId
    ? await admin.from("subscriptions").select("*").eq("provider_subscription_id", event.providerSubscriptionId).maybeSingle()
    : { data: null };
  if (!sub && refUser) ({ data: sub } = await admin.from("subscriptions").select("*").eq("user_id", refUser).maybeSingle());
  if (!sub) return NextResponse.json({ ok: true, note: "subscription_not_found" });

  // Registro do pagamento
  if (event.providerPaymentId && STATUS[event.type]) {
    await admin.from("payments").upsert(
      {
        user_id: sub.user_id,
        subscription_id: sub.id,
        provider: provider.name,
        provider_payment_id: event.providerPaymentId,
        amount_cents: event.amountCents,
        status: STATUS[event.type],
        billing_type: event.billingType,
        invoice_url: event.invoiceUrl,
        due_date: event.dueDate,
        paid_at: event.type === "payment_confirmed" ? (event.paidAt ? new Date(event.paidAt).toISOString() : new Date().toISOString()) : null,
      },
      { onConflict: "provider_payment_id" },
    );
  }

  const { data: profile } = await admin.from("profiles").select("full_name, email").eq("id", sub.user_id).single();
  const planId = refPlan || sub.plan_id;
  const { data: plan } = planId ? await admin.from("plans").select("name, billing_interval").eq("id", planId).maybeSingle() : { data: null };

  if (event.type === "payment_confirmed") {
    const start = event.paidAt ? new Date(event.paidAt) : new Date();
    const end = new Date(start);
    if (plan?.billing_interval === "year") end.setFullYear(end.getFullYear() + 1);
    else end.setMonth(end.getMonth() + 1);
    const alreadyCovered = sub.status === "active" && sub.current_period_end && new Date(sub.current_period_end) > end;
    if (!alreadyCovered) {
      await admin
        .from("subscriptions")
        .update({
          status: "active",
          plan_id: planId,
          current_period_start: start.toISOString(),
          current_period_end: end.toISOString(),
          cancel_at_period_end: false,
          canceled_at: null,
        })
        .eq("id", sub.id);
      await admin.from("notifications").insert({
        user_id: sub.user_id,
        type: "payment_confirmed",
        title: "Pagamento confirmado",
        body: `Sua assinatura do ${plan?.name ?? "plano"} está ativa.`,
        link: "/app/assinatura",
      });
      if (profile?.email) await sendEmail({ to: profile.email, ...emailTemplates.paymentConfirmed(profile.full_name?.split(" ")[0] ?? "", plan?.name ?? "plano") });
    }
  } else if (event.type === "payment_overdue") {
    await admin.from("subscriptions").update({ status: "past_due" }).eq("id", sub.id);
    if (profile?.email) await sendEmail({ to: profile.email, ...emailTemplates.paymentFailed(profile.full_name?.split(" ")[0] ?? "", plan?.name ?? "plano") });
  } else if (event.type === "subscription_canceled") {
    await admin.from("subscriptions").update({ cancel_at_period_end: true, canceled_at: new Date().toISOString() }).eq("id", sub.id);
  } else if (event.type === "payment_refunded") {
    await admin.from("subscriptions").update({ status: "canceled", canceled_at: new Date().toISOString() }).eq("id", sub.id);
  }

  return NextResponse.json({ ok: true });
}
