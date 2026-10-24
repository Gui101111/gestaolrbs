/** Sem gateway de pagamento na demonstração: a assinatura fica na avaliação. */
const demoProvider = {
  name: "demo",
  isConfigured: () => false,
  async createSubscription(): Promise<never> {
    throw new Error("payments_not_configured");
  },
  async updateSubscriptionPlan() {},
  async cancelSubscription() {},
  async parseWebhook() {
    return null;
  },
};

export function getPaymentProvider() {
  return demoProvider;
}
