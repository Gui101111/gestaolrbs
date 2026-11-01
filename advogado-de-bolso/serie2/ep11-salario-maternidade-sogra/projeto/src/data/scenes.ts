import { evaluateTrack, orbit, type EaseName, type TrackAnimation, type Vec3 } from "../utils/animation";
import { EP4, STAGE } from "../layout";
import { DURATION, FPS, HEIGHT, SCENE_FRAMES, voLocal, WIDTH, wordLocal, type VoKey } from "../utils/timing";

// EP11 · Série 2 (comédia "mito") · Salário-maternidade: Ana (MEI) x sogra.
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

/** Cenário fixo: ilha, INSS, a Ana e a sogra. */
const SYSTEM = (): SceneObject[] => [o("island", "diorama-ilha"), o("inss", "predio-inss"), o("warehouse", "galpao"), o("mae", "ana-manicure-mei"), o("sogra", "sogra")];
const DOC = o("doc", "documento-gigante-do-inss");
const LIA = o("liaBig", "advogada-de-bolso");
const PLAZA: Vec3 = [0.45, 0, -1.35];
const DX = PLAZA[0] - EP4.ana[0];
const DZ = PLAZA[2] - EP4.ana[2];
const SOGRA_HEAD: Vec3 = [-0.4, 1.85, -1.05];
const ANA_HEAD: Vec3 = [PLAZA[0], 1.95, PLAZA[2]];
const GREEN = "#7bd389";

const P = {
  sogra: orbit([-0.4, 1.35, -1.05], 5.8, -4, 3),
  sograPush: orbit([-0.4, 1.4, -1.05], 4.8, -4, 2),
  ana: orbit([PLAZA[0], 1.4, PLAZA[2]], 5.8, -25, 4),
  home: orbit([-2.3, 1.05, -1.5], 7.0, 15, 8),
  homeWide: orbit([-2.15, 1.0, -1.35], 9.5, 18, 10),
  walkA: orbit([-2.3, 1.0, -1.6], 10, 0, 6),
  walkB: orbit([0.2, 1.0, -1.45], 10, 0, 6),
  doc: orbit([STAGE.doc[0], 1.2, STAGE.doc[2]], 5.6, 17, 3),
  docPush: orbit([STAGE.doc[0], 1.15, STAGE.doc[2]], 4.4, 17, 2),
  plazaTight: orbit([0.05, 1.0, -1.2], 12.5, -6, 6),
  gavel: orbit([2.45, 0.85, -1.9], 15, 4, 8),
  lia: orbit([0.85, 0.95, -1.3], 6.2, 6, 4),
  group: orbit([0.3, 1.0, -1.2], 17, -25, 7),
  final: orbit([0.2, 1.4, -1.3], 30, 10, 18),
};

