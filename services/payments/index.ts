import "server-only";
import { asaasProvider } from "./asaas";
import type { PaymentProvider } from "./types";

/** Gateway ativo. Para trocar de provedor, implemente PaymentProvider e registre aqui. */
export function getPaymentProvider(): PaymentProvider {
  return asaasProvider;
}

export type { PaymentProvider, PaymentEvent, BillingType } from "./types";
