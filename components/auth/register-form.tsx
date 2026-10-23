"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { PasswordInput, PasswordStrength } from "@/components/auth/password-input";
import { GoogleButton } from "@/components/auth/google-button";
import { FormAlert, OrDivider } from "@/components/auth/auth-card";
import { registerSchema } from "@/lib/validations/auth";
import { signUpAction } from "@/lib/actions/auth";
import { ROUTES } from "@/lib/routes";

type Values = z.input<typeof registerSchema>;

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();
  const form = useForm<Values>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: "", email: "", password: "", terms: false },
  });
  const password = useWatch({ control: form.control, name: "password" });

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    start(async () => {
      const res = await signUpAction({ ...values, terms: true });
      if (!res.ok) {
        if (res.field && res.field in values) form.setError(res.field as keyof Values, { message: res.error });
        else setError(res.error);
        return;
      }
      router.push(`${ROUTES.verifyEmail}?email=${encodeURIComponent(res.data.email)}`);
    });
  });

  return (
    <div className="space-y-5">
      {error && <FormAlert>{error}</FormAlert>}
      <GoogleButton next={ROUTES.app} />
      <OrDivider />
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <Field label="Nome completo" htmlFor="fullName" error={form.formState.errors.fullName?.message}>
          <Input id="fullName" autoComplete="name" placeholder="Dra. Ana Souza" aria-invalid={!!form.formState.errors.fullName} {...form.register("fullName")} />
        </Field>
        <Field label="E-mail profissional" htmlFor="email" error={form.formState.errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" placeholder="voce@escritorio.com.br" aria-invalid={!!form.formState.errors.email} {...form.register("email")} />
        </Field>
        <Field label="Senha" htmlFor="password" error={form.formState.errors.password?.message} hint="Mínimo de 8 caracteres, com letras e números.">
          <PasswordInput id="password" autoComplete="new-password" placeholder="Crie uma senha forte" aria-invalid={!!form.formState.errors.password} {...form.register("password")} />
        </Field>
        <PasswordStrength value={password ?? ""} />
        <Controller
          control={form.control}
          name="terms"
          render={({ field, fieldState }) => (
            <div>
              <label className="flex cursor-pointer items-start gap-3 text-[0.8125rem] leading-relaxed text-fg-2">
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(v) => field.onChange(v === true)}
                  aria-invalid={!!fieldState.error}
                  className="mt-0.5"
                />
                <span>
                  Li e aceito os{" "}
                  <Link href={ROUTES.terms} target="_blank" className="text-link underline-offset-4 hover:underline">
                    Termos de Uso
                  </Link>{" "}
                  e a{" "}
                  <Link href={ROUTES.privacy} target="_blank" className="text-link underline-offset-4 hover:underline">
                    Política de Privacidade
                  </Link>
                  .
                </span>
              </label>
              {fieldState.error && <p className="mt-2 text-[0.8125rem] text-destructive">{fieldState.error.message}</p>}
            </div>
          )}
        />
        <Button type="submit" variant="gold" size="lg" className="w-full" loading={pending}>
          Criar conta {!pending && <ArrowRight />}
        </Button>
      </form>
    </div>
  );
}
