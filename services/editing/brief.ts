import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUCKETS } from "@/lib/constants/domain";
import { signedUrl } from "@/services/storage";
import type { EditBrief } from "./types";
import type { RenderJob } from "@/types/domain";

const MAX_RES: Record<string, string> = { "1080p": "1920", "4K": "3840" };

/** Converte projeto + arquivos + marca em um briefing JSON padronizado para o processador. */
export async function buildEditBrief(job: RenderJob): Promise<EditBrief> {
  const admin = createAdminClient();
  const [{ data: project }, { data: files }, { data: brand }, { data: profile }, { data: revisions }, { data: sub }] = await Promise.all([
    admin.from("projects").select("*").eq("id", job.project_id).single(),
    admin.from("project_files").select("*").eq("project_id", job.project_id).eq("status", "uploaded").order("sort_order"),
    admin.from("brand_kits").select("*").eq("user_id", job.user_id).maybeSingle(),
    admin.from("profiles").select("full_name, oab_number, oab_uf, office_name").eq("id", job.user_id).single(),
    admin.from("project_revisions").select("comment, timestamp_sec, status").eq("project_id", job.project_id).neq("status", "resolved"),
    admin.from("subscriptions").select("plan_id, plans(max_resolution)").eq("user_id", job.user_id).maybeSingle(),
  ]);
  if (!project) throw new Error("project_not_found");

  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const ttl = 60 * 60 * 24; // 24h para o processador baixar a mídia
  const sources = await Promise.all(
    (files ?? []).map(async (f) => ({
      kind: f.kind,
      bucket: f.bucket,
      path: f.storage_path,
      fileName: f.file_name,
      mimeType: f.mime_type,
      durationSec: f.duration_sec,
      width: f.width,
      height: f.height,
      sizeBytes: f.size_bytes,
      url: await signedUrl(admin, f.bucket, f.storage_path, { expiresIn: ttl }),
    })),
  );

  const useBrand = Boolean((project.settings as Record<string, boolean>)?.logo);
  const plan = (sub as { plans?: { max_resolution?: string } | null } | null)?.plans;
  const maxResolution = plan?.max_resolution ?? "1080p";

  return {
    version: 1,
    job: { id: job.id, kind: job.kind, callbackUrl: `${site}/api/jobs/callback` },
    project: {
      id: project.id,
      name: project.name,
      objective: project.objective,
      legalArea: project.legal_area,
      editingStyle: project.editing_style,
      platforms: project.platforms,
      aspectRatios: project.aspect_ratios,
      instructions: project.instructions,
      settings: (project.settings ?? {}) as Record<string, boolean>,
      options: (project.options ?? {}) as Record<string, unknown>,
      revisionNotes: (revisions ?? []).map((r) => ({ comment: r.comment, timestampSec: r.timestamp_sec })),
    },
    sources,
    lawyer: {
      name: profile?.full_name ?? null,
      oab: profile?.oab_number && profile?.oab_uf ? `OAB/${profile.oab_uf} ${profile.oab_number}` : null,
      officeName: profile?.office_name ?? null,
    },
    brand: brand
      ? {
          officeName: brand.office_name,
          professionalName: brand.professional_name,
          oabDisplay: brand.oab_display,
          colors: { primary: brand.primary_color, secondary: brand.secondary_color, accent: brand.accent_color },
          font: brand.font,
          website: brand.website,
          instagram: brand.instagram,
          whatsapp: brand.whatsapp,
          logoUrl: useBrand && brand.logo_path ? await signedUrl(admin, BUCKETS.brand, brand.logo_path, { expiresIn: ttl }) : null,
        }
      : null,
    outputs: project.aspect_ratios.map((ratio) => ({
      aspectRatio: ratio,
      container: "mp4" as const,
      maxResolution: MAX_RES[maxResolution] ? maxResolution : "1080p",
      destination: { bucket: BUCKETS.renders, prefix: `${job.user_id}/${project.id}/` },
    })),
    compliance: { oabProvimento205: Boolean((project.settings as Record<string, boolean>)?.compliance_review ?? true), language: "pt-BR" },
  };
}
