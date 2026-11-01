import { evaluateTrack, orbit, type EaseName, type TrackAnimation, type Vec3 } from "../utils/animation";
import { HAND_REACH, L, POCKET_WORK, STAGE } from "../layout";
import { DURATION, FPS, HEIGHT, SCENE_FRAMES, voLocal, WIDTH, wordLocal, type VoKey } from "../utils/timing";

// EP07 · Série 2 (comédia "mito", Halloween) · Auxílio-acidente: negado, recurso, aprovado.
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

/** Cenário fixo: ilha, INSS, galpão com estante/escada (o tombo) e o Marcos. */
const SYSTEM = (): SceneObject[] => [o("island", "diorama-ilha-halloween"), o("inss", "predio-inss"), o("warehouse", "galpao"), o("shelf", "estante+escada"), o("marcos", "marcos")];
const CUNHADO = o("cunhado", "cunhado-zoeiro");
const DOC = o("doc", "documento-gigante-do-inss");
const LIA = o("liaBig", "advogada-de-bolso-gigante");
const PLAZA: Vec3 = [0.45, 0, -1.35];
const MX = PLAZA[0] - L.work[0];
const MZ = PLAZA[2] - L.work[2];
const CUN_HEAD: Vec3 = [-0.4, 2.1, -1.05];
const MARCOS_HEAD: Vec3 = [PLAZA[0], 2.1, PLAZA[2]];
const POCKET: Vec3 = [POCKET_WORK[0] + MX, POCKET_WORK[1], POCKET_WORK[2] + MZ];
const PURPLE = "#c77dff";

const P = {
  far: orbit([0, 1.4, -1.0], 46, 30, 32),
  doc: orbit([STAGE.doc[0], 1.2, STAGE.doc[2]], 5.6, 17, 3),
  docPush: orbit([STAGE.doc[0], 1.15, STAGE.doc[2]], 4.4, 17, 2),
  plaza: orbit([0.4, 1.05, -1.5], 16, -8, 9),
  plazaTight: orbit([0.05, 1.1, -1.25], 12.5, -6, 6),
  marcos: orbit([PLAZA[0], 1.55, PLAZA[2]], 6.5, -25, 4),
  cunhado: orbit([-0.4, 1.55, -1.05], 6.5, -4, 3),
  ladder: orbit([-2.9, 1.6, -2.1], 10, 32, 12),
  ladderFall: orbit([-2.65, 0.9, -1.6], 8.5, 38, 8),
  ladderLow: orbit([-2.35, 0.7, -1.35], 6.5, 30, 6),
  hand: orbit([HAND_REACH[0] + 0.02, HAND_REACH[1] - 0.02, HAND_REACH[2] + 0.1], 1.1, 18, 34),
  handWide: orbit([HAND_REACH[0] + 0.05, 1.1, HAND_REACH[2] + 0.05], 2.6, 22, 18),
  phone: orbit([-2.75, 1.6, -1.65], 4.4, 16, 4),
  walkA: orbit([-2.4, 1.1, -1.6], 11, 0, 6),
  walkB: orbit([0.2, 1.1, -1.45], 11, 0, 6),
  spooky: orbit([0.3, 1.7, -1.4], 14, 16, 22),
  spookyR: orbit([0.3, 1.7, -1.4], 13, -14, 18),
  pocket: orbit([POCKET[0], POCKET[1] + 0.08, POCKET[2]], 2.7, 14, 6),
  lia: orbit([0.85, 0.95, -1.3], 5.8, 6, 4),
  pipes: orbit([1.2, 2.0, -0.4], 22, -12, 22),
  piggy: orbit([1.3, 1.4, 2.0], 16, -20, 14),
  final: orbit([0.2, 1.4, -1.3], 30, 10, 18),
};

