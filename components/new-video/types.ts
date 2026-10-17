import type { DraftPatch } from "@/lib/actions/projects";
import { PLATFORMS } from "@/lib/constants/domain";
import { objectiveForStyle, platformsForRatios, settingsFromAnswers, type Answers } from "@/lib/constants/questions";
import type { ProjectOptions } from "@/types/domain";

export type Draft = {
  id: string | null;
  name: string;
  folder_id: string | null;
  legal_area: string | null;
  editing_style: string | null;
  aspect_ratios: string[];
  duration: NonNullable<ProjectOptions["target_duration"]>;
  answers: Answers;
  answers_text: Record<string, string>;
  caption_style: NonNullable<ProjectOptions["caption_style"]>;
  cta_type: ProjectOptions["cta_type"];
  cta_text: string;
  music_tone: ProjectOptions["music_tone"];
  hook_text: string;
  cut_ranges: { start: string; end: string }[];
  reference_url: string;
  instructions: string;
  template: string | null;
  objective: string | null;
  rights_confirmed: boolean;
  step: number;
};

export type DraftVideo = {
  fileName: string;
  sizeBytes: number | null;
  durationSec: number | null;
  width: number | null;
  height: number | null;
  previewUrl: string | null;
  thumbnailUrl: string | null;
};

const KNOWN_PLATFORMS = new Set<string>(PLATFORMS.map((p) => p.value));

/** Rascunho da tela → patch aceito por saveDraftAction. */
export function toPatch(d: Draft, step?: number): DraftPatch {
  const answersText = Object.fromEntries(Object.entries(d.answers_text).filter(([k, v]) => d.answers[k as keyof Answers] === "outro" && v.trim()));
  return {
    name: d.name.trim() || "Novo vídeo",
    objective: (d.objective ?? objectiveForStyle(d.editing_style)) as DraftPatch["objective"],
    legal_area: d.legal_area as DraftPatch["legal_area"],
    editing_style: d.editing_style as DraftPatch["editing_style"],
    platforms: platformsForRatios(d.aspect_ratios).filter((p) => KNOWN_PLATFORMS.has(p)) as DraftPatch["platforms"],
    aspect_ratios: d.aspect_ratios as DraftPatch["aspect_ratios"],
    settings: settingsFromAnswers(d.answers),
    options: {
      target_duration: d.duration,
      caption_style: d.caption_style,
      cta_type: d.cta_type,
      cta_text: d.cta_text || undefined,
      music_tone: d.music_tone,
      hook_text: d.hook_text || undefined,
      cut_ranges: d.cut_ranges.filter((r) => r.start || r.end),
      reference_url: d.reference_url || undefined,
      answers: d.answers,
      answers_text: answersText,
      template: d.template ?? undefined,
    },
    instructions: d.instructions.trim() || null,
    rights_confirmed: d.rights_confirmed,
    folder_id: d.folder_id,
    ...(step ? { wizard_step: step } : {}),
  };
}
