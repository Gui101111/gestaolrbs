import type { Plan } from "@/types/domain";

export type BillingType = "CREDIT_CARD" | "PIX" | "UNDEFINED";

export type CheckoutInput = {
  user: { id: string; email: string; name: string; phone?: string | null };
  plan: Plan;
  billingType: BillingType;
  cpfCnpj: string;
  existingCustomerId?: string | null;
};

export type CheckoutResult = { customerId: string; subscriptionId: string; checkoutUrl: string | null };

export type PaymentEvent = {
  type: "payment_created" | "payment_confirmed" | "payment_overdue" | "payment_refunded" | "payment_canceled" | "subscription_canceled" | "ignored";
  providerPaymentId: string | null;
  providerSubscriptionId: string | null;
  externalReference: string | null;
  amountCents: number;
  billingType: string | null;
  invoiceUrl: string | null;
  dueDate: string | null;
  paidAt: string | null;
};

/** Gateway de pagamento desacoplado — troque Asaas por outro implementando esta interface. */
export interface PaymentProvider {
  readonly name: string;
  isConfigured(): boolean;
  createSubscription(input: CheckoutInput): Promise<CheckoutResult>;
  updateSubscriptionPlan(subscriptionId: string, plan: Plan): Promise<void>;
  cancelSubscription(subscriptionId: string): Promise<void>;
  /** Valida a autenticidade do webhook e traduz o evento. Retorna null se inválido. */
  parseWebhook(request: Request): Promise<PaymentEvent | null>;
}
