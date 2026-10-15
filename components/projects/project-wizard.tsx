"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, ChevronDown, CircleCheck, Cloud, CloudOff, Loader2, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { VideoUploader, type UploadedVideo } from "@/components/upload/video-uploader";
import { EditingStyleSelector, LegalAreaSelector, ObjectiveSelector, PlatformSelector } from "@/components/projects/selectors";
import {
  ASPECT_RATIOS,
  CAPTION_STYLES,
  CTA_TYPES,
  EDITING_STYLES,
  EDIT_SETTINGS,
  LEGAL_AREAS,
  OBJECTIVES,
  PLATFORMS,
  TARGET_DURATIONS,
  labelOf,
  ratiosForPlatforms,
  type EditSettings,
} from "@/lib/constants/domain";
import {
  createDraftAction,
  registerFileAction,
  removeOriginalAction,
  saveDraftAction,
  setThumbnailAction,
  submitProjectAction,
  type DraftPatch,
} from "@/lib/actions/projects";
import { createClient } from "@/lib/supabase/client";
import { cn, formatBytes, formatDuration, safeFileName } from "@/lib/utils";
import type { ProjectOptions } from "@/types/domain";

const EASE = [0.22, 1, 0.36, 1] as const;

const STEPS = [
  { key: "video", label: "Vídeo", title: "Envie seu vídeo", subtitle: "Grave como sempre gravou. Nós cuidamos do resto." },
  { key: "goal", label: "Objetivo", title: "Qual é o objetivo deste vídeo?", subtitle: "E sobre qual área jurídica é o conteúdo?" },
  { key: "style", label: "Estilo", title: "Escolha o estilo de edição", subtitle: "Cada estilo define ritmo, legendas e acabamento." },
  { key: "format", label: "Formato", title: "Onde você pretende publicar?", subtitle: "Selecione uma ou mais plataformas." },
  { key: "custom", label: "Personalizar", title: "Personalize sua edição", subtitle: "Os padrões já são ótimos — ajuste só o que quiser." },
  { key: "review", label: "Revisão", title: "Confira e inicie a edição", subtitle: "Revise as escolhas antes de enviar." },
] as const;

export type WizardInitial = {
  id: string | null;
  name: string;
  objective: string | null;
  legal_area: string | null;
  editing_style: string | null;
  platforms: string[];
  aspect_ratios: string[];
  settings: EditSettings;
  options: ProjectOptions;
  instructions: string;
  wizard_step: number;
  rights_confirmed: boolean;
};

export type WizardVideo = {
  fileName: string;
  sizeBytes: number | null;
  durationSec: number | null;
  width: number | null;
  height: number | null;
  previewUrl: string | null;
  thumbnailUrl: string | null;
};

type Props = {
  userId: string;
  initial: WizardInitial;
  video: WizardVideo | null;
  limits: { maxBytes: number; maxDurationSec: number | null; allowedRatios: string[] };
  billing: { active: boolean; planName: string | null; remaining: number | null };
  brand: { hasLogo: boolean; whatsapp: string | null; instagram: string | null; website: string | null };
};

type SaveState = "idle" | "saving" | "saved" | "error";

