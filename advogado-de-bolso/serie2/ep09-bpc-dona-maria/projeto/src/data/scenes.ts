import { evaluateTrack, orbit, type EaseName, type TrackAnimation, type Vec3 } from "../utils/animation";
import { EP, STAGE } from "../layout";
import { DURATION, FPS, HEIGHT, SCENE_FRAMES, voLocal, WIDTH, wordLocal, type VoKey } from "../utils/timing";

// EP09 · Série 2 (comédia "mito") · BPC/LOAS: dona Maria x vizinha fofoqueira.
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

/** Cenário fixo: ilha, casa da dona Maria, INSS e as duas personagens. */
const SYSTEM = (): SceneObject[] => [o("island", "diorama-ilha"), o("home", "casa-da-dona-maria"), o("inss", "predio-inss"), o("dona", "dona-maria-67-anos"), o("vizinha", "vizinha-fofoqueira")];
const DOC = o("doc", "documento-gigante-do-inss");
const LIA = o("liaBig", "advogada-de-bolso");
const PLAZA: Vec3 = [0.45, 0, -1.35];
const DX = PLAZA[0] - EP.maria[0];
const DZ = PLAZA[2] - EP.maria[2];
const VIZ_HEAD: Vec3 = [-0.4, 1.95, -1.05];
const DONA_HEAD: Vec3 = [PLAZA[0], 1.85, PLAZA[2]];
const PINK = "#ff8fc1";

const P = {
  viz: orbit([-0.4, 1.45, -1.05], 6.0, -4, 3),
  vizPush: orbit([-0.4, 1.5, -1.05], 5.0, -4, 2),
  dona: orbit([PLAZA[0], 1.3, PLAZA[2]], 5.8, -25, 4),
  home: orbit([-2.35, 1.0, -1.45], 7.0, 15, 8),
  homeWide: orbit([-2.2, 1.0, -1.3], 9.5, 18, 10),
  walkA: orbit([-2.3, 1.0, -1.6], 10, 0, 6),
  walkB: orbit([0.2, 1.0, -1.45], 10, 0, 6),
  doc: orbit([STAGE.doc[0], 1.2, STAGE.doc[2]], 5.6, 17, 3),
  docPush: orbit([STAGE.doc[0], 1.15, STAGE.doc[2]], 4.4, 17, 2),
  plaza: orbit([0.35, 1.0, -1.4], 16, -8, 9),
  plazaTight: orbit([0.05, 1.0, -1.2], 12.5, -6, 6),
  passBy: orbit([-0.35, 1.0, -1.0], 12, -20, 6),
  lia: orbit([0.85, 0.95, -1.3], 6.2, 6, 4),
  pipes: orbit([1.2, 2.0, -0.4], 22, -12, 22),
  piggy: orbit([1.3, 1.4, 2.0], 16, -20, 14),
  coin: orbit([1.3, 3.3, 2.0], 11.5, 12, 8),
  rules: orbit([0.45, 1.7, -1.3], 9, -26, 6),
  final: orbit([0.2, 1.4, -1.3], 30, 10, 18),
};

