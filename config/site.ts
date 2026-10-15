/**
 * Identidade da marca e dados institucionais.
 * Troque aqui nome, slogan, contato e redes — o restante do produto lê deste arquivo.
 */
export const siteConfig = {
  name: "TRIBUNA",
  shortName: "Tribuna",
  tagline: "Inteligência de edição para a advocacia",
  description:
    "Transforme vídeos jurídicos brutos em conteúdo profissional com IA. Envie seu vídeo, escolha estilo e formato e receba pronto para Reels, TikTok, YouTube, LinkedIn e Meta Ads.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  locale: "pt_BR",
  contact: {
    email: "contato@tribuna.app",
    support: "suporte@tribuna.app",
    whatsapp: "",
  },
  social: {
    instagram: "https://instagram.com/",
    linkedin: "https://linkedin.com/",
    youtube: "https://youtube.com/",
  },
  legal: {
    companyName: "TRIBUNA Tecnologia Ltda.",
    cnpj: "",
    dpoEmail: "privacidade@tribuna.app",
  },
  /** Números exibidos na landing. Use apenas dados verdadeiros e verificáveis. */
  highlights: [
    { value: 4, suffix: "", label: "proporções por vídeo", caption: "9:16 · 1:1 · 4:5 · 16:9" },
    { value: 5, suffix: "", label: "estilos de edição", caption: "do institucional ao Meta Ads" },
    { value: 10, suffix: "", label: "áreas do Direito", caption: "edição contextualizada" },
    { value: 100, suffix: "%", label: "em português", caption: "legendas e interface" },
  ],
} as const;

export type SiteConfig = typeof siteConfig;
