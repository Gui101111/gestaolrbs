import { evaluateTrack, orbit, type EaseName, type TrackAnimation, type Vec3 } from "../utils/animation";
import { STAGE } from "../layout";
import { DURATION, FPS, HEIGHT, SCENE_FRAMES, voLocal, WIDTH, wordLocal, type VoKey } from "../utils/timing";

// EP12 · Série 2 (comédia, Halloween) · Salário-maternidade: quatro mentiras.
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

/** Cenário fixo: ilha de Halloween, INSS e a sogra que acredita em tudo. */
const SYSTEM = (): SceneObject[] => [o("island", "diorama-ilha-halloween"), o("inss", "predio-inss"), o("warehouse", "galpao"), o("sogra", "sogra-que-acredita-em-lenda")];
const LENDA = o("lenda", "fantasma-da-mentira");
const SOGRA_HEAD: Vec3 = [-0.4, 1.85, -1.05];
const PURPLE = "#c77dff";

const P = {
  ghostClose: orbit([STAGE.ghosts[0][0], STAGE.ghosts[0][1] + 0.5, STAGE.ghosts[0][2]], 4.2, 8, 4),
  spooky: orbit([0.5, 1.7, -1.4], 16, 16, 22),
  spookyIn: orbit([1.6, 2.2, -3.0], 13, 10, 14),
  sogra: orbit([-0.75, 1.35, -1.25], 8.5, -4, 4),
  sograPush: orbit([-0.8, 1.4, -1.3], 7.2, -4, 3),
  desemp: orbit([0.4, 1.35, -1.3], 5.8, -20, 4),
  pai: orbit([1.05, 1.45, -1.35], 6.2, -20, 4),
  gavel: orbit([2.2, 0.9, -1.75], 15, -4, 8),
  mae: orbit([2.25, 1.35, -1.6], 6.0, -22, 4),
  group: orbit([0.95, 1.0, -1.3], 21, -25, 7),
  final: orbit([0.6, 1.4, -1.3], 32, 10, 18),
};

const busted = (k: VoKey): TrackAnimation[] => [
  spring("lenda.x", 4, 22, 0, 1, 7),
  ...flash(4, 0.6),
  lerp("camera.shake", 4, 7, 0, 0.8, "out"),
  lerp("camera.shake", 7, 16, 0.8, 0, "in"),
  spring("sogra.shock", 5, 18, 0, 1, 8),
  lerp("sogra.shock", 18, 26, 1, 0, "inOut"),
  lerp("lenda.pop", W(k, 1) - 10, W(k, 1) - 2, 1, 0, "in"),
  lerp("lenda.x", W(k, 1) - 10, W(k, 1) - 2, 1, 0, "in"),
  ...whip(W(k, 1) - 2),
  lerp("sogra.wave", W(k, 1) - 4, W(k, 1), 1, 0, "in"),
];
const legend = (): TrackAnimation[] => [...whip(0), lerp("lenda.x", 0, 1, 0, 0), spring("lenda.pop", 2, 24, 0, 1, 9), lerp("sogra.wave", 14, 22, 0, 1, "out")];
const BUST_SFX = (k: VoKey): AudioCue[] => [sfx("buzz", 4, 0.3), sfx("stamp", 4, 0.3), sfx("pop", W(k, 1) - 8, 0.24), sfx("whoosh", W(k, 1) - 2, 0.22)];
const LEGEND_SFX: AudioCue[] = [sfx("whoosh", 0, 0.22), sfx("ghost", 4, 0.22)];
const legendScene = (i: number, k: VoKey, n: string, said: string, narr: string, hl: string[]): ScenePlan => ({
  id: `scene-${String(i + 1).padStart(2, "0")}-mentira-${n}`,
  startFrame: sc(i).from,
  durationInFrames: sc(i).durationInFrames,
  voKey: k,
  narration: narr,
  camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.sogra), key(end(i), P.sograPush, "linear")] },
  objects: [...SYSTEM(), LENDA],
  animations: [...legend(), lerp("ghosts.pop", 0, 8, 1, 0, "in")],
  badges: [],
  bigWords: [{ text: `MENTIRA #${n}`, at: W(k, 0), until: W(k, 3), color: PURPLE, size: 150, y: 500, tilt: -5 }],
  labels: [{ text: said, point: SOGRA_HEAD, at: W(k, 3), until: end(i), off: [-170, -150], accent: Y }],
  highlights: hl,
  captions: [{ text: narr, from: voLocal(k), to: end(i) }],
  audioCues: [narration(k, "ready"), ...LEGEND_SFX, sfx("badge", W(k, 3), 0.2)],
});

