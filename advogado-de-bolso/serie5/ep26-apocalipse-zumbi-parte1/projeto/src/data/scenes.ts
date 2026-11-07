import { evaluateTrack, orbit, type EaseName, type TrackAnimation, type Vec3 } from "../utils/animation";
import { DURATION, FPS, HEIGHT, SCENE_FRAMES, voLocal, WIDTH, wordLocal, type VoKey } from "../utils/timing";

// SÉRIE 5 · Apocalipse Zumbi no INSS (história interativa A/B).
import { L } from "../layout";
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
  /** Escolha final A/B (frames locais). */
  choice?: { at: number; until?: number; a: string; b: string };
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

/** Cenário: noite de apocalipse — INSS, galpão com escada e barricada, Marcos, dona Maria, a advogada de bolso e 5 zumbis. */
const SYSTEM = (): SceneObject[] => [o("island", "diorama-ilha-noite"), o("inss", "predio-inss"), o("warehouse", "galpao"), o("shelf", "estante+escada"), o("marcos", "marcos"), o("vovo", "dona-maria"), o("door", "barricada")];
const ZOMBIES = (): SceneObject[] => ["z1", "z2", "z3", "z4", "z5"].map((id) => o(id, "zumbi"));
const ZS = ["z1", "z2", "z3", "z4", "z5"];
/** Destino de cada zumbi na barricada (deslocamento a partir da posição inicial) e giro pra encarar a porta. */
const ZT: Record<string, { dx: number; dz: number; ry: number }> = {
  z1: { dx: -0.68, dz: -2.25, ry: 1.05 },
  z2: { dx: -1.1, dz: -2.11, ry: 0.85 },
  z3: { dx: 0.3, dz: -1.15, ry: 1.25 },
  z4: { dx: -1.4, dz: -2.45, ry: 0.75 },
  z5: { dx: 0.42, dz: -2.45, ry: 1.35 },
};
/** Empurrão na porta: direção oposta à normal da barricada. */
const PUSH: [number, number] = [-0.87, -0.5];
const LIA = o("liaBig", "advogada-de-bolso");
const QX = 2.2 - L.work[0];
const QZ = -2.5 - L.work[2];
const VOVO_RUN_X = -1.5 - 2.9;
const VOVO_RUN_Z = -1.0 - -2.6;
const MARCOS_Q_HEAD: Vec3 = [2.2, 2.15, -2.5];
const Z4_HEAD: Vec3 = [2.5, 1.62, -0.1];
const ZGREEN = "#b6ff6a";

/** Todos os zumbis: mesma animação com pequeno atraso entre eles. */
const zs = (fn: (id: string, k: number) => TrackAnimation[]): TrackAnimation[] => ZS.flatMap((id, k) => fn(id, k));
/** Zumbis colados na porta, empurrando `amt` (0 = encostados). */
const zPush = (from: number, to: number, a0: number, a1: number): TrackAnimation[] =>
  zs((id, k) => [
    lerp(`${id}.dx`, from + k * 2, to, ZT[id].dx + PUSH[0] * a0 * 0.25, ZT[id].dx + PUSH[0] * a1 * 0.25, "inOut"),
    lerp(`${id}.dz`, from + k * 2, to, ZT[id].dz + PUSH[1] * a0 * 0.25, ZT[id].dz + PUSH[1] * a1 * 0.25, "inOut"),
  ]);

const P = {
  zClose: orbit([0.9, 1.3, 0.6], 2.8, 176, 4),
  zClose2: orbit([0.9, 1.3, 0.3], 3.6, 168, 7),
  queue: orbit([2.5, 1.25, -2.5], 7, 25, 6),
  side: orbit([1.6, 1.1, -1.0], 15, 100, 8),
  z4: orbit([2.5, 1.35, -0.1], 2.8, 195, 5),
  run: orbit([0, 0.8, -1.8], 14, 8, 30),
  ladder: orbit([-2.9, 1.6, -2.1], 10, 32, 12),
  ladderFall: orbit([-2.65, 1.5, -1.6], 8.5, 38, 8),
  ladderLow: orbit([-2.35, 0.7, -1.35], 6.5, 30, 6),
  hurt: orbit([-2.1, 0.9, -1.45], 7, 25, 8),
  hurtLow: orbit([-2.1, 1.3, -1.45], 7, 25, 4),
  vovo: orbit([-1.5, 1.3, -1.0], 5.5, 15, 4),
  vovoLow: orbit([-1.5, 1.5, -1.0], 6, 15, 2),
  safe: orbit([-0.5, 1.2, -1.3], 9.5, -80, 20),
  safeLow: orbit([-0.5, 1.3, -1.3], 8.5, -78, 13),
  vovo11: orbit([-1.5, 2.05, -1.0], 6, 15, 2),
  choice: orbit([-0.6, 1.4, -1.0], 16, 0, 12),
  group: orbit([-1.2, 1.1, -1.35], 11, 15, 8),
  lia: orbit([-1.95, 0.9, -0.35], 6.5, 15, 4),
  roof: orbit([-2.8, 3.0, -4.2], 14, 30, 22),
  piggy: orbit([1.3, 1.4, 2.0], 12, -20, 14),
  final: orbit([-0.6, 1.6, -1.2], 28, 20, 22),
};

