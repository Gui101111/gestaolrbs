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
import { Aurora } from "@/components/effects/aurora";
import { joinWaitlist } from "@/lib/actions/waitlist";
import { formatCpfCnpj, isValidCpfCnpj } from "@/lib/validations/document";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { Payment, Plan, Subscription, Usage } from "@/types/domain";
import { CountUp } from "@/components/animations/count-up";

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
      {/* Plano atual: card de metal com anel neon de uso do mês */}
      <section className="metal relative overflow-hidden rounded-[28px] p-6 md:p-8">
        <Aurora variant="subtle" interactive={false} />
        <div className="relative flex flex-col gap-8 md:flex-row md:items-center">
          {active && plan && (
            <UsageRing used={videosUsed} limit={plan.videos_per_month} />
          )}
          <div className="min-w-0 flex-1">
            <p className="eyebrow">Plano atual</p>
            <div className="mt-2 flex flex-wrap items-center gap-2.5">
              <h2 className="text-3xl text-fg md:text-4xl">{active && plan ? plan.name : "Nenhum plano ativo"}</h2>
              {status && <Badge variant={status.tone}>{status.label}</Badge>}
              {subscription?.cancel_at_period_end && <Badge variant="warning">Cancela ao fim do ciclo</Badge>}
            </div>
            <p className="mt-2 text-sm text-fg-2">
              {active && subscription?.current_period_end
                ? subscription.status === "trialing"
                  ? `Avaliação até ${formatDate(subscription.current_period_end)}.`
                  : subscription.cancel_at_period_end
                    ? `Acesso até ${formatDate(subscription.current_period_end)}.`
                    : `Próxima cobrança em ${formatDate(subscription.current_period_end)}${plan?.price_cents ? ` · ${formatCurrency(plan.price_cents)}` : ""}.`
                : "Assine para enviar vídeos para edição."}
            </p>
            {active && plan && (
              <div className="mt-5 max-w-md">
                <Meter label="Minutos processados" used={minutesUsed} limit={plan.minutes_per_month} unit=" min" />
              </div>
            )}
          </div>
          {active && subscription?.provider !== "trial" && !subscription?.cancel_at_period_end && subscription?.status === "active" && (
            <Button variant="ghost" size="sm" onClick={() => setCancelOpen(true)} className="self-start md:self-end">
              Cancelar assinatura
            </Button>
          )}
        </div>
      </section>

      {/* Planos */}
      <section>
        <h2 className="mb-5 text-2xl text-fg">Trocar de plano</h2>
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
                  "relative flex flex-col rounded-[22px] p-6 transition-all duration-700",
                  p.is_featured ? "neon-border bg-silver text-[#14171c]" : "border border-line bg-fg/[0.03]",
                )}
              >
                {p.is_featured && (
                  <span className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-[#14171c] px-3 py-1 text-[0.625rem] font-bold tracking-[0.14em] text-cyan uppercase">
                    <Crown className="size-3" /> Recomendado
                  </span>
                )}
                <h3 className={cn("font-display text-xl font-bold", p.is_featured ? "text-[#14171c]" : "text-fg")}>{p.name}</h3>
                <p className={cn("mt-1 text-sm", p.is_featured ? "text-[#4a515c]" : "text-fg-2")}>{p.description}</p>
                <p className="mt-5 font-display text-3xl font-extrabold">
                  {hasPrice ? (
                    <>
                      <span>{formatCurrency(p.price_cents)}</span>
                      <span className="text-sm font-medium opacity-60"> /mês</span>
                    </>
                  ) : (
                    <span className="font-serif text-2xl font-normal italic">Valor em breve</span>
                  )}
                </p>
                <ul className="my-5 flex-1 space-y-2">
                  {p.features.map((f) => (
                    <li key={f} className={cn("flex items-start gap-2 text-sm", p.is_featured ? "text-[#2c3138]" : "text-fg-2")}>
                      <Check className={cn("mt-0.5 size-4 shrink-0", p.is_featured ? "text-[#0fb5c6]" : "text-cyan")} /> {f}
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
        <p className="mt-5 text-xs text-fg-3">Cartão ou Pix, pelo Asaas. Sem fidelidade.</p>
      </section>

      {/* Histórico */}
      <section className="glass rounded-[22px] p-5 md:p-6">
        <h2 className="font-sans text-base font-bold tracking-normal text-fg">Histórico</h2>
        {payments.length ? (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead className="text-xs text-fg-3">
                <tr className="border-b border-line">
                  <th className="py-2 font-medium">Data</th>
                  <th className="py-2 font-medium">Valor</th>
                  <th className="py-2 font-medium">Forma</th>
                  <th className="py-2 font-medium">Status</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-line">
                    <td className="py-3 text-fg">{formatDate(p.paid_at ?? p.due_date ?? p.created_at)}</td>
                    <td className="py-3 text-fg tabular-nums">{formatCurrency(p.amount_cents)}</td>
                    <td className="py-3 text-mist">{p.billing_type === "PIX" ? "Pix" : p.billing_type === "CREDIT_CARD" ? "Cartão" : (p.billing_type ?? "—")}</td>
                    <td className="py-3 text-mist">{PAY_STATUS[p.status] ?? p.status}</td>
                    <td className="py-3 text-right">
                      {p.invoice_url && (
                        <a href={p.invoice_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-cyan hover:text-fg">
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
          <p className="mt-3 text-sm text-fg-3">Nenhum pagamento ainda.</p>
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

/** Anel neon com o uso de vídeos do ciclo. */
function UsageRing({ used, limit }: { used: number; limit: number | null }) {
  const size = 132;
  const r = (size - 12) / 2;
  const c = 2 * Math.PI * r;
  const pct = limit ? Math.min(1, used / limit) : 0;
  return (
    <div className="relative grid shrink-0 place-items-center self-center" style={{ width: size, height: size }}>
      <div aria-hidden className="absolute inset-3 rounded-full bg-cyan/15 blur-2xl" />
      <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90 overflow-visible">
        <defs>
          <linearGradient id="usage-ring" x1="0" y1="0" x2="1" y2="1">
            <stop style={{ stopColor: "var(--cyan)" }} />
            <stop offset="1" style={{ stopColor: "var(--gold)" }} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth="8" fill="none" style={{ stroke: "color-mix(in oklab, var(--fg) 10%, transparent)" }} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#usage-ring)"
          strokeWidth="8"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - c * Math.max(pct, 0.02) }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
          style={{ filter: "drop-shadow(0 0 6px var(--cyan))" }}
        />
      </svg>
      <div className="relative text-center">
        <p className="font-display text-3xl font-extrabold text-fg tabular-nums">
          <CountUp value={used} duration={1.4} />
          {limit != null && <span className="text-base font-semibold text-fg-3">/{limit}</span>}
        </p>
        <p className="text-[0.625rem] font-bold tracking-[0.14em] text-fg-3 uppercase">vídeos no mês</p>
      </div>
    </div>
  );
}

function Meter({ label, used, limit, unit }: { label: string; used: number; limit: number | null; unit: string }) {
  const pct = limit ? Math.min(100, (used / limit) * 100) : 0;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-fg-2">{label}</span>
        <span className="font-semibold text-fg tabular-nums">
          <CountUp value={used} decimals={Number.isInteger(used) ? 0 : 1} duration={1.4} />
          {unit}
          {limit != null && <span className="font-normal text-fg-3"> / {limit}{unit}</span>}
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
                method === value ? "border-cyan/60 bg-cyan/10 text-cyan shadow-[var(--glow-cyan)]" : "border-line text-fg-2 hover:border-line-strong",
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
