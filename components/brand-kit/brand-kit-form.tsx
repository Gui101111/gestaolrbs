"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
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
  { name: "Dourado neon", primary: "#F2C46D", secondary: "#101216", accent: "#F4F5F7" },
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
        <section className="glass rounded-[22px] p-5 md:p-6">
          <h2 className="font-sans text-base font-bold tracking-normal text-fg">Logotipo</h2>
          <p className="mt-1 text-sm text-fg-3">PNG ou SVG com fundo transparente.</p>
          <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="grid size-28 shrink-0 place-items-center overflow-hidden rounded-2xl border border-dashed border-line-strong bg-[repeating-conic-gradient(#11141a_0_25%,#0b0d11_0_50%)] bg-[length:16px_16px]">
              {logoState.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoState.url} alt="Logotipo do escritório" className="max-h-24 max-w-24 object-contain" />
              ) : (
                <ImagePlus className="size-7 text-white/40" />
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

        <section className="glass rounded-[22px] p-5 md:p-6">
          <h2 className="font-sans text-base font-bold tracking-normal text-fg">Identificação</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <Field label="Nome do escritório" htmlFor="officeName" error={errors.officeName}>
              <Input id="officeName" value={v.officeName} maxLength={120} onChange={(e) => set("officeName", e.target.value)} placeholder="Souza Advocacia" />
            </Field>
            <Field label="Nome profissional" htmlFor="professionalName" error={errors.professionalName}>
              <Input id="professionalName" value={v.professionalName} maxLength={120} onChange={(e) => set("professionalName", e.target.value)} placeholder="Dra. Ana Souza" />
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

        <section className="glass rounded-[22px] p-5 md:p-6">
          <h2 className="font-sans text-base font-bold tracking-normal text-fg">Cores</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => setV((s) => ({ ...s, primaryColor: p.primary, secondaryColor: p.secondary, accentColor: p.accent }))}
                className="flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-xs text-fg-2 transition hover:border-cyan/40 hover:text-fg"
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
                <div className="flex items-center gap-2 rounded-[14px] border border-input bg-raised/60 p-1.5 pr-3">
                  <input type="color" value={v[key]} onChange={(e) => set(key, e.target.value.toUpperCase())} className="size-9 cursor-pointer rounded-lg border-0 bg-transparent p-0" aria-label={`Cor ${label}`} />
                  <input
                    value={v[key]}
                    onChange={(e) => set(key, e.target.value.toUpperCase())}
                    maxLength={7}
                    className="w-full bg-transparent font-mono text-sm text-fg outline-none"
                    aria-label={`Código da cor ${label}`}
                  />
                </div>
              </Field>
            ))}
          </div>
        </section>

        <section className="glass rounded-[22px] p-5 md:p-6">
          <h2 className="font-sans text-base font-bold tracking-normal text-fg">Contatos para CTA</h2>
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

      <aside className="xl:sticky xl:top-24 xl:self-start">
        <BrandPreview v={v} logoUrl={logoState.url} />
      </aside>
    </div>
  );
}

const SCENES = [
  { id: "lower", label: "Nome" },
  { id: "vinheta", label: "Vinheta" },
  { id: "cta", label: "Chamada" },
] as const;