export const scenes: ScenePlan[] = [
  // ------------------------------------------------------------------ s1 · gancho
  {
    id: "scene-01-gancho",
    startFrame: sc(0).from,
    durationInFrames: sc(0).durationInFrames,
    voKey: "s1",
    narration: "A vizinha fofoqueira disse que a dona Maria nunca ia receber nada do INSS. Olha só no que deu!",
    camera: {
      projection: "perspective",
      movement: "tracking",
      keys: [key(0, P.vizPush), key(W("s1", 6) - 4, P.viz, "soft"), key(W("s1", 7), P.plazaTight, "out"), key(W("s1", 14) - 2, P.plazaTight), key(W("s1", 14) + 4, P.plazaTight), key(end(0), P.plazaTight)],
    },
    objects: [...SYSTEM(), DOC],
    animations: [
      lerp("dona.dx", 0, 1, DX, DX),
      lerp("dona.dz", 0, 1, DZ, DZ),
      lerp("doc.pop", 0, 1, 1, 1),
      lerp("doc.deny", 0, 1, 1, 1),
      lerp("doc.ok", 0, 1, 0, 0),
      lerp("vizinha.laugh", 0, 4, 0, 1, "out"),
      ...punch(2, 0.8),
      lerp("dona.sad", W("s1", 7), W("s1", 7) + 8, 0, 1, "out"),
      // flash do final
      ...whip(W("s1", 14)),
      ...flash(W("s1", 14) + 2, 0.5),
      lerp("vizinha.laugh", W("s1", 14) + 2, W("s1", 14) + 4, 1, 0, "linear"),
      spring("vizinha.shock", W("s1", 14) + 4, W("s1", 14) + 24, 0, 1, 7),
      lerp("dona.sad", W("s1", 14) + 2, W("s1", 14) + 4, 1, 0, "linear"),
      lerp("doc.deny", W("s1", 14) + 2, W("s1", 14) + 4, 1, 0, "linear"),
      lerp("doc.ok", W("s1", 14) + 2, W("s1", 14) + 4, 0, 1, "linear"),
      lerp("dona.shades", W("s1", 14) + 4, W("s1", 14) + 14, 0, 1, "in"),
      lerp("dona.dance", W("s1", 14) + 14, W("s1", 14) + 18, 0, 1, "out"),
      lerp("plazaCoins", W("s1", 14) + 4, W("s1", 14) + 10, 0, 1, "out"),
      lerp("confetti", W("s1", 14) + 4, W("s1", 14) + 10, 0, 1, "out"),
      lerp("rewind", end(0) - 10, end(0), 0, 1, "in"),
    ],
    badges: [],
    bigWords: [
      { text: "FOFOCA!", at: 2, until: W("s1", 6), color: Y, size: 190, y: 1000, tilt: 5 },
      { text: "NUNCA!", at: W("s1", 8), until: W("s1", 14) - 2, color: R, size: 190, y: 500, tilt: -6 },
      { text: "OLHA SÓ", at: W("s1", 14), until: end(0), color: "#ffffff", size: 150, y: 960, tilt: -5 },
      { text: "NO QUE DEU!", at: W("s1", 16), until: end(0), color: GOLD, size: 140, y: 1120, tilt: -5 },
    ],
    labels: [
      { text: "VIZINHA FOFOQUEIRA", point: VIZ_HEAD, at: 6, until: W("s1", 6), off: [0, -130], accent: PINK },
      { text: "DONA MARIA", point: DONA_HEAD, at: W("s1", 7) + 2, until: W("s1", 14) - 2, off: [20, -120], accent: GOLD },
    ],
    highlights: ["VIZINHA", "FOFOQUEIRA", "MARIA", "NUNCA", "NADA", "INSS"],
    captions: [{ text: "A vizinha fofoqueira disse que a dona Maria nunca ia receber nada do INSS. Olha só no que deu!", from: voLocal("s1"), to: end(0) }],
    audioCues: [
      narration("s1", "ready"),
      sfx("boing", 2, 0.3),
      sfx("pop-high", 6, 0.2),
      sfx("whoosh", W("s1", 7) - 4, 0.22),
      sfx("buzz", W("s1", 8), 0.2),
      sfx("scratch", W("s1", 14) - 2, 0.38),
      sfx("airhorn", W("s1", 14) + 6, 0.2),
      sfx("coin", W("s1", 14) + 8, 0.2),
      sfx("rewind", end(0) - 10, 0.3),
    ],
  },
  // ------------------------------------------------------------------ s2 · quem é a dona Maria
  {
    id: "scene-02-dona-maria",
    startFrame: sc(1).from,
    durationInFrames: sc(1).durationInFrames,
    voKey: "s2",
    narration: "A dona Maria tem 67 anos, nunca contribuiu, e a renda da casa é bem pouquinha.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.homeWide), key(W("s2", 4), P.home, "soft"), key(W("s2", 9), P.home), key(end(1), P.homeWide, "soft")] },
    objects: [...SYSTEM(), o("incomeTable", "mesa-da-renda")],
    animations: [
      lerp("rewind", 0, 10, 1, 0, "out"),
      ...whip(0),
      lerp("dona.dx", 0, 1, 0, 0),
      lerp("dona.dz", 0, 1, 0, 0),
      lerp("dona.shades", 0, 1, 0, 0),
      lerp("dona.dance", 0, 1, 0, 0),
      lerp("vizinha.shock", 0, 1, 0, 0),
      lerp("plazaCoins", 0, 1, 0, 0),
      lerp("confetti", 0, 1, 0, 0),
      lerp("dona.wave", W("s2", 1), W("s2", 1) + 8, 0, 1, "out"),
      lerp("dona.wave", W("s2", 5), W("s2", 5) + 8, 1, 0, "inOut"),
      spring("income.pop", W("s2", 9) - 6, W("s2", 9) + 18, 0, 1, 9),
      lerp("income.amount", 0, 1, 0.45, 0.45),
      lerp("income.amount", W("s2", 13), W("s2", 14) + 6, 0.45, 0.1, "inOut"),
      lerp("dona.sad", W("s2", 13), W("s2", 14), 0, 0.7, "inOut"),
    ],
    badges: [
      { text: "NUNCA CONTRIBUIU", variant: "info", appearAt: W("s2", 5), disappearAt: W("s2", 9) - 2 },
      { text: "RENDA BAIXA", variant: "negative", appearAt: W("s2", 13), disappearAt: end(1) },
    ],
    bigWords: [{ text: "67 ANOS", at: W("s2", 4), until: W("s2", 5) + 4, color: GOLD, size: 190, y: 1000, tilt: -5 }],
    labels: [{ text: "DONA MARIA", point: [EP.maria[0], 1.85, EP.maria[2]], at: W("s2", 1), until: W("s2", 4), off: [0, -120], accent: GOLD }],
    highlights: ["MARIA", "67", "ANOS", "NUNCA", "CONTRIBUIU", "RENDA", "POUQUINHA"],
    captions: [{ text: "A dona Maria tem 67 anos, nunca contribuiu, e a renda da casa é bem pouquinha.", from: voLocal("s2"), to: end(1) }],
    audioCues: [narration("s2", "ready"), sfx("whoosh", 0, 0.24), sfx("pop", W("s2", 1), 0.2), sfx("ding", W("s2", 4), 0.22), sfx("badge", W("s2", 5), 0.2), sfx("coin", W("s2", 9), 0.18), sfx("badge", W("s2", 13), 0.2)],
  },
  // ------------------------------------------------------------------ s3 · descobriu o BPC e foi pedir
  {
    id: "scene-03-bpc",
    startFrame: sc(2).from,
    durationInFrames: sc(2).durationInFrames,
    voKey: "s3",
    narration: "Aí ela descobriu o BPC: um salário mínimo por mês, sem precisar ter contribuído. Pediu e...",
    camera: {
      projection: "perspective",
      movement: "tracking",
      keys: [key(0, P.homeWide), key(W("s3", 4), P.home, "soft"), key(W("s3", 9), P.walkA, "soft"), key(W("s3", 13) + 6, P.walkB, "inOut"), key(W("s3", 14) + 2, P.doc, "soft"), key(end(2), P.docPush, "inOut")],
    },
    objects: [...SYSTEM(), o("incomeTable", "mesa-da-renda"), DOC],
    animations: [
      lerp("income.pop", 0, 8, 1, 0, "in"),
      lerp("dona.sad", 0, 8, 0.7, 0, "inOut"),
      lerp("dona.hop", W("s3", 4), W("s3", 4) + 4, 0, 1, "out"),
      lerp("dona.hop", W("s3", 7), W("s3", 7) + 4, 1, 0, "in"),
      lerp("dona.ry", W("s3", 9) - 4, W("s3", 9) + 2, 0, Math.PI / 2, "out", "rad"),
      lerp("dona.dx", W("s3", 9), W("s3", 14) - 4, 0, DX, "inOut"),
      lerp("dona.dz", W("s3", 9), W("s3", 14) - 4, 0, DZ, "inOut"),
      lerp("dona.ry", W("s3", 14) - 8, W("s3", 14), Math.PI / 2, 0, "inOut", "rad"),
      lerp("doc.pop", 0, 1, 0, 0),
      lerp("doc.deny", 0, 1, 0, 0),
      lerp("doc.ok", 0, 1, 0, 0),
      spring("doc.pop", W("s3", 13), W("s3", 13) + 22, 0, 1, 9),
    ],
    badges: [
      { text: "1 SALÁRIO MÍNIMO POR MÊS", variant: "positive", appearAt: W("s3", 5), disappearAt: W("s3", 10) - 2 },
      { text: "SEM PRECISAR TER CONTRIBUÍDO", variant: "positive", appearAt: W("s3", 10), disappearAt: W("s3", 14) - 2 },
    ],
    bigWords: [{ text: "BPC!", at: W("s3", 4), until: W("s3", 5) + 6, color: GOLD, size: 230, y: 520, tilt: -6 }],
    highlights: ["DESCOBRIU", "BPC", "SALÁRIO", "MÍNIMO", "MÊS", "CONTRIBUÍDO", "PEDIU"],
    captions: [
      { text: "Aí ela descobriu o BPC: um salário mínimo por mês, sem precisar ter contribuído.", from: voLocal("s3"), to: W("s3", 14) },
      { text: "Pediu e...", from: W("s3", 14), to: end(2) },
    ],
    audioCues: [narration("s3", "ready"), sfx("whoosh", 0, 0.2), sfx("ding", W("s3", 4), 0.26), sfx("badge", W("s3", 5), 0.2), sfx("badge", W("s3", 10), 0.2), sfx("whoosh-soft", W("s3", 9), 0.2), sfx("pop-high", W("s3", 13), 0.18), sfx("drumroll", end(2) - 40, 0.32)],
  },
  // ------------------------------------------------------------------ s4 · NEGADO + fofoca
  {
    id: "scene-04-negado",
    startFrame: sc(3).from,
    durationInFrames: sc(3).durationInFrames,
    voKey: "s4",
    narration: "Negado! E a vizinha espalhou pra rua inteira.",
    camera: { projection: "perspective", movement: "tracking", keys: [key(0, P.docPush), key(W("s4", 1) - 4, P.doc, "soft"), key(W("s4", 1) + 2, P.viz, "out"), key(end(3), P.vizPush, "linear")] },
    objects: [...SYSTEM(), DOC],
    animations: [
      spring("doc.deny", 6, 30, 0, 1, 8),
      ...flash(6, 0.8),
      lerp("camera.shake", 6, 9, 0, 1, "out"),
      lerp("camera.shake", 9, 22, 1, 0, "in"),
      lerp("vignette.red", 6, 12, 0, 0.6, "out"),
      lerp("vignette.red", W("s4", 1), W("s4", 1) + 10, 0.6, 0, "inOut"),
      spring("dona.shock", 6, 20, 0, 1, 8),
      lerp("dona.shock", 20, 28, 1, 0, "inOut"),
      lerp("dona.sad", 20, 28, 0, 1, "inOut"),
      ...whip(W("s4", 1)),
      lerp("vizinha.laugh", W("s4", 1) + 2, W("s4", 1) + 6, 0, 1, "out"),
      lerp("vizinha.hop", W("s4", 4), W("s4", 4) + 4, 0, 1, "out"),
      lerp("vizinha.wave", W("s4", 4), W("s4", 4) + 8, 0, 1, "out"),
    ],
    badges: [],
    bigWords: [
      { text: "NEGADO!", at: 6, until: W("s4", 1), color: R, size: 200, tilt: -7 },
      { text: "FOFOCA!", at: W("s4", 4), until: end(3), color: Y, size: 190, y: 1000, tilt: 5 },
    ],
    labels: [
      { text: "NEGARAM A DONA MARIA!", point: VIZ_HEAD, at: W("s4", 3), until: W("s4", 6), off: [40, -140], accent: Y },
      { text: "KKKKKK", point: VIZ_HEAD, at: W("s4", 6), until: end(3), off: [120, -110], accent: Y },
    ],
    highlights: ["NEGADO", "VIZINHA", "ESPALHOU", "RUA", "INTEIRA"],
    captions: [{ text: "Negado! E a vizinha espalhou pra rua inteira.", from: voLocal("s4"), to: end(3) }],
    audioCues: [narration("s4", "ready"), sfx("stamp", 6, 0.46), sfx("boo", 6, 0.22), sfx("whoosh", W("s4", 1), 0.22), sfx("phone", W("s4", 4), 0.18), sfx("boing", W("s4", 6), 0.2)],
  },
  // ------------------------------------------------------------------ s5 · advogada de bolso: renda por pessoa cabe na regra → recurso
  {
    id: "scene-05-recurso",
    startFrame: sc(4).from,
    durationInFrames: sc(4).durationInFrames,
    voKey: "s5",
    narration: "Mas a advogada de bolso mostrou que a renda por pessoa da casa cabia na regra, e entrou com recurso.",
    camera: { projection: "perspective", movement: "orbit", keys: [key(0, P.vizPush), key(W("s5", 1), P.lia, "out"), key(W("s5", 5), P.lia), key(W("s5", 6) + 4, P.dona, "soft"), key(W("s5", 15) + 4, P.dona), key(W("s5", 16) + 4, P.lia, "out"), key(end(4), P.lia)] },
    objects: [...SYSTEM(), DOC, LIA, o("liaFolder", "pasta-do-recurso")],
    animations: [
      lerp("vizinha.laugh", 0, 8, 1, 0, "inOut"),
      ...whip(W("s5", 0)),
      spring("liaBig.pop", W("s5", 2) - 4, W("s5", 2) + 20, 0, 1, 8),
      lerp("liaBig.wave", W("s5", 2) + 4, W("s5", 2) + 10, 0, 1, "out"),
      lerp("liaBig.wave", W("s5", 5), W("s5", 5) + 6, 1, 0, "in"),
      lerp("liaBig.point", W("s5", 5), W("s5", 5) + 8, 0, 1, "out"),
      spring("dona.ok", W("s5", 13), W("s5", 13) + 20, 0, 1, 7),
      lerp("dona.sad", W("s5", 13), W("s5", 13) + 8, 1, 0, "inOut"),
      lerp("dona.hop", W("s5", 13), W("s5", 13) + 4, 0, 1, "out"),
      lerp("dona.hop", W("s5", 16), W("s5", 16) + 4, 1, 0, "in"),
      lerp("dona.ok", W("s5", 16), W("s5", 16) + 6, 1, 0, "in"),
      spring("liaFolder.pop", W("s5", 17), W("s5", 17) + 20, 0, 1, 8),
      ...punch(W("s5", 19), 0.8),
    ],
    badges: [{ text: "RENDA POR PESSOA", variant: "info", subtitle: "renda da casa ÷ moradores", appearAt: W("s5", 8), disappearAt: W("s5", 16) }],
    bigWords: [
      { text: "CABE NA REGRA!", at: W("s5", 13), until: W("s5", 16), color: G, size: 130, y: 520, tilt: -4 },
      { text: "RECURSO!", at: W("s5", 19), until: end(4), color: GOLD, size: 180, y: 520, tilt: -5 },
    ],
    labels: [{ text: "ADVOGADA DE BOLSO", point: [1.2, 1.6, -1.25], at: W("s5", 2), until: W("s5", 6), off: [0, -130], accent: GOLD }],
    highlights: ["ADVOGADA", "BOLSO", "RENDA", "PESSOA", "CABIA", "REGRA", "RECURSO"],
    captions: [
      { text: "Mas a advogada de bolso mostrou que a renda por pessoa da casa cabia na regra,", from: voLocal("s5"), to: W("s5", 16) },
      { text: "e entrou com recurso.", from: W("s5", 16), to: end(4) },
    ],
    audioCues: [narration("s5", "ready"), sfx("whoosh-big", W("s5", 0), 0.24), sfx("pop-high", W("s5", 2) - 2, 0.24), sfx("shimmer", W("s5", 2), 0.18), sfx("badge", W("s5", 8), 0.2), sfx("ding", W("s5", 13), 0.24), sfx("pop", W("s5", 17), 0.22), sfx("badge", W("s5", 19), 0.24)],
  },
  // ------------------------------------------------------------------ s6 · resultado? APROVADO!
  {
    id: "scene-06-aprovado",
    startFrame: sc(5).from,
    durationInFrames: sc(5).durationInFrames,
    voKey: "s6",
    narration: "Resultado? Aprovado!",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.doc), key(W("s6", 1) - 2, P.docPush, "soft"), key(end(5), P.docPush)] },
    objects: [...SYSTEM(), DOC, LIA, o("liaFolder", "pasta-do-recurso")],
    animations: [
      ...whip(0),
      lerp("doc.deny", W("s6", 1) - 12, W("s6", 1) - 4, 1, 0, "in"),
      spring("doc.ok", W("s6", 1), W("s6", 1) + 20, 0, 1, 7),
      ...flash(W("s6", 1), 0.8),
      ...punch(W("s6", 1)),
      lerp("confetti", W("s6", 1), W("s6", 1) + 6, 0, 1, "out"),
      lerp("dona.sad", W("s6", 1), W("s6", 1) + 4, 1, 0, "out"),
    ],
    badges: [],
    bigWords: [
      { text: "RESULTADO?", at: W("s6", 0), until: W("s6", 1), color: "#ffffff", size: 150, y: 520, tilt: -4 },
      { text: "APROVADO!", at: W("s6", 1), until: end(5), color: G, size: 190, tilt: -6 },
    ],
    highlights: ["RESULTADO", "APROVADO"],
    captions: [{ text: "Resultado? Aprovado!", from: voLocal("s6"), to: end(5) }],
    audioCues: [narration("s6", "ready"), sfx("whoosh", 0, 0.2), sfx("tick", W("s6", 0) + 8, 0.2), sfx("tick", W("s6", 0) + 16, 0.2), sfx("stamp", W("s6", 1), 0.4), sfx("airhorn", W("s6", 1), 0.26)],
  },
  // ------------------------------------------------------------------ s7 · recebe + óculos na frente da vizinha
  {
    id: "scene-07-mito",
    startFrame: sc(6).from,
    durationInFrames: sc(6).durationInFrames,
    voKey: "s7",
    narration: "Agora a dona Maria recebe um salário mínimo todo mês, e ainda passou de óculos escuros na frente da vizinha.",
    camera: { projection: "perspective", movement: "orbit", keys: [key(0, P.pipes), key(W("s7", 8), P.pipes), key(W("s7", 9) + 4, P.piggy, "soft"), key(W("s7", 10) - 2, P.piggy), key(W("s7", 10) + 4, P.passBy, "out"), key(end(6), P.passBy)] },
    objects: [...SYSTEM(), DOC, o("piggy", "cofrinho"), o("accidentPipe", "cano-dourado-do-bpc")],
    animations: [
      ...whip(0),
      lerp("confetti", 0, 10, 1, 0, "in"),
      lerp("liaBig.pop", 0, 1, 0, 0),
      lerp("pipeAccident.grow", 0, 1, 0, 0),
      lerp("pipeAccident.grow", 4, 26, 0, 1, "out"),
      lerp("pipeAccident.glow", 6, 18, 0, 1, "out"),
      lerp("coins.accident.flow", 22, 32, 0, 1, "linear"),
      lerp("piggy.level", 0, 1, 0.15, 0.15),
      lerp("piggy.level", 26, W("s7", 10), 0.15, 0.8, "linear"),
      lerp("coinRain", W("s7", 8), W("s7", 8) + 10, 0, 1, "out"),
      lerp("coinRain", W("s7", 10), W("s7", 10) + 6, 1, 0, "in"),
      ...whip(W("s7", 10)),
      lerp("dona.shades", W("s7", 10) + 2, W("s7", 10) + 12, 0, 1, "in"),
      lerp("dona.ry", W("s7", 11), W("s7", 11) + 6, 0, -Math.PI / 2, "out", "rad"),
      lerp("dona.dx", W("s7", 11), W("s7", 19), DX, DX - 1.9, "linear"),
      lerp("dona.dz", W("s7", 11), W("s7", 11) + 10, DZ, DZ + 0.55, "out"),
      lerp("vizinha.ry", W("s7", 15), W("s7", 15) + 8, 0, -0.9, "inOut", "rad"),
      spring("vizinha.shock", W("s7", 16), W("s7", 16) + 18, 0, 1, 7),
      lerp("vizinha.shock", W("s7", 19), end(6), 1, 0.4, "inOut"),
      lerp("vizinha.sad", W("s7", 18), W("s7", 18) + 8, 0, 1, "inOut"),
      lerp("plazaCoins", W("s7", 12), W("s7", 12) + 10, 0, 1, "out"),
    ],
    badges: [{ text: "TODO MÊS", variant: "positive", appearAt: W("s7", 8), disappearAt: W("s7", 10) - 2 }],
    bigWords: [
      { text: "1 SALÁRIO MÍNIMO", at: W("s7", 5), until: W("s7", 10) - 2, color: GOLD, size: 120, y: 520, tilt: -4 },
      { text: "MITO!", at: W("s7", 14), until: end(6), color: GOLD, size: 210, y: 290, tilt: -6 },
    ],
    highlights: ["MARIA", "RECEBE", "SALÁRIO", "MÍNIMO", "MÊS", "ÓCULOS", "ESCUROS", "VIZINHA"],
    captions: [
      { text: "Agora a dona Maria recebe um salário mínimo todo mês,", from: voLocal("s7"), to: W("s7", 10) },
      { text: "e ainda passou de óculos escuros na frente da vizinha.", from: W("s7", 10), to: end(6) },
    ],
    audioCues: [narration("s7", "ready"), sfx("whoosh", 0, 0.22), sfx("coin", 24, 0.22), sfx("ding", W("s7", 5), 0.22), sfx("coin", W("s7", 8) + 2, 0.22), sfx("whoosh", W("s7", 10), 0.22), sfx("ding", W("s7", 10) + 12, 0.24), sfx("airhorn", W("s7", 14), 0.2), sfx("boing", W("s7", 16), 0.22)],
  },
  // ------------------------------------------------------------------ s8 · a regra
  {
    id: "scene-08-regra",
    startFrame: sc(7).from,
    durationInFrames: sc(7).durationInFrames,
    voKey: "s8",
    narration: "A regra é: 65 anos ou mais, ou pessoa com deficiência, Cadastro Único em dia e, em regra, renda de até um quarto do salário mínimo por pessoa.",
    camera: { projection: "perspective", movement: "orbit", keys: [key(0, P.rules), key(W("s8", 16), P.rules), key(W("s8", 17), P.coin, "out"), key(end(7), P.coin)] },
    objects: [...SYSTEM(), DOC, o("piggy", "cofrinho"), o("cadStage", "cartao-cadastro-unico"), o("quarterCoin", "moeda-1/4")],
    animations: [
      ...whip(0),
      lerp("plazaCoins", 0, 8, 1, 0, "in"),
      lerp("dona.dx", 0, 1, DX, DX),
      lerp("dona.dz", 0, 1, DZ, DZ),
      lerp("dona.ry", 0, 1, 0, 0, "linear", "rad"),
      lerp("vizinha.shock", 0, 6, 0.4, 0, "inOut"),
      spring("dona.ok", W("s8", 3), W("s8", 3) + 18, 0, 1, 7),
      lerp("dona.ok", W("s8", 10) - 6, W("s8", 10), 1, 0, "in"),
      spring("cadStage.pop", W("s8", 10), W("s8", 10) + 20, 0, 1, 8),
      lerp("cadStage.pop", W("s8", 16), W("s8", 16) + 6, 1, 0, "in"),
      ...whip(W("s8", 17) - 2),
      spring("quarter.pop", W("s8", 17), W("s8", 17) + 22, 0, 1, 9),
      lerp("quarter.spin", W("s8", 17), W("s8", 21), 0, 360, "out", "deg"),
      lerp("quarter.slice", W("s8", 21), W("s8", 21) + 14, 0, 1, "out"),
      ...punch(W("s8", 21), 0.6),
    ],
    badges: [
      { text: "65 ANOS OU MAIS", variant: "positive", appearAt: W("s8", 3), disappearAt: W("s8", 6) },
      { text: "OU PESSOA COM DEFICIÊNCIA", variant: "positive", subtitle: "de qualquer idade", appearAt: W("s8", 6), disappearAt: W("s8", 10) },
      { text: "CADASTRO ÚNICO EM DIA", variant: "info", appearAt: W("s8", 10), disappearAt: W("s8", 15) },
      { text: "EM REGRA", variant: "warning", appearAt: W("s8", 15), disappearAt: W("s8", 17) },
      { text: "RENDA POR PESSOA", variant: "info", subtitle: "até 1/4 do salário mínimo", appearAt: W("s8", 17), disappearAt: end(7) },
    ],
    bigWords: [
      { text: "65+", at: W("s8", 3), until: W("s8", 6), color: GOLD, size: 230, y: 500, tilt: -5 },
      { text: "1/4", at: W("s8", 21), until: end(7), color: GOLD, size: 240, y: 500, tilt: -5 },
    ],
    highlights: ["REGRA", "65", "ANOS", "DEFICIÊNCIA", "CADASTRO", "ÚNICO", "RENDA", "QUARTO", "PESSOA"],
    captions: [
      { text: "A regra é: 65 anos ou mais, ou pessoa com deficiência,", from: voLocal("s8"), to: W("s8", 10) },
      { text: "Cadastro Único em dia e, em regra,", from: W("s8", 10), to: W("s8", 17) },
      { text: "renda de até um quarto do salário mínimo por pessoa.", from: W("s8", 17), to: end(7) },
    ],
    audioCues: [narration("s8", "ready"), sfx("whoosh", 0, 0.22), sfx("ding", W("s8", 3), 0.22), sfx("badge", W("s8", 6), 0.2), sfx("pop", W("s8", 10), 0.22), sfx("badge", W("s8", 15), 0.2), sfx("whoosh", W("s8", 17) - 2, 0.22), sfx("coin", W("s8", 19), 0.22), sfx("crack", W("s8", 21), 0.2)],
  },
  // ------------------------------------------------------------------ s9 · CTA
  {
    id: "scene-09-final",
    startFrame: sc(8).from,
    durationInFrames: sc(8).durationInFrames,
    voKey: "s9",
    narration: "Conhece alguma dona Maria? Manda esse vídeo pra ela!",
    camera: { projection: "perspective", movement: "dolly-out", keys: [key(0, P.plazaTight), key(W("s9", 4), P.plazaTight), key(W("s9", 8) + 24, P.final, "inOut"), key(end(8), P.final)] },
    objects: [...SYSTEM(), DOC],
    animations: [
      ...whip(0),
      lerp("quarter.pop", 0, 6, 1, 0, "in"),
      lerp("dona.wave", W("s9", 1), W("s9", 1) + 8, 0, 1, "out"),
      lerp("dona.dance", W("s9", 4), W("s9", 4) + 6, 0, 1, "out"),
      lerp("plazaCoins", 2, 12, 0, 1, "out"),
      spring("share", W("s9", 4), W("s9", 4) + 24, 0, 1, 8),
      lerp("share", end(8) - 58, end(8) - 50, 1, 0, "in"),
      lerp("plazaCoins", end(8) - 60, end(8) - 40, 1, 0, "in"),
      spring("endcard", end(8) - 52, end(8) - 22, 0, 1, 10),
    ],
    badges: [{ text: "MANDA PRA SUA DONA MARIA", variant: "positive", appearAt: W("s9", 4), disappearAt: end(8) - 54 }],
    labels: [{ text: "DONA MARIA", point: DONA_HEAD, at: W("s9", 2), until: W("s9", 4), off: [0, -120], accent: GOLD }],
    highlights: ["MARIA", "MANDA", "VÍDEO"],
    captions: [{ text: "Conhece alguma dona Maria? Manda esse vídeo pra ela!", from: voLocal("s9"), to: end(8) - 52 }],
    audioCues: [narration("s9", "ready"), sfx("whoosh-big", 0, 0.22), sfx("pop", W("s9", 2), 0.2), sfx("pop", W("s9", 4), 0.24), sfx("ding", W("s9", 4) + 4, 0.22), sfx("final", end(8) - 52, 0.3)],
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
