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
const punch = (at: number, amt = 1): TrackAnimation[] => [lerp("cam.punch", at, at + 4, 0, amt, "out"), lerp("cam.punch", at + 4, at + 16, amt, 0, "inOut")];
const whip = (at: number): TrackAnimation[] => [lerp("whip", at, at + 3, 0, 1, "out"), lerp("whip", at + 3, at + 10, 1, 0, "in")];
const flash = (at: number, amt = 1): TrackAnimation[] => [lerp("flash", at, at + 2, 0, amt, "out"), lerp("flash", at + 2, at + 10, amt, 0, "in")];

export const G = "#4be37f";
export const R = "#ff5d5d";
export const Y = "#ffd43b";
export const GOLD = "#ffc531";

/** Cenário: sítio (milharal, galinhas), praça do INSS com a urna, dona Maria e a tia do grupo. */
const SYSTEM = (): SceneObject[] => [o("island", "diorama-ilha-sitio"), o("home", "casa-da-dona-maria"), o("inss", "predio-inss"), o("maria", "dona-maria-aposentada-rural")];
const TIA = o("tia", "tia-cida-do-grupo");
const URNA = o("urna", "urna-eletronica");
const FX = -2.45 - 0.75;
const FZ = -1.6 - -1.45;
const MARIA_HEAD: Vec3 = [0.75, 1.85, -1.45];
const MARIA_FARM_HEAD: Vec3 = [-2.45, 1.85, -1.6];
const RUMOR = "URGENTE!!! Quem votou no Flávio vai PERDER A APOSENTADORIA!!! Repassem!";

const P = {
  urna: orbit([1.1, 1.2, -1.6], 5.6, 25, 8),
  mariaLow: orbit([0.75, 1.75, -1.45], 6.2, 12, 2),
  plaza: orbit([0.3, 1.0, -1.35], 13, -6, 7),
  plazaLow: orbit([0.3, 1.5, -1.35], 13, -6, 4),
  home: orbit([-2.6, 1.0, -1.4], 9.5, 10, 8),
  homeWide: orbit([-2.6, 1.2, -1.2], 13, 12, 10),
  chickens: orbit([-2.4, 0.6, -0.8], 6.5, 15, 14),
  corn: orbit([-4.0, 1.0, -0.8], 8, 24, 14),
  mariaFarm: orbit([-2.45, 1.3, -1.6], 5.5, 10, 4),
  mariaFarmLow: orbit([-2.45, 1.75, -1.6], 6.2, 10, 2),
  final: orbit([-0.4, 1.4, -1.3], 30, 10, 18),
};