export const scenes: ScenePlan[] = [
  // ------------------------------------------------------------------ s1 · gancho
  {
    id: "scene-01-gancho",
    startFrame: sc(0).from,
    durationInFrames: sc(0).durationInFrames,
    voKey: "s1",
    narration: "A sogra jurou que a Ana não ia receber nada do INSS quando o bebê nascesse. Ela se enganou feio!",
    camera: { projection: "perspective", movement: "tracking", keys: [key(0, P.sograPush), key(W("s1", 5) - 4, P.sogra, "soft"), key(W("s1", 5) + 2, P.plazaTight, "out"), key(end(0), P.plazaTight)] },
    objects: [...SYSTEM(), DOC],
    animations: [
      lerp("mae.pop", 0, 1, 1, 1),
      lerp("mae.dx", 0, 1, DX, DX),
      lerp("mae.dz", 0, 1, DZ, DZ),
      lerp("mae.belly", 0, 1, 1, 1),
      lerp("mae.baby", 0, 1, 0, 0),
      lerp("doc.pop", 0, 1, 1, 1),
      lerp("doc.deny", 0, 1, 1, 1),
      lerp("doc.ok", 0, 1, 0, 0),
      lerp("sogra.laugh", 0, 4, 0, 1, "out"),
      ...punch(2, 0.8),
      lerp("mae.sad", W("s1", 5), W("s1", 5) + 8, 0, 1, "out"),
      // flash do final
      ...whip(W("s1", 16)),
      ...flash(W("s1", 16) + 2, 0.5),
      lerp("sogra.laugh", W("s1", 16) + 2, W("s1", 16) + 4, 1, 0, "linear"),
      spring("sogra.shock", W("s1", 16) + 4, W("s1", 16) + 24, 0, 1, 7),
      lerp("mae.sad", W("s1", 16) + 2, W("s1", 16) + 4, 1, 0, "linear"),
      lerp("mae.belly", W("s1", 16) + 2, W("s1", 16) + 4, 1, 0, "linear"),
      lerp("mae.baby", W("s1", 16) + 2, W("s1", 16) + 4, 0, 1, "linear"),
      lerp("doc.deny", W("s1", 16) + 2, W("s1", 16) + 4, 1, 0, "linear"),
      lerp("doc.ok", W("s1", 16) + 2, W("s1", 16) + 4, 0, 1, "linear"),
      lerp("mae.shades", W("s1", 16) + 4, W("s1", 16) + 14, 0, 1, "in"),
      lerp("mae.hop", W("s1", 16) + 14, W("s1", 16) + 18, 0, 1, "out"),
      lerp("plazaCoins", W("s1", 16) + 4, W("s1", 16) + 10, 0, 1, "out"),
      lerp("confetti", W("s1", 16) + 4, W("s1", 16) + 10, 0, 1, "out"),
      lerp("rewind", end(0) - 10, end(0), 0, 1, "in"),
    ],
    badges: [],
    bigWords: [
      { text: "A SOGRA JUROU", at: 2, until: W("s1", 5), color: "#ffffff", size: 120, y: 1000, tilt: 4 },
      { text: "NADA!", at: W("s1", 9), until: W("s1", 16) - 2, color: R, size: 200, y: 480, tilt: -6 },
      { text: "SE ENGANOU", at: W("s1", 16), until: end(0), color: "#ffffff", size: 140, y: 960, tilt: -5 },
      { text: "FEIO!", at: W("s1", 19), until: end(0), color: GOLD, size: 170, y: 1120, tilt: -5 },
    ],
    labels: [
      { text: "SOGRA", point: SOGRA_HEAD, at: 6, until: W("s1", 5), off: [0, -130], accent: GREEN },
      { text: "ANA", point: ANA_HEAD, at: W("s1", 5) + 4, until: W("s1", 9), off: [20, -120], accent: "#ff7aa8" },
    ],
    highlights: ["SOGRA", "JUROU", "ANA", "NADA", "INSS", "BEBÊ", "ENGANOU", "FEIO"],
    captions: [{ text: "A sogra jurou que a Ana não ia receber nada do INSS quando o bebê nascesse. Ela se enganou feio!", from: voLocal("s1"), to: end(0) }],
    audioCues: [
      narration("s1", "ready"),
      sfx("boing", 2, 0.3),
      sfx("whoosh", W("s1", 5) - 2, 0.22),
      sfx("buzz", W("s1", 9), 0.2),
      sfx("scratch", W("s1", 16) - 2, 0.38),
      sfx("airhorn", W("s1", 16) + 6, 0.2),
      sfx("coin", W("s1", 16) + 8, 0.2),
      sfx("rewind", end(0) - 10, 0.3),
    ],
  },
  // ------------------------------------------------------------------ s2 · a Ana, manicure MEI
  {
    id: "scene-02-ana",
    startFrame: sc(1).from,
    durationInFrames: sc(1).durationInFrames,
    voKey: "s2",
    narration: "A Ana é manicure, MEI, e paga o carnê do INSS todo mês.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.homeWide), key(W("s2", 3), P.home, "soft"), key(end(1), P.home)] },
    objects: [...SYSTEM(), o("manicure", "mesa-de-manicure")],
    animations: [
      lerp("rewind", 0, 10, 1, 0, "out"),
      ...whip(0),
      lerp("mae.dx", 0, 1, 0, 0),
      lerp("mae.dz", 0, 1, 0, 0),
      lerp("mae.shades", 0, 1, 0, 0),
      lerp("mae.hop", 0, 1, 0, 0),
      lerp("mae.baby", 0, 1, 0, 0),
      lerp("mae.belly", 0, 1, 0, 0),
      lerp("sogra.shock", 0, 1, 0, 0),
      lerp("plazaCoins", 0, 1, 0, 0),
      lerp("confetti", 0, 1, 0, 0),
      lerp("mae.wave", W("s2", 1), W("s2", 1) + 8, 0, 1, "out"),
      lerp("mae.wave", W("s2", 5), W("s2", 5) + 8, 1, 0, "inOut"),
      spring("manicure.pop", W("s2", 3) - 4, W("s2", 3) + 18, 0, 1, 9),
      spring("mae.ok", W("s2", 6), W("s2", 6) + 18, 0, 1, 7),
    ],
    badges: [{ text: "PAGA O INSS TODO MÊS", variant: "positive", appearAt: W("s2", 6), disappearAt: end(1) }],
    bigWords: [{ text: "MEI", at: W("s2", 4), until: W("s2", 6), color: GOLD, size: 220, y: 1000, tilt: -5 }],
    labels: [{ text: "ANA · MANICURE", point: [EP4.ana[0], 1.95, EP4.ana[2]], at: W("s2", 1), until: W("s2", 4), off: [0, -120], accent: "#ff7aa8" }],
    highlights: ["ANA", "MANICURE", "MEI", "PAGA", "CARNÊ", "INSS", "MÊS"],
    captions: [{ text: "A Ana é manicure, MEI, e paga o carnê do INSS todo mês.", from: voLocal("s2"), to: end(1) }],
    audioCues: [narration("s2", "ready"), sfx("whoosh", 0, 0.24), sfx("pop", W("s2", 1), 0.2), sfx("pop", W("s2", 3), 0.2), sfx("ding", W("s2", 4), 0.22), sfx("badge", W("s2", 6), 0.2)],
  },
  // ------------------------------------------------------------------ s3 · grávida, foi pedir
  {
    id: "scene-03-pedido",
    startFrame: sc(2).from,
    durationInFrames: sc(2).durationInFrames,
    voKey: "s3",
    narration: "Grávida, ela descobriu que tinha direito ao salário-maternidade e foi pedir. E aí...",
    camera: { projection: "perspective", movement: "tracking", keys: [key(0, P.home), key(W("s3", 7) + 8, P.home), key(W("s3", 7) + 14, P.walkA, "soft"), key(W("s3", 11), P.walkB, "inOut"), key(W("s3", 11) + 10, P.doc, "soft"), key(end(2), P.docPush, "inOut")] },
    objects: [...SYSTEM(), o("manicure", "mesa-de-manicure"), DOC],
    animations: [
      lerp("mae.ok", 0, 6, 1, 0, "in"),
      spring("mae.belly", 2, 22, 0, 1, 7),
      lerp("mae.hop", 4, 8, 0, 1, "out"),
      lerp("mae.hop", 20, 24, 1, 0, "in"),
      lerp("manicure.pop", W("s3", 7) + 8, W("s3", 7) + 14, 1, 0, "in"),
      lerp("mae.ry", W("s3", 7) + 8, W("s3", 7) + 14, 0, Math.PI / 2, "out", "rad"),
      lerp("mae.dx", W("s3", 7) + 12, W("s3", 11), 0, DX, "inOut"),
      lerp("mae.dz", W("s3", 7) + 12, W("s3", 11), 0, DZ, "inOut"),
      lerp("mae.ry", W("s3", 11) - 4, W("s3", 11) + 4, Math.PI / 2, 0, "inOut", "rad"),
      lerp("doc.pop", 0, 1, 0, 0),
      lerp("doc.deny", 0, 1, 0, 0),
      lerp("doc.ok", 0, 1, 0, 0),
      spring("doc.pop", W("s3", 10), W("s3", 10) + 22, 0, 1, 9),
    ],
    badges: [{ text: "SALÁRIO-MATERNIDADE", variant: "positive", appearAt: W("s3", 5), disappearAt: W("s3", 11) - 2 }],
    bigWords: [{ text: "GRÁVIDA!", at: 4, until: W("s3", 2), color: "#ff7aa8", size: 180, y: 1000, tilt: -5 }],
    highlights: ["GRÁVIDA", "DESCOBRIU", "DIREITO", "SALÁRIO-MATERNIDADE", "PEDIR"],
    captions: [
      { text: "Grávida, ela descobriu que tinha direito ao salário-maternidade e foi pedir.", from: voLocal("s3"), to: W("s3", 11) },
      { text: "E aí...", from: W("s3", 11), to: end(2) },
    ],
    audioCues: [narration("s3", "ready"), sfx("boing", 4, 0.26), sfx("ding", W("s3", 5), 0.22), sfx("whoosh-soft", W("s3", 7) + 12, 0.2), sfx("pop-high", W("s3", 10), 0.18), sfx("drumroll", end(2) - 40, 0.32)],
  },
  // ------------------------------------------------------------------ s4 · NEGADO + "eu avisei"
  {
    id: "scene-04-negado",
    startFrame: sc(3).from,
    durationInFrames: sc(3).durationInFrames,
    voKey: "s4",
    narration: "Negado! E a sogra, claro: eu avisei!",
    camera: { projection: "perspective", movement: "tracking", keys: [key(0, P.docPush), key(W("s4", 1) - 4, P.doc, "soft"), key(W("s4", 1) + 2, P.sogra, "out"), key(end(3), P.sograPush, "linear")] },
    objects: [...SYSTEM(), DOC],
    animations: [
      spring("doc.deny", 6, 30, 0, 1, 8),
      ...flash(6, 0.8),
      lerp("camera.shake", 6, 9, 0, 1, "out"),
      lerp("camera.shake", 9, 22, 1, 0, "in"),
      lerp("vignette.red", 6, 12, 0, 0.6, "out"),
      lerp("vignette.red", W("s4", 1), W("s4", 1) + 10, 0.6, 0, "inOut"),
      spring("mae.shock", 6, 20, 0, 1, 8),
      lerp("mae.shock", 20, 28, 1, 0, "inOut"),
      lerp("mae.sad", 20, 28, 0, 1, "inOut"),
      ...whip(W("s4", 1)),
      lerp("sogra.wave", W("s4", 4), W("s4", 4) + 8, 0, 1, "out"),
      lerp("sogra.laugh", W("s4", 5), W("s4", 5) + 6, 0, 1, "out"),
      ...punch(W("s4", 6), 0.8),
    ],
    badges: [],
    bigWords: [
      { text: "NEGADO!", at: 6, until: W("s4", 1), color: R, size: 200, tilt: -7 },
      { text: "EU AVISEI!", at: W("s4", 5), until: end(3), color: Y, size: 170, y: 1000, tilt: 5 },
    ],
    highlights: ["NEGADO", "SOGRA", "AVISEI"],
    captions: [{ text: "Negado! E a sogra, claro: eu avisei!", from: voLocal("s4"), to: end(3) }],
    audioCues: [narration("s4", "ready"), sfx("stamp", 6, 0.46), sfx("boo", 6, 0.22), sfx("whoosh", W("s4", 1), 0.22), sfx("boing", W("s4", 6), 0.22)],
  },
  // ------------------------------------------------------------------ s5 · STF 2024: sem carência → recurso
  {
    id: "scene-05-stf",
    startFrame: sc(4).from,
    durationInFrames: sc(4).durationInFrames,
    voKey: "s5",
    narration: "Só que, desde 2024, o STF decidiu que não precisa mais de carência. E a advogada de bolso entrou com recurso.",
    camera: { projection: "perspective", movement: "orbit", keys: [key(0, P.sograPush), key(W("s5", 2), P.gavel, "out"), key(W("s5", 13) - 4, P.gavel), key(W("s5", 13) + 4, P.lia, "out"), key(end(4), P.lia)] },
    objects: [...SYSTEM(), DOC, o("stageGavel", "martelo-do-stf"), LIA, o("liaFolder", "pasta-do-recurso")],
    animations: [
      lerp("sogra.laugh", 0, 8, 1, 0, "inOut"),
      ...whip(W("s5", 1)),
      spring("gavel.pop", W("s5", 2), W("s5", 2) + 22, 0, 1, 8),
      lerp("gavel.hit", 0, 1, 0, 0),
      lerp("gavel.hit", W("s5", 6) - 6, W("s5", 6), 0, 1.1, "in"),
      lerp("gavel.hit", W("s5", 6), W("s5", 6) + 8, 1.1, 1, "out"),
      ...flash(W("s5", 6), 0.5),
      lerp("camera.shake", W("s5", 6), W("s5", 6) + 3, 0, 0.7, "out"),
      lerp("camera.shake", W("s5", 6) + 3, W("s5", 6) + 12, 0.7, 0, "in"),
      lerp("gavel.pop", W("s5", 13) - 6, W("s5", 13), 1, 0, "in"),
      ...whip(W("s5", 13)),
      spring("liaBig.pop", W("s5", 15) - 4, W("s5", 15) + 20, 0, 1, 8),
      lerp("liaBig.wave", W("s5", 15) + 4, W("s5", 15) + 10, 0, 1, "out"),
      lerp("liaBig.wave", W("s5", 18), W("s5", 18) + 6, 1, 0, "in"),
      lerp("liaBig.point", W("s5", 18), W("s5", 18) + 8, 0, 1, "out"),
      spring("liaFolder.pop", W("s5", 18), W("s5", 18) + 20, 0, 1, 8),
      lerp("mae.sad", W("s5", 15), W("s5", 15) + 8, 1, 0, "inOut"),
      ...punch(W("s5", 20), 0.8),
    ],
    badges: [
      { text: "STF · DECISÃO DE 2024", variant: "info", appearAt: W("s5", 3), disappearAt: W("s5", 8) },
      { text: "SEM AS 10 CONTRIBUIÇÕES", variant: "positive", subtitle: "pra MEI, autônoma e facultativa", appearAt: W("s5", 8), disappearAt: W("s5", 13) },
    ],
    bigWords: [
      { text: "SEM CARÊNCIA!", at: W("s5", 12), until: W("s5", 13) + 4, color: G, size: 140, y: 480, tilt: -4 },
      { text: "RECURSO!", at: W("s5", 20), until: end(4), color: GOLD, size: 180, y: 480, tilt: -5 },
    ],
    labels: [{ text: "ADVOGADA DE BOLSO", point: [1.2, 1.6, -1.25], at: W("s5", 15), until: W("s5", 18), off: [0, -130], accent: GOLD }],
    highlights: ["2024", "STF", "DECIDIU", "CARÊNCIA", "ADVOGADA", "BOLSO", "RECURSO"],
    captions: [
      { text: "Só que, desde 2024, o STF decidiu que não precisa mais de carência.", from: voLocal("s5"), to: W("s5", 13) },
      { text: "E a advogada de bolso entrou com recurso.", from: W("s5", 13), to: end(4) },
    ],
    audioCues: [narration("s5", "ready"), sfx("whoosh-big", W("s5", 1), 0.24), sfx("pop", W("s5", 2) + 2, 0.22), sfx("badge", W("s5", 3), 0.2), sfx("gavel", W("s5", 6), 0.42), sfx("ding", W("s5", 12), 0.24), sfx("whoosh", W("s5", 13), 0.22), sfx("pop-high", W("s5", 15) - 2, 0.24), sfx("pop", W("s5", 18), 0.22), sfx("badge", W("s5", 20), 0.24)],
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
  // ------------------------------------------------------------------ s7 · 120 dias + a sogra que "sempre apoiou"
  {
    id: "scene-07-mito",
    startFrame: sc(6).from,
    durationInFrames: sc(6).durationInFrames,
    voKey: "s7",
    narration: "Agora a Ana recebe um salário mínimo por 120 dias. E a sogra? Jura que sempre apoiou.",
    camera: { projection: "perspective", movement: "tracking", keys: [key(0, P.ana), key(W("s7", 9) - 4, P.ana), key(W("s7", 9) + 4, P.sogra, "out"), key(end(6), P.sograPush, "linear")] },
    objects: [...SYSTEM(), DOC],
    animations: [
      ...whip(0),
      lerp("confetti", 0, 10, 1, 0, "in"),
      lerp("liaBig.pop", 0, 1, 0, 0),
      lerp("mae.sad", 0, 1, 0, 0),
      lerp("mae.belly", 0, 1, 0, 0),
      lerp("mae.baby", 0, 1, 1, 1),
      lerp("mae.shades", 4, 14, 0, 1, "in"),
      lerp("mae.hop", 16, 20, 0, 1, "out"),
      lerp("plazaCoins", 6, 16, 0, 1, "out"),
      ...punch(W("s7", 8), 0.7),
      spring("sogra.shock", W("s7", 9) + 2, W("s7", 9) + 18, 0, 1, 7),
      lerp("sogra.shock", W("s7", 12) - 6, W("s7", 12), 1, 0, "inOut"),
      lerp("sogra.wave", W("s7", 12), W("s7", 12) + 8, 0, 1, "out"),
      lerp("sogra.hop", W("s7", 12), W("s7", 12) + 4, 0, 1, "out"),
    ],
    badges: [{ text: "1 SALÁRIO MÍNIMO", variant: "positive", subtitle: "contribui pelo mínimo, como MEI", appearAt: W("s7", 4), disappearAt: W("s7", 9) - 2 }],
    bigWords: [
      { text: "120 DIAS", at: W("s7", 8), until: W("s7", 9) + 2, color: GOLD, size: 200, y: 460, tilt: -5 },
      { text: "SEI...", at: W("s7", 15) + 2, until: end(6), color: "#ffffff", size: 190, y: 1000, tilt: 6 },
    ],
    labels: [{ text: "EU SEMPRE APOIEI, VIU?", point: SOGRA_HEAD, at: W("s7", 12), until: end(6), off: [40, -140], accent: GREEN }],
    highlights: ["ANA", "RECEBE", "SALÁRIO", "MÍNIMO", "120", "DIAS", "SOGRA", "APOIOU"],
    captions: [
      { text: "Agora a Ana recebe um salário mínimo por 120 dias.", from: voLocal("s7"), to: W("s7", 9) },
      { text: "E a sogra? Jura que sempre apoiou.", from: W("s7", 9), to: end(6) },
    ],
    audioCues: [narration("s7", "ready"), sfx("whoosh", 0, 0.22), sfx("ding", 14, 0.24), sfx("coin", 10, 0.2), sfx("badge", W("s7", 4), 0.2), sfx("ding", W("s7", 8), 0.22), sfx("whoosh", W("s7", 9), 0.22), sfx("boing", W("s7", 9) + 4, 0.22), sfx("scratch", W("s7", 15), 0.3)],
  },
  // ------------------------------------------------------------------ s8 · quem tem direito
  {
    id: "scene-08-quem",
    startFrame: sc(7).from,
    durationInFrames: sc(7).durationInFrames,
    voKey: "s8",
    narration: "Tem direito quem é segurada do INSS: de carteira assinada, MEI, autônoma, desempregada que ainda é segurada, e até em caso de adoção.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.group), key(end(7), P.group)] },
    objects: [o("island", "diorama-ilha"), o("inss", "predio-inss"), o("warehouse", "galpao"), o("p1", "carteira"), o("p2", "mei"), o("p3", "autonoma"), o("p4", "desempregada"), o("mae", "ana-com-bebe")],
    animations: [
      ...whip(0),
      lerp("plazaCoins", 0, 8, 1, 0, "in"),
      lerp("mae.dx", 0, 1, DX + 1.05, DX + 1.05),
      lerp("mae.dz", 0, 1, DZ + 0.15, DZ + 0.15),
      lerp("mae.pop", 0, 1, 0, 0),
      lerp("p1.pop", 0, 1, 0, 0),
      lerp("p2.pop", 0, 1, 0, 0),
      lerp("p3.pop", 0, 1, 0, 0),
      lerp("p4.pop", 0, 1, 0, 0),
      spring("p1.pop", W("s8", 7), W("s8", 7) + 20, 0, 1, 8),
      spring("p1.ok", W("s8", 8), W("s8", 8) + 18, 0, 1, 7),
      spring("p2.pop", W("s8", 10) - 2, W("s8", 10) + 18, 0, 1, 8),
      spring("p2.ok", W("s8", 10), W("s8", 10) + 18, 0, 1, 7),
      spring("p3.pop", W("s8", 11) - 2, W("s8", 11) + 18, 0, 1, 8),
      spring("p3.ok", W("s8", 11), W("s8", 11) + 18, 0, 1, 7),
      spring("p4.pop", W("s8", 12) - 2, W("s8", 12) + 18, 0, 1, 8),
      spring("p4.ok", W("s8", 16), W("s8", 16) + 18, 0, 1, 7),
      spring("mae.pop", W("s8", 19) - 2, W("s8", 19) + 18, 0, 1, 8),
      spring("mae.ok", W("s8", 21), W("s8", 21) + 18, 0, 1, 7),
      lerp("p1.wave", W("s8", 21), W("s8", 21) + 8, 0, 1, "out"),
      lerp("p3.wave", W("s8", 21), W("s8", 21) + 8, 0, 1, "out"),
    ],
    badges: [
      { text: "SEGURADA DO INSS", variant: "info", appearAt: W("s8", 2), disappearAt: W("s8", 7) },
      { text: "CARTEIRA ASSINADA", variant: "positive", appearAt: W("s8", 7), disappearAt: W("s8", 10) },
      { text: "MEI", variant: "positive", appearAt: W("s8", 10), disappearAt: W("s8", 11) },
      { text: "AUTÔNOMA", variant: "positive", appearAt: W("s8", 11), disappearAt: W("s8", 12) },
      { text: "DESEMPREGADA AINDA SEGURADA", variant: "positive", appearAt: W("s8", 12), disappearAt: W("s8", 17) },
      { text: "ADOÇÃO TAMBÉM", variant: "positive", subtitle: "inclusive o pai que adota", appearAt: W("s8", 17), disappearAt: end(7) },
    ],
    bigWords: [{ text: "QUEM TEM DIREITO?", at: W("s8", 0), until: W("s8", 7) - 2, color: GOLD, size: 110, y: 480, tilt: -4 }],
    highlights: ["DIREITO", "SEGURADA", "INSS", "CARTEIRA", "ASSINADA", "MEI", "AUTÔNOMA", "DESEMPREGADA", "ADOÇÃO"],
    captions: [
      { text: "Tem direito quem é segurada do INSS:", from: voLocal("s8"), to: W("s8", 7) },
      { text: "de carteira assinada, MEI, autônoma,", from: W("s8", 7), to: W("s8", 12) },
      { text: "desempregada que ainda é segurada, e até em caso de adoção.", from: W("s8", 12), to: end(7) },
    ],
    audioCues: [narration("s8", "ready"), sfx("whoosh", 0, 0.22), sfx("badge", W("s8", 2), 0.2), sfx("pop", W("s8", 7), 0.22), sfx("pop", W("s8", 10), 0.22), sfx("pop", W("s8", 11), 0.22), sfx("pop", W("s8", 12), 0.22), sfx("ding", W("s8", 16), 0.2), sfx("pop-high", W("s8", 19), 0.22), sfx("ding", W("s8", 21), 0.22)],
  },
  // ------------------------------------------------------------------ s9 · CTA
  {
    id: "scene-09-final",
    startFrame: sc(8).from,
    durationInFrames: sc(8).durationInFrames,
    voKey: "s9",
    narration: "Conhece alguma grávida? Manda esse vídeo pra ela!",
    camera: { projection: "perspective", movement: "dolly-out", keys: [key(0, P.plazaTight), key(W("s9", 3), P.plazaTight), key(W("s9", 7) + 24, P.final, "inOut"), key(end(8), P.final)] },
    objects: [...SYSTEM(), DOC],
    animations: [
      ...whip(0),
      lerp("mae.dx", 0, 1, DX, DX),
      lerp("mae.dz", 0, 1, DZ, DZ),
      lerp("mae.ok", 0, 1, 0, 0),
      lerp("sogra.hop", 0, 1, 0, 0),
      lerp("sogra.wave", 0, 6, 1, 0, "in"),
      lerp("mae.wave", W("s9", 1), W("s9", 1) + 8, 0, 1, "out"),
      lerp("mae.dance", W("s9", 3), W("s9", 3) + 6, 0, 1, "out"),
      lerp("sogra.dance", W("s9", 3) + 4, W("s9", 3) + 10, 0, 1, "out"),
      lerp("plazaCoins", 2, 12, 0, 1, "out"),
      spring("share", W("s9", 3), W("s9", 3) + 24, 0, 1, 8),
      lerp("share", end(8) - 58, end(8) - 50, 1, 0, "in"),
      lerp("plazaCoins", end(8) - 60, end(8) - 40, 1, 0, "in"),
      spring("endcard", end(8) - 52, end(8) - 22, 0, 1, 10),
    ],
    badges: [{ text: "MANDA PRA UMA GRÁVIDA", variant: "positive", appearAt: W("s9", 3), disappearAt: end(8) - 54 }],
    highlights: ["GRÁVIDA", "MANDA", "VÍDEO"],
    captions: [{ text: "Conhece alguma grávida? Manda esse vídeo pra ela!", from: voLocal("s9"), to: end(8) - 52 }],
    audioCues: [narration("s9", "ready"), sfx("whoosh-big", 0, 0.22), sfx("pop", W("s9", 3), 0.24), sfx("ding", W("s9", 3) + 4, 0.22), sfx("final", end(8) - 52, 0.3)],
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
