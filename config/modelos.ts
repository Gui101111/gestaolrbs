/**
 * Modelos do Início. Cada um pré-preenche o "Novo vídeo" (estilo, formatos,
 * respostas e duração) e mostra uma dica de gravação.
 * Para trocar a arte do card por uma foto, preencha `image` (ex.: "/media/modelos/duvida.webp").
 */
import type { EditSettingKey } from "@/lib/constants/domain";

export type Modelo = {
  id: string;
  title: string;
  /** Valor de EDITING_STYLES */
  style: "institucional" | "dinamico" | "cinematografico" | "performance" | "descontraido";
  styleLabel: string;
  formats: ("9:16" | "1:1" | "4:5" | "16:9")[];
  /** Valor de OBJECTIVES */
  objective: "trafego_pago" | "conteudo_organico" | "institucional" | "educacional" | "autoridade";
  /** Valor de TARGET_DURATIONS */
  duration: "completo" | "60s" | "90s" | "3min" | "cortes";
  /** Respostas pré-marcadas (o resto segue o padrão do estilo). */
  answers: Partial<Record<EditSettingKey, boolean>>;
  tip: string;
  icon: "message-circle-question" | "scale" | "building" | "megaphone" | "scroll-text" | "coffee";
  hue: "gold" | "cyan" | "azure" | "violet";
  image?: string;
};

export const modelos: Modelo[] = [
  {
    id: "duvida-do-cliente",
    title: "Dúvida do cliente",
    style: "dinamico",
    styleLabel: "Dinâmico",
    formats: ["9:16"],
    objective: "conteudo_organico",
    duration: "60s",
    answers: { captions: true, highlight_keywords: true, auto_zoom: true, cut_silences: true },
    tip: "Comece pela pergunta, do jeito que o cliente faria.",
    icon: "message-circle-question",
    hue: "cyan",
  },
  {
    id: "explicando-um-direito",
    title: "Explicando um direito",
    style: "institucional",
    styleLabel: "Institucional",
    formats: ["9:16", "16:9"],
    objective: "educacional",
    duration: "90s",
    answers: { captions: true, highlight_keywords: true, lower_third: true, compliance_review: true },
    tip: "Um direito por vídeo, com um exemplo prático.",
    icon: "scale",
    hue: "azure",
  },
  {
    id: "apresentacao-do-escritorio",
    title: "Apresentação do escritório",
    style: "cinematografico",
    styleLabel: "Cinematográfico",
    formats: ["16:9"],
    objective: "institucional",
    duration: "3min",
    answers: { logo: true, background_music: true, lower_third: true, transitions: true },
    tip: "Grave no escritório, com luz natural de frente.",
    icon: "building",
    hue: "violet",
  },
  {
    id: "anuncio-meta-ads",
    title: "Anúncio para Meta Ads",
    style: "performance",
    styleLabel: "Meta Ads",
    formats: ["4:5", "9:16"],
    objective: "trafego_pago",
    duration: "60s",
    answers: { captions: true, highlight_keywords: true, cta: true, cut_silences: true, compliance_review: true },
    tip: "Diga o tema nos 3 primeiros segundos, sem prometer resultado.",
    icon: "megaphone",
    hue: "gold",
  },
  {
    id: "mudanca-na-lei",
    title: "Mudança na lei",
    style: "institucional",
    styleLabel: "Institucional",
    formats: ["1:1"],
    objective: "educacional",
    duration: "60s",
    answers: { captions: true, highlight_keywords: true, graphics: true, compliance_review: true },
    tip: "Cite a norma e explique o impacto em uma frase.",
    icon: "scroll-text",
    hue: "cyan",
  },
  {
    id: "bastidores-do-escritorio",
    title: "Bastidores do escritório",
    style: "descontraido",
    styleLabel: "Descontraído",
    formats: ["9:16"],
    objective: "conteudo_organico",
    duration: "60s",
    answers: { captions: true, background_music: true, broll: true },
    tip: "Mostre a rotina sem expor clientes ou processos.",
    icon: "coffee",
    hue: "gold",
  },
];

export function modeloById(id: string | null | undefined) {
  return modelos.find((m) => m.id === id) ?? null;
}
