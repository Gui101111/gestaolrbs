import { evaluateTrack, orbit, type EaseName, type TrackAnimation, type Vec3 } from "../utils/animation";
import { L } from "../layout";
import { DURATION, FPS, HEIGHT, SCENE_FRAMES, voLocal, WIDTH, wordLocal, type VoKey } from "../utils/timing";

// EP03 · Auxílio por incapacidade temporária — série de 5 vídeos pedida pelo usuário em 31/10/2026 ("pode começar").
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

/** Cenário fixo: ilha, depósito, INSS, cofrinho, cano do salário e Marcos. */
const SYSTEM = (): SceneObject[] => [
  o("island", "diorama-ilha-flutuante"),
  o("warehouse", "deposito-empresa"),
  o("inss", "predio-inss"),
  o("piggy", "cofrinho-janela-de-corte"),
  o("salaryPipe", "cano-salario-prata+valvula"),
  o("coins", "moedas-instanciadas"),
  o("marcos", "personagem-low-poly"),
];
const SICK = o("sickPipe", "cano-azul-do-auxilio");
const BED = o("bed", "cama");
const MARCOS_HEAD: Vec3 = [L.work[0], 1.95, L.work[2]];

const P = {
  far: orbit([0, 1.4, -1.0], 46, 30, 32),
  hook: orbit([0.2, 1.4, 2.0], 17, 22, 20),
  hookPunch: orbit([0.2, 1.4, 2.2], 14, 18, 18),
  hookUp: orbit([0.2, 2.2, 0.5], 24, 12, 22),
  work: orbit([-2.45, 1.35, -1.85], 9.5, 22, 10),
  workClose: orbit([-2.5, 1.45, -1.8], 6, 14, 8),
  bed: orbit([-0.9, 0.9, 2.7], 7.5, 38, 24),
  bedClose: orbit([-0.7, 1.1, 2.6], 5.2, 28, 26),
  warehousePipe: orbit([-1.3, 2.0, -2.2], 17, 14, 16),
  pipesWide: orbit([0.4, 1.8, -1.0], 26, 8, 22),
  inssClose: orbit([2.2, 2.4, -2.6], 13, -12, 12),
  piggy: orbit([1.55, 1.45, 2.2], 14, 25, 14),
  piggyR: orbit([1.55, 1.45, 2.2], 14, 5, 14),
  row: orbit([1.3, 0.6, 3.5], 6.5, 4, 22),
  coin: orbit([1.3, 3.3, 2.0], 11.5, 12, 8),
  gate: orbit([3.0, 0.9, -2.3], 14, 40, 18),
  gateR: orbit([2.6, 0.9, -2.3], 13, 25, 16),
  final: orbit([0, 1.4, -1.2], 46, 40, 30),
  finalClose: orbit([L.work[0], 1.35, L.work[2]], 5.2, 18, 8),
};

