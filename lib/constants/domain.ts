/**
 * Catálogos do domínio. Valores (`value`) são persistidos no banco —
 * nunca altere um `value` existente; adicione novos.
 */

export const LEGAL_AREAS = [
  { value: "previdenciario", label: "Previdenciário" },
  { value: "consumidor", label: "Consumidor" },
  { value: "fraudes_bancarias", label: "Fraudes Bancárias" },
  { value: "trabalhista", label: "Trabalhista" },
  { value: "criminal", label: "Criminal" },
  { value: "familia", label: "Família e Sucessões" },
  { value: "civel", label: "Cível" },
  { value: "empresarial", label: "Empresarial" },
  { value: "tributario", label: "Tributário" },
  { value: "imobiliario", label: "Imobiliário" },
  { value: "institucional", label: "Institucional" },
  { value: "outro", label: "Outro" },
] as const;
export type LegalArea = (typeof LEGAL_AREAS)[number]["value"];

export const OBJECTIVES = [
  {
    value: "trafego_pago",
    label: "Tráfego Pago",
    description: "Anúncios no Meta Ads e YouTube, com gancho forte e CTA claro.",
  },
  {
    value: "conteudo_organico",
    label: "Conteúdo Orgânico",
    description: "Reels, TikTok e Shorts para alcance e relacionamento.",
  },
  {
    value: "institucional",
    label: "Vídeo Institucional",
    description: "Apresentação do escritório, equipe e valores.",
  },
  {
    value: "educacional",
    label: "Conteúdo Educacional",
    description: "Explicar direitos e procedimentos com clareza.",
  },
  {
    value: "autoridade",
    label: "Autoridade Jurídica",
    description: "Posicionamento, análise de temas e opinião técnica.",
  },
] as const;
export type Objective = (typeof OBJECTIVES)[number]["value"];

/** Objetivos perguntados no onboarding (perfil). */
export const PROFILE_GOALS = [
  { value: "trafego_pago", label: "Tráfego pago" },
  { value: "conteudo_organico", label: "Conteúdo orgânico" },
  { value: "autoridade", label: "Autoridade" },
  { value: "educacional", label: "Educação jurídica" },
  { value: "institucional", label: "Institucional" },
] as const;

export const EDITING_STYLES = [
  {
    value: "institucional",
    index: "01",
    label: "Jurídico Institucional",
    tagline: "Sóbrio, preciso, atemporal.",
    description: "Visual extremamente sério, poucos movimentos, legendas elegantes e cortes discretos.",
    traits: ["Poucos movimentos", "Legendas elegantes", "Cortes discretos"],
    idealFor: "Autoridade e comunicação institucional",
    pace: 1,
  },
  {
    value: "dinamico",
    index: "02",
    label: "Profissional Dinâmico",
    tagline: "Ritmo de rede, linguagem de escritório.",
    description: "Ritmo maior, zooms leves, palavras destacadas e B-roll contextual.",
    traits: ["Zooms leves", "Palavras destacadas", "B-roll contextual"],
    idealFor: "Instagram, Reels e conteúdo orgânico",
    pace: 3,
  },
  {
    value: "cinematografico",
    index: "03",
    label: "Premium Cinematográfico",
    tagline: "Luz, cor e silêncio a seu favor.",
    description: "Correção visual sofisticada, movimentos suaves, textos minimalistas e transições discretas.",
    traits: ["Color grading", "Movimentos suaves", "Tipografia minimalista"],
    idealFor: "Posicionamento premium e marca pessoal",
    pace: 2,
  },
  {
    value: "performance",
    index: "04",
    label: "Performance / Meta Ads",
    tagline: "Os primeiros segundos decidem.",
    description: "Gancho visual, legendas fortes, cortes rápidos, elementos contextualizados e CTA destacado.",
    traits: ["Gancho nos 3s iniciais", "Legendas fortes", "CTA destacado"],
    idealFor: "Campanhas de tráfego pago",
    pace: 4,
  },
  {
    value: "descontraido",
    index: "05",
    label: "Descontraído Profissional",
    tagline: "Humano e leve, sem perder o rigor.",
    description: "Mais humano, leve e dinâmico, mantendo a linguagem jurídica.",
    traits: ["Tom próximo", "Ritmo leve", "Elementos sociais"],
    idealFor: "Bastidores, perguntas e respostas e conteúdo social",
    pace: 3,
  },
] as const;
export type EditingStyle = (typeof EDITING_STYLES)[number]["value"];

