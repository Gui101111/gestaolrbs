import { evaluateTrack, orbit, type EaseName, type TrackAnimation, type Vec3 } from "../utils/animation";
import { L, STAGE } from "../layout";
import { DURATION, FPS, HEIGHT, SCENE_FRAMES, voLocal, WIDTH, wordLocal, type VoKey } from "../utils/timing";

// EP08 · Série 2 (comédia, Halloween) · Auxílio-acidente: três lendas assombradas e uma verdade de dar medo.
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

const G = "#4be37f";
const R = "#ff5d5d";
const Y = "#ffd43b";
const GOLD = "#ffc531";

/** Cenário fixo: ilha de Halloween, INSS e galpão. */
const SYSTEM = (): SceneObject[] => [o("island", "diorama-ilha-halloween"), o("inss", "predio-inss"), o("warehouse", "galpao")];
const CUNHADO = o("cunhado", "cunhado-que-acredita-em-lenda");
const LENDA = o("lenda", "fantasma-da-lenda");
const MARCOS = o("marcos", "marcos");
const PLAZA: Vec3 = [0.45, 0, -1.35];
const MX = PLAZA[0] - L.work[0];
const MZ = PLAZA[2] - L.work[2];
const CUN_HEAD: Vec3 = [-0.4, 2.1, -1.05];
const MARCOS_HEAD: Vec3 = [PLAZA[0], 2.1, PLAZA[2]];
const PURPLE = "#c77dff";

const P = {
  ghostClose: orbit([STAGE.ghosts[0][0], STAGE.ghosts[0][1] + 0.5, STAGE.ghosts[0][2]], 4.2, 8, 4),
  spooky: orbit([0.3, 1.7, -1.4], 15, 16, 22),
  spookyIn: orbit([1.6, 2.2, -3.0], 13, 10, 14),
  cunhado: orbit([-0.75, 1.45, -1.25], 8.5, -4, 4),
  cunhadoPush: orbit([-0.8, 1.5, -1.3], 7.2, -4, 3),
  ball: orbit([-0.35, 0.95, -1.05], 15, -6, 8),
  marcos: orbit([PLAZA[0], 1.55, PLAZA[2]], 6.5, -25, 4),
  pipes: orbit([1.2, 2.0, -0.4], 22, -12, 22),
  piggy: orbit([1.3, 1.4, 2.0], 16, -20, 14),
  doc: orbit([STAGE.doc[0], 1.2, STAGE.doc[2]], 5.6, 17, 3),
  docWide: orbit([0.95, 1.1, -1.6], 12, 8, 6),
  pawns: orbit([0.05, 1.15, -1.2], 11, -4, 6),
  pawnsPush: orbit([0.05, 1.2, -1.2], 9.5, -4, 5),
  plaza: orbit([0.25, 1.1, -1.35], 16, -6, 8),
  final: orbit([0.2, 1.4, -1.3], 30, 10, 18),
};

/** "MITO!": X vermelho no fantasma, o fantasma some e o cunhado leva um susto. */
const busted = (k: VoKey): TrackAnimation[] => [
  spring("lenda.x", 4, 22, 0, 1, 7),
  ...flash(4, 0.6),
  lerp("camera.shake", 4, 7, 0, 0.8, "out"),
  lerp("camera.shake", 7, 16, 0.8, 0, "in"),
  spring("cunhado.shock", 5, 18, 0, 1, 8),
  lerp("cunhado.shock", 18, 26, 1, 0, "inOut"),
  lerp("lenda.pop", W(k, 1) - 10, W(k, 1) - 2, 1, 0, "in"),
  lerp("lenda.x", W(k, 1) - 10, W(k, 1) - 2, 1, 0, "in"),
];
/** "Lenda número N": o fantasma volta ao lado do cunhado. */
const legend = (): TrackAnimation[] => [...whip(0), lerp("lenda.x", 0, 1, 0, 0), spring("lenda.pop", 2, 24, 0, 1, 9), lerp("cunhado.wave", 14, 22, 0, 1, "out")];

