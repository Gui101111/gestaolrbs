"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Camera, KeyRound, Loader2, LogOut, Save, Trash2 } from "lucide-react";
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
import { changePasswordAction } from "@/lib/actions/account";
import { signOutAction } from "@/lib/actions/auth";
import { BRAZIL_UFS, LEGAL_AREAS, PROFILE_GOALS } from "@/lib/constants/domain";
import type { ProfileInput } from "@/lib/validations/profile";
import { initials } from "@/lib/utils";

type Values = {
  fullName: string;
  phone: string;
  officeName: string;
  oabNumber: string;
  oabUf: string;
  legalArea: string;
  mainGoal: string;
};

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
  initial: Values;
  provider: string;
}) {
  const router = useRouter();
  const [v, setV] = React.useState(initial);
  const [avatar, setAvatar] = React.useState(avatarUrl);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<{ field?: string; message: string } | null>(null);
  const [pending, start] = React.useTransition();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const set = <K extends keyof Values>(k: K, val: Values[K]) => setV((s) => ({ ...s, [k]: val }));

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

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="rounded-3xl border border-white/[0.07] bg-white/[0.02] p-6 md:p-8" noValidate>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="relative w-fit">
            <Avatar className="size-24 ring-2">
              {avatar && <AvatarImage src={avatar} alt="" />}
              <AvatarFallback className="text-2xl">{initials(v.fullName)}</AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute -right-1 -bottom-1 grid size-9 place-items-center rounded-full border border-gold/50 bg-ink text-gold-light shadow-lg transition hover:bg-gold hover:text-ink"
              aria-label="Alterar foto"
            >
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
            </button>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => void uploadAvatar(e.target.files?.[0])} aria-label="Enviar foto" />
          </div>
          <div>
            <p className="font-display text-2xl text-ivory">{v.fullName || "Seu nome"}</p>
            <p className="text-sm text-mist">{email}</p>
            <p className="mt-1 text-xs text-mist/70">Acesso via {provider === "google" ? "Google" : "e-mail e senha"}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <Field label="Nome completo" htmlFor="fullName" error={error?.field === "fullName" ? error.message : undefined}>
            <Input id="fullName" value={v.fullName} onChange={(e) => set("fullName", e.target.value)} maxLength={120} />
          </Field>
          <Field label="E-mail" htmlFor="email" hint="Para alterar, acesse Configurações.">
            <Input id="email" value={email} disabled />
          </Field>
          <Field label="Telefone / WhatsApp" htmlFor="phone" optional>
            <Input id="phone" inputMode="tel" value={v.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(11) 99999-9999" />
          </Field>
          <Field label="Nome do escritório" htmlFor="officeName" optional>
            <Input id="officeName" value={v.officeName} onChange={(e) => set("officeName", e.target.value)} maxLength={120} />
          </Field>
          <div className="grid grid-cols-[1fr_7rem] gap-3">
            <Field label="Número da OAB" htmlFor="oab" optional>
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
          <Field label="Área jurídica principal">
            <Select value={v.legalArea || undefined} onValueChange={(val) => set("legalArea", val)}>
              <SelectTrigger aria-label="Área jurídica principal">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {LEGAL_AREAS.map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
        {error && !error.field && <p className="mt-4 text-sm text-[#ec8a80]">{error.message}</p>}
        <div className="mt-8 flex justify-end">
          <Button type="submit" variant="gold" loading={pending}>
            {!pending && <Save />} Salvar alterações
          </Button>
        </div>
      </form>

      <div className="grid gap-6 lg:grid-cols-2">
        <PasswordCard />
        <div className="space-y-4 rounded-3xl border border-white/[0.07] bg-white/[0.02] p-6 md:p-7">
          <h2 className="font-display text-2xl text-ivory">Sessão</h2>
          <p className="text-sm text-mist">Encerre o acesso neste dispositivo.</p>
          <Button variant="outline" onClick={() => void signOutAction()}>
            <LogOut /> Sair da conta
          </Button>
          <div className="my-2 h-px bg-white/[0.06]" />
          <DeleteAccount />
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
      className="space-y-4 rounded-3xl border border-white/[0.07] bg-white/[0.02] p-6 md:p-7"
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
      <h2 className="flex items-center gap-2 font-display text-2xl text-ivory">
        <KeyRound className="size-5 text-gold" /> Alterar senha
      </h2>
      <Field label="Nova senha" htmlFor="new-password" error={error?.field === "password" ? error.message : undefined}>
        <PasswordInput id="new-password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <PasswordStrength value={password} />
      <Field label="Confirmar nova senha" htmlFor="confirm-password" error={error?.field === "confirm" ? error.message : undefined}>
        <PasswordInput id="confirm-password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </Field>
      {error && !error.field && <p className="text-sm text-[#ec8a80]">{error.message}</p>}
      <Button type="submit" variant="subtle" loading={pending} disabled={!password}>
        Atualizar senha
      </Button>
    </form>
  );
}

function DeleteAccount() {
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState("");
  const [pending, start] = React.useTransition();
  const router = useRouter();
  return (
    <>
      <div>
        <p className="text-sm font-medium text-[#ec8a80]">Excluir conta</p>
        <p className="mt-1 text-xs leading-relaxed text-mist">
          Remove definitivamente seus dados, vídeos e arquivos (LGPD). Esta ação não pode ser desfeita.
        </p>
        <Button variant="destructive" size="sm" className="mt-3" onClick={() => setOpen(true)}>
          <Trash2 /> Excluir minha conta
        </Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir conta definitivamente</DialogTitle>
            <DialogDescription>Todos os projetos, vídeos, marca e dados serão apagados. Digite EXCLUIR para confirmar.</DialogDescription>
          </DialogHeader>
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="EXCLUIR" aria-label="Confirmação" autoComplete="off" />
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
                  toast.success("Conta excluída. Sentiremos sua falta.");
                  router.replace("/");
                })
              }
            >
              Excluir definitivamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