export const scenes: ScenePlan[] = [
  // ------------------------------------------------------------------ s1 · dia 1 do apocalipse; Marcos na fila do INSS
  {
    id: "scene-01-gancho",
    startFrame: sc(0).from,
    durationInFrames: sc(0).durationInFrames,
    voKey: "s1",
    narration: "Dia um do apocalipse zumbi. E o Marcos tava justamente... na fila do INSS!",
    camera: { projection: "perspective", movement: "tracking", keys: [key(0, P.zClose), key(W("s1", 5) - 4, P.zClose2, "linear"), key(W("s1", 5) + 4, P.queue, "out"), key(end(0), P.queue)] },
    objects: [...SYSTEM(), ...ZOMBIES()],
    animations: [
      lerp("marcos.spot", 0, 1, 1, 1),
      lerp("marcos.dx", 0, 1, QX, QX),
      lerp("marcos.dz", 0, 1, QZ, QZ),
      lerp("marcos.ry", 0, 1, 0, 0, "linear", "rad"),
      lerp("marcos.climb", 0, 1, 0, 0, "linear", "u3d"),
      lerp("marcos.fall", 0, 1, 0, 0),
      lerp("marcos.recover", 0, 1, 0, 0),
      lerp("lia.pop", 0, 1, 0, 0),
      lerp("vovo.dx", 0, 1, 0, 0),
      lerp("vovo.dz", 0, 1, 0, 0),
      lerp("liaBig.pop", 0, 1, 0, 0),
      lerp("door.push", 0, 1, 0, 0),
      lerp("door.lean", 0, 1, 0, 0),
      ...zs((id, k) => [lerp(`${id}.ry`, 0, 1, 0, 0, "linear", "rad"), lerp(`${id}.dx`, 0, 1, 0, 0), lerp(`${id}.dz`, k, end(0), 0, -0.5, "linear")]),
      ...flash(2, 0.5),
      lerp("camera.shake", 2, 5, 0, 0.7, "out"),
      lerp("camera.shake", 5, 14, 0.7, 0, "in"),
      ...whip(W("s1", 5)),
      lerp("marcos.scratch", W("s1", 9), W("s1", 9) + 8, 0, 1, "out"),
    ],
    badges: [],
    bigWords: [
      { text: "DIA 1", at: 2, until: W("s1", 3), color: ZGREEN, size: 220, y: 1000, tilt: -6 },
      { text: "APOCALIPSE ZUMBI", at: W("s1", 3), until: W("s1", 5), color: ZGREEN, size: 110, y: 1000, tilt: -4 },
      { text: "NA FILA DO INSS!", at: W("s1", 10), until: end(0), color: GOLD, size: 120, y: 460, tilt: -5 },
    ],
    labels: [{ text: "MARCOS", point: MARCOS_Q_HEAD, at: W("s1", 7), until: W("s1", 10), off: [-40, -110], accent: GOLD }],
    highlights: ["DIA", "APOCALIPSE", "ZUMBI", "MARCOS", "FILA", "INSS"],
    captions: [{ text: "Dia um do apocalipse zumbi. E o Marcos tava justamente... na fila do INSS!", from: voLocal("s1"), to: end(0) }],
    audioCues: [narration("s1", "ready"), sfx("zumbi", 0, 0.5), sfx("thunder", 1, 0.3), sfx("whoosh", W("s1", 5), 0.22), sfx("pop", W("s1", 7), 0.18), sfx("scratch", W("s1", 10), 0.22)],
  },
  // ------------------------------------------------------------------ s2 · gemendo: "a senha do gov.br!"
  {
    id: "scene-02-senha",
    startFrame: sc(1).from,
    durationInFrames: sc(1).durationInFrames,
    voKey: "s2",
    narration: "Os zumbis chegaram arrastando o pé e gemendo uma coisa só: a senha do gov ponto br!",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.side), key(end(1), P.side, "linear")] },
    objects: [...SYSTEM(), ...ZOMBIES()],
    animations: [
      ...whip(0),
      lerp("marcos.scratch", 0, 6, 1, 0, "in"),
      ...zs((id, k) => [lerp(`${id}.dz`, k, end(1), -0.5, -1.0, "linear")]),
      spring("marcos.shock", W("s2", 1), W("s2", 1) + 16, 0, 1, 7),
      lerp("marcos.shock", W("s2", 1) + 16, W("s2", 1) + 26, 1, 0.2, "inOut"),
      spring("vovo.shock", W("s2", 1) + 3, W("s2", 1) + 19, 0, 1, 7),
      lerp("vovo.shock", W("s2", 1) + 19, W("s2", 1) + 29, 1, 0.2, "inOut"),
      ...punch(W("s2", 12), 0.7),
    ],
    badges: [],
    bigWords: [{ text: "SENHA DO GOV.BR!", at: W("s2", 12), until: end(1), color: ZGREEN, size: 120, y: 460, tilt: -5 }],
    highlights: ["ZUMBIS", "ARRASTANDO", "GEMENDO", "SENHA", "GOV", "BR"],
    captions: [{ text: "Os zumbis chegaram arrastando o pé e gemendo uma coisa só: a senha do gov ponto br!", from: voLocal("s2"), to: end(1) }],
    audioCues: [narration("s2", "ready"), sfx("whoosh", 0, 0.2), sfx("zumbi", W("s2", 7) - 4, 0.42), sfx("boing", W("s2", 1), 0.16), sfx("zumbi", W("s2", 12), 0.3)],
  },
  // ------------------------------------------------------------------ s3 · "cadê meu décimo terceiro!"
  {
    id: "scene-03-13",
    startFrame: sc(2).from,
    durationInFrames: sc(2).durationInFrames,
    voKey: "s3",
    narration: "Um deles ainda gritou: cadê meu décimo terceiro!",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.z4), key(end(2), P.z4, "linear")] },
    objects: [...SYSTEM(), ...ZOMBIES()],
    animations: [...whip(0), lerp("z4.hop", W("s3", 4), W("s3", 4) + 4, 0, 1, "out"), lerp("z4.hop", end(2) - 6, end(2), 1, 0, "in"), ...punch(W("s3", 4), 0.6)],
    badges: [],
    bigWords: [{ text: "CADÊ MEU 13º?!", at: W("s3", 4), until: end(2), color: GOLD, size: 150, y: 460, tilt: 5 }],
    labels: [{ text: "ZUMBI DO 13º", point: Z4_HEAD, at: W("s3", 0), until: W("s3", 4), off: [-60, -110], accent: ZGREEN }],
    highlights: ["DÉCIMO", "TERCEIRO"],
    captions: [{ text: "Um deles ainda gritou: cadê meu décimo terceiro!", from: voLocal("s3"), to: end(2) }],
    audioCues: [narration("s3", "ready"), sfx("whoosh", 0, 0.2), sfx("zumbi", W("s3", 3), 0.36), sfx("boing", W("s3", 4), 0.2)],
  },
  // ------------------------------------------------------------------ s4 · a fuga pro galpão
  {
    id: "scene-04-fuga",
    startFrame: sc(3).from,
    durationInFrames: sc(3).durationInFrames,
    voKey: "s4",
    narration: "O Marcos pegou a dona Maria, de 70 anos, e correu pro galpão do lado.",
    camera: { projection: "perspective", movement: "tracking", keys: [key(0, P.queue), key(W("s4", 8) - 4, P.queue), key(W("s4", 8) + 8, P.run, "out"), key(end(3), P.run)] },
    objects: [...SYSTEM(), ...ZOMBIES()],
    animations: [
      ...whip(0),
      lerp("marcos.shock", 0, 6, 0.2, 0, "inOut"),
      lerp("vovo.shock", 0, 6, 0.2, 0, "inOut"),
      lerp("vovo.wave", W("s4", 2), W("s4", 2) + 6, 0, 1, "out"),
      lerp("vovo.wave", W("s4", 8), W("s4", 8) + 4, 1, 0, "in"),
      lerp("marcos.ry", W("s4", 8) - 4, W("s4", 8) + 2, 0, -Math.PI / 2, "out", "rad"),
      lerp("vovo.ry", W("s4", 8) - 4, W("s4", 8) + 2, 0, -1.0, "out", "rad"),
      lerp("marcos.dx", W("s4", 8), end(3) - 2, QX, 0, "inOut"),
      lerp("marcos.dz", W("s4", 8), end(3) - 2, QZ, 0, "inOut"),
      lerp("vovo.dx", W("s4", 8) + 3, end(3), 0, VOVO_RUN_X, "inOut"),
      lerp("vovo.dz", W("s4", 8) + 3, end(3), 0, VOVO_RUN_Z, "inOut"),
      ...zs((id, k) => [
        lerp(`${id}.ry`, W("s4", 8) + k * 2, W("s4", 8) + 12 + k * 2, 0, ZT[id].ry, "inOut", "rad"),
        lerp(`${id}.dx`, W("s4", 9) + k * 2, end(3), 0, ZT[id].dx * 0.55, "linear"),
        lerp(`${id}.dz`, W("s4", 9) + k * 2, end(3), -1.0, -1.0 + (ZT[id].dz + 1.0) * 0.55, "linear"),
      ]),
      lerp("speed", W("s4", 8), W("s4", 8) + 6, 0, 0.7, "out"),
      lerp("speed", end(3) - 10, end(3), 0.7, 0, "in"),
    ],
    badges: [],
    bigWords: [{ text: "CORRE!", at: W("s4", 8), until: end(3), color: R, size: 220, y: 460, tilt: -7 }],
    labels: [{ text: "DONA MARIA · 70 ANOS", point: [2.9, 1.85, -2.6], at: W("s4", 4), until: W("s4", 8), off: [-60, -110], accent: "#c9b1e3" }],
    highlights: ["MARCOS", "MARIA", "70", "ANOS", "CORREU", "GALPÃO"],
    captions: [{ text: "O Marcos pegou a dona Maria, de 70 anos, e correu pro galpão do lado.", from: voLocal("s4"), to: end(3) }],
    audioCues: [narration("s4", "ready"), sfx("whoosh", 0, 0.2), sfx("pop", W("s4", 4), 0.18), sfx("whoosh-big", W("s4", 8), 0.28), sfx("zumbi", W("s4", 10), 0.3)],
  },
  // ------------------------------------------------------------------ s5 · sobe na escada... e cai
  {
    id: "scene-05-tombo",
    startFrame: sc(4).from,
    durationInFrames: sc(4).durationInFrames,
    voKey: "s5",
    narration: "Pra trancar a porta de cima, ele subiu na escada... e caiu!",
    camera: { projection: "perspective", movement: "vertical", keys: [key(0, P.ladder), key(W("s5", 9), P.ladder), key(W("s5", 10), P.ladderFall, "soft"), key(end(4), P.ladderLow, "out")] },
    objects: [...SYSTEM(), ...ZOMBIES()],
    animations: [
      ...whip(0),
      lerp("marcos.ry", 0, 6, -Math.PI / 2, 0, "inOut", "rad"),
      lerp("vovo.ry", 0, 6, -1.0, 0.6, "inOut", "rad"),
      ...zs((id, k) => [lerp(`${id}.dx`, 0, W("s5", 9) + k * 3, ZT[id].dx * 0.55, ZT[id].dx, "linear"), lerp(`${id}.dz`, 0, W("s5", 9) + k * 3, -1.0 + (ZT[id].dz + 1.0) * 0.55, ZT[id].dz, "linear")]),
      lerp("marcos.climb", W("s5", 7) - 6, W("s5", 9) + 6, 0, 1.2, "inOut", "u3d"),
      lerp("ladder.wobble", W("s5", 9) + 6, W("s5", 9) + 12, 0, 1, "linear"),
      lerp("ladder.wobble", W("s5", 9) + 12, W("s5", 9) + 16, 1, 0, "out"),
      lerp("ladder.slide", W("s5", 9) + 12, W("s5", 9) + 24, 0, 1, "in"),
      lerp("marcos.fall", W("s5", 10) - 2, end(4) - 4, 0, 1, "in"),
      ...flash(end(4) - 4, 0.8),
      lerp("camera.shake", end(4) - 4, end(4), 0, 1, "out"),
      lerp("dizzy.stars", end(4) - 2, end(4), 0, 1, "out"),
    ],
    badges: [],
    bigWords: [{ text: "TOMBO!", at: end(4) - 4, until: end(4), color: R, size: 200, y: 460, tilt: -8 }],
    highlights: ["TRANCAR", "PORTA", "SUBIU", "ESCADA", "CAIU"],
    captions: [{ text: "Pra trancar a porta de cima, ele subiu na escada... e caiu!", from: voLocal("s5"), to: end(4) }],
    audioCues: [narration("s5", "ready"), sfx("whoosh", 0, 0.2), sfx("boing", W("s5", 9) + 8, 0.24), sfx("whoosh-big", W("s5", 10), 0.24), sfx("thud", end(4) - 4, 0.4), sfx("crack", end(4) - 3, 0.24)],
  },
  // ------------------------------------------------------------------ s6 · tombo de novela; os zumbis aplaudem
  {
    id: "scene-06-aplausos",
    startFrame: sc(5).from,
    durationInFrames: sc(5).durationInFrames,
    voKey: "s6",
    narration: "Tombo de novela. Até os zumbis aplaudiram.",
    camera: { projection: "perspective", movement: "tracking", keys: [key(0, P.ladderLow), key(W("s6", 3) - 4, P.ladderLow), key(W("s6", 3) + 4, P.safe, "out"), key(end(5), P.safeLow, "linear")] },
    objects: [...SYSTEM(), ...ZOMBIES()],
    animations: [
      lerp("camera.shake", 0, 10, 1, 0, "in"),
      lerp("dizzy.stars", 0, 1, 1, 1),
      ...zs((id, k) => [lerp(`${id}.hop`, W("s6", 5) + k * 2, W("s6", 5) + 4 + k * 2, 0, 1, "out"), lerp(`${id}.shrug`, W("s6", 5) + k * 2, W("s6", 5) + 6 + k * 2, 0, 1, "out")]),
    ],
    badges: [],
    bigWords: [
      { text: "TOMBO DE NOVELA", at: 2, until: W("s6", 3), color: GOLD, size: 120, y: 460, tilt: -5 },
      { text: "PLAC PLAC PLAC", at: W("s6", 5), until: end(5), color: ZGREEN, size: 130, y: 460, tilt: 5 },
    ],
    highlights: ["TOMBO", "NOVELA", "ZUMBIS", "APLAUDIRAM"],
    captions: [{ text: "Tombo de novela. Até os zumbis aplaudiram.", from: voLocal("s6"), to: end(5) }],
    audioCues: [narration("s6", "ready"), sfx("whoosh", W("s6", 3), 0.2), sfx("aplausos", W("s6", 5), 0.3)],
  },
  // ------------------------------------------------------------------ s7 · perna machucada → auxílio por incapacidade temporária
  {
    id: "scene-07-incapacidade",
    startFrame: sc(6).from,
    durationInFrames: sc(6).durationInFrames,
    voKey: "s7",
    narration: "Machucou a perna. E agora? Se ele ficar mais de 15 dias sem poder trabalhar, pode pedir o auxílio por incapacidade temporária, o antigo auxílio-doença.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.hurt), key(end(6), P.hurtLow, "linear")] },
    objects: [...SYSTEM(), ...ZOMBIES()],
    animations: [
      ...whip(0),
      ...zs((id) => [lerp(`${id}.hop`, 0, 4, 1, 0, "in"), lerp(`${id}.shrug`, 0, 6, 1, 0, "in")]),
      lerp("dizzy.stars", W("s7", 3), W("s7", 3) + 6, 1, 0, "in"),
      lerp("marcos.sad", W("s7", 0), W("s7", 0) + 8, 0, 1, "inOut"),
      lerp("vovo.wave", W("s7", 3), W("s7", 3) + 8, 0, 1, "out"),
      lerp("vovo.wave", W("s7", 10), W("s7", 10) + 6, 1, 0, "in"),
      ...punch(W("s7", 10), 0.6),
    ],
    badges: [
      { text: "PERNA MACHUCADA", variant: "negative", appearAt: W("s7", 0), disappearAt: W("s7", 5) },
      { text: "MAIS DE 15 DIAS SEM TRABALHAR?", variant: "warning", appearAt: W("s7", 5), disappearAt: W("s7", 17) },
      { text: "AUXÍLIO POR INCAPACIDADE TEMPORÁRIA", variant: "positive", subtitle: "o antigo auxílio-doença", appearAt: W("s7", 17), disappearAt: end(6) },
    ],
    bigWords: [{ text: "15 DIAS", at: W("s7", 10), until: W("s7", 17), color: GOLD, size: 200, y: 460, tilt: -5 }],
    highlights: ["MACHUCOU", "PERNA", "15", "DIAS", "TRABALHAR", "AUXÍLIO", "INCAPACIDADE", "TEMPORÁRIA", "AUXÍLIO-DOENÇA"],
    captions: [
      { text: "Machucou a perna. E agora? Se ele ficar mais de 15 dias sem poder trabalhar,", from: voLocal("s7"), to: W("s7", 14) },
      { text: "pode pedir o auxílio por incapacidade temporária, o antigo auxílio-doença.", from: W("s7", 14), to: end(6) },
    ],
    audioCues: [narration("s7", "ready"), sfx("whoosh", 0, 0.2), sfx("badge", W("s7", 0), 0.2), sfx("tick", W("s7", 10), 0.22), sfx("ding", W("s7", 17), 0.22)],
  },
  // ------------------------------------------------------------------ s8 · acidente: sem carência; sequela → auxílio-acidente
  {
    id: "scene-08-carencia",
    startFrame: sc(7).from,
    durationInFrames: sc(7).durationInFrames,
    voKey: "s8",
    narration: "E como foi acidente, nem precisa cumprir carência. Se ficar sequela, ainda pode vir o auxílio-acidente.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.hurtLow), key(end(7), P.hurt, "linear")] },
    objects: [...SYSTEM(), ...ZOMBIES()],
    animations: [
      ...whip(0),
      lerp("marcos.sad", W("s8", 4), W("s8", 4) + 8, 1, 0, "inOut"),
      lerp("marcos.thumb", W("s8", 4), W("s8", 4) + 8, 0, 1, "out"),
      ...punch(W("s8", 4), 0.6),
    ],
    badges: [
      { text: "ACIDENTE: NÃO PRECISA DE CARÊNCIA", variant: "positive", appearAt: W("s8", 4), disappearAt: W("s8", 8) },
      { text: "FICOU SEQUELA?", variant: "warning", subtitle: "aí pode vir o auxílio-acidente", appearAt: W("s8", 8), disappearAt: end(7) },
    ],
    bigWords: [
      { text: "SEM CARÊNCIA!", at: W("s8", 4), until: W("s8", 8), color: G, size: 150, y: 460, tilt: -5 },
      { text: "AUXÍLIO-ACIDENTE", at: W("s8", 15), until: end(7), color: GOLD, size: 110, y: 460, tilt: -4 },
    ],
    highlights: ["ACIDENTE", "CARÊNCIA", "SEQUELA", "AUXÍLIO-ACIDENTE"],
    captions: [
      { text: "E como foi acidente, nem precisa cumprir carência.", from: voLocal("s8"), to: W("s8", 8) },
      { text: "Se ficar sequela, ainda pode vir o auxílio-acidente.", from: W("s8", 8), to: end(7) },
    ],
    audioCues: [narration("s8", "ready"), sfx("whoosh", 0, 0.2), sfx("ding", W("s8", 4), 0.22), sfx("badge", W("s8", 8), 0.2), sfx("coin", W("s8", 15), 0.22)],
  },
  // ------------------------------------------------------------------ s9 · a dona Maria e o BPC
  {
    id: "scene-09-bpc",
    startFrame: sc(8).from,
    durationInFrames: sc(8).durationInFrames,
    voKey: "s9",
    narration: "E a dona Maria? Recebe o BPC sem nunca ter contribuído, porque tem mais de 65 anos e baixa renda. Nem zumbi tira isso dela.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.vovo), key(end(8), P.vovoLow, "linear")] },
    objects: [...SYSTEM(), ...ZOMBIES()],
    animations: [
      ...whip(0),
      lerp("marcos.thumb", 0, 6, 1, 0, "in"),
      spring("vovo.ok", W("s9", 6), W("s9", 6) + 18, 0, 1, 7),
      lerp("vovo.ok", W("s9", 19) - 6, W("s9", 19), 1, 0, "in"),
      lerp("vovo.shades", W("s9", 19), W("s9", 19) + 10, 0, 1, "in"),
      lerp("vovo.hop", W("s9", 21), W("s9", 21) + 4, 0, 1, "out"),
      lerp("vovo.hop", end(8) - 4, end(8), 1, 0, "in"),
    ],
    badges: [
      { text: "SEM NUNCA TER CONTRIBUÍDO", variant: "positive", appearAt: W("s9", 7), disappearAt: W("s9", 11) },
      { text: "65 ANOS OU MAIS + BAIXA RENDA", variant: "info", appearAt: W("s9", 11), disappearAt: W("s9", 19) },
    ],
    bigWords: [
      { text: "BPC", at: W("s9", 6), until: W("s9", 11), color: GOLD, size: 230, y: 460, tilt: -5 },
      { text: "NEM ZUMBI TIRA!", at: W("s9", 19), until: end(8), color: ZGREEN, size: 130, y: 460, tilt: -5 },
    ],
    highlights: ["MARIA", "BPC", "NUNCA", "CONTRIBUÍDO", "65", "ANOS", "BAIXA", "RENDA", "ZUMBI"],
    captions: [
      { text: "E a dona Maria? Recebe o BPC sem nunca ter contribuído,", from: voLocal("s9"), to: W("s9", 11) },
      { text: "porque tem mais de 65 anos e baixa renda. Nem zumbi tira isso dela.", from: W("s9", 11), to: end(8) },
    ],
    audioCues: [narration("s9", "ready"), sfx("whoosh", 0, 0.2), sfx("ding", W("s9", 6), 0.22), sfx("badge", W("s9", 11), 0.2), sfx("airhorn", W("s9", 19) + 10, 0.16)],
  },
  // ------------------------------------------------------------------ s10 · zumbi na janela pede o código
  {
    id: "scene-10-janela",
    startFrame: sc(9).from,
    durationInFrames: sc(9).durationInFrames,
    voKey: "s10",
    narration: "Aí um zumbi bateu na janela e mandou mensagem: me passa o código que chegou no seu celular!",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.safe), key(W("s10", 8), P.safeLow, "soft"), key(end(9), P.safeLow)] },
    objects: [...SYSTEM(), ...ZOMBIES()],
    animations: [
      ...whip(0),
      lerp("vovo.hop", 0, 1, 0, 0),
      lerp("door.push", W("s10", 3), W("s10", 3) + 3, 0, 1.2, "out"),
      lerp("door.push", W("s10", 3) + 3, W("s10", 3) + 16, 1.2, 0, "in"),
      lerp("z5.hop", W("s10", 3) - 2, W("s10", 3) + 2, 0, 1, "out"),
      lerp("z5.hop", W("s10", 3) + 8, W("s10", 3) + 12, 1, 0, "in"),
      lerp("camera.shake", W("s10", 3), W("s10", 3) + 3, 0, 0.6, "out"),
      lerp("camera.shake", W("s10", 3) + 3, W("s10", 3) + 10, 0.6, 0, "in"),
      spring("vovo.shock", W("s10", 3), W("s10", 3) + 14, 0.2, 0.8, 7),
      lerp("vovo.shock", W("s10", 3) + 14, end(9), 0.8, 0, "inOut"),
    ],
    badges: [],
    chat: { title: "ZUMBI DESCONHECIDO", subtitle: "online agora", at: W("s10", 6), until: end(9), y: 260, msgs: [{ who: "Zumbi", text: "Me passa o código que chegou no seu celular...", at: W("s10", 8), color: "#2e7d32" }] },
    highlights: ["ZUMBI", "JANELA", "MENSAGEM", "CÓDIGO", "CELULAR"],
    captions: [{ text: "Aí um zumbi bateu na janela e mandou mensagem: me passa o código que chegou no seu celular!", from: voLocal("s10"), to: end(9) }],
    audioCues: [narration("s10", "ready"), sfx("whoosh", 0, 0.2), sfx("bang", W("s10", 3), 0.36), sfx("plim", W("s10", 8), 0.28), sfx("zumbi", W("s10", 12), 0.26)],
  },
  // ------------------------------------------------------------------ s11 · "nem morta!" → GOLPE
  {
    id: "scene-11-golpe",
    startFrame: sc(10).from,
    durationInFrames: sc(10).durationInFrames,
    voKey: "s11",
    narration: "A dona Maria gritou: nem morta! Código e senha, nunca!",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.vovo11), key(end(10), P.vovo11)] },
    objects: [...SYSTEM(), ...ZOMBIES()],
    animations: [spring("vovo.shock", W("s11", 4), W("s11", 4) + 14, 0, 1, 7), lerp("vovo.shock", W("s11", 4) + 14, end(10), 1, 0, "inOut"), ...punch(W("s11", 4), 0.8)],
    badges: [{ text: "NUNCA PASSE CÓDIGO NEM SENHA", variant: "negative", appearAt: W("s11", 6), disappearAt: end(10) }],
    bigWords: [{ text: "NEM MORTA!", at: W("s11", 4), until: end(10), color: R, size: 180, y: 1160, tilt: -6 }],
    chat: { title: "ZUMBI DESCONHECIDO", subtitle: "online agora", at: 0, until: end(10), y: 260, fakeAt: W("s11", 4), stamp: "GOLPE!", msgs: [{ who: "Zumbi", text: "Me passa o código que chegou no seu celular...", at: 0, color: "#2e7d32" }, { who: "Dona Maria", text: "NEM MORTA!", at: W("s11", 4), me: true }] },
    highlights: ["MARIA", "NEM", "MORTA", "CÓDIGO", "SENHA", "NUNCA"],
    captions: [{ text: "A dona Maria gritou: nem morta! Código e senha, nunca!", from: voLocal("s11"), to: end(10) }],
    audioCues: [narration("s11", "ready"), sfx("stamp", W("s11", 4), 0.42), sfx("buzz", W("s11", 4) + 1, 0.22), sfx("badge", W("s11", 6), 0.2)],
  },
  // ------------------------------------------------------------------ s12 · empurrando a porta: "prova de vida!" (spoiler)
  {
    id: "scene-12-prova-de-vida",
    startFrame: sc(11).from,
    durationInFrames: sc(11).durationInFrames,
    voKey: "s12",
    narration: "Os zumbis começaram a empurrar a porta, gemendo: prova de vida! Spoiler: hoje, na maioria dos casos, o próprio INSS faz a prova de vida cruzando dados.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.safe), key(W("s12", 11), P.safeLow, "linear"), key(W("s12", 11) + 8, P.group, "out"), key(end(11), P.group)] },
    objects: [...SYSTEM(), ...ZOMBIES()],
    animations: [
      ...whip(0),
      lerp("vovo.shock", 0, 1, 0, 0),
      ...zPush(0, W("s12", 8), 0, 1),
      lerp("door.push", W("s12", 3), W("s12", 4), 0, 1, "out"),
      lerp("door.push", W("s12", 11), W("s12", 11) + 12, 1, 0.3, "inOut"),
      ...[W("s12", 4), W("s12", 6), W("s12", 8)].flatMap((t) => [lerp("camera.shake", t, t + 3, 0, 0.7, "out"), lerp("camera.shake", t + 3, t + 10, 0.7, 0, "in")]),
      spring("marcos.shock", W("s12", 8), W("s12", 8) + 14, 0, 0.7, 7),
      lerp("marcos.shock", W("s12", 8) + 14, W("s12", 11), 0.7, 0, "inOut"),
      ...punch(W("s12", 11), 0.6),
    ],
    badges: [{ text: "PROVA DE VIDA: O INSS FAZ CRUZANDO DADOS", variant: "positive", subtitle: "na maioria dos casos", appearAt: W("s12", 17), disappearAt: end(11) }],
    bigWords: [
      { text: "PROVA DE VIDA!", at: W("s12", 8), until: W("s12", 11), color: ZGREEN, size: 140, y: 460, tilt: -5 },
      { text: "SPOILER", at: W("s12", 11), until: W("s12", 17), color: "#ffffff", size: 170, y: 460, tilt: -5 },
    ],
    highlights: ["ZUMBIS", "EMPURRAR", "PORTA", "PROVA", "VIDA", "SPOILER", "INSS", "CRUZANDO", "DADOS"],
    captions: [
      { text: "Os zumbis começaram a empurrar a porta, gemendo: prova de vida!", from: voLocal("s12"), to: W("s12", 11) },
      { text: "Spoiler: hoje, na maioria dos casos, o próprio INSS faz a prova de vida cruzando dados.", from: W("s12", 11), to: end(11) },
    ],
    audioCues: [narration("s12", "ready"), sfx("whoosh", 0, 0.2), sfx("bang", W("s12", 4), 0.32), sfx("bang", W("s12", 6), 0.32), sfx("bang", W("s12", 8), 0.36), sfx("zumbi", W("s12", 8), 0.34), sfx("scratch", W("s12", 11), 0.24), sfx("badge", W("s12", 17), 0.2)],
  },
  // ------------------------------------------------------------------ s13 · porta cedendo; aparece a advogada de bolso
  {
    id: "scene-13-advogada",
    startFrame: sc(12).from,
    durationInFrames: sc(12).durationInFrames,
    voKey: "s13",
    narration: "Mas a porta tá cedendo. E a advogada de bolso apareceu com duas saídas.",
    camera: { projection: "perspective", movement: "tracking", keys: [key(0, P.safeLow), key(W("s13", 5) - 2, P.safeLow), key(W("s13", 5) + 6, P.lia, "out"), key(end(12), P.lia)] },
    objects: [...SYSTEM(), ...ZOMBIES(), LIA],
    animations: [
      ...whip(0),
      ...zPush(0, W("s13", 4), 1, 1.7),
      lerp("door.push", 0, W("s13", 3), 0.3, 1.3, "inOut"),
      lerp("door.lean", W("s13", 3), W("s13", 3) + 8, 0, 1, "out"),
      lerp("door.push", W("s13", 5) + 6, W("s13", 5) + 16, 1.3, 0.5, "inOut"),
      lerp("camera.shake", W("s13", 3), W("s13", 3) + 3, 0, 1, "out"),
      lerp("camera.shake", W("s13", 3) + 3, W("s13", 3) + 14, 1, 0, "in"),
      lerp("vignette.red", W("s13", 3), W("s13", 3) + 6, 0, 0.5, "out"),
      lerp("vignette.red", W("s13", 5), W("s13", 5) + 8, 0.5, 0, "in"),
      ...flash(W("s13", 7), 0.5),
      spring("liaBig.pop", W("s13", 7), W("s13", 7) + 22, 0, 1, 8),
      lerp("liaBig.wave", W("s13", 7) + 6, W("s13", 7) + 12, 0, 1, "out"),
      lerp("hearts", 0, 1, 0, 0),
    ],
    badges: [],
    bigWords: [
      { text: "TÁ CEDENDO!", at: W("s13", 3), until: W("s13", 5) + 4, color: R, size: 170, y: 460, tilt: -6 },
      { text: "2 SAÍDAS", at: W("s13", 12), until: end(12), color: GOLD, size: 190, y: 460, tilt: -5 },
    ],
    labels: [{ text: "ADVOGADA DE BOLSO", point: [-1.95, 2.1, -0.35], at: W("s13", 8), until: W("s13", 12), off: [0, -120], accent: GOLD }],
    highlights: ["PORTA", "CEDENDO", "ADVOGADA", "BOLSO", "DUAS", "SAÍDAS"],
    captions: [{ text: "Mas a porta tá cedendo. E a advogada de bolso apareceu com duas saídas.", from: voLocal("s13"), to: end(12) }],
    audioCues: [narration("s13", "ready"), sfx("bang", W("s13", 3), 0.4), sfx("crack", W("s13", 3) + 2, 0.24), sfx("pop-high", W("s13", 7), 0.24), sfx("shimmer", W("s13", 7) + 2, 0.2)],
  },
  // ------------------------------------------------------------------ s14 · opção A (telhado) e B (cofrinho gigante)
  {
    id: "scene-14-opcoes",
    startFrame: sc(13).from,
    durationInFrames: sc(13).durationInFrames,
    voKey: "s14",
    narration: "Opção A: fugir pelo telhado, com o Marcos de perna machucada. Opção B: se esconder dentro do cofrinho gigante.",
    camera: { projection: "perspective", movement: "orbit", keys: [key(0, P.roof), key(W("s14", 11) - 4, P.roof), key(W("s14", 11) + 6, P.piggy, "out"), key(end(13), P.piggy)] },
    objects: [...SYSTEM(), ...ZOMBIES(), LIA, o("piggy", "cofrinho-gigante")],
    animations: [
      ...whip(0),
      lerp("piggy.level", 0, 1, 0.6, 0.6),
      lerp("liaBig.point", 0, 8, 0, 1, "out"),
      ...whip(W("s14", 11) - 2),
      lerp("pipeAccident.glow", W("s14", 11), W("s14", 11) + 10, 0, 0.6, "out"),
    ],
    badges: [
      { text: "COM A PERNA MACHUCADA?", variant: "warning", icon: "?", appearAt: W("s14", 5), disappearAt: W("s14", 11) },
      { text: "DENTRO DO COFRINHO?", variant: "warning", icon: "?", appearAt: W("s14", 13), disappearAt: end(13) },
    ],
    bigWords: [
      { text: "A: TELHADO", at: W("s14", 0), until: W("s14", 11) - 2, color: "#ff9f1c", size: 160, y: 460, tilt: -5 },
      { text: "B: COFRINHO", at: W("s14", 11), until: end(13), color: "#4dabf7", size: 160, y: 460, tilt: 5 },
    ],
    highlights: ["OPÇÃO", "A", "TELHADO", "MARCOS", "PERNA", "MACHUCADA", "B", "ESCONDER", "COFRINHO", "GIGANTE"],
    captions: [
      { text: "Opção A: fugir pelo telhado, com o Marcos de perna machucada.", from: voLocal("s14"), to: W("s14", 11) },
      { text: "Opção B: se esconder dentro do cofrinho gigante.", from: W("s14", 11), to: end(13) },
    ],
    audioCues: [narration("s14", "ready"), sfx("whoosh-big", 0, 0.24), sfx("ding", W("s14", 0), 0.22), sfx("whoosh-big", W("s14", 11) - 2, 0.24), sfx("ding", W("s14", 11), 0.22)],
  },
  // ------------------------------------------------------------------ s15 · A ou B? comenta + segue (cliffhanger)
  {
    id: "scene-15-escolha",
    startFrame: sc(14).from,
    durationInFrames: sc(14).durationInFrames,
    voKey: "s15",
    narration: "O que eles devem fazer? Comenta A ou B, e segue o Advogado de Bolso pra ver a parte dois!",
    camera: { projection: "perspective", movement: "dolly-out", keys: [key(0, P.choice), key(W("s15", 10), P.choice, "linear"), key(end(14) - 50, P.final, "inOut"), key(end(14), P.final)] },
    objects: [...SYSTEM(), ...ZOMBIES(), LIA],
    animations: [
      ...whip(0),
      lerp("liaBig.point", 0, 6, 1, 0, "in"),
      ...zPush(0, end(14) - 60, 1.7, 2.1),
      lerp("door.lean", 0, end(14) - 60, 1, 1.35, "linear"),
      lerp("door.push", end(14) - 80, end(14) - 70, 0.5, 1.4, "out"),
      spring("follow", W("s15", 10), W("s15", 10) + 22, 0, 1, 8),
      lerp("follow", end(14) - 58, end(14) - 50, 1, 0, "in"),
      lerp("vignette.red", end(14) - 70, end(14) - 58, 0, 0.5, "inOut"),
      spring("endcard", end(14) - 52, end(14) - 22, 0, 1, 10),
    ],
    badges: [],
    choice: { at: W("s15", 0), until: end(14) - 52, a: "FUGIR PELO TELHADO", b: "ESCONDER NO COFRINHO" },
    highlights: ["FAZER", "COMENTA", "A", "B", "SEGUE", "ADVOGADO", "BOLSO", "PARTE", "DOIS"],
    captions: [{ text: "O que eles devem fazer? Comenta A ou B, e segue o Advogado de Bolso pra ver a parte dois!", from: voLocal("s15"), to: end(14) - 52 }],
    audioCues: [narration("s15", "ready"), sfx("whoosh", 0, 0.2), sfx("pop", W("s15", 0) + 2, 0.24), sfx("pop-high", W("s15", 0) + 7, 0.24), sfx("ding", W("s15", 10), 0.2), sfx("zumbi", end(14) - 80, 0.3), sfx("sting", end(14) - 60, 0.4)],
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
