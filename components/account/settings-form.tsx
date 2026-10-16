"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOut, Mail, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Field } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlatformSelector } from "@/components/projects/selectors";
import { savePreferencesAction } from "@/lib/actions/profile";
import { changeEmailAction, signOutEverywhereAction } from "@/lib/actions/account";
import { EDITING_STYLES } from "@/lib/constants/domain";

export function SettingsForm({
  email,
  initial,
}: {
  email: string;
  initial: { defaultEditingStyle: string; defaultPlatforms: string[]; emailNotifications: boolean; productNews: boolean };
}) {
  const router = useRouter();
  const [v, setV] = React.useState(initial);
  const [newEmail, setNewEmail] = React.useState("");
  const [emailError, setEmailError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();
  const [emailPending, startEmail] = React.useTransition();

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-fg/[0.07] bg-fg/[0.02] p-6 md:p-8">
        <h2 className="font-display text-2xl text-ivory">Padrões do novo projeto</h2>
        <p className="mt-1 text-sm text-mist">Pré-selecionados sempre que você iniciar um vídeo. Você pode mudar em cada projeto.</p>
        <div className="mt-6 max-w-sm">
          <Field label="Estilo de edição padrão">
            <Select value={v.defaultEditingStyle || undefined} onValueChange={(val) => setV((s) => ({ ...s, defaultEditingStyle: val }))}>
              <SelectTrigger aria-label="Estilo padrão">
                <SelectValue placeholder="Sem padrão" />
              </SelectTrigger>
              <SelectContent>
                {EDITING_STYLES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <p className="mt-6 mb-3 text-[0.8125rem] font-medium text-ivory/90">Plataformas padrão</p>
        <PlatformSelector value={v.defaultPlatforms} onChange={(defaultPlatforms) => setV((s) => ({ ...s, defaultPlatforms }))} />
      </section>

      <section className="rounded-3xl border border-fg/[0.07] bg-fg/[0.02] p-6 md:p-8">
        <h2 className="font-display text-2xl text-ivory">Notificações</h2>
        <div className="mt-5 divide-y divide-fg/[0.06]">
          {(
            [
              ["emailNotifications", "E-mails sobre meus projetos", "Projeto recebido, vídeo pronto e ajustes concluídos."],
              ["productNews", "Novidades da plataforma", "Novos estilos, recursos e melhorias. No máximo uma vez por mês."],
            ] as const
          ).map(([key, label, desc]) => (
            <label key={key} className="flex cursor-pointer items-center justify-between gap-4 py-4">
              <span>
                <span className="block text-sm font-medium text-ivory">{label}</span>
                <span className="block text-xs text-mist">{desc}</span>
              </span>
              <Switch checked={v[key]} onCheckedChange={(c) => setV((s) => ({ ...s, [key]: c }))} aria-label={label} />
            </label>
          ))}
        </div>
      </section>

      <div className="flex justify-end">
        <Button
          variant="gold"
          size="lg"
          loading={pending}
          onClick={() =>
            start(async () => {
              const res = await savePreferencesAction(v);
              if (!res.ok) return void toast.error(res.error);
              toast.success("Preferências salvas.");
              router.refresh();
            })
          }
        >
          {!pending && <Save />} Salvar preferências
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <form
          className="space-y-4 rounded-3xl border border-fg/[0.07] bg-fg/[0.02] p-6 md:p-7"
          onSubmit={(e) => {
            e.preventDefault();
            setEmailError(null);
            startEmail(async () => {
              const res = await changeEmailAction(newEmail);
              if (!res.ok) return setEmailError(res.error);
              toast.success("Enviamos um link de confirmação para o novo e-mail.");
              setNewEmail("");
            });
          }}
        >
          <h2 className="flex items-center gap-2 font-display text-2xl text-ivory">
            <Mail className="size-5 text-gold" /> E-mail de acesso
          </h2>
          <p className="text-sm text-mist">
            Atual: <span className="text-ivory">{email}</span>
          </p>
          <Field label="Novo e-mail" htmlFor="new-email" error={emailError ?? undefined}>
            <Input id="new-email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="novo@escritorio.com.br" />
          </Field>
          <Button type="submit" variant="subtle" loading={emailPending} disabled={!newEmail}>
            Alterar e-mail
          </Button>
        </form>
        <div className="space-y-4 rounded-3xl border border-fg/[0.07] bg-fg/[0.02] p-6 md:p-7">
          <h2 className="font-display text-2xl text-ivory">Segurança</h2>
          <p className="text-sm text-mist">Encerre a sessão em todos os dispositivos conectados à sua conta.</p>
          <Button variant="outline" onClick={() => void signOutEverywhereAction()}>
            <LogOut /> Sair de todos os dispositivos
          </Button>
        </div>
      </div>
    </div>
  );
}
