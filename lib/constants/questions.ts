import { DEFAULT_EDIT_SETTINGS, type EditSettingKey, type EditSettings } from "@/lib/constants/domain";

/**
 * Perguntas do passo "Detalhes" do Novo vídeo. Cada resposta é Sim, Não ou
 * Outro (com texto curto). As respostas viram as configurações de edição que o
 * motor já entende (`settings`) e seguem também no briefing (`options.answers`).
 */
export type Answer = "sim" | "nao" | "outro";

export const DETAIL_QUESTIONS = [
  { id: "captions", label: "Legendas", hint: "Palavra a palavra", settings: ["captions"] },
  { id: "pauses", label: "Cortar pausas e vícios", hint: "Silêncios, “é…”, “né”", settings: ["cut_silences", "remove_mistakes"] },
  { id: "lower_third", label: "Nome e OAB na tela", hint: "Identificação no início", settings: ["lower_third"] },
  { id: "effects", label: "Efeitos e zooms", hint: "Zooms, B-roll e transições", settings: ["auto_zoom", "broll", "graphics", "transitions"] },
  { id: "music", label: "Trilha sonora", hint: "Baixa, sem cobrir a voz", settings: ["background_music"] },
  { id: "hook", label: "Título de impacto", hint: "Nos 3 primeiros segundos", settings: [] },
  { id: "terms", label: "Termos jurídicos em destaque", hint: "Leis e artigos citados", settings: ["highlight_keywords"] },
  { id: "vignette", label: "Vinheta", hint: "Abertura e encerramento", settings: [] },
  { id: "cta", label: "Chamada final", hint: "Seguir, site ou WhatsApp", settings: ["cta"] },
  { id: "brand", label: "Logo e cores da marca", hint: "Da sua página Marca", settings: ["logo"] },
  { id: "oab", label: "Revisão OAB", hint: "Avisamos falas sensíveis", settings: ["compliance_review"] },
] as const satisfies readonly { id: string; label: string; hint: string; settings: readonly EditSettingKey[] }[];

export type QuestionId = (typeof DETAIL_QUESTIONS)[number]["id"];
export type Answers = Partial<Record<QuestionId, Answer>>;

const S = "sim" as const;
const N = "nao" as const;

/** Respostas recomendadas por estilo de edição ("Usar recomendado para este estilo"). */
export const RECOMMENDED: Record<string, Record<QuestionId, Answer>> = {
  institucional: { captions: S, pauses: S, lower_third: S, effects: N, music: N, hook: N, terms: S, vignette: S, cta: N, brand: S, oab: S },
  dinamico: { captions: S, pauses: S, lower_third: S, effects: S, music: S, hook: S, terms: S, vignette: N, cta: S, brand: S, oab: S },
  cinematografico: { captions: S, pauses: S, lower_third: S, effects: S, music: S, hook: N, terms: N, vignette: S, cta: N, brand: S, oab: S },
  performance: { captions: S, pauses: S, lower_third: N, effects: S, music: S, hook: S, terms: S, vignette: N, cta: S, brand: S, oab: S },
  descontraido: { captions: S, pauses: S, lower_third: S, effects: S, music: S, hook: N, terms: S, vignette: N, cta: N, brand: N, oab: S },
};

export function recommendedFor(style: string | null | undefined): Record<QuestionId, Answer> {
  return { ...(RECOMMENDED[style ?? ""] ?? RECOMMENDED.institucional) };
}

/** Converte as respostas nas configurações do motor (qualidade de imagem e áudio sempre ligadas). */
export function settingsFromAnswers(answers: Answers): EditSettings {
  const s: EditSettings = { ...DEFAULT_EDIT_SETTINGS, improve_lighting: true, reduce_noise: true, enhance_voice: true };
  for (const q of DETAIL_QUESTIONS) {
    const a = answers[q.id];
    if (!a) continue;
    for (const key of q.settings) s[key] = a !== "nao";
  }
  return s;
}

/** Respostas a partir de configurações antigas (rascunhos criados antes do novo fluxo). */
export function answersFromSettings(settings: Partial<EditSettings>): Answers {
  const out: Answers = {};
  for (const q of DETAIL_QUESTIONS) {
    if (!q.settings.length) continue;
    out[q.id] = q.settings.some((k) => settings[k]) ? "sim" : "nao";
  }
  return out;
}

/** Objetivo implícito pelo estilo, quando o vídeo não veio de um modelo. */
export function objectiveForStyle(style: string | null | undefined) {
  switch (style) {
    case "performance":
      return "trafego_pago";
    case "institucional":
      return "educacional";
    case "cinematografico":
      return "institucional";
    default:
      return "conteudo_organico";
  }
}

/** Plataformas cobertas por cada formato escolhido. */
export function platformsForRatios(ratios: readonly string[]) {
  const map: Record<string, string[]> = {
    "9:16": ["instagram_reels", "tiktok", "youtube_shorts", "stories"],
    "1:1": ["instagram_feed", "linkedin"],
    "4:5": ["instagram_feed", "meta_ads"],
    "16:9": ["youtube", "linkedin"],
  };
  return Array.from(new Set(ratios.flatMap((r) => map[r] ?? [])));
}
