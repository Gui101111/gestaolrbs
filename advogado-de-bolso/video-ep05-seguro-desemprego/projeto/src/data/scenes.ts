import { evaluateTrack, orbit, type EaseName, type TrackAnimation, type Vec3 } from "../utils/animation";
import { L } from "../layout";
import { DURATION, FPS, HEIGHT, SCENE_FRAMES, voLocal, WIDTH, wordLocal, type VoKey } from "../utils/timing";

// EP05 · Seguro-desemprego — série de 5 vídeos pedida pelo usuário em 31/10/2026 ("pode começar").
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
const R = "#ff5d5d";
const Y = "#ffd43b";
const GOLD = "#ffc531";

/** Cenário fixo: ilha, loja (depósito), prédio do governo, cofrinho, cano do salário e o Lucas. */
const SYSTEM = (): SceneObject[] => [
  o("island", "diorama-ilha-flutuante"),
  o("warehouse", "loja"),
  o("inss", "predio-do-governo"),
  o("piggy", "cofrinho-janela-de-corte"),
  o("salaryPipe", "cano-salario-prata+valvula"),
  o("coins", "moedas-instanciadas"),
  o("marcos", "lucas"),
];
const PIPE = o("accidentPipe", "cano-dourado-do-seguro-desemprego");
const LUCAS_HEAD: Vec3 = [L.work[0], 1.95, L.work[2]];
const GOV: Vec3 = [2.8, 4.0, -4.6];

const P = {
  far: orbit([0, 1.4, -1.0], 46, 30, 32),
  hook: orbit([0.2, 1.4, 2.0], 17, 22, 20),
  hookPunch: orbit([0.2, 1.4, 2.2], 14, 18, 18),
  hookUp: orbit([0.2, 2.2, 0.5], 24, 12, 22),
  work: orbit([-2.45, 1.35, -1.85], 9.5, 22, 10),
  workClose: orbit([-2.5, 1.45, -1.8], 6, 14, 8),
  walk: orbit([-1.8, 1.2, 0.4], 12, 24, 14),
  warehousePipe: orbit([-1.3, 2.0, -2.2], 17, 14, 16),
  goldPipe: orbit([1.4, 2.4, -0.8], 24, -15, 24),
  piggy: orbit([1.55, 1.45, 2.2], 14, 25, 14),
  piggyR: orbit([1.55, 1.45, 2.2], 14, 5, 14),
  row: orbit([1.3, 0.7, 3.6], 7, 4, 20),
  timeline: orbit([-1.2, 0.5, 3.6], 13, -62, 30),
  gate: orbit([3.0, 0.9, -2.3], 14, 40, 18),
  gateClose: orbit([3.3, 0.9, -2.3], 10.5, 28, 12),
  gov: orbit([2.6, 2.4, -3.4], 12, -12, 10),
  final: orbit([0, 1.4, -1.2], 46, 40, 30),
  finalClose: orbit([L.home[0], 1.35, L.home[2]], 5.2, 18, 8),
};

