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

/** Cenário: praça do INSS com a urna, a Ana (grávida, MEI) e o tio do pavê. */
const SYSTEM = (): SceneObject[] => [o("island", "diorama-ilha"), o("inss", "predio-inss"), o("warehouse", "galpao"), o("ana", "ana-gravida-mei"), o("tio", "tio-do-pave")];
const URNA = o("urna", "urna-eletronica");
const ANA_HEAD: Vec3 = [0.75, 1.95, -1.45];
const TIO_HEAD: Vec3 = [-0.35, 2.1, -1.05];
const RUMOR = "Quem votou no Lula vai PERDER o salário-maternidade!!! É pavê ou pa cumê? kkkk";
const CHAT = { title: "GRUPO DA FAMÍLIA", subtitle: "Tio do Pavê, Vó, Tia Cida, +20" };
const TIO_COLOR = "#e67e22";

const P = {
  urna: orbit([1.1, 1.15, -1.6], 5.4, 25, 8),
  anaLow: orbit([0.75, 1.7, -1.45], 5.8, 12, 2),
  ana: orbit([0.75, 1.3, -1.45], 5.6, 0, 4),
  plaza: orbit([0.25, 1.0, -1.35], 13, -6, 7),
  plazaLow: orbit([0.25, 1.45, -1.35], 13, -6, 4),
  tio: orbit([-0.35, 1.45, -1.05], 5.6, -4, 3),
  gavel: orbit([2.4, 0.85, -1.9], 15, 4, 8),
  final: orbit([0.0, 1.4, -1.4], 30, 10, 18),
};

