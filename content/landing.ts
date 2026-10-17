/**
 * Textos curtos da landing. Regras: H1 até 7 palavras, títulos até 5,
 * subtítulos até 12, cards com título + até 8 palavras.
 * Trechos entre *asteriscos* viram o acento serifado com degradê.
 */
export const landing = {
  nav: [
    { tab: "exemplos", label: "Exemplos" },
    { tab: "como-funciona", label: "Como funciona" },
    { tab: "planos", label: "Planos" },
  ],
  hero: {
    chip: "Edição de vídeo com IA para advogados",
    title: "Vídeos jurídicos *editados* por IA.",
    subtitle: "Envie a gravação. Receba pronta para Reels, TikTok, YouTube e Ads.",
    primary: "Criar meu primeiro vídeo",
    secondary: "Ver exemplos",
    seals: [
      { icon: "landmark", label: "OAB 205/2021" },
      { icon: "lock", label: "Sigilo e LGPD" },
      { icon: "ratio", label: "4 formatos" },
    ],
    chips: ["9:16", "Legenda", "Corte", "OAB ✓"],
  },
  explore: {
    eyebrow: "Explorar",
    tabs: [
      { id: "exemplos", label: "Exemplos", title: "Antes e *depois*.", accent: "cyan" },
      { id: "como-funciona", label: "Como funciona", title: "Três *passos*.", accent: "cyan" },
      { id: "estilos", label: "Estilos", title: "Um tom para cada *vídeo*.", accent: "violet" },
      { id: "formatos", label: "Formatos", title: "Um vídeo. Todas as *telas*.", accent: "blue" },
      { id: "planos", label: "Planos", title: "Sem *fidelidade*.", accent: "gold" },
      { id: "duvidas", label: "Dúvidas", title: "Dúvidas *rápidas*.", accent: "gold" },
    ],
  },
  steps: [
    { icon: "upload", title: "Envie o vídeo", text: "Do celular ou da câmera." },
    { icon: "palette", title: "Escolha estilo e formato", text: "Poucas escolhas, bons padrões." },
    { icon: "download", title: "Baixe pronto", text: "MP4 em cada formato." },
  ],
  /** Nome curto de cada estilo na landing. */
  styleNames: {
    institucional: "Institucional",
    dinamico: "Dinâmico",
    cinematografico: "Cinematográfico",
    performance: "Meta Ads",
    descontraido: "Descontraído",
  } as Record<string, string>,
  /** Descrição curta (até 8 palavras) por estilo de edição. */
  styles: {
    institucional: "Sóbrio, poucos movimentos, legendas elegantes.",
    dinamico: "Ritmo de rede com zooms e destaques.",
    cinematografico: "Cor sofisticada e movimentos suaves.",
    performance: "Gancho forte, cortes rápidos, CTA claro.",
    descontraido: "Leve e humano, sem perder o rigor.",
  } as Record<string, string>,
  formats: [
    { ratio: "9:16", platforms: ["tiktok", "instagram", "youtube"], label: "Reels, TikTok, Shorts" },
    { ratio: "1:1", platforms: ["instagram", "linkedin"], label: "Feed e LinkedIn" },
    { ratio: "4:5", platforms: ["instagram", "meta"], label: "Feed e Meta Ads" },
    { ratio: "16:9", platforms: ["youtube", "linkedin"], label: "YouTube e LinkedIn" },
  ],
  plans: {
    empty: "Planos em breve",
    emptyHint: "Deixe seu e-mail e avisamos.",
    soon: "Valor em breve",
    featured: "Recomendado",
    trial: "1 vídeo de avaliação ao criar a conta.",
  },
  cta: {
    title: "Sua próxima gravação vira *conteúdo*.",
    button: "Começar agora",
  },
  cookies: {
    text: "Usamos cookies essenciais.",
    accept: "Ok",
    more: "Saiba mais",
  },
} as const;

export type ExploreTabId = (typeof landing.explore.tabs)[number]["id"];
