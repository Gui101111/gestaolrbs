import { evaluateTrack, orbit, type EaseName, type TrackAnimation, type Vec3 } from "../utils/animation";
import { DURATION, FPS, HEIGHT, SCENE_FRAMES, voLocal, WIDTH, wordLocal, type VoKey } from "../utils/timing";

// SÉRIE 3 · temas do momento (boatos pós-eleição, reajustes, 13º, golpes, IR).
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

/** Cenário: praça do INSS, a Bia (MEI) e os gêmeos de 2 anos. */
const SYSTEM = (): SceneObject[] => [o("island", "diorama-ilha"), o("inss", "predio-inss"), o("warehouse", "galpao"), o("bia", "bia"), o("gemeo1", "gemeo-1"), o("gemeo2", "gemeo-2")];
const DOC = o("doc", "pedido-no-inss");
const BAR = o("pctBar", "prazo-de-5-anos");
const BIA_HEAD: Vec3 = [0.45, 1.95, -1.35];
const PINK = "#ff8fc1";

const P = {
  family: orbit([0.45, 1.0, -1.25], 8.5, -10, 6),
  familyLow: orbit([0.45, 1.4, -1.25], 8.5, -10, 3),
  bia: orbit([0.45, 1.3, -1.35], 5.6, -15, 4),
  plaza: orbit([0.3, 1.0, -1.35], 13, -6, 7),
  plazaLow: orbit([0.3, 1.45, -1.35], 13, -6, 4),
  bar: orbit([1.1, 1.1, -1.5], 8, -10, 6),
  doc: orbit([1.0, 1.15, -1.75], 7.5, 10, 4),
  gavel: orbit([2.2, 0.9, -1.8], 15, 0, 8),
  final: orbit([0.2, 1.4, -1.35], 30, 10, 18),
};

