"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Camera, KeyRound, Loader2, LogOut, Mail, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PasswordInput, PasswordStrength } from "@/components/auth/password-input";
import { createClient } from "@/lib/supabase/client";
import { deleteAccountAction, updateAvatarAction, updateProfileAction } from "@/lib/actions/profile";
import { changeEmailAction, changePasswordAction, signOutEverywhereAction } from "@/lib/actions/account";
import { signOutAction } from "@/lib/actions/auth";
import { BRAZIL_UFS, LEGAL_AREAS, PROFILE_GOALS } from "@/lib/constants/domain";
import type { ProfileInput } from "@/lib/validations/profile";
import { cn, initials } from "@/lib/utils";

export type ProfileValues = {
  fullName: string;
  treatment: "" | "dr" | "dra";
  phone: string;
  officeName: string;
  oabNumber: string;
  oabUf: string;
  legalArea: string;
  practiceAreas: string[];
  mainGoal: string;
};

export const panelClass = "glass rounded-[22px] p-5 md:p-6";
export const panelTitle = "font-sans text-base font-bold tracking-normal text-fg";

/** Conta: foto, nome, tratamento (Dr./Dra.), OAB, escritório e áreas de atuação. */
export function ProfileForm({
  userId,
  email,
  avatarUrl,
  initial,
  provider,
}: {
  userId: string;
  email: string;
  avatarUrl: string | null;
  initial: ProfileValues;
  provider: string;
}) {
  const router = useRouter();
  const [v, setV] = React.useState(initial);
  const [avatar, setAvatar] = React.useState(avatarUrl);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<{ field?: string; message: string } | null>(null);
  const [pending, start] = React.useTransition();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const set = <K extends keyof ProfileValues>(k: K, val: ProfileValues[K]) => setV((s) => ({ ...s, [k]: val }));

  const uploadAvatar = async (file?: File) => {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      return void toast.error("Envie uma foto JPG, PNG ou WEBP de até 5 MB.");
    }
    setUploading(true);
    const path = `${userId}/avatar-${Date.now()}.${file.type.split("/")[1]}`;
    const { error: upErr } = await createClient().storage.from("brand-assets").upload(path, file, { contentType: file.type });
    if (upErr) {
      setUploading(false);
      return void toast.error("Não foi possível enviar a foto.");
    }
    const res = await updateAvatarAction(path);
    setUploading(false);
    if (!res.ok) return void toast.error(res.error);
    setAvatar(URL.createObjectURL(file));
    toast.success("Foto atualizada.");
    router.refresh();
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await updateProfileAction(v as ProfileInput);
      if (!res.ok) return setError({ field: res.field, message: res.error });
      toast.success("Perfil atualizado.");
      router.refresh();
    });
  };

  const toggleArea = (a: string) => set("practiceAreas", v.practiceAreas.includes(a) ? v.practiceAreas.filter((x) => x !== a) : [...v.practiceAreas, a]);

  return (
    <form onSubmit={submit} className={panelClass} noValidate>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="relative w-fit">
          <Avatar className="size-20 ring-2 ring-cyan/30">
            {avatar && <AvatarImage src={avatar} alt="" />}
            <AvatarFallback className="text-2xl">{initials(v.fullName)}</AvatarFallback>
          </Avatar>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="absolute -right-1 -bottom-1 grid size-8 place-items-center rounded-full border border-cyan/50 bg-surface text-cyan shadow-lg transition hover:bg-cyan hover:text-[#06222a]"
            aria-label="Alterar foto"
          >
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
          </button>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => void uploadAvatar(e.target.files?.[0])} aria-label="Enviar foto" />
        </div>
        <div>
          <p className="font-display text-xl font-bold text-fg">{v.fullName || "Seu nome"}</p>
          <p className="text-sm text-fg-2">{email}</p>
          <p className="mt-0.5 text-xs text-fg-3">Acesso via {provider === "google" ? "Google" : "e-mail e senha"}</p>
        </div>
      </div>

      <div className="mt-7 grid gap-5 md:grid-cols-2">
        <div className="grid grid-cols-[7.5rem_1fr] gap-3">
          <Field label="Tratamento">
            <Select value={v.treatment || "none"} onValueChange={(val) => set("treatment", val === "none" ? "" : (val as "dr" | "dra"))}>
              <SelectTrigger aria-label="Tratamento">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                <SelectItem value="dr">Dr.</SelectItem>
                <SelectItem value="dra">Dra.</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Nome completo" htmlFor="fullName" error={error?.field === "fullName" ? error.message : undefined}>
            <Input id="fullName" value={v.fullName} onChange={(e) => set("fullName", e.target.value)} maxLength={120} />
          </Field>
        </div>
        <Field label="Nome do escritório" htmlFor="officeName">
          <Input id="officeName" value={v.officeName} onChange={(e) => set("officeName", e.target.value)} maxLength={120} />
        </Field>
        <div className="grid grid-cols-[1fr_7rem] gap-3">
          <Field label="Número da OAB" htmlFor="oab">
            <Input id="oab" value={v.oabNumber} onChange={(e) => set("oabNumber", e.target.value)} maxLength={20} />
          </Field>
          <Field label="UF">
            <Select value={v.oabUf || undefined} onValueChange={(val) => set("oabUf", val)}>
              <SelectTrigger aria-label="Seccional">
                <SelectValue placeholder="UF" />
              </SelectTrigger>
              <SelectContent>
                {BRAZIL_UFS.map((uf) => (
                  <SelectItem key={uf} value={uf}>
                    {uf}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field label="Telefone / WhatsApp" htmlFor="phone" optional>
          <Input id="phone" inputMode="tel" value={v.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(11) 99999-9999" />
        </Field>
        <Field label="Objetivo principal dos vídeos">
          <Select value={v.mainGoal || undefined} onValueChange={(val) => set("mainGoal", val)}>
            <SelectTrigger aria-label="Objetivo principal">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {PROFILE_GOALS.map((g) => (
                <SelectItem key={g.value} value={g.value}>
                  {g.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <fieldset className="mt-6">
        <legend className="mb-2.5 text-[0.8125rem] font-medium text-fg">Áreas de atuação</legend>
        <div className="flex flex-wrap gap-2">
          {LEGAL_AREAS.filter((a) => a.value !== "outro").map((a) => {
            const on = v.practiceAreas.includes(a.value);
            return (
              <button
                key={a.value}
                type="button"
                aria-pressed={on}
                onClick={() => toggleArea(a.value)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-300",
                  on ? "border-cyan/60 bg-cyan/10 text-cyan" : "border-line text-fg-2 hover:text-fg",
                )}
              >
                {a.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      {error && !error.field && <p className="mt-4 text-sm text-destructive">{error.message}</p>}
      <div className="mt-7 flex justify-end">
        <Button type="submit" variant="gold" loading={pending}>
          {!pending && <Save />} Salvar
        </Button>
      </div>
    </form>
  );
}

export function SecurityPanel({ email }: { email: string }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <PasswordCard />
      <EmailCard email={email} />
      <div className={cn(panelClass, "space-y-3 lg:col-span-2")}>
        <h2 className={panelTitle}>Sessões</h2>
        <p className="text-sm text-fg-2">Saia deste aparelho ou de todos ao mesmo tempo.</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="glass" onClick={() => void signOutAction()}>
            <LogOut /> Sair
          </Button>
          <Button variant="outline" onClick={() => void signOutEverywhereAction()}>
            <LogOut /> Sair de todos os dispositivos
          </Button>
        </div>
      </div>
    </div>
  );
}

function PasswordCard() {
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState<{ field?: string; message: string } | null>(null);
  const [pending, start] = React.useTransition();
  return (
    <form
      className={cn(panelClass, "space-y-4")}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const res = await changePasswordAction(password, confirm);
          if (!res.ok) return setError({ field: res.field, message: res.error });
          toast.success("Senha alterada.");
          setPassword("");
          setConfirm("");
        });
      }}
    >
      <h2 className={cn(panelTitle, "flex items-center gap-2")}>
        <KeyRound className="size-4 text-cyan" /> Senha
      </h2>
      <Field label="Nova senha" htmlFor="new-password" error={error?.field === "password" ? error.message : undefined}>
        <PasswordInput id="new-password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <PasswordStrength value={password} />
      <Field label="Confirmar" htmlFor="confirm-password" error={error?.field === "confirm" ? error.message : undefined}>
        <PasswordInput id="confirm-password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </Field>
      {error && !error.field && <p className="text-sm text-destructive">{error.message}</p>}
      <Button type="submit" variant="subtle" loading={pending} disabled={!password}>
        Atualizar senha
      </Button>
    </form>
  );
}

function EmailCard({ email }: { email: string }) {
  const [newEmail, setNewEmail] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();
  return (
    <form
      className={cn(panelClass, "space-y-4")}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const res = await changeEmailAction(newEmail);
          if (!res.ok) return setError(res.error);
          toast.success("Enviamos um link de confirmação para o novo e-mail.");
          setNewEmail("");
        });
      }}
    >
      <h2 className={cn(panelTitle, "flex items-center gap-2")}>
        <Mail className="size-4 text-cyan" /> E-mail de acesso
      </h2>
      <p className="text-sm text-fg-2">
        Atual: <span className="font-medium text-fg">{email}</span>
      </p>
      <Field label="Novo e-mail" htmlFor="new-email" error={error ?? undefined}>
        <Input id="new-email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="novo@escritorio.com.br" />
      </Field>
      <Button type="submit" variant="subtle" loading={pending} disabled={!newEmail}>
        Alterar e-mail
      </Button>
    </form>
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
            <DialogDescription>Todos os vídeos, marca e dados serão apagados. Digite EXCLUIR para confirmar.</DialogDescription>
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