export const scenes: ScenePlan[] = [
  // ------------------------------------------------------------------ s1 · gancho: vota, e chega o boato
  {
    id: "scene-01-gancho",
    startFrame: sc(0).from,
    durationInFrames: sc(0).durationInFrames,
    voKey: "s1",
    narration: "Essa é a dona Maria. Disseram pra ela que ia perder a aposentadoria só porque votou no Flávio Bolsonaro!",
    camera: { projection: "perspective", movement: "tracking", keys: [key(0, P.urna), key(W("s1", 5) - 6, P.urna), key(W("s1", 5) + 2, P.mariaLow, "out"), key(end(0), P.mariaLow)] },
    objects: [...SYSTEM(), TIA, URNA],
    animations: [
      lerp("maria.dx", 0, 1, 0, 0),
      lerp("maria.dz", 0, 1, 0, 0),
      lerp("urna.pop", 0, 1, 1, 1),
      lerp("urna.press", 3, 8, 0, 1, "in"),
      ...punch(8, 0.6),
      lerp("maria.hop", 10, 14, 0, 1, "out"),
      lerp("maria.hop", W("s1", 5) - 6, W("s1", 5), 1, 0, "in"),
      lerp("maria.ry", W("s1", 5) - 6, W("s1", 5) + 2, 1.1, 0, "inOut", "rad"),
      spring("maria.shock", W("s1", 10), W("s1", 10) + 16, 0, 1, 7),
      lerp("maria.shock", W("s1", 10) + 16, W("s1", 10) + 26, 1, 0.3, "inOut"),
      lerp("maria.sad", W("s1", 12), W("s1", 12) + 10, 0, 1, "inOut"),
      lerp("vignette.red", W("s1", 10), W("s1", 10) + 8, 0, 0.45, "out"),
      lerp("vignette.red", end(0) - 8, end(0), 0.45, 0, "in"),
    ],
    badges: [],
    bigWords: [{ text: "CONFIRMA!", at: 6, until: W("s1", 4), color: G, size: 170, y: 1000, tilt: -5 }],
    labels: [{ text: "DONA MARIA", point: MARIA_HEAD, at: W("s1", 3), until: W("s1", 5) - 4, off: [-60, -130], accent: GOLD }],
    chat: { title: "GRUPO DA FAMÍLIA", at: W("s1", 5) - 4, until: end(0), y: 260, msgs: [{ who: "Tia Cida", text: RUMOR, at: W("s1", 5), fwd: true }] },
    highlights: ["MARIA", "PERDER", "APOSENTADORIA", "VOTOU", "FLÁVIO", "BOLSONARO"],
    captions: [{ text: "Essa é a dona Maria. Disseram pra ela que ia perder a aposentadoria só porque votou no Flávio Bolsonaro!", from: voLocal("s1"), to: end(0) }],
    audioCues: [narration("s1", "ready"), sfx("urna", 5, 0.32), sfx("pop", W("s1", 3), 0.18), sfx("plim", W("s1", 5), 0.3), sfx("boo", W("s1", 10), 0.2), sfx("boing", W("s1", 10) + 2, 0.18)],
  },
  // ------------------------------------------------------------------ s2 · será?
  {
    id: "scene-02-sera",
    startFrame: sc(1).from,
    durationInFrames: sc(1).durationInFrames,
    voKey: "s2",
    narration: "Será que é verdade? Calma que eu te explico.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.plaza), key(end(1), P.plazaLow, "linear")] },
    objects: [...SYSTEM(), TIA, URNA],
    animations: [
      ...whip(0),
      lerp("tia.laugh", 2, 8, 0, 1, "out"),
      lerp("tia.laugh", W("s2", 4), W("s2", 4) + 6, 1, 0, "in"),
      lerp("maria.hop", W("s2", 4), W("s2", 4) + 4, 0, 1, "out"),
      lerp("maria.hop", end(1) - 4, end(1), 1, 0, "in"),
    ],
    badges: [{ text: "SERÁ QUE É VERDADE?", variant: "warning", icon: "?", appearAt: W("s2", 0), disappearAt: end(1) }],
    bigWords: [{ text: "SERÁ?", at: W("s2", 0), until: W("s2", 4), color: Y, size: 220, y: 480, tilt: -6 }],
    labels: [{ text: "TIA DO GRUPO", point: [-0.35, 1.95, -1.05], at: W("s2", 4), until: end(1), off: [-40, -120], accent: "#ff8fc1" }],
    highlights: ["VERDADE", "CALMA", "EXPLICO"],
    captions: [{ text: "Será que é verdade? Calma que eu te explico.", from: voLocal("s2"), to: end(1) }],
    audioCues: [narration("s2", "ready"), sfx("whoosh", 0, 0.22), sfx("scratch", 2, 0.3), sfx("pop", 4, 0.18)],
  },
  // ------------------------------------------------------------------ s3 · a vida na roça
  {
    id: "scene-03-roca",
    startFrame: sc(2).from,
    durationInFrames: sc(2).durationInFrames,
    voKey: "s3",
    narration: "A dona Maria trabalhou na roça a vida inteira, plantando feijão e criando galinha.",
    camera: { projection: "perspective", movement: "orbit", keys: [key(0, P.homeWide), key(W("s3", 5), P.home, "soft"), key(W("s3", 9), P.corn, "soft"), key(W("s3", 12) - 2, P.corn), key(W("s3", 12) + 6, P.chickens, "out"), key(end(2), P.chickens)] },
    objects: [...SYSTEM(), o("chickens", "galinhas")],
    animations: [
      ...whip(0),
      lerp("maria.dx", 0, 1, FX, FX),
      lerp("maria.dz", 0, 1, FZ, FZ),
      lerp("maria.ry", 0, 1, 0, 0, "linear", "rad"),
      lerp("maria.sad", 0, 1, 0, 0),
      lerp("maria.shock", 0, 1, 0, 0),
      lerp("maria.wave", W("s3", 2), W("s3", 2) + 8, 0, 1, "out"),
      lerp("maria.wave", W("s3", 5), W("s3", 5) + 8, 1, 0, "inOut"),
    ],
    badges: [{ text: "TRABALHO RURAL", variant: "info", appearAt: W("s3", 3), disappearAt: end(2) }],
    bigWords: [
      { text: "FEIJÃO", at: W("s3", 10), until: W("s3", 12), color: GOLD, size: 170, y: 460, tilt: -5 },
      { text: "GALINHA!", at: W("s3", 13), until: end(2), color: "#ffffff", size: 170, y: 460, tilt: 5 },
    ],
    labels: [{ text: "VIDA NA ROÇA", point: MARIA_FARM_HEAD, at: W("s3", 2), until: W("s3", 9), off: [0, -120], accent: G }],
    highlights: ["MARIA", "ROÇA", "VIDA", "INTEIRA", "FEIJÃO", "GALINHA"],
    captions: [{ text: "A dona Maria trabalhou na roça a vida inteira, plantando feijão e criando galinha.", from: voLocal("s3"), to: end(2) }],
    audioCues: [narration("s3", "ready"), sfx("whoosh", 0, 0.22), sfx("badge", W("s3", 3), 0.2), sfx("pop", W("s3", 10), 0.2), sfx("boing", W("s3", 13), 0.22)],
  },
  // ------------------------------------------------------------------ s4 · 55 anos + 15 anos de roça = aposentada
  {
    id: "scene-04-aposentou",
    startFrame: sc(3).from,
    durationInFrames: sc(3).durationInFrames,
    voKey: "s4",
    narration: "Com 55 anos, ela provou mais de 15 anos de trabalho rural e se aposentou: um salário mínimo por mês.",
    camera: { projection: "perspective", movement: "orbit", keys: [key(0, P.mariaFarm), key(W("s4", 6) - 2, P.mariaFarm), key(W("s4", 6) + 6, P.corn, "soft"), key(W("s4", 12) - 2, P.corn), key(W("s4", 12) + 6, P.home, "out"), key(end(3), P.home)] },
    objects: [...SYSTEM(), o("chickens", "galinhas")],
    animations: [
      ...whip(0),
      spring("maria.ok", W("s4", 1), W("s4", 1) + 18, 0, 1, 7),
      lerp("maria.ok", W("s4", 6) - 4, W("s4", 6), 1, 0, "in"),
      ...flash(W("s4", 12), 0.5),
      ...punch(W("s4", 12), 0.7),
      lerp("confetti", W("s4", 12), W("s4", 12) + 8, 0, 1, "out"),
      lerp("maria.dance", W("s4", 12) + 4, W("s4", 12) + 10, 0, 1, "out"),
    ],
    badges: [{ text: "1 SALÁRIO MÍNIMO POR MÊS", variant: "positive", appearAt: W("s4", 13), disappearAt: end(3) }],
    bigWords: [
      { text: "55 ANOS", at: W("s4", 1), until: W("s4", 6) - 2, color: GOLD, size: 190, y: 1000, tilt: -5 },
      { text: "15 ANOS NA ROÇA", at: W("s4", 6), until: W("s4", 12) - 2, color: G, size: 120, y: 460, tilt: -4 },
      { text: "APOSENTADA!", at: W("s4", 12), until: end(3), color: GOLD, size: 150, y: 460, tilt: -5 },
    ],
    highlights: ["55", "ANOS", "15", "TRABALHO", "RURAL", "APOSENTOU", "SALÁRIO", "MÍNIMO", "MÊS"],
    captions: [
      { text: "Com 55 anos, ela provou mais de 15 anos de trabalho rural", from: voLocal("s4"), to: W("s4", 10) + 4 },
      { text: "e se aposentou: um salário mínimo por mês.", from: W("s4", 10) + 4, to: end(3) },
    ],
    audioCues: [narration("s4", "ready"), sfx("whoosh", 0, 0.22), sfx("ding", W("s4", 1), 0.22), sfx("whoosh-soft", W("s4", 6), 0.2), sfx("cash", W("s4", 12), 0.3), sfx("airhorn", W("s4", 12) + 2, 0.18), sfx("badge", W("s4", 13), 0.2)],
  },
  // ------------------------------------------------------------------ s5 · é a lei; voto não entra na conta → FAKE
  {
    id: "scene-05-lei",
    startFrame: sc(4).from,
    durationInFrames: sc(4).durationInFrames,
    voKey: "s5",
    narration: "Quem garante esse benefício é a lei: idade e tempo de roça. Voto não entra nessa conta.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.home), key(W("s5", 11), P.mariaFarm, "soft"), key(W("s5", 12), P.mariaFarmLow, "soft"), key(end(4), P.mariaFarmLow)] },
    objects: [...SYSTEM(), o("chickens", "galinhas")],
    animations: [
      ...whip(0),
      lerp("confetti", 0, 8, 1, 0, "in"),
      lerp("maria.dance", 0, 8, 1, 0, "inOut"),
      spring("maria.ok", W("s5", 7), W("s5", 7) + 18, 0, 1, 7),
      lerp("maria.ok", W("s5", 12) - 6, W("s5", 12), 1, 0, "in"),
      lerp("maria.thumb", W("s5", 13) + 6, W("s5", 13) + 14, 0, 1, "out"),
    ],
    badges: [
      { text: "IDADE", variant: "positive", appearAt: W("s5", 7), disappearAt: W("s5", 9) },
      { text: "+ TEMPO DE ROÇA", variant: "positive", appearAt: W("s5", 9), disappearAt: W("s5", 12) - 6 },
    ],
    bigWords: [{ text: "É A LEI!", at: W("s5", 6), until: W("s5", 7) + 6, color: GOLD, size: 200, y: 460, tilt: -5 }],
    chat: { title: "GRUPO DA FAMÍLIA", at: W("s5", 12) - 6, until: end(4), y: 260, fakeAt: W("s5", 13) + 2, msgs: [{ who: "Tia Cida", text: RUMOR, at: W("s5", 12) - 4, fwd: true }] },
    highlights: ["GARANTE", "BENEFÍCIO", "LEI", "IDADE", "TEMPO", "ROÇA", "VOTO", "NÃO"],
    captions: [
      { text: "Quem garante esse benefício é a lei: idade e tempo de roça.", from: voLocal("s5"), to: W("s5", 12) },
      { text: "Voto não entra nessa conta.", from: W("s5", 12), to: end(4) },
    ],
    audioCues: [narration("s5", "ready"), sfx("whoosh", 0, 0.22), sfx("gavel", W("s5", 6), 0.3), sfx("badge", W("s5", 7), 0.2), sfx("badge", W("s5", 9), 0.2), sfx("plim", W("s5", 12) - 4, 0.24), sfx("stamp", W("s5", 13) + 2, 0.42), sfx("buzz", W("s5", 13) + 3, 0.22)],
  },
  // ------------------------------------------------------------------ s6 · voto secreto + óculos de mito
  {
    id: "scene-06-secreto",
    startFrame: sc(5).from,
    durationInFrames: sc(5).durationInFrames,
    voKey: "s6",
    narration: "E o voto é secreto: o INSS nem sabe em quem a dona Maria votou!",
    camera: { projection: "perspective", movement: "tracking", keys: [key(0, P.urna), key(W("s6", 6), P.urna), key(W("s6", 7) + 2, P.plaza, "out"), key(end(5), P.plaza)] },
    objects: [...SYSTEM(), TIA, URNA],
    animations: [
      ...whip(0),
      lerp("maria.dx", 0, 1, 0, 0),
      lerp("maria.dz", 0, 1, 0, 0),
      lerp("maria.ok", 0, 1, 0, 0),
      lerp("maria.thumb", 0, 1, 0, 0),
      lerp("maria.ry", 0, 1, 1.1, 1.1, "linear", "rad"),
      lerp("urna.press", 0, 1, 0, 0),
      lerp("urna.press", W("s6", 2), W("s6", 2) + 5, 0, 1, "in"),
      lerp("maria.ry", W("s6", 6), W("s6", 6) + 6, 1.1, 0, "inOut", "rad"),
      lerp("maria.shades", W("s6", 7), W("s6", 7) + 10, 0, 1, "in"),
      spring("tia.shock", W("s6", 8), W("s6", 8) + 16, 0, 1, 7),
      lerp("maria.dance", W("s6", 9), W("s6", 9) + 6, 0, 1, "out"),
      ...punch(W("s6", 7) + 10, 0.7),
    ],
    badges: [],
    bigWords: [
      { text: "VOTO SECRETO", at: W("s6", 2), until: W("s6", 7), color: "#ffffff", size: 130, y: 460, tilt: -4 },
      { text: "MITO!", at: W("s6", 8), until: end(5), color: GOLD, size: 200, y: 300, tilt: -6 },
    ],
    highlights: ["VOTO", "SECRETO", "INSS", "NEM", "SABE"],
    captions: [{ text: "E o voto é secreto: o INSS nem sabe em quem a dona Maria votou!", from: voLocal("s6"), to: end(5) }],
    audioCues: [narration("s6", "ready"), sfx("whoosh", 0, 0.22), sfx("urna", W("s6", 2) + 3, 0.28), sfx("whoosh-soft", W("s6", 7), 0.2), sfx("ding", W("s6", 7) + 10, 0.24), sfx("boing", W("s6", 8), 0.2)],
  },
  // ------------------------------------------------------------------ s7 · comenta + siga
  {
    id: "scene-07-final",
    startFrame: sc(6).from,
    durationInFrames: sc(6).durationInFrames,
    voKey: "s7",
    narration: "E você, recebeu esse boato no grupo da família? Comenta aí o que você acha, e siga o Advogado de Bolso em todas as redes!",
    camera: { projection: "perspective", movement: "dolly-out", keys: [key(0, P.plaza), key(W("s7", 15), P.plaza), key(W("s7", 24) + 20, P.final, "inOut"), key(end(6), P.final)] },
    objects: [...SYSTEM(), TIA, URNA],
    animations: [
      lerp("tia.shock", 0, 8, 1, 0, "inOut"),
      lerp("tia.sad", 0, 8, 0, 1, "inOut"),
      spring("comment", W("s7", 9), W("s7", 9) + 22, 0, 1, 8),
      lerp("comment", W("s7", 16) - 4, W("s7", 16) + 4, 1, 0, "in"),
      spring("follow", W("s7", 16), W("s7", 16) + 22, 0, 1, 8),
      lerp("follow", end(6) - 58, end(6) - 50, 1, 0, "in"),
      lerp("confetti", W("s7", 16), W("s7", 16) + 10, 0, 0.7, "out"),
      lerp("confetti", end(6) - 60, end(6) - 40, 0.7, 0, "in"),
      spring("endcard", end(6) - 52, end(6) - 22, 0, 1, 10),
    ],
    badges: [],
    chat: { title: "GRUPO DA FAMÍLIA", at: W("s7", 1), until: W("s7", 9), y: 260, msgs: [{ who: "Tia Cida", text: RUMOR, at: W("s7", 1), fwd: true }, { who: "Você", text: "Recebi! kkkkk", at: W("s7", 4), me: true }] },
    highlights: ["BOATO", "GRUPO", "FAMÍLIA", "COMENTA", "SIGA", "ADVOGADO", "BOLSO", "REDES"],
    captions: [{ text: "E você, recebeu esse boato no grupo da família? Comenta aí o que você acha, e siga o Advogado de Bolso em todas as redes!", from: voLocal("s7"), to: end(6) - 52 }],
    audioCues: [narration("s7", "ready"), sfx("plim", W("s7", 1), 0.24), sfx("plim", W("s7", 4), 0.2), sfx("pop", W("s7", 9), 0.26), sfx("ding", W("s7", 16), 0.22), sfx("final", end(6) - 52, 0.3)],
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
