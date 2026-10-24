/**
 * Vídeos de exemplo (página Exemplos e aba Exemplos da landing): animações
 * curtas (até 10 s) com advogados fictícios, editadas pelo próprio motor de
 * edição da TRIBUNA. Os arquivos ficam em /public/media/exemplos/ e são
 * gerados por `npm run exemplos` a partir dos roteiros abaixo.
 */
export type Moment = { palavra: string; tipo: "icone" | "numero" | "cartao"; texto: string; icone: string; valor?: string };

export type Example = {
  id: string;
  title: string;
  area: string; // valor de LEGAL_AREAS
  areaLabel: string;
  style: "institucional" | "dinamico" | "cinematografico" | "performance" | "descontraido"; // valor de EDITING_STYLES
  styleLabel: string;
  lawyer: "helena" | "rafael";
  /** Fala (vira legenda palavra a palavra). */
  fala: string;
  /** Palavras destacadas na legenda. */
  destaques: string[];
  momentos: Moment[];
  cta: string | null;
  video: string;
  poster: string;
  duration: string;
};

export const ADVOGADOS = {
  helena: { name: "Dra. Helena Prado", office: "Prado & Moura Advocacia" },
  rafael: { name: "Dr. Rafael Moura", office: "Prado & Moura Advocacia" },
} as const;

const file = (id: string) => ({ video: `/media/exemplos/${id}.mp4`, poster: `/media/exemplos/${id}.jpg` });

export const exemplos: Example[] = [
  {
    id: "voo-cancelado",
    title: "Voo cancelado? Veja seus direitos",
    area: "consumidor",
    areaLabel: "Consumidor",
    style: "dinamico",
    styleLabel: "Dinâmico",
    lawyer: "helena",
    fala: "Voo cancelado? A companhia deve oferecer reacomodação ou reembolso integral. Esperou mais de 4 horas? Tem direito a hospedagem.",
    destaques: ["reacomodação", "reembolso", "hospedagem"],
    momentos: [
      { palavra: "reacomodação", tipo: "icone", texto: "Reacomodação", icone: "plane" },
      { palavra: "4", tipo: "numero", texto: "de espera", icone: "clock", valor: "4 HORAS" },
    ],
    cta: null,
    ...file("voo-cancelado"),
    duration: "0:10",
  },
  {
    id: "golpe-do-pix",
    title: "Caiu no golpe do Pix?",
    area: "fraudes_bancarias",
    areaLabel: "Fraudes Bancárias",
    style: "performance",
    styleLabel: "Meta Ads",
    lawyer: "rafael",
    fala: "Caiu no golpe do Pix? Avise seu banco na hora e peça o MED. Depois, registre o boletim de ocorrência.",
    destaques: ["MED", "banco", "boletim"],
    momentos: [{ palavra: "MED.", tipo: "icone", texto: "Peça o MED", icone: "shield-check" }],
    cta: "Siga para mais alertas",
    ...file("golpe-do-pix"),
    duration: "0:10",
  },
  {
    id: "inss-negou",
    title: "O INSS negou seu benefício?",
    area: "previdenciario",
    areaLabel: "Previdenciário",
    style: "institucional",
    styleLabel: "Institucional",
    lawyer: "helena",
    fala: "O INSS negou seu benefício? Você pode recorrer em até 30 dias, com os documentos certos.",
    destaques: ["recorrer", "30 dias"],
    momentos: [{ palavra: "30", tipo: "numero", texto: "para recorrer", icone: "calendar-days", valor: "30 DIAS" }],
    cta: "Siga para mais direitos",
    ...file("inss-negou"),
    duration: "0:10",
  },
  {
    id: "pensao-alimenticia",
    title: "Pensão tem valor fixo?",
    area: "familia",
    areaLabel: "Família e Sucessões",
    style: "cinematografico",
    styleLabel: "Cinematográfico",
    lawyer: "rafael",
    fala: "Pensão alimentícia não tem valor fixo. Ela equilibra a necessidade de quem recebe e a possibilidade de quem paga.",
    destaques: ["necessidade", "possibilidade"],
    momentos: [{ palavra: "necessidade", tipo: "cartao", texto: "Necessidade e possibilidade", icone: "scale", valor: "o equilíbrio da pensão" }],
    cta: "Siga para mais conteúdos",
    ...file("pensao-alimenticia"),
    duration: "0:10",
  },
  {
    id: "demissao",
    title: "Demitido sem justa causa?",
    area: "trabalhista",
    areaLabel: "Trabalhista",
    style: "descontraido",
    styleLabel: "Descontraído",
    lawyer: "helena",
    fala: "Foi demitido sem justa causa? Você tem direito a aviso prévio, multa de 40% do FGTS e seguro-desemprego.",
    destaques: ["aviso prévio", "FGTS", "seguro-desemprego"],
    momentos: [
      { palavra: "aviso", tipo: "icone", texto: "Aviso prévio", icone: "calendar-days" },
      { palavra: "40%", tipo: "numero", texto: "multa do FGTS", icone: "percent", valor: "40%" },
    ],
    cta: null,
    ...file("demissao"),
    duration: "0:10",
  },
  {
    id: "plano-de-saude",
    title: "Plano negou sua cirurgia?",
    area: "consumidor",
    areaLabel: "Consumidor",
    style: "dinamico",
    styleLabel: "Dinâmico",
    lawyer: "rafael",
    fala: "O plano negou sua cirurgia? Peça a negativa por escrito. Com o laudo do médico, dá para questionar.",
    destaques: ["negativa", "laudo"],
    momentos: [
      { palavra: "negativa", tipo: "icone", texto: "Negativa por escrito", icone: "file-text" },
      { palavra: "laudo", tipo: "icone", texto: "Laudo médico", icone: "stethoscope" },
    ],
    cta: null,
    ...file("plano-de-saude"),
    duration: "0:10",
  },
];
