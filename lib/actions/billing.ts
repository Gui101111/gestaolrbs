"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getSessionUser } from "@/lib/auth/dal";
import { isValidCpfCnpj, onlyDigits } from "@/lib/validations/document";
import { friendlyError, messageFor } from "@/lib/errors";
import { getPaymentProvider } from "@/services/payments";
import type { ActionResult } from "@/types/domain";

const subscribeSchema = z.object({
  planSlug: z.string().regex(/^[a-z0-9-]+$/),
  billingType: z.enum(["CREDIT_CARD", "PIX", "UNDEFINED"]),
  cpfCnpj: z.string().refine(isValidCpfCnpj, "Informe um CPF ou CNPJ válido."),
});

/** Inicia a assinatura no gateway e devolve a URL de pagamento (cartão ou Pix). */
export async function subscribeAction(input: z.input<typeof subscribeSchema>): Promise<ActionResult<{ checkoutUrl: string | null }>> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: friendlyError("session_expired") };
  const parsed = subscribeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos.", field: "cpfCnpj" };

  const provider = getPaymentProvider();
  if (!provider.isConfigured()) return { ok: false, error: messageFor("payments_not_configured") };

  const supabase = await createClient();
  const { data: plan } = await supabase.from("plans").select("*").eq("slug", parsed.data.planSlug).eq("is_active", true).maybeSingle();
  if (!plan || !plan.is_public) return { ok: false, error: "Plano indisponível." };
  if (plan.price_cents == null || plan.price_cents <= 0) return { ok: false, error: messageFor("plan_without_price") };

  const admin = createAdminClient();
  const { data: current } = await admin.from("subscriptions").select("*").eq("user_id", user.id).maybeSingle();
  const profile = await getProfile();

  try {
    // Já existe assinatura paga ativa no gateway: apenas troca o plano
    if (current?.provider === provider.name && current.provider_subscription_id && current.status === "active") {
      await provider.updateSubscriptionPlan(current.provider_subscription_id, plan);
      await admin.from("subscriptions").update({ plan_id: plan.id, cancel_at_period_end: false }).eq("id", current.id);
      revalidatePath("/app", "layout");
      return { ok: true, data: { checkoutUrl: null } };
    }

    const result = await provider.createSubscription({
      user: { id: user.id, email: user.email ?? "", name: profile?.full_name ?? user.email ?? "Cliente", phone: profile?.phone },
      plan,
      billingType: parsed.data.billingType,
      cpfCnpj: onlyDigits(parsed.data.cpfCnpj),
      existingCustomerId: current?.provider === provider.name ? current.provider_customer_id : null,
    });

    // Mantém o acesso atual (ex.: avaliação) até a confirmação do pagamento pelo webhook
    await admin.from("subscriptions").upsert(
      {
        user_id: user.id,
        plan_id: current?.plan_id ?? null,
        status: current?.status ?? "incomplete",
        provider: provider.name,
        provider_customer_id: result.customerId,
        provider_subscription_id: result.subscriptionId,
        current_period_start: current?.current_period_start ?? null,
        current_period_end: current?.current_period_end ?? null,
      },
      { onConflict: "user_id" },
    );
    return { ok: true, data: { checkoutUrl: result.checkoutUrl } };
  } catch (e) {
    const code = e instanceof Error ? e.message : "unknown";
    return { ok: false, error: code === "plan_without_price" || code === "payments_not_configured" ? messageFor(code) : "Não foi possível iniciar o pagamento agora. Tente novamente em instantes." };
  }
}

export async function cancelSubscriptionAction(): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: friendlyError("session_expired") };
  const admin = createAdminClient();
  const { data: sub } = await admin.from("subscriptions").select("*").eq("user_id", user.id).maybeSingle();
  if (!sub || sub.status === "canceled") return { ok: false, error: "Nenhuma assinatura ativa." };
  try {
    const provider = getPaymentProvider();
    if (sub.provider === provider.name && sub.provider_subscription_id) await provider.cancelSubscription(sub.provider_subscription_id);
  } catch {
    return { ok: false, error: "Não foi possível cancelar agora. Tente novamente ou fale com o suporte." };
  }
  // O acesso continua até o fim do ciclo já pago
  await admin.from("subscriptions").update({ cancel_at_period_end: true, canceled_at: new Date().toISOString() }).eq("id", sub.id);
  revalidatePath("/app", "layout");
  return { ok: true };
}
