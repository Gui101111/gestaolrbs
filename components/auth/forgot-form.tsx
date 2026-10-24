"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { FormAlert } from "@/components/auth/auth-card";
import { NeonEnvelope } from "@/components/auth/neon-envelope";
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
      <div className="text-center">
        <NeonEnvelope />
        <p className="mt-5 font-display text-xl font-bold text-fg">Link enviado.</p>
        <p className="mt-2 text-sm leading-relaxed text-fg-2">
          Se existir uma conta para <span className="font-semibold text-fg">{sentTo}</span>, o link chega em instantes.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {expired && !error && <FormAlert>O link expirou ou já foi usado. Peça um novo.</FormAlert>}
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