export const scenes: ScenePlan[] = [
  // ------------------------------------------------------------------ s1 · gancho
  {
    id: "scene-01-gancho",
    startFrame: sc(0).from,
    durationInFrames: sc(0).durationInFrames,
    voKey: "s1",
    narration: "Três lendas assombradas sobre o auxílio-acidente, e uma verdade de dar medo!",
    camera: { projection: "perspective", movement: "dolly-out", keys: [key(0, P.ghostClose), key(W("s1", 2), P.ghostClose), key(W("s1", 5), P.spooky, "out"), key(W("s1", 6), P.spooky), key(end(0), P.spookyIn, "inOut")] },
    objects: [...SYSTEM(), o("ghosts", "fantasmas"), CUNHADO, MARCOS],
    animations: [
      lerp("marcos.spot", 0, 1, 1, 1),
      lerp("marcos.dx", 0, 1, MX, MX),
      lerp("marcos.dz", 0, 1, MZ, MZ),
      spring("ghosts.pop", 0, 22, 0.3, 1, 8),
      ...flash(0, 0.8),
      lerp("camera.shake", 0, 3, 0, 1, "out"),
      lerp("camera.shake", 3, 14, 1, 0, "in"),
      lerp("marcos.shock", W("s1", 6), W("s1", 6) + 6, 0, 0.6, "out"),
      lerp("marcos.shock", W("s1", 6) + 6, W("s1", 6) + 16, 0.6, 0, "inOut"),
      lerp("cunhado.shock", W("s1", 6), W("s1", 6) + 6, 0, 0.6, "out"),
      lerp("cunhado.shock", W("s1", 6) + 6, W("s1", 6) + 16, 0.6, 0, "inOut"),
      ...flash(W("s1", 7), 0.6),
      lerp("vignette.red", W("s1", 7), W("s1", 7) + 8, 0, 0.6, "out"),
      lerp("vignette.red", end(0) - 8, end(0), 0.6, 0, "in"),
    ],
    badges: [],
    bigWords: [
      { text: "3 LENDAS", at: W("s1", 0), until: W("s1", 7), color: "#ffffff", size: 160, y: 470, tilt: -5 },
      { text: "ASSOMBRADAS", at: W("s1", 2), until: W("s1", 7), color: PURPLE, size: 130, y: 640, tilt: -5 },
      { text: "+1 VERDADE", at: W("s1", 7), until: end(0), color: "#ffffff", size: 150, y: 470, tilt: 4 },
      { text: "DE DAR MEDO!", at: W("s1", 9), until: end(0), color: R, size: 150, y: 640, tilt: 4 },
    ],
    highlights: ["TRÊS", "LENDAS", "ASSOMBRADAS", "AUXÍLIO-ACIDENTE", "VERDADE", "MEDO"],
    captions: [{ text: "Três lendas assombradas sobre o auxílio-acidente, e uma verdade de dar medo!", from: voLocal("s1"), to: end(0) }],
    audioCues: [narration("s1", "ready"), sfx("thunder", 0, 0.42), sfx("ghost", 2, 0.3), sfx("boo", W("s1", 0), 0.18), sfx("whoosh-big", W("s1", 3), 0.22), sfx("thunder", W("s1", 7) - 1, 0.3), sfx("ghost", W("s1", 8), 0.2)],
  },
  // ------------------------------------------------------------------ s2 · lenda 1
  {
    id: "scene-02-lenda-1",
    startFrame: sc(1).from,
    durationInFrames: sc(1).durationInFrames,
    voKey: "s2",
    narration: "Lenda número um: só vale se o acidente for no trabalho.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.cunhado), key(end(1), P.cunhadoPush, "linear")] },
    objects: [...SYSTEM(), CUNHADO, LENDA, MARCOS],
    animations: [...legend(), lerp("ghosts.pop", 0, 8, 1, 0, "in")],
    badges: [],
    bigWords: [{ text: "LENDA #1", at: W("s2", 0), until: W("s2", 3), color: PURPLE, size: 170, y: 500, tilt: -5 }],
    labels: [{ text: "SÓ VALE NO TRABALHO!", point: CUN_HEAD, at: W("s2", 3), until: end(1), off: [60, -150], accent: Y }],
    highlights: ["LENDA", "UM", "TRABALHO"],
    captions: [{ text: "Lenda número um: só vale se o acidente for no trabalho.", from: voLocal("s2"), to: end(1) }],
    audioCues: [narration("s2", "ready"), sfx("whoosh", 0, 0.22), sfx("ghost", 4, 0.22), sfx("badge", W("s2", 3), 0.2)],
  },
  // ------------------------------------------------------------------ s3 · mito 1: qualquer acidente
  {
    id: "scene-03-mito-1",
    startFrame: sc(2).from,
    durationInFrames: sc(2).durationInFrames,
    voKey: "s3",
    narration: "Mito! Vale pra acidente de qualquer tipo, até jogando bola no fim de semana, se deixar sequela.",
    camera: { projection: "perspective", movement: "tracking", keys: [key(0, P.cunhadoPush), key(W("s3", 1) - 4, P.cunhado, "soft"), key(W("s3", 1) + 4, P.ball, "out"), key(W("s3", 10), P.ball), key(W("s3", 13), P.marcos, "soft"), key(end(2), P.marcos)] },
    objects: [...SYSTEM(), CUNHADO, LENDA, MARCOS, o("ball", "bola")],
    animations: [
      ...busted("s3"),
      ...whip(W("s3", 1) - 2),
      lerp("cunhado.wave", W("s3", 1) - 4, W("s3", 1), 1, 0, "in"),
      lerp("ball.bounce", 0, 1, 1, 1),
      lerp("ball.x", W("s3", 7), W("s3", 9), 0, 1.45, "linear"),
      lerp("ball.x", W("s3", 9), W("s3", 9) + 14, 1.45, 2.4, "out"),
      lerp("ball.z", W("s3", 9), W("s3", 9) + 14, 0, -0.9, "out"),
      spring("marcos.shock", W("s3", 9), W("s3", 9) + 16, 0, 1, 7),
      lerp("marcos.shock", W("s3", 9) + 16, W("s3", 9) + 24, 1, 0, "inOut"),
      lerp("dizzy.stars", W("s3", 9) + 10, W("s3", 9) + 18, 0, 1, "out"),
      lerp("marcos.sad", W("s3", 9) + 10, W("s3", 9) + 18, 0, 1, "out"),
      lerp("dizzy.stars", W("s3", 14), W("s3", 14) + 8, 1, 0, "in"),
      ...punch(W("s3", 16), 0.6),
    ],
    badges: [
      { text: "QUALQUER TIPO DE ACIDENTE", variant: "positive", appearAt: W("s3", 1), disappearAt: W("s3", 14) - 2 },
      { text: "SE DEIXAR SEQUELA", variant: "warning", subtitle: "que reduz a capacidade pro trabalho", appearAt: W("s3", 14), disappearAt: end(2) },
    ],
    bigWords: [
      { text: "MITO!", at: 4, until: W("s3", 1) - 2, color: R, size: 220, tilt: -7 },
      { text: "TOMBO!", at: W("s3", 9) + 2, until: W("s3", 13), color: Y, size: 170, y: 520, tilt: 6 },
    ],
    labels: [{ text: "FIM DE SEMANA", point: MARCOS_HEAD, at: W("s3", 11), until: W("s3", 14), off: [0, -130], accent: G }],
    highlights: ["MITO", "QUALQUER", "TIPO", "BOLA", "FIM", "SEMANA", "SEQUELA"],
    captions: [
      { text: "Mito! Vale pra acidente de qualquer tipo,", from: voLocal("s3"), to: W("s3", 7) },
      { text: "até jogando bola no fim de semana, se deixar sequela.", from: W("s3", 7), to: end(2) },
    ],
    audioCues: [narration("s3", "ready"), sfx("buzz", 4, 0.3), sfx("stamp", 4, 0.3), sfx("pop", W("s3", 1) - 8, 0.24), sfx("whoosh", W("s3", 1) - 2, 0.22), sfx("boing", W("s3", 7) + 4, 0.2), sfx("boing", W("s3", 8) + 6, 0.2), sfx("thud", W("s3", 9) + 2, 0.36), sfx("crack", W("s3", 9) + 3, 0.2), sfx("badge", W("s3", 14), 0.22)],
  },
  // ------------------------------------------------------------------ s4 · lenda 2
  {
    id: "scene-04-lenda-2",
    startFrame: sc(3).from,
    durationInFrames: sc(3).durationInFrames,
    voKey: "s4",
    narration: "Lenda número dois: quem recebe tem que parar de trabalhar.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.cunhado), key(end(3), P.cunhadoPush, "linear")] },
    objects: [...SYSTEM(), CUNHADO, LENDA, MARCOS],
    animations: [...legend(), lerp("marcos.sad", 0, 1, 0, 0)],
    badges: [],
    bigWords: [{ text: "LENDA #2", at: W("s4", 0), until: W("s4", 3), color: PURPLE, size: 170, y: 500, tilt: -5 }],
    labels: [{ text: "TEM QUE PARAR DE TRABALHAR!", point: CUN_HEAD, at: W("s4", 3), until: end(3), off: [40, -150], accent: Y }],
    highlights: ["LENDA", "DOIS", "PARAR", "TRABALHAR"],
    captions: [{ text: "Lenda número dois: quem recebe tem que parar de trabalhar.", from: voLocal("s4"), to: end(3) }],
    audioCues: [narration("s4", "ready"), sfx("whoosh", 0, 0.22), sfx("ghost", 4, 0.22), sfx("badge", W("s4", 3), 0.2)],
  },
  // ------------------------------------------------------------------ s5 · mito 2: junto com o salário
  {
    id: "scene-05-mito-2",
    startFrame: sc(4).from,
    durationInFrames: sc(4).durationInFrames,
    voKey: "s5",
    narration: "Mito! Ele é uma indenização, e dá pra receber junto com o salário.",
    camera: { projection: "perspective", movement: "orbit", keys: [key(0, P.cunhadoPush), key(W("s5", 1) - 4, P.cunhado, "soft"), key(W("s5", 1) + 4, P.pipes, "out"), key(W("s5", 9) - 4, P.pipes), key(W("s5", 9) + 10, P.piggy, "soft"), key(end(4), P.piggy)] },
    objects: [...SYSTEM(), CUNHADO, LENDA, MARCOS, o("piggy", "cofrinho"), o("accidentPipe", "cano-dourado-auxilio"), o("salaryPipe", "cano-do-salario")],
    animations: [
      ...busted("s5"),
      ...whip(W("s5", 1) - 2),
      lerp("cunhado.wave", W("s5", 1) - 4, W("s5", 1), 1, 0, "in"),
      lerp("piggy.level", 0, 1, 0.3, 0.3),
      lerp("coins.salary.flow", 0, 1, 1, 1),
      lerp("pipeAccident.grow", 0, 1, 0, 0),
      lerp("pipeAccident.grow", W("s5", 4) - 4, W("s5", 4) + 18, 0, 1, "out"),
      lerp("pipeAccident.glow", W("s5", 4), W("s5", 4) + 12, 0, 1, "out"),
      lerp("coins.accident.flow", W("s5", 4) + 14, W("s5", 4) + 24, 0, 1, "linear"),
      lerp("piggy.level", W("s5", 4) + 18, end(4), 0.3, 0.85, "linear"),
      lerp("coinRain", W("s5", 9), W("s5", 9) + 10, 0, 1, "out"),
      ...punch(W("s5", 9), 0.6),
    ],
    badges: [
      { text: "INDENIZAÇÃO", variant: "info", appearAt: W("s5", 4), disappearAt: W("s5", 9) - 2 },
      { text: "+ SALÁRIO DO TRABALHO", variant: "positive", appearAt: W("s5", 9), disappearAt: end(4) },
    ],
    bigWords: [{ text: "MITO!", at: 4, until: W("s5", 1) - 2, color: R, size: 220, tilt: -7 }],
    highlights: ["MITO", "INDENIZAÇÃO", "JUNTO", "SALÁRIO"],
    captions: [{ text: "Mito! Ele é uma indenização, e dá pra receber junto com o salário.", from: voLocal("s5"), to: end(4) }],
    audioCues: [narration("s5", "ready"), sfx("buzz", 4, 0.3), sfx("stamp", 4, 0.3), sfx("pop", W("s5", 1) - 8, 0.24), sfx("whoosh", W("s5", 1) - 2, 0.22), sfx("badge", W("s5", 4), 0.2), sfx("coin", W("s5", 4) + 16, 0.22), sfx("coin", W("s5", 9) + 2, 0.22), sfx("badge", W("s5", 9), 0.2)],
  },
  // ------------------------------------------------------------------ s6 · lenda 3
  {
    id: "scene-06-lenda-3",
    startFrame: sc(5).from,
    durationInFrames: sc(5).durationInFrames,
    voKey: "s6",
    narration: "Lenda número três: se o INSS negou, acabou.",
    camera: { projection: "perspective", movement: "tracking", keys: [key(0, P.cunhado), key(W("s6", 5) - 2, P.cunhadoPush, "linear"), key(W("s6", 5) + 6, P.doc, "out"), key(end(5), P.doc)] },
    objects: [...SYSTEM(), CUNHADO, LENDA, MARCOS, o("doc", "documento-negado")],
    animations: [
      ...legend(),
      lerp("coinRain", 0, 6, 1, 0, "in"),
      lerp("doc.pop", 0, 1, 1, 1),
      lerp("doc.deny", 0, 1, 1, 1),
      lerp("doc.ok", 0, 1, 0, 0),
      ...whip(W("s6", 5)),
      ...punch(W("s6", 6), 0.8),
      lerp("vignette.red", W("s6", 6), W("s6", 6) + 8, 0, 0.55, "out"),
      lerp("vignette.red", end(5) - 6, end(5), 0.55, 0, "in"),
    ],
    badges: [],
    bigWords: [{ text: "LENDA #3", at: W("s6", 0), until: W("s6", 3), color: PURPLE, size: 170, y: 500, tilt: -5 }],
    labels: [{ text: "SE O INSS NEGOU, ACABOU!", point: CUN_HEAD, at: W("s6", 3), until: W("s6", 5) + 2, off: [50, -150], accent: Y }],
    highlights: ["LENDA", "TRÊS", "NEGOU", "ACABOU"],
    captions: [{ text: "Lenda número três: se o INSS negou, acabou.", from: voLocal("s6"), to: end(5) }],
    audioCues: [narration("s6", "ready"), sfx("whoosh", 0, 0.22), sfx("ghost", 4, 0.22), sfx("badge", W("s6", 3), 0.2), sfx("whoosh", W("s6", 5), 0.22), sfx("stamp", W("s6", 6), 0.3)],
  },
  // ------------------------------------------------------------------ s7 · mito 3: recurso vira o jogo
  {
    id: "scene-07-mito-3",
    startFrame: sc(6).from,
    durationInFrames: sc(6).durationInFrames,
    voKey: "s7",
    narration: "Mito! Dá pra recorrer e virar o jogo, que nem o Marcos.",
    camera: { projection: "perspective", movement: "tracking", keys: [key(0, P.cunhadoPush), key(W("s7", 1) - 4, P.cunhado, "soft"), key(W("s7", 1) + 4, P.docWide, "out"), key(W("s7", 8) - 2, P.docWide), key(W("s7", 8) + 8, P.marcos, "out"), key(end(6), P.marcos)] },
    objects: [...SYSTEM(), CUNHADO, LENDA, MARCOS, o("doc", "documento"), o("liaBig", "advogada-de-bolso"), o("liaFolder", "pasta-do-recurso")],
    animations: [
      ...busted("s7"),
      ...whip(W("s7", 1) - 2),
      lerp("cunhado.wave", W("s7", 1) - 4, W("s7", 1), 1, 0, "in"),
      spring("liaBig.pop", W("s7", 1), W("s7", 1) + 24, 0, 1, 8),
      spring("liaFolder.pop", W("s7", 3), W("s7", 3) + 20, 0, 1, 8),
      lerp("liaBig.point", W("s7", 3), W("s7", 3) + 8, 0, 1, "out"),
      lerp("doc.deny", W("s7", 4), W("s7", 4) + 6, 1, 0, "in"),
      spring("doc.ok", W("s7", 5), W("s7", 5) + 20, 0, 1, 7),
      ...flash(W("s7", 5), 0.7),
      lerp("confetti", W("s7", 5), W("s7", 5) + 6, 0, 1, "out"),
      lerp("marcos.shades", W("s7", 8), W("s7", 8) + 10, 0, 1, "in"),
      lerp("marcos.dance", W("s7", 11), W("s7", 11) + 6, 0, 1, "out"),
      ...punch(W("s7", 11), 0.7),
    ],
    badges: [{ text: "RECURSO", variant: "positive", appearAt: W("s7", 3), disappearAt: W("s7", 8) - 2 }],
    bigWords: [
      { text: "MITO!", at: 4, until: W("s7", 1) - 2, color: R, size: 220, tilt: -7 },
      { text: "APROVADO!", at: W("s7", 5), until: W("s7", 8) - 2, color: G, size: 180, y: 520, tilt: -5 },
      { text: "VIROU O JOGO!", at: W("s7", 11), until: end(6), color: GOLD, size: 130, y: 520, tilt: -4 },
    ],
    labels: [{ text: "MARCOS", point: MARCOS_HEAD, at: W("s7", 10), until: end(6), off: [0, -130], accent: GOLD }],
    highlights: ["MITO", "RECORRER", "VIRAR", "JOGO", "MARCOS"],
    captions: [{ text: "Mito! Dá pra recorrer e virar o jogo, que nem o Marcos.", from: voLocal("s7"), to: end(6) }],
    audioCues: [narration("s7", "ready"), sfx("buzz", 4, 0.3), sfx("stamp", 4, 0.3), sfx("pop", W("s7", 1) - 8, 0.24), sfx("whoosh-big", W("s7", 1) - 2, 0.24), sfx("pop", W("s7", 3), 0.22), sfx("stamp", W("s7", 5), 0.36), sfx("airhorn", W("s7", 5) + 2, 0.24), sfx("whoosh-soft", W("s7", 8), 0.2), sfx("ding", W("s7", 8) + 10, 0.24)],
  },
  // ------------------------------------------------------------------ s8 · a verdade de dar medo: MEI e conta própria
  {
    id: "scene-08-verdade",
    startFrame: sc(7).from,
    durationInFrames: sc(7).durationInFrames,
    voKey: "s8",
    narration: "Agora, a verdade de dar medo: MEI e quem paga o INSS por conta própria não têm direito.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.spooky), key(W("s8", 5), P.spooky), key(W("s8", 6) - 2, P.pawns, "out"), key(W("s8", 15), P.pawns), key(end(7), P.pawnsPush, "out")] },
    objects: [...SYSTEM(), o("ghosts", "fantasmas"), o("mei", "boneco-mei"), o("auto", "autonomo")],
    animations: [
      ...whip(0),
      lerp("confetti", 0, 6, 1, 0, "in"),
      ...flash(2, 0.8),
      lerp("camera.shake", 2, 5, 0, 1, "out"),
      lerp("camera.shake", 5, 16, 1, 0, "in"),
      spring("ghosts.pop", 2, 26, 0, 1, 8),
      lerp("vignette.red", 2, 10, 0, 0.5, "out"),
      lerp("ghosts.pop", W("s8", 6) - 8, W("s8", 6), 1, 0, "in"),
      lerp("vignette.red", W("s8", 6) - 8, W("s8", 6), 0.5, 0, "in"),
      spring("mei.pop", W("s8", 6) - 4, W("s8", 6) + 18, 0, 1, 8),
      spring("auto.pop", W("s8", 8) - 2, W("s8", 8) + 20, 0, 1, 8),
      spring("mei.x", W("s8", 15), W("s8", 15) + 18, 0, 1, 7),
      spring("auto.x", W("s8", 15) + 3, W("s8", 15) + 21, 0, 1, 7),
      lerp("mei.shrug", W("s8", 16), W("s8", 16) + 8, 0, 1, "out"),
      lerp("auto.sad", W("s8", 16), W("s8", 16) + 8, 0, 1, "out"),
      ...flash(W("s8", 15), 0.5),
      lerp("vignette.red", W("s8", 15), W("s8", 15) + 8, 0, 0.6, "out"),
    ],
    badges: [],
    bigWords: [
      { text: "VERDADE", at: W("s8", 1), until: W("s8", 6) - 2, color: "#ffffff", size: 160, y: 470, tilt: -4 },
      { text: "DE DAR MEDO", at: W("s8", 3), until: W("s8", 6) - 2, color: R, size: 140, y: 630, tilt: -4 },
      { text: "SEM DIREITO", at: W("s8", 15), until: end(7), color: R, size: 160, y: 520, tilt: -5 },
    ],
    labels: [
      { text: "MEI", point: [-0.35, 1.75, -1.15], at: W("s8", 6), until: W("s8", 15), off: [-40, -120], accent: PURPLE },
      { text: "PAGA POR CONTA PRÓPRIA", point: [0.45, 2.1, -1.2], at: W("s8", 9), until: W("s8", 15), off: [30, -150], accent: "#ff9f1c" },
    ],
    highlights: ["VERDADE", "MEDO", "MEI", "CONTA", "PRÓPRIA", "NÃO", "DIREITO"],
    captions: [
      { text: "Agora, a verdade de dar medo:", from: voLocal("s8"), to: W("s8", 6) },
      { text: "MEI e quem paga o INSS por conta própria não têm direito.", from: W("s8", 6), to: end(7) },
    ],
    audioCues: [narration("s8", "ready"), sfx("thunder", 1, 0.4), sfx("ghost", 6, 0.24), sfx("pop", W("s8", 6), 0.22), sfx("pop", W("s8", 8), 0.22), sfx("buzz", W("s8", 15), 0.3), sfx("boo", W("s8", 15), 0.22)],
  },
  // ------------------------------------------------------------------ s9 · CTA
  {
    id: "scene-09-final",
    startFrame: sc(8).from,
    durationInFrames: sc(8).durationInFrames,
    voKey: "s9",
    narration: "Conhece alguém que ainda acredita em lenda? Manda esse vídeo pra ele!",
    camera: { projection: "perspective", movement: "dolly-out", keys: [key(0, P.plaza), key(W("s9", 7), P.plaza), key(W("s9", 11) + 26, P.final, "inOut"), key(end(8), P.final)] },
    objects: [...SYSTEM(), CUNHADO, MARCOS, o("liaBig", "advogada-de-bolso"), o("doc", "documento-aprovado")],
    animations: [
      ...whip(0),
      lerp("doc.deny", 0, 1, 0, 0),
      lerp("doc.ok", 0, 1, 1, 1),
      lerp("liaFolder.pop", 0, 1, 0, 0),
      lerp("liaBig.point", 0, 6, 1, 0, "in"),
      lerp("cunhado.pumpkin", W("s9", 6) - 4, W("s9", 6) + 6, 0, 1, "in"),
      lerp("liaBig.wave", W("s9", 7), W("s9", 7) + 8, 0, 1, "out"),
      lerp("plazaCoins", 4, 14, 0, 1, "out"),
      spring("share", W("s9", 7), W("s9", 7) + 24, 0, 1, 8),
      lerp("share", end(8) - 58, end(8) - 50, 1, 0, "in"),
      lerp("plazaCoins", end(8) - 60, end(8) - 40, 1, 0, "in"),
      spring("endcard", end(8) - 52, end(8) - 22, 0, 1, 10),
    ],
    badges: [{ text: "MANDA PRA QUEM ACREDITA EM LENDA", variant: "positive", appearAt: W("s9", 7), disappearAt: end(8) - 54 }],
    bigWords: [{ text: "KKKKKKK", at: W("s9", 6) + 6, until: W("s9", 7) + 10, color: Y, size: 170, y: 520, tilt: 5 }],
    highlights: ["ACREDITA", "LENDA", "MANDA", "VÍDEO"],
    captions: [{ text: "Conhece alguém que ainda acredita em lenda? Manda esse vídeo pra ele!", from: voLocal("s9"), to: end(8) - 52 }],
    audioCues: [narration("s9", "ready"), sfx("whoosh-big", 0, 0.22), sfx("thud", W("s9", 6) + 6, 0.3), sfx("pop", W("s9", 7), 0.24), sfx("ding", W("s9", 7) + 4, 0.22), sfx("final", end(8) - 52, 0.3)],
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
