import { evaluateTrack, orbit, type EaseName, type TrackAnimation, type Vec3 } from "../utils/animation";
import { HAND_REACH, POCKET_WORK } from "../layout";
import { DURATION, FPS, HEIGHT, SCENE_FRAMES, voLocal, WIDTH, wordLocal, type VoKey } from "../utils/timing";

// Roteiro v2 (só informativo) — aprovado pelo usuário em 31/10/2026 ("pode criar já").
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
};

const sc = (i: number) => SCENE_FRAMES[i];
const end = (i: number) => SCENE_FRAMES[i].durationInFrames;
const W = wordLocal;
const key = (at: number, pose: { position: Vec3; target: Vec3 }, easing?: EaseName): CameraKey => ({ at, ...pose, easing });
const narration = (k: VoKey, status: AudioCue["status"]): AudioCue => ({ kind: "narration", src: `audio/vo/${k}.wav`, at: voLocal(k), volume: 1, status });
const sfx = (name: string, at: number, volume: number): AudioCue => ({ kind: "sfx", src: `audio/sfx/${name}.wav`, at, volume, status: "ready" });

/** Atalhos de dados: objeto visível com estado, objeto oculto e trilhas. */
const o = (id: string, type: string, start?: string, stateEnd?: string): SceneObject =>
  start ? { id, type, visible: true, state: { start, end: stateEnd ?? start } } : { id, type, visible: true };
const lerp = (target: string, startFrame: number, endFrame: number, from: number | undefined, to: number, easing: EaseName = "inOut", unit: TrackAnimation["unit"] = "0-1"): TrackAnimation =>
  ({ type: "interpolate", target, startFrame, endFrame, from, to, easing, unit });
const spring = (target: string, startFrame: number, endFrame: number, from: number | undefined, to: number, damping = 10, unit: TrackAnimation["unit"] = "0-1"): TrackAnimation =>
  ({ type: "spring", target, startFrame, endFrame, from, to, damping, unit });
/** Zoom "soco" rápido na palavra-chave. */
const punch = (at: number, amt = 1): TrackAnimation[] => [lerp("cam.punch", at, at + 4, 0, amt, "out"), lerp("cam.punch", at + 4, at + 16, amt, 0, "inOut")];
/** Transição em "chicote" (desfoque + rastros) enquanto a câmera troca de pose. */
const whip = (at: number): TrackAnimation[] => [lerp("whip", at, at + 3, 0, 1, "out"), lerp("whip", at + 3, at + 10, 1, 0, "in")];
const flash = (at: number, amt = 1): TrackAnimation[] => [lerp("flash", at, at + 2, 0, amt, "out"), lerp("flash", at + 2, at + 10, amt, 0, "in")];

const G = "#4be37f";
const R = "#ff5d5d";
const Y = "#ffd43b";
const GOLD = "#ffc531";

/** Sistema persistente (presente em todas as cenas). */
const SYSTEM = (piggy: string): SceneObject[] => [
  o("island", "diorama-ilha-flutuante"),
  o("warehouse", "deposito-empresa"),
  o("inss", "predio-inss"),
  o("piggy", "cofrinho-janela-de-corte", piggy),
  o("salaryPipe", "cano-salario-prata+valvula", "aberto"),
  o("coins", "moedas-instanciadas"),
];
const GOLDPIPE = o("accidentPipe", "cano-dourado+valvula", "aberto");

// Poses compartilhadas: orbit(alvo, distância, azimute°, elevação°).
const P = {
  far: orbit([0, 1.4, -1.0], 46, 30, 32),
  hook: orbit([0.35, 1.7, 2.2], 19, 16, 16),
  hookPunch: orbit([0.25, 1.75, 2.2], 15.5, 10, 14),
  hookUp: orbit([0.5, 2.3, 1.2], 22, 10, 22),
  work: orbit([-2.45, 1.35, -1.85], 9.5, 22, 10),
  workClose: orbit([-2.5, 1.5, -1.8], 6.5, 14, 8),
  ladder: orbit([-2.9, 1.6, -2.1], 10, 32, 12),
  ladderFall: orbit([-2.65, 0.9, -1.6], 8.5, 38, 8),
  ladderLow: orbit([-2.35, 0.7, -1.35], 6.5, 30, 6),
  bench: orbit([-0.6, 1.2, 2.6], 9, -8, 12),
  benchClose: orbit([-0.55, 1.3, 2.7], 7, 6, 10),
  walk: orbit([-1.8, 1.2, 0.4], 12, 24, 14),
  hand: orbit([HAND_REACH[0] + 0.02, HAND_REACH[1] - 0.02, HAND_REACH[2] + 0.1], 1.1, 18, 34),
  handWide: orbit([HAND_REACH[0] + 0.05, 1.1, HAND_REACH[2] + 0.05], 2.6, 22, 18),
  pocket: orbit([POCKET_WORK[0], POCKET_WORK[1] + 0.08, POCKET_WORK[2]], 2.6, 18, 6),
  face: orbit([-2.55, 1.75, -1.8], 7.8, 18, 6),
  goldPipe: orbit([1.4, 2.4, -0.8], 24, -15, 24),
  inssClose: orbit([2.6, 2.3, -3.2], 11, -12, 10),
  piggy: orbit([1.55, 1.45, 2.2], 14, 25, 14),
  piggyR: orbit([1.55, 1.45, 2.2], 14, 5, 14),
  stampWork: orbit([-2.55, 1.9, -1.5], 6.5, 10, 8),
  coin: orbit([1.3, 3.3, 2.0], 11.5, 12, 8),
  timeline: orbit([-1.2, 0.5, 3.6], 13, -62, 30),
  sideWide: orbit([4.0, 0.9, 1.2], 18, -30, 20),
  road: orbit([4.1, 0.6, 1.4], 7, -30, 12),
  house: orbit([4.3, 0.6, -0.5], 6.2, 35, 14),
  field: orbit([3.4, 0.4, 3.6], 6.5, -20, 18),
  gate: orbit([3.0, 0.9, -2.3], 14, 40, 18),
  gateR: orbit([3.2, 0.9, -2.3], 13.5, 30, 16),
  gateClose: orbit([3.3, 0.9, -2.3], 10.5, 28, 12),
  gateCloser: orbit([3.4, 0.9, -2.3], 8.5, 24, 10),
  final: orbit([0, 1.4, -1.2], 46, 40, 30),
  finalClose: orbit([POCKET_WORK[0] - 0.1, POCKET_WORK[1] + 0.12, POCKET_WORK[2]], 3.0, 20, 6),
};

