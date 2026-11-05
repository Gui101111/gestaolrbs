import { evaluateTrack, orbit, type EaseName, type TrackAnimation, type Vec3 } from "../utils/animation";
import { DURATION, FPS, HEIGHT, SCENE_FRAMES, voLocal, WIDTH, wordLocal, type VoKey } from "../utils/timing";

// SÉRIE 3 · temas do momento (boatos pós-eleição, reajustes, 13º, golpes, IR).
// Cortes derivados da voz real (utils/timing.ts). Frames das animações são LOCAIS à cena.

export type VideoConfig = {
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
  theme: string;
  language: string;
};

export const VIDEO: VideoConfig = { width: WIDTH, height: HEIGHT, fps: FPS, durationInFrames: DURATION, theme: "low-poly-3d", language: "pt-BR" };

/** negative = problema (✖ vermelho), positive = solução (✔ verde), info = termo/neutro, warning = pergunta/atenção. */
export type BadgeVariant = "positive" | "negative" | "info" | "warning";

/** Pose de passagem da câmera (a câmera interpola em coordenadas orbitais entre as chaves). */
export type CameraKey = { at: number; position: Vec3; target: Vec3; zoom?: number; easing?: EaseName };

export type CameraPlan = {
  projection: "perspective" | "orthographic";
  movement: "dolly-in" | "dolly-out" | "vertical" | "orbit" | "tracking" | "split" | "hold";
  /** keys[0] é a pose inicial do plano; inclua uma chave no último frame para continuidade. */
  keys: CameraKey[];
};

/** Objeto persistente do sistema: ids estáveis entre cenas; `visible` controla a montagem. */
export type SceneObject = { id: string; type: string; visible: boolean; state?: { start: string; end: string } };

export type SceneBadge = {
  text: string;
  variant: BadgeVariant;
  appearAt: number;
  disappearAt?: number;
  subtitle?: string;
  /** Coluna central (padrão) ou metade esquerda/direita de uma tela dividida. */
  slot?: "center" | "left" | "right";
  icon?: "?";
  size?: "normal" | "large";
};

/** Legenda provisória (antes do TTS). Depois do alinhamento, as legendas vêm palavra a palavra de vo.json. */
export type CaptionBlock = { text: string; from: number; to: number };

export type AudioCue = {
  kind: "narration" | "sfx";
  /** Caminho em public/ (ex.: "audio/vo/s1.wav", "audio/sfx/whoosh.wav"). */
  src: string;
  at: number;
  volume: number;
  /** "planned" ainda não existe em disco e não é tocado; "ready" foi gerado/medido. */
  status: "planned" | "ready";
};

/** Palavra gigante que "pula" no centro da tela (frames locais). */
export type BigWord = { text: string; at: number; until: number; color?: string; y?: number; size?: number; tilt?: number };

/** Celular com mensagens de grupo (frames locais). */
export type ChatMsg = { who: string; text: string; at: number; fwd?: boolean; me?: boolean; color?: string };
export type ChatPanel = { title: string; subtitle?: string; at: number; until: number; msgs: ChatMsg[]; fakeAt?: number; stamp?: string; stampColor?: string; y?: number };

/** Rótulo 2D ancorado num ponto 3D (frames locais). */
export type SceneLabel = { text: string; point: Vec3; at: number; until: number; off?: [number, number]; accent?: string };

export type ScenePlan = {
  id: string;
  startFrame: number;
  durationInFrames: number;
  voKey: VoKey;
  narration: string;
  camera: CameraPlan;
  objects: SceneObject[];
  animations: TrackAnimation[];
  badges: SceneBadge[];
  /** Palavras-chave (MAIÚSCULAS, sem pontuação) coloridas na legenda. */
  highlights: string[];
  captions: CaptionBlock[];
  audioCues: AudioCue[];
  bigWords?: BigWord[];
  chat?: ChatPanel;
  labels?: SceneLabel[];
};

