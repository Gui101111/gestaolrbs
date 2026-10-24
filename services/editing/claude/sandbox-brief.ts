import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { BUCKETS } from "@/lib/constants/domain";
import type { EditBrief } from "../types";
import { outputPaths, type OutputPaths } from "./paths";

type Admin = SupabaseClient<Database>;

export const ASSETS_BUCKET = "editing-assets";
/** As URLs de download valem 2 h: a sandbox baixa tudo logo no início. */
const DOWNLOAD_TTL = 60 * 60 * 2;

const TOM_POR_ESTILO: Record<string, string> = {
  institucional: "sobria",
  cinematografico: "inspiradora",
  dinamico: "neutra",
  performance: "neutra",
  descontraido: "neutra",
};

/** Brief que a sandbox recebe (o mesmo formato que sandbox/tribuna_editor.py lê). */
export type SandboxBrief = {
  versao: number;
  tipo: "novo" | "ajuste";
  projeto: {
    id: string;
    nome: string;
    estilo: string | null;
    area: string | null;
    objetivo: string | null;
    formatos: string[];
    plataformas: string[];
    respostas: Record<string, string>;
    respostas_texto: Record<string, string>;
    observacoes: string | null;
    revisao_oab: boolean;
    modelo: string | null;
  };
  advogado: { nome: string | null; oab: string | null; escritorio: string | null };
  marca: {
    nome_profissional: string | null;
    oab: string | null;
    escritorio: string | null;
    fonte: string | null;
    cores: { principal: string; fundo: string; texto: string };
    site: string | null;
    instagram: string | null;
    whatsapp: string | null;
  } | null;
  ajustes: { comentario: string; tempo_s: number | null }[];
  urls: {
    original: string;
    logo: string | null;
    fontes: string[];
    musica: string | null;
    plano_anterior: string | null;
    transcricao_anterior: string | null;
    upload: Record<string, { video: string; miniatura: string }> & { report?: string; plano?: string; transcricao?: string };
  };
};

async function signedDownload(admin: Admin, bucket: string, path: string | null | undefined) {
  if (!path) return null;
  const { data } = await admin.storage.from(bucket).createSignedUrl(path, DOWNLOAD_TTL);
  return data?.signedUrl ?? null;
}

async function signedUpload(admin: Admin, path: string) {
  const { data, error } = await admin.storage.from(BUCKETS.renders).createSignedUploadUrl(path, { upsert: true });
  if (error || !data) throw new Error("signed_upload_failed");
  return data.signedUrl;
}

async function exists(admin: Admin, bucket: string, path: string) {
  const slash = path.lastIndexOf("/");
  const { data } = await admin.storage.from(bucket).list(path.slice(0, slash), { search: path.slice(slash + 1), limit: 1 });
  return Boolean(data?.some((f) => f.name === path.slice(slash + 1)));
}

/** Escolhe uma trilha do tom pedido (estável por projeto). */
async function pickMusic(admin: Admin, tone: string, seed: string) {
  const { data } = await admin.storage.from(ASSETS_BUCKET).list(`music/${tone}`, { limit: 50 });
  const files = (data ?? []).filter((f) => /\.(m4a|mp3|aac|wav)$/i.test(f.name)).sort((a, b) => a.name.localeCompare(b.name));
  if (!files.length) return null;
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return `music/${tone}/${files[h % files.length].name}`;
}

/** URLs de envio (válidas por 2 h, regra do Supabase) para todos os arquivos da versão. */
export async function uploadUrls(admin: Admin, paths: OutputPaths) {
  const upload: SandboxBrief["urls"]["upload"] = {};
  for (const [ratio, p] of Object.entries(paths.formats)) {
    upload[ratio] = { video: await signedUpload(admin, p.video), miniatura: await signedUpload(admin, p.thumb) };
  }
  upload.report = await signedUpload(admin, paths.report);
  upload.plano = await signedUpload(admin, paths.plano);
  upload.transcricao = await signedUpload(admin, paths.transcricao);
  return upload;
}

