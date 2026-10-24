/**
 * Textos curtos da landing. Regras: H1 até 7 palavras, títulos até 5,
 * subtítulos até 12, cards com título + até 8 palavras.
 * Trechos entre *asteriscos* viram o acento serifado com degradê.
 */
export const landing = {
  hero: {
    chip: "Edição automática para advogados",
    title: "Envie o vídeo. A TRIBUNA *edita sozinha*.",
    subtitle: "Legendas certinhas, cortes de pausas e vícios, pronto para Reels e TikTok.",
    primary: "Criar conta grátis",
    secondary: "Entrar",
    app: "Abrir o app",
    seals: [
      { icon: "captions", label: "Legendas certinhas" },
      { icon: "scissors", label: "Sem pausas e vícios" },
      { icon: "lock", label: "Sigilo e LGPD" },
    ],
    chips: ["9:16", "Legenda", "Corte", "Pronto ✓"],
  },
  steps: {
    eyebrow: "Como funciona",
    title: "Três *passos*. Nenhuma pergunta.",
    items: [
      { icon: "upload", title: "Envie o vídeo", text: "Do celular ou do computador, do jeito que gravou." },
      { icon: "scissors", title: "A TRIBUNA corta e legenda", text: "Tira pausas e vícios e coloca legendas certinhas." },
      { icon: "download", title: "Baixe e publique", text: "Vertical, pronto para Reels e TikTok." },
    ],
  },
  /** Nome curto de cada estilo (editor rápido no navegador). */
  styleNames: {
    institucional: "Institucional",
    dinamico: "Dinâmico",
    cinematografico: "Cinematográfico",
    performance: "Meta Ads",
    descontraido: "Descontraído",
  } as Record<string, string>,
  /** Descrição curta (até 8 palavras) por estilo de edição (editor rápido no navegador). */
  styles: {
    institucional: "Trilha calma, cartões elegantes e transições suaves.",
    dinamico: "Zooms, ícones animados, trilha leve e efeitos.",
    cinematografico: "Cor de cinema, granulação e trilha épica.",
    performance: "Gancho forte, números grandes e batida.",
    descontraido: "Adesivos animados, trilha alegre, legenda que pula.",
  } as Record<string, string>,
  cta: {
    title: "Sua próxima gravação vira *conteúdo*.",
    button: "Criar conta grátis",
  },
  cookies: {
    text: "Usamos cookies essenciais.",
    accept: "Ok",
    more: "Saiba mais",
  },
} as const;
