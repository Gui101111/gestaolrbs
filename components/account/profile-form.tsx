"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOut, Mail, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { deleteAccountAction, updateNameAction } from "@/lib/actions/profile";
import { signOutAction } from "@/lib/actions/auth";
import { NO_LOGIN } from "@/lib/no-login";
import { cn, initials } from "@/lib/utils";

export const panelClass = "glass rounded-[22px] p-5 md:p-6";
export const panelTitle = "font-sans text-base font-bold tracking-normal text-fg";

/** Conta: nome (editável) e e-mail de acesso (só leitura). */
export function ProfileForm({ email, avatarUrl, initialName, provider }: { email: string; avatarUrl: string | null; initialName: string; provider: string }) {
  const router = useRouter();
  const [name, setName] = React.useState(initialName);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await updateNameAction(name);
      if (!res.ok) return setError(res.error);
      toast.success("Nome atualizado.");
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className={panelClass} noValidate>
      <div className="flex items-center gap-4">
        <Avatar className="size-16 ring-2 ring-cyan/30">
          {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
          <AvatarFallback className="text-xl">{initials(name || email || "T")}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate font-display text-xl font-bold text-fg">{name || "Seu nome"}</p>
          <p className="text-xs text-fg-3">{NO_LOGIN ? "Aparece no seu Início" : `Acesso com ${provider === "google" ? "Google" : "e-mail e senha"}`}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <Field label="Nome" htmlFor="fullName" error={error ?? undefined}>
          <Input id="fullName" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
        </Field>
        {!NO_LOGIN && (
          <Field label="E-mail" htmlFor="email">
            <div className="relative">
              <Mail className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-fg-3" />
              <Input id="email" type="email" value={email} readOnly aria-readonly className="pl-11 text-fg-2" />
            </div>
          </Field>
        )}
      </div>

      <div className="mt-6 flex justify-end">
        <Button type="submit" variant="gold" loading={pending} disabled={name.trim() === initialName.trim()}>
          {!pending && <Save />} Salvar
        </Button>
      </div>
    </form>
  );
}

/** Sair deste aparelho. */
export function SignOutPanel() {
  return (
    <div className={cn(panelClass, "flex flex-wrap items-center justify-between gap-3")}>
      <div>
        <h2 className={panelTitle}>Sair</h2>
        <p className="mt-0.5 text-sm text-fg-2">Encerra a sessão neste aparelho.</p>
      </div>
      <Button variant="glass" onClick={() => void signOutAction()}>
        <LogOut /> Sair
      </Button>
    </div>
  );
}

export function DeleteAccountPanel() {
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState("");
  const [pending, start] = React.useTransition();
  const router = useRouter();
  return (
    <div className={cn(panelClass, "border-destructive/30")}>
      <h2 className={cn(panelTitle, "text-destructive")}>Excluir conta</h2>
      <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-fg-2">Remove seus dados, vídeos e arquivos de forma definitiva (LGPD).</p>
      <Button variant="destructive" className="mt-5" onClick={() => setOpen(true)}>
        <Trash2 /> Excluir minha conta
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir conta definitivamente</DialogTitle>
            <DialogDescription>Todos os vídeos e dados serão apagados. Digite EXCLUIR para confirmar.</DialogDescription>
          </DialogHeader>
          <Input id="delete-confirm" value={text} onChange={(e) => setText(e.target.value)} placeholder="EXCLUIR" aria-label="Confirmação" autoComplete="off" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              loading={pending}
              disabled={text.trim().toUpperCase() !== "EXCLUIR"}
              onClick={() =>
                start(async () => {
                  const res = await deleteAccountAction(text);
                  if (!res.ok) return void toast.error(res.error);
                  toast.success("Conta excluída.");
                  router.replace("/");
                })
              }
            >
              Excluir definitivamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
