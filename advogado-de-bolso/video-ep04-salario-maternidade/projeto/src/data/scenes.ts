import { evaluateTrack, orbit, type EaseName, type TrackAnimation, type Vec3 } from "../utils/animation";
import { EP4, L } from "../layout";
import { DURATION, FPS, HEIGHT, SCENE_FRAMES, voLocal, WIDTH, wordLocal, type VoKey } from "../utils/timing";

// EP04 · Salário-maternidade — série de 5 vídeos pedida pelo usuário em 31/10/2026 ("pode começar").
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
export const R = "#ff5d5d";
const Y = "#ffd43b";
const GOLD = "#ffc531";

/** Cenário fixo: ilha, casa da Ana, INSS, cofrinho e a Ana. */
const SYSTEM = (): SceneObject[] => [
  o("island", "diorama-ilha-flutuante"),
  o("home", "casa-da-ana"),
  o("inss", "predio-inss"),
  o("piggy", "cofrinho-janela-de-corte"),
  o("coins", "moedas-instanciadas"),
  o("ana", "ana-manicure"),
];
const PIPE = o("accidentPipe", "cano-dourado-do-salario-maternidade");
const PINK = "#ff8fc1";
const ANA_HEAD: Vec3 = [EP4.ana[0], 1.95, EP4.ana[2]];
const ANA_AT_CRIB: Vec3 = [EP4.crib[0] - 0.75, 1.1, EP4.crib[2] + 0.1];

const P = {
  far: orbit([0, 1.4, -1.0], 46, 30, 32),
  hook: orbit([-0.6, 1.5, 0.2], 22, 18, 18),
  hookPunch: orbit([-0.6, 1.5, 0.2], 18, 14, 16),
  hookUp: orbit([0, 2.2, -0.5], 26, 12, 22),
  ana: orbit([-2.35, 1.15, -1.5], 6.5, 15, 8),
  anaClose: orbit([-2.55, 1.35, -1.6], 4.4, 10, 6),
  anaBelly: orbit([-2.55, 1.05, -1.5], 3.6, 32, 6),
  crib: orbit([-2.0, 0.95, -0.8], 6, 22, 16),
  goldPipe: orbit([1.4, 2.4, -0.8], 24, -15, 24),
  piggy: orbit([1.55, 1.45, 2.2], 14, 25, 14),
  piggyR: orbit([1.55, 1.45, 2.2], 14, 5, 14),
  gate: orbit([3.0, 0.9, -2.3], 14, 40, 18),
  gateR: orbit([2.6, 0.9, -2.3], 13, 25, 16),
  jobless: orbit([3.6, 1.15, -0.2], 6.5, -20, 10),
  dad: orbit([L.home[0], 1.2, L.home[2]], 5.5, 15, 8),
  coin: orbit([1.3, 3.3, 2.0], 11.5, 12, 8),
  gavel: orbit([1.3, 2.5, 3.4], 7.5, 15, 10),
  final: orbit([0, 1.4, -1.2], 46, 40, 30),
  finalAna: orbit([ANA_AT_CRIB[0], 1.2, ANA_AT_CRIB[2]], 5.2, 18, 8),
};