/** Prévia animada: nome e escritório, vinheta com a logo e chamada final. */
function BrandPreview({ v, logoUrl }: { v: BrandKitValues; logoUrl: string | null }) {
  const [scene, setScene] = React.useState<(typeof SCENES)[number]["id"]>("lower");
  const [auto, setAuto] = React.useState(true);
  const [tick, setTick] = React.useState(0);

  React.useEffect(() => {
    if (!auto) return;
    const id = window.setInterval(() => {
      setScene((s) => SCENES[(SCENES.findIndex((x) => x.id === s) + 1) % SCENES.length].id);
      setTick((t) => t + 1);
    }, 3200);
    return () => window.clearInterval(id);
  }, [auto]);

  const font = v.font || undefined;
  const cta = v.instagram ? `Siga @${v.instagram.replace(/^@/, "")}` : v.website ? v.website.replace(/^https?:\/\//, "") : "Fale com o escritório";

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-fg">Prévia animada</p>
        <div className="flex gap-1 rounded-full border border-line bg-fg/[0.04] p-0.5" role="tablist" aria-label="Cena da prévia">
          {SCENES.map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={scene === s.id}
              onClick={() => {
                setScene(s.id);
                setAuto(false);
                setTick((t) => t + 1);
              }}
              className={cn(
                "rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold transition",
                scene === s.id ? "bg-cyan text-[#06222a]" : "text-fg-2 hover:text-fg",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <div
        className="theme-stage relative mx-auto aspect-[9/16] w-full max-w-[18rem] overflow-hidden rounded-[28px] border border-line shadow-[var(--shadow-pop)]"
        style={{ background: v.secondaryColor }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/media/justica-rosto.webp" alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/40" />
        {logoUrl && scene !== "vinheta" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="absolute top-5 right-5 h-7 max-w-20 object-contain opacity-90" />
        )}

        <AnimatePresence mode="wait">
          {scene === "lower" && (
            <motion.div
              key={`lower-${tick}`}
              className="absolute bottom-20 left-4 flex items-stretch gap-2.5"
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, x: -16, transition: { duration: 0.3 } }}
            >
              <motion.span
                className="w-1 origin-bottom rounded-full"
                style={{ background: v.primaryColor, boxShadow: `0 0 12px ${v.primaryColor}` }}
                variants={{ hidden: { scaleY: 0 }, show: { scaleY: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } } }}
              />
              <motion.span
                className="overflow-hidden rounded-lg bg-black/55 px-3 py-2 backdrop-blur"
                style={{ fontFamily: font }}
                variants={{ hidden: { clipPath: "inset(0 100% 0 0)" }, show: { clipPath: "inset(0 0% 0 0)", transition: { duration: 0.7, delay: 0.25, ease: [0.22, 1, 0.36, 1] } } }}
              >
                <span className="block text-sm font-bold" style={{ color: v.accentColor }}>
                  {v.professionalName || "Seu nome profissional"}
                </span>
                <span className="block text-[0.6875rem]" style={{ color: v.primaryColor }}>
                  {v.officeName || "Nome do escritório"}
                </span>
              </motion.span>
            </motion.div>
          )}
          {scene === "vinheta" && (
            <motion.div
              key={`vinheta-${tick}`}
              className="absolute inset-0 grid place-items-center"
              style={{ background: v.secondaryColor }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.3 } }}
            >
              <motion.span
                className="absolute h-px w-2/3"
                style={{ background: v.primaryColor, boxShadow: `0 0 16px ${v.primaryColor}` }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: [0, 1, 1], opacity: [1, 1, 0] }}
                transition={{ duration: 1.4, times: [0, 0.5, 1] }}
              />
              <motion.span
                className="relative text-center"
                initial={{ opacity: 0, scale: 0.9, filter: "blur(8px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                transition={{ duration: 0.8, delay: 0.6 }}
              >
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="" className="mx-auto h-14 max-w-40 object-contain" />
                ) : (
                  <span className="block text-2xl font-bold tracking-[0.2em]" style={{ color: v.primaryColor, fontFamily: font }}>
                    {(v.officeName || "SEU ESCRITÓRIO").toUpperCase()}
                  </span>
                )}
                <span className="mt-2 block text-[0.6875rem] tracking-[0.3em] uppercase" style={{ color: v.accentColor, fontFamily: font }}>
                  {v.officeName || "Advocacia"}
                </span>
              </motion.span>
            </motion.div>
          )}
          {scene === "cta" && (
            <motion.div
              key={`cta-${tick}`}
              className="absolute inset-x-5 bottom-6"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12, transition: { duration: 0.3 } }}
              transition={{ type: "spring", stiffness: 220, damping: 18 }}
            >
              <span
                className="block rounded-full py-2.5 text-center text-xs font-bold tracking-wide"
                style={{ background: v.primaryColor, color: v.secondaryColor, fontFamily: font, boxShadow: `0 0 24px -4px ${v.primaryColor}` }}
              >
                {cta}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <p className="mt-3 text-center text-xs text-fg-3">Assim sua marca aparece nos vídeos.</p>
    </div>
  );
}
