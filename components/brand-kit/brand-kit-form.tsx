"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ImagePlus, Loader2, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { saveBrandKitAction } from "@/lib/actions/profile";
import { cn } from "@/lib/utils";

const FONTS = ["Manrope", "Cormorant Garamond", "Playfair Display", "Libre Baskerville", "Lora", "Montserrat", "Inter", "Poppins"];
const PRESETS = [
  { name: "Clássico dourado", primary: "#C6A15B", secondary: "#0B1625", accent: "#F5F5F2" },
  { name: "Azul institucional", primary: "#2F5D8C", secondary: "#0B1625", accent: "#F5F5F2" },
  { name: "Vinho e marfim", primary: "#7A2E3A", secondary: "#160C0F", accent: "#F2EBE1" },
  { name: "Verde jurídico", primary: "#2E6B57", secondary: "#0A1512", accent: "#F1F3EE" },
  { name: "Grafite", primary: "#A6ABB4", secondary: "#121419", accent: "#F5F5F2" },
];

export type BrandKitValues = {
  officeName: string;
  professionalName: string;
  oabDisplay: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  font: string;
  website: string;
  instagram: string;
  whatsapp: string;
};

export function BrandKitForm({ userId, initial, logo }: { userId: string; initial: BrandKitValues; logo: { path: string | null; url: string | null } }) {
  const router = useRouter();
  const [v, setV] = React.useState(initial);
  const [logoState, setLogoState] = React.useState(logo);
  const [uploading, setUploading] = React.useState(false);
  const [errors, setErrors] = React.useState<Partial<Record<keyof BrandKitValues, string>>>({});
  const [pending, start] = React.useTransition();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const set = <K extends keyof BrandKitValues>(k: K, val: BrandKitValues[K]) => {
    setV((s) => ({ ...s, [k]: val }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const uploadLogo = async (file: File | undefined) => {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(file.type)) return void toast.error("Envie o logotipo em PNG, SVG, JPG ou WEBP.");
    if (file.size > 10 * 1024 * 1024) return void toast.error("O logotipo deve ter até 10 MB.");
    setUploading(true);
    const ext = file.type === "image/svg+xml" ? "svg" : file.type.split("/")[1];
    const path = `${userId}/logo-${Date.now()}.${ext}`;
    const supabase = createClient();
    const { error } = await supabase.storage.from("brand-assets").upload(path, file, { contentType: file.type, upsert: false });
    if (error) {
      setUploading(false);
      return void toast.error("Não foi possível enviar o logotipo. Tente novamente.");
    }
    const previous = logoState.path;
    const res = await saveBrandKitAction({ ...v, logoPath: path });
    setUploading(false);
    if (!res.ok) return void toast.error(res.error);
    if (previous) await supabase.storage.from("brand-assets").remove([previous]);
    setLogoState({ path, url: URL.createObjectURL(file) });
    toast.success("Logotipo atualizado.");
  };

  const removeLogo = async () => {
    const previous = logoState.path;
    const res = await saveBrandKitAction({ ...v, logoPath: null });
    if (!res.ok) return void toast.error(res.error);
    if (previous) await createClient().storage.from("brand-assets").remove([previous]);
    setLogoState({ path: null, url: null });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const res = await saveBrandKitAction(v);
      if (!res.ok) {
        if (res.field) setErrors({ [res.field]: res.error });
        return void toast.error(res.error);
      }
      toast.success("Identidade visual salva.");
      router.refresh();
    });
  };

  return (
    <div className="grid gap-8 xl:grid-cols-[1fr_22rem]">
      <form onSubmit={submit} className="space-y-6" noValidate>
        <section className="rounded-3xl border border-white/[0.07] bg-white/[0.02] p-6 md:p-7">
          <h2 className="font-display text-2xl text-ivory">Logotipo</h2>
          <p className="mt-1 text-sm text-mist">PNG ou SVG com fundo transparente funciona melhor nos vídeos.</p>
          <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="grid size-28 shrink-0 place-items-center overflow-hidden rounded-2xl border border-dashed border-gold/30 bg-[repeating-conic-gradient(#11141a_0_25%,#0b0d11_0_50%)] bg-[length:16px_16px]">
              {logoState.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoState.url} alt="Logotipo do escritório" className="max-h-24 max-w-24 object-contain" />
              ) : (
                <ImagePlus className="size-7 text-gold/50" />
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="sr-only" onChange={(e) => void uploadLogo(e.target.files?.[0])} aria-label="Enviar logotipo" />
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="animate-spin" /> : <ImagePlus />} {logoState.url ? "Trocar logotipo" : "Enviar logotipo"}
              </Button>
              {logoState.url && (
                <Button type="button" variant="ghost" onClick={() => void removeLogo()}>
                  <Trash2 /> Remover
                </Button>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/[0.07] bg-white/[0.02] p-6 md:p-7">
          <h2 className="font-display text-2xl text-ivory">Identificação</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <Field label="Nome do escritório" htmlFor="officeName" error={errors.officeName}>
              <Input id="officeName" value={v.officeName} maxLength={120} onChange={(e) => set("officeName", e.target.value)} placeholder="Souza Advocacia" />
            </Field>
            <Field label="Nome profissional" htmlFor="professionalName" error={errors.professionalName}>
              <Input id="professionalName" value={v.professionalName} maxLength={120} onChange={(e) => set("professionalName", e.target.value)} placeholder="Dra. Ana Souza" />
            </Field>
            <Field label="OAB exibida no vídeo" htmlFor="oabDisplay" error={errors.oabDisplay} optional>
              <Input id="oabDisplay" value={v.oabDisplay} maxLength={60} onChange={(e) => set("oabDisplay", e.target.value)} placeholder="OAB/SP 123.456" />
            </Field>
            <Field label="Fonte preferida" optional>
              <Select value={v.font || undefined} onValueChange={(val) => set("font", val)}>
                <SelectTrigger aria-label="Fonte preferida">
                  <SelectValue placeholder="Escolha uma fonte" />
                </SelectTrigger>
                <SelectContent>
                  {FONTS.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </section>

        <section className="rounded-3xl border border-white/[0.07] bg-white/[0.02] p-6 md:p-7">
          <h2 className="font-display text-2xl text-ivory">Cores</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => setV((s) => ({ ...s, primaryColor: p.primary, secondaryColor: p.secondary, accentColor: p.accent }))}
                className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs text-mist transition hover:border-gold/40 hover:text-ivory"
              >
                <span className="flex -space-x-1">
                  {[p.primary, p.secondary, p.accent].map((c) => (
                    <span key={c} className="size-3.5 rounded-full ring-1 ring-black/40" style={{ background: c }} />
                  ))}
                </span>
                {p.name}
              </button>
            ))}
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-3">
            {(
              [
                ["primaryColor", "Principal"],
                ["secondaryColor", "Fundo"],
                ["accentColor", "Texto"],
              ] as const
            ).map(([key, label]) => (
              <Field key={key} label={label} error={errors[key]}>
                <div className="flex items-center gap-2 rounded-xl border border-input bg-white/[0.03] p-1.5 pr-3">
                  <input type="color" value={v[key]} onChange={(e) => set(key, e.target.value.toUpperCase())} className="size-9 cursor-pointer rounded-lg border-0 bg-transparent p-0" aria-label={`Cor ${label}`} />
                  <input
                    value={v[key]}
                    onChange={(e) => set(key, e.target.value.toUpperCase())}
                    maxLength={7}
                    className="w-full bg-transparent font-mono text-sm text-ivory outline-none"
                    aria-label={`Código da cor ${label}`}
                  />
                </div>
              </Field>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-white/[0.07] bg-white/[0.02] p-6 md:p-7">
          <h2 className="font-display text-2xl text-ivory">Contatos para CTA</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-3">
            <Field label="Site" htmlFor="website" error={errors.website} optional>
              <Input id="website" value={v.website} onChange={(e) => set("website", e.target.value)} placeholder="souzaadvocacia.com.br" />
            </Field>
            <Field label="Instagram" htmlFor="instagram" error={errors.instagram} optional>
              <Input id="instagram" value={v.instagram} onChange={(e) => set("instagram", e.target.value)} placeholder="@souzaadv" />
            </Field>
            <Field label="WhatsApp" htmlFor="whatsapp" error={errors.whatsapp} optional>
              <Input id="whatsapp" inputMode="tel" value={v.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="(11) 99999-9999" />
            </Field>
          </div>
        </section>

        <div className="flex justify-end">
          <Button type="submit" variant="gold" size="lg" loading={pending}>
            {!pending && <Save />} Salvar identidade
          </Button>
        </div>
      </form>

      <aside className="xl:sticky xl:top-28 xl:self-start">
        <p className="eyebrow mb-3">Prévia nos vídeos</p>
        <BrandPreview v={v} logoUrl={logoState.url} />
        <p className="mt-3 text-xs text-mist">Ilustração de como nome, OAB, logotipo e chamada final podem aparecer.</p>
      </aside>
    </div>
  );
}

function BrandPreview({ v, logoUrl }: { v: BrandKitValues; logoUrl: string | null }) {
  return (
    <div className="relative mx-auto aspect-[9/16] w-full max-w-[18rem] overflow-hidden rounded-[2rem] border border-white/10 shadow-[0_40px_80px_-30px_rgba(0,0,0,1)]" style={{ background: v.secondaryColor }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/media/justica-rosto.webp" alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/40" />
      {logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="absolute top-5 right-5 h-8 max-w-24 object-contain" />
      )}
      <motion.div
        key={`${v.primaryColor}-${v.professionalName}`}
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        className="absolute bottom-24 left-4 flex items-stretch gap-2.5"
      >
        <span className="w-1 rounded-full" style={{ background: v.primaryColor }} />
        <span className="rounded-lg bg-black/55 px-3 py-2 backdrop-blur" style={{ fontFamily: v.font || undefined }}>
          <span className="block text-sm font-bold" style={{ color: v.accentColor }}>
            {v.professionalName || "Seu nome profissional"}
          </span>
          <span className="block text-[0.6875rem]" style={{ color: v.primaryColor }}>
            {v.oabDisplay || "OAB/UF 000.000"}
            {v.officeName ? ` · ${v.officeName}` : ""}
          </span>
        </span>
      </motion.div>
      <div className={cn("absolute inset-x-5 bottom-6 rounded-full py-2.5 text-center text-xs font-bold tracking-wide")} style={{ background: v.primaryColor, color: v.secondaryColor, fontFamily: v.font || undefined }}>
        {v.instagram ? `Siga @${v.instagram.replace(/^@/, "")}` : v.website ? v.website.replace(/^https?:\/\//, "") : "Fale com o escritório"}
      </div>
    </div>
  );
}