export const scenes: ScenePlan[] = [
  // ------------------------------------------------------------------ s1 · gancho
  {
    id: "scene-01-gancho",
    startFrame: sc(0).from,
    durationInFrames: sc(0).durationInFrames,
    voKey: "s1",
    narration: "Vai ter bebê? Sabia que existe um salário pago pelo INSS só pra isso?",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.far), key(22, P.hook, "out"), key(W("s1", 10) - 4, P.hookPunch, "soft"), key(end(0), P.hookUp, "soft")] },
    objects: [...SYSTEM(), PIPE, o("crib", "berco")],
    animations: [
      lerp("ana.belly", 0, 1, 1, 1),
      lerp("ana.hop", 0, 1, 1, 1),
      lerp("ana.wave", 10, 22, 0, 1, "out"),
      lerp("pipeAccident.grow", 0, 1, 1, 1),
      lerp("coins.accident.flow", 0, 1, 1, 1),
      lerp("piggy.level", 0, 1, 0.6, 0.6),
      spring("crib.pop", W("s1", 2) - 6, W("s1", 2) + 18, 0, 1, 9),
      lerp("coinRain", W("s1", 7), W("s1", 7) + 10, 0, 1, "out"),
      lerp("coinRain", end(0) - 14, end(0) - 2, 1, 0, "in"),
      spring("inss.glow", W("s1", 10), W("s1", 10) + 24, 0, 1, 8),
      ...punch(W("s1", 10)),
      lerp("rewind", end(0) - 10, end(0), 0, 1, "in"),
    ],
    badges: [
      { text: "VAI TER BEBÊ?", variant: "warning", icon: "?", appearAt: W("s1", 0), disappearAt: W("s1", 7) - 2 },
      { text: "SALÁRIO PAGO PELO INSS", variant: "positive", appearAt: W("s1", 7), disappearAt: end(0) },
    ],
    bigWords: [{ text: "BEBÊ?", at: W("s1", 2), until: W("s1", 5), color: PINK, size: 190 }],
    highlights: ["BEBÊ", "SALÁRIO", "INSS"],
    captions: [{ text: "Vai ter bebê? Sabia que existe um salário pago pelo INSS só pra isso?", from: voLocal("s1"), to: end(0) }],
    audioCues: [narration("s1", "ready"), sfx("whoosh-big", 0, 0.3), sfx("badge", W("s1", 0), 0.24), sfx("pop", W("s1", 2), 0.24), sfx("coin", W("s1", 7), 0.22), sfx("pop", W("s1", 10), 0.28), sfx("rewind", end(0) - 10, 0.28)],
  },
  // ------------------------------------------------------------------ s2 · Ana, manicure MEI
  {
    id: "scene-02-ana",
    startFrame: sc(1).from,
    durationInFrames: sc(1).durationInFrames,
    voKey: "s2",
    narration: "Essa é a Ana. Ela é manicure e paga o INSS como MEI.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.hookUp), key(12, P.ana, "out"), key(W("s2", 11), P.ana), key(end(1), P.anaClose, "soft")] },
    objects: [...SYSTEM(), PIPE, o("manicure", "mesa-de-manicure")],
    animations: [
      lerp("rewind", 0, 10, 1, 0, "out"),
      ...whip(0),
      lerp("ana.belly", 0, 8, 1, 0, "in"),
      lerp("ana.hop", 0, 6, 1, 0, "in"),
      lerp("crib.pop", 0, 8, 1, 0, "in"),
      lerp("pipeAccident.grow", 0, 10, 1, 0, "in"),
      lerp("coins.accident.flow", 0, 6, 1, 0, "linear"),
      lerp("piggy.level", 0, 10, 0.6, 0.2, "linear"),
      lerp("ana.wave", W("s2", 4), W("s2", 4) + 10, 1, 0, "inOut"),
      spring("manicure.pop", W("s2", 6) - 4, W("s2", 6) + 20, 0, 1, 9),
      ...punch(W("s2", 12)),
    ],
    badges: [{ text: "PAGA O INSS COMO MEI", variant: "info", appearAt: W("s2", 8), disappearAt: end(1) }],
    bigWords: [{ text: "MANICURE", at: W("s2", 6), until: W("s2", 8), color: PINK, size: 130 }],
    labels: [{ text: "ANA", point: ANA_HEAD, at: W("s2", 3), until: W("s2", 6), off: [-150, -70], accent: PINK }],
    highlights: ["ANA", "MANICURE", "INSS", "MEI"],
    captions: [{ text: "Essa é a Ana. Ela é manicure e paga o INSS como MEI.", from: voLocal("s2"), to: end(1) }],
    audioCues: [narration("s2", "ready"), sfx("whoosh", 0, 0.26), sfx("pop", W("s2", 3), 0.22), sfx("pop", W("s2", 6), 0.22), sfx("badge", W("s2", 8), 0.22)],
  },
  // ------------------------------------------------------------------ s3 · gravidez
  {
    id: "scene-03-gravida",
    startFrame: sc(2).from,
    durationInFrames: sc(2).durationInFrames,
    voKey: "s3",
    narration: "Agora ela está grávida, e quando o bebê nascer, vai precisar parar pra cuidar dele.",
    camera: { projection: "perspective", movement: "tracking", keys: [key(0, P.anaClose), key(W("s3", 3) - 4, P.anaBelly, "out"), key(W("s3", 7), P.anaBelly), key(W("s3", 8) + 4, P.crib, "out"), key(end(2), P.crib)] },
    objects: [...SYSTEM(), o("manicure", "mesa-de-manicure"), o("crib", "berco")],
    animations: [
      lerp("ana.belly", W("s3", 3), W("s3", 3) + 14, 0, 1, "out"),
      ...punch(W("s3", 3)),
      spring("crib.pop", W("s3", 8) - 4, W("s3", 8) + 18, 0, 1, 9),
      ...whip(W("s3", 8)),
      lerp("ana.toCrib", W("s3", 9), W("s3", 13), 0, 1, "inOut"),
      lerp("manicure.pop", W("s3", 11), W("s3", 11) + 10, 1, 0, "in"),
    ],
    badges: [{ text: "PRECISA PARAR DE TRABALHAR", variant: "warning", appearAt: W("s3", 11), disappearAt: end(2) }],
    bigWords: [{ text: "GRÁVIDA!", at: W("s3", 3), until: W("s3", 7), color: PINK, size: 150 }],
    highlights: ["GRÁVIDA", "BEBÊ", "NASCER", "CUIDAR"],
    captions: [{ text: "Agora ela está grávida, e quando o bebê nascer, vai precisar parar pra cuidar dele.", from: voLocal("s3"), to: end(2) }],
    audioCues: [narration("s3", "ready"), sfx("pop", W("s3", 3), 0.26), sfx("ding", W("s3", 3) + 2, 0.22), sfx("whoosh", W("s3", 8), 0.22), sfx("pop", W("s3", 8), 0.22), sfx("badge", W("s3", 11), 0.22)],
  },
  // ------------------------------------------------------------------ s4 · revelação
  {
    id: "scene-04-salario-maternidade",
    startFrame: sc(3).from,
    durationInFrames: sc(3).durationInFrames,
    voKey: "s4",
    narration: "É pra isso que existe o salário-maternidade.",
    camera: { projection: "perspective", movement: "orbit", keys: [key(0, P.crib), key(W("s4", 6) - 2, P.crib), key(W("s4", 6) + 12, P.goldPipe, "out"), key(end(3), P.goldPipe)] },
    objects: [...SYSTEM(), o("accidentPipe", "cano-dourado-do-salario-maternidade", "inexistente", "aberto"), o("crib", "berco")],
    animations: [
      ...flash(W("s4", 6)),
      ...whip(W("s4", 6) + 1),
      lerp("speed", W("s4", 6), W("s4", 6) + 4, 0, 1, "out"),
      lerp("speed", W("s4", 6) + 18, W("s4", 6) + 28, 1, 0, "in"),
      lerp("pipeAccident.grow", W("s4", 6) + 2, W("s4", 6) + 26, 0, 1, "out"),
      lerp("pipeAccident.glow", W("s4", 6) + 2, W("s4", 6) + 14, 0, 1, "out"),
      lerp("coins.accident.flow", W("s4", 6) + 20, W("s4", 6) + 30, 0, 1, "linear"),
    ],
    badges: [],
    bigWords: [{ text: "SALÁRIO-MATERNIDADE", at: W("s4", 6), until: end(3), color: GOLD, size: 72, y: 640, tilt: -3 }],
    highlights: ["SALÁRIO-MATERNIDADE"],
    captions: [{ text: "É pra isso que existe o salário-maternidade.", from: voLocal("s4"), to: end(3) }],
    audioCues: [narration("s4", "ready"), sfx("shimmer", W("s4", 6), 0.3), sfx("whoosh-big", W("s4", 6), 0.24), sfx("glow", W("s4", 6) + 4, 0.22)],
  },
  // ------------------------------------------------------------------ s5 · 120 dias
  {
    id: "scene-05-120-dias",
    startFrame: sc(4).from,
    durationInFrames: sc(4).durationInFrames,
    voKey: "s5",
    narration: "Ele é pago por 120 dias, a partir do parto ou até 28 dias antes.",
    camera: { projection: "perspective", movement: "orbit", keys: [key(0, P.goldPipe), key(10, P.piggy, "out"), key(end(4), P.piggyR, "linear")] },
    objects: [...SYSTEM(), PIPE, o("calendar", "calendario-3d"), o("crib", "berco")],
    animations: [
      ...whip(0),
      lerp("pipeAccident.glow", 10, 40, 1, 0.4, "inOut"),
      lerp("piggy.level", 0, end(4), 0.2, 0.55, "linear"),
      lerp("calendar.flip", 0, 1, 0, 0),
      spring("calendar.pop", W("s5", 4) - 8, W("s5", 4) + 14, 0, 1, 9),
      lerp("calendar.flip", W("s5", 4), W("s5", 5), 0, 1, "linear"),
      ...punch(W("s5", 4)),
      ...punch(W("s5", 11), 0.6),
    ],
    badges: [{ text: "A PARTIR DO PARTO", variant: "info", subtitle: "ou até 28 dias antes", appearAt: W("s5", 8), disappearAt: end(4) }],
    bigWords: [
      { text: "120 DIAS", at: W("s5", 4), until: W("s5", 8) - 2, color: GOLD, size: 170 },
      { text: "28 DIAS ANTES", at: W("s5", 11), until: end(4), color: Y, size: 104 },
    ],
    highlights: ["120 DIAS", "PARTO", "28 DIAS"],
    captions: [{ text: "Ele é pago por 120 dias, a partir do parto ou até 28 dias antes.", from: voLocal("s5"), to: end(4) }],
    audioCues: [narration("s5", "ready"), sfx("whoosh", 0, 0.22), sfx("ding", W("s5", 4), 0.24), sfx("tick", W("s5", 4) + 8, 0.2), sfx("tick", W("s5", 4) + 16, 0.2), sfx("badge", W("s5", 8), 0.22), sfx("ding", W("s5", 11), 0.2)],
  },
  // ------------------------------------------------------------------ s6 · quem pode receber
  {
    id: "scene-06-quem-pode",
    startFrame: sc(5).from,
    durationInFrames: sc(5).durationInFrames,
    voKey: "s6",
    narration: "Quem pode receber? A empregada de carteira assinada, a empregada doméstica, a MEI, a autônoma, a contribuinte facultativa e a segurada especial, como a trabalhadora rural.",
    camera: { projection: "perspective", movement: "tracking", keys: [key(0, P.piggyR), key(10, P.gate, "out"), key(W("s6", 14), P.gate), key(end(5), P.gateR, "soft")] },
    objects: [...SYSTEM(), PIPE, o("gate", "portao-catraca+luz"), o("pawns", "5-bonecos")],
    animations: [
      ...whip(0),
      lerp("calendar.pop", 0, 8, 1, 0, "in"),
      spring("gate.pop", 4, 30, 0, 1, 9),
      lerp("queue.arrive", 10, 40, 0, 1, "inOut"),
      lerp("pawn1.pass", W("s6", 4) - 4, W("s6", 4) + 18, 0, 1, "inOut"),
      lerp("pawn2.pass", W("s6", 10) - 6, W("s6", 10) + 16, 0, 1, "inOut"),
      lerp("pawn5.pass", W("s6", 12) - 4, W("s6", 12) + 16, 0, 1, "inOut"),
      lerp("pawn3.pass", W("s6", 14) - 4, W("s6", 14) + 18, 0, 1, "inOut"),
      lerp("pawn4.pass", W("s6", 20) - 4, W("s6", 20) + 18, 0, 1, "inOut"),
    ],
    badges: [
      { text: "QUEM PODE RECEBER?", variant: "warning", icon: "?", appearAt: W("s6", 0), disappearAt: W("s6", 3) - 2 },
      { text: "TODAS AS SEGURADAS DO INSS", variant: "positive", appearAt: W("s6", 3), disappearAt: end(5) },
    ],
    bigWords: [
      { text: "EMPREGADA", at: W("s6", 4), until: W("s6", 9), color: G, size: 120 },
      { text: "DOMÉSTICA", at: W("s6", 9), until: W("s6", 11), color: G, size: 120 },
      { text: "MEI", at: W("s6", 11), until: W("s6", 13), color: G, size: 170 },
      { text: "AUTÔNOMA", at: W("s6", 13), until: W("s6", 15), color: G, size: 120 },
      { text: "FACULTATIVA", at: W("s6", 15), until: W("s6", 18), color: G, size: 106 },
      { text: "SEGURADA ESPECIAL", at: W("s6", 18), until: end(5), color: G, size: 80 },
    ],
    highlights: ["RECEBER", "EMPREGADA", "DOMÉSTICA", "MEI", "AUTÔNOMA", "FACULTATIVA", "SEGURADA", "ESPECIAL", "RURAL"],
    captions: [{ text: "Quem pode receber? A empregada de carteira assinada, a empregada doméstica, a MEI, a autônoma, a contribuinte facultativa e a segurada especial, como a trabalhadora rural.", from: voLocal("s6"), to: end(5) }],
    audioCues: [
      narration("s6", "ready"),
      sfx("whoosh", 0, 0.22),
      sfx("badge", W("s6", 0), 0.22),
      sfx("ding", W("s6", 4), 0.18),
      sfx("ding", W("s6", 9), 0.18),
      sfx("ding", W("s6", 11), 0.18),
      sfx("ding", W("s6", 13), 0.18),
      sfx("ding", W("s6", 15), 0.18),
      sfx("ding", W("s6", 18), 0.18),
    ],
  },
  // ------------------------------------------------------------------ s7 · desempregada
  {
    id: "scene-07-desempregada",
    startFrame: sc(6).from,
    durationInFrames: sc(6).durationInFrames,
    voKey: "s7",
    narration: "Até quem está desempregada pode ter direito, se ainda tiver a qualidade de segurada.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.gateR), key(10, P.jobless, "out"), key(end(6), orbit([3.6, 1.3, -0.2], 5, -10, 8), "soft")] },
    objects: [...SYSTEM(), PIPE, o("jobless", "desempregada-com-caixa")],
    animations: [
      ...whip(0),
      spring("jobless.pop", 4, 26, 0, 1, 9),
      ...punch(W("s7", 3)),
      spring("jobless.check", W("s7", 11), W("s7", 11) + 22, 0, 1, 8),
      ...punch(W("s7", 11)),
    ],
    badges: [{ text: "QUALIDADE DE SEGURADA", variant: "positive", subtitle: "é o que garante o direito", appearAt: W("s7", 11), disappearAt: end(6) }],
    bigWords: [{ text: "DESEMPREGADA?", at: W("s7", 3), until: W("s7", 7), color: Y, size: 110 }],
    highlights: ["DESEMPREGADA", "DIREITO", "QUALIDADE", "SEGURADA"],
    captions: [{ text: "Até quem está desempregada pode ter direito, se ainda tiver a qualidade de segurada.", from: voLocal("s7"), to: end(6) }],
    audioCues: [narration("s7", "ready"), sfx("whoosh", 0, 0.22), sfx("pop", 6, 0.22), sfx("badge", W("s7", 3), 0.22), sfx("ding", W("s7", 11), 0.24)],
  },
  // ------------------------------------------------------------------ s8 · adoção
  {
    id: "scene-08-adocao",
    startFrame: sc(7).from,
    durationInFrames: sc(7).durationInFrames,
    voKey: "s8",
    narration: "E vale também na adoção, inclusive quando quem adota é o pai.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.jobless), key(10, P.dad, "out"), key(end(7), orbit([L.home[0], 1.3, L.home[2]], 4.2, 8, 6), "soft")] },
    objects: [...SYSTEM(), PIPE, o("marcos", "pai-adotante")],
    animations: [
      ...whip(0),
      lerp("jobless.pop", 0, 8, 1, 0, "in"),
      lerp("marcos.spot", 0, 1, 0, 0),
      lerp("marcos.baby", 0, 1, 1, 1),
      lerp("marcos.carry", 0, 1, 1, 1),
      ...punch(W("s8", 4)),
      lerp("marcos.hop", W("s8", 8), W("s8", 8) + 4, 0, 1, "out"),
      ...punch(W("s8", 11), 0.7),
    ],
    badges: [
      { text: "VALE NA ADOÇÃO", variant: "positive", appearAt: W("s8", 4), disappearAt: end(7) },
      { text: "O PAI ADOTANTE TAMBÉM", variant: "info", appearAt: W("s8", 8), disappearAt: end(7) },
    ],
    bigWords: [{ text: "ADOÇÃO", at: W("s8", 4), until: W("s8", 8), color: PINK, size: 160 }],
    highlights: ["ADOÇÃO", "ADOTA", "PAI"],
    captions: [{ text: "E vale também na adoção, inclusive quando quem adota é o pai.", from: voLocal("s8"), to: end(7) }],
    audioCues: [narration("s8", "ready"), sfx("whoosh", 0, 0.22), sfx("pop", W("s8", 4), 0.24), sfx("badge", W("s8", 4), 0.22), sfx("ding", W("s8", 11), 0.22)],
  },
  // ------------------------------------------------------------------ s9 · valor
  {
    id: "scene-09-valor",
    startFrame: sc(8).from,
    durationInFrames: sc(8).durationInFrames,
    voKey: "s9",
    narration: "Pra quem tem carteira assinada, o valor é o próprio salário. Pra MEI, que contribui sobre o mínimo, em regra é um salário mínimo.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.dad), key(10, P.coin, "out"), key(end(8), P.coin)] },
    objects: [...SYSTEM(), PIPE, o("bigCoin", "moeda-gigante")],
    animations: [
      ...whip(0),
      lerp("marcos.baby", 0, 1, 0, 0),
      lerp("marcos.carry", 0, 1, 0, 0),
      spring("bigCoin.pop", 6, 30, 0, 1, 9),
      lerp("bigCoin.spin", 6, W("s9", 10), 0, 720, "linear", "deg"),
      ...punch(W("s9", 10)),
      lerp("bigCoin.spin", W("s9", 11), W("s9", 22), 720, 1440, "inOut", "deg"),
      ...punch(W("s9", 22)),
    ],
    badges: [
      { text: "CARTEIRA ASSINADA", variant: "info", subtitle: "o valor é o próprio salário", appearAt: W("s9", 3), disappearAt: W("s9", 11) - 2 },
      { text: "MEI", variant: "info", subtitle: "em regra, um salário mínimo", appearAt: W("s9", 12), disappearAt: end(8) },
    ],
    bigWords: [
      { text: "= SALÁRIO", at: W("s9", 10), until: W("s9", 11) + 4, color: GOLD, size: 150 },
      { text: "1 SALÁRIO MÍNIMO", at: W("s9", 21), until: end(8), color: GOLD, size: 86 },
    ],
    highlights: ["CARTEIRA", "ASSINADA", "SALÁRIO", "MEI", "MÍNIMO"],
    captions: [{ text: "Pra quem tem carteira assinada, o valor é o próprio salário. Pra MEI, que contribui sobre o mínimo, em regra é um salário mínimo.", from: voLocal("s9"), to: end(8) }],
    audioCues: [narration("s9", "ready"), sfx("whoosh", 0, 0.22), sfx("pop", 8, 0.22), sfx("badge", W("s9", 3), 0.22), sfx("ding", W("s9", 10), 0.24), sfx("badge", W("s9", 12), 0.22), sfx("ding", W("s9", 22), 0.24)],
  },
  // ------------------------------------------------------------------ s10 · STF: sem carência
  {
    id: "scene-10-stf",
    startFrame: sc(9).from,
    durationInFrames: sc(9).durationInFrames,
    voKey: "s10",
    narration: "E desde 2024, depois de uma decisão do STF, não precisa mais cumprir carência: o que conta é ter a qualidade de segurada.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.coin), key(10, P.gavel, "out"), key(W("s10", 13), P.gavel), key(end(9), P.piggy, "soft")] },
    objects: [...SYSTEM(), PIPE, o("bigGavel", "martelo-do-stf")],
    animations: [
      ...whip(0),
      lerp("bigCoin.pop", 0, 8, 1, 0, "in"),
      spring("gavel.pop", 6, 28, 0, 1, 9),
      lerp("gavel.hit", W("s10", 8) - 10, W("s10", 8), 0, 1, "in"),
      ...flash(W("s10", 8)),
      lerp("camera.shake", W("s10", 8), W("s10", 8) + 4, 0, 1, "out"),
      lerp("camera.shake", W("s10", 8) + 4, W("s10", 8) + 14, 1, 0, "in"),
      lerp("gavel.hit", W("s10", 8) + 8, W("s10", 8) + 20, 1, 0, "inOut"),
      ...punch(W("s10", 13)),
      lerp("gavel.pop", W("s10", 14), W("s10", 14) + 10, 1, 0, "in"),
    ],
    badges: [
      { text: "DECISÃO DO STF", variant: "info", subtitle: "desde 2024", appearAt: W("s10", 1), disappearAt: W("s10", 9) - 2 },
      { text: "QUALIDADE DE SEGURADA", variant: "positive", subtitle: "é o que conta", appearAt: W("s10", 18), disappearAt: end(9) },
    ],
    bigWords: [
      { text: "STF", at: W("s10", 8), until: W("s10", 9) + 4, color: Y, size: 220, y: 560 },
      { text: "SEM CARÊNCIA", at: W("s10", 13), until: W("s10", 18) - 2, color: G, size: 120 },
    ],
    highlights: ["2024", "STF", "CARÊNCIA", "QUALIDADE", "SEGURADA"],
    captions: [{ text: "E desde 2024, depois de uma decisão do STF, não precisa mais cumprir carência: o que conta é ter a qualidade de segurada.", from: voLocal("s10"), to: end(9) }],
    audioCues: [narration("s10", "ready"), sfx("whoosh", 0, 0.22), sfx("badge", W("s10", 1), 0.22), sfx("gavel", W("s10", 8), 0.4), sfx("thud", W("s10", 8), 0.3), sfx("ding", W("s10", 13), 0.24), sfx("badge", W("s10", 18), 0.22)],
  },
  // ------------------------------------------------------------------ s11 · final
  {
    id: "scene-11-final",
    startFrame: sc(10).from,
    durationInFrames: sc(10).durationInFrames,
    voKey: "s11",
    narration: "Gostou da informação? Manda esse vídeo pra uma amiga que você acha que se encaixa nessa situação.",
    camera: { projection: "perspective", movement: "dolly-out", keys: [key(0, P.piggy), key(14, P.final, "out"), key(W("s11", 11), P.final), key(W("s11", 11) + 30, P.finalAna, "out"), key(end(10), P.finalAna)] },
    objects: [...SYSTEM(), PIPE, o("crib", "berco")],
    animations: [
      ...whip(0),
      lerp("ana.toCrib", 0, 1, 1, 1),
      lerp("ana.holdBaby", 0, 1, 1, 1),
      lerp("coinRain", 10, 20, 0, 1, "out"),
      lerp("coinRain", W("s11", 3) + 10, W("s11", 3) + 22, 1, 0, "in"),
      lerp("piggy.level", 0, end(10), 0.55, 0.85, "linear"),
      spring("share", W("s11", 3), W("s11", 3) + 24, 0, 1, 8),
      lerp("share", W("s11", 11) - 6, W("s11", 11) + 2, 1, 0, "in"),
      lerp("ana.hop", W("s11", 11), W("s11", 11) + 4, 0, 1, "out"),
      spring("endcard", end(10) - 52, end(10) - 22, 0, 1, 10),
    ],
    badges: [
      { text: "GOSTOU DA INFORMAÇÃO?", variant: "warning", icon: "?", appearAt: W("s11", 0), disappearAt: W("s11", 3) - 2 },
      { text: "MANDA PRA UMA AMIGA", variant: "positive", subtitle: "que se encaixa nessa situação", appearAt: W("s11", 3), disappearAt: end(10) - 54 },
    ],
    labels: [
      { text: "SALÁRIO-MATERNIDADE", point: [1.9, 3.5, 1.1], at: 14, until: W("s11", 3), off: [60, -150], accent: GOLD },
      { text: "INSS", point: [2.8, 4.0, -4.6], at: 18, until: W("s11", 3), off: [0, -70], accent: "#2f7df6" },
    ],
    highlights: ["GOSTOU", "INFORMAÇÃO", "MANDA", "AMIGA"],
    captions: [{ text: "Gostou da informação? Manda esse vídeo pra uma amiga que você acha que se encaixa nessa situação.", from: voLocal("s11"), to: end(10) - 52 }],
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