export const scenes: ScenePlan[] = [
  // ------------------------------------------------------------------ s1 · gancho
  {
    id: "scene-01-gancho",
    startFrame: sc(0).from,
    durationInFrames: sc(0).durationInFrames,
    voKey: "s1",
    narration: "Foi demitido sem justa causa? Você pode receber um dinheiro enquanto procura outro emprego.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.far), key(22, P.hook, "out"), key(W("s1", 7) - 4, P.hookPunch, "soft"), key(end(0), P.hookUp, "soft")] },
    objects: [...SYSTEM(), PIPE],
    animations: [
      lerp("marcos.spot", 0, 1, 0, 0),
      lerp("marcos.carry", 0, 1, 1, 1),
      lerp("pipeAccident.grow", 0, 1, 1, 1),
      lerp("coins.accident.flow", 0, 1, 1, 1),
      lerp("coins.salary.flow", 0, 1, 0, 0),
      lerp("salaryValve.closed", 0, 1, 1, 1),
      lerp("piggy.level", 0, 1, 0.5, 0.5),
      ...punch(W("s1", 1)),
      lerp("coinRain", W("s1", 7), W("s1", 7) + 10, 0, 1, "out"),
      lerp("coinRain", end(0) - 14, end(0) - 2, 1, 0, "in"),
      lerp("marcos.hop", W("s1", 7), W("s1", 7) + 4, 0, 1, "out"),
      lerp("rewind", end(0) - 10, end(0), 0, 1, "in"),
    ],
    badges: [
      { text: "SEM JUSTA CAUSA?", variant: "warning", icon: "?", appearAt: W("s1", 0), disappearAt: W("s1", 5) - 2 },
      { text: "DINHEIRO ENQUANTO PROCURA EMPREGO", variant: "positive", appearAt: W("s1", 5), disappearAt: end(0) },
    ],
    bigWords: [{ text: "DEMITIDO?", at: W("s1", 1), until: W("s1", 5) - 2, color: R, size: 160 }],
    highlights: ["DEMITIDO", "JUSTA", "CAUSA", "DINHEIRO", "EMPREGO"],
    captions: [{ text: "Foi demitido sem justa causa? Você pode receber um dinheiro enquanto procura outro emprego.", from: voLocal("s1"), to: end(0) }],
    audioCues: [narration("s1", "ready"), sfx("whoosh-big", 0, 0.3), sfx("badge", W("s1", 0), 0.24), sfx("buzz", W("s1", 1), 0.22), sfx("coin", W("s1", 7), 0.22), sfx("rewind", end(0) - 10, 0.28)],
  },
  // ------------------------------------------------------------------ s2 · Lucas
  {
    id: "scene-02-lucas",
    startFrame: sc(1).from,
    durationInFrames: sc(1).durationInFrames,
    voKey: "s2",
    narration: "Esse é o Lucas. Ele trabalhou dois anos de carteira assinada numa loja.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.hookUp), key(12, P.work, "out"), key(W("s2", 11), P.work), key(end(1), P.warehousePipe, "soft")] },
    objects: [...SYSTEM(), PIPE],
    animations: [
      lerp("rewind", 0, 10, 1, 0, "out"),
      ...whip(0),
      lerp("marcos.spot", 0, 8, 0, 1, "inOut"),
      lerp("marcos.carry", 0, 6, 1, 0, "in"),
      lerp("marcos.hop", 0, 6, 1, 0, "in"),
      lerp("pipeAccident.grow", 0, 10, 1, 0, "in"),
      lerp("coins.accident.flow", 0, 6, 1, 0, "linear"),
      lerp("salaryValve.closed", 0, 8, 1, 0, "out"),
      lerp("coins.salary.flow", 4, 12, 0, 1, "linear"),
      lerp("piggy.level", 0, 10, 0.5, 0.35, "linear"),
      lerp("marcos.wave", W("s2", 3), W("s2", 3) + 10, 0, 1, "out"),
      lerp("marcos.wave", W("s2", 5), W("s2", 5) + 10, 1, 0, "inOut"),
      lerp("marcos.work", W("s2", 6), W("s2", 6) + 10, 0, 1, "inOut"),
      ...punch(W("s2", 6)),
    ],
    badges: [{ text: "CARTEIRA ASSINADA", variant: "info", appearAt: W("s2", 9), disappearAt: end(1) }],
    bigWords: [{ text: "2 ANOS", at: W("s2", 6), until: W("s2", 9), color: Y, size: 170 }],
    labels: [
      { text: "LUCAS", point: LUCAS_HEAD, at: W("s2", 3), until: W("s2", 6), off: [-160, -70], accent: Y },
      { text: "LOJA", point: [L.warehouse[0], 4.0, L.warehouse[2]], at: W("s2", 12), until: end(1), off: [0, -70], accent: "#bcd3ea" },
    ],
    highlights: ["LUCAS", "ANOS", "CARTEIRA", "ASSINADA", "LOJA"],
    captions: [{ text: "Esse é o Lucas. Ele trabalhou dois anos de carteira assinada numa loja.", from: voLocal("s2"), to: end(1) }],
    audioCues: [narration("s2", "ready"), sfx("whoosh", 0, 0.26), sfx("pop", W("s2", 3), 0.22), sfx("ding", W("s2", 6), 0.22), sfx("badge", W("s2", 9), 0.22), sfx("pop", W("s2", 12), 0.2)],
  },
  // ------------------------------------------------------------------ s3 · dispensado
  {
    id: "scene-03-dispensado",
    startFrame: sc(2).from,
    durationInFrames: sc(2).durationInFrames,
    voKey: "s3",
    narration: "Um dia, a loja cortou funcionários, e ele foi dispensado sem justa causa.",
    camera: { projection: "perspective", movement: "tracking", keys: [key(0, P.warehousePipe), key(W("s3", 6), P.workClose, "out"), key(W("s3", 9) + 4, P.walk, "soft"), key(end(2), P.walk)] },
    objects: [...SYSTEM()],
    animations: [
      ...flash(W("s3", 4), 0.5),
      lerp("camera.shake", W("s3", 4), W("s3", 4) + 4, 0, 1, "out"),
      lerp("camera.shake", W("s3", 4) + 4, W("s3", 4) + 14, 1, 0, "in"),
      lerp("salaryValve.closed", W("s3", 4), W("s3", 4) + 10, 0, 1, "out"),
      lerp("coins.salary.flow", W("s3", 4) + 4, W("s3", 4) + 14, 1, 0, "linear"),
      lerp("marcos.work", W("s3", 6), W("s3", 6) + 6, 1, 0, "in"),
      lerp("marcos.carry", W("s3", 7), W("s3", 7) + 8, 0, 1, "out"),
      lerp("marcos.spot", W("s3", 9), end(2), 1, 0, "inOut"),
      lerp("vignette.red", W("s3", 9), W("s3", 9) + 12, 0, 0.45, "inOut"),
      ...punch(W("s3", 9)),
    ],
    badges: [
      { text: "CORTE DE FUNCIONÁRIOS", variant: "negative", appearAt: W("s3", 4), disappearAt: W("s3", 10) - 2 },
      { text: "SEM JUSTA CAUSA", variant: "negative", appearAt: W("s3", 10), disappearAt: end(2) },
    ],
    bigWords: [{ text: "DISPENSADO!", at: W("s3", 9), until: end(2), color: R, size: 124, tilt: -6 }],
    highlights: ["LOJA", "CORTOU", "FUNCIONÁRIOS", "DISPENSADO", "JUSTA", "CAUSA"],
    captions: [{ text: "Um dia, a loja cortou funcionários, e ele foi dispensado sem justa causa.", from: voLocal("s3"), to: end(2) }],
    audioCues: [narration("s3", "ready"), sfx("thud", W("s3", 4), 0.32), sfx("clunk", W("s3", 4) + 4, 0.26), sfx("badge", W("s3", 4), 0.22), sfx("buzz", W("s3", 9), 0.24)],
  },
  // ------------------------------------------------------------------ s4 · revelação
  {
    id: "scene-04-seguro",
    startFrame: sc(3).from,
    durationInFrames: sc(3).durationInFrames,
    voKey: "s4",
    narration: "É aí que entra o seguro-desemprego.",
    camera: { projection: "perspective", movement: "orbit", keys: [key(0, P.walk), key(W("s4", 5) - 2, P.walk), key(W("s4", 5) + 12, P.goldPipe, "out"), key(end(3), P.goldPipe)] },
    objects: [...SYSTEM(), o("accidentPipe", "cano-dourado-do-seguro-desemprego", "inexistente", "aberto")],
    animations: [
      ...flash(W("s4", 5)),
      ...whip(W("s4", 5) + 1),
      lerp("speed", W("s4", 5), W("s4", 5) + 4, 0, 1, "out"),
      lerp("speed", W("s4", 5) + 18, W("s4", 5) + 28, 1, 0, "in"),
      lerp("vignette.red", W("s4", 5), W("s4", 5) + 10, 0.45, 0, "out"),
      lerp("pipeAccident.grow", W("s4", 5) + 2, W("s4", 5) + 26, 0, 1, "out"),
      lerp("pipeAccident.glow", W("s4", 5) + 2, W("s4", 5) + 14, 0, 1, "out"),
      lerp("coins.accident.flow", W("s4", 5) + 20, W("s4", 5) + 30, 0, 1, "linear"),
    ],
    badges: [],
    bigWords: [{ text: "SEGURO-DESEMPREGO", at: W("s4", 5), until: end(3), color: GOLD, size: 76, y: 640, tilt: -3 }],
    highlights: ["SEGURO-DESEMPREGO"],
    captions: [{ text: "É aí que entra o seguro-desemprego.", from: voLocal("s4"), to: end(3) }],
    audioCues: [narration("s4", "ready"), sfx("shimmer", W("s4", 5), 0.3), sfx("whoosh-big", W("s4", 5), 0.24), sfx("glow", W("s4", 5) + 4, 0.22)],
  },
  // ------------------------------------------------------------------ s5 · parcelas
  {
    id: "scene-05-parcelas",
    startFrame: sc(4).from,
    durationInFrames: sc(4).durationInFrames,
    voKey: "s5",
    narration: "Ele paga de três a cinco parcelas, dependendo de quanto tempo a pessoa trabalhou.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.goldPipe), key(10, P.row, "out"), key(end(4), orbit([1.3, 0.8, 3.6], 8.5, -12, 22), "soft")] },
    objects: [...SYSTEM(), PIPE, o("parcels", "5-parcelas")],
    animations: [
      ...whip(0),
      lerp("pipeAccident.glow", 10, 40, 1, 0.4, "inOut"),
      spring("parcels.pop", 4, 26, 0, 1, 9),
      lerp("parcels.count", W("s5", 3) - 4, W("s5", 3) + 6, 0, 3, "out"),
      lerp("parcels.count", W("s5", 5) - 2, W("s5", 5) + 8, 3, 5, "out"),
      ...punch(W("s5", 3)),
      ...punch(W("s5", 5)),
    ],
    badges: [{ text: "DEPENDE DO TEMPO TRABALHADO", variant: "info", appearAt: W("s5", 7), disappearAt: end(4) }],
    bigWords: [{ text: "3 A 5 PARCELAS", at: W("s5", 5), until: W("s5", 7) + 4, color: GOLD, size: 104 }],
    highlights: ["TRÊS", "CINCO", "PARCELAS", "TEMPO", "TRABALHOU"],
    captions: [{ text: "Ele paga de três a cinco parcelas, dependendo de quanto tempo a pessoa trabalhou.", from: voLocal("s5"), to: end(4) }],
    audioCues: [narration("s5", "ready"), sfx("whoosh", 0, 0.22), sfx("coin", W("s5", 3), 0.24), sfx("coin", W("s5", 5), 0.24), sfx("ding", W("s5", 5) + 4, 0.22), sfx("badge", W("s5", 7), 0.22)],
  },
  // ------------------------------------------------------------------ s6 · 1ª vez
  {
    id: "scene-06-primeira",
    startFrame: sc(5).from,
    durationInFrames: sc(5).durationInFrames,
    voKey: "s6",
    narration: "Na primeira vez, precisa ter trabalhado pelo menos 12 meses nos últimos 18.",
    camera: { projection: "perspective", movement: "orbit", keys: [key(0, P.row), key(10, P.piggy, "out"), key(end(5), P.piggyR, "linear")] },
    objects: [...SYSTEM(), PIPE, o("calendar", "calendario-3d")],
    animations: [
      ...whip(0),
      lerp("parcels.pop", 0, 8, 1, 0, "in"),
      lerp("calendar.flip", 0, 1, 0, 0),
      spring("calendar.pop", 6, 26, 0, 1, 9),
      lerp("calendar.flip", W("s6", 5), W("s6", 8), 0, 1, "linear"),
      ...punch(W("s6", 8)),
    ],
    badges: [{ text: "1ª SOLICITAÇÃO", variant: "info", subtitle: "12 meses trabalhados nos últimos 18", appearAt: W("s6", 8), disappearAt: end(5) }],
    bigWords: [
      { text: "1ª VEZ", at: W("s6", 1), until: W("s6", 5), color: Y, size: 170 },
      { text: "12 DE 18 MESES", at: W("s6", 8), until: end(5), color: GOLD, size: 100 },
    ],
    highlights: ["PRIMEIRA", "12 MESES", "18"],
    captions: [{ text: "Na primeira vez, precisa ter trabalhado pelo menos 12 meses nos últimos 18.", from: voLocal("s6"), to: end(5) }],
    audioCues: [narration("s6", "ready"), sfx("whoosh", 0, 0.22), sfx("ding", W("s6", 1), 0.22), sfx("tick", W("s6", 5) + 6, 0.2), sfx("tick", W("s6", 5) + 16, 0.2), sfx("badge", W("s6", 8), 0.22)],
  },
  // ------------------------------------------------------------------ s7 · 2ª e 3ª vez
  {
    id: "scene-07-segunda-terceira",
    startFrame: sc(6).from,
    durationInFrames: sc(6).durationInFrames,
    voKey: "s7",
    narration: "Na segunda, 9 meses nos últimos 12. E, da terceira em diante, os 6 meses antes da demissão.",
    camera: { projection: "perspective", movement: "orbit", keys: [key(0, P.piggyR), key(W("s7", 6), P.piggy, "soft"), key(end(6), P.piggyR, "soft")] },
    objects: [...SYSTEM(), PIPE, o("calendar", "calendario-3d")],
    animations: [
      lerp("calendar.flip", 0, 4, 1, 0, "in"),
      lerp("calendar.flip", W("s7", 2), W("s7", 5), 0, 1, "linear"),
      ...punch(W("s7", 2)),
      ...whip(W("s7", 6)),
      lerp("calendar.flip", W("s7", 6), W("s7", 6) + 4, 1, 0, "in"),
      lerp("calendar.flip", W("s7", 12), W("s7", 15), 0, 1, "linear"),
      ...punch(W("s7", 12)),
    ],
    badges: [
      { text: "2ª SOLICITAÇÃO", variant: "info", subtitle: "9 meses nos últimos 12", appearAt: W("s7", 2), disappearAt: W("s7", 6) - 2 },
      { text: "3ª EM DIANTE", variant: "info", subtitle: "os 6 meses antes da demissão", appearAt: W("s7", 8), disappearAt: end(6) },
    ],
    bigWords: [
      { text: "2ª VEZ", at: W("s7", 1), until: W("s7", 2), color: Y, size: 170 },
      { text: "9 DE 12 MESES", at: W("s7", 2), until: W("s7", 6) - 2, color: GOLD, size: 104 },
      { text: "3ª VEZ +", at: W("s7", 8), until: W("s7", 12), color: Y, size: 160 },
      { text: "6 MESES", at: W("s7", 12), until: end(6), color: GOLD, size: 170 },
    ],
    highlights: ["SEGUNDA", "9 MESES", "12", "TERCEIRA", "6 MESES", "DEMISSÃO"],
    captions: [{ text: "Na segunda, 9 meses nos últimos 12. E, da terceira em diante, os 6 meses antes da demissão.", from: voLocal("s7"), to: end(6) }],
    audioCues: [narration("s7", "ready"), sfx("ding", W("s7", 1), 0.22), sfx("badge", W("s7", 2), 0.22), sfx("whoosh", W("s7", 6), 0.22), sfx("ding", W("s7", 8), 0.22), sfx("badge", W("s7", 12), 0.22)],
  },
  // ------------------------------------------------------------------ s8 · quem não tem direito
  {
    id: "scene-08-sem-direito",
    startFrame: sc(7).from,
    durationInFrames: sc(7).durationInFrames,
    voKey: "s8",
    narration: "Mas atenção: quem pede demissão ou é demitido por justa causa não tem direito.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.piggyR), key(10, P.gate, "out"), key(W("s8", 7), P.gateClose, "soft"), key(end(7), P.gateClose)] },
    objects: [...SYSTEM(), PIPE, o("gate", "portao-catraca+luz"), o("pawns", "fila")],
    animations: [
      ...whip(0),
      lerp("calendar.pop", 0, 8, 1, 0, "in"),
      spring("gate.pop", 4, 28, 0, 1, 9),
      lerp("queue.arrive", 6, 30, 0, 1, "inOut"),
      lerp("pawn5.try", W("s8", 2), W("s8", 2) + 24, 0, 1, "inOut"),
      spring("gate.block", W("s8", 11), W("s8", 11) + 30, 0, 1, 8),
      lerp("gate.red", W("s8", 11), W("s8", 11) + 5, 0, 1, "out"),
      lerp("pawn5.shrug", W("s8", 11) + 6, W("s8", 11) + 20, 0, 1, "inOut"),
      ...punch(W("s8", 11)),
    ],
    badges: [{ text: "ATENÇÃO", variant: "warning", appearAt: W("s8", 1), disappearAt: end(7) }],
    bigWords: [
      { text: "PEDIU DEMISSÃO", at: W("s8", 3), until: W("s8", 6), color: R, size: 96 },
      { text: "JUSTA CAUSA", at: W("s8", 9), until: W("s8", 11), color: R, size: 120 },
      { text: "SEM DIREITO", at: W("s8", 11), until: end(7), color: R, size: 124, tilt: 5 },
    ],
    highlights: ["ATENÇÃO", "DEMISSÃO", "JUSTA", "CAUSA", "DIREITO"],
    captions: [{ text: "Mas atenção: quem pede demissão ou é demitido por justa causa não tem direito.", from: voLocal("s8"), to: end(7) }],
    audioCues: [narration("s8", "ready"), sfx("whoosh", 0, 0.22), sfx("badge", W("s8", 1), 0.22), sfx("buzz", W("s8", 3), 0.2), sfx("buzz", W("s8", 9), 0.2), sfx("clunk", W("s8", 11), 0.28)],
  },
  // ------------------------------------------------------------------ s9 · outras condições
  {
    id: "scene-09-condicoes",
    startFrame: sc(8).from,
    durationInFrames: sc(8).durationInFrames,
    voKey: "s9",
    narration: "Também não pode ter outra renda suficiente pra se sustentar, nem receber benefício contínuo do INSS, como aposentadoria.",
    camera: { projection: "perspective", movement: "tracking", keys: [key(0, P.gateClose), key(10, P.piggy, "out"), key(W("s9", 10), P.piggyR, "linear"), key(W("s9", 10) + 10, P.timeline, "out"), key(end(8), P.timeline)] },
    objects: [...SYSTEM(), PIPE, o("timeline", "linha-do-tempo-no-chao")],
    animations: [
      ...whip(0),
      lerp("pawns.shrink", 0, 8, 0, 1, "in"),
      lerp("gate.pop", 0, 8, 1, 0, "in"),
      lerp("salaryValve.closed", W("s9", 4), W("s9", 4) + 6, 1, 0, "out"),
      lerp("coins.salary.flow", W("s9", 4), W("s9", 4) + 8, 0, 1, "linear"),
      ...punch(W("s9", 5)),
      lerp("salaryValve.closed", W("s9", 9), W("s9", 9) + 6, 0, 1, "out"),
      lerp("coins.salary.flow", W("s9", 9), W("s9", 9) + 6, 1, 0, "linear"),
      ...whip(W("s9", 10)),
      lerp("timeline.grow", W("s9", 10), W("s9", 10) + 20, 0, 1, "out"),
      spring("chair.pop", W("s9", 12), W("s9", 12) + 20, 0, 1, 9),
      spring("timeline.stop", W("s9", 17) - 6, W("s9", 17) + 16, 0, 1, 8),
      ...punch(W("s9", 17)),
    ],
    badges: [
      { text: "SEM OUTRA RENDA SUFICIENTE", variant: "negative", appearAt: W("s9", 5), disappearAt: W("s9", 10) },
      { text: "SEM BENEFÍCIO CONTÍNUO DO INSS", variant: "negative", subtitle: "como aposentadoria", appearAt: W("s9", 12), disappearAt: end(8) },
    ],
    bigWords: [
      { text: "OUTRA RENDA?", at: W("s9", 4), until: W("s9", 9), color: Y, size: 120 },
      { text: "APOSENTADORIA", at: W("s9", 17), until: end(8), color: R, size: 96 },
    ],
    highlights: ["RENDA", "SUFICIENTE", "BENEFÍCIO", "CONTÍNUO", "INSS", "APOSENTADORIA"],
    captions: [{ text: "Também não pode ter outra renda suficiente pra se sustentar, nem receber benefício contínuo do INSS, como aposentadoria.", from: voLocal("s9"), to: end(8) }],
    audioCues: [narration("s9", "ready"), sfx("whoosh", 0, 0.22), sfx("coin", W("s9", 4), 0.2), sfx("badge", W("s9", 5), 0.22), sfx("clunk", W("s9", 9), 0.24), sfx("whoosh", W("s9", 10), 0.22), sfx("buzz", W("s9", 17), 0.22)],
  },
  // ------------------------------------------------------------------ s10 · quem paga
  {
    id: "scene-10-quem-paga",
    startFrame: sc(9).from,
    durationInFrames: sc(9).durationInFrames,
    voKey: "s10",
    narration: "O benefício é do Ministério do Trabalho, e o pagamento é feito pela Caixa.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.timeline), key(10, P.gov, "out"), key(end(9), orbit([2.6, 2.6, -3.4], 9.5, -6, 10), "soft")] },
    objects: [...SYSTEM(), PIPE],
    animations: [...whip(0), spring("inss.glow", W("s10", 4), W("s10", 4) + 20, 0, 1, 8), ...punch(W("s10", 4)), ...punch(W("s10", 13))],
    badges: [
      { text: "MINISTÉRIO DO TRABALHO", variant: "info", appearAt: W("s10", 4), disappearAt: end(9) },
      { text: "PAGAMENTO PELA CAIXA", variant: "info", appearAt: W("s10", 9), disappearAt: end(9) },
    ],
    bigWords: [{ text: "CAIXA", at: W("s10", 13), until: end(9), color: "#5aa9f2", size: 180 }],
    labels: [{ text: "MINISTÉRIO DO TRABALHO", point: GOV, at: W("s10", 4), until: end(9), off: [0, -80], accent: "#2f7df6" }],
    highlights: ["BENEFÍCIO", "MINISTÉRIO", "TRABALHO", "PAGAMENTO", "CAIXA"],
    captions: [{ text: "O benefício é do Ministério do Trabalho, e o pagamento é feito pela Caixa.", from: voLocal("s10"), to: end(9) }],
    audioCues: [narration("s10", "ready"), sfx("whoosh", 0, 0.22), sfx("badge", W("s10", 4), 0.22), sfx("badge", W("s10", 9), 0.22), sfx("ding", W("s10", 13), 0.22)],
  },
  // ------------------------------------------------------------------ s11 · final
  {
    id: "scene-11-final",
    startFrame: sc(10).from,
    durationInFrames: sc(10).durationInFrames,
    voKey: "s11",
    narration: "Gostou da informação? Manda esse vídeo pra um amigo que você acha que se encaixa nessa situação.",
    camera: { projection: "perspective", movement: "dolly-out", keys: [key(0, P.gov), key(14, P.final, "out"), key(W("s11", 11), P.final), key(W("s11", 11) + 30, P.finalClose, "out"), key(end(10), P.finalClose)] },
    objects: [...SYSTEM(), PIPE],
    animations: [
      ...whip(0),
      lerp("coinRain", 10, 20, 0, 1, "out"),
      lerp("coinRain", W("s11", 3) + 10, W("s11", 3) + 22, 1, 0, "in"),
      lerp("piggy.level", 0, end(10), 0.35, 0.75, "linear"),
      spring("share", W("s11", 3), W("s11", 3) + 24, 0, 1, 8),
      lerp("share", W("s11", 11) - 6, W("s11", 11) + 2, 1, 0, "in"),
      lerp("marcos.carry", 0, 6, 1, 0, "in"),
      lerp("marcos.wave", W("s11", 11) + 10, W("s11", 11) + 20, 0, 1, "out"),
      lerp("marcos.thumb", W("s11", 11) + 14, W("s11", 11) + 26, 0, 1, "out"),
      spring("endcard", end(10) - 52, end(10) - 22, 0, 1, 10),
    ],
    badges: [
      { text: "GOSTOU DA INFORMAÇÃO?", variant: "warning", icon: "?", appearAt: W("s11", 0), disappearAt: W("s11", 3) - 2 },
      { text: "MANDA PRA UM AMIGO", variant: "positive", subtitle: "que se encaixa nessa situação", appearAt: W("s11", 3), disappearAt: end(10) - 54 },
    ],
    labels: [{ text: "SEGURO-DESEMPREGO", point: [1.9, 3.5, 1.1], at: 14, until: W("s11", 3), off: [60, -150], accent: GOLD }],
    highlights: ["GOSTOU", "INFORMAÇÃO", "MANDA", "AMIGO"],
    captions: [{ text: "Gostou da informação? Manda esse vídeo pra um amigo que você acha que se encaixa nessa situação.", from: voLocal("s11"), to: end(10) - 52 }],
    audioCues: [narration("s11", "ready"), sfx("whoosh-big", 0, 0.24), sfx("badge", W("s11", 0), 0.22), sfx("coin", 16, 0.2), sfx("pop", W("s11", 3), 0.24), sfx("ding", W("s11", 3) + 4, 0.22), sfx("pop", W("s11", 11) + 2, 0.22), sfx("final", end(10) - 52, 0.3)],
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
