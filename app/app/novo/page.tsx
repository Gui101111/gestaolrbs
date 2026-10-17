import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProjectWizard, type WizardInitial, type WizardVideo } from "@/components/projects/project-wizard";
import { requireOnboardedProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { getBillingInfo } from "@/services/projects/queries";
import { signedUrl } from "@/services/storage";
import { BUCKETS, DEFAULT_EDIT_SETTINGS, OBJECTIVES, ratiosForPlatforms, type EditSettings } from "@/lib/constants/domain";
import { param, type SearchParams } from "@/lib/search-params";
import type { ProjectOptions } from "@/types/domain";

export const metadata: Metadata = { title: "Novo projeto" };

export default async function NewProjectPage({ searchParams }: { searchParams: SearchParams }) {
  const { user, profile } = await requireOnboardedProfile();
  const sp = await searchParams;
  const id = param(sp, "id");
  const supabase = await createClient();

  const [billing, { data: brand }] = await Promise.all([
    getBillingInfo(user.id),
    supabase.from("brand_kits").select("logo_path, whatsapp, instagram, website").eq("user_id", user.id).maybeSingle(),
  ]);

  let initial: WizardInitial = {
    id: null,
    name: "Novo projeto",
    objective: OBJECTIVES.some((o) => o.value === profile.main_goal) ? profile.main_goal : null,
    legal_area: profile.legal_area,
    editing_style: profile.default_editing_style,
    platforms: profile.default_platforms ?? [],
    aspect_ratios: ratiosForPlatforms(profile.default_platforms ?? []),
    settings: DEFAULT_EDIT_SETTINGS,
    options: { caption_style: "palavra", target_duration: "completo" },
    instructions: "",
    wizard_step: 1,
    rights_confirmed: false,
  };
  let video: WizardVideo | null = null;

  if (id) {
    const { data: project } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
    if (!project) redirect("/app/projetos");
    if (project.status !== "draft") redirect(`/app/video/${id}`);
    initial = {
      id: project.id,
      name: project.name,
      objective: project.objective,
      legal_area: project.legal_area,
      editing_style: project.editing_style,
      platforms: project.platforms,
      aspect_ratios: project.aspect_ratios,
      settings: { ...DEFAULT_EDIT_SETTINGS, ...((project.settings ?? {}) as Partial<EditSettings>) },
      options: (project.options ?? {}) as ProjectOptions,
      instructions: project.instructions ?? "",
      wizard_step: project.wizard_step,
      rights_confirmed: Boolean(project.rights_confirmed_at),
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

  return (
    <div className="mx-auto max-w-5xl">
      <ProjectWizard
        userId={user.id}
        initial={initial}
        video={video}
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
    </div>
  );
}
