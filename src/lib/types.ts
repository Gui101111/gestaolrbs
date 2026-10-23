export type FormatId = '9:16' | '1:1' | '16:9' | 'original';
export type FitMode = 'cover' | 'blur';
export type LanguageId = 'pt' | 'en' | 'es' | 'auto';

export type CaptionStyleId = 'recomendada' | 'discreta' | 'caixa' | 'karaoke' | 'impacto' | 'minimalista';
export type CaptionPosition = 'bottom' | 'middle' | 'top';
export type CaptionSize = 'sm' | 'md' | 'lg';

export type VinhetaStyle = 'clean' | 'escura' | 'vibrante';
export type Pace = 'suave' | 'equilibrado' | 'acelerado';

export interface CaptionSettings {
  enabled: boolean;
  style: CaptionStyleId;
  position: CaptionPosition;
  size: CaptionSize;
  /** Cor de destaque (palavra ativa, caixa, karaokê). */
  color: string;
  uppercase: boolean;
}

export interface VinhetaSettings {
  intro: boolean;
  outro: boolean;
  style: VinhetaStyle;
  color: string;
  title: string;
  subtitle: string;
  outroTitle: string;
  outroSubtitle: string;
  sound: boolean;
  hasLogo: boolean;
}

export interface AiSettings {
  removeSilences: boolean;
  removeFillers: boolean;
  pace: Pace;
  zooms: boolean;
  highlightKeywords: boolean;
  hookTitle: boolean;
}

export interface ProjectSettings {
  format: FormatId;
  fit: FitMode;
  language: LanguageId;
  captions: CaptionSettings;
  vinheta: VinhetaSettings;
  ai: AiSettings;
  /** Pedido livre do usuário para a IA. */
  prompt: string;
}

export interface Word {
  i: number;
  text: string;
  start: number;
  end: number;
}

export interface Transcript {
  language: string;
  text: string;
  duration: number;
  words: Word[];
}

export type InstructionStatus = 'feito' | 'parcial' | 'nao_possivel';

export interface PlanOverrides {
  captionsEnabled: boolean | null;
  captionStyle: CaptionStyleId | null;
  position: CaptionPosition | null;
  size: CaptionSize | null;
  color: string | null;
  uppercase: boolean | null;
  introTitle: string | null;
  introSubtitle: string | null;
  outroTitle: string | null;
  outroSubtitle: string | null;
}

export interface EditPlan {
  title: string;
  summary: string;
  /** Intervalos de palavras (índices inclusivos) que devem sair do vídeo. */
  removeRanges: { from: number; to: number; reason: string }[];
  /** Correções de grafia para as legendas. */
  corrections: { index: number; text: string }[];
  /** Palavras-chave destacadas nas legendas. */
  highlights: number[];
  /** Palavras onde entra um zoom de ênfase. */
  emphasis: number[];
  hookTitle: string | null;
  overrides: PlanOverrides;
  /** Como cada pedido do prompt adicional foi atendido. */
  instructions: { request: string; status: InstructionStatus; note: string }[];
  /** "ia" quando veio do modelo; "automatico" quando a IA não estava disponível. */
  source: 'ia' | 'automatico';
}

export interface RenderReport {
  removedSeconds: number;
  cuts: number;
  captions: number;
  zooms: number;
  warnings: string[];
  codec: string;
}

export type ProjectStatus = 'draft' | 'processing' | 'ready' | 'error';

export interface Project {
  id: string;
  userId: string;
  title: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  settings: ProjectSettings;
  sourceName: string | null;
  sourceSize: number | null;
  sourceDuration: number | null;
  outputDuration: number | null;
  outputExt: 'mp4' | 'webm' | null;
  transcript: Transcript | null;
  plan: EditPlan | null;
  report: RenderReport | null;
  /** Miniatura JPEG pequena (data URL), gerada depois da edição. */
  thumbnail: string | null;
  error: string | null;
}

export interface User {
  id: string;
  email: string;
  name: string;
}
