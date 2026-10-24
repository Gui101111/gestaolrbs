/**
 * Conteúdo de "Como fazer" (app) e das Dúvidas (landing e app).
 * `video` aceita um MP4/GIF em /public/media/como-fazer/; sem ele, o modal
 * mostra os passos ilustrados.
 */
export type HowToArticle = {
  id: string;
  icon: "smartphone" | "upload" | "ratio" | "landmark" | "message";
  title: string;
  /** Até 12 palavras. */
  summary: string;
  steps: { icon: string; title: string; text: string }[];
  video?: string;
};

export const comoFazer: HowToArticle[] = [
  {
    id: "gravar-no-celular",
    icon: "smartphone",
    title: "Como gravar no celular",
    summary: "Luz de frente, celular na altura dos olhos, ambiente silencioso.",
    steps: [
      { icon: "sun", title: "Luz", text: "Janela ou luminária de frente, nunca atrás de você." },
      { icon: "scan-face", title: "Enquadramento", text: "Olhos no terço superior, câmera traseira, 4K se puder." },
      { icon: "mic", title: "Áudio", text: "Sala fechada, sem eco; microfone de lapela ajuda muito." },
    ],
  },
  {
    id: "enviar-e-escolher",
    icon: "upload",
    title: "Enviar e escolher o estilo",
    summary: "Arraste o arquivo, escolha estilo, formatos e envie.",
    steps: [
      { icon: "upload", title: "Envie", text: "MP4, MOV ou WEBM. O envio continua se a conexão cair." },
      { icon: "palette", title: "Estilo", text: "Cada estilo tem uma prévia. Na dúvida, use o recomendado." },
      { icon: "send", title: "Envie para edição", text: "Você acompanha cada etapa e recebe um aviso no fim." },
    ],
  },
  {
    id: "formatos",
    icon: "ratio",
    title: "Formatos e onde postar",
    summary: "9:16 para Reels e TikTok, 4:5 para feed, 16:9 para YouTube.",
    steps: [
      { icon: "smartphone", title: "9:16", text: "Reels, TikTok, Shorts e Stories." },
      { icon: "square", title: "1:1 e 4:5", text: "Feed do Instagram, LinkedIn e Meta Ads." },
      { icon: "monitor", title: "16:9", text: "YouTube, site do escritório e apresentações." },
    ],
  },
  {
    id: "regras-oab",
    icon: "landmark",
    title: "Regras da OAB em 1 minuto",
    summary: "Informe sem prometer resultado nem captar clientela.",
    steps: [
      { icon: "check", title: "Pode", text: "Explicar direitos, procedimentos e novidades da lei." },
      { icon: "x", title: "Não pode", text: "Prometer resultado, citar honorários ou oferecer serviços diretamente." },
      { icon: "shield-check", title: "Revisão OAB", text: "Ligue a revisão: avisamos falas que merecem atenção." },
    ],
  },
  {
    id: "pedir-ajustes",
    icon: "message",
    title: "Pedir ajustes",
    summary: "Marque o tempo, descreva o ajuste e receba nova versão.",
    steps: [
      { icon: "clock", title: "Marque o tempo", text: "Pause no trecho e toque em Solicitar ajuste." },
      { icon: "message-square", title: "Descreva", text: "Seja específico: o que muda e onde." },
      { icon: "refresh-cw", title: "Nova versão", text: "O ajuste usa a cota de ajustes do seu plano." },
    ],
  },
];

export type Faq = { q: string; a: string };

/** Até 5 dúvidas na landing; o app mostra todas. Respostas de até 2 linhas. */
export const duvidas: Faq[] = [
  {
    q: "Preciso saber editar vídeo?",
    a: "Não. Você envia a gravação e escolhe estilo e formato. A edição é feita pela plataforma.",
  },
  {
    q: "Os vídeos seguem as regras da OAB?",
    a: "Usamos linguagem informativa e sinalizamos falas sensíveis ao Provimento 205/2021. A palavra final é sua.",
  },
  {
    q: "Meus vídeos ficam protegidos?",
    a: "Sim. Arquivos privados, links temporários e exclusão completa quando você pedir (LGPD).",
  },
  {
    q: "Em quanto tempo fica pronto?",
    a: "Depende da duração e da fila. Você acompanha cada etapa e recebe um aviso por e-mail.",
  },
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim. Assinatura mensal, sem fidelidade. O acesso segue até o fim do período pago.",
  },
  {
    q: "Quais formatos posso enviar?",
    a: "MP4, MOV ou WEBM, gravados no celular ou na câmera, até o limite do seu plano.",
  },
  {
    q: "Posso pedir ajustes?",
    a: "Sim. Marque o tempo, descreva o ajuste e receba uma nova versão, dentro do limite do plano.",
  },
];
