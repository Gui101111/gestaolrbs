import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NewVideoFlow } from "@/components/new-video/new-video-flow";
import type { Draft, DraftVideo } from "@/components/new-video/types";
import { modeloById } from "@/config/modelos";
import { requireOnboardedProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { BUCKETS, EDITING_STYLES, type EditSettings } from "@/lib/constants/domain";
import { DETAIL_QUESTIONS, answersFromSettings, recommendedFor, type Answers } from "@/lib/constants/questions";
import { ROUTES } from "@/lib/routes";
import { param, type SearchParams } from "@/lib/search-params";
import { getBillingInfo } from "@/services/projects/queries";
import { signedUrl } from "@/services/storage";
import type { ProjectOptions } from "@/types/domain";

export const metadata: Metadata = { title: "Novo vídeo" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function NewVideoPage({ searchParams }: { searchParams: SearchParams }) {
  const { user, profile } = await requireOnboardedProfile();
  const sp = await searchParams;
  const id = param(sp, "id");
  const pasta = param(sp, "pasta");
  const modelo = modeloById(param(sp, "modelo"));
  const supabase = await createClient();

  const [billing, { data: brand }] = await Promise.all([
    getBillingInfo(user.id),
    supabase.from("brand_kits").select("logo_path, whatsapp, instagram, website").eq("user_id", user.id).maybeSingle(),
  ]);

  const defaultStyle = EDITING_STYLES.some((s) => s.value === profile.default_editing_style) ? profile.default_editing_style : null;

  let initial: Draft = {
    id: null,
    name: "Novo vídeo",
    folder_id: pasta && UUID.test(pasta) ? pasta : null,
    legal_area: profile.legal_area,
    editing_style: defaultStyle,
    aspect_ratios: [],
    duration: "completo",
    answers: recommendedFor(defaultStyle),
    answers_text: {},
    caption_style: "palavra",
    cta_type: undefined,
    cta_text: "",
    music_tone: undefined,
    hook_text: "",
    cut_ranges: [],
    reference_url: "",
    instructions: "",
    template: null,
    objective: null,
    rights_confirmed: false,
    step: 1,
  };

  if (modelo && !id) {
    const answers: Answers = recommendedFor(modelo.style);
    for (const q of DETAIL_QUESTIONS) {
      const keys = q.settings.filter((k) => k in modelo.answers);
      if (keys.length) answers[q.id] = keys.some((k) => modelo.answers[k]) ? "sim" : "nao";
    }
    initial = {
      ...initial,
      name: modelo.title,
      editing_style: modelo.style,
      aspect_ratios: [...modelo.formats],
      duration: modelo.duration,
      objective: modelo.objective,
      template: modelo.id,
      answers,
    };
  }

  // Vindo de Exemplos: "Usar este estilo"
  const estilo = param(sp, "estilo");
  const formato = param(sp, "formato");
  if (!id && !modelo && estilo && EDITING_STYLES.some((s) => s.value === estilo)) {
    initial = {
      ...initial,
      editing_style: estilo,
      answers: recommendedFor(estilo),
      aspect_ratios: formato && ["9:16", "1:1", "4:5", "16:9"].includes(formato) ? [formato] : initial.aspect_ratios,
    };
  }

  let video: DraftVideo | null = null;

  if (id) {
    const { data: project } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
    if (!project) redirect(ROUTES.projects);
    // Logo após o envio a página é revalidada; "enviado" mantém a animação de sucesso na tela
    if (project.status !== "draft" && !param(sp, "enviado")) redirect(ROUTES.video(id));
    const options = (project.options ?? {}) as ProjectOptions;
    initial = {
      ...initial,
      id: project.id,
      name: project.name,
      folder_id: project.folder_id,
      legal_area: project.legal_area,
      editing_style: project.editing_style,
      aspect_ratios: project.aspect_ratios,
      duration: options.target_duration ?? "completo",
      answers: options.answers ?? answersFromSettings((project.settings ?? {}) as Partial<EditSettings>),
      answers_text: options.answers_text ?? {},
      caption_style: options.caption_style ?? "palavra",
      cta_type: options.cta_type,
      cta_text: options.cta_text ?? "",
      music_tone: options.music_tone,
      hook_text: options.hook_text ?? "",
      cut_ranges: options.cut_ranges ?? [],
      reference_url: options.reference_url ?? "",
      instructions: project.instructions ?? "",
      template: options.template ?? null,
      objective: options.template ? project.objective : null,
      rights_confirmed: Boolean(project.rights_confirmed_at),
      step: Math.min(project.wizard_step, 3),
    };
    const { data: file } = await supabase
      .from("project_files")
      .select("*")
      .eq("project_id", id)
      .eq("kind", "original")
      .eq("status", "uploaded")
      .maybeSingle();
    if (file) {
      const [previewUrl, thumbnailUrl] = await Promise.all([
        signedUrl(supabase, file.bucket, file.storage_path, { expiresIn: 60 * 60 * 3 }),
        signedUrl(supabase, BUCKETS.thumbnails, project.thumbnail_path),
      ]);
      video = {
        fileName: file.file_name,
        sizeBytes: file.size_bytes,
        durationSec: file.duration_sec,
        width: file.width,
        height: file.height,
        previewUrl,
        thumbnailUrl,
      };
    }
  }

  const plan = billing.active ? billing.plan : null;
  const remaining = plan?.videos_per_month != null ? Math.max(0, plan.videos_per_month - (billing.usage?.videos_created ?? 0)) : null;
  const modeloTip = modeloById(initial.template)?.tip ?? null;

  return (
    <NewVideoFlow
      userId={user.id}
      initial={initial}
      video={video}
      tip={modeloTip}
      limits={{
        maxBytes: Math.min(plan?.max_upload_mb ?? 2048, 2048) * 1024 * 1024,
        maxDurationSec: plan?.max_video_duration_sec ?? null,
        allowedRatios: plan?.allowed_aspect_ratios ?? ["9:16", "1:1", "4:5", "16:9"],
      }}
      billing={{ active: billing.active, planName: plan?.name ?? null, remaining }}
      brand={{
        hasLogo: Boolean(brand?.logo_path),
        whatsapp: brand?.whatsapp ?? null,
        instagram: brand?.instagram ?? null,
        website: brand?.website ?? null,
      }}
    />
  );
}