export const scenes: ScenePlan[] = [
  // ------------------------------------------------------------------ s1 · gancho: vota e o tio solta o boato
  {
    id: "scene-01-gancho",
    startFrame: sc(0).from,
    durationInFrames: sc(0).durationInFrames,
    voKey: "s1",
    narration: "Essa é a Ana, grávida de oito meses. Votou no Lula, e o tio do pavê jurou que ela vai perder o salário-maternidade!",
    camera: { projection: "perspective", movement: "tracking", keys: [key(0, P.urna), key(W("s1", 11) - 6, P.urna), key(W("s1", 11) + 2, P.anaLow, "out"), key(end(0), P.anaLow)] },
    objects: [...SYSTEM(), URNA],
    animations: [
      lerp("ana.belly", 0, 1, 1, 1),
      lerp("ana.baby", 0, 1, 0, 0),
      lerp("urna.pop", 0, 1, 1, 1),
      lerp("urna.press", 3, 8, 0, 1, "in"),
      ...punch(8, 0.6),
      lerp("ana.hop", 10, 14, 0, 1, "out"),
      lerp("ana.hop", W("s1", 11) - 6, W("s1", 11), 1, 0, "in"),
      lerp("ana.ry", W("s1", 11) - 6, W("s1", 11) + 2, 1.1, 0, "inOut", "rad"),
      spring("ana.shock", W("s1", 20), W("s1", 20) + 16, 0, 1, 7),
      lerp("ana.shock", W("s1", 20) + 16, end(0), 1, 0.3, "inOut"),
      lerp("ana.sad", W("s1", 21), W("s1", 21) + 8, 0, 1, "inOut"),
    ],
    badges: [],
    bigWords: [{ text: "CONFIRMA!", at: 6, until: W("s1", 4), color: G, size: 170, y: 1000, tilt: -5 }],
    labels: [{ text: "ANA · 8 MESES", point: ANA_HEAD, at: W("s1", 3), until: W("s1", 11) - 4, off: [-60, -130], accent: "#ff7aa8" }],
    chat: { ...CHAT, at: W("s1", 13) - 4, until: end(0), y: 260, msgs: [{ who: "Tio do Pavê", text: RUMOR, at: W("s1", 13), fwd: true, color: TIO_COLOR }] },
    highlights: ["ANA", "GRÁVIDA", "OITO", "MESES", "LULA", "TIO", "PAVÊ", "PERDER", "SALÁRIO-MATERNIDADE"],
    captions: [{ text: "Essa é a Ana, grávida de oito meses. Votou no Lula, e o tio do pavê jurou que ela vai perder o salário-maternidade!", from: voLocal("s1"), to: end(0) }],
    audioCues: [narration("s1", "ready"), sfx("urna", 5, 0.32), sfx("pop", W("s1", 3), 0.18), sfx("plim", W("s1", 13), 0.3), sfx("boo", W("s1", 20), 0.2), sfx("boing", W("s1", 20) + 2, 0.18)],
  },
  // ------------------------------------------------------------------ s2 · será que o tio tá certo?
  {
    id: "scene-02-sera",
    startFrame: sc(1).from,
    durationInFrames: sc(1).durationInFrames,
    voKey: "s2",
    narration: "Será que o tio tá certo? Vamos ver.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.plaza), key(W("s2", 2), P.plaza), key(W("s2", 3) + 4, P.tio, "out"), key(end(1), P.tio)] },
    objects: [...SYSTEM(), URNA],
    animations: [...whip(0), lerp("tio.laugh", 2, 8, 0, 1, "out"), lerp("ana.shock", 0, 6, 0.3, 0, "inOut"), lerp("tio.wave", W("s2", 3), W("s2", 3) + 8, 0, 1, "out")],
    badges: [{ text: "SERÁ QUE O TIO TÁ CERTO?", variant: "warning", icon: "?", appearAt: W("s2", 0), disappearAt: end(1) }],
    bigWords: [{ text: "SERÁ?", at: W("s2", 0), until: W("s2", 3), color: Y, size: 220, y: 480, tilt: -6 }],
    labels: [{ text: "TIO DO PAVÊ", point: TIO_HEAD, at: W("s2", 3) + 2, until: end(1), off: [60, -120], accent: TIO_COLOR }],
    highlights: ["TIO", "CERTO", "VER"],
    captions: [{ text: "Será que o tio tá certo? Vamos ver.", from: voLocal("s2"), to: end(1) }],
    audioCues: [narration("s2", "ready"), sfx("whoosh", 0, 0.22), sfx("scratch", 2, 0.3), sfx("whoosh", W("s2", 3), 0.2)],
  },
  // ------------------------------------------------------------------ s3 · MEI = segurada
  {
    id: "scene-03-mei",
    startFrame: sc(2).from,
    durationInFrames: sc(2).durationInFrames,
    voKey: "s3",
    narration: "A Ana é MEI e paga o INSS todo mês. Então ela é segurada.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.ana), key(end(2), P.anaLow, "inOut")] },
    objects: [...SYSTEM()],
    animations: [
      ...whip(0),
      lerp("tio.laugh", 0, 6, 1, 0, "in"),
      lerp("tio.wave", 0, 6, 1, 0, "in"),
      lerp("ana.sad", 0, 8, 1, 0, "inOut"),
      lerp("ana.wave", W("s3", 3), W("s3", 3) + 8, 0, 1, "out"),
      lerp("ana.wave", W("s3", 9), W("s3", 9) + 8, 1, 0, "inOut"),
      spring("ana.ok", W("s3", 13), W("s3", 13) + 18, 0, 1, 7),
      ...punch(W("s3", 13), 0.6),
    ],
    badges: [{ text: "PAGA O INSS TODO MÊS", variant: "positive", appearAt: W("s3", 5), disappearAt: end(2) }],
    bigWords: [
      { text: "MEI", at: W("s3", 3), until: W("s3", 10), color: GOLD, size: 220, y: 1000, tilt: -5 },
      { text: "SEGURADA!", at: W("s3", 13), until: end(2), color: G, size: 170, y: 1000, tilt: -5 },
    ],
    highlights: ["ANA", "MEI", "PAGA", "INSS", "MÊS", "SEGURADA"],
    captions: [{ text: "A Ana é MEI e paga o INSS todo mês. Então ela é segurada.", from: voLocal("s3"), to: end(2) }],
    audioCues: [narration("s3", "ready"), sfx("whoosh", 0, 0.22), sfx("ding", W("s3", 3), 0.22), sfx("badge", W("s3", 5), 0.2), sfx("ding", W("s3", 13), 0.24)],
  },
  // ------------------------------------------------------------------ s4 · STF 2024: sem carência
  {
    id: "scene-04-stf",
    startFrame: sc(3).from,
    durationInFrames: sc(3).durationInFrames,
    voKey: "s4",
    narration: "E desde 2024, o STF decidiu que MEI não precisa mais cumprir carência pro salário-maternidade.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.gavel), key(end(3), P.gavel)] },
    objects: [...SYSTEM(), o("stageGavel", "martelo-do-stf")],
    animations: [
      ...whip(0),
      lerp("ana.ok", 0, 1, 0, 0),
      spring("gavel.pop", 2, 22, 0, 1, 8),
      lerp("gavel.hit", 0, 1, 0, 0),
      lerp("gavel.hit", W("s4", 5) - 6, W("s4", 5), 0, 1.1, "in"),
      lerp("gavel.hit", W("s4", 5), W("s4", 5) + 8, 1.1, 1, "out"),
      ...flash(W("s4", 5), 0.5),
      lerp("camera.shake", W("s4", 5), W("s4", 5) + 3, 0, 0.7, "out"),
      lerp("camera.shake", W("s4", 5) + 3, W("s4", 5) + 12, 0.7, 0, "in"),
    ],
    badges: [
      { text: "STF · DECISÃO DE 2024", variant: "info", appearAt: W("s4", 2), disappearAt: W("s4", 8) },
      { text: "VALE PRA MEI, AUTÔNOMA E FACULTATIVA", variant: "positive", appearAt: W("s4", 8), disappearAt: end(3) },
    ],
    bigWords: [{ text: "SEM CARÊNCIA!", at: W("s4", 12), until: end(3), color: G, size: 140, y: 460, tilt: -4 }],
    highlights: ["2024", "STF", "DECIDIU", "MEI", "CARÊNCIA", "SALÁRIO-MATERNIDADE"],
    captions: [{ text: "E desde 2024, o STF decidiu que MEI não precisa mais cumprir carência pro salário-maternidade.", from: voLocal("s4"), to: end(3) }],
    audioCues: [narration("s4", "ready"), sfx("whoosh", 0, 0.22), sfx("pop", 4, 0.2), sfx("badge", W("s4", 2), 0.2), sfx("gavel", W("s4", 5), 0.42), sfx("ding", W("s4", 12), 0.24)],
  },
  // ------------------------------------------------------------------ s5 · 120 dias; está na lei → FAKE
  {
    id: "scene-05-120-dias",
    startFrame: sc(4).from,
    durationInFrames: sc(4).durationInFrames,
    voKey: "s5",
    narration: "Ela vai receber, em regra, por 120 dias. Isso tá na lei, e não muda por causa de voto.",
    camera: { projection: "perspective", movement: "tracking", keys: [key(0, P.ana), key(W("s5", 7), P.ana), key(W("s5", 7) + 6, P.anaLow, "out"), key(end(4), P.anaLow)] },
    objects: [...SYSTEM()],
    animations: [
      ...whip(0),
      lerp("ana.belly", 0, 1, 0, 0),
      lerp("ana.baby", 0, 1, 1, 1),
      lerp("ana.hop", 2, 6, 0, 1, "out"),
      lerp("ana.hop", W("s5", 7), W("s5", 7) + 4, 1, 0, "in"),
      ...flash(W("s5", 6), 0.4),
      lerp("confetti", W("s5", 6), W("s5", 6) + 8, 0, 1, "out"),
      lerp("confetti", W("s5", 7), W("s5", 7) + 8, 1, 0, "in"),
    ],
    badges: [{ text: "EM REGRA", variant: "info", appearAt: W("s5", 3), disappearAt: W("s5", 7) }],
    bigWords: [{ text: "120 DIAS", at: W("s5", 6), until: W("s5", 7) + 4, color: GOLD, size: 210, y: 1000, tilt: -5 }],
    chat: { ...CHAT, at: W("s5", 7) + 2, until: end(4), y: 260, fakeAt: W("s5", 12), msgs: [{ who: "Tio do Pavê", text: RUMOR, at: W("s5", 7) + 4, fwd: true, color: TIO_COLOR }] },
    highlights: ["RECEBER", "REGRA", "120", "DIAS", "LEI", "NÃO", "MUDA", "VOTO"],
    captions: [
      { text: "Ela vai receber, em regra, por 120 dias.", from: voLocal("s5"), to: W("s5", 7) },
      { text: "Isso tá na lei, e não muda por causa de voto.", from: W("s5", 7), to: end(4) },
    ],
    audioCues: [narration("s5", "ready"), sfx("whoosh", 0, 0.22), sfx("pop-high", 4, 0.2), sfx("badge", W("s5", 3), 0.2), sfx("cash", W("s5", 6), 0.26), sfx("plim", W("s5", 7) + 4, 0.22), sfx("stamp", W("s5", 12), 0.42), sfx("buzz", W("s5", 12) + 1, 0.22)],
  },
  // ------------------------------------------------------------------ s6 · voto secreto + óculos de mito
  {
    id: "scene-06-secreto",
    startFrame: sc(5).from,
    durationInFrames: sc(5).durationInFrames,
    voKey: "s6",
    narration: "E o voto é secreto: o INSS nem sabe em quem a Ana votou!",
    camera: { projection: "perspective", movement: "tracking", keys: [key(0, P.urna), key(W("s6", 6), P.urna), key(W("s6", 7) + 2, P.plaza, "out"), key(end(5), P.plaza)] },
    objects: [...SYSTEM(), URNA],
    animations: [
      ...whip(0),
      lerp("ana.ry", 0, 1, 1.1, 1.1, "linear", "rad"),
      lerp("urna.press", 0, 1, 0, 0),
      lerp("urna.press", W("s6", 2), W("s6", 2) + 5, 0, 1, "in"),
      lerp("ana.ry", W("s6", 6), W("s6", 6) + 6, 1.1, 0, "inOut", "rad"),
      lerp("ana.shades", W("s6", 7), W("s6", 7) + 10, 0, 1, "in"),
      spring("tio.shock", W("s6", 8), W("s6", 8) + 16, 0, 1, 7),
      lerp("ana.dance", W("s6", 9), W("s6", 9) + 6, 0, 1, "out"),
      ...punch(W("s6", 7) + 10, 0.7),
    ],
    badges: [],
    bigWords: [
      { text: "VOTO SECRETO", at: W("s6", 2), until: W("s6", 7), color: "#ffffff", size: 130, y: 460, tilt: -4 },
      { text: "MITO!", at: W("s6", 8), until: end(5), color: GOLD, size: 200, y: 300, tilt: -6 },
    ],
    highlights: ["VOTO", "SECRETO", "INSS", "NEM", "SABE"],
    captions: [{ text: "E o voto é secreto: o INSS nem sabe em quem a Ana votou!", from: voLocal("s6"), to: end(5) }],
    audioCues: [narration("s6", "ready"), sfx("whoosh", 0, 0.22), sfx("urna", W("s6", 2) + 3, 0.28), sfx("whoosh-soft", W("s6", 7), 0.2), sfx("ding", W("s6", 7) + 10, 0.24), sfx("boing", W("s6", 8), 0.2)],
  },
  // ------------------------------------------------------------------ s7 · comenta + siga
  {
    id: "scene-07-final",
    startFrame: sc(6).from,
    durationInFrames: sc(6).durationInFrames,
    voKey: "s7",
    narration: "E aí, o tio do pavê tá certo? Comenta aí o que você acha, e siga o Advogado de Bolso em todas as redes!",
    camera: { projection: "perspective", movement: "dolly-out", keys: [key(0, P.plazaLow), key(W("s7", 15), P.plazaLow), key(W("s7", 23) + 20, P.final, "inOut"), key(end(6), P.final)] },
    objects: [...SYSTEM(), URNA],
    animations: [
      lerp("tio.shock", 0, 8, 1, 0, "inOut"),
      lerp("tio.sad", 0, 8, 0, 1, "inOut"),
      spring("comment", W("s7", 8), W("s7", 8) + 22, 0, 1, 8),
      lerp("comment", W("s7", 15) - 4, W("s7", 15) + 4, 1, 0, "in"),
      spring("follow", W("s7", 15), W("s7", 15) + 22, 0, 1, 8),
      lerp("follow", end(6) - 58, end(6) - 50, 1, 0, "in"),
      lerp("confetti", W("s7", 15), W("s7", 15) + 10, 0, 0.7, "out"),
      lerp("confetti", end(6) - 60, end(6) - 40, 0.7, 0, "in"),
      spring("endcard", end(6) - 52, end(6) - 22, 0, 1, 10),
    ],
    badges: [],
    chat: { ...CHAT, at: W("s7", 1), until: W("s7", 8), y: 260, msgs: [{ who: "Tio do Pavê", text: RUMOR, at: W("s7", 1), fwd: true, color: TIO_COLOR }, { who: "Ana", text: "Tio, vai comer o pavê e fica quieto kkkkk", at: W("s7", 4), me: true }] },
    highlights: ["TIO", "PAVÊ", "CERTO", "COMENTA", "SIGA", "ADVOGADO", "BOLSO", "REDES"],
    captions: [{ text: "E aí, o tio do pavê tá certo? Comenta aí o que você acha, e siga o Advogado de Bolso em todas as redes!", from: voLocal("s7"), to: end(6) - 52 }],
    audioCues: [narration("s7", "ready"), sfx("plim", W("s7", 1), 0.24), sfx("plim", W("s7", 4), 0.2), sfx("pop", W("s7", 8), 0.26), sfx("ding", W("s7", 15), 0.22), sfx("final", end(6) - 52, 0.3)],
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