export const ASPECT_RATIOS = [
  { value: "9:16", label: "Vertical", ratio: 9 / 16 },
  { value: "1:1", label: "Quadrado", ratio: 1 },
  { value: "4:5", label: "Retrato", ratio: 4 / 5 },
  { value: "16:9", label: "Horizontal", ratio: 16 / 9 },
] as const;
export type AspectRatio = (typeof ASPECT_RATIOS)[number]["value"];

export const PLATFORMS = [
  { value: "instagram_reels", label: "Instagram Reels", ratios: ["9:16"], icon: "instagram" },
  { value: "tiktok", label: "TikTok", ratios: ["9:16"], icon: "music" },
  { value: "youtube_shorts", label: "YouTube Shorts", ratios: ["9:16"], icon: "youtube" },
  { value: "stories", label: "Stories", ratios: ["9:16"], icon: "circle-dashed" },
  { value: "instagram_feed", label: "Instagram Feed", ratios: ["1:1", "4:5"], icon: "square" },
  { value: "meta_ads", label: "Meta Ads", ratios: ["9:16", "1:1", "4:5"], icon: "megaphone" },
  { value: "youtube", label: "YouTube", ratios: ["16:9"], icon: "monitor-play" },
  { value: "linkedin", label: "LinkedIn", ratios: ["16:9", "1:1"], icon: "linkedin" },
] as const;
export type Platform = (typeof PLATFORMS)[number]["value"];

/** Proporções de saída padrão derivadas das plataformas escolhidas. */
export function ratiosForPlatforms(platforms: readonly string[]): AspectRatio[] {
  const set = new Set<AspectRatio>();
  for (const p of platforms) {
    const def = PLATFORMS.find((x) => x.value === p);
    if (def) set.add(def.ratios[0] as AspectRatio);
  }
  return ASPECT_RATIOS.map((r) => r.value).filter((v) => set.has(v));
}

export const EDIT_SETTINGS = [
  { key: "captions", label: "Legendas automáticas", description: "Legendas sincronizadas palavra a palavra.", default: true, group: "Texto" },
  { key: "highlight_keywords", label: "Destaque de palavras importantes", description: "Termos jurídicos e palavras-chave em evidência.", default: true, group: "Texto" },
  { key: "broll", label: "B-roll contextual", description: "Imagens de apoio coerentes com o tema.", default: true, group: "Visual" },
  { key: "auto_zoom", label: "Zooms automáticos", description: "Aproximações suaves nos momentos de ênfase.", default: true, group: "Visual" },
  { key: "cut_silences", label: "Cortar silêncios", description: "Remove pausas longas e respirações.", default: true, group: "Ritmo" },
  { key: "remove_mistakes", label: "Remover erros de gravação", description: "Elimina repetições, tropeços e vícios de linguagem.", default: true, group: "Ritmo" },
  { key: "improve_lighting", label: "Melhorar iluminação", description: "Correção de exposição, contraste e temperatura.", default: true, group: "Imagem" },
  { key: "reduce_noise", label: "Reduzir eco e ruído", description: "Limpeza de ambiente e reverberação.", default: true, group: "Áudio" },
  { key: "enhance_voice", label: "Realçar voz", description: "Equalização e presença vocal.", default: true, group: "Áudio" },
  { key: "graphics", label: "Elementos gráficos", description: "Ícones, setas e destaques visuais discretos.", default: true, group: "Visual" },
  { key: "transitions", label: "Transições", description: "Transições discretas entre trechos.", default: true, group: "Visual" },
  { key: "cta", label: "CTA final", description: "Chamada para ação no encerramento.", default: false, group: "Marca" },
  { key: "logo", label: "Logotipo do escritório", description: "Aplica sua marca salva em Minha Marca.", default: false, group: "Marca" },
  { key: "background_music", label: "Trilha sonora", description: "Trilha discreta, sem competir com a voz.", default: false, group: "Áudio" },
  { key: "lower_third", label: "Nome e OAB na tela", description: "Identificação profissional em lettering.", default: true, group: "Marca" },
  { key: "compliance_review", label: "Revisão de conformidade OAB", description: "Sinaliza falas com promessa de resultado ou captação indevida (Provimento 205/2021).", default: true, group: "Conformidade" },
] as const;
export type EditSettingKey = (typeof EDIT_SETTINGS)[number]["key"];
export type EditSettings = Record<EditSettingKey, boolean>;

