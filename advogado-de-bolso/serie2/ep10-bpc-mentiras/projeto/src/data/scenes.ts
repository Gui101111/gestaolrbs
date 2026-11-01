import { evaluateTrack, orbit, type EaseName, type TrackAnimation, type Vec3 } from "../utils/animation";
import { STAGE } from "../layout";
import { DURATION, FPS, HEIGHT, SCENE_FRAMES, voLocal, WIDTH, wordLocal, type VoKey } from "../utils/timing";

// EP10 · Série 2 (comédia, Halloween) · BPC/LOAS: três mentiras que assombram.
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

/** Cenário fixo: ilha de Halloween, INSS, dona Maria e a vizinha que acredita em tudo. */
const SYSTEM = (): SceneObject[] => [o("island", "diorama-ilha-halloween"), o("inss", "predio-inss"), o("dona", "dona-maria"), o("vizinha", "vizinha-que-acredita-em-lenda")];
const LENDA = o("lenda", "fantasma-da-mentira");
const VIZ_HEAD: Vec3 = [-0.4, 1.95, -1.05];
const WHEEL_HEAD: Vec3 = [1.75, 1.45, -1.35];
const PURPLE = "#c77dff";

const P = {
  ghostClose: orbit([STAGE.ghosts[1][0], STAGE.ghosts[1][1] + 0.5, STAGE.ghosts[1][2]], 4.2, 8, 4),
  spooky: orbit([0.3, 1.7, -1.4], 15, 16, 22),
  spookyIn: orbit([1.6, 2.2, -3.0], 13, 10, 14),
  viz: orbit([-0.75, 1.4, -1.25], 8.5, -4, 4),
  vizPush: orbit([-0.8, 1.45, -1.3], 7.2, -4, 3),
  pcd: orbit([1.35, 0.85, -1.15], 9, -10, 6),
  pcdPush: orbit([1.3, 0.85, -1.1], 7.5, -10, 5),
  dona: orbit([0.45, 1.3, -1.35], 5.8, -25, 4),
  donaWide: orbit([0.2, 1.4, -1.3], 12, -15, 12),
  pipes: orbit([1.2, 2.0, -0.4], 22, -12, 22),
  group: orbit([0.6, 1.0, -1.2], 18, -25, 7),
  final: orbit([0.2, 1.4, -1.3], 30, 10, 18),
};

/** "MITO!": X vermelho no fantasma, ele some e a vizinha leva um susto. */
const busted = (k: VoKey): TrackAnimation[] => [
  spring("lenda.x", 4, 22, 0, 1, 7),
  ...flash(4, 0.6),
  lerp("camera.shake", 4, 7, 0, 0.8, "out"),
  lerp("camera.shake", 7, 16, 0.8, 0, "in"),
  spring("vizinha.shock", 5, 18, 0, 1, 8),
  lerp("vizinha.shock", 18, 26, 1, 0, "inOut"),
  lerp("lenda.pop", W(k, 1) - 10, W(k, 1) - 2, 1, 0, "in"),
  lerp("lenda.x", W(k, 1) - 10, W(k, 1) - 2, 1, 0, "in"),
  ...whip(W(k, 1) - 2),
  lerp("vizinha.wave", W(k, 1) - 4, W(k, 1), 1, 0, "in"),
];
/** "Mentira número N": o fantasma volta ao lado da vizinha. */
const legend = (): TrackAnimation[] => [...whip(0), lerp("lenda.x", 0, 1, 0, 0), spring("lenda.pop", 2, 24, 0, 1, 9), lerp("vizinha.wave", 14, 22, 0, 1, "out")];
const BUST_SFX = (k: VoKey): AudioCue[] => [sfx("buzz", 4, 0.3), sfx("stamp", 4, 0.3), sfx("pop", W(k, 1) - 8, 0.24), sfx("whoosh", W(k, 1) - 2, 0.22)];
const LEGEND_SFX: AudioCue[] = [sfx("whoosh", 0, 0.22), sfx("ghost", 4, 0.22)];

