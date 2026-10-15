"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Check, CreditCard, Crown, ExternalLink, QrCode, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Field } from "@/components/ui/field";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cancelSubscriptionAction, subscribeAction } from "@/lib/actions/billing";
import { joinWaitlist } from "@/lib/actions/waitlist";
import { formatCpfCnpj, isValidCpfCnpj } from "@/lib/validations/document";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { Payment, Plan, Subscription, Usage } from "@/types/domain";

const SUB_STATUS: Record<string, { label: string; tone: "success" | "warning" | "danger" | "info" | "default" | "gold" }> = {
  trialing: { label: "Avaliação", tone: "gold" },
  active: { label: "Ativa", tone: "success" },
  past_due: { label: "Pagamento pendente", tone: "warning" },
  canceled: { label: "Cancelada", tone: "danger" },
  incomplete: { label: "Aguardando pagamento", tone: "info" },
  expired: { label: "Expirada", tone: "default" },
};

const PAY_STATUS: Record<string, string> = {
  pending: "Pendente",
  confirmed: "Pago",
  received: "Pago",
  overdue: "Vencido",
  refunded: "Estornado",
  failed: "Falhou",
  canceled: "Cancelado",
};

export function SubscriptionView({
  email,
  subscription,
  plan,
  usage,
  active,
  plans,
  payments,
  paymentsEnabled,
}: {
  email: string;
  subscription: Subscription | null;
  plan: Plan | null;
  usage: Usage | null;
  active: boolean;
  plans: Plan[];
  payments: Payment[];
  paymentsEnabled: boolean;
}) {
  const router = useRouter();
  const [checkoutPlan, setCheckoutPlan] = React.useState<Plan | null>(null);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [pending, start] = React.useTransition();
  const status = subscription ? (SUB_STATUS[subscription.status] ?? SUB_STATUS.incomplete) : null;
  const videosUsed = usage?.videos_created ?? 0;
  const minutesUsed = Number(usage?.minutes_used ?? 0);

  const notify = (p: Plan) =>
    start(async () => {
      const res = await joinWaitlist({ email, plan: p.slug });
      if (!res.ok) return void toast.error(res.error);
      toast.success("Avisaremos quando os valores estiverem disponíveis.");
    });

  return (
    <div className="space-y-10">
      {/* Plano atual */}
      <section className="panel gold-ring relative overflow-hidden rounded-3xl p-6 md:p-8">
        <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-gold/10 blur-3xl" />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="eyebrow">Plano atual</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h2 className="font-display text-4xl text-ivory">{active && plan ? plan.name : "Nenhum plano ativo"}</h2>
              {status && <Badge variant={status.tone}>{status.label}</Badge>}
              {subscription?.cancel_at_period_end && <Badge variant="warning">Cancela ao fim do ciclo</Badge>}
            </div>
            <p className="mt-2 text-sm text-mist">
              {active && subscription?.current_period_end
                ? subscription.status === "trialing"
                  ? `Avaliação válida até ${formatDate(subscription.current_period_end)}.`
                  : subscription.cancel_at_period_end
                    ? `Acesso até ${formatDate(subscription.current_period_end)}.`
                    : `Próxima cobrança em ${formatDate(subscription.current_period_end)}${plan?.price_cents ? ` · ${formatCurrency(plan.price_cents)}` : ""}.`
                : "Assine um plano para enviar vídeos para edição."}
            </p>
          </div>
          {active && plan && (
            <div className="grid w-full max-w-md gap-5">
              <Meter label="Vídeos no ciclo" used={videosUsed} limit={plan.videos_per_month} unit="" />
              <Meter label="Minutos processados" used={minutesUsed} limit={plan.minutes_per_month} unit=" min" />
            </div>
          )}
        </div>
        {active && subscription?.provider !== "trial" && !subscription?.cancel_at_period_end && subscription?.status === "active" && (
          <div className="relative mt-6 flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => setCancelOpen(true)}>
              Cancelar assinatura
            </Button>
          </div>
        )}
      </section>

      {/* Planos */}
      <section>
        <div className="mb-6">
          <p className="eyebrow">Planos</p>
          <h2 className="mt-2 font-display text-3xl text-ivory">Escolha o volume ideal para o seu escritório</h2>
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          {plans.map((p, i) => {
            const isCurrent = active && plan?.id === p.id && subscription?.status !== "trialing";
            const hasPrice = p.price_cents != null && p.price_cents > 0;
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className={cn(
                  "relative flex flex-col rounded-3xl border p-7 transition-all duration-700",
                  p.is_featured ? "border-gold/40 bg-gradient-to-b from-navy-deep to-transparent glow-gold-soft" : "border-white/[0.08] bg-white/[0.02]",
                )}
              >
                {p.is_featured && (
                  <span className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-[0.625rem] font-semibold tracking-[0.18em] text-gold-light uppercase">
                    <Crown className="size-3" /> Recomendado
                  </span>
                )}
                <h3 className="font-display text-2xl text-ivory">{p.name}</h3>
                <p className="mt-1 text-sm text-mist">{p.description}</p>
                <p className="mt-6 font-display text-4xl">
                  {hasPrice ? (
                    <>
                      <span className="text-gold-gradient">{formatCurrency(p.price_cents)}</span>
                      <span className="text-base text-mist"> /mês</span>
                    </>
                  ) : (
                    <span className="text-ivory/85 italic">Valor em breve</span>
                  )}
                </p>
                <ul className="my-6 flex-1 space-y-2.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-ivory/85">
                      <Check className="mt-0.5 size-4 shrink-0 text-gold" /> {f}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <Button variant="subtle" disabled>
                    Plano atual
                  </Button>
                ) : hasPrice && paymentsEnabled ? (
                  <Button variant={p.is_featured ? "gold" : "outline"} onClick={() => setCheckoutPlan(p)}>
                    {active && subscription?.status === "active" ? "Trocar para este plano" : "Assinar"}
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => notify(p)} disabled={pending}>
                    <Sparkles /> Avise-me no lançamento
                  </Button>
                )}
              </motion.div>
            );
          })}
        </div>
        <p className="mt-6 text-xs text-mist">Pagamento recorrente por cartão de crédito ou Pix, processado pelo Asaas. Sem fidelidade.</p>
      </section>

      {/* Histórico */}
      <section className="rounded-3xl border border-white/[0.07] bg-white/[0.02] p-6 md:p-7">
        <h2 className="font-display text-2xl text-ivory">Histórico de pagamentos</h2>
        {payments.length ? (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead className="text-xs text-mist">
                <tr className="border-b border-white/[0.06]">
                  <th className="py-2 font-medium">Data</th>
                  <th className="py-2 font-medium">Valor</th>
                  <th className="py-2 font-medium">Forma</th>
                  <th className="py-2 font-medium">Status</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-white/[0.04]">
                    <td className="py-3 text-ivory/90">{formatDate(p.paid_at ?? p.due_date ?? p.created_at)}</td>
                    <td className="py-3 text-ivory/90">{formatCurrency(p.amount_cents)}</td>
                    <td className="py-3 text-mist">{p.billing_type === "PIX" ? "Pix" : p.billing_type === "CREDIT_CARD" ? "Cartão" : (p.billing_type ?? "—")}</td>
                    <td className="py-3 text-mist">{PAY_STATUS[p.status] ?? p.status}</td>
                    <td className="py-3 text-right">
                      {p.invoice_url && (
                        <a href={p.invoice_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-gold hover:text-gold-light">
                          Fatura <ExternalLink className="size-3" />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 text-sm text-mist">Nenhum pagamento registrado ainda.</p>
        )}
      </section>

      <CheckoutDialog plan={checkoutPlan} onClose={() => setCheckoutPlan(null)} onDone={() => router.refresh()} />

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar assinatura?</AlertDialogTitle>
            <AlertDialogDescription>Você mantém o acesso até o fim do ciclo já pago. Seus projetos continuam disponíveis na biblioteca.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter assinatura</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                start(async () => {
                  const res = await cancelSubscriptionAction();
                  if (!res.ok) return void toast.error(res.error);
                  toast.success("Assinatura cancelada. O acesso continua até o fim do ciclo.");
                  router.refresh();
                })
              }
            >
              Cancelar assinatura
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Meter({ label, used, limit, unit }: { label: string; used: number; limit: number | null; unit: string }) {
  const pct = limit ? Math.min(100, (used / limit) * 100) : 0;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-mist">{label}</span>
        <span className="font-semibold text-ivory tabular-nums">
          {used.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
          {unit}
          {limit != null && <span className="font-normal text-mist"> / {limit}{unit}</span>}
        </span>
      </div>
      <Progress value={pct} className="h-2" indicatorClassName={pct >= 90 ? "bg-none bg-warning" : undefined} />
    </div>
  );
}

function CheckoutDialog({ plan, onClose, onDone }: { plan: Plan | null; onClose: () => void; onDone: () => void }) {
  const [doc, setDoc] = React.useState("");
  const [method, setMethod] = React.useState<"CREDIT_CARD" | "PIX">("CREDIT_CARD");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();

  const submit = () => {
    if (!plan) return;
    if (!isValidCpfCnpj(doc)) return setError("Informe um CPF ou CNPJ válido.");
    setError(null);
    start(async () => {
      const res = await subscribeAction({ planSlug: plan.slug, billingType: method, cpfCnpj: doc });
      if (!res.ok) return setError(res.error);
      if (res.data.checkoutUrl) {
        toast.success("Redirecionando para o pagamento seguro…");
        window.location.href = res.data.checkoutUrl;
      } else {
        toast.success("Plano atualizado.");
        onClose();
        onDone();
      }
    });
  };

  return (
    <Dialog open={Boolean(plan)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assinar {plan?.name}</DialogTitle>
          <DialogDescription>
            {plan?.price_cents ? `${formatCurrency(plan.price_cents)} por mês. ` : ""}O pagamento é processado em ambiente seguro do Asaas.
          </DialogDescription>
        </DialogHeader>
        <Field label="CPF ou CNPJ do titular" htmlFor="doc" error={error ?? undefined}>
          <Input id="doc" inputMode="numeric" value={doc} onChange={(e) => setDoc(formatCpfCnpj(e.target.value))} placeholder="000.000.000-00" />
        </Field>
        <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Forma de pagamento">
          {(
            [
              ["CREDIT_CARD", "Cartão de crédito", CreditCard],
              ["PIX", "Pix", QrCode],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={method === value}
              onClick={() => setMethod(value)}
              className={cn(
                "flex items-center gap-3 rounded-2xl border p-4 text-left text-sm transition-all",
                method === value ? "border-gold/60 bg-gold/10 text-gold-light" : "border-white/10 text-ivory/80 hover:border-white/25",
              )}
            >
              <Icon className="size-5" /> {label}
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="gold" onClick={submit} loading={pending}>
            Ir para o pagamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
