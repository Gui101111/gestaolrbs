/**
 * Identidade da marca e dados institucionais.
 * Troque aqui nome, slogan, contato e redes — o restante do produto lê deste arquivo.
 */
export const siteConfig = {
  name: "TRIBUNA",
  shortName: "Tribuna",
  tagline: "Envie o vídeo. A TRIBUNA edita sozinha.",
  description:
    "Edição automática de vídeos para advogados: legendas certinhas e cortes de pausas e vícios, pronto para Reels e TikTok. Sem perguntas: envie o vídeo e baixe pronto.",
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
} as const;

export type SiteConfig = typeof siteConfig;
