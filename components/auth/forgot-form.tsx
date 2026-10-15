"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { FormAlert } from "@/components/auth/auth-card";
import { forgotSchema } from "@/lib/validations/auth";
import { forgotPasswordAction } from "@/lib/actions/auth";

type Values = z.input<typeof forgotSchema>;

export function ForgotForm({ expired }: { expired?: boolean }) {
  const [sentTo, setSentTo] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();
  const form = useForm<Values>({ resolver: zodResolver(forgotSchema), defaultValues: { email: "" } });

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    start(async () => {
      const res = await forgotPasswordAction(values.email);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSentTo(values.email);
    });
  });

  if (sentTo) {
    return (
      <div className="panel gold-ring rounded-2xl p-6 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-gold/15 text-gold">
          <MailCheck className="size-5" />
        </span>
        <p className="mt-4 font-display text-2xl text-ivory">Verifique sua caixa de entrada</p>
        <p className="mt-2 text-sm leading-relaxed text-mist">
          Se existir uma conta para <span className="text-ivory">{sentTo}</span>, você receberá um link para criar uma nova
          senha em instantes.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {expired && !error && <FormAlert>O link de redefinição expirou ou já foi utilizado. Solicite um novo abaixo.</FormAlert>}
      {error && <FormAlert>{error}</FormAlert>}
      <Field label="E-mail da conta" htmlFor="email" error={form.formState.errors.email?.message}>
        <Input id="email" type="email" autoComplete="email" placeholder="voce@escritorio.com.br" aria-invalid={!!form.formState.errors.email} {...form.register("email")} />
      </Field>
      <Button type="submit" variant="gold" size="lg" className="w-full" loading={pending}>
        Enviar link
      </Button>
    </form>
  );
}
