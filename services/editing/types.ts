import { z } from "zod";
import type { RenderJob } from "@/types/domain";

/**
 * Contratos do motor de edição. Tudo que sai da plataforma para um processador
 * (humano, worker FFmpeg/Remotion, agente de IA) passa por estes tipos.
 *
 *   UPLOAD → TRANSCRIÇÃO → ANÁLISE SEMÂNTICA → PLANO DE EDIÇÃO → PROCESSAMENTO
 *          → RENDERIZAÇÃO → ARMAZENAMENTO → DOWNLOAD
 */

// ---------------------------------------------------------------------------
// Briefing padronizado (JSON enviado ao provedor)
// ---------------------------------------------------------------------------
export type EditBrief = {
  version: 1;
  job: { id: string; kind: string; callbackUrl: string };
  project: {
    id: string;
    name: string;
    objective: string | null;
    legalArea: string | null;
    editingStyle: string | null;
    platforms: string[];
    aspectRatios: string[];
    instructions: string | null;
    settings: Record<string, boolean>;
    options: Record<string, unknown>;
    revisionNotes: { comment: string; timestampSec: number | null }[];
  };
  sources: {
    kind: string;
    bucket: string;
    path: string;
    fileName: string;
    mimeType: string | null;
    durationSec: number | null;
    width: number | null;
    height: number | null;
    sizeBytes: number | null;
    /** URL assinada temporária para download pelo processador. */
    url: string | null;
  }[];
  lawyer: { name: string | null; oab: string | null; officeName: string | null };
  brand: {
    officeName: string | null;
    professionalName: string | null;
    oabDisplay: string | null;
    colors: { primary: string; secondary: string; accent: string };
    font: string | null;
    website: string | null;
    instagram: string | null;
    whatsapp: string | null;
    logoUrl: string | null;
  } | null;
  outputs: { aspectRatio: string; container: "mp4"; maxResolution: string; destination: { bucket: string; prefix: string } }[];
  compliance: { oabProvimento205: boolean; language: "pt-BR" };
};

// ---------------------------------------------------------------------------
// Transcrição
// ---------------------------------------------------------------------------
export type TranscriptWord = { text: string; start: number; end: number; confidence?: number };
export type TranscriptSegment = { start: number; end: number; text: string; words: TranscriptWord[] };
export type Transcript = { language: string; durationSec: number; text: string; segments: TranscriptSegment[] };

// ---------------------------------------------------------------------------
// Plano de edição (gerado pela análise semântica). Zod → saída estruturada do LLM.
// ---------------------------------------------------------------------------
export const EditPlanSchema = z.object({
  summary: z.string().describe("Resumo em uma frase do que o vídeo comunica."),
  hook: z.object({ text: z.string(), startSec: z.number(), endSec: z.number() }).nullable(),
  cuts: z.array(
    z.object({
      startSec: z.number(),
      endSec: z.number(),
      reason: z.enum(["silence", "mistake", "filler", "repetition", "instruction", "off_topic"]),
    }),
  ),
  zooms: z.array(z.object({ atSec: z.number(), durationSec: z.number(), scale: z.number(), reason: z.string() })),
  captions: z.object({
    mode: z.enum(["word", "phrase"]),
    style: z.enum(["discreta", "palavra", "caixa_alta"]),
    highlights: z.array(z.object({ term: z.string(), atSec: z.number(), kind: z.enum(["legal_term", "keyword", "law_reference", "number"]) })),
  }),
  broll: z.array(z.object({ atSec: z.number(), durationSec: z.number(), query: z.string(), description: z.string() })),
  graphics: z.array(
    z.object({ atSec: z.number(), durationSec: z.number(), kind: z.enum(["icon", "arrow", "lower_third", "title", "list", "law_card"]), content: z.string() }),
  ),
  transitions: z.array(z.object({ atSec: z.number(), kind: z.enum(["cut", "fade", "push", "zoom"]) })),
  cta: z.object({ atSec: z.number(), text: z.string(), kind: z.enum(["seguir", "site", "whatsapp", "personalizado"]) }).nullable(),
  audio: z.object({ denoise: z.boolean(), dereverb: z.boolean(), enhanceVoice: z.boolean(), musicTone: z.enum(["none", "sobria", "inspiradora", "neutra"]) }),
  color: z.object({ exposure: z.number(), contrast: z.number(), temperature: z.number() }),
  complianceFlags: z.array(z.object({ atSec: z.number(), quote: z.string(), reason: z.string() })),
});
export type EditPlan = z.infer<typeof EditPlanSchema>;

// ---------------------------------------------------------------------------
// Provedores (interfaces desacopladas)
// ---------------------------------------------------------------------------
export type DispatchResult = { externalId?: string | null; status?: RenderJob["status"]; message?: string };

/** Processador de ponta a ponta de um job de edição. */
export interface VideoEditingProvider {
  readonly name: string;
  dispatch(job: RenderJob, brief: EditBrief): Promise<DispatchResult>;
  cancel?(job: RenderJob): Promise<void>;
}

/** Fala → texto com tempo por palavra (Whisper, AssemblyAI, Deepgram...). */
export interface TranscriptionProvider {
  readonly name: string;
  transcribe(input: { url: string; language?: string }): Promise<Transcript>;
}

/** Transcrição + briefing → plano de edição (Claude ou outro LLM). */
export interface ContentAnalysisProvider {
  readonly name: string;
  plan(input: { transcript: Transcript; brief: EditBrief }): Promise<EditPlan>;
}

export type RenderOutput = { aspectRatio: string; path: string; width: number; height: number; durationSec: number; sizeBytes: number };

/** Plano + mídia → arquivos finais (FFmpeg, Remotion, serviço de nuvem). */
export interface RenderProvider {
  readonly name: string;
  render(input: { brief: EditBrief; plan: EditPlan; transcript: Transcript }): Promise<RenderOutput[]>;
}

// ---------------------------------------------------------------------------
// Callback de processadores externos
// ---------------------------------------------------------------------------
export const JobCallbackSchema = z.object({
  jobId: z.string().uuid(),
  status: z.enum(["running", "succeeded", "failed", "canceled"]).optional(),
  step: z
    .enum(["upload_completed", "analyzing_audio", "transcribing", "analyzing_content", "planning", "editing", "captioning", "adding_elements", "rendering", "completed"])
    .optional(),
  progress: z.number().int().min(0).max(100).optional(),
  externalId: z.string().max(200).optional(),
  error: z.object({ code: z.string().max(80), message: z.string().max(500) }).optional(),
  editPlan: z.unknown().optional(),
  outputs: z
    .array(
      z.object({
        aspectRatio: z.enum(["9:16", "1:1", "4:5", "16:9"]),
        bucket: z.string().default("rendered-videos"),
        path: z.string().min(3),
        fileName: z.string().optional(),
        width: z.number().int().optional(),
        height: z.number().int().optional(),
        durationSec: z.number().optional(),
        sizeBytes: z.number().int().optional(),
        thumbnailPath: z.string().optional(),
      }),
    )
    .optional(),
});
export type JobCallback = z.infer<typeof JobCallbackSchema>;