export const scenes: ScenePlan[] = [
  // ------------------------------------------------------------------ s1 · gancho
  {
    id: "scene-01-gancho",
    startFrame: sc(0).from,
    durationInFrames: sc(0).durationInFrames,
    voKey: "s1",
    narration: "Você sabia que dá pra trabalhar e ainda receber um dinheiro do INSS todo mês?",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.far), key(22, P.hook, "out"), key(W("s1", 12) - 4, P.hookPunch, "soft"), key(end(0), P.hookUp, "soft")] },
    objects: [...SYSTEM("cheio"), GOLDPIPE, o("marcos", "personagem-low-poly", "carregando caixa"), o("calendar", "calendario-3d")],
    animations: [
      lerp("marcos.spot", 0, 1, 0, 0),
      lerp("marcos.carry", 0, 1, 1, 1),
      lerp("marcos.hop", 0, 1, 1, 1),
      lerp("coins.salary.flow", 0, 1, 1, 1),
      lerp("coins.accident.flow", 0, 1, 1, 1),
      lerp("pipeAccident.grow", 0, 1, 1, 1),
      lerp("piggy.level", 0, 1, 0.6, 0.6),
      lerp("coinRain", 0, 12, 0, 1, "out"),
      lerp("coinRain", end(0) - 14, end(0) - 2, 1, 0, "in"),
      spring("inss.glow", W("s1", 12), W("s1", 12) + 24, 0, 1, 8),
      ...punch(W("s1", 12)),
      spring("calendar.pop", W("s1", 13) - 10, W("s1", 13) + 14, 0, 1, 9),
      lerp("calendar.flip", W("s1", 13), end(0) - 2, 0, 1, "linear"),
      lerp("rewind", end(0) - 10, end(0), 0, 1, "in"),
    ],
    badges: [
      { text: "VOCÊ SABIA?", variant: "warning", icon: "?", appearAt: W("s1", 0), disappearAt: W("s1", 12) - 2 },
      { text: "DINHEIRO DO INSS", variant: "info", appearAt: W("s1", 12), disappearAt: end(0) },
    ],
    bigWords: [{ text: "TODO MÊS!", at: W("s1", 13), until: end(0), color: GOLD, size: 140 }],
    highlights: ["TRABALHAR", "DINHEIRO", "INSS", "MÊS"],
    captions: [{ text: "Você sabia que dá pra trabalhar e ainda receber um dinheiro do INSS todo mês?", from: voLocal("s1"), to: end(0) }],
    audioCues: [
      narration("s1", "ready"),
      sfx("whoosh-big", 0, 0.3),
      sfx("coin", 8, 0.22),
      sfx("coin", 34, 0.18),
      sfx("badge", W("s1", 0), 0.24),
      sfx("pop", W("s1", 12), 0.3),
      sfx("ding", W("s1", 13), 0.24),
      sfx("rewind", end(0) - 10, 0.28),
    ],
  },
  // ------------------------------------------------------------------ s2 · o Marcos
  {
    id: "scene-02-marcos",
    startFrame: sc(1).from,
    durationInFrames: sc(1).durationInFrames,
    voKey: "s2",
    narration: "Esse é o Marcos: trabalhador de carteira assinada, tudo certinho.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.hookUp), key(12, P.work, "out"), key(W("s2", 8) - 4, P.work), key(end(1), P.workClose, "soft")] },
    objects: [...SYSTEM("baixo"), GOLDPIPE, o("marcos", "personagem-low-poly", "acenando"), o("workBooklet", "carteira-de-trabalho-3d"), o("calendar", "calendario-3d")],
    animations: [
      lerp("rewind", 0, 10, 1, 0, "out"),
      ...whip(0),
      lerp("pipeAccident.grow", 0, 10, 1, 0, "in"),
      lerp("coins.accident.flow", 0, 6, 1, 0, "linear"),
      lerp("piggy.level", 0, 10, 0.6, 0.3, "linear"),
      lerp("marcos.spot", 0, 10, 0, 1, "linear"),
      lerp("marcos.carry", 0, 6, 1, 0, "in"),
      lerp("marcos.hop", 0, 6, 1, 0, "in"),
      lerp("calendar.pop", 0, 8, 1, 0, "in"),
      lerp("marcos.wave", W("s2", 3), W("s2", 3) + 10, 0, 1, "out"),
      lerp("marcos.wave", W("s2", 6), W("s2", 6) + 10, 1, 0, "inOut"),
      lerp("label.marcos", W("s2", 3), W("s2", 3) + 12, 0, 1, "out"),
      lerp("label.marcos", W("s2", 6) - 6, W("s2", 6) + 4, 1, 0, "in"),
      spring("workBooklet.pop", W("s2", 6), W("s2", 6) + 30, 0, 1, 9),
      lerp("workBooklet.pop", W("s2", 8) + 6, W("s2", 8) + 18, 1, 0, "in"),
      lerp("marcos.thumb", W("s2", 8), W("s2", 8) + 10, 0, 1, "out"),
      ...punch(W("s2", 8), 0.8),
    ],
    badges: [{ text: "CARTEIRA ASSINADA", variant: "info", appearAt: W("s2", 6), disappearAt: end(1) }],
    bigWords: [{ text: "TUDO CERTINHO!", at: W("s2", 8), until: end(1), color: G, size: 104 }],
    highlights: ["MARCOS", "CARTEIRA", "ASSINADA", "CERTINHO"],
    captions: [{ text: "Esse é o Marcos: trabalhador de carteira assinada, tudo certinho.", from: voLocal("s2"), to: end(1) }],
    audioCues: [
      narration("s2", "ready"),
      sfx("whoosh", 0, 0.26),
      sfx("pop", W("s2", 3), 0.22),
      sfx("pop", W("s2", 6), 0.24),
      sfx("badge", W("s2", 6), 0.22),
      sfx("ding", W("s2", 8), 0.22),
    ],
  },
  // ------------------------------------------------------------------ s3 · a queda
  {
    id: "scene-03-queda",
    startFrame: sc(2).from,
    durationInFrames: sc(2).durationInFrames,
    voKey: "s3",
    narration: "Até que, num dia de trabalho, a escada escorregou… e ele caiu.",
    camera: { projection: "perspective", movement: "vertical", keys: [key(0, P.workClose), key(10, P.ladder, "out"), key(W("s3", 8), P.ladder), key(W("s3", 11) - 6, P.ladderFall, "soft"), key(end(2), P.ladderLow, "out")] },
    objects: [...SYSTEM("baixo"), o("marcos", "personagem-low-poly", "subindo a escada", "caído, tonto")],
    animations: [
      ...whip(0),
      lerp("marcos.thumb", 0, 8, 1, 0, "in"),
      lerp("marcos.climb", 6, 40, 0, 1.2, "inOut", "u3d"),
      lerp("ladder.wobble", W("s3", 7), W("s3", 8), 0, 1, "linear"),
      lerp("ladder.wobble", W("s3", 8), W("s3", 8) + 6, 1, 0, "out"),
      lerp("ladder.slide", W("s3", 8), W("s3", 8) + 16, 0, 1, "in"),
      lerp("speed", W("s3", 8) + 6, W("s3", 8) + 14, 0, 1, "out"),
      lerp("marcos.fall", W("s3", 8) + 10, W("s3", 11) + 2, 0, 1, "in"),
      lerp("speed", W("s3", 11), W("s3", 11) + 8, 1, 0, "in"),
      ...flash(W("s3", 11) + 2),
      lerp("camera.shake", W("s3", 11) + 2, W("s3", 11) + 6, 0, 1, "out"),
      lerp("camera.shake", W("s3", 11) + 6, W("s3", 11) + 16, 1, 0, "in"),
      lerp("dizzy.stars", W("s3", 11) + 4, W("s3", 11) + 16, 0, 1, "out"),
    ],
    badges: [{ text: "ACIDENTE DE TRABALHO", variant: "negative", appearAt: W("s3", 8), disappearAt: end(2) }],
    bigWords: [{ text: "TOMBO!", at: W("s3", 11) + 2, until: end(2), color: R, size: 180, tilt: -8 }],
    highlights: ["ESCADA", "ESCORREGOU", "CAIU"],
    captions: [{ text: "Até que, num dia de trabalho, a escada escorregou… e ele caiu.", from: voLocal("s3"), to: end(2) }],
    audioCues: [
      narration("s3", "ready"),
      sfx("whoosh", 0, 0.24),
      sfx("boing", W("s3", 7) + 4, 0.26),
      sfx("badge", W("s3", 8), 0.22),
      sfx("whoosh-big", W("s3", 8) + 8, 0.28),
      sfx("thud", W("s3", 11) + 2, 0.4),
      sfx("crack", W("s3", 11) + 3, 0.24),
    ],
  },
  // ------------------------------------------------------------------ s4 · mão quebrada e afastamento
  {
    id: "scene-04-mao-quebrada",
    startFrame: sc(3).from,
    durationInFrames: sc(3).durationInFrames,
    voKey: "s4",
    narration: "Resultado: mão quebrada, gesso e meses afastado.",
    camera: { projection: "perspective", movement: "tracking", keys: [key(0, P.ladderLow), key(W("s4", 3) - 6, P.ladderLow), key(W("s4", 3) + 4, P.bench, "out"), key(end(3), P.benchClose, "soft")] },
    objects: [...SYSTEM("baixo"), o("marcos", "personagem-low-poly", "caído", "sentado de gesso"), o("bench", "banquinho"), o("cast", "gesso+tipoia"), o("calendar", "calendario-3d")],
    animations: [
      spring("xray", W("s4", 0) + 4, W("s4", 0) + 30, 0, 1, 10),
      lerp("xray.crack", W("s4", 2), W("s4", 2) + 6, 0, 1, "out"),
      lerp("xray", W("s4", 3) - 8, W("s4", 3), 1, 0, "in"),
      ...whip(W("s4", 3) - 6),
      lerp("dizzy.stars", W("s4", 3) - 6, W("s4", 3), 1, 0, "in"),
      lerp("marcos.recover", W("s4", 3) - 6, W("s4", 3) + 6, 0, 1, "inOut"),
      lerp("marcos.spot", W("s4", 3) - 6, W("s4", 3) + 6, 1, 0, "inOut"),
      lerp("marcos.sit", W("s4", 3) + 4, W("s4", 3) + 12, 0, 1, "out"),
      spring("cast.on", W("s4", 3), W("s4", 3) + 22, 0, 1, 9),
      lerp("calendar.flip", 0, 1, 1, 0),
      spring("calendar.pop", W("s4", 5) - 6, W("s4", 5) + 16, 0, 1, 9),
      lerp("calendar.flip", W("s4", 5), end(3), 0, 1, "linear"),
      ...punch(W("s4", 1), 0.6),
    ],
    badges: [
      { text: "MÃO QUEBRADA", variant: "negative", appearAt: W("s4", 1), disappearAt: W("s4", 5) - 2 },
      { text: "MESES AFASTADO", variant: "warning", appearAt: W("s4", 5), disappearAt: end(3) },
    ],
    highlights: ["MÃO", "QUEBRADA", "GESSO", "AFASTADO"],
    captions: [{ text: "Resultado: mão quebrada, gesso e meses afastado.", from: voLocal("s4"), to: end(3) }],
    audioCues: [
      narration("s4", "ready"),
      sfx("whoosh-soft", W("s4", 0) + 4, 0.26),
      sfx("crack", W("s4", 2), 0.3),
      sfx("badge", W("s4", 1), 0.22),
      sfx("whoosh", W("s4", 3) - 6, 0.24),
      sfx("pop", W("s4", 3), 0.24),
      sfx("tick", W("s4", 5) + 4, 0.22),
      sfx("tick", W("s4", 5) + 14, 0.22),
      sfx("tick", W("s4", 5) + 24, 0.22),
    ],
  },
  // ------------------------------------------------------------------ s5 · volta ao trabalho com sequela
  {
    id: "scene-05-sequela",
    startFrame: sc(4).from,
    durationInFrames: sc(4).durationInFrames,
    voKey: "s5",
    narration: "Ele se recuperou e voltou a trabalhar. Só que a mão nunca mais foi a mesma: dois dedos não dobram direito.",
    camera: {
      projection: "perspective",
      movement: "tracking",
      keys: [key(0, P.benchClose), key(28, P.bench), key(40, P.walk, "soft"), key(68, P.work, "soft"), key(80, P.handWide, "soft"), key(96, P.hand, "soft"), key(150, P.hand), key(end(4), P.handWide, "soft")],
    },
    objects: [...SYSTEM("baixo"), o("marcos", "personagem-low-poly", "sentado", "mão com 2 dedos rígidos"), o("bench", "banquinho"), o("calendar", "calendario-3d"), o("box", "caixote+caixa-com-alca")],
    animations: [
      lerp("calendar.pop", 0, 10, 1, 0, "in"),
      lerp("ladder.slide", 0, 10, 1, 0, "inOut"),
      lerp("cast.shatter", W("s5", 2), W("s5", 2) + 22, 0, 1, "out"),
      lerp("cast.on", W("s5", 2), W("s5", 2) + 2, 1, 0, "linear"),
      ...flash(W("s5", 2), 0.5),
      lerp("marcos.sit", W("s5", 2) + 8, W("s5", 2) + 18, 1, 0, "out"),
      lerp("marcos.spot", 34, 68, 0, 1, "inOut"),
      lerp("marcos.hop", 34, 36, 0, 1, "out"),
      lerp("marcos.hop", 64, 68, 1, 0, "in"),
      lerp("marcos.reach", 70, 86, 0, 1, "inOut"),
      lerp("hand.close", 96, W("s5", 16), 0, 1, "inOut"),
      lerp("fingers.stiff", 0, 1, 1, 1, "linear"),
      lerp("stiff.glow", W("s5", 16), W("s5", 16) + 10, 0, 1, "out"),
      ...punch(W("s5", 16)),
      lerp("vignette.red", W("s5", 16) - 4, W("s5", 16) + 14, 0, 0.55, "inOut"),
      lerp("box.grip", W("s5", 18), W("s5", 18) + 8, 0, 1, "inOut"),
      lerp("box.slip", W("s5", 19), W("s5", 19) + 16, 0, 1, "in"),
      spring("box.bounce", W("s5", 19) + 16, W("s5", 19) + 46, 0, 1, 7),
    ],
    badges: [
      { text: "DE VOLTA AO TRABALHO", variant: "positive", appearAt: W("s5", 4), disappearAt: W("s5", 7) },
      { text: "SEQUELA", variant: "negative", subtitle: "dois dedos não dobram direito", appearAt: W("s5", 16), disappearAt: end(4) },
    ],
    highlights: ["RECUPEROU", "VOLTOU", "MÃO", "DEDOS", "DOBRAM"],
    captions: [
      { text: "Ele se recuperou e voltou a trabalhar.", from: voLocal("s5"), to: W("s5", 7) },
      { text: "Só que a mão nunca mais foi a mesma: dois dedos não dobram direito.", from: W("s5", 7), to: end(4) },
    ],
    audioCues: [
      narration("s5", "ready"),
      sfx("crack", W("s5", 2), 0.3),
      sfx("badge", W("s5", 4), 0.22),
      sfx("whoosh", 68, 0.22),
      sfx("whoosh-soft", 80, 0.2),
      sfx("tick", W("s5", 16), 0.24),
      sfx("badge", W("s5", 16), 0.22),
      sfx("boing", W("s5", 19) + 16, 0.24),
    ],
  },
  // ------------------------------------------------------------------ s6 · revelação
  {
    id: "scene-06-auxilio-acidente",
    startFrame: sc(5).from,
    durationInFrames: sc(5).durationInFrames,
    voKey: "s6",
    narration: "É aí que entra o auxílio-acidente.",
    camera: { projection: "perspective", movement: "orbit", keys: [key(0, P.handWide), key(8, P.pocket, "out"), key(W("s6", 5) - 2, P.pocket), key(W("s6", 5) + 12, P.goldPipe, "out"), key(end(5), P.goldPipe)] },
    objects: [...SYSTEM("baixo"), o("accidentPipe", "cano-dourado+valvula", "inexistente", "aberto"), o("marcos", "personagem-low-poly"), o("box", "caixote+caixa-com-alca", "caída"), o("lia", "mascote-mini-advogada-low-poly", "no bolso", "fora do bolso")],
    animations: [
      ...whip(0),
      lerp("marcos.reach", 0, 10, 1, 0, "inOut"),
      spring("lia.pop", 8, 36, 0, 1, 9),
      lerp("lia.point", 22, 34, 0, 1, "out"),
      ...flash(W("s6", 5)),
      ...whip(W("s6", 5) + 1),
      lerp("speed", W("s6", 5), W("s6", 5) + 4, 0, 1, "out"),
      lerp("speed", W("s6", 5) + 18, W("s6", 5) + 28, 1, 0, "in"),
      lerp("vignette.red", W("s6", 5), W("s6", 5) + 10, 0.55, 0, "out"),
      lerp("pipeAccident.grow", W("s6", 5) + 2, W("s6", 5) + 26, 0, 1, "out"),
      lerp("pipeAccident.glow", W("s6", 5) + 2, W("s6", 5) + 14, 0, 1, "out"),
      lerp("coins.accident.flow", W("s6", 5) + 20, W("s6", 5) + 30, 0, 1, "linear"),
    ],
    badges: [],
    bigWords: [{ text: "AUXÍLIO-ACIDENTE", at: W("s6", 5), until: end(5), color: GOLD, size: 84, y: 640, tilt: -3 }],
    highlights: ["AUXÍLIO-ACIDENTE"],
    captions: [{ text: "É aí que entra o auxílio-acidente.", from: voLocal("s6"), to: end(5) }],
    audioCues: [narration("s6", "ready"), sfx("pop", 10, 0.24), sfx("shimmer", W("s6", 5), 0.3), sfx("whoosh-big", W("s6", 5), 0.24), sfx("glow", W("s6", 5) + 4, 0.22)],
  },
  // ------------------------------------------------------------------ s7 · o que é
  {
    id: "scene-07-o-que-e",
    startFrame: sc(6).from,
    durationInFrames: sc(6).durationInFrames,
    voKey: "s7",
    narration: "Ele é uma indenização paga pelo INSS a quem ficou com uma sequela permanente que diminui a capacidade de trabalho. Quem confirma isso é a perícia médica do INSS.",
    camera: {
      projection: "perspective",
      movement: "orbit",
      keys: [key(0, P.goldPipe), key(30, P.piggy, "soft"), key(W("s7", 6) - 6, P.inssClose, "soft"), key(W("s7", 7) - 2, P.inssClose), key(W("s7", 7) + 8, P.face, "out"), key(W("s7", 20) - 6, P.face), key(W("s7", 20) + 6, P.stampWork, "out"), key(end(6), P.stampWork)],
    },
    objects: [...SYSTEM("subindo"), GOLDPIPE, o("marcos", "personagem-low-poly"), o("lia", "mascote-mini-advogada-low-poly", "fora do bolso", "no bolso"), o("capacityGauge", "medidor-3d-capacidade (esquemático, sem números)"), o("pericia", "documento+carimbo-da-pericia")],
    animations: [
      lerp("lia.pop", 0, 10, 1, 0, "in"),
      lerp("lia.point", 0, 10, 1, 0, "in"),
      lerp("pipeAccident.glow", 30, 60, 1, 0.4, "inOut"),
      lerp("piggy.level", 0, W("s7", 7), 0.3, 0.5, "linear"),
      spring("inss.glow", W("s7", 6), W("s7", 6) + 20, 0.5, 1, 7),
      ...punch(W("s7", 6)),
      ...whip(W("s7", 7) - 2),
      lerp("stiff.glow", 0, 1, 1, 1),
      spring("capacity.pop", W("s7", 12), W("s7", 12) + 22, 0, 1, 9),
      lerp("vignette.red", W("s7", 12), W("s7", 12) + 14, 0, 0.35, "inOut"),
      lerp("capacity.level", W("s7", 15), W("s7", 15) + 26, 1, 0.55, "out"),
      ...punch(W("s7", 15), 0.6),
      lerp("capacity.pop", W("s7", 20) - 8, W("s7", 20), 1, 0, "in"),
      lerp("vignette.red", W("s7", 20) - 8, W("s7", 20), 0.35, 0, "in"),
      ...whip(W("s7", 20) - 6),
      lerp("pericia.drop", W("s7", 20) + 6, W("s7", 25), 0, 1, "in"),
      lerp("pericia.mark", W("s7", 25), W("s7", 25) + 2, 0, 1, "linear"),
      ...flash(W("s7", 25), 0.5),
      ...punch(W("s7", 25)),
      lerp("camera.shake", W("s7", 25), W("s7", 25) + 4, 0, 0.6, "out"),
      lerp("camera.shake", W("s7", 25) + 4, W("s7", 25) + 12, 0.6, 0, "in"),
      lerp("pericia.drop", W("s7", 25) + 14, W("s7", 25) + 30, 1, 0, "inOut"),
    ],
    badges: [
      { text: "INDENIZAÇÃO", variant: "info", subtitle: "paga pelo INSS", appearAt: W("s7", 3), disappearAt: W("s7", 7) },
      { text: "SEQUELA PERMANENTE", variant: "negative", appearAt: W("s7", 12), disappearAt: W("s7", 20) - 4 },
      { text: "MENOS CAPACIDADE DE TRABALHO", variant: "negative", appearAt: W("s7", 15), disappearAt: W("s7", 20) - 4 },
      { text: "PERÍCIA MÉDICA DO INSS", variant: "info", subtitle: "confirma a sequela", appearAt: W("s7", 25), disappearAt: end(6) },
    ],
    highlights: ["INDENIZAÇÃO", "INSS", "SEQUELA", "PERMANENTE", "CAPACIDADE", "PERÍCIA", "MÉDICA"],
    captions: [
      { text: "Ele é uma indenização paga pelo INSS", from: voLocal("s7"), to: W("s7", 7) },
      { text: "a quem ficou com uma sequela permanente que diminui a capacidade de trabalho.", from: W("s7", 7), to: W("s7", 20) },
      { text: "Quem confirma isso é a perícia médica do INSS.", from: W("s7", 20), to: end(6) },
    ],
    audioCues: [
      narration("s7", "ready"),
      sfx("badge", W("s7", 3), 0.22),
      sfx("coin", 30, 0.2),
      sfx("pop", W("s7", 6), 0.26),
      sfx("whoosh", W("s7", 7) - 2, 0.22),
      sfx("badge", W("s7", 12), 0.22),
      sfx("tick", W("s7", 15), 0.22),
      sfx("whoosh", W("s7", 20) - 6, 0.22),
      sfx("stamp", W("s7", 25), 0.4),
      sfx("badge", W("s7", 25) + 2, 0.22),
    ],
  },
  // ------------------------------------------------------------------ s8 · junto com o salário, até a aposentadoria
  {
    id: "scene-08-junto-ate-aposentadoria",
    startFrame: sc(7).from,
    durationInFrames: sc(7).durationInFrames,
    voKey: "s8",
    narration: "E o melhor: dá pra receber junto com o salário, todo mês, até a aposentadoria.",
    camera: { projection: "perspective", movement: "orbit", keys: [key(0, P.stampWork), key(10, P.piggy, "out"), key(W("s8", 10), P.piggyR, "linear"), key(W("s8", 12) + 6, P.timeline, "out"), key(end(7), P.timeline)] },
    objects: [...SYSTEM("duas colunas subindo"), GOLDPIPE, o("marcos", "personagem-low-poly", "trabalhando"), o("calendar", "calendario-3d"), o("timeline", "linha-do-tempo-no-chao", "inexistente", "até a cadeira")],
    animations: [
      ...whip(0),
      lerp("coinRain", W("s8", 2), W("s8", 2) + 6, 0, 1, "out"),
      lerp("coinRain", W("s8", 7), W("s8", 7) + 12, 1, 0, "in"),
      ...punch(W("s8", 2)),
      lerp("marcos.work", 0, 10, 0, 1, "inOut"),
      lerp("piggy.split", W("s8", 6), W("s8", 6) + 16, 0, 1, "out"),
      lerp("piggy.level", W("s8", 6), end(7), 0.5, 0.82, "linear"),
      lerp("calendar.flip", W("s8", 7), W("s8", 7) + 1, 1, 0),
      spring("calendar.pop", W("s8", 10) - 8, W("s8", 10) + 14, 0, 1, 9),
      lerp("calendar.flip", W("s8", 10), W("s8", 12), 0, 1, "linear"),
      ...whip(W("s8", 12)),
      lerp("timeline.grow", W("s8", 12), W("s8", 12) + 20, 0, 1, "out"),
      lerp("timeline.coins", W("s8", 12), end(7), 0, 1, "linear"),
      spring("chair.pop", W("s8", 14), W("s8", 14) + 20, 0, 1, 9),
      spring("timeline.stop", W("s8", 14) + 10, end(7), 0, 1, 9),
    ],
    badges: [
      { text: "JUNTO COM O SALÁRIO", variant: "positive", appearAt: W("s8", 6), disappearAt: W("s8", 12) },
      { text: "ATÉ A APOSENTADORIA", variant: "info", appearAt: W("s8", 14), disappearAt: end(7) },
    ],
    bigWords: [{ text: "E O MELHOR!", at: W("s8", 2), until: W("s8", 5), color: Y, size: 120 }],
    highlights: ["MELHOR", "JUNTO", "SALÁRIO", "MÊS", "APOSENTADORIA"],
    captions: [{ text: "E o melhor: dá pra receber junto com o salário, todo mês, até a aposentadoria.", from: voLocal("s8"), to: end(7) }],
    audioCues: [
      narration("s8", "ready"),
      sfx("whoosh", 0, 0.22),
      sfx("ding", W("s8", 2), 0.24),
      sfx("coin", W("s8", 2) + 4, 0.22),
      sfx("badge", W("s8", 6), 0.22),
      sfx("coin", W("s8", 9), 0.2),
      sfx("tick", W("s8", 10) + 2, 0.2),
      sfx("tick", W("s8", 10) + 10, 0.2),
      sfx("whoosh", W("s8", 12), 0.22),
      sfx("badge", W("s8", 14), 0.22),
    ],
  },
  // ------------------------------------------------------------------ s9 · valor
  {
    id: "scene-09-valor",
    startFrame: sc(8).from,
    durationInFrames: sc(8).durationInFrames,
    voKey: "s9",
    narration: "O valor, em regra, é metade do salário de benefício.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.timeline), key(10, P.coin, "out"), key(end(8), P.coin)] },
    objects: [...SYSTEM("cheio"), GOLDPIPE, o("marcos", "personagem-low-poly", "trabalhando"), o("bigCoin", "moeda-gigante-2-metades"), o("timeline", "linha-do-tempo-no-chao")],
    animations: [
      ...whip(0),
      spring("bigCoin.pop", 6, 30, 0, 1, 9),
      lerp("bigCoin.spin", 6, W("s9", 5), 0, 720, "linear", "deg"),
      lerp("bigCoin.split", W("s9", 5), W("s9", 5) + 14, 0, 1, "out"),
      ...punch(W("s9", 5)),
      lerp("halfCoin.drop", W("s9", 5) + 20, W("s9", 5) + 44, 0, 1, "in"),
      lerp("bigCoin.pop", end(8) - 12, end(8) - 2, 1, 0, "in"),
    ],
    badges: [{ text: "EM REGRA", variant: "info", subtitle: "metade do salário de benefício", appearAt: W("s9", 2), disappearAt: end(8) }],
    bigWords: [{ text: "50%", at: W("s9", 5), until: end(8) - 4, color: GOLD, size: 230, y: 560 }],
    highlights: ["VALOR", "METADE", "SALÁRIO", "BENEFÍCIO"],
    captions: [{ text: "O valor, em regra, é metade do salário de benefício.", from: voLocal("s9"), to: end(8) }],
    audioCues: [narration("s9", "ready"), sfx("whoosh", 0, 0.22), sfx("pop", 8, 0.22), sfx("badge", W("s9", 2), 0.22), sfx("crack", W("s9", 5), 0.24), sfx("ding", W("s9", 5) + 2, 0.24), sfx("coin", W("s9", 5) + 40, 0.22)],
  },
  // ------------------------------------------------------------------ s10 · qualquer acidente
  {
    id: "scene-10-qualquer-acidente",
    startFrame: sc(9).from,
    durationInFrames: sc(9).durationInFrames,
    voKey: "s10",
    narration: "E não precisa ter sido no trabalho: acidente de moto, queda em casa ou no futebol também contam.",
    camera: {
      projection: "perspective",
      movement: "tracking",
      keys: [
        key(0, P.coin),
        key(10, P.sideWide, "out"),
        key(W("s10", 7) - 4, P.sideWide),
        key(W("s10", 7) + 6, P.road, "out"),
        key(W("s10", 10) - 2, P.road),
        key(W("s10", 10) + 8, P.house, "out"),
        key(W("s10", 13) - 4, P.house),
        key(W("s10", 13) + 6, P.field, "out"),
        key(W("s10", 16) - 4, P.field),
        key(W("s10", 16) + 8, P.sideWide, "out"),
        key(end(9), P.sideWide),
      ],
    },
    objects: [
      ...SYSTEM("cheio"),
      GOLDPIPE,
      o("marcos", "personagem-low-poly", "trabalhando"),
      o("timeline", "linha-do-tempo-no-chao"),
      o("road", "trecho-de-estrada"),
      o("moto", "moto-low-poly", "em pé", "tombada"),
      o("house", "casinha-mini-cenario"),
      o("field", "campinho+bola"),
      o("checks", "check-3d-verde"),
    ],
    animations: [
      ...whip(0),
      spring("road.pop", 12, 40, 0, 1, 9),
      spring("house.pop", 16, 44, 0, 1, 9),
      spring("field.pop", 20, 48, 0, 1, 9),
      ...whip(W("s10", 7) - 4),
      lerp("moto.tip", W("s10", 9), W("s10", 9) + 18, 0, 80, "in", "deg"),
      lerp("rider.sit", W("s10", 9) + 18, W("s10", 9) + 30, 0, 1, "out"),
      ...whip(W("s10", 10) - 2),
      ...whip(W("s10", 13) - 4),
      ...whip(W("s10", 16) - 4),
      spring("checks.pop", W("s10", 16), W("s10", 16) + 30, 0, 1, 8),
    ],
    badges: [
      { text: "NÃO PRECISA SER NO TRABALHO", variant: "warning", appearAt: W("s10", 1), disappearAt: W("s10", 7) },
      { text: "QUALQUER ACIDENTE CONTA", variant: "positive", subtitle: "trânsito, casa, lazer ou trabalho", appearAt: W("s10", 16), disappearAt: end(9) },
    ],
    bigWords: [
      { text: "MOTO", at: W("s10", 9), until: W("s10", 10) - 2, color: Y, size: 150 },
      { text: "CASA", at: W("s10", 12), until: W("s10", 13) - 2, color: Y, size: 150 },
      { text: "FUTEBOL", at: W("s10", 15), until: W("s10", 16) - 2, color: Y, size: 140 },
    ],
    highlights: ["TRABALHO", "MOTO", "CASA", "FUTEBOL", "CONTAM"],
    captions: [{ text: "E não precisa ter sido no trabalho: acidente de moto, queda em casa ou no futebol também contam.", from: voLocal("s10"), to: end(9) }],
    audioCues: [
      narration("s10", "ready"),
      sfx("whoosh", 0, 0.22),
      sfx("pop", 14, 0.2),
      sfx("pop", 18, 0.2),
      sfx("pop", 22, 0.2),
      sfx("badge", W("s10", 1), 0.22),
      sfx("whoosh", W("s10", 7) - 4, 0.2),
      sfx("boing", W("s10", 9) + 14, 0.26),
      sfx("whoosh", W("s10", 10) - 2, 0.2),
      sfx("whoosh", W("s10", 13) - 4, 0.2),
      sfx("ding", W("s10", 16), 0.22),
      sfx("badge", W("s10", 16) + 2, 0.22),
    ],
  },
  // ------------------------------------------------------------------ s11 · quem pode receber
  {
    id: "scene-11-quem-pode",
    startFrame: sc(10).from,
    durationInFrames: sc(10).durationInFrames,
    voKey: "s11",
    narration: "Quem pode receber? Empregado de carteira assinada, empregado doméstico, trabalhador avulso e segurado especial, como o pequeno produtor rural.",
    camera: { projection: "perspective", movement: "tracking", keys: [key(0, P.sideWide), key(10, P.gate, "out"), key(W("s11", 10), P.gateR, "linear"), key(end(10), P.gateClose, "soft")] },
    objects: [
      ...SYSTEM("cheio"),
      GOLDPIPE,
      o("marcos", "personagem-low-poly", "trabalhando"),
      o("timeline", "linha-do-tempo-no-chao"),
      o("road", "trecho-de-estrada", "visível", "encolhido"),
      o("moto", "moto-low-poly", "tombada", "encolhida"),
      o("house", "casinha-mini-cenario", "visível", "encolhida"),
      o("field", "campinho+bola", "visível", "encolhido"),
      o("checks", "check-3d-verde", "visíveis", "encolhidos"),
      o("gate", "portao-catraca+luz"),
      o("pawns", "5-bonecos (carteira, doméstica, portuário, rural, autônomo)"),
    ],
    animations: [
      ...whip(0),
      lerp("side.shrink", 0, 12, 0, 1, "in"),
      spring("gate.pop", 4, 30, 0, 1, 9),
      lerp("queue.arrive", 10, 40, 0, 1, "inOut"),
      lerp("pawn1.pass", W("s11", 3), W("s11", 3) + 22, 0, 1, "inOut"),
      lerp("pawn2.pass", W("s11", 8) - 6, W("s11", 8) + 16, 0, 1, "inOut"),
      lerp("pawn3.pass", W("s11", 10) - 4, W("s11", 10) + 18, 0, 1, "inOut"),
      lerp("pawn4.pass", W("s11", 12) - 4, W("s11", 12) + 18, 0, 1, "inOut"),
      ...punch(W("s11", 3) + 10, 0.4),
      ...punch(W("s11", 8) + 4, 0.4),
      ...punch(W("s11", 10) + 6, 0.4),
      ...punch(W("s11", 12) + 6, 0.4),
    ],
    badges: [
      { text: "QUEM PODE RECEBER?", variant: "warning", icon: "?", appearAt: W("s11", 0), disappearAt: W("s11", 3) - 2 },
      { text: "EMPREGADO DE CARTEIRA", variant: "positive", appearAt: W("s11", 3), disappearAt: W("s11", 10) - 4 },
      { text: "EMPREGADO DOMÉSTICO", variant: "positive", appearAt: W("s11", 8) - 6, disappearAt: W("s11", 12) - 4 },
      { text: "TRABALHADOR AVULSO", variant: "positive", appearAt: W("s11", 10) - 4, disappearAt: end(10) },
      { text: "SEGURADO ESPECIAL", variant: "positive", subtitle: "ex.: pequeno produtor rural", appearAt: W("s11", 12) - 4, disappearAt: end(10) },
    ],
    highlights: ["RECEBER", "EMPREGADO", "CARTEIRA", "DOMÉSTICO", "AVULSO", "SEGURADO", "ESPECIAL", "RURAL"],
    captions: [{ text: "Quem pode receber? Empregado de carteira assinada, empregado doméstico, trabalhador avulso e segurado especial, como o pequeno produtor rural.", from: voLocal("s11"), to: end(10) }],
    audioCues: [
      narration("s11", "ready"),
      sfx("whoosh", 0, 0.22),
      sfx("pop", 6, 0.2),
      sfx("badge", W("s11", 0), 0.22),
      sfx("ding", W("s11", 3) + 11, 0.2),
      sfx("ding", W("s11", 8) + 5, 0.2),
      sfx("ding", W("s11", 10) + 7, 0.2),
      sfx("ding", W("s11", 12) + 7, 0.2),
    ],
  },
  // ------------------------------------------------------------------ s12 · quem fica de fora
  {
    id: "scene-12-de-fora",
    startFrame: sc(11).from,
    durationInFrames: sc(11).durationInFrames,
    voKey: "s12",
    narration: "Autônomos e microempreendedores individuais ficam de fora.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.gateClose), key(end(11), P.gateCloser, "soft")] },
    objects: [...SYSTEM("cheio"), GOLDPIPE, o("marcos", "personagem-low-poly", "trabalhando"), o("timeline", "linha-do-tempo-no-chao"), o("gate", "portao-catraca+luz", "verde", "vermelho"), o("pawns", "5-bonecos")],
    animations: [
      lerp("pawn5.try", 8, 34, 0, 1, "inOut"),
      spring("gate.block", W("s12", 4), W("s12", 4) + 30, 0, 1, 8),
      lerp("gate.red", W("s12", 4), W("s12", 4) + 5, 0, 1, "out"),
      lerp("pawn5.shrug", W("s12", 4) + 8, W("s12", 4) + 24, 0, 1, "inOut"),
      ...punch(W("s12", 4)),
    ],
    badges: [{ text: "AUTÔNOMO E MEI", variant: "negative", subtitle: "contribuinte individual não recebe", appearAt: W("s12", 0), disappearAt: end(11) }],
    bigWords: [{ text: "FORA!", at: W("s12", 6), until: end(11), color: R, size: 180, tilt: 6 }],
    highlights: ["AUTÔNOMOS", "MICROEMPREENDEDORES", "INDIVIDUAIS", "FORA"],
    captions: [{ text: "Autônomos e microempreendedores individuais ficam de fora.", from: voLocal("s12"), to: end(11) }],
    audioCues: [narration("s12", "ready"), sfx("badge", W("s12", 0), 0.22), sfx("buzz", W("s12", 4), 0.26), sfx("clunk", W("s12", 4) + 3, 0.26)],
  },
  // ------------------------------------------------------------------ s13 · final + compartilhar
  {
    id: "scene-13-final",
    startFrame: sc(12).from,
    durationInFrames: sc(12).durationInFrames,
    voKey: "s13",
    narration: "Gostou da informação? Manda esse vídeo pra um amigo que você acha que se encaixa nessa situação.",
    camera: { projection: "perspective", movement: "dolly-out", keys: [key(0, P.gateCloser), key(14, P.final, "out"), key(W("s13", 11), P.final), key(W("s13", 11) + 30, P.finalClose, "out"), key(end(12), P.finalClose)] },
    objects: [...SYSTEM("cheio"), GOLDPIPE, o("marcos", "personagem-low-poly", "trabalhando", "joinha"), o("timeline", "linha-do-tempo-no-chao"), o("gate", "portao-catraca+luz", "visível", "encolhido"), o("pawns", "5-bonecos", "visíveis", "encolhidos"), o("lia", "mascote-mini-advogada-low-poly", "no bolso", "acenando")],
    animations: [
      ...whip(0),
      lerp("pawns.shrink", 0, 10, 0, 1, "in"),
      lerp("gate.pop", 0, 10, 1, 0, "in"),
      lerp("final.labels", 14, 40, 0, 1, "out"),
      lerp("final.labels", W("s13", 3) - 4, W("s13", 3) + 4, 1, 0, "in"),
      lerp("coinRain", 10, 20, 0, 1, "out"),
      lerp("coinRain", W("s13", 3) + 10, W("s13", 3) + 22, 1, 0, "in"),
      spring("share", W("s13", 3), W("s13", 3) + 24, 0, 1, 8),
      lerp("share", W("s13", 11) - 6, W("s13", 11) + 2, 1, 0, "in"),
      lerp("marcos.work", W("s13", 11), W("s13", 11) + 10, 1, 0, "inOut"),
      spring("lia.pop", W("s13", 11), W("s13", 11) + 24, 0, 1, 9),
      lerp("lia.wave", W("s13", 11) + 14, end(12), 0, 1, "linear"),
      lerp("marcos.thumb", W("s13", 11) + 20, W("s13", 11) + 32, 0, 1, "out"),
      spring("endcard", end(12) - 52, end(12) - 22, 0, 1, 10),
    ],
    badges: [
      { text: "GOSTOU DA INFORMAÇÃO?", variant: "warning", icon: "?", appearAt: W("s13", 0), disappearAt: W("s13", 3) - 2 },
      { text: "MANDA PRA UM AMIGO", variant: "positive", subtitle: "que se encaixa nessa situação", appearAt: W("s13", 3), disappearAt: end(12) - 54 },
    ],
    highlights: ["GOSTOU", "INFORMAÇÃO", "MANDA", "AMIGO"],
    captions: [{ text: "Gostou da informação? Manda esse vídeo pra um amigo que você acha que se encaixa nessa situação.", from: voLocal("s13"), to: end(12) - 52 }],
    audioCues: [
      narration("s13", "ready"),
      sfx("whoosh-big", 0, 0.24),
      sfx("badge", W("s13", 0), 0.22),
      sfx("coin", 16, 0.2),
      sfx("pop", W("s13", 3), 0.24),
      sfx("ding", W("s13", 3) + 4, 0.22),
      sfx("pop", W("s13", 11) + 2, 0.22),
      sfx("final", end(12) - 52, 0.3),
    ],
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
