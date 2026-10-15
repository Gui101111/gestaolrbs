"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Crown, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SectionHeading } from "@/components/landing/section-heading";
import { Stagger, StaggerItem, Reveal } from "@/components/animations/reveal";
import { TiltCard } from "@/components/animations/tilt-card";
import { joinWaitlist } from "@/lib/actions/waitlist";
import { cn, formatCurrency } from "@/lib/utils";
import type { Plan } from "@/types/domain";

export function PricingSection({ plans }: { plans: Plan[] }) {
  const [waitlistPlan, setWaitlistPlan] = React.useState<string | null>(null);

  return (
    <section id="planos" className="relative overflow-hidden py-28 md:py-40">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute bottom-0 left-1/2 h-[500px] w-[1000px] -translate-x-1/2 rounded-full bg-gold/[0.06] blur-[140px]" />
      </div>
      <div className="relative mx-auto max-w-7xl px-6 md:px-10">
        <SectionHeading
          align="center"
          eyebrow="Planos"
          title="Assinatura mensal,"
          highlight="sem fidelidade."
          description="Escolha o volume de vídeos do seu escritório. Os valores serão divulgados em breve — deixe seu e-mail para ser avisado."
        />

        {plans.length === 0 ? (
          <Reveal className="mx-auto mt-16 max-w-xl">
            <WaitlistCard />
          </Reveal>
        ) : (
          <Stagger className="mt-16 grid gap-6 lg:grid-cols-3" stagger={0.12}>
            {plans.map((plan) => (
              <StaggerItem key={plan.id}>
                <PlanCard plan={plan} onWaitlist={() => setWaitlistPlan(plan.slug)} />
              </StaggerItem>
            ))}
          </Stagger>
        )}

        <Reveal delay={0.2}>
          <p className="mx-auto mt-10 max-w-2xl text-center text-xs leading-relaxed text-mist/80">
            Pagamento por cartão de crédito ou Pix. Cancele quando quiser. A plataforma é uma ferramenta de edição: não
            realiza captação de clientes nem garante resultados.
          </p>
        </Reveal>
      </div>

      <Dialog open={waitlistPlan !== null} onOpenChange={(o) => !o && setWaitlistPlan(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Seja avisado no lançamento</DialogTitle>
            <DialogDescription>Enviaremos um único e-mail quando os valores estiverem disponíveis.</DialogDescription>
          </DialogHeader>
          <WaitlistForm plan={waitlistPlan ?? undefined} onDone={() => setWaitlistPlan(null)} />
        </DialogContent>
      </Dialog>
    </section>
  );
}

function PlanCard({ plan, onWaitlist }: { plan: Plan; onWaitlist: () => void }) {
  const hasPrice = plan.price_cents !== null && plan.price_cents > 0;
  return (
    <TiltCard
      max={4}
      className={cn("h-full", plan.is_featured && "lg:-mt-6")}
      innerClassName={cn("flex h-full flex-col p-8", plan.is_featured && "bg-gradient-to-b from-navy-deep to-[#0d1015]")}
    >
      {plan.is_featured && <div aria-hidden className="pointer-events-none absolute inset-x-8 top-0 hairline" />}
      <div className="flex min-h-7 items-center">
        {plan.is_featured ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-[0.625rem] font-semibold tracking-[0.18em] text-gold-light uppercase">
            <Crown className="size-3" /> Recomendado
          </span>
        ) : (
          <span className="text-[0.625rem] font-semibold tracking-[0.18em] text-mist/60 uppercase">Assinatura mensal</span>
        )}
      </div>
      <h3 className="mt-4 font-display text-3xl text-ivory">{plan.name}</h3>
      <p className="mt-2 min-h-[3rem] text-sm leading-relaxed text-mist">{plan.description}</p>
      <div className="mt-8 flex items-end gap-2">
        {hasPrice ? (
          <>
            <span className="font-display text-5xl text-gold-gradient">{formatCurrency(plan.price_cents)}</span>
            <span className="pb-2 text-sm text-mist">/mês</span>
          </>
        ) : (
          <span className="font-display text-4xl text-ivory/90 italic">Valor em breve</span>
        )}
      </div>
      <div className="my-8 hairline" />
      <ul className="flex-1 space-y-3.5">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-3 text-sm text-ivory/85">
            <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-gold/15 text-gold">
              <Check className="size-3" strokeWidth={3} />
            </span>
            {f}
          </li>
        ))}
      </ul>
      <div className="mt-10 grid gap-2.5">
        {hasPrice ? (
          <Button asChild variant={plan.is_featured ? "gold" : "outline"} size="lg">
            <Link href={`/register?plano=${plan.slug}`}>Assinar {plan.name.replace("Plano ", "")}</Link>
          </Button>
        ) : (
          <>
            <Button variant={plan.is_featured ? "gold" : "outline"} size="lg" onClick={onWaitlist}>
              <Mail /> Quero ser avisado
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/register">Criar conta e testar</Link>
            </Button>
          </>
        )}
      </div>
    </TiltCard>
  );
}

function WaitlistCard() {
  return (
    <div className="panel gold-ring rounded-3xl p-8 text-center">
      <h3 className="font-display text-3xl text-ivory">Planos em breve</h3>
      <p className="mt-3 text-sm text-mist">Deixe seu e-mail e avisaremos quando as assinaturas forem abertas.</p>
      <div className="mt-8 text-left">
        <WaitlistForm />
      </div>
    </div>
  );
}

function WaitlistForm({ plan, onDone }: { plan?: string; onDone?: () => void }) {
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await joinWaitlist({ email, plan });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      toast.success("Pronto! Você será avisado no lançamento.");
      setEmail("");
      onDone?.();
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row" noValidate>
      <div className="flex-1">
        <Input
          type="email"
          placeholder="seu@email.com.br"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={Boolean(error)}
          aria-label="E-mail"
          autoComplete="email"
          required
        />
        {error && <p className="mt-2 text-xs text-[#ec8a80]">{error}</p>}
      </div>
      <Button type="submit" variant="gold" className="h-12" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : null}
        Avisar-me
      </Button>
    </form>
  );
}