const sc = (i: number) => SCENE_FRAMES[i];
const end = (i: number) => SCENE_FRAMES[i].durationInFrames;
const W = wordLocal;
const key = (at: number, pose: { position: Vec3; target: Vec3 }, easing?: EaseName): CameraKey => ({ at, ...pose, easing });
const narration = (k: VoKey, status: AudioCue["status"]): AudioCue => ({ kind: "narration", src: `audio/vo/${k}.wav`, at: voLocal(k), volume: 1, status });
const sfx = (name: string, at: number, volume: number): AudioCue => ({ kind: "sfx", src: `audio/sfx/${name}.wav`, at, volume, status: "ready" });

const o = (id: string, type: string, start?: string, stateEnd?: string): SceneObject =>
  start ? { id, type, visible: true, state: { start, end: stateEnd ?? start } } : { id, type, visible: true };
const lerp = (target: string, startFrame: number, endFrame: number, from: number | undefined, to: number, easing: EaseName = "inOut", unit: TrackAnimation["unit"] = "0-1"): TrackAnimation =>
  ({ type: "interpolate", target, startFrame, endFrame, from, to, easing, unit });
const spring = (target: string, startFrame: number, endFrame: number, from: number | undefined, to: number, damping = 10, unit: TrackAnimation["unit"] = "0-1"): TrackAnimation =>
  ({ type: "spring", target, startFrame, endFrame, from, to, damping, unit });
export const punch = (at: number, amt = 1): TrackAnimation[] => [lerp("cam.punch", at, at + 4, 0, amt, "out"), lerp("cam.punch", at + 4, at + 16, amt, 0, "inOut")];
export const whip = (at: number): TrackAnimation[] => [lerp("whip", at, at + 3, 0, 1, "out"), lerp("whip", at + 3, at + 10, 1, 0, "in")];
export const flash = (at: number, amt = 1): TrackAnimation[] => [lerp("flash", at, at + 2, 0, amt, "out"), lerp("flash", at + 2, at + 10, amt, 0, "in")];

export const G = "#4be37f";
export const R = "#ff5d5d";
export const Y = "#ffd43b";
export const GOLD = "#ffc531";

/** Cenário: praça do INSS, o Paulo, a Sofia (3 anos, adotada) e o colega zoeiro. */
const SYSTEM = (): SceneObject[] => [o("island", "diorama-ilha"), o("inss", "predio-inss"), o("warehouse", "galpao"), o("paulo", "paulo"), o("sofia", "sofia-3-anos"), o("colega", "colega-do-trabalho")];
const DOC = o("doc", "termo-de-guarda");
const COLEGA_HEAD: Vec3 = [-0.4, 2.1, -1.05];
const DUO_HEAD: Vec3 = [0.7, 2.15, -1.25];
const PINK = "#ff8fc1";

const P = {
  duo: orbit([0.7, 1.15, -1.25], 7.5, -12, 5),
  duoLow: orbit([0.7, 1.55, -1.25], 7.5, -12, 3),
  colega: orbit([-0.4, 1.45, -1.05], 5.6, -4, 3),
  plaza: orbit([0.3, 1.0, -1.3], 13, -6, 7),
  plazaLow: orbit([0.3, 1.45, -1.3], 13, -6, 4),
  doc: orbit([1.0, 1.15, -1.75], 7.5, 10, 4),
  final: orbit([0.2, 1.4, -1.3], 30, 10, 18),
};