export const scenes: ScenePlan[] = [
  // ------------------------------------------------------------------ s1 · gancho
  {
    id: "scene-01-gancho",
    startFrame: sc(0).from,
    durationInFrames: sc(0).durationInFrames,
    voKey: "s1",
    narration: "Ficou doente e não consegue trabalhar? O INSS pode pagar enquanto você se recupera.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.far), key(22, P.hook, "out"), key(W("s1", 7) - 4, P.hookPunch, "soft"), key(end(0), P.hookUp, "soft")] },
    objects: [...SYSTEM(), SICK, BED],
    animations: [
      lerp("marcos.spot", 0, 1, 0, 0),
      lerp("marcos.lie", 0, 1, 1, 1),
      lerp("marcos.pain", 0, 1, 1, 1),
      lerp("pipeSick.grow", 0, 1, 1, 1),
      lerp("coins.sick.flow", 0, 1, 1, 1),
      lerp("coins.salary.flow", 0, 1, 0, 0),
      lerp("salaryValve.closed", 0, 1, 1, 1),
      lerp("piggy.level", 0, 1, 0.5, 0.5),
      spring("inss.glow", W("s1", 7), W("s1", 7) + 24, 0, 1, 8),
      ...punch(W("s1", 7)),
      lerp("coinRain", W("s1", 8), W("s1", 8) + 10, 0, 1, "out"),
      lerp("coinRain", end(0) - 14, end(0) - 2, 1, 0, "in"),
      lerp("rewind", end(0) - 10, end(0), 0, 1, "in"),
    ],
    badges: [
      { text: "FICOU DOENTE?", variant: "warning", icon: "?", appearAt: W("s1", 0), disappearAt: W("s1", 7) - 2 },
      { text: "O INSS PODE PAGAR", variant: "positive", appearAt: W("s1", 7), disappearAt: end(0) },
    ],
    bigWords: [{ text: "SEM TRABALHAR?", at: W("s1", 3), until: W("s1", 7) - 2, color: Y, size: 104 }],
    highlights: ["DOENTE", "TRABALHAR", "INSS", "RECUPERA"],
    captions: [{ text: "Ficou doente e não consegue trabalhar? O INSS pode pagar enquanto você se recupera.", from: voLocal("s1"), to: end(0) }],
    audioCues: [narration("s1", "ready"), sfx("whoosh-big", 0, 0.3), sfx("badge", W("s1", 0), 0.24), sfx("pop", W("s1", 7), 0.28), sfx("coin", W("s1", 8), 0.22), sfx("rewind", end(0) - 10, 0.28)],
  },
  // ------------------------------------------------------------------ s2 · a coluna travou
  {
    id: "scene-02-coluna",
    startFrame: sc(1).from,
    durationInFrames: sc(1).durationInFrames,
    voKey: "s2",
    narration: "Esse é o Marcos. Ele trabalha de carteira assinada e, de repente, a coluna travou: hérnia de disco.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.hookUp), key(12, P.work, "out"), key(W("s2", 11), P.work), key(W("s2", 13), P.workClose, "out"), key(end(1), P.workClose)] },
    objects: [...SYSTEM(), SICK, BED],
    animations: [
      lerp("rewind", 0, 10, 1, 0, "out"),
      ...whip(0),
      lerp("marcos.lie", 0, 8, 1, 0, "inOut"),
      lerp("marcos.spot", 0, 8, 0, 1, "inOut"),
      lerp("marcos.pain", 0, 4, 1, 0, "in"),
      lerp("pipeSick.grow", 0, 10, 1, 0, "in"),
      lerp("coins.sick.flow", 0, 6, 1, 0, "linear"),
      lerp("salaryValve.closed", 0, 8, 1, 0, "out"),
      lerp("coins.salary.flow", 4, 12, 0, 1, "linear"),
      lerp("piggy.level", 0, 10, 0.5, 0.3, "linear"),
      lerp("marcos.work", 12, 22, 0, 1, "inOut"),
      lerp("marcos.work", W("s2", 11), W("s2", 11) + 4, 1, 0, "in"),
      ...flash(W("s2", 11), 0.6),
      lerp("marcos.bend", W("s2", 11), W("s2", 11) + 6, 0, 1, "out"),
      lerp("marcos.pain", W("s2", 11), W("s2", 11) + 6, 0, 1, "out"),
      lerp("camera.shake", W("s2", 11), W("s2", 11) + 4, 0, 1, "out"),
      lerp("camera.shake", W("s2", 11) + 4, W("s2", 11) + 14, 1, 0, "in"),
      lerp("vignette.red", W("s2", 11), W("s2", 11) + 12, 0, 0.5, "inOut"),
      ...punch(W("s2", 14)),
    ],
    badges: [
      { text: "CARTEIRA ASSINADA", variant: "info", appearAt: W("s2", 7), disappearAt: W("s2", 15) - 2 },
      { text: "HÉRNIA DE DISCO", variant: "negative", appearAt: W("s2", 15), disappearAt: end(1) },
    ],
    bigWords: [{ text: "TRAVOU!", at: W("s2", 14), until: W("s2", 15) + 8, color: R, size: 170, tilt: -8 }],
    labels: [{ text: "MARCOS", point: MARCOS_HEAD, at: W("s2", 3), until: W("s2", 7), off: [-170, -70], accent: Y }],
    highlights: ["MARCOS", "CARTEIRA", "ASSINADA", "COLUNA", "TRAVOU", "HÉRNIA"],
    captions: [{ text: "Esse é o Marcos. Ele trabalha de carteira assinada e, de repente, a coluna travou: hérnia de disco.", from: voLocal("s2"), to: end(1) }],
    audioCues: [narration("s2", "ready"), sfx("whoosh", 0, 0.26), sfx("pop", W("s2", 3), 0.22), sfx("badge", W("s2", 7), 0.22), sfx("thud", W("s2", 11), 0.36), sfx("crack", W("s2", 14), 0.26), sfx("badge", W("s2", 15), 0.22)],
  },
  // ------------------------------------------------------------------ s3 · atestado
  {
    id: "scene-03-atestado",
    startFrame: sc(2).from,
    durationInFrames: sc(2).durationInFrames,
    voKey: "s3",
    narration: "O médico deu 60 dias de atestado. E agora, quem paga?",
    camera: { projection: "perspective", movement: "tracking", keys: [key(0, P.workClose), key(10, P.bed, "out"), key(W("s3", 6), P.bed), key(end(2), P.bedClose, "soft")] },
    objects: [...SYSTEM(), BED, o("atestado", "atestado-medico")],
    animations: [
      ...whip(0),
      lerp("marcos.bend", 0, 8, 1, 0, "inOut"),
      lerp("marcos.spot", 0, 8, 1, 0, "inOut"),
      lerp("marcos.lie", 2, 10, 0, 1, "inOut"),
      spring("atestado.pop", W("s3", 3) - 4, W("s3", 3) + 20, 0, 1, 9),
      ...punch(W("s3", 3)),
      lerp("vignette.red", W("s3", 6), W("s3", 6) + 10, 0.5, 0.25, "inOut"),
    ],
    badges: [{ text: "QUEM PAGA?", variant: "warning", icon: "?", appearAt: W("s3", 6), disappearAt: end(2) }],
    bigWords: [{ text: "60 DIAS", at: W("s3", 3), until: W("s3", 6) - 2, color: Y, size: 170 }],
    highlights: ["MÉDICO", "60 DIAS", "ATESTADO", "PAGA"],
    captions: [{ text: "O médico deu 60 dias de atestado. E agora, quem paga?", from: voLocal("s3"), to: end(2) }],
    audioCues: [narration("s3", "ready"), sfx("whoosh", 0, 0.24), sfx("pop", W("s3", 3), 0.24), sfx("ding", W("s3", 3) + 2, 0.22), sfx("badge", W("s3", 6), 0.22)],
  },
  // ------------------------------------------------------------------ s4 · 15 primeiros dias: empresa
  {
    id: "scene-04-empresa",
    startFrame: sc(3).from,
    durationInFrames: sc(3).durationInFrames,
    voKey: "s4",
    narration: "Os primeiros 15 dias, quem paga é a empresa.",
    camera: { projection: "perspective", movement: "tracking", keys: [key(0, P.bedClose), key(10, P.warehousePipe, "out"), key(end(3), P.piggy, "soft")] },
    objects: [...SYSTEM(), BED, o("calendar", "calendario-3d")],
    animations: [
      ...whip(0),
      lerp("atestado.pop", 0, 8, 1, 0, "in"),
      lerp("vignette.red", 0, 10, 0.25, 0, "out"),
      lerp("coins.salary.flow", 0, 1, 1, 1),
      lerp("piggy.level", 0, end(3), 0.3, 0.42, "linear"),
      spring("calendar.pop", W("s4", 2) - 6, W("s4", 2) + 14, 0, 1, 9),
      lerp("calendar.flip", 0, 1, 0, 0),
      lerp("calendar.flip", W("s4", 2), end(3), 0, 1, "linear"),
      ...punch(W("s4", 7)),
    ],
    badges: [{ text: "EMPRESA PAGA", variant: "positive", subtitle: "os primeiros 15 dias", appearAt: W("s4", 3), disappearAt: end(3) }],
    bigWords: [{ text: "15 DIAS", at: W("s4", 2), until: W("s4", 3) + 6, color: Y, size: 170 }],
    labels: [{ text: "EMPRESA", point: [L.warehouse[0], 4.0, L.warehouse[2]], at: W("s4", 3), until: end(3), off: [0, -70], accent: "#bcd3ea" }],
    highlights: ["PRIMEIROS", "15 DIAS", "EMPRESA"],
    captions: [{ text: "Os primeiros 15 dias, quem paga é a empresa.", from: voLocal("s4"), to: end(3) }],
    audioCues: [narration("s4", "ready"), sfx("whoosh", 0, 0.24), sfx("tick", W("s4", 2), 0.22), sfx("tick", W("s4", 2) + 10, 0.22), sfx("badge", W("s4", 3), 0.22), sfx("coin", W("s4", 7), 0.22)],
  },
  // ------------------------------------------------------------------ s5 · 16º dia: INSS
  {
    id: "scene-05-inss",
    startFrame: sc(4).from,
    durationInFrames: sc(4).durationInFrames,
    voKey: "s5",
    narration: "A partir do décimo sexto dia, entra o INSS com o auxílio por incapacidade temporária, o antigo auxílio-doença.",
    camera: { projection: "perspective", movement: "orbit", keys: [key(0, P.piggy), key(W("s5", 5), P.pipesWide, "out"), key(W("s5", 8), P.inssClose, "out"), key(W("s5", 11), P.pipesWide, "soft"), key(end(4), P.piggy, "soft")] },
    objects: [...SYSTEM(), o("sickPipe", "cano-azul-do-auxilio", "inexistente", "aberto"), BED, o("calendar", "calendario-3d")],
    animations: [
      ...punch(W("s5", 3)),
      lerp("calendar.pop", W("s5", 5), W("s5", 5) + 8, 1, 0, "in"),
      lerp("salaryValve.closed", W("s5", 5), W("s5", 5) + 10, 0, 1, "out"),
      lerp("coins.salary.flow", W("s5", 5) + 4, W("s5", 5) + 14, 1, 0, "linear"),
      ...whip(W("s5", 6) - 4),
      spring("inss.glow", W("s5", 8), W("s5", 8) + 20, 0, 1, 7),
      ...flash(W("s5", 8), 0.6),
      lerp("speed", W("s5", 8), W("s5", 8) + 4, 0, 1, "out"),
      lerp("speed", W("s5", 8) + 18, W("s5", 8) + 26, 1, 0, "in"),
      lerp("pipeSick.grow", W("s5", 8), W("s5", 8) + 26, 0, 1, "out"),
      lerp("coins.sick.flow", W("s5", 8) + 22, W("s5", 8) + 32, 0, 1, "linear"),
      lerp("piggy.level", W("s5", 8) + 32, end(4), 0.42, 0.6, "linear"),
      ...punch(W("s5", 11)),
    ],
    badges: [
      { text: "AUXÍLIO POR INCAPACIDADE TEMPORÁRIA", variant: "positive", appearAt: W("s5", 11), disappearAt: end(4) },
      { text: "ANTIGO AUXÍLIO-DOENÇA", variant: "info", appearAt: W("s5", 16), disappearAt: end(4) },
    ],
    bigWords: [
      { text: "16º DIA", at: W("s5", 3), until: W("s5", 6), color: Y, size: 180 },
      { text: "INSS", at: W("s5", 8), until: W("s5", 11) - 2, color: "#5aa9f2", size: 200, y: 620 },
    ],
    highlights: ["16º", "INSS", "AUXÍLIO", "INCAPACIDADE", "TEMPORÁRIA", "AUXÍLIO-DOENÇA"],
    captions: [{ text: "A partir do décimo sexto dia, entra o INSS com o auxílio por incapacidade temporária, o antigo auxílio-doença.", from: voLocal("s5"), to: end(4) }],
    audioCues: [narration("s5", "ready"), sfx("ding", W("s5", 3), 0.22), sfx("clunk", W("s5", 5), 0.26), sfx("whoosh", W("s5", 6) - 4, 0.22), sfx("shimmer", W("s5", 8), 0.28), sfx("coin", W("s5", 8) + 24, 0.22), sfx("badge", W("s5", 11), 0.22), sfx("badge", W("s5", 16), 0.2)],
  },
  // ------------------------------------------------------------------ s6 · requisitos: +15 dias e perícia
  {
    id: "scene-06-requisitos",
    startFrame: sc(5).from,
    durationInFrames: sc(5).durationInFrames,
    voKey: "s6",
    narration: "Pra ter direito, a incapacidade precisa durar mais de 15 dias e ser avaliada pela perícia médica do INSS.",
    camera: { projection: "perspective", movement: "tracking", keys: [key(0, P.piggy), key(10, P.bed, "out"), key(W("s6", 11), P.bed), key(W("s6", 12), P.bedClose, "out"), key(end(5), P.bedClose)] },
    objects: [...SYSTEM(), SICK, BED, o("periciaBed", "documento+carimbo-da-pericia")],
    animations: [
      ...whip(0),
      lerp("marcos.pain", 0, 10, 1, 0.5, "inOut"),
      ...punch(W("s6", 9)),
      lerp("pericia.drop", W("s6", 11), W("s6", 14), 0, 1, "in"),
      lerp("pericia.mark", W("s6", 14), W("s6", 14) + 2, 0, 1, "linear"),
      ...flash(W("s6", 14), 0.5),
      ...punch(W("s6", 14)),
      lerp("pericia.drop", W("s6", 14) + 14, W("s6", 14) + 30, 1, 0, "inOut"),
    ],
    badges: [
      { text: "INCAPACIDADE POR MAIS DE 15 DIAS", variant: "info", appearAt: W("s6", 4), disappearAt: W("s6", 12) - 2 },
      { text: "PERÍCIA MÉDICA DO INSS", variant: "info", subtitle: "avalia a incapacidade", appearAt: W("s6", 14), disappearAt: end(5) },
    ],
    bigWords: [{ text: "+15 DIAS", at: W("s6", 9), until: W("s6", 12) - 2, color: Y, size: 170 }],
    highlights: ["DIREITO", "INCAPACIDADE", "15 DIAS", "PERÍCIA", "MÉDICA", "INSS"],
    captions: [{ text: "Pra ter direito, a incapacidade precisa durar mais de 15 dias e ser avaliada pela perícia médica do INSS.", from: voLocal("s6"), to: end(5) }],
    audioCues: [narration("s6", "ready"), sfx("whoosh", 0, 0.22), sfx("badge", W("s6", 4), 0.22), sfx("ding", W("s6", 9), 0.22), sfx("stamp", W("s6", 14), 0.4), sfx("badge", W("s6", 14) + 2, 0.22)],
  },
  // ------------------------------------------------------------------ s7 · carência
  {
    id: "scene-07-carencia",
    startFrame: sc(6).from,
    durationInFrames: sc(6).durationInFrames,
    voKey: "s7",
    narration: "Em regra, também precisa ter pelo menos 12 contribuições. Mas acidentes e algumas doenças graves dispensam essa carência.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.bedClose), key(10, P.row, "out"), key(W("s7", 8), P.row), key(end(6), orbit([1.3, 0.7, 3.5], 8.5, -10, 24), "soft")] },
    objects: [...SYSTEM(), SICK, BED, o("contrib", "12-contribuicoes")],
    animations: [
      ...whip(0),
      spring("contrib.pop", 6, 26, 0, 1, 9),
      lerp("contrib.count", W("s7", 4), W("s7", 7) + 20, 0, 12, "linear"),
      ...punch(W("s7", 7)),
      lerp("contrib.count", W("s7", 14), W("s7", 14) + 12, 12, 0, "in"),
      ...punch(W("s7", 14)),
    ],
    badges: [
      { text: "CARÊNCIA: 12 CONTRIBUIÇÕES", variant: "info", subtitle: "em regra", appearAt: W("s7", 7), disappearAt: W("s7", 9) - 2 },
      { text: "ACIDENTES E DOENÇAS GRAVES", variant: "positive", subtitle: "não precisam de carência", appearAt: W("s7", 9), disappearAt: end(6) },
    ],
    bigWords: [
      { text: "12", at: W("s7", 7), until: W("s7", 8) - 2, color: GOLD, size: 240, y: 560 },
      { text: "SEM CARÊNCIA", at: W("s7", 14), until: end(6), color: G, size: 120 },
    ],
    highlights: ["12 CONTRIBUIÇÕES", "ACIDENTES", "DOENÇAS", "GRAVES", "CARÊNCIA"],
    captions: [{ text: "Em regra, também precisa ter pelo menos 12 contribuições. Mas acidentes e algumas doenças graves dispensam essa carência.", from: voLocal("s7"), to: end(6) }],
    audioCues: [narration("s7", "ready"), sfx("whoosh", 0, 0.22), sfx("tick", W("s7", 4) + 6, 0.2), sfx("tick", W("s7", 4) + 14, 0.2), sfx("ding", W("s7", 7), 0.24), sfx("badge", W("s7", 9), 0.22), sfx("ding", W("s7", 14), 0.24)],
  },
  // ------------------------------------------------------------------ s8 · valor e duração
  {
    id: "scene-08-valor",
    startFrame: sc(7).from,
    durationInFrames: sc(7).durationInFrames,
    voKey: "s8",
    narration: "O valor, em regra, é de 91% do salário de benefício. E ele é pago até a pessoa se recuperar.",
    camera: { projection: "perspective", movement: "tracking", keys: [key(0, P.row), key(10, P.coin, "out"), key(W("s8", 11) - 2, P.coin), key(W("s8", 11) + 8, P.bed, "out"), key(W("s8", 15) + 8, P.bed), key(end(7), orbit([-1.8, 1.2, 0.4], 12, 24, 14), "soft")] },
    objects: [...SYSTEM(), SICK, BED, o("bigCoin", "moeda-gigante")],
    animations: [
      ...whip(0),
      lerp("contrib.pop", 0, 8, 1, 0, "in"),
      spring("bigCoin.pop", 6, 30, 0, 1, 9),
      lerp("bigCoin.spin", 6, W("s8", 6), 0, 720, "linear", "deg"),
      ...punch(W("s8", 6)),
      lerp("bigCoin.pop", W("s8", 11) - 6, W("s8", 11) + 4, 1, 0, "in"),
      ...whip(W("s8", 11)),
      lerp("marcos.lie", W("s8", 15), W("s8", 15) + 14, 1, 0, "inOut"),
      lerp("marcos.spot", W("s8", 15) + 10, end(7), 0, 1, "inOut"),
      lerp("marcos.pain", W("s8", 15), W("s8", 15) + 10, 0.5, 0, "out"),
      lerp("marcos.hop", W("s8", 19) - 4, W("s8", 19), 0, 1, "out"),
      lerp("marcos.thumb", W("s8", 19), W("s8", 19) + 10, 0, 1, "out"),
      lerp("pipeSick.grow", W("s8", 19), end(7), 1, 0, "in"),
      lerp("coins.sick.flow", W("s8", 19), W("s8", 19) + 6, 1, 0, "linear"),
      lerp("salaryValve.closed", W("s8", 19), W("s8", 19) + 8, 1, 0, "out"),
      lerp("coins.salary.flow", W("s8", 19) + 4, end(7), 0, 1, "linear"),
    ],
    badges: [
      { text: "91% DO SALÁRIO DE BENEFÍCIO", variant: "info", subtitle: "em regra", appearAt: W("s8", 6), disappearAt: W("s8", 11) },
      { text: "ATÉ SE RECUPERAR", variant: "positive", appearAt: W("s8", 15), disappearAt: end(7) },
    ],
    bigWords: [{ text: "91%", at: W("s8", 6), until: W("s8", 11) - 2, color: GOLD, size: 230, y: 560 }],
    highlights: ["VALOR", "91%", "SALÁRIO", "BENEFÍCIO", "RECUPERAR"],
    captions: [{ text: "O valor, em regra, é de 91% do salário de benefício. E ele é pago até a pessoa se recuperar.", from: voLocal("s8"), to: end(7) }],
    audioCues: [narration("s8", "ready"), sfx("whoosh", 0, 0.22), sfx("pop", 8, 0.22), sfx("ding", W("s8", 6), 0.24), sfx("whoosh", W("s8", 11), 0.22), sfx("badge", W("s8", 15), 0.22), sfx("coin", W("s8", 19) + 6, 0.2)],
  },
  // ------------------------------------------------------------------ s9 · quem pode receber
  {
    id: "scene-09-quem-pode",
    startFrame: sc(8).from,
    durationInFrames: sc(8).durationInFrames,
    voKey: "s9",
    narration: "Quem pode receber? Todo segurado do INSS: empregado, doméstico, autônomo, MEI, facultativo e segurado especial.",
    camera: { projection: "perspective", movement: "tracking", keys: [key(0, orbit([-1.8, 1.2, 0.4], 12, 24, 14)), key(10, P.gate, "out"), key(W("s9", 9), P.gate), key(end(8), P.gateR, "soft")] },
    objects: [...SYSTEM(), o("gate", "portao-catraca+luz"), o("pawns", "5-bonecos")],
    animations: [
      ...whip(0),
      lerp("marcos.thumb", 0, 8, 1, 0, "in"),
      lerp("marcos.work", 0, 10, 0, 1, "inOut"),
      spring("gate.pop", 4, 30, 0, 1, 9),
      lerp("queue.arrive", 10, 40, 0, 1, "inOut"),
      lerp("pawn1.pass", W("s9", 7) - 6, W("s9", 7) + 16, 0, 1, "inOut"),
      lerp("pawn2.pass", W("s9", 8) - 6, W("s9", 8) + 16, 0, 1, "inOut"),
      lerp("pawn3.pass", W("s9", 9) - 6, W("s9", 9) + 16, 0, 1, "inOut"),
      lerp("pawn5.pass", W("s9", 10) - 6, W("s9", 10) + 16, 0, 1, "inOut"),
      lerp("pawn4.pass", W("s9", 13) - 6, W("s9", 13) + 16, 0, 1, "inOut"),
    ],
    badges: [
      { text: "QUEM PODE RECEBER?", variant: "warning", icon: "?", appearAt: W("s9", 0), disappearAt: W("s9", 3) - 2 },
      { text: "TODO SEGURADO DO INSS", variant: "positive", appearAt: W("s9", 3), disappearAt: end(8) },
    ],
    bigWords: [
      { text: "EMPREGADO", at: W("s9", 7), until: W("s9", 8), color: G, size: 120 },
      { text: "DOMÉSTICO", at: W("s9", 8), until: W("s9", 9), color: G, size: 120 },
      { text: "AUTÔNOMO", at: W("s9", 9), until: W("s9", 10), color: G, size: 120 },
      { text: "MEI", at: W("s9", 10), until: W("s9", 11), color: G, size: 170 },
      { text: "FACULTATIVO", at: W("s9", 11), until: W("s9", 13), color: G, size: 106 },
      { text: "SEGURADO ESPECIAL", at: W("s9", 13), until: end(8), color: G, size: 80 },
    ],
    highlights: ["RECEBER", "SEGURADO", "INSS", "EMPREGADO", "DOMÉSTICO", "AUTÔNOMO", "MEI", "FACULTATIVO", "ESPECIAL"],
    captions: [{ text: "Quem pode receber? Todo segurado do INSS: empregado, doméstico, autônomo, MEI, facultativo e segurado especial.", from: voLocal("s9"), to: end(8) }],
    audioCues: [
      narration("s9", "ready"),
      sfx("whoosh", 0, 0.22),
      sfx("badge", W("s9", 0), 0.22),
      sfx("badge", W("s9", 3), 0.22),
      sfx("ding", W("s9", 7), 0.18),
      sfx("ding", W("s9", 8), 0.18),
      sfx("ding", W("s9", 9), 0.18),
      sfx("ding", W("s9", 10), 0.18),
      sfx("ding", W("s9", 13), 0.18),
    ],
  },
  // ------------------------------------------------------------------ s10 · final
  {
    id: "scene-10-final",
    startFrame: sc(9).from,
    durationInFrames: sc(9).durationInFrames,
    voKey: "s10",
    narration: "Gostou da informação? Manda esse vídeo pra um amigo que você acha que se encaixa nessa situação.",
    camera: { projection: "perspective", movement: "dolly-out", keys: [key(0, P.gateR), key(14, P.final, "out"), key(W("s10", 11), P.final), key(W("s10", 11) + 30, P.finalClose, "out"), key(end(9), P.finalClose)] },
    objects: [...SYSTEM(), o("gate", "portao-catraca+luz", "visível", "encolhido"), o("pawns", "5-bonecos", "visíveis", "encolhidos")],
    animations: [
      ...whip(0),
      lerp("pawns.shrink", 0, 10, 0, 1, "in"),
      lerp("gate.pop", 0, 10, 1, 0, "in"),
      lerp("coinRain", 10, 20, 0, 1, "out"),
      lerp("coinRain", W("s10", 3) + 10, W("s10", 3) + 22, 1, 0, "in"),
      spring("share", W("s10", 3), W("s10", 3) + 24, 0, 1, 8),
      lerp("share", W("s10", 11) - 6, W("s10", 11) + 2, 1, 0, "in"),
      lerp("marcos.work", W("s10", 11), W("s10", 11) + 10, 1, 0, "inOut"),
      lerp("marcos.wave", W("s10", 11) + 10, W("s10", 11) + 20, 0, 1, "out"),
      lerp("marcos.thumb", W("s10", 11) + 14, W("s10", 11) + 26, 0, 1, "out"),
      spring("endcard", end(9) - 52, end(9) - 22, 0, 1, 10),
    ],
    badges: [
      { text: "GOSTOU DA INFORMAÇÃO?", variant: "warning", icon: "?", appearAt: W("s10", 0), disappearAt: W("s10", 3) - 2 },
      { text: "MANDA PRA UM AMIGO", variant: "positive", subtitle: "que se encaixa nessa situação", appearAt: W("s10", 3), disappearAt: end(9) - 54 },
    ],
    labels: [
      { text: "SALÁRIO", point: [0.6, 3.25, 0.6], at: 14, until: W("s10", 3), off: [-120, -90], accent: "#bcd3ea" },
      { text: "INSS", point: [2.8, 4.0, -4.6], at: 18, until: W("s10", 3), off: [0, -70], accent: "#2f7df6" },
    ],
    highlights: ["GOSTOU", "INFORMAÇÃO", "MANDA", "AMIGO"],
    captions: [{ text: "Gostou da informação? Manda esse vídeo pra um amigo que você acha que se encaixa nessa situação.", from: voLocal("s10"), to: end(9) - 52 }],
    audioCues: [narration("s10", "ready"), sfx("whoosh-big", 0, 0.24), sfx("badge", W("s10", 0), 0.22), sfx("coin", 16, 0.2), sfx("pop", W("s10", 3), 0.24), sfx("ding", W("s10", 3) + 4, 0.22), sfx("pop", W("s10", 11) + 2, 0.22), sfx("final", end(9) - 52, 0.3)],
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
