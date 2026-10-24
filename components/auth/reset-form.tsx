"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { PasswordInput, PasswordStrength } from "@/components/auth/password-input";
import { FormAlert } from "@/components/auth/auth-card";
import { resetSchema } from "@/lib/validations/auth";
import { updatePasswordAction } from "@/lib/actions/auth";
import { ROUTES } from "@/lib/routes";

type Values = z.input<typeof resetSchema>;

export function ResetForm() {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();
  const form = useForm<Values>({ resolver: zodResolver(resetSchema), defaultValues: { password: "", confirm: "" } });
  const password = useWatch({ control: form.control, name: "password" });

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    start(async () => {
      const res = await updatePasswordAction(values);
      if (!res.ok) {
        if (res.field === "password" || res.field === "confirm") form.setError(res.field, { message: res.error });
        else setError(res.error);
        return;
      }
      toast.success("Senha atualizada com sucesso.");
      router.replace(ROUTES.app);
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {error && <FormAlert>{error}</FormAlert>}
      <Field label="Nova senha" htmlFor="password" error={form.formState.errors.password?.message}>
        <PasswordInput id="password" autoComplete="new-password" aria-invalid={!!form.formState.errors.password} {...form.register("password")} />
      </Field>
      <PasswordStrength value={password ?? ""} />
      <Field label="Confirme a nova senha" htmlFor="confirm" error={form.formState.errors.confirm?.message}>
        <PasswordInput id="confirm" autoComplete="new-password" aria-invalid={!!form.formState.errors.confirm} {...form.register("confirm")} />
      </Field>
      <Button type="submit" variant="gold" size="lg" className="w-full" loading={pending}>
        Salvar nova senha
      </Button>
    </form>
  );
}