export const DEFAULT_EDIT_SETTINGS = Object.fromEntries(EDIT_SETTINGS.map((s) => [s.key, s.default])) as EditSettings;

export const CTA_TYPES = [
  { value: "seguir", label: "Seguir o perfil" },
  { value: "site", label: "Conhecer o site do escritório" },
  { value: "whatsapp", label: "Contato pelo WhatsApp" },
  { value: "personalizado", label: "Personalizado" },
] as const;

export const CAPTION_STYLES = [
  { value: "discreta", label: "Discreta" },
  { value: "palavra", label: "Palavra por palavra" },
  { value: "caixa_alta", label: "Caixa alta" },
] as const;

export const TARGET_DURATIONS = [
  { value: "completo", label: "Manter completo" },
  { value: "60s", label: "Até 60s" },
  { value: "90s", label: "Até 90s" },
  { value: "3min", label: "Até 3 min" },
  { value: "cortes", label: "Vários cortes curtos" },
] as const;

/** Etapas do pipeline de processamento (render_jobs.current_step). */
export const PIPELINE_STEPS = [
  { value: "upload_completed", label: "Upload concluído", description: "Arquivo recebido com segurança." },
  { value: "analyzing_audio", label: "Analisando áudio", description: "Níveis, ruído e trechos de fala." },
  { value: "transcribing", label: "Transcrevendo", description: "Fala convertida em texto, palavra a palavra." },
  { value: "analyzing_content", label: "Analisando conteúdo", description: "Tema, termos jurídicos e momentos-chave." },
  { value: "planning", label: "Criando plano de edição", description: "Cortes, zooms, destaques e B-roll." },
  { value: "editing", label: "Editando vídeo", description: "Montagem, ritmo e correções." },
  { value: "captioning", label: "Criando legendas", description: "Legendas sincronizadas e destaques." },
  { value: "adding_elements", label: "Adicionando elementos", description: "Grafismos, marca e chamadas." },
  { value: "rendering", label: "Renderizando", description: "Exportação em alta qualidade." },
  { value: "completed", label: "Finalizado", description: "Seu vídeo está pronto." },
] as const;
export type PipelineStep = (typeof PIPELINE_STEPS)[number]["value"];

export function stepIndex(step: string | null | undefined) {
  const i = PIPELINE_STEPS.findIndex((s) => s.value === step);
  return i < 0 ? 0 : i;
}

/** Progresso percentual sugerido para cada etapa (usado quando o provedor não informa). */
export function progressForStep(step: string | null | undefined) {
  const i = stepIndex(step);
  return Math.round((i / (PIPELINE_STEPS.length - 1)) * 100);
}

export const PROJECT_STATUSES = {
  draft: { label: "Rascunho", tone: "default" },
  queued: { label: "Na fila", tone: "info" },
  processing: { label: "Processando", tone: "gold" },
  ready: { label: "Pronto", tone: "success" },
  revision_requested: { label: "Ajuste solicitado", tone: "warning" },
  completed: { label: "Concluído", tone: "success" },
  failed: { label: "Erro", tone: "danger" },
} as const;
export type ProjectStatus = keyof typeof PROJECT_STATUSES;

export const LIBRARY_FILTERS = [
  { value: "all", label: "Todos" },
  { value: "done", label: "Finalizados", statuses: ["ready", "completed"] },
  { value: "processing", label: "Processando", statuses: ["queued", "processing", "revision_requested"] },
  { value: "draft", label: "Rascunhos", statuses: ["draft"] },
  { value: "failed", label: "Erro", statuses: ["failed"] },
] as const;

export const BRAZIL_UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

export const ACCEPTED_VIDEO_TYPES = {
  "video/mp4": [".mp4"],
  "video/quicktime": [".mov"],
  "video/webm": [".webm"],
} as const;
export const ACCEPTED_VIDEO_EXT = [".mp4", ".mov", ".webm"];

export const BUCKETS = {
  originals: "original-videos",
  renders: "rendered-videos",
  brand: "brand-assets",
  thumbnails: "thumbnails",
} as const;

export function labelOf<T extends readonly { value: string; label: string }[]>(list: T, value: string | null | undefined) {
  return list.find((i) => i.value === value)?.label ?? "—";
}
