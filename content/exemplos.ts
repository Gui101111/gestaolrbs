/**
 * Exemplos de antes e depois (landing e /app/exemplos).
 *
 * Para usar vídeos reais, preencha `before.video`/`after.video` (e `poster`)
 * com arquivos em /public/media/exemplos/. Sem vídeo, o card mostra uma
 * composição de placeholder com degradê e a estátua.
 */
export type ExampleMedia = { video?: string; poster?: string };

export type Example = {
  id: string;
  title: string;
  area: string; // valor de LEGAL_AREAS
  areaLabel: string;
  style: string; // valor de EDITING_STYLES
  styleLabel: string;
  format: "9:16" | "1:1" | "4:5" | "16:9";
  duration: string;
  /** Legenda curta exibida no "depois". */
  caption: string;
  /** Palavra destacada na legenda. */
  highlight: string;
  hue: "gold" | "cyan" | "azure" | "violet";
  before: ExampleMedia;
  after: ExampleMedia;
};

export const exemplos: Example[] = [
  {
    id: "revisao-beneficio",
    title: "Revisão de benefício",
    area: "previdenciario",
    areaLabel: "Previdenciário",
    style: "dinamico",
    styleLabel: "Dinâmico",
    format: "9:16",
    duration: "0:48",
    caption: "Você pode ter direito à revisão",
    highlight: "revisão",
    hue: "cyan",
    before: {},
    after: {},
  },
  {
    id: "golpe-pix",
    title: "Golpe do Pix",
    area: "fraudes_bancarias",
    areaLabel: "Fraudes bancárias",
    style: "performance",
    styleLabel: "Meta Ads",
    format: "9:16",
    duration: "0:32",
    caption: "Caiu no golpe? Faça isto primeiro",
    highlight: "primeiro",
    hue: "gold",
    before: {},
    after: {},
  },
  {
    id: "horas-extras",
    title: "Horas extras",
    area: "trabalhista",
    areaLabel: "Trabalhista",
    style: "institucional",
    styleLabel: "Institucional",
    format: "9:16",
    duration: "1:05",
    caption: "Banco de horas tem regra",
    highlight: "regra",
    hue: "azure",
    before: {},
    after: {},
  },
  {
    id: "apresentacao",
    title: "Apresentação do escritório",
    area: "institucional",
    areaLabel: "Institucional",
    style: "cinematografico",
    styleLabel: "Cinematográfico",
    format: "16:9",
    duration: "1:20",
    caption: "Vinte anos ao lado de quem empreende",
    highlight: "empreende",
    hue: "violet",
    before: {},
    after: {},
  },
  {
    id: "voo-cancelado",
    title: "Voo cancelado",
    area: "consumidor",
    areaLabel: "Consumidor",
    style: "descontraido",
    styleLabel: "Descontraído",
    format: "9:16",
    duration: "0:41",
    caption: "Voo cancelado não é só reembolso",
    highlight: "reembolso",
    hue: "cyan",
    before: {},
    after: {},
  },
  {
    id: "partilha",
    title: "Partilha de bens",
    area: "familia",
    areaLabel: "Família",
    style: "institucional",
    styleLabel: "Institucional",
    format: "4:5",
    duration: "0:55",
    caption: "Partilha começa pelo regime de bens",
    highlight: "regime",
    hue: "gold",
    before: {},
    after: {},
  },
];