export const scenes: ScenePlan[] = [
  // ------------------------------------------------------------------ s1 · gancho
  {
    id: "scene-01-gancho",
    startFrame: sc(0).from,
    durationInFrames: sc(0).durationInFrames,
    voKey: "s1",
    narration: "Três mentiras sobre o BPC que assombram muita gente. A última é a mais assustadora!",
    camera: { projection: "perspective", movement: "dolly-out", keys: [key(0, P.ghostClose), key(W("s1", 3), P.ghostClose), key(W("s1", 6), P.spooky, "out"), key(W("s1", 9), P.spooky), key(end(0), P.spookyIn, "inOut")] },
    objects: [...SYSTEM(), o("ghosts", "fantasmas")],
    animations: [
      spring("ghosts.pop", 0, 22, 0.3, 1, 8),
      ...flash(0, 0.4),
      lerp("camera.shake", 0, 3, 0, 1, "out"),
      lerp("camera.shake", 3, 14, 1, 0, "in"),
      lerp("dona.shock", W("s1", 9), W("s1", 9) + 6, 0, 0.6, "out"),
      lerp("dona.shock", W("s1", 9) + 6, W("s1", 9) + 16, 0.6, 0, "inOut"),
      lerp("vizinha.shock", W("s1", 9), W("s1", 9) + 6, 0, 0.6, "out"),
      lerp("vizinha.shock", W("s1", 9) + 6, W("s1", 9) + 16, 0.6, 0, "inOut"),
      ...flash(W("s1", 9), 0.6),
      lerp("vignette.red", W("s1", 9), W("s1", 9) + 8, 0, 0.6, "out"),
      lerp("vignette.red", end(0) - 8, end(0), 0.6, 0, "in"),
    ],
    badges: [],
    bigWords: [
      { text: "3 MENTIRAS", at: W("s1", 0), until: W("s1", 9), color: "#ffffff", size: 150, y: 470, tilt: -5 },
      { text: "SOBRE O BPC", at: W("s1", 4), until: W("s1", 9), color: GOLD, size: 140, y: 640, tilt: -5 },
      { text: "A ÚLTIMA", at: W("s1", 9), until: end(0), color: "#ffffff", size: 150, y: 470, tilt: 4 },
      { text: "ASSUSTA!", at: W("s1", 13), until: end(0), color: R, size: 170, y: 640, tilt: 4 },
    ],
    highlights: ["TRÊS", "MENTIRAS", "BPC", "ASSOMBRAM", "ÚLTIMA", "ASSUSTADORA"],
    captions: [{ text: "Três mentiras sobre o BPC que assombram muita gente. A última é a mais assustadora!", from: voLocal("s1"), to: end(0) }],
    audioCues: [narration("s1", "ready"), sfx("thunder", 0, 0.42), sfx("ghost", 2, 0.3), sfx("boo", W("s1", 0), 0.18), sfx("whoosh-big", W("s1", 5), 0.22), sfx("thunder", W("s1", 9) - 1, 0.3), sfx("ghost", W("s1", 10), 0.2)],
  },
  // ------------------------------------------------------------------ s2 · mentira 1
  {
    id: "scene-02-mentira-1",
    startFrame: sc(1).from,
    durationInFrames: sc(1).durationInFrames,
    voKey: "s2",
    narration: "Mentira número um: o BPC é só pra idoso.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.viz), key(end(1), P.vizPush, "linear")] },
    objects: [...SYSTEM(), LENDA],
    animations: [...legend(), lerp("ghosts.pop", 0, 8, 1, 0, "in")],
    badges: [],
    bigWords: [{ text: "MENTIRA #1", at: W("s2", 0), until: W("s2", 3), color: PURPLE, size: 150, y: 500, tilt: -5 }],
    labels: [{ text: "BPC É SÓ PRA IDOSO!", point: VIZ_HEAD, at: W("s2", 3), until: end(1), off: [60, -150], accent: Y }],
    highlights: ["MENTIRA", "UM", "SÓ", "IDOSO"],
    captions: [{ text: "Mentira número um: o BPC é só pra idoso.", from: voLocal("s2"), to: end(1) }],
    audioCues: [narration("s2", "ready"), ...LEGEND_SFX, sfx("badge", W("s2", 3), 0.2)],
  },
  // ------------------------------------------------------------------ s3 · mito 1: deficiência, qualquer idade
  {
    id: "scene-03-mito-1",
    startFrame: sc(2).from,
    durationInFrames: sc(2).durationInFrames,
    voKey: "s3",
    narration: "Mito! Pessoa com deficiência de qualquer idade pode ter direito, até criança, como no autismo, se cumprir a regra de renda.",
    camera: { projection: "perspective", movement: "tracking", keys: [key(0, P.vizPush), key(W("s3", 1) - 4, P.viz, "soft"), key(W("s3", 1) + 4, P.pcd, "out"), key(W("s3", 10), P.pcd), key(W("s3", 12), P.pcdPush, "soft"), key(end(2), P.pcdPush)] },
    objects: [...SYSTEM(), LENDA, o("kid", "crianca"), o("wheel", "cadeirante")],
    animations: [
      ...busted("s3"),
      lerp("kid.pop", 0, 1, 0, 0),
      spring("wheel.pop", W("s3", 1), W("s3", 1) + 22, 0, 1, 8),
      lerp("wheel.wave", W("s3", 3) + 4, W("s3", 3) + 12, 0, 1, "out"),
      lerp("wheel.roll", W("s3", 3), W("s3", 7), 0, 0.6, "inOut"),
      spring("kid.pop", W("s3", 10) - 2, W("s3", 10) + 20, 0, 1, 8),
      lerp("kid.hop", W("s3", 11), W("s3", 11) + 4, 0, 1, "out"),
      lerp("kid.wave", W("s3", 11), W("s3", 11) + 8, 0, 1, "out"),
      lerp("kid.hop", W("s3", 15), W("s3", 15) + 4, 1, 0, "in"),
      spring("kid.ok", W("s3", 15), W("s3", 15) + 18, 0, 1, 7),
      spring("wheel.ok", W("s3", 15) + 3, W("s3", 15) + 21, 0, 1, 7),
    ],
    badges: [
      { text: "PESSOA COM DEFICIÊNCIA", variant: "positive", appearAt: W("s3", 1), disappearAt: W("s3", 7) },
      { text: "PODE TER DIREITO", variant: "positive", appearAt: W("s3", 7), disappearAt: W("s3", 12) },
      { text: "AUTISMO (TEA) TAMBÉM", variant: "info", appearAt: W("s3", 12), disappearAt: W("s3", 15) },
      { text: "SE CUMPRIR A REGRA DE RENDA", variant: "warning", appearAt: W("s3", 15), disappearAt: end(2) },
    ],
    bigWords: [
      { text: "MITO!", at: 4, until: W("s3", 1) - 2, color: R, size: 220, tilt: -7 },
      { text: "QUALQUER IDADE", at: W("s3", 5), until: W("s3", 10) - 2, color: G, size: 120, y: 500, tilt: -4 },
      { text: "ATÉ CRIANÇA", at: W("s3", 10), until: W("s3", 15) - 2, color: GOLD, size: 140, y: 500, tilt: 4 },
    ],
    labels: [
      { text: "CADEIRANTE", point: WHEEL_HEAD, at: W("s3", 2), until: W("s3", 10), off: [0, -120], accent: G },
    ],
    highlights: ["MITO", "DEFICIÊNCIA", "QUALQUER", "IDADE", "DIREITO", "CRIANÇA", "AUTISMO", "RENDA"],
    captions: [
      { text: "Mito! Pessoa com deficiência de qualquer idade pode ter direito,", from: voLocal("s3"), to: W("s3", 10) },
      { text: "até criança, como no autismo, se cumprir a regra de renda.", from: W("s3", 10), to: end(2) },
    ],
    audioCues: [narration("s3", "ready"), ...BUST_SFX("s3"), sfx("pop", W("s3", 1) + 2, 0.22), sfx("ding", W("s3", 5), 0.2), sfx("pop-high", W("s3", 10), 0.22), sfx("badge", W("s3", 12), 0.2), sfx("badge", W("s3", 15), 0.22)],
  },
  // ------------------------------------------------------------------ s4 · mentira 2
  {
    id: "scene-04-mentira-2",
    startFrame: sc(3).from,
    durationInFrames: sc(3).durationInFrames,
    voKey: "s4",
    narration: "Mentira número dois: precisa ter contribuído pro INSS.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.viz), key(end(3), P.vizPush, "linear")] },
    objects: [...SYSTEM(), LENDA],
    animations: [...legend()],
    badges: [],
    bigWords: [{ text: "MENTIRA #2", at: W("s4", 0), until: W("s4", 3), color: PURPLE, size: 150, y: 500, tilt: -5 }],
    labels: [{ text: "TEM QUE TER CONTRIBUÍDO!", point: VIZ_HEAD, at: W("s4", 3), until: end(3), off: [50, -150], accent: Y }],
    highlights: ["MENTIRA", "DOIS", "CONTRIBUÍDO", "INSS"],
    captions: [{ text: "Mentira número dois: precisa ter contribuído pro INSS.", from: voLocal("s4"), to: end(3) }],
    audioCues: [narration("s4", "ready"), ...LEGEND_SFX, sfx("badge", W("s4", 3), 0.2)],
  },
  // ------------------------------------------------------------------ s5 · mito 2: assistencial
  {
    id: "scene-05-mito-2",
    startFrame: sc(4).from,
    durationInFrames: sc(4).durationInFrames,
    voKey: "s5",
    narration: "Mito! O BPC é assistencial: não precisa de nenhuma contribuição.",
    camera: { projection: "perspective", movement: "tracking", keys: [key(0, P.vizPush), key(W("s5", 1) - 4, P.viz, "soft"), key(W("s5", 1) + 4, P.dona, "out"), key(end(4), P.dona)] },
    objects: [...SYSTEM(), LENDA],
    animations: [
      ...busted("s5"),
      lerp("dona.hop", W("s5", 4), W("s5", 4) + 4, 0, 1, "out"),
      lerp("dona.hop", W("s5", 7), W("s5", 7) + 4, 1, 0, "in"),
      spring("dona.ok", W("s5", 5), W("s5", 5) + 18, 0, 1, 7),
      ...punch(W("s5", 8), 0.6),
    ],
    badges: [{ text: "NÃO PRECISA CONTRIBUIR", variant: "positive", appearAt: W("s5", 5), disappearAt: end(4) }],
    bigWords: [
      { text: "MITO!", at: 4, until: W("s5", 1) - 2, color: R, size: 220, tilt: -7 },
      { text: "ASSISTENCIAL", at: W("s5", 4), until: end(4), color: GOLD, size: 130, y: 430, tilt: -4 },
    ],
    highlights: ["MITO", "BPC", "ASSISTENCIAL", "NENHUMA", "CONTRIBUIÇÃO"],
    captions: [{ text: "Mito! O BPC é assistencial: não precisa de nenhuma contribuição.", from: voLocal("s5"), to: end(4) }],
    audioCues: [narration("s5", "ready"), ...BUST_SFX("s5"), sfx("ding", W("s5", 4), 0.24), sfx("badge", W("s5", 5), 0.2)],
  },
  // ------------------------------------------------------------------ s6 · mentira 3
  {
    id: "scene-06-mentira-3",
    startFrame: sc(5).from,
    durationInFrames: sc(5).durationInFrames,
    voKey: "s6",
    narration: "Mentira número três: o BPC paga décimo terceiro e deixa pensão.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.viz), key(end(5), P.vizPush, "linear")] },
    objects: [...SYSTEM(), LENDA],
    animations: [...legend(), lerp("dona.ok", 0, 1, 0, 0)],
    badges: [],
    bigWords: [{ text: "MENTIRA #3", at: W("s6", 0), until: W("s6", 3), color: PURPLE, size: 150, y: 500, tilt: -5 }],
    labels: [{ text: "PAGA 13º E DEIXA PENSÃO!", point: VIZ_HEAD, at: W("s6", 3), until: end(5), off: [50, -150], accent: Y }],
    highlights: ["MENTIRA", "TRÊS", "DÉCIMO", "TERCEIRO", "PENSÃO"],
    captions: [{ text: "Mentira número três: o BPC paga décimo terceiro e deixa pensão.", from: voLocal("s6"), to: end(5) }],
    audioCues: [narration("s6", "ready"), ...LEGEND_SFX, sfx("badge", W("s6", 3), 0.2)],
  },
  // ------------------------------------------------------------------ s7 · mito 3: sem 13º e sem pensão
  {
    id: "scene-07-mito-3",
    startFrame: sc(6).from,
    durationInFrames: sc(6).durationInFrames,
    voKey: "s7",
    narration: "Mito! E essa assusta: o BPC não tem décimo terceiro e não deixa pensão por morte.",
    camera: { projection: "perspective", movement: "orbit", keys: [key(0, P.vizPush), key(W("s7", 1) - 4, P.viz, "soft"), key(W("s7", 1) + 4, P.donaWide, "out"), key(end(6), P.dona, "inOut")] },
    objects: [...SYSTEM(), LENDA, o("ghosts", "fantasmas")],
    animations: [
      ...busted("s7"),
      lerp("ghosts.pop", 0, 1, 0, 0),
      ...flash(W("s7", 1), 0.7),
      spring("ghosts.pop", W("s7", 1), W("s7", 1) + 24, 0, 1, 8),
      lerp("vignette.red", W("s7", 1), W("s7", 1) + 8, 0, 0.6, "out"),
      spring("dona.shock", W("s7", 2), W("s7", 2) + 16, 0, 1, 8),
      lerp("dona.shock", W("s7", 2) + 16, W("s7", 2) + 24, 1, 0, "inOut"),
      lerp("dona.sad", W("s7", 6), W("s7", 6) + 8, 0, 1, "inOut"),
      spring("dona.x", W("s7", 6), W("s7", 6) + 18, 0, 1, 7),
      ...punch(W("s7", 11), 0.6),
    ],
    badges: [],
    bigWords: [
      { text: "MITO!", at: 4, until: W("s7", 1) - 2, color: R, size: 220, tilt: -7 },
      { text: "SEM 13º", at: W("s7", 6), until: end(6), color: R, size: 170, y: 300, tilt: -5 },
      { text: "SEM PENSÃO", at: W("s7", 11), until: end(6), color: R, size: 150, y: 470, tilt: -5 },
    ],
    highlights: ["MITO", "ASSUSTA", "NÃO", "DÉCIMO", "TERCEIRO", "PENSÃO", "MORTE"],
    captions: [{ text: "Mito! E essa assusta: o BPC não tem décimo terceiro e não deixa pensão por morte.", from: voLocal("s7"), to: end(6) }],
    audioCues: [narration("s7", "ready"), ...BUST_SFX("s7"), sfx("thunder", W("s7", 1) - 1, 0.36), sfx("ghost", W("s7", 2), 0.22), sfx("buzz", W("s7", 6), 0.24), sfx("buzz", W("s7", 11), 0.24)],
  },
  // ------------------------------------------------------------------ s8 · resumo
  {
    id: "scene-08-resumo",
    startFrame: sc(7).from,
    durationInFrames: sc(7).durationInFrames,
    voKey: "s8",
    narration: "Resumindo: um salário mínimo por mês, pra idoso de 65 anos ou mais, ou pessoa com deficiência, de baixa renda.",
    camera: { projection: "perspective", movement: "orbit", keys: [key(0, P.pipes), key(W("s8", 6) - 4, P.pipes), key(W("s8", 6) + 6, P.group, "out"), key(end(7), P.group)] },
    objects: [...SYSTEM(), o("piggy", "cofrinho"), o("accidentPipe", "cano-dourado-do-bpc"), o("kid", "crianca"), o("wheel", "cadeirante")],
    animations: [
      ...whip(0),
      lerp("ghosts.pop", 0, 6, 1, 0, "in"),
      lerp("vignette.red", 0, 8, 0.6, 0, "in"),
      lerp("dona.x", 0, 6, 1, 0, "in"),
      lerp("dona.sad", 0, 8, 1, 0, "inOut"),
      lerp("kid.ok", 0, 1, 0, 0),
      lerp("wheel.ok", 0, 1, 0, 0),
      lerp("pipeAccident.grow", 0, 1, 0, 0),
      lerp("pipeAccident.grow", 4, 26, 0, 1, "out"),
      lerp("pipeAccident.glow", 6, 18, 0, 1, "out"),
      lerp("coins.accident.flow", 22, 32, 0, 1, "linear"),
      lerp("piggy.level", 0, 1, 0.15, 0.15),
      lerp("piggy.level", 26, W("s8", 6), 0.15, 0.8, "linear"),
      lerp("dona.shades", W("s8", 6) + 4, W("s8", 6) + 14, 0, 1, "in"),
      lerp("dona.dance", W("s8", 9), W("s8", 9) + 6, 0, 1, "out"),
      lerp("kid.hop", W("s8", 13), W("s8", 13) + 4, 0, 1, "out"),
      lerp("wheel.wave", W("s8", 13), W("s8", 13) + 8, 0, 1, "out"),
      lerp("plazaCoins", W("s8", 16), W("s8", 16) + 10, 0, 1, "out"),
    ],
    badges: [
      { text: "1 SALÁRIO MÍNIMO POR MÊS", variant: "positive", appearAt: W("s8", 1), disappearAt: W("s8", 6) },
      { text: "IDOSO DE 65 ANOS OU MAIS", variant: "info", appearAt: W("s8", 6), disappearAt: W("s8", 12) },
      { text: "OU PESSOA COM DEFICIÊNCIA", variant: "info", appearAt: W("s8", 12), disappearAt: W("s8", 16) },
      { text: "DE BAIXA RENDA", variant: "warning", appearAt: W("s8", 16), disappearAt: end(7) },
    ],
    bigWords: [{ text: "RESUMINDO", at: W("s8", 0), until: W("s8", 1), color: "#ffffff", size: 120, y: 520, tilt: -4 }],
    highlights: ["SALÁRIO", "MÍNIMO", "MÊS", "IDOSO", "65", "ANOS", "DEFICIÊNCIA", "BAIXA", "RENDA"],
    captions: [
      { text: "Resumindo: um salário mínimo por mês,", from: voLocal("s8"), to: W("s8", 6) },
      { text: "pra idoso de 65 anos ou mais, ou pessoa com deficiência, de baixa renda.", from: W("s8", 6), to: end(7) },
    ],
    audioCues: [narration("s8", "ready"), sfx("whoosh", 0, 0.22), sfx("coin", 24, 0.22), sfx("badge", W("s8", 1), 0.2), sfx("whoosh", W("s8", 6), 0.2), sfx("ding", W("s8", 6) + 14, 0.22), sfx("badge", W("s8", 12), 0.2), sfx("coin", W("s8", 16), 0.2)],
  },
  // ------------------------------------------------------------------ s9 · CTA
  {
    id: "scene-09-final",
    startFrame: sc(8).from,
    durationInFrames: sc(8).durationInFrames,
    voKey: "s9",
    narration: "Conhece alguém que ainda acredita nessas lendas? Manda esse vídeo pra ele!",
    camera: { projection: "perspective", movement: "dolly-out", keys: [key(0, P.group), key(W("s9", 7), P.group), key(W("s9", 11) + 26, P.final, "inOut"), key(end(8), P.final)] },
    objects: [...SYSTEM(), o("kid", "crianca"), o("wheel", "cadeirante")],
    animations: [
      lerp("vizinha.pumpkin", W("s9", 6) - 4, W("s9", 6) + 6, 0, 1, "in"),
      ...punch(W("s9", 6) + 6, 0.6),
      lerp("kid.hop", W("s9", 7), W("s9", 7) + 4, 1, 0, "in"),
      lerp("kid.wave", W("s9", 7), W("s9", 7) + 8, 0, 1, "out"),
      spring("share", W("s9", 7), W("s9", 7) + 24, 0, 1, 8),
      lerp("share", end(8) - 58, end(8) - 50, 1, 0, "in"),
      lerp("plazaCoins", end(8) - 60, end(8) - 40, 1, 0, "in"),
      spring("endcard", end(8) - 52, end(8) - 22, 0, 1, 10),
    ],
    badges: [{ text: "MANDA PRA QUEM ACREDITA EM LENDA", variant: "positive", appearAt: W("s9", 7), disappearAt: end(8) - 54 }],
    bigWords: [{ text: "KKKKKKK", at: W("s9", 6) + 6, until: W("s9", 7) + 12, color: Y, size: 170, y: 500, tilt: 5 }],
    highlights: ["ACREDITA", "LENDAS", "MANDA", "VÍDEO"],
    captions: [{ text: "Conhece alguém que ainda acredita nessas lendas? Manda esse vídeo pra ele!", from: voLocal("s9"), to: end(8) - 52 }],
    audioCues: [narration("s9", "ready"), sfx("thud", W("s9", 6) + 6, 0.3), sfx("pop", W("s9", 7), 0.24), sfx("ding", W("s9", 7) + 4, 0.22), sfx("final", end(8) - 52, 0.3)],
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