export const scenes: ScenePlan[] = [
  // ------------------------------------------------------------------ s1 · adotou! e o colega zoou
  {
    id: "scene-01-gancho",
    startFrame: sc(0).from,
    durationInFrames: sc(0).durationInFrames,
    voKey: "s1",
    narration: "O Paulo adotou a Sofia, de três anos. E o colega do trabalho zoou: licença é coisa de mãe, rapaz!",
    camera: { projection: "perspective", movement: "tracking", keys: [key(0, P.duo), key(W("s1", 8) - 4, P.duo), key(W("s1", 8) + 4, P.colega, "out"), key(end(0), P.colega)] },
    objects: [...SYSTEM()],
    animations: [
      lerp("hearts", 0, 6, 0, 1, "out"),
      lerp("paulo.hop", 0, 4, 0, 1, "out"),
      lerp("sofia.hop", 0, 4, 0, 1, "out"),
      lerp("sofia.wave", 2, 10, 0, 1, "out"),
      lerp("paulo.wave", 4, 12, 0, 1, "out"),
      lerp("hearts", W("s1", 8) - 6, W("s1", 8), 1, 0, "in"),
      lerp("paulo.hop", W("s1", 8) - 6, W("s1", 8), 1, 0, "in"),
      lerp("sofia.hop", W("s1", 8) - 6, W("s1", 8), 1, 0, "in"),
      lerp("colega.laugh", W("s1", 13), W("s1", 13) + 6, 0, 1, "out"),
      lerp("colega.wave", W("s1", 13), W("s1", 13) + 8, 0, 1, "out"),
    ],
    badges: [],
    bigWords: [{ text: "ADOTOU!", at: 2, until: W("s1", 8), color: PINK, size: 200, y: 1000, tilt: -5 }],
    labels: [
      { text: "PAULO E SOFIA", point: DUO_HEAD, at: W("s1", 1), until: W("s1", 8) - 2, off: [0, -110], accent: PINK },
      { text: "LICENÇA É COISA DE MÃE, RAPAZ!", point: COLEGA_HEAD, at: W("s1", 13), until: end(0), off: [60, -140], accent: Y },
    ],
    highlights: ["PAULO", "ADOTOU", "SOFIA", "TRÊS", "ANOS", "COLEGA", "ZOOU", "LICENÇA", "MÃE"],
    captions: [{ text: "O Paulo adotou a Sofia, de três anos. E o colega do trabalho zoou: licença é coisa de mãe, rapaz!", from: voLocal("s1"), to: end(0) }],
    audioCues: [narration("s1", "ready"), sfx("shimmer", 0, 0.26), sfx("boing", 2, 0.2), sfx("pop", W("s1", 1), 0.18), sfx("whoosh", W("s1", 8), 0.22), sfx("scratch", W("s1", 13), 0.22)],
  },
  // ------------------------------------------------------------------ s2 · será? olha que lindo
  {
    id: "scene-02-sera",
    startFrame: sc(1).from,
    durationInFrames: sc(1).durationInFrames,
    voKey: "s2",
    narration: "Será? Olha só que lindo.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.plaza), key(end(1), P.plazaLow, "linear")] },
    objects: [...SYSTEM()],
    animations: [...whip(0), lerp("colega.laugh", 0, 8, 1, 0.3, "inOut"), lerp("colega.wave", 0, 6, 1, 0, "in"), lerp("hearts", W("s2", 1), W("s2", 1) + 8, 0, 0.8, "out")],
    badges: [],
    bigWords: [{ text: "SERÁ?", at: W("s2", 0), until: end(1), color: Y, size: 220, y: 460, tilt: -6 }],
    highlights: ["SERÁ", "LINDO"],
    captions: [{ text: "Será? Olha só que lindo.", from: voLocal("s2"), to: end(1) }],
    audioCues: [narration("s2", "ready"), sfx("whoosh", 0, 0.22), sfx("scratch", 2, 0.26), sfx("shimmer", W("s2", 1), 0.2)],
  },
  // ------------------------------------------------------------------ s3 · quem adota tem direito: mãe ou pai
  {
    id: "scene-03-quem-adota",
    startFrame: sc(2).from,
    durationInFrames: sc(2).durationInFrames,
    voKey: "s3",
    narration: "Na adoção, quem adota também tem direito ao salário-maternidade, seja mãe, seja pai.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.duo), key(end(2), P.duoLow, "linear")] },
    objects: [...SYSTEM()],
    animations: [
      ...whip(0),
      lerp("colega.laugh", 0, 1, 0, 0),
      lerp("hearts", 0, 10, 0.8, 0.3, "inOut"),
      spring("paulo.ok", W("s3", 5), W("s3", 5) + 18, 0, 1, 7),
      lerp("paulo.thumb", W("s3", 12), W("s3", 12) + 8, 0, 1, "out"),
      ...punch(W("s3", 12), 0.7),
    ],
    badges: [{ text: "QUEM ADOTA TEM DIREITO", variant: "positive", appearAt: W("s3", 2), disappearAt: end(2) }],
    bigWords: [
      { text: "SALÁRIO-MATERNIDADE", at: W("s3", 8), until: W("s3", 10), color: GOLD, size: 100, y: 1000, tilt: -4 },
      { text: "MÃE", at: W("s3", 10), until: W("s3", 12), color: PINK, size: 220, y: 1000, tilt: -5 },
      { text: "OU PAI!", at: W("s3", 12), until: end(2), color: "#4fc3f7", size: 210, y: 1000, tilt: 5 },
    ],
    highlights: ["ADOÇÃO", "ADOTA", "DIREITO", "SALÁRIO-MATERNIDADE", "MÃE", "PAI"],
    captions: [{ text: "Na adoção, quem adota também tem direito ao salário-maternidade, seja mãe, seja pai.", from: voLocal("s3"), to: end(2) }],
    audioCues: [narration("s3", "ready"), sfx("whoosh", 0, 0.22), sfx("badge", W("s3", 2), 0.2), sfx("ding", W("s3", 5), 0.22), sfx("pop", W("s3", 10), 0.2), sfx("pop-high", W("s3", 12), 0.22)],
  },
  // ------------------------------------------------------------------ s4 · até 12 anos, 120 dias
  {
    id: "scene-04-120-dias",
    startFrame: sc(3).from,
    durationInFrames: sc(3).durationInFrames,
    voKey: "s4",
    narration: "Vale pra criança de até 12 anos, e são 120 dias pra se dedicar à nova família.",
    camera: { projection: "perspective", movement: "orbit", keys: [key(0, P.duoLow), key(W("s4", 8), P.duo, "soft"), key(end(3), P.duo)] },
    objects: [...SYSTEM()],
    animations: [
      ...whip(0),
      lerp("paulo.ok", 0, 6, 1, 0, "in"),
      lerp("paulo.thumb", 0, 6, 1, 0, "in"),
      lerp("sofia.hop", W("s4", 5), W("s4", 5) + 4, 0, 1, "out"),
      lerp("sofia.hop", W("s4", 8), W("s4", 8) + 4, 1, 0, "in"),
      lerp("hearts", W("s4", 8), W("s4", 8) + 8, 0.3, 1, "out"),
      lerp("paulo.dance", W("s4", 11), W("s4", 11) + 6, 0, 1, "out"),
      lerp("sofia.dance", W("s4", 11) + 2, W("s4", 11) + 8, 0, 1, "out"),
      lerp("confetti", W("s4", 8), W("s4", 8) + 8, 0, 0.6, "out"),
    ],
    badges: [{ text: "PRA SE DEDICAR À FAMÍLIA", variant: "positive", appearAt: W("s4", 9), disappearAt: end(3) }],
    bigWords: [
      { text: "ATÉ 12 ANOS", at: W("s4", 4), until: W("s4", 8), color: "#ffffff", size: 160, y: 460, tilt: -5 },
      { text: "120 DIAS", at: W("s4", 8), until: end(3), color: GOLD, size: 210, y: 460, tilt: -5 },
    ],
    highlights: ["CRIANÇA", "12", "ANOS", "120", "DIAS", "NOVA", "FAMÍLIA"],
    captions: [{ text: "Vale pra criança de até 12 anos, e são 120 dias pra se dedicar à nova família.", from: voLocal("s4"), to: end(3) }],
    audioCues: [narration("s4", "ready"), sfx("whoosh", 0, 0.22), sfx("pop", W("s4", 5), 0.2), sfx("cash", W("s4", 8), 0.24), sfx("shimmer", W("s4", 9), 0.2)],
  },
  // ------------------------------------------------------------------ s5 · documentos + casal: só um recebe
  {
    id: "scene-05-documentos",
    startFrame: sc(4).from,
    durationInFrames: sc(4).durationInFrames,
    voKey: "s5",
    narration: "É só ser segurado do INSS e ter o termo de guarda ou a nova certidão. E se o casal adotar junto, só um dos dois recebe.",
    camera: { projection: "perspective", movement: "orbit", keys: [key(0, P.duo), key(W("s5", 8), P.doc, "soft"), key(W("s5", 16) - 2, P.doc), key(W("s5", 16) + 6, P.duo, "out"), key(end(4), P.duo)] },
    objects: [...SYSTEM(), DOC],
    animations: [
      ...whip(0),
      lerp("hearts", 0, 8, 1, 0, "in"),
      lerp("confetti", 0, 8, 0.6, 0, "in"),
      lerp("paulo.dance", 0, 6, 1, 0, "in"),
      lerp("sofia.dance", 0, 6, 1, 0, "in"),
      lerp("doc.pop", 0, 1, 0, 0),
      lerp("doc.deny", 0, 1, 0, 0),
      lerp("doc.ok", 0, 1, 0, 0),
      spring("doc.pop", W("s5", 8), W("s5", 8) + 20, 0, 1, 8),
      spring("doc.ok", W("s5", 15), W("s5", 15) + 20, 0, 1, 7),
      lerp("doc.pop", W("s5", 16) + 6, W("s5", 16) + 12, 1, 0, "in"),
      ...punch(W("s5", 22), 0.7),
    ],
    badges: [
      { text: "SEGURADO DO INSS", variant: "info", appearAt: W("s5", 3), disappearAt: W("s5", 8) },
      { text: "TERMO DE GUARDA OU CERTIDÃO", variant: "positive", appearAt: W("s5", 9), disappearAt: W("s5", 16) },
      { text: "CASAL ADOTOU JUNTO?", variant: "warning", icon: "?", appearAt: W("s5", 16), disappearAt: end(4) },
    ],
    bigWords: [{ text: "SÓ UM RECEBE", at: W("s5", 22), until: end(4), color: Y, size: 150, y: 460, tilt: -5 }],
    highlights: ["SEGURADO", "INSS", "TERMO", "GUARDA", "CERTIDÃO", "CASAL", "JUNTO", "UM", "RECEBE"],
    captions: [
      { text: "É só ser segurado do INSS e ter o termo de guarda ou a nova certidão.", from: voLocal("s5"), to: W("s5", 16) },
      { text: "E se o casal adotar junto, só um dos dois recebe.", from: W("s5", 16), to: end(4) },
    ],
    audioCues: [narration("s5", "ready"), sfx("whoosh", 0, 0.22), sfx("badge", W("s5", 3), 0.2), sfx("pop", W("s5", 8), 0.2), sfx("stamp", W("s5", 15), 0.34), sfx("badge", W("s5", 16), 0.2), sfx("ding", W("s5", 22), 0.22)],
  },
  // ------------------------------------------------------------------ s6 · o colega quer ser padrinho
  {
    id: "scene-06-padrinho",
    startFrame: sc(5).from,
    durationInFrames: sc(5).durationInFrames,
    voKey: "s6",
    narration: "E o colega? Já pediu pra ser padrinho.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.plaza), key(end(5), P.plazaLow, "linear")] },
    objects: [...SYSTEM()],
    animations: [
      ...whip(0),
      spring("colega.shock", W("s6", 2), W("s6", 2) + 14, 0, 0.8, 7),
      lerp("colega.shock", W("s6", 3), W("s6", 3) + 6, 0.8, 0, "inOut"),
      lerp("colega.hop", W("s6", 4), W("s6", 4) + 4, 0, 1, "out"),
      lerp("colega.wave", W("s6", 4), W("s6", 4) + 8, 0, 1, "out"),
      lerp("hearts", W("s6", 4), W("s6", 4) + 8, 0, 1, "out"),
      lerp("paulo.shades", 4, 14, 0, 1, "in"),
    ],
    badges: [],
    labels: [{ text: "POSSO SER O PADRINHO?", point: COLEGA_HEAD, at: W("s6", 4), until: end(5), off: [60, -140], accent: Y }],
    highlights: ["COLEGA", "PADRINHO"],
    captions: [{ text: "E o colega? Já pediu pra ser padrinho.", from: voLocal("s6"), to: end(5) }],
    audioCues: [narration("s6", "ready"), sfx("whoosh", 0, 0.22), sfx("ding", 14, 0.2), sfx("boing", W("s6", 4), 0.22), sfx("shimmer", W("s6", 4) + 2, 0.18)],
  },
  // ------------------------------------------------------------------ s7 · marca nos comentários + siga
  {
    id: "scene-07-final",
    startFrame: sc(6).from,
    durationInFrames: sc(6).durationInFrames,
    voKey: "s7",
    narration: "Conhece alguém que sonha em adotar? Marca nos comentários, e siga o Advogado de Bolso em todas as redes!",
    camera: { projection: "perspective", movement: "dolly-out", keys: [key(0, P.plazaLow), key(W("s7", 10), P.plazaLow), key(W("s7", 18) + 20, P.final, "inOut"), key(end(6), P.final)] },
    objects: [...SYSTEM()],
    animations: [
      lerp("hearts", 0, 10, 1, 0.5, "inOut"),
      lerp("paulo.dance", 2, 8, 0, 1, "out"),
      lerp("sofia.dance", 4, 10, 0, 1, "out"),
      lerp("colega.dance", 6, 12, 0, 1, "out"),
      spring("comment", W("s7", 6), W("s7", 6) + 22, 0, 1, 8),
      lerp("comment", W("s7", 10) - 4, W("s7", 10) + 4, 1, 0, "in"),
      spring("follow", W("s7", 10), W("s7", 10) + 22, 0, 1, 8),
      lerp("follow", end(6) - 58, end(6) - 50, 1, 0, "in"),
      lerp("hearts", end(6) - 60, end(6) - 40, 0.5, 0, "in"),
      spring("endcard", end(6) - 52, end(6) - 22, 0, 1, 10),
    ],
    badges: [],
    chat: { title: "GRUPO DO TRABALHO", subtitle: "Colega, Chefe, RH, +12", at: W("s7", 0), until: W("s7", 6), y: 260, msgs: [{ who: "Colega", text: "Posso ser o padrinho da Sofia???", at: W("s7", 0), color: "#e67e22" }, { who: "Paulo", text: "Vou pensar kkkkk", at: W("s7", 3), me: true }] },
    highlights: ["SONHA", "ADOTAR", "MARCA", "COMENTÁRIOS", "SIGA", "ADVOGADO", "BOLSO", "REDES"],
    captions: [{ text: "Conhece alguém que sonha em adotar? Marca nos comentários, e siga o Advogado de Bolso em todas as redes!", from: voLocal("s7"), to: end(6) - 52 }],
    audioCues: [narration("s7", "ready"), sfx("plim", W("s7", 0), 0.22), sfx("plim", W("s7", 3), 0.2), sfx("pop", W("s7", 6), 0.26), sfx("ding", W("s7", 10), 0.22), sfx("final", end(6) - 52, 0.3)],
  },
];
/** Valor de uma trilha de animação (ex.: "piggy.level") no frame global. */
export const track = (target: string, frame: number, fallback = 0) => evaluateTrack(scenes, target, frame, FPS, fallback);

/** Cena ativa no frame global. */
export const sceneAt = (frame: number) => {
  for (let i = scenes.length - 1; i >= 0; i--) {
    if (frame >= scenes[i].startFrame) return scenes[i];
  }
  return scenes[0];
};

export const isVisible = (id: string, frame: number) => sceneAt(frame).objects.some((ob) => ob.id === id && ob.visible);

// Verificação de integridade da timeline (executada ao importar): contígua, começa em 0, soma DURATION.
scenes.forEach((cur, i) => {
  const prev = scenes[i - 1];
  if (prev && prev.startFrame + prev.durationInFrames !== cur.startFrame) {
    throw new Error(`Buraco/sobreposição entre ${prev.id} e ${cur.id}`);
  }
});
const total = scenes.reduce((acc, cur) => acc + cur.durationInFrames, 0);
if (total !== DURATION || scenes[0].startFrame !== 0) {
  throw new Error(`As cenas somam ${total} frames (esperado ${DURATION})`);
}
