import "server-only";
import { onlyDigits } from "@/lib/validations/document";
import type { CheckoutInput, PaymentEvent, PaymentProvider } from "./types";
import type { Plan } from "@/types/domain";

function baseUrl() {
  return process.env.ASAAS_ENV === "production" ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3";
}

async function asaas<T>(path: string, init?: RequestInit): Promise<T> {
  const key = process.env.ASAAS_API_KEY;
  if (!key) throw new Error("payments_not_configured");
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      access_token: key,
      "User-Agent": "TRIBUNA/1.0",
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[asaas]", res.status, path, body.slice(0, 300));
    throw new Error(`asaas_${res.status}`);
  }
  return (await res.json()) as T;
}

const reais = (cents: number) => Math.round(cents) / 100;
const today = () => new Date().toISOString().slice(0, 10);

const EVENT_MAP: Record<string, PaymentEvent["type"]> = {
  PAYMENT_CREATED: "payment_created",
  PAYMENT_CONFIRMED: "payment_confirmed",
  PAYMENT_RECEIVED: "payment_confirmed",
  PAYMENT_OVERDUE: "payment_overdue",
  PAYMENT_REFUNDED: "payment_refunded",
  PAYMENT_DELETED: "payment_canceled",
  PAYMENT_CREDIT_CARD_CAPTURE_REFUSED: "payment_overdue",
  SUBSCRIPTION_DELETED: "subscription_canceled",
  SUBSCRIPTION_INACTIVATED: "subscription_canceled",
};

export const asaasProvider: PaymentProvider = {
  name: "asaas",
  isConfigured: () => Boolean(process.env.ASAAS_API_KEY),

  async createSubscription(input: CheckoutInput) {
    if (input.plan.price_cents == null || input.plan.price_cents <= 0) throw new Error("plan_without_price");
    let customerId = input.existingCustomerId ?? null;
    if (!customerId) {
      const customer = await asaas<{ id: string }>("/customers", {
        method: "POST",
        body: JSON.stringify({
          name: input.user.name,
          email: input.user.email,
          cpfCnpj: onlyDigits(input.cpfCnpj),
          mobilePhone: input.user.phone ? onlyDigits(input.user.phone) : undefined,
          externalReference: input.user.id,
        }),
      });
      customerId = customer.id;
    }
    const sub = await asaas<{ id: string }>("/subscriptions", {
      method: "POST",
      body: JSON.stringify({
        customer: customerId,
        billingType: input.billingType,
        value: reais(input.plan.price_cents),
        nextDueDate: today(),
        cycle: input.plan.billing_interval === "year" ? "YEARLY" : "MONTHLY",
        description: `TRIBUNA — ${input.plan.name}`,
        externalReference: `${input.user.id}|${input.plan.id}`,
      }),
    });
    const payments = await asaas<{ data: { invoiceUrl?: string }[] }>(`/subscriptions/${sub.id}/payments`);
    return { customerId, subscriptionId: sub.id, checkoutUrl: payments.data[0]?.invoiceUrl ?? null };
  },

  async updateSubscriptionPlan(subscriptionId: string, plan: Plan) {
    if (plan.price_cents == null) throw new Error("plan_without_price");
    await asaas(`/subscriptions/${subscriptionId}`, {
      method: "PUT",
      body: JSON.stringify({ value: reais(plan.price_cents), description: `TRIBUNA — ${plan.name}`, updatePendingPayments: true }),
    });
  },

  async cancelSubscription(subscriptionId: string) {
    await asaas(`/subscriptions/${subscriptionId}`, { method: "DELETE" });
  },

  async parseWebhook(request: Request) {
    const expected = process.env.ASAAS_WEBHOOK_TOKEN;
    const received = request.headers.get("asaas-access-token");
    if (!expected || !received || received !== expected) return null;
    const body = (await request.json().catch(() => null)) as {
      event?: string;
      payment?: {
        id: string;
        subscription?: string;
        value?: number;
        billingType?: string;
        invoiceUrl?: string;
        dueDate?: string;
        paymentDate?: string;
        clientPaymentDate?: string;
        externalReference?: string;
      };
      subscription?: { id: string; externalReference?: string };
    } | null;
    if (!body?.event) return null;
    const p = body.payment;
    return {
      type: EVENT_MAP[body.event] ?? "ignored",
      providerPaymentId: p?.id ?? null,
      providerSubscriptionId: p?.subscription ?? body.subscription?.id ?? null,
      externalReference: p?.externalReference ?? body.subscription?.externalReference ?? null,
      amountCents: Math.round((p?.value ?? 0) * 100),
      billingType: p?.billingType ?? null,
      invoiceUrl: p?.invoiceUrl ?? null,
      dueDate: p?.dueDate ?? null,
      paidAt: p?.clientPaymentDate ?? p?.paymentDate ?? null,
    };
  },
};