/**
 * Converte o briefing da plataforma no brief da sandbox, com URLs assinadas de
 * download (original, logo, fonte, trilha, plano anterior) e de envio (v<n>).
 */
export async function buildSandboxBrief(
  admin: Admin,
  input: { brief: EditBrief; userId: string; version: number; kind: "novo" | "ajuste"; previousVersion?: number | null },
): Promise<{ sandbox: SandboxBrief; paths: OutputPaths }> {
  const { brief, userId, version } = input;
  const p = brief.project;
  const original = brief.sources.find((s) => s.kind === "original") ?? brief.sources[0];
  if (!original) throw new Error("missing_source");
  const originalUrl = await signedDownload(admin, original.bucket, original.path);
  if (!originalUrl) throw new Error("missing_source");

  const paths = outputPaths(userId, p.id, version, p.aspectRatios);
  const options = (p.options ?? {}) as { answers?: Record<string, string>; answers_text?: Record<string, string>; template?: string };
  const answers = options.answers ?? {};

  const { data: kit } = await admin.from("brand_kits").select("logo_path, font").eq("user_id", userId).maybeSingle();
  const useBrand = (answers.brand ?? (p.settings.logo ? "sim" : "nao")) !== "nao";
  const font = brief.brand?.font ?? null;
  const fontSlug = font?.replace(/\s+/g, "");
  const fonts = fontSlug
    ? (await Promise.all([`fonts/${fontSlug}-Regular.ttf`, `fonts/${fontSlug}-Bold.ttf`].map((f) => signedDownload(admin, ASSETS_BUCKET, f)))).filter(
        (u): u is string => Boolean(u),
      )
    : [];
  const wantsMusic = (answers.music ?? (p.settings.background_music ? "sim" : "nao")) !== "nao";
  const musicPath = wantsMusic ? await pickMusic(admin, TOM_POR_ESTILO[p.editingStyle ?? ""] ?? "neutra", p.id) : null;

  const prev = input.previousVersion ? outputPaths(userId, p.id, input.previousVersion, p.aspectRatios) : null;
  const prevPlan = prev && (await exists(admin, BUCKETS.renders, prev.plano)) ? await signedDownload(admin, BUCKETS.renders, prev.plano) : null;
  const prevTranscript = prev && (await exists(admin, BUCKETS.renders, prev.transcricao)) ? await signedDownload(admin, BUCKETS.renders, prev.transcricao) : null;

  const sandbox: SandboxBrief = {
    versao: version,
    tipo: input.kind,
    projeto: {
      id: p.id,
      nome: p.name,
      estilo: p.editingStyle,
      area: p.legalArea,
      objetivo: p.objective,
      formatos: p.aspectRatios,
      plataformas: p.platforms,
      respostas: answers,
      respostas_texto: options.answers_text ?? {},
      observacoes: p.instructions,
      revisao_oab: brief.compliance.oabProvimento205,
      modelo: options.template ?? null,
    },
    advogado: { nome: brief.lawyer.name, oab: brief.lawyer.oab, escritorio: brief.lawyer.officeName },
    marca: brief.brand
      ? {
          nome_profissional: brief.brand.professionalName,
          oab: brief.brand.oabDisplay ?? brief.lawyer.oab,
          escritorio: brief.brand.officeName ?? brief.lawyer.officeName,
          fonte: font,
          cores: { principal: brief.brand.colors.primary, fundo: brief.brand.colors.secondary, texto: brief.brand.colors.accent },
          site: brief.brand.website,
          instagram: brief.brand.instagram,
          whatsapp: brief.brand.whatsapp,
        }
      : null,
    ajustes: p.revisionNotes.map((r) => ({ comentario: r.comment, tempo_s: r.timestampSec })),
    urls: {
      original: originalUrl,
      logo: useBrand ? await signedDownload(admin, BUCKETS.brand, kit?.logo_path) : null,
      fontes: fonts,
      musica: musicPath ? await signedDownload(admin, ASSETS_BUCKET, musicPath) : null,
      plano_anterior: prevPlan,
      transcricao_anterior: prevTranscript,
      upload: await uploadUrls(admin, paths),
    },
  };
  return { sandbox, paths };
}