export function ProjectWizard({ userId, initial, video: initialVideo, limits, billing, brand }: Props) {
  const router = useRouter();
  const [p, setP] = React.useState(initial);
  const [video, setVideo] = React.useState<WizardVideo | null>(initialVideo);
  const [step, setStep] = React.useState(Math.min(Math.max(initial.wizard_step, 1), STEPS.length) - 1);
  const [dir, setDir] = React.useState(1);
  const [save, setSave] = React.useState<SaveState>("idle");
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const idRef = React.useRef<string | null>(initial.id);
  const debounce = React.useRef<number | null>(null);

  const patchFromState = React.useCallback(
    (s: WizardInitial, wizardStep?: number): DraftPatch => ({
      name: s.name || "Novo projeto",
      objective: s.objective as DraftPatch["objective"],
      legal_area: s.legal_area as DraftPatch["legal_area"],
      editing_style: s.editing_style as DraftPatch["editing_style"],
      platforms: s.platforms as DraftPatch["platforms"],
      aspect_ratios: s.aspect_ratios as DraftPatch["aspect_ratios"],
      settings: s.settings,
      options: s.options as DraftPatch["options"],
      instructions: s.instructions || null,
      rights_confirmed: s.rights_confirmed,
      ...(wizardStep ? { wizard_step: wizardStep } : {}),
    }),
    [],
  );

  const persist = React.useCallback(
    async (s: WizardInitial, wizardStep?: number) => {
      const id = idRef.current;
      if (!id) return true;
      setSave("saving");
      const res = await saveDraftAction(id, patchFromState(s, wizardStep));
      setSave(res.ok ? "saved" : "error");
      if (!res.ok) toast.error(res.error);
      return res.ok;
    },
    [patchFromState],
  );

  const update = (patch: Partial<WizardInitial>, debounced = true) => {
    setP((prev) => {
      const next = { ...prev, ...patch };
      if (debounced && idRef.current) {
        if (debounce.current) window.clearTimeout(debounce.current);
        debounce.current = window.setTimeout(() => void persist(next), 900);
      }
      return next;
    });
  };

  React.useEffect(() => () => {
    if (debounce.current) window.clearTimeout(debounce.current);
  }, []);

  // ---------------------------------------------------------------- upload
  const ensurePath = async (file: File) => {
    let id = idRef.current;
    if (!id) {
      const base = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim().slice(0, 80);
      const name = p.name && p.name !== "Novo projeto" ? p.name : base || "Novo projeto";
      const res = await createDraftAction({ name });
      if (!res.ok) {
        toast.error(res.error);
        return null;
      }
      id = res.data.id;
      idRef.current = id;
      setP((prev) => ({ ...prev, id, name }));
      window.history.replaceState(null, "", `/app/projetos/novo?id=${id}`);
      await saveDraftAction(id, patchFromState({ ...p, id, name }, 1));
    }
    return `${userId}/${id}/${Date.now()}-${safeFileName(file.name)}`;
  };

  const onUploaded = async (v: UploadedVideo) => {
    const id = idRef.current;
    if (!id) return;
    const res = await registerFileAction({
      projectId: id,
      path: v.path,
      fileName: v.fileName,
      mimeType: v.mimeType,
      sizeBytes: v.sizeBytes,
      durationSec: v.durationSec,
      width: v.width,
      height: v.height,
      kind: "original",
    });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    let thumbnailUrl: string | null = null;
    if (v.thumbnail) {
      const path = `${userId}/${id}/thumb-${Date.now()}.jpg`;
      const supabase = createClient();
      const { error } = await supabase.storage.from("thumbnails").upload(path, v.thumbnail, { contentType: "image/jpeg", upsert: true });
      if (!error) {
        await setThumbnailAction(id, path);
        thumbnailUrl = URL.createObjectURL(v.thumbnail);
      }
    }
    setVideo({
      fileName: v.fileName,
      sizeBytes: v.sizeBytes,
      durationSec: v.durationSec,
      width: v.width,
      height: v.height,
      previewUrl: v.previewUrl,
      thumbnailUrl,
    });
    toast.success("Vídeo enviado com sucesso.");
  };

  const onRemove = async () => {
    if (!idRef.current) return;
    const res = await removeOriginalAction(idRef.current);
    if (!res.ok) return void toast.error(res.error);
    setVideo(null);
  };

  // ---------------------------------------------------------------- navegação
  const canContinue = (() => {
    switch (STEPS[step].key) {
      case "video":
        return Boolean(video) && p.name.trim().length > 0;
      case "goal":
        return Boolean(p.objective && p.legal_area);
      case "style":
        return Boolean(p.editing_style);
      case "format":
        return p.platforms.length > 0 && p.aspect_ratios.length > 0;
      case "custom":
        return p.instructions.length <= 1000;
      default:
        return true;
    }
  })();

  const goTo = async (target: number) => {
    if (target === step) return;
    setDir(target > step ? 1 : -1);
    setStep(target);
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (debounce.current) window.clearTimeout(debounce.current);
    await persist(p, target + 1);
  };

  const submit = async () => {
    const id = idRef.current;
    if (!id) return;
    setSubmitting(true);
    const ok = await persist(p, STEPS.length);
    if (!ok) return setSubmitting(false);
    const res = await submitProjectAction(id);
    if (!res.ok) {
      setSubmitting(false);
      toast.error(res.error);
      return;
    }
    setDone(true);
    window.setTimeout(() => router.push(`/app/projetos/${id}`), 2400);
  };

  const current = STEPS[step];
  const sourceRatio = video?.width && video?.height ? video.width / video.height : null;
  const needsReframe = sourceRatio
    ? p.aspect_ratios.some((r) => {
        const def = ASPECT_RATIOS.find((a) => a.value === r);
        return def ? Math.abs(def.ratio - sourceRatio) > 0.05 : false;
      })
    : false;

  return (
    <div className="relative">
      {/* Cabeçalho com progresso */}
      <div className="mb-8 flex flex-col gap-6 md:mb-10">
        <div className="flex items-center justify-between gap-4">
          <p className="eyebrow">
            Novo projeto · Etapa {step + 1} de {STEPS.length}
          </p>
          <SaveIndicator state={save} hasId={Boolean(idRef.current)} />
        </div>
        <ol className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
          {STEPS.map((s, i) => {
            const reachable = i <= step || (i === step + 1 && canContinue);
            return (
              <li key={s.key} className="min-w-[4.5rem] flex-1">
                <button
                  type="button"
                  disabled={!reachable || i === step || (i > 0 && !video)}
                  onClick={() => void goTo(i)}
                  className="group w-full text-left disabled:cursor-default"
                  aria-current={i === step ? "step" : undefined}
                >
                  <span className="block h-1 overflow-hidden rounded-full bg-white/[0.07]">
                    <motion.span
                      className="block h-full bg-gold-gradient"
                      initial={false}
                      animate={{ width: i < step ? "100%" : i === step ? "45%" : "0%" }}
                      transition={{ duration: 0.8, ease: EASE }}
                    />
                  </span>
                  <span
                    className={cn(
                      "mt-2 flex items-center gap-1.5 text-[0.6875rem] font-medium tracking-wide whitespace-nowrap transition-colors",
                      i === step ? "text-gold-light" : i < step ? "text-ivory/70 group-hover:text-ivory" : "text-mist/50",
                    )}
                  >
                    {i < step && <Check className="size-3" />}
                    {s.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <AnimatePresence mode="wait" custom={dir}>
        <motion.section
          key={current.key}
          custom={dir}
          initial={{ opacity: 0, x: dir * 36, filter: "blur(8px)" }}
          animate={{ opacity: 1, x: 0, filter: "blur(0px)", transitionEnd: { filter: "none" } }}
          exit={{ opacity: 0, x: dir * -36, filter: "blur(8px)" }}
          transition={{ duration: 0.55, ease: EASE }}
          aria-labelledby="wizard-title"
        >
          <h1 id="wizard-title" className="font-display text-4xl leading-tight text-ivory md:text-5xl">
            {current.title}
          </h1>
          <p className="mt-2 text-[0.9375rem] text-mist">{current.subtitle}</p>

          <div className="mt-8 md:mt-10">
            {current.key === "video" && (
              <div className="space-y-6">
                <Field label="Nome do projeto" htmlFor="project-name" hint="Aparece na sua biblioteca. Você pode alterar depois.">
                  <Input
                    id="project-name"
                    value={p.name}
                    maxLength={140}
                    onChange={(e) => update({ name: e.target.value })}
                    placeholder="Ex.: Revisão da aposentadoria — parte 1"
                  />
                </Field>
                <VideoUploader
                  existing={video}
                  maxBytes={limits.maxBytes}
                  maxDurationSec={limits.maxDurationSec}
                  ensurePath={ensurePath}
                  onUploaded={onUploaded}
                  onRemove={onRemove}
                />
              </div>
            )}

            {current.key === "goal" && (
              <div className="space-y-10">
                <ObjectiveSelector value={p.objective} onChange={(v) => update({ objective: v })} />
                <div>
                  <h2 className="font-display text-2xl text-ivory md:text-3xl">Sobre qual área jurídica é o conteúdo?</h2>
                  <p className="mt-1 mb-5 text-sm text-mist">Usamos a área para escolher B-roll, ícones, termos destacados e a identidade da edição.</p>
                  <LegalAreaSelector value={p.legal_area} onChange={(v) => update({ legal_area: v })} />
                </div>
              </div>
            )}

            {current.key === "style" && <EditingStyleSelector value={p.editing_style} onChange={(v) => update({ editing_style: v })} />}

            {current.key === "format" && (
              <div className="space-y-6">
                <PlatformSelector
                  value={p.platforms}
                  onChange={(platforms) => update({ platforms, aspect_ratios: ratiosForPlatforms(platforms).filter((r) => limits.allowedRatios.includes(r)) })}
                />
                {p.aspect_ratios.length > 0 && (
                  <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-5 py-4 text-sm">
                    <span className="text-mist">Você receberá:</span>
                    {p.aspect_ratios.map((r) => (
                      <span key={r} className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1 font-mono text-xs text-gold-light">
                        MP4 {r}
                      </span>
                    ))}
                  </div>
                )}
                {needsReframe && (
                  <p className="flex items-start gap-2 text-sm text-mist">
                    <Sparkles className="mt-0.5 size-4 shrink-0 text-gold" /> Vamos reenquadrar mantendo você no centro da imagem.
                  </p>
                )}
                <p className="text-xs text-mist/70">Formato personalizado (ex.: 21:9) estará disponível em breve.</p>
              </div>
            )}

            {current.key === "custom" && <CustomizeStep p={p} update={update} brand={brand} />}

            {current.key === "review" && (
              <ReviewStep p={p} video={video} billing={billing} goTo={(i) => void goTo(i)} update={update} />
            )}
          </div>
        </motion.section>
      </AnimatePresence>

      {/* Rodapé de navegação */}
      <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] z-20 mt-10 lg:bottom-6">
        <div className="panel flex items-center justify-between gap-3 rounded-2xl px-3 py-3 md:px-4">
          <Button variant="ghost" onClick={() => void goTo(step - 1)} disabled={step === 0 || submitting}>
            <ArrowLeft /> <span className="hidden sm:inline">Voltar</span>
          </Button>
          {current.key !== "review" ? (
            <Button variant="gold" size="lg" onClick={() => void goTo(step + 1)} disabled={!canContinue}>
              Continuar <ArrowRight />
            </Button>
          ) : billing.active && billing.remaining !== 0 ? (
            <Button variant="gold" size="lg" onClick={() => void submit()} loading={submitting} disabled={!p.rights_confirmed || !video} className="glow-gold">
              Iniciar edição {!submitting && <Sparkles />}
            </Button>
          ) : (
            <Button asChild variant="gold" size="lg">
              <Link href="/app/assinatura">Ver planos</Link>
            </Button>
          )}
        </div>
      </div>

      <AnimatePresence>{done && <SubmittedOverlay />}</AnimatePresence>
    </div>
  );
}

function SaveIndicator({ state, hasId }: { state: SaveState; hasId: boolean }) {
  if (!hasId) return <span className="text-xs text-mist/60">O rascunho é criado ao enviar o vídeo</span>;
  return (
    <span className="flex items-center gap-1.5 text-xs text-mist" aria-live="polite">
      {state === "saving" ? (
        <>
          <Loader2 className="size-3.5 animate-spin" /> Salvando…
        </>
      ) : state === "error" ? (
        <>
          <CloudOff className="size-3.5 text-[#ec8a80]" /> Não salvo
        </>
      ) : (
        <>
          <Cloud className="size-3.5 text-gold" /> Rascunho salvo
        </>
      )}
    </span>
  );
}

function Chips<T extends string>({ options, value, onChange }: { options: readonly { value: T; label: string }[]; value: T | undefined; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={cn(
            "rounded-full border px-3.5 py-1.5 text-xs transition-all",
            value === o.value ? "border-gold/60 bg-gold/15 text-gold-light" : "border-white/10 text-mist hover:text-ivory",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function CustomizeStep({
  p,
  update,
  brand,
}: {
  p: WizardInitial;
  update: (patch: Partial<WizardInitial>, debounced?: boolean) => void;
  brand: Props["brand"];
}) {
  const [advanced, setAdvanced] = React.useState(
    Boolean((p.options.target_duration && p.options.target_duration !== "completo") || p.options.audience || p.options.cut_ranges?.length || p.options.reference_url),
  );
  const groups = Array.from(new Set(EDIT_SETTINGS.map((s) => s.group)));
  const setSetting = (key: string, v: boolean) => update({ settings: { ...p.settings, [key]: v } });
  const setOption = (patch: Partial<ProjectOptions>) => update({ options: { ...p.options, ...patch } });
  const ranges = p.options.cut_ranges ?? [];

  return (
    <div className="space-y-8">
      <div className="grid gap-4 lg:grid-cols-2">
        {groups.map((g) => (
          <div key={g} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
            <p className="eyebrow mb-3">{g}</p>
            <div className="divide-y divide-white/[0.06]">
              {EDIT_SETTINGS.filter((s) => s.group === g).map((s) => (
                <div key={s.key} className="py-3.5 first:pt-1 last:pb-1">
                  <label className="flex cursor-pointer items-center justify-between gap-4">
                    <span>
                      <span className="block text-sm font-medium text-ivory">{s.label}</span>
                      <span className="block text-xs text-mist">{s.description}</span>
                    </span>
                    <Switch checked={p.settings[s.key]} onCheckedChange={(v) => setSetting(s.key, v)} aria-label={s.label} />
                  </label>
                  <AnimatePresence initial={false}>
                    {p.settings[s.key] && s.key === "captions" && (
                      <SubOption>
                        <Chips options={CAPTION_STYLES} value={p.options.caption_style ?? "palavra"} onChange={(v) => setOption({ caption_style: v })} />
                      </SubOption>
                    )}
                    {p.settings[s.key] && s.key === "cta" && (
                      <SubOption>
                        <Chips options={CTA_TYPES} value={p.options.cta_type} onChange={(v) => setOption({ cta_type: v })} />
                        <Input
                          className="mt-3 h-10 text-sm"
                          value={p.options.cta_text ?? ""}
                          maxLength={140}
                          onChange={(e) => setOption({ cta_text: e.target.value })}
                          placeholder={
                            p.options.cta_type === "whatsapp"
                              ? brand.whatsapp
                                ? `WhatsApp: ${brand.whatsapp}`
                                : "Número do WhatsApp com DDD"
                              : p.options.cta_type === "site"
                                ? (brand.website ?? "Site do escritório")
                                : p.options.cta_type === "seguir"
                                  ? brand.instagram
                                    ? `@${brand.instagram}`
                                    : "@seuperfil"
                                  : "Texto da chamada final"
                          }
                          aria-label="Texto da chamada final"
                        />
                      </SubOption>
                    )}
                    {p.settings[s.key] && s.key === "background_music" && (
                      <SubOption>
                        <Chips
                          options={[
                            { value: "sobria", label: "Sóbria" },
                            { value: "inspiradora", label: "Inspiradora" },
                            { value: "neutra", label: "Neutra" },
                          ] as const}
                          value={p.options.music_tone}
                          onChange={(v) => setOption({ music_tone: v })}
                        />
                      </SubOption>
                    )}
                    {p.settings[s.key] && s.key === "logo" && !brand.hasLogo && (
                      <SubOption>
                        <p className="text-xs text-warning">
                          Você ainda não enviou um logotipo.{" "}
                          <Link href="/app/marca" className="underline underline-offset-4">
                            Adicionar em Minha Marca
                          </Link>
                        </p>
                      </SubOption>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 md:p-6">
        <Field
          label="Quer dar alguma instrução adicional?"
          htmlFor="instructions"
          error={p.instructions.length > 1000 ? "Use no máximo 1.000 caracteres." : undefined}
          optional
        >
          <Textarea
            id="instructions"
            rows={5}
            value={p.instructions}
            onChange={(e) => update({ instructions: e.target.value.slice(0, 1100) })}
            placeholder="Ex.: quero uma edição séria, destacar a parte onde falo sobre aposentadoria, utilizar poucas animações e não adicionar CTA."
          />
        </Field>
        <p className={cn("mt-2 text-right text-xs tabular-nums", p.instructions.length > 1000 ? "text-[#ec8a80]" : "text-mist")}>
          {p.instructions.length}/1000
        </p>
        {p.editing_style === "performance" && (
          <Field label="Título de impacto nos 3 primeiros segundos" htmlFor="hook" optional className="mt-4" hint="Deixe vazio para a IA sugerir a partir da sua fala.">
            <Input id="hook" value={p.options.hook_text ?? ""} maxLength={140} onChange={(e) => setOption({ hook_text: e.target.value })} placeholder="Ex.: Teve o benefício negado?" />
          </Field>
        )}
      </div>

      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02]">
        <button type="button" onClick={() => setAdvanced((v) => !v)} className="flex w-full items-center justify-between px-5 py-4 text-left md:px-6" aria-expanded={advanced}>
          <span>
            <span className="block text-sm font-medium text-ivory">Ajustes avançados</span>
            <span className="block text-xs text-mist">Duração final, público-alvo, trechos para remover e vídeo de referência</span>
          </span>
          <ChevronDown className={cn("size-4 text-mist transition-transform duration-500", advanced && "rotate-180")} />
        </button>
        <AnimatePresence initial={false}>
          {advanced && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.45, ease: EASE }} className="overflow-hidden">
              <div className="space-y-6 border-t border-white/[0.06] px-5 py-5 md:px-6">
                <Field label="Duração final">
                  <Chips options={TARGET_DURATIONS} value={p.options.target_duration ?? "completo"} onChange={(v) => setOption({ target_duration: v })} />
                </Field>
                <Field label="Público-alvo do vídeo" htmlFor="audience" optional>
                  <Input id="audience" value={p.options.audience ?? ""} maxLength={200} onChange={(e) => setOption({ audience: e.target.value })} placeholder="Ex.: aposentados do INSS acima de 60 anos" />
                </Field>
                <Field label="Trechos para remover" optional hint="Use o formato minutos:segundos, como 01:20 a 01:35.">
                  <div className="space-y-2">
                    {ranges.map((r, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Input className="h-10 w-24 text-center font-mono text-sm" value={r.start} maxLength={8} placeholder="00:00" aria-label="Início"
                          onChange={(e) => setOption({ cut_ranges: ranges.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)) })} />
                        <span className="text-xs text-mist">a</span>
                        <Input className="h-10 w-24 text-center font-mono text-sm" value={r.end} maxLength={8} placeholder="00:00" aria-label="Fim"
                          onChange={(e) => setOption({ cut_ranges: ranges.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)) })} />
                        <Button variant="ghost" size="icon-sm" onClick={() => setOption({ cut_ranges: ranges.filter((_, j) => j !== i) })} aria-label="Remover trecho">
                          <Trash2 />
                        </Button>
                      </div>
                    ))}
                    {ranges.length < 10 && (
                      <Button variant="subtle" size="sm" onClick={() => setOption({ cut_ranges: [...ranges, { start: "", end: "" }] })}>
                        <Plus /> Adicionar trecho
                      </Button>
                    )}
                  </div>
                </Field>
                <Field label="Vídeo de referência" htmlFor="reference" optional hint="Link de um vídeo com o estilo que você gosta.">
                  <Input id="reference" type="url" value={p.options.reference_url ?? ""} maxLength={300} onChange={(e) => setOption({ reference_url: e.target.value })} placeholder="https://" />
                </Field>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function SubOption({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4, ease: EASE }} className="overflow-hidden">
      <div className="pt-3">{children}</div>
    </motion.div>
  );
}

function ReviewStep({
  p,
  video,
  billing,
  goTo,
  update,
}: {
  p: WizardInitial;
  video: WizardVideo | null;
  billing: Props["billing"];
  goTo: (i: number) => void;
  update: (patch: Partial<WizardInitial>, debounced?: boolean) => void;
}) {
  const enabled = EDIT_SETTINGS.filter((s) => p.settings[s.key]).map((s) => s.label);
  const rows: { label: string; value: React.ReactNode; step: number }[] = [
    {
      label: "Arquivo",
      value: video ? `${video.fileName} · ${formatBytes(video.sizeBytes)} · ${formatDuration(video.durationSec)}` : "—",
      step: 0,
    },
    { label: "Objetivo", value: labelOf(OBJECTIVES, p.objective), step: 1 },
    { label: "Área jurídica", value: labelOf(LEGAL_AREAS, p.legal_area), step: 1 },
    { label: "Estilo", value: labelOf(EDITING_STYLES, p.editing_style), step: 2 },
    {
      label: "Formato",
      value: `${p.platforms.map((x) => labelOf(PLATFORMS, x)).join(", ")} · ${p.aspect_ratios.join(", ")}`,
      step: 3,
    },
    { label: "Configurações", value: enabled.join(" · ") || "Nenhuma", step: 4 },
    { label: "Observações", value: p.instructions || "Sem instruções adicionais", step: 4 },
  ];

  return (
    <div className="space-y-6">
      <div className="panel gold-ring overflow-hidden rounded-3xl">
        <div className="grid md:grid-cols-[16rem_1fr]">
          <div className="relative aspect-video bg-black md:aspect-auto">
            {video?.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={video.thumbnailUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-ink/80 to-transparent" />
            <p className="absolute bottom-4 left-4 right-4 truncate font-display text-xl text-ivory">{p.name}</p>
          </div>
          <dl className="divide-y divide-white/[0.06]">
            {rows.map((r) => (
              <div key={r.label} className="grid grid-cols-[7.5rem_1fr_auto] items-start gap-3 px-5 py-3.5 text-sm md:grid-cols-[9rem_1fr_auto]">
                <dt className="text-mist">{r.label}</dt>
                <dd className="min-w-0 break-words text-ivory/90">{r.value}</dd>
                <button type="button" onClick={() => goTo(r.step)} className="flex items-center gap-1 text-xs text-gold hover:text-gold-light">
                  <Pencil className="size-3" /> editar
                </button>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 text-sm leading-relaxed text-ivory/90">
        <Checkbox checked={p.rights_confirmed} onCheckedChange={(v) => update({ rights_confirmed: v === true })} className="mt-0.5" />
        Declaro que tenho direito de uso da imagem e do conteúdo deste vídeo, e que o conteúdo observa as normas éticas da advocacia.
      </label>

      {!billing.active ? (
        <div className="rounded-2xl border border-warning/30 bg-warning/[0.06] p-5 text-sm text-[#f1cf93]">
          Você precisa de uma assinatura ativa para iniciar a edição. Seu rascunho fica salvo.
        </div>
      ) : billing.remaining === 0 ? (
        <div className="rounded-2xl border border-warning/30 bg-warning/[0.06] p-5 text-sm text-[#f1cf93]">
          Você atingiu o limite de vídeos do {billing.planName ?? "seu plano"} neste ciclo. Seu rascunho fica salvo.
        </div>
      ) : (
        <p className="flex items-center gap-2 text-xs text-mist">
          <CircleCheck className="size-4 text-gold" />
          {billing.remaining != null ? `Este envio usará 1 dos ${billing.remaining} vídeos restantes no ciclo.` : "Envio incluído no seu plano."}
        </p>
      )}
    </div>
  );
}

function SubmittedOverlay() {
  return (
    <motion.div
      className="fixed inset-0 z-[80] grid place-items-center bg-ink/90 backdrop-blur-xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="status"
      aria-live="assertive"
    >
      <div className="text-center">
        <motion.div
          className="relative mx-auto grid size-28 place-items-center"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 160, damping: 14 }}
        >
          <span className="absolute inset-0 rounded-full bg-gold/20 blur-2xl" />
          <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
            <motion.circle cx="50" cy="50" r="46" fill="none" stroke="#C6A15B" strokeWidth="2" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: EASE }} />
          </svg>
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.8, type: "spring", stiffness: 260 }}>
            <Check className="size-10 text-gold-light" strokeWidth={2.5} />
          </motion.span>
        </motion.div>
        <motion.h2 className="mt-8 font-display text-4xl text-ivory md:text-5xl" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          Seu vídeo entrou em edição.
        </motion.h2>
        <motion.p className="mt-3 text-mist" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}>
          Acompanhe cada etapa do processamento em tempo real.
        </motion.p>
      </div>
    </motion.div>
  );
}
