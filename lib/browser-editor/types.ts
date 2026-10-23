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
  /** Edição simples: legenda bonita, cortes de pausas e vícios e zoom suave nos cortes (sem grafismos, trilha ou efeitos). */
  simple?: boolean;
  ratios: Ratio[];
  /** Corta silêncios e respirações longas. */
  cutPauses: boolean;
  /** Tira frases recomeçadas ou repetidas (precisa da transcrição + IA). */
  removeMistakes: boolean;
  captions: boolean;
  captionStyle: CaptionStyle;
  lowerThird: boolean;
  name: string;
  /** Nome do escritório (vinheta e encerramento). */
  office?: string;
  /** Não exibido mais (mantido para projetos antigos). */
  oab: string;
  hook: boolean;
  /** Vazio: a IA sugere pela fala. */
  hookText: string;
  cta: boolean;
  ctaText: string;
  vignette: boolean;
  zoom: boolean;
  /** Grafismos animados, transições e efeitos sonoros. */
  effects: boolean;
  /** Trilha instrumental por baixo da voz. */
  music: boolean;
  /** Clima da trilha; "auto" segue o estilo. */
  musicMood?: "auto" | "sobria" | "inspiradora" | "neutra" | "energica" | "leve";
  /** Cor principal da marca (vira o acento dos grafismos). */
  accentColor?: string | null;
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
  /* Ajustes pedidos nas observações ou em "Solicitar ajuste". */
  /** Desloca a legenda (fração da altura; negativo sobe). */
  captionShift?: number;
  /** Multiplica o tamanho da legenda. */
  captionScale?: number;
  /** Cor do texto da legenda. */
  captionColor?: string | null;
  /** Palavras que a pessoa pediu para destacar. */
  extraKeywords?: string[];
  /** Quantidade de animação (1 = padrão do estilo). */
  energy?: number;
  /** Efeitos sonoros (padrão: ligados junto com os grafismos). */
  sfx?: boolean;
  /** Volume da trilha (1 = padrão). */
  musicVolume?: number;
  /** Troca a trilha por outra do mesmo clima. */
  musicSeed?: number;
  /** Tira a logo da marca do vídeo. */
  hideLogo?: boolean;
  /** Trocas de palavras na legenda pedidas pela pessoa. */
  replacements?: { from: string; to: string }[];
}

export interface Interval {
  start: number;
  end: number;
}

/** Palavra reconhecida com o seu tempo (fonte). */
export interface TimedWord extends Interval {
  text: string;
}

/** Trecho da transcrição (tempo da fonte). */
export interface Segment extends Interval {
  id: number;
  text: string;
  /** Tempo de cada palavra, quando o reconhecimento dá (legenda sincronizada). */
  words?: TimedWord[];
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

/** Grafismo sugerido pela IA num ponto da fala. */
export interface Moment {
  segmentId: number | null;
  /** Palavra (ou início da expressão) em que o grafismo entra. */
  word: string;
  kind: "icone" | "numero" | "cartao";
  /** Texto curto do grafismo (até 5 palavras). */
  text: string;
  icon: string | null;
  /** Número em destaque ("R$ 10 MIL") ou subtítulo do cartão. */
  value?: string;
}

/** O que a IA (Claude) devolve ao revisar a fala. */
export interface Review {
  segments: Segment[];
  cutIds: number[];
  title: string;
  keywords: string[];
  alerts: OabAlert[];
  cta: string;
  moments: Moment[];
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

/**
 * O que um pedido da pessoa (observação ou ajuste) muda na edição, já
 * entendido (pela IA ou pelo leitor de frases comuns).
 */
export interface Intent {
  /** Mudanças diretas nas opções (ligar/desligar, textos, estilo, cores). */
  set: Partial<EditOptions>;
  captionPos?: "baixo" | "cima" | "meio" | "padrao";
  captionSize?: "maior" | "menor";
  musicVolume?: "alta" | "baixa";
  newMusic?: boolean;
  animation?: "mais" | "menos";
  keywords?: string[];
  replace?: { from: string; to: string }[];
  /** Trechos a tirar, no tempo do vídeo final (como a pessoa vê no player). */
  cutsOut?: Interval[];
  /** Trechos a tirar, no tempo do vídeo original. */
  cutsSource?: Interval[];
  trimStart?: number;
  trimEnd?: number;
  restore?: boolean;
  shorter?: boolean;
  /** O que foi entendido, em frases curtas para a nota. */
  done: string[];
}
