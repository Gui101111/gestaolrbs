"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { joinWaitlist } from "@/lib/actions/waitlist";

/** E-mail para a lista de espera (planos sem preço ou sem plano ativo). */
export function WaitlistForm({ plan, onDone, compact = false }: { plan?: string; onDone?: () => void; compact?: boolean }) {
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
      toast.success("Pronto! Avisaremos quando abrir.");
      setEmail("");
      onDone?.();
    });
  };

  return (
    <form onSubmit={submit} className="flex w-full flex-col gap-2.5 sm:flex-row" noValidate>
      <div className="flex-1">
        <Input
          id={plan ? `waitlist-${plan}` : "waitlist-email"}
          type="email"
          placeholder="seu@email.com.br"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={Boolean(error)}
          aria-label="E-mail"
          autoComplete="email"
          className={compact ? "h-11" : undefined}
          required
        />
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      </div>
      <Button type="submit" variant="gold" className={compact ? "h-11" : "h-12"} loading={pending}>
        Avise-me
      </Button>
    </form>
  );
}