export const scenes: ScenePlan[] = [
  // ------------------------------------------------------------------ s1 · gêmeos e o "perdi tudo"
  {
    id: "scene-01-gancho",
    startFrame: sc(0).from,
    durationInFrames: sc(0).durationInFrames,
    voKey: "s1",
    narration: "A Bia teve gêmeos há dois anos, nunca pediu o salário-maternidade, e achou que tinha perdido tudo.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.family), key(W("s1", 7), P.family), key(W("s1", 12), P.bia, "soft"), key(end(0), P.bia)] },
    objects: [...SYSTEM()],
    animations: [
      lerp("hearts", 0, 6, 0, 1, "out"),
      lerp("gemeo1.hop", 0, 4, 0, 1, "out"),
      lerp("gemeo2.hop", 2, 6, 0, 1, "out"),
      lerp("gemeo1.wave", 4, 12, 0, 1, "out"),
      lerp("gemeo2.wave", 6, 14, 0, 1, "out"),
      lerp("bia.wave", 4, 12, 0, 1, "out"),
      lerp("hearts", W("s1", 7) - 6, W("s1", 7), 1, 0, "in"),
      lerp("bia.wave", W("s1", 7) - 6, W("s1", 7), 1, 0, "in"),
      lerp("gemeo1.hop", W("s1", 7) - 6, W("s1", 7), 1, 0, "in"),
      lerp("gemeo2.hop", W("s1", 7) - 6, W("s1", 7), 1, 0, "in"),
      lerp("bia.sad", W("s1", 12), W("s1", 12) + 8, 0, 1, "inOut"),
      spring("bia.shock", W("s1", 15), W("s1", 15) + 14, 0, 0.8, 7),
      lerp("bia.shock", W("s1", 15) + 14, end(0), 0.8, 0.2, "inOut"),
    ],
    badges: [{ text: "NUNCA PEDIU", variant: "negative", appearAt: W("s1", 7), disappearAt: W("s1", 15) }],
    bigWords: [
      { text: "GÊMEOS!", at: 2, until: W("s1", 7), color: PINK, size: 200, y: 1000, tilt: -5 },
      { text: "PERDEU TUDO?", at: W("s1", 15), until: end(0), color: R, size: 150, y: 460, tilt: -5 },
    ],
    labels: [{ text: "BIA", point: BIA_HEAD, at: W("s1", 1), until: W("s1", 7), off: [0, -110], accent: Y }],
    highlights: ["BIA", "GÊMEOS", "DOIS", "ANOS", "NUNCA", "PEDIU", "SALÁRIO-MATERNIDADE", "PERDIDO"],
    captions: [{ text: "A Bia teve gêmeos há dois anos, nunca pediu o salário-maternidade, e achou que tinha perdido tudo.", from: voLocal("s1"), to: end(0) }],
    audioCues: [narration("s1", "ready"), sfx("shimmer", 0, 0.24), sfx("boing", 2, 0.2), sfx("pop-high", 6, 0.18), sfx("badge", W("s1", 7), 0.2), sfx("boo", W("s1", 15), 0.18)],
  },
  // ------------------------------------------------------------------ s2 · spoiler: não perdeu!
  {
    id: "scene-02-spoiler",
    startFrame: sc(1).from,
    durationInFrames: sc(1).durationInFrames,
    voKey: "s2",
    narration: "Spoiler: não perdeu!",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.bia), key(end(1), P.familyLow, "out")] },
    objects: [...SYSTEM()],
    animations: [
      ...whip(0),
      lerp("bia.shock", 0, 6, 0.2, 0, "inOut"),
      lerp("bia.sad", W("s2", 1), W("s2", 1) + 6, 1, 0, "inOut"),
      ...flash(W("s2", 1), 0.5),
      lerp("confetti", W("s2", 1), W("s2", 1) + 6, 0, 0.8, "out"),
      lerp("bia.hop", W("s2", 1), W("s2", 1) + 4, 0, 1, "out"),
    ],
    badges: [],
    bigWords: [
      { text: "SPOILER:", at: W("s2", 0), until: end(1), color: "#ffffff", size: 150, y: 420, tilt: -5 },
      { text: "NÃO PERDEU!", at: W("s2", 1), until: end(1), color: G, size: 150, y: 590, tilt: -5 },
    ],
    highlights: ["SPOILER", "NÃO", "PERDEU"],
    captions: [{ text: "Spoiler: não perdeu!", from: voLocal("s2"), to: end(1) }],
    audioCues: [narration("s2", "ready"), sfx("scratch", 0, 0.26), sfx("airhorn", W("s2", 1), 0.18)],
  },
  // ------------------------------------------------------------------ s3 · até 5 anos depois do parto
  {
    id: "scene-03-5-anos",
    startFrame: sc(2).from,
    durationInFrames: sc(2).durationInFrames,
    voKey: "s3",
    narration: "Em regra, dá pra pedir o salário-maternidade em até cinco anos depois do parto, se ela era segurada na gravidez.",
    camera: { projection: "perspective", movement: "orbit", keys: [key(0, P.familyLow), key(W("s3", 7), P.bar, "soft"), key(W("s3", 14), P.bar), key(W("s3", 14) + 8, P.bia, "out"), key(end(2), P.bia)] },
    objects: [...SYSTEM(), BAR],
    animations: [
      ...whip(0),
      lerp("confetti", 0, 8, 0.8, 0, "in"),
      lerp("bia.hop", 0, 4, 1, 0, "in"),
      lerp("pct.pop", 0, 1, 0, 0),
      lerp("pct.level", 0, 1, 0, 0),
      spring("pct.pop", W("s3", 7), W("s3", 7) + 20, 0, 1, 8),
      lerp("pct.level", W("s3", 9), W("s3", 10) + 10, 0, 0.4, "out"),
      spring("bia.ok", W("s3", 14) + 4, W("s3", 14) + 22, 0, 1, 7),
    ],
    badges: [
      { text: "EM REGRA", variant: "info", appearAt: W("s3", 1), disappearAt: W("s3", 9) },
      { text: "JÁ PASSARAM 2 ANOS: AINDA DÁ!", variant: "positive", appearAt: W("s3", 11), disappearAt: W("s3", 14) },
      { text: "SE ERA SEGURADA NA GRAVIDEZ", variant: "warning", appearAt: W("s3", 14), disappearAt: end(2) },
    ],
    bigWords: [{ text: "ATÉ 5 ANOS", at: W("s3", 9), until: W("s3", 14), color: GOLD, size: 190, y: 420, tilt: -5 }],
    highlights: ["REGRA", "PEDIR", "SALÁRIO-MATERNIDADE", "CINCO", "ANOS", "PARTO", "SEGURADA", "GRAVIDEZ"],
    captions: [
      { text: "Em regra, dá pra pedir o salário-maternidade em até cinco anos depois do parto,", from: voLocal("s3"), to: W("s3", 14) },
      { text: "se ela era segurada na gravidez.", from: W("s3", 14), to: end(2) },
    ],
    audioCues: [narration("s3", "ready"), sfx("whoosh", 0, 0.22), sfx("badge", W("s3", 1), 0.2), sfx("pop", W("s3", 7), 0.2), sfx("ding", W("s3", 9), 0.24), sfx("badge", W("s3", 14), 0.2)],
  },
  // ------------------------------------------------------------------ s4 · MEI em dia: recebeu tudo de uma vez
  {
    id: "scene-04-atrasados",
    startFrame: sc(3).from,
    durationInFrames: sc(3).durationInFrames,
    voKey: "s4",
    narration: "A Bia era MEI e pagava em dia. Pediu no INSS e recebeu os 120 dias atrasados, tudo de uma vez.",
    camera: { projection: "perspective", movement: "orbit", keys: [key(0, P.bia), key(W("s4", 8) - 2, P.bia), key(W("s4", 8) + 6, P.doc, "out"), key(W("s4", 12) - 2, P.doc), key(W("s4", 12) + 6, P.family, "out"), key(end(3), P.family)] },
    objects: [...SYSTEM(), DOC],
    animations: [
      ...whip(0),
      lerp("pct.pop", 0, 1, 0, 0),
      lerp("bia.ok", 0, 1, 1, 1),
      lerp("bia.ok", W("s4", 8) - 4, W("s4", 8), 1, 0, "in"),
      lerp("doc.pop", 0, 1, 0, 0),
      lerp("doc.deny", 0, 1, 0, 0),
      lerp("doc.ok", 0, 1, 0, 0),
      spring("doc.pop", W("s4", 8), W("s4", 8) + 20, 0, 1, 8),
      spring("doc.ok", W("s4", 11), W("s4", 11) + 20, 0, 1, 7),
      lerp("plazaCoins", W("s4", 14), W("s4", 14) + 8, 0, 1, "out"),
      lerp("bia.dance", W("s4", 16), W("s4", 16) + 6, 0, 1, "out"),
      lerp("gemeo1.hop", W("s4", 16), W("s4", 16) + 4, 0, 1, "out"),
      lerp("gemeo2.hop", W("s4", 16) + 2, W("s4", 16) + 6, 0, 1, "out"),
      ...punch(W("s4", 16), 0.7),
    ],
    badges: [
      { text: "MEI EM DIA", variant: "positive", appearAt: W("s4", 3), disappearAt: W("s4", 8) },
      { text: "120 DIAS ATRASADOS", variant: "positive", appearAt: W("s4", 14), disappearAt: end(3) },
    ],
    bigWords: [{ text: "TUDO DE UMA VEZ!", at: W("s4", 16), until: end(3), color: GOLD, size: 120, y: 420, tilt: -5 }],
    highlights: ["BIA", "MEI", "PAGAVA", "DIA", "INSS", "120", "DIAS", "ATRASADOS", "TUDO", "VEZ"],
    captions: [
      { text: "A Bia era MEI e pagava em dia.", from: voLocal("s4"), to: W("s4", 8) },
      { text: "Pediu no INSS e recebeu os 120 dias atrasados, tudo de uma vez.", from: W("s4", 8), to: end(3) },
    ],
    audioCues: [narration("s4", "ready"), sfx("whoosh", 0, 0.22), sfx("badge", W("s4", 3), 0.2), sfx("pop", W("s4", 8), 0.2), sfx("stamp", W("s4", 11), 0.34), sfx("cash", W("s4", 14), 0.3), sfx("coin", W("s4", 16), 0.22)],
  },
  // ------------------------------------------------------------------ s5 · gêmeos não dobram
  {
    id: "scene-05-nao-dobra",
    startFrame: sc(4).from,
    durationInFrames: sc(4).durationInFrames,
    voKey: "s5",
    narration: "Mas atenção: gêmeos não dobram o benefício. É um só por parto.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.family), key(end(4), P.familyLow, "linear")] },
    objects: [...SYSTEM(), o("myth", "x-vermelho")],
    animations: [
      ...whip(0),
      lerp("plazaCoins", 0, 8, 1, 0, "in"),
      lerp("bia.dance", 0, 6, 1, 0, "in"),
      lerp("gemeo1.hop", 0, 4, 1, 0, "in"),
      lerp("gemeo2.hop", 0, 4, 1, 0, "in"),
      lerp("myth.x", 0, 1, 0, 0),
      spring("myth.x", W("s5", 4), W("s5", 4) + 18, 0, 1, 7),
      lerp("myth.x", W("s5", 7), W("s5", 7) + 6, 1, 0, "in"),
      lerp("gemeo1.shock", W("s5", 4), W("s5", 4) + 6, 0, 0.6, "out"),
      lerp("gemeo1.shock", W("s5", 4) + 6, W("s5", 4) + 14, 0.6, 0, "inOut"),
      lerp("gemeo2.shock", W("s5", 4) + 2, W("s5", 4) + 8, 0, 0.6, "out"),
      lerp("gemeo2.shock", W("s5", 4) + 8, W("s5", 4) + 16, 0.6, 0, "inOut"),
    ],
    badges: [{ text: "ATENÇÃO", variant: "warning", icon: "?", appearAt: W("s5", 1), disappearAt: W("s5", 4) }],
    bigWords: [
      { text: "NÃO DOBRA!", at: W("s5", 4), until: W("s5", 7), color: R, size: 180, y: 1000, tilt: -5 },
      { text: "1 POR PARTO", at: W("s5", 7), until: end(4), color: GOLD, size: 170, y: 1000, tilt: -5 },
    ],
    highlights: ["ATENÇÃO", "GÊMEOS", "NÃO", "DOBRAM", "BENEFÍCIO", "UM", "PARTO"],
    captions: [{ text: "Mas atenção: gêmeos não dobram o benefício. É um só por parto.", from: voLocal("s5"), to: end(4) }],
    audioCues: [narration("s5", "ready"), sfx("whoosh", 0, 0.22), sfx("badge", W("s5", 1), 0.2), sfx("buzz", W("s5", 4), 0.26), sfx("ding", W("s5", 7), 0.22)],
  },
  // ------------------------------------------------------------------ s6 · projeto no Senado: você acha justo?
  {
    id: "scene-06-senado",
    startFrame: sc(5).from,
    durationInFrames: sc(5).durationInFrames,
    voKey: "s6",
    narration: "E já tem projeto no Senado pra aumentar o valor pra mãe de gêmeos. Você acha justo?",
    camera: { projection: "perspective", movement: "orbit", keys: [key(0, P.gavel), key(W("s6", 14) - 2, P.gavel), key(W("s6", 14) + 6, P.bia, "out"), key(end(5), P.bia)] },
    objects: [...SYSTEM(), o("stageGavel", "martelo-do-senado")],
    animations: [
      ...whip(0),
      spring("gavel.pop", 2, 22, 0, 1, 8),
      lerp("gavel.hit", 0, 1, 0, 0),
      lerp("bia.scratch", 0, 1, 0, 0),
      lerp("bia.hop", W("s6", 14), W("s6", 14) + 4, 0, 1, "out"),
      ...punch(W("s6", 14), 0.7),
    ],
    badges: [
      { text: "PROJETO DE LEI 5381/2026", variant: "info", subtitle: "ainda não é lei", appearAt: W("s6", 3), disappearAt: W("s6", 14) },
      { text: "VOCÊ ACHA JUSTO?", variant: "warning", icon: "?", appearAt: W("s6", 14), disappearAt: end(5) },
    ],
    bigWords: [
      { text: "+50% PRA GÊMEOS?", at: W("s6", 7), until: W("s6", 14), color: GOLD, size: 120, y: 420, tilt: -4 },
      { text: "JUSTO?", at: W("s6", 14), until: end(5), color: Y, size: 220, y: 420, tilt: -6 },
    ],
    highlights: ["PROJETO", "SENADO", "AUMENTAR", "VALOR", "MÃE", "GÊMEOS", "JUSTO"],
    captions: [
      { text: "E já tem projeto no Senado pra aumentar o valor pra mãe de gêmeos.", from: voLocal("s6"), to: W("s6", 14) },
      { text: "Você acha justo?", from: W("s6", 14), to: end(5) },
    ],
    audioCues: [narration("s6", "ready"), sfx("whoosh", 0, 0.22), sfx("pop", 4, 0.2), sfx("badge", W("s6", 3), 0.2), sfx("ding", W("s6", 7), 0.22), sfx("boing", W("s6", 14), 0.22)],
  },
  // ------------------------------------------------------------------ s7 · comenta + marca + siga
  {
    id: "scene-07-final",
    startFrame: sc(6).from,
    durationInFrames: sc(6).durationInFrames,
    voKey: "s7",
    narration: "Comenta aí, marca uma mãe de gêmeos, e siga o Advogado de Bolso em todas as redes!",
    camera: { projection: "perspective", movement: "dolly-out", keys: [key(0, P.familyLow), key(W("s7", 8), P.familyLow), key(W("s7", 16) + 20, P.final, "inOut"), key(end(6), P.final)] },
    objects: [...SYSTEM()],
    animations: [
      lerp("bia.hop", 0, 4, 1, 0, "in"),
      lerp("hearts", 2, 10, 0, 0.7, "out"),
      lerp("bia.dance", 2, 8, 0, 1, "out"),
      lerp("gemeo1.dance", 4, 10, 0, 1, "out"),
      lerp("gemeo2.dance", 6, 12, 0, 1, "out"),
      spring("comment", W("s7", 0), W("s7", 0) + 22, 0, 1, 8),
      lerp("comment", W("s7", 8) - 4, W("s7", 8) + 4, 1, 0, "in"),
      spring("follow", W("s7", 8), W("s7", 8) + 22, 0, 1, 8),
      lerp("follow", end(6) - 58, end(6) - 50, 1, 0, "in"),
      lerp("hearts", end(6) - 60, end(6) - 40, 0.7, 0, "in"),
      spring("endcard", end(6) - 52, end(6) - 22, 0, 1, 10),
    ],
    badges: [],
    highlights: ["COMENTA", "MARCA", "MÃE", "GÊMEOS", "SIGA", "ADVOGADO", "BOLSO", "REDES"],
    captions: [{ text: "Comenta aí, marca uma mãe de gêmeos, e siga o Advogado de Bolso em todas as redes!", from: voLocal("s7"), to: end(6) - 52 }],
    audioCues: [narration("s7", "ready"), sfx("pop", W("s7", 0), 0.26), sfx("shimmer", 4, 0.18), sfx("ding", W("s7", 8), 0.22), sfx("final", end(6) - 52, 0.3)],
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
