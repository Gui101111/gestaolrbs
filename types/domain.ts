import type { Database, Tables } from "@/types/database";

export type Profile = Tables<"profiles">;
export type BrandKit = Tables<"brand_kits">;
export type Plan = Tables<"plans">;
export type Subscription = Tables<"subscriptions">;
export type Payment = Tables<"payments">;
export type Usage = Tables<"usage">;
export type Project = Tables<"projects">;
export type ProjectFile = Tables<"project_files">;
export type RenderJob = Tables<"render_jobs">;
export type Render = Tables<"renders">;
export type ProjectRevision = Tables<"project_revisions">;
export type Notification = Tables<"notifications">;

export type ProjectStatusEnum = Database["public"]["Enums"]["project_status"];
export type JobStatusEnum = Database["public"]["Enums"]["job_status"];
export type SubscriptionStatusEnum = Database["public"]["Enums"]["subscription_status"];

/** Opções extras do briefing (projects.options). */
export type ProjectOptions = {
  caption_style?: "discreta" | "palavra" | "caixa_alta";
  cta_type?: "seguir" | "site" | "whatsapp" | "personalizado";
  cta_text?: string;
  target_duration?: "completo" | "60s" | "90s" | "3min" | "cortes";
  audience?: string;
  hook_text?: string;
  music_tone?: "sobria" | "inspiradora" | "neutra";
  cut_ranges?: { start: string; end: string }[];
  reference_url?: string;
};

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { data?: undefined } : { data: T }))
  | { ok: false; error: string; field?: string };
