/**
 * Editor no navegador: tipos compartilhados entre análise, plano de cortes,
 * desenho e renderização. Tempos em segundos; "fonte" = vídeo enviado,
 * "saída" = vídeo editado (depois dos cortes).
 */

export type Ratio = "9:16" | "1:1" | "4:5" | "16:9";
export type StyleId = "institucional" | "dinamico" | "cinematografico" | "performance" | "descontraido";
export type CaptionStyle = "discreta" | "palavra" | "caixa_alta";

export const RATIOS: readonly Ratio[] = ["9:16", "1:1", "4:5", "16:9"];

export interface EditOptions {
  style: StyleId;
  ratios: Ratio[];
  /** Corta silêncios e respirações longas. */
  cutPauses: boolean;
  /** Tira frases recomeçadas ou repetidas (precisa da transcrição + IA). */
  removeMistakes: boolean;
  captions: boolean;
  captionStyle: CaptionStyle;
  lowerThird: boolean;
  name: string;
  oab: string;
  hook: boolean;
  /** Vazio: a IA sugere pela fala. */
  hookText: string;
  cta: boolean;
  ctaText: string;
  vignette: boolean;
  zoom: boolean;
  enhanceAudio: boolean;
  /** Revisão OAB das falas (alertas, nunca corta sozinha). */
  oabReview: boolean;
  logo: Blob | null;
  /** Roteiro colado: vira legenda quando a transcrição automática não roda. */
  script: string;
  /** Centro do enquadramento escolhido à mão (0 a 1), por formato. */
  framing: Partial<Record<Ratio, { x: number; y: number }>>;
  /** Trechos que a pessoa pediu para tirar (tempo da fonte). */
  extraCuts?: Interval[];
  /** Pedidos livres (observações, "Outro", ajustes) para a revisão com IA. */
  notes?: string;
  /** Duração final desejada (s); a IA escolhe o que tirar para caber. */
  targetSeconds?: number | null;
}

export interface Interval {
  start: number;
  end: number;
}

/** Trecho da transcrição (tempo da fonte). */
export interface Segment extends Interval {
  id: number;
  text: string;
}

/** Palavra da legenda (tempo da fonte). */
export interface Word extends Interval {
  text: string;
  /** Destacada (termo jurídico, lei, número). */
  key?: boolean;
}

export interface OabAlert {
  frase: string;
  motivo: string;
  /** Tempo na fonte, quando conhecido. */
  tempo: number | null;
}

/** O que a IA (Claude) devolve ao revisar a fala. */
export interface Review {
  segments: Segment[];
  cutIds: number[];
  title: string;
  keywords: string[];
  alerts: OabAlert[];
  cta: string;
  by: "claude" | "local";
}

export interface Face {
  x: number;
  y: number;
  by: "detector" | "claude" | "centro" | "manual";
}

export interface Analysis {
  duration: number;
  width: number;
  height: number;
  /** Áudio mono a 16 kHz (null se o vídeo não tem áudio ou o navegador não decodificou). */
  audio: Float32Array | null;
  /** Áudio mono na taxa de saída, para montar a trilha editada sem tocar o vídeo. */
  pcm: { data: Float32Array; rate: number } | null;
  /** Energia por quadro de 20 ms, em dBFS. */
  frameDb: Float32Array | null;
  speech: Interval[];
  silences: Interval[];
  /** Volume médio da fala (dBFS RMS) para normalizar. */
  speechDb: number | null;
  segments: Segment[];
  transcriptBy: "whisper" | "roteiro" | "nenhum";
  review: Review | null;
  face: Face;
  notes: string[];
}

export interface Plan {
  keep: Interval[];
  /** Duração da parte de vídeo (sem vinheta). */
  bodyDuration: number;
  cutsPauses: number;
  cutsMistakes: number;
  saved: number;
}

export interface RenderOutput {
  ratio: Ratio;
  blob: Blob;
  url: string;
  mime: string;
  ext: "mp4" | "webm";
  width: number;
  height: number;
  duration: number;
}

export type StepId = "ler" | "audio" | "transcrever" | "revisar" | "enquadrar" | "montar";

export interface Progress {
  step: StepId;
  /** 0 a 1 dentro da etapa, quando mensurável. */
  value?: number;
  detail?: string;
}