export const scenes: ScenePlan[] = [
  // ------------------------------------------------------------------ s1 · gancho
  {
    id: "scene-01-gancho",
    startFrame: sc(0).from,
    durationInFrames: sc(0).durationInFrames,
    voKey: "s1",
    narration: "Quatro mentiras sobre o salário-maternidade que dão mais medo que filme de terror!",
    camera: { projection: "perspective", movement: "dolly-out", keys: [key(0, P.ghostClose), key(W("s1", 3), P.ghostClose), key(W("s1", 5), P.spooky, "out"), key(W("s1", 8), P.spooky), key(end(0), P.spookyIn, "inOut")] },
    objects: [...SYSTEM(), o("ghosts", "fantasmas")],
    animations: [
      lerp("pai.pop", 0, 1, 0, 0),
      lerp("mei.pop", 0, 1, 0, 0),
      lerp("mae.pop", 0, 1, 0, 0),
      lerp("desemp.pop", 0, 1, 0, 0),
      spring("ghosts.pop", 0, 22, 0.3, 1, 8),
      ...flash(0, 0.4),
      lerp("camera.shake", 0, 3, 0, 1, "out"),
      lerp("camera.shake", 3, 14, 1, 0, "in"),
      lerp("sogra.shock", W("s1", 8), W("s1", 8) + 6, 0, 0.6, "out"),
      lerp("sogra.shock", W("s1", 8) + 6, W("s1", 8) + 16, 0.6, 0, "inOut"),
      ...flash(W("s1", 8), 0.6),
      lerp("vignette.red", W("s1", 8), W("s1", 8) + 8, 0, 0.6, "out"),
      lerp("vignette.red", end(0) - 8, end(0), 0.6, 0, "in"),
    ],
    badges: [],
    bigWords: [
      { text: "4 MENTIRAS", at: W("s1", 0), until: W("s1", 8), color: "#ffffff", size: 150, y: 470, tilt: -5 },
      { text: "SALÁRIO-MATERNIDADE", at: W("s1", 4), until: W("s1", 8), color: "#ff8fc1", size: 100, y: 640, tilt: -5 },
      { text: "MAIS MEDO", at: W("s1", 8), until: end(0), color: "#ffffff", size: 150, y: 470, tilt: 4 },
      { text: "QUE TERROR!", at: W("s1", 10), until: end(0), color: R, size: 150, y: 640, tilt: 4 },
    ],
    highlights: ["QUATRO", "MENTIRAS", "SALÁRIO-MATERNIDADE", "MEDO", "TERROR"],
    captions: [{ text: "Quatro mentiras sobre o salário-maternidade que dão mais medo que filme de terror!", from: voLocal("s1"), to: end(0) }],
    audioCues: [narration("s1", "ready"), sfx("thunder", 0, 0.42), sfx("ghost", 2, 0.3), sfx("boo", W("s1", 0), 0.18), sfx("whoosh-big", W("s1", 4), 0.22), sfx("thunder", W("s1", 8) - 1, 0.3), sfx("ghost", W("s1", 9), 0.2)],
  },
  legendScene(1, "s2", "1", "DESEMPREGADA NÃO RECEBE!", "Mentira número um: desempregada não recebe.", ["MENTIRA", "UM", "DESEMPREGADA"]),
  // ------------------------------------------------------------------ s3 · mito 1
  {
    id: "scene-03-mito-1",
    startFrame: sc(2).from,
    durationInFrames: sc(2).durationInFrames,
    voKey: "s3",
    narration: "Mito! Se ainda estiver no período em que continua segurada do INSS, pode ter direito.",
    camera: { projection: "perspective", movement: "tracking", keys: [key(0, P.sograPush), key(W("s3", 1) - 4, P.sogra, "soft"), key(W("s3", 1) + 4, P.desemp, "out"), key(end(2), P.desemp)] },
    objects: [...SYSTEM(), LENDA, o("desemp", "desempregada")],
    animations: [
      ...busted("s3"),
      spring("desemp.pop", W("s3", 1) - 2, W("s3", 1) + 18, 0, 1, 8),
      lerp("desemp.sad", 0, 1, 1, 1),
      lerp("desemp.sad", W("s3", 12), W("s3", 12) + 8, 1, 0, "inOut"),
      spring("desemp.ok", W("s3", 12), W("s3", 12) + 18, 0, 1, 7),
      lerp("desemp.hop", W("s3", 12), W("s3", 12) + 4, 0, 1, "out"),
    ],
    badges: [{ text: "AINDA SEGURADA DO INSS", variant: "info", subtitle: "o chamado período de graça", appearAt: W("s3", 5), disappearAt: W("s3", 12) }],
    bigWords: [
      { text: "MITO!", at: 4, until: W("s3", 1) - 2, color: R, size: 220, tilt: -7 },
      { text: "PODE TER DIREITO", at: W("s3", 12), until: end(2), color: G, size: 120, y: 420, tilt: -4 },
    ],
    labels: [{ text: "DESEMPREGADA", point: [0.4, 1.95, -1.3], at: W("s3", 1) + 4, until: W("s3", 12), off: [150, -30], accent: "#9aa3ad" }],
    highlights: ["MITO", "PERÍODO", "SEGURADA", "INSS", "DIREITO"],
    captions: [{ text: "Mito! Se ainda estiver no período em que continua segurada do INSS, pode ter direito.", from: voLocal("s3"), to: end(2) }],
    audioCues: [narration("s3", "ready"), ...BUST_SFX("s3"), sfx("pop", W("s3", 1) + 2, 0.22), sfx("badge", W("s3", 5), 0.2), sfx("ding", W("s3", 12), 0.24)],
  },
  legendScene(3, "s4", "2", "SÓ A MÃE PODE RECEBER!", "Mentira número dois: só a mãe pode receber.", ["MENTIRA", "DOIS", "MÃE"]),
  // ------------------------------------------------------------------ s5 · mito 2: pai que adota
  {
    id: "scene-05-mito-2",
    startFrame: sc(4).from,
    durationInFrames: sc(4).durationInFrames,
    voKey: "s5",
    narration: "Mito! Na adoção, o pai que adota também pode ter direito.",
    camera: { projection: "perspective", movement: "tracking", keys: [key(0, P.sograPush), key(W("s5", 1) - 4, P.sogra, "soft"), key(W("s5", 1) + 4, P.pai, "out"), key(end(4), P.pai)] },
    objects: [...SYSTEM(), LENDA, o("pai", "pai-que-adota")],
    animations: [
      ...busted("s5"),
      lerp("pai.baby", 0, 1, 1, 1),
      spring("pai.pop", W("s5", 1) - 2, W("s5", 1) + 18, 0, 1, 8),
      spring("pai.ok", W("s5", 8), W("s5", 8) + 18, 0, 1, 7),
      lerp("pai.hop", W("s5", 8), W("s5", 8) + 4, 0, 1, "out"),
    ],
    badges: [{ text: "ADOÇÃO TAMBÉM CONTA", variant: "positive", appearAt: W("s5", 2), disappearAt: end(4) }],
    bigWords: [
      { text: "MITO!", at: 4, until: W("s5", 1) - 2, color: R, size: 220, tilt: -7 },
      { text: "O PAI TAMBÉM!", at: W("s5", 7), until: end(4), color: G, size: 130, y: 420, tilt: -4 },
    ],
    labels: [{ text: "PAI QUE ADOTA", point: [1.05, 2.1, -1.35], at: W("s5", 3), until: W("s5", 7), off: [0, -120], accent: "#3f8efc" }],
    highlights: ["MITO", "ADOÇÃO", "PAI", "ADOTA", "DIREITO"],
    captions: [{ text: "Mito! Na adoção, o pai que adota também pode ter direito.", from: voLocal("s5"), to: end(4) }],
    audioCues: [narration("s5", "ready"), ...BUST_SFX("s5"), sfx("pop", W("s5", 1) + 2, 0.22), sfx("badge", W("s5", 2), 0.2), sfx("ding", W("s5", 8), 0.24)],
  },
  legendScene(5, "s6", "3", "MEI PRECISA DE 10 CONTRIBUIÇÕES!", "Mentira número três: MEI precisa de dez contribuições.", ["MENTIRA", "TRÊS", "MEI", "DEZ", "CONTRIBUIÇÕES"]),
  // ------------------------------------------------------------------ s7 · mito 3: STF derrubou a carência
  {
    id: "scene-07-mito-3",
    startFrame: sc(6).from,
    durationInFrames: sc(6).durationInFrames,
    voKey: "s7",
    narration: "Mito! Desde 2024, o STF derrubou essa carência.",
    camera: { projection: "perspective", movement: "tracking", keys: [key(0, P.sograPush), key(W("s7", 1) - 4, P.sogra, "soft"), key(W("s7", 1) + 4, P.gavel, "out"), key(end(6), P.gavel)] },
    objects: [...SYSTEM(), LENDA, o("mei", "boneco-mei"), o("stageGavel", "martelo-do-stf")],
    animations: [
      ...busted("s7"),
      spring("mei.pop", W("s7", 1) - 2, W("s7", 1) + 18, 0, 1, 8),
      spring("gavel.pop", W("s7", 1), W("s7", 1) + 22, 0, 1, 8),
      lerp("gavel.hit", 0, 1, 0, 0),
      lerp("gavel.hit", W("s7", 5) - 6, W("s7", 5), 0, 1.1, "in"),
      lerp("gavel.hit", W("s7", 5), W("s7", 5) + 8, 1.1, 1, "out"),
      ...flash(W("s7", 5), 0.5),
      lerp("camera.shake", W("s7", 5), W("s7", 5) + 3, 0, 0.7, "out"),
      lerp("camera.shake", W("s7", 5) + 3, W("s7", 5) + 12, 0.7, 0, "in"),
      spring("mei.ok", W("s7", 7), W("s7", 7) + 18, 0, 1, 7),
    ],
    badges: [{ text: "STF · DECISÃO DE 2024", variant: "info", appearAt: W("s7", 2), disappearAt: end(6) }],
    bigWords: [
      { text: "MITO!", at: 4, until: W("s7", 1) - 2, color: R, size: 220, tilt: -7 },
      { text: "SEM CARÊNCIA!", at: W("s7", 7), until: end(6), color: G, size: 130, y: 420, tilt: -4 },
    ],
    highlights: ["MITO", "2024", "STF", "DERRUBOU", "CARÊNCIA"],
    captions: [{ text: "Mito! Desde 2024, o STF derrubou essa carência.", from: voLocal("s7"), to: end(6) }],
    audioCues: [narration("s7", "ready"), ...BUST_SFX("s7"), sfx("pop", W("s7", 1) + 2, 0.22), sfx("badge", W("s7", 2), 0.2), sfx("gavel", W("s7", 5), 0.42), sfx("ding", W("s7", 7), 0.24)],
  },
  legendScene(7, "s8", "4", "SÃO SÓ 60 DIAS!", "Mentira número quatro: são só 60 dias.", ["MENTIRA", "QUATRO", "60", "DIAS"]),
  // ------------------------------------------------------------------ s9 · mito 4: 120 dias
  {
    id: "scene-09-mito-4",
    startFrame: sc(8).from,
    durationInFrames: sc(8).durationInFrames,
    voKey: "s9",
    narration: "Mito! Em regra, são 120 dias.",
    camera: { projection: "perspective", movement: "tracking", keys: [key(0, P.sograPush), key(W("s9", 1) - 4, P.sogra, "soft"), key(W("s9", 1) + 4, P.mae, "out"), key(end(8), P.mae)] },
    objects: [...SYSTEM(), LENDA, o("mae", "mamae-com-bebe")],
    animations: [
      ...busted("s9"),
      lerp("mae.baby", 0, 1, 1, 1),
      spring("mae.pop", W("s9", 1) - 2, W("s9", 1) + 18, 0, 1, 8),
      lerp("mae.shades", W("s9", 4) - 6, W("s9", 4) + 4, 0, 1, "in"),
      lerp("mae.dance", W("s9", 4) + 6, W("s9", 4) + 12, 0, 1, "out"),
      ...punch(W("s9", 4), 0.7),
      lerp("confetti", W("s9", 4), W("s9", 4) + 8, 0, 1, "out"),
    ],
    badges: [{ text: "EM REGRA", variant: "info", appearAt: W("s9", 1), disappearAt: end(8) }],
    bigWords: [
      { text: "MITO!", at: 4, until: W("s9", 1) - 2, color: R, size: 220, tilt: -7 },
      { text: "120 DIAS", at: W("s9", 4), until: end(8), color: GOLD, size: 200, y: 420, tilt: -5 },
    ],
    highlights: ["MITO", "REGRA", "120", "DIAS"],
    captions: [{ text: "Mito! Em regra, são 120 dias.", from: voLocal("s9"), to: end(8) }],
    audioCues: [narration("s9", "ready"), ...BUST_SFX("s9"), sfx("pop", W("s9", 1) + 2, 0.22), sfx("airhorn", W("s9", 4), 0.22)],
  },
  // ------------------------------------------------------------------ s10 · CTA
  {
    id: "scene-10-final",
    startFrame: sc(9).from,
    durationInFrames: sc(9).durationInFrames,
    voKey: "s10",
    narration: "Conhece alguma futura mamãe? Manda esse vídeo pra ela!",
    camera: { projection: "perspective", movement: "dolly-out", keys: [key(0, P.group), key(W("s10", 4), P.group), key(W("s10", 8) + 26, P.final, "inOut"), key(end(9), P.final)] },
    objects: [...SYSTEM(), o("desemp", "desempregada"), o("pai", "pai-que-adota"), o("mei", "boneco-mei"), o("mae", "mamae-com-bebe")],
    animations: [
      ...whip(0),
      lerp("confetti", 0, 10, 1, 0, "in"),
      lerp("desemp.ok", 0, 1, 0, 0),
      lerp("pai.ok", 0, 1, 0, 0),
      lerp("mei.ok", 0, 1, 0, 0),
      lerp("sogra.pumpkin", W("s10", 3) - 4, W("s10", 3) + 6, 0, 1, "in"),
      ...punch(W("s10", 3) + 6, 0.6),
      lerp("desemp.wave", W("s10", 4), W("s10", 4) + 8, 0, 1, "out"),
      lerp("pai.wave", W("s10", 4) + 3, W("s10", 4) + 11, 0, 1, "out"),
      lerp("mei.shrug", 0, 1, 0, 0),
      spring("share", W("s10", 4), W("s10", 4) + 24, 0, 1, 8),
      lerp("share", end(9) - 58, end(9) - 50, 1, 0, "in"),
      lerp("plazaCoins", 4, 14, 0, 1, "out"),
      lerp("plazaCoins", end(9) - 60, end(9) - 40, 1, 0, "in"),
      spring("endcard", end(9) - 52, end(9) - 22, 0, 1, 10),
    ],
    badges: [{ text: "MANDA PRA UMA FUTURA MAMÃE", variant: "positive", appearAt: W("s10", 4), disappearAt: end(9) - 54 }],
    bigWords: [{ text: "KKKKKKK", at: W("s10", 3) + 6, until: W("s10", 4) + 12, color: Y, size: 170, y: 480, tilt: 5 }],
    highlights: ["FUTURA", "MAMÃE", "MANDA", "VÍDEO"],
    captions: [{ text: "Conhece alguma futura mamãe? Manda esse vídeo pra ela!", from: voLocal("s10"), to: end(9) - 52 }],
    audioCues: [narration("s10", "ready"), sfx("thud", W("s10", 3) + 6, 0.3), sfx("pop", W("s10", 4), 0.24), sfx("ding", W("s10", 4) + 4, 0.22), sfx("final", end(9) - 52, 0.3)],
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
