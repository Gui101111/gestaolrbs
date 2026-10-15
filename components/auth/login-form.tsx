"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { PasswordInput } from "@/components/auth/password-input";
import { GoogleButton } from "@/components/auth/google-button";
import { FormAlert, OrDivider } from "@/components/auth/auth-card";
import { loginSchema } from "@/lib/validations/auth";
import { signInAction } from "@/lib/actions/auth";

type Values = z.input<typeof loginSchema>;

const PARAM_MESSAGES: Record<string, { tone: "error" | "info" | "success"; text: string }> = {
  link: { tone: "error", text: "Este link expirou ou já foi utilizado. Entre com sua senha ou solicite um novo link." },
  google: { tone: "error", text: "Não foi possível entrar com o Google. Tente novamente." },
  perfil: { tone: "error", text: "Não encontramos seu perfil. Entre novamente." },
  sessao: { tone: "info", text: "Sua sessão expirou. Entre novamente para continuar." },
  saiu: { tone: "success", text: "Você saiu da sua conta com segurança." },
  senha: { tone: "success", text: "Senha atualizada. Entre com a nova senha." },
};

export function LoginForm({ next, notice }: { next?: string; notice?: string }) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [unconfirmedEmail, setUnconfirmedEmail] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();
  const form = useForm<Values>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });
  const param = notice ? PARAM_MESSAGES[notice] : undefined;

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    setUnconfirmedEmail(null);
    start(async () => {
      const res = await signInAction({ ...values, next });
      if (!res.ok) {
        setError(res.error);
        if (res.unconfirmed) setUnconfirmedEmail(values.email);
        return;
      }
      router.replace(res.data.redirectTo);
      router.refresh();
    });
  });

  return (
    <div className="space-y-5">
      {param && !error && <FormAlert tone={param.tone}>{param.text}</FormAlert>}
      {error && (
        <FormAlert>
          {error}
          {unconfirmedEmail && (
            <>
              {" "}
              <Link href={`/verify-email?email=${encodeURIComponent(unconfirmedEmail)}`} className="font-semibold text-gold-light underline underline-offset-4">
                Reenviar confirmação
              </Link>
            </>
          )}
        </FormAlert>
      )}

      <GoogleButton next={next} />
      <OrDivider />

      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <Field label="E-mail" htmlFor="email" error={form.formState.errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" placeholder="voce@escritorio.com.br" aria-invalid={!!form.formState.errors.email} {...form.register("email")} />
        </Field>
        <Field
          label={
            <span className="flex w-full items-center justify-between">
              Senha
              <Link href="/forgot-password" className="text-xs font-normal text-gold hover:text-gold-light">
                Esqueci minha senha
              </Link>
            </span>
          }
          htmlFor="password"
          error={form.formState.errors.password?.message}
        >
          <PasswordInput id="password" autoComplete="current-password" placeholder="••••••••" aria-invalid={!!form.formState.errors.password} {...form.register("password")} />
        </Field>
        <Button type="submit" variant="gold" size="lg" className="w-full" loading={pending}>
          Entrar {!pending && <ArrowRight />}
        </Button>
      </form>
    </div>
  );
}