export const scenes: ScenePlan[] = [
  // ------------------------------------------------------------------ s1 · gancho (NEGADO + cunhado rindo + flash do final)
  {
    id: "scene-01-gancho",
    startFrame: sc(0).from,
    durationInFrames: sc(0).durationInFrames,
    voKey: "s1",
    narration: "O INSS negou o benefício do Marcos, e o cunhado caiu na risada. Mas espera o final!",
    camera: {
      projection: "perspective",
      movement: "tracking",
      keys: [key(0, P.docPush), key(W("s1", 2) - 6, P.doc, "soft"), key(W("s1", 4), P.plaza, "out"), key(W("s1", 9) - 6, P.plaza), key(W("s1", 9), P.cunhado, "out"), key(W("s1", 13) - 2, P.cunhado), key(W("s1", 13) + 4, P.plazaTight, "out"), key(end(0), P.plazaTight)],
    },
    objects: [...SYSTEM(), CUNHADO, DOC],
    animations: [
      lerp("marcos.spot", 0, 1, 1, 1),
      lerp("marcos.dx", 0, 1, MX, MX),
      lerp("marcos.dz", 0, 1, MZ, MZ),
      lerp("marcos.climb", 0, 1, 0, 0, "linear", "u3d"),
      lerp("marcos.fall", 0, 1, 0, 0),
      lerp("marcos.recover", 0, 1, 0, 0),
      lerp("marcos.reach", 0, 1, 0, 0),
      lerp("hand.close", 0, 1, 0, 0),
      lerp("lia.pop", 0, 1, 0, 0),
      lerp("doc.pop", 0, 1, 1, 1),
      lerp("cunhado.pop", 0, 1, 1, 1),
      spring("doc.deny", 3, 26, 0, 1, 8),
      lerp("doc.ok", 0, 1, 0, 0),
      ...flash(3, 0.7),
      lerp("camera.shake", 3, 6, 0, 1, "out"),
      lerp("camera.shake", 6, 18, 1, 0, "in"),
      lerp("vignette.red", 3, 10, 0, 0.6, "out"),
      lerp("vignette.red", 30, 44, 0.6, 0, "inOut"),
      lerp("marcos.sad", W("s1", 4), W("s1", 4) + 10, 0, 1, "out"),
      lerp("cunhado.laugh", W("s1", 9), W("s1", 9) + 6, 0, 1, "out"),
      // flash do final: óculos de mito, moedas, confete, cunhado chocado
      ...whip(W("s1", 13)),
      ...flash(W("s1", 13) + 2, 0.5),
      lerp("cunhado.laugh", W("s1", 13) + 2, W("s1", 13) + 4, 1, 0, "linear"),
      spring("cunhado.shock", W("s1", 13) + 4, W("s1", 13) + 24, 0, 1, 7),
      lerp("marcos.sad", W("s1", 13) + 2, W("s1", 13) + 4, 1, 0, "linear"),
      lerp("doc.deny", W("s1", 13) + 2, W("s1", 13) + 4, 1, 0, "linear"),
      lerp("doc.ok", W("s1", 13) + 2, W("s1", 13) + 4, 0, 1, "linear"),
      lerp("marcos.shades", W("s1", 13) + 4, W("s1", 13) + 14, 0, 1, "in"),
      lerp("marcos.dance", W("s1", 13) + 14, W("s1", 13) + 18, 0, 1, "out"),
      lerp("plazaCoins", W("s1", 13) + 4, W("s1", 13) + 10, 0, 1, "out"),
      lerp("confetti", W("s1", 13) + 4, W("s1", 13) + 10, 0, 1, "out"),
      lerp("rewind", end(0) - 10, end(0), 0, 1, "in"),
    ],
    badges: [],
    bigWords: [
      { text: "NEGADO!", at: 3, until: W("s1", 7), color: R, size: 190, tilt: -7 },
      { text: "KKKKKKK", at: W("s1", 10), until: W("s1", 13) - 1, color: Y, size: 170, y: 520, tilt: 5 },
      { text: "ESPERA", at: W("s1", 14), until: end(0), color: "#ffffff", size: 150, y: 960, tilt: -5 },
      { text: "O FINAL!", at: W("s1", 15), until: end(0), color: GOLD, size: 150, y: 1120, tilt: -5 },
    ],
    labels: [{ text: "CUNHADO", point: CUN_HEAD, at: W("s1", 9) + 2, until: W("s1", 13) - 2, off: [0, -120], accent: PURPLE }],
    highlights: ["INSS", "NEGOU", "MARCOS", "CUNHADO", "RISADA", "FINAL"],
    captions: [{ text: "O INSS negou o benefício do Marcos, e o cunhado caiu na risada. Mas espera o final!", from: voLocal("s1"), to: end(0) }],
    audioCues: [
      narration("s1", "ready"),
      sfx("thunder", 0, 0.42),
      sfx("stamp", 3, 0.45),
      sfx("boo", 3, 0.22),
      sfx("whoosh", W("s1", 4) - 4, 0.2),
      sfx("whoosh", W("s1", 9) - 3, 0.22),
      sfx("pop", W("s1", 9) + 2, 0.2),
      sfx("scratch", W("s1", 13) - 2, 0.38),
      sfx("airhorn", W("s1", 13) + 6, 0.2),
      sfx("coin", W("s1", 13) + 8, 0.2),
      sfx("rewind", end(0) - 10, 0.3),
    ],
  },
  // ------------------------------------------------------------------ s2 · o tombo e a sequela
  {
    id: "scene-02-tombo",
    startFrame: sc(1).from,
    durationInFrames: sc(1).durationInFrames,
    voKey: "s2",
    narration: "O Marcos caiu da escada no trabalho e ficou com dois dedos que não dobram mais.",
    camera: {
      projection: "perspective",
      movement: "vertical",
      keys: [key(0, P.ladder), key(W("s2", 4), P.ladder), key(W("s2", 6), P.ladderFall, "soft"), key(W("s2", 7) - 2, P.ladderLow, "out"), key(W("s2", 8) + 2, P.handWide, "out"), key(W("s2", 10), P.hand, "soft"), key(end(1), P.hand)],
    },
    objects: [...SYSTEM()],
    animations: [
      lerp("rewind", 0, 10, 1, 0, "out"),
      ...whip(0),
      lerp("marcos.dx", 0, 1, 0, 0),
      lerp("marcos.dz", 0, 1, 0, 0),
      lerp("marcos.shades", 0, 1, 0, 0),
      lerp("marcos.dance", 0, 1, 0, 0),
      lerp("marcos.sad", 0, 1, 0, 0),
      lerp("plazaCoins", 0, 1, 0, 0),
      lerp("confetti", 0, 1, 0, 0),
      lerp("fingers.stiff", 0, 1, 1, 1),
      lerp("marcos.climb", 2, 20, 0, 1.2, "inOut", "u3d"),
      lerp("ladder.wobble", 20, 26, 0, 1, "linear"),
      lerp("ladder.wobble", 26, 30, 1, 0, "out"),
      lerp("ladder.slide", 26, 40, 0, 1, "in"),
      lerp("speed", 30, 36, 0, 1, "out"),
      lerp("marcos.fall", 30, 48, 0, 1, "in"),
      lerp("speed", 46, 52, 1, 0, "in"),
      ...flash(48),
      lerp("camera.shake", 48, 52, 0, 1, "out"),
      lerp("camera.shake", 52, 62, 1, 0, "in"),
      lerp("dizzy.stars", 50, 58, 0, 1, "out"),
      ...whip(W("s2", 7) + 1),
      lerp("dizzy.stars", W("s2", 7), W("s2", 7) + 4, 1, 0, "in"),
      lerp("marcos.recover", W("s2", 7) + 1, W("s2", 7) + 3, 0, 1, "linear"),
      lerp("ladder.slide", W("s2", 7) + 1, W("s2", 7) + 3, 1, 0, "linear"),
      lerp("marcos.reach", W("s2", 7) + 2, W("s2", 7) + 10, 0, 1, "inOut"),
      lerp("hand.close", W("s2", 10), W("s2", 13), 0, 1, "inOut"),
      lerp("stiff.glow", W("s2", 13), W("s2", 13) + 8, 0, 1, "out"),
      ...punch(W("s2", 14)),
      lerp("vignette.red", W("s2", 14) - 4, W("s2", 14) + 10, 0, 0.5, "inOut"),
    ],
    badges: [{ text: "SEQUELA", variant: "negative", subtitle: "dois dedos não dobram mais", appearAt: W("s2", 13), disappearAt: end(1) }],
    bigWords: [{ text: "TOMBO!", at: 48, until: W("s2", 7), color: R, size: 190, tilt: -8 }],
    highlights: ["MARCOS", "CAIU", "ESCADA", "TRABALHO", "DOIS", "DEDOS", "DOBRAM"],
    captions: [{ text: "O Marcos caiu da escada no trabalho e ficou com dois dedos que não dobram mais.", from: voLocal("s2"), to: end(1) }],
    audioCues: [
      narration("s2", "ready"),
      sfx("whoosh", 0, 0.24),
      sfx("boing", 22, 0.26),
      sfx("whoosh-big", 32, 0.26),
      sfx("thud", 48, 0.42),
      sfx("crack", 49, 0.24),
      sfx("whoosh-soft", W("s2", 7), 0.2),
      sfx("tick", W("s2", 13), 0.24),
      sfx("badge", W("s2", 13), 0.22),
    ],
  },
  // ------------------------------------------------------------------ s3 · descobriu o direito, foi pedir... e a resposta foi
  {
    id: "scene-03-pedido",
    startFrame: sc(2).from,
    durationInFrames: sc(2).durationInFrames,
    voKey: "s3",
    narration: "Aí ele descobriu que tinha direito ao auxílio-acidente e foi pedir. E a resposta do INSS foi...",
    camera: {
      projection: "perspective",
      movement: "tracking",
      keys: [key(0, P.handWide), key(10, P.phone, "out"), key(W("s3", 8) - 2, P.phone), key(W("s3", 9), P.walkA, "soft"), key(W("s3", 11) + 4, P.walkB, "inOut"), key(W("s3", 11) + 22, P.doc, "soft"), key(end(2), P.docPush, "inOut")],
    },
    objects: [...SYSTEM(), o("phone", "celular"), CUNHADO, DOC],
    animations: [
      ...whip(0),
      lerp("marcos.reach", 0, 8, 1, 0, "inOut"),
      lerp("hand.close", 0, 8, 1, 0, "inOut"),
      lerp("stiff.glow", 0, 8, 1, 0, "in"),
      lerp("marcos.recover", 0, 1, 1, 1),
      spring("phone.pop", 6, 26, 0, 1, 9),
      lerp("phone.ring", 8, 30, 0, 1, "linear"),
      lerp("marcos.hop", W("s3", 7), W("s3", 7) + 4, 0, 1, "out"),
      lerp("marcos.hop", W("s3", 8), W("s3", 8) + 4, 1, 0, "in"),
      lerp("phone.pop", W("s3", 8), W("s3", 8) + 6, 1, 0, "in"),
      lerp("marcos.ry", W("s3", 8), W("s3", 8) + 6, 0, Math.PI / 2, "out", "rad"),
      lerp("marcos.dx", W("s3", 9), W("s3", 11) + 6, 0, MX, "inOut"),
      lerp("marcos.dz", W("s3", 9), W("s3", 11) + 6, 0, MZ, "inOut"),
      lerp("marcos.ry", W("s3", 11) + 4, W("s3", 11) + 12, Math.PI / 2, 0, "inOut", "rad"),
      lerp("cunhado.pop", 0, 1, 0, 0),
      lerp("doc.pop", 0, 1, 0, 0),
      spring("cunhado.pop", W("s3", 11) + 4, W("s3", 11) + 24, 0, 1, 9),
      spring("doc.pop", W("s3", 11), W("s3", 11) + 22, 0, 1, 9),
      lerp("doc.deny", 0, 1, 0, 0),
      lerp("doc.ok", 0, 1, 0, 0),
      lerp("marcos.hop", W("s3", 13), W("s3", 13) + 4, 0, 1, "out"),
      lerp("marcos.hop", end(2) - 6, end(2), 1, 0, "in"),
    ],
    badges: [],
    bigWords: [{ text: "AUXÍLIO-ACIDENTE?!", at: W("s3", 7), until: W("s3", 8) + 2, color: GOLD, size: 110, y: 560, tilt: -4 }],
    labels: [
      { text: "TENHO DIREITO?!", point: [L.work[0], 2.15, L.work[2]], at: W("s3", 2), until: W("s3", 7) - 2, off: [0, -110], accent: Y },
      { text: "CUNHADO", point: CUN_HEAD, at: W("s3", 11) + 10, until: W("s3", 13) - 2, off: [0, -120], accent: PURPLE },
    ],
    highlights: ["DESCOBRIU", "DIREITO", "AUXÍLIO-ACIDENTE", "PEDIR", "RESPOSTA", "INSS"],
    captions: [
      { text: "Aí ele descobriu que tinha direito ao auxílio-acidente e foi pedir.", from: voLocal("s3"), to: W("s3", 11) },
      { text: "E a resposta do INSS foi...", from: W("s3", 11), to: end(2) },
    ],
    audioCues: [
      narration("s3", "ready"),
      sfx("whoosh", 0, 0.22),
      sfx("phone", 8, 0.2),
      sfx("ding", W("s3", 7), 0.24),
      sfx("whoosh-soft", W("s3", 9), 0.2),
      sfx("pop", W("s3", 11) + 6, 0.2),
      sfx("pop-high", W("s3", 11) + 2, 0.18),
      sfx("drumroll", end(2) - 51, 0.32),
    ],
  },
  // ------------------------------------------------------------------ s4 · NEGADO! e o cunhado: "eu falei que era golpe"
  {
    id: "scene-04-negado",
    startFrame: sc(3).from,
    durationInFrames: sc(3).durationInFrames,
    voKey: "s4",
    narration: "Negado! E o cunhado, claro: eu falei que era golpe!",
    camera: {
      projection: "perspective",
      movement: "tracking",
      keys: [key(0, P.docPush), key(W("s4", 1) - 4, P.doc, "soft"), key(W("s4", 1) + 2, P.cunhado, "out"), key(W("s4", 5) - 2, P.cunhado), key(W("s4", 5) + 6, P.plazaTight, "out"), key(end(3), P.plazaTight)],
    },
    objects: [...SYSTEM(), CUNHADO, DOC],
    animations: [
      lerp("marcos.hop", 0, 1, 0, 0),
      spring("doc.deny", 6, 30, 0, 1, 8),
      ...flash(6, 0.8),
      lerp("camera.shake", 6, 9, 0, 1, "out"),
      lerp("camera.shake", 9, 22, 1, 0, "in"),
      lerp("vignette.red", 6, 12, 0, 0.65, "out"),
      lerp("vignette.red", W("s4", 1), W("s4", 1) + 12, 0.65, 0, "inOut"),
      spring("marcos.shock", 6, 20, 0, 1, 8),
      lerp("marcos.shock", 20, 30, 1, 0, "inOut"),
      lerp("marcos.sad", 20, 30, 0, 1, "inOut"),
      ...whip(W("s4", 1)),
      lerp("cunhado.laugh", W("s4", 1) + 2, W("s4", 1) + 8, 0, 1, "out"),
      ...punch(W("s4", 9), 0.8),
    ],
    badges: [],
    bigWords: [
      { text: "NEGADO!", at: 6, until: W("s4", 1), color: R, size: 200, tilt: -7 },
      { text: "EU FALEI", at: W("s4", 5), until: end(3), color: "#ffffff", size: 150, y: 470, tilt: 4 },
      { text: "ERA GOLPE!", at: W("s4", 9), until: end(3), color: Y, size: 150, y: 640, tilt: 4 },
    ],
    labels: [{ text: "KKKKKK", point: CUN_HEAD, at: W("s4", 1) + 6, until: W("s4", 5), off: [130, -120], accent: Y }],
    highlights: ["NEGADO", "CUNHADO", "GOLPE"],
    captions: [{ text: "Negado! E o cunhado, claro: eu falei que era golpe!", from: voLocal("s4"), to: end(3) }],
    audioCues: [narration("s4", "ready"), sfx("stamp", 6, 0.46), sfx("thunder", 5, 0.4), sfx("boo", 6, 0.2), sfx("whoosh", W("s4", 1), 0.22), sfx("boing", W("s4", 9), 0.2)],
  },
  // ------------------------------------------------------------------ s5 · assustador... mas chamou a advogada de bolso → recurso
  {
    id: "scene-05-recurso",
    startFrame: sc(4).from,
    durationInFrames: sc(4).durationInFrames,
    voKey: "s5",
    narration: "Mais assustador que filme de Halloween. Mas o Marcos chamou a advogada de bolso, e ela entrou com recurso.",
    camera: {
      projection: "perspective",
      movement: "orbit",
      keys: [key(0, P.spooky), key(W("s5", 6) - 4, P.spookyR, "linear"), key(W("s5", 7), P.pocket, "out"), key(W("s5", 14) - 2, P.pocket), key(W("s5", 14) + 6, P.lia, "out"), key(end(4), P.lia)],
    },
    objects: [...SYSTEM(), CUNHADO, DOC, o("ghosts", "fantasmas"), LIA, o("liaFolder", "pasta-do-recurso")],
    animations: [
      lerp("cunhado.laugh", 0, 10, 1, 0.5, "inOut"),
      spring("ghosts.pop", 2, 30, 0, 1, 9),
      ...flash(W("s5", 5), 0.75),
      lerp("camera.shake", W("s5", 5), W("s5", 5) + 4, 0, 0.8, "out"),
      lerp("camera.shake", W("s5", 5) + 4, W("s5", 5) + 14, 0.8, 0, "in"),
      lerp("marcos.shock", W("s5", 5), W("s5", 5) + 6, 0, 0.6, "out"),
      lerp("marcos.shock", W("s5", 5) + 6, W("s5", 5) + 16, 0.6, 0, "inOut"),
      lerp("ghosts.pop", W("s5", 6) - 4, W("s5", 6) + 6, 1, 0, "in"),
      ...whip(W("s5", 7) - 2),
      lerp("cunhado.laugh", W("s5", 7), W("s5", 7) + 2, 0.5, 0, "linear"),
      spring("lia.pop", W("s5", 11) - 4, W("s5", 11) + 22, 0, 1, 9),
      lerp("lia.wave", W("s5", 11) + 6, W("s5", 11) + 12, 0, 1, "out"),
      lerp("marcos.sad", W("s5", 11), W("s5", 11) + 10, 1, 0, "inOut"),
      ...whip(W("s5", 14)),
      lerp("lia.pop", W("s5", 14), W("s5", 14) + 4, 1, 0, "in"),
      lerp("lia.wave", W("s5", 14), W("s5", 14) + 2, 1, 0, "linear"),
      spring("liaBig.pop", W("s5", 14) + 2, W("s5", 14) + 26, 0, 1, 8),
      spring("liaFolder.pop", W("s5", 16), W("s5", 16) + 20, 0, 1, 8),
      lerp("liaBig.point", W("s5", 16), W("s5", 16) + 8, 0, 1, "out"),
      ...punch(W("s5", 18), 0.8),
    ],
    badges: [],
    bigWords: [
      { text: "SOCORRO!", at: W("s5", 5), until: W("s5", 6) + 4, color: PURPLE, size: 170, tilt: -6 },
      { text: "RECURSO!", at: W("s5", 18), until: end(4), color: GOLD, size: 180, y: 560, tilt: -5 },
    ],
    labels: [{ text: "ADVOGADA DE BOLSO", point: [POCKET[0], POCKET[1] + 0.42, POCKET[2]], at: W("s5", 11) + 4, until: W("s5", 14), off: [0, -150], accent: GOLD }],
    highlights: ["ASSUSTADOR", "HALLOWEEN", "ADVOGADA", "BOLSO", "RECURSO"],
    captions: [
      { text: "Mais assustador que filme de Halloween.", from: voLocal("s5"), to: W("s5", 6) },
      { text: "Mas o Marcos chamou a advogada de bolso, e ela entrou com recurso.", from: W("s5", 6), to: end(4) },
    ],
    audioCues: [
      narration("s5", "ready"),
      sfx("ghost", 2, 0.26),
      sfx("ghost", 40, 0.2),
      sfx("thunder", W("s5", 5) - 1, 0.38),
      sfx("whoosh", W("s5", 7) - 2, 0.22),
      sfx("pop-high", W("s5", 11) - 2, 0.24),
      sfx("shimmer", W("s5", 11), 0.18),
      sfx("whoosh-big", W("s5", 14), 0.26),
      sfx("pop", W("s5", 14) + 4, 0.24),
      sfx("pop", W("s5", 16) + 2, 0.2),
      sfx("badge", W("s5", 18), 0.24),
    ],
  },
  // ------------------------------------------------------------------ s6 · laudos, sequela... APROVADO!
  {
    id: "scene-06-aprovado",
    startFrame: sc(5).from,
    durationInFrames: sc(5).durationInFrames,
    voKey: "s6",
    narration: "Juntou os laudos, provou a sequela, e aí... aprovado!",
    camera: {
      projection: "perspective",
      movement: "dolly-in",
      keys: [key(0, P.lia), key(W("s6", 6) - 2, P.lia), key(W("s6", 7), P.doc, "out"), key(W("s6", 8) - 2, P.docPush, "soft"), key(end(5), P.docPush)],
    },
    objects: [...SYSTEM(), CUNHADO, DOC, LIA, o("liaFolder", "pasta-do-recurso")],
    animations: [
      lerp("liaBig.point", W("s6", 2), W("s6", 2) + 6, 1, 0.3, "inOut"),
      lerp("liaFolder.pop", W("s6", 2), W("s6", 2) + 4, 1, 1.25, "out"),
      lerp("liaFolder.pop", W("s6", 2) + 4, W("s6", 2) + 10, 1.25, 1, "inOut"),
      spring("xray", W("s6", 3), W("s6", 3) + 22, 0, 1, 10),
      lerp("xray", W("s6", 6) - 6, W("s6", 6), 1, 0, "in"),
      lerp("doc.deny", W("s6", 7), W("s6", 7) + 8, 1, 0, "in"),
      spring("doc.ok", W("s6", 8), W("s6", 8) + 22, 0, 1, 7),
      ...flash(W("s6", 8), 0.8),
      ...punch(W("s6", 8)),
      lerp("confetti", W("s6", 8), W("s6", 8) + 6, 0, 1, "out"),
      lerp("marcos.sad", W("s6", 8), W("s6", 8) + 4, 1, 0, "out"),
    ],
    badges: [
      { text: "LAUDOS MÉDICOS", variant: "info", appearAt: W("s6", 0), disappearAt: W("s6", 3) },
      { text: "SEQUELA PROVADA", variant: "positive", appearAt: W("s6", 3), disappearAt: W("s6", 6) },
    ],
    bigWords: [{ text: "APROVADO!", at: W("s6", 8), until: end(5), color: G, size: 190, tilt: -6 }],
    highlights: ["LAUDOS", "PROVOU", "SEQUELA", "APROVADO"],
    captions: [{ text: "Juntou os laudos, provou a sequela, e aí... aprovado!", from: voLocal("s6"), to: end(5) }],
    audioCues: [narration("s6", "ready"), sfx("pop", W("s6", 2), 0.22), sfx("badge", W("s6", 0), 0.2), sfx("shimmer", W("s6", 3), 0.18), sfx("whoosh", W("s6", 7) - 2, 0.2), sfx("stamp", W("s6", 8), 0.4), sfx("airhorn", W("s6", 8), 0.26)],
  },
  // ------------------------------------------------------------------ s7 · mito: óculos + quanto recebe
  {
    id: "scene-07-mito",
    startFrame: sc(6).from,
    durationInFrames: sc(6).durationInFrames,
    voKey: "s7",
    narration: "Agora o Marcos recebe, em regra, metade do salário de benefício todo mês, junto com o salário, até se aposentar.",
    camera: {
      projection: "perspective",
      movement: "orbit",
      keys: [key(0, P.marcos), key(W("s7", 5), P.marcos), key(W("s7", 6) - 2, P.pipes, "out"), key(W("s7", 13) - 2, P.pipes), key(W("s7", 13) + 10, P.piggy, "soft"), key(end(6), P.piggy)],
    },
    objects: [...SYSTEM(), CUNHADO, DOC, o("piggy", "cofrinho"), o("accidentPipe", "cano-dourado-auxilio", "inexistente", "aberto"), o("salaryPipe", "cano-do-salario")],
    animations: [
      lerp("liaBig.pop", 0, 1, 0, 0),
      lerp("liaFolder.pop", 0, 1, 0, 0),
      lerp("marcos.shades", 4, 16, 0, 1, "in"),
      lerp("marcos.thumb", 16, 24, 0, 1, "out"),
      ...punch(16, 0.7),
      lerp("confetti", 30, 44, 1, 0, "in"),
      ...whip(W("s7", 6) - 4),
      lerp("pipeAccident.grow", 0, 1, 0, 0),
      lerp("pipeAccident.grow", W("s7", 6) - 2, W("s7", 6) + 22, 0, 1, "out"),
      lerp("pipeAccident.glow", W("s7", 6), W("s7", 6) + 12, 0, 1, "out"),
      lerp("coins.accident.flow", W("s7", 6) + 18, W("s7", 6) + 28, 0, 1, "linear"),
      lerp("coins.salary.flow", 0, 1, 0, 0),
      lerp("coins.salary.flow", W("s7", 13), W("s7", 13) + 10, 0, 1, "linear"),
      lerp("piggy.level", 0, 1, 0.25, 0.25),
      lerp("piggy.level", W("s7", 6) + 20, end(6), 0.25, 0.85, "linear"),
      lerp("coinRain", W("s7", 13), W("s7", 13) + 10, 0, 1, "out"),
    ],
    badges: [
      { text: "EM REGRA", variant: "info", appearAt: W("s7", 4), disappearAt: W("s7", 6) - 2 },
      { text: "DO SALÁRIO DE BENEFÍCIO", variant: "positive", appearAt: W("s7", 7), disappearAt: W("s7", 13) - 2 },
      { text: "+ SALÁRIO DO TRABALHO", variant: "positive", appearAt: W("s7", 13), disappearAt: W("s7", 17) - 2 },
      { text: "ATÉ SE APOSENTAR", variant: "info", appearAt: W("s7", 17), disappearAt: end(6) },
    ],
    bigWords: [
      { text: "MITO!", at: 16, until: W("s7", 5), color: GOLD, size: 210, y: 520, tilt: -6 },
      { text: "50%", at: W("s7", 6), until: W("s7", 13) - 2, color: GOLD, size: 230, y: 560, tilt: -4 },
    ],
    highlights: ["MARCOS", "RECEBE", "METADE", "SALÁRIO", "BENEFÍCIO", "MÊS", "APOSENTAR"],
    captions: [
      { text: "Agora o Marcos recebe, em regra, metade do salário de benefício todo mês,", from: voLocal("s7"), to: W("s7", 13) },
      { text: "junto com o salário, até se aposentar.", from: W("s7", 13), to: end(6) },
    ],
    audioCues: [narration("s7", "ready"), sfx("whoosh-soft", 4, 0.2), sfx("ding", 16, 0.26), sfx("whoosh", W("s7", 6) - 4, 0.22), sfx("coin", W("s7", 6) + 20, 0.22), sfx("badge", W("s7", 7), 0.2), sfx("coin", W("s7", 13) + 2, 0.22), sfx("badge", W("s7", 17), 0.2)],
  },
  // ------------------------------------------------------------------ s8 · e o cunhado?
  {
    id: "scene-08-cunhado",
    startFrame: sc(7).from,
    durationInFrames: sc(7).durationInFrames,
    voKey: "s8",
    narration: "E o cunhado? Ainda tá procurando onde enfiar a cara.",
    camera: {
      projection: "perspective",
      movement: "tracking",
      keys: [key(0, P.plazaTight), key(W("s8", 3) - 2, P.plazaTight), key(W("s8", 3) + 8, P.cunhado, "out"), key(end(7), P.cunhado)],
    },
    objects: [...SYSTEM(), CUNHADO, DOC, o("piggy", "cofrinho")],
    animations: [
      ...whip(0),
      lerp("coinRain", 0, 6, 1, 0, "in"),
      lerp("marcos.thumb", 0, 6, 1, 0, "in"),
      lerp("marcos.dance", 2, 8, 0, 1, "out"),
      lerp("plazaCoins", 2, 10, 0, 1, "out"),
      spring("cunhado.shock", W("s8", 2), W("s8", 2) + 18, 0, 1, 7),
      lerp("cunhado.shock", W("s8", 3), W("s8", 3) + 8, 1, 0, "inOut"),
      lerp("cunhado.sad", W("s8", 3), W("s8", 3) + 8, 0, 1, "inOut"),
      lerp("cunhado.pumpkin", W("s8", 7) - 2, W("s8", 7) + 8, 0, 1, "in"),
      ...punch(W("s8", 7) + 8, 0.7),
    ],
    badges: [],
    bigWords: [{ text: "KKKKKKK", at: W("s8", 9), until: end(7), color: Y, size: 170, y: 520, tilt: 5 }],
    labels: [{ text: "CUNHADO", point: CUN_HEAD, at: W("s8", 2), until: W("s8", 5), off: [0, -120], accent: PURPLE }],
    highlights: ["CUNHADO", "CARA"],
    captions: [{ text: "E o cunhado? Ainda tá procurando onde enfiar a cara.", from: voLocal("s8"), to: end(7) }],
    audioCues: [narration("s8", "ready"), sfx("whoosh", 0, 0.22), sfx("boing", W("s8", 2) + 2, 0.24), sfx("sadtrombone", W("s8", 3) + 4, 0.3), sfx("thud", W("s8", 7) + 8, 0.3)],
  },
  // ------------------------------------------------------------------ s9 · CTA
  {
    id: "scene-09-final",
    startFrame: sc(8).from,
    durationInFrames: sc(8).durationInFrames,
    voKey: "s9",
    narration: "Gostou? Conhece algum Marcos? Manda esse vídeo pra ele!",
    camera: { projection: "perspective", movement: "dolly-out", keys: [key(0, P.cunhado), key(10, P.plazaTight, "out"), key(W("s9", 4), P.plazaTight), key(W("s9", 8) + 24, P.final, "inOut"), key(end(8), P.final)] },
    objects: [...SYSTEM(), CUNHADO, DOC],
    animations: [
      ...whip(0),
      lerp("marcos.dance", W("s9", 1), W("s9", 1) + 6, 1, 0, "inOut"),
      lerp("marcos.wave", W("s9", 1) + 4, W("s9", 1) + 12, 0, 1, "out"),
      spring("share", W("s9", 4), W("s9", 4) + 24, 0, 1, 8),
      lerp("share", end(8) - 58, end(8) - 50, 1, 0, "in"),
      lerp("marcos.wave", W("s9", 8) + 10, W("s9", 8) + 18, 1, 0, "inOut"),
      lerp("marcos.dance", W("s9", 8) + 10, W("s9", 8) + 18, 0, 1, "out"),
      lerp("plazaCoins", end(8) - 60, end(8) - 40, 1, 0, "in"),
      spring("endcard", end(8) - 52, end(8) - 22, 0, 1, 10),
    ],
    badges: [
      { text: "GOSTOU?", variant: "warning", icon: "?", appearAt: W("s9", 0), disappearAt: W("s9", 1) },
      { text: "MANDA PRO SEU AMIGO MARCOS", variant: "positive", appearAt: W("s9", 4), disappearAt: end(8) - 54 },
    ],
    labels: [{ text: "MARCOS", point: MARCOS_HEAD, at: W("s9", 1) + 4, until: W("s9", 4), off: [0, -120], accent: GOLD }],
    highlights: ["GOSTOU", "MARCOS", "MANDA", "VÍDEO"],
    captions: [{ text: "Gostou? Conhece algum Marcos? Manda esse vídeo pra ele!", from: voLocal("s9"), to: end(8) - 52 }],
    audioCues: [narration("s9", "ready"), sfx("whoosh-big", 0, 0.22), sfx("badge", W("s9", 0), 0.22), sfx("pop", W("s9", 2), 0.2), sfx("pop", W("s9", 4), 0.24), sfx("ding", W("s9", 4) + 4, 0.22), sfx("final", end(8) - 52, 0.3)],
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
