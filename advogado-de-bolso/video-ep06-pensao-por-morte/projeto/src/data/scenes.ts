import { evaluateTrack, orbit, type EaseName, type TrackAnimation, type Vec3 } from "../utils/animation";
import { EP6, L } from "../layout";
import { DURATION, FPS, HEIGHT, SCENE_FRAMES, voLocal, WIDTH, wordLocal, type VoKey } from "../utils/timing";

// EP06 · Pensão por morte — série de 5 vídeos pedida pelo usuário em 31/10/2026 ("pode começar").
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

/** Cenário fixo: ilha, casa da família, INSS, cofrinho e a família da dona Rosa. */
const SYSTEM = (): SceneObject[] => [
  o("island", "diorama-ilha-flutuante"),
  o("home", "casa-da-familia"),
  o("inss", "predio-inss"),
  o("piggy", "cofrinho-janela-de-corte"),
  o("coins", "moedas-instanciadas"),
  o("rosa", "dona-rosa-e-filhos"),
];
const PIPE = o("accidentPipe", "cano-dourado-da-pensao");
const PHOTO = o("photo", "porta-retrato");
const JOSE_HEAD: Vec3 = [L.work[0], 1.95, L.work[2]];
const ROSA_HEAD: Vec3 = [EP6.rosa[0], 1.95, EP6.rosa[2]];
const B = "#5aa9f2";

const P = {
  far: orbit([0, 1.4, -1.0], 46, 30, 32),
  hook: orbit([-0.6, 1.5, 0.2], 22, 18, 18),
  hookPunch: orbit([-0.6, 1.5, 0.2], 18, 14, 16),
  hookUp: orbit([0, 2.2, -0.5], 26, 12, 22),
  jose: orbit([-2.3, 1.3, -1.5], 7, 15, 8),
  family: orbit([-1.95, 1.0, -1.3], 7.5, 12, 10),
  photo: orbit([-2.4, 1.45, -2.1], 4.6, 8, 6),
  goldPipe: orbit([1.4, 2.4, -0.8], 24, -15, 24),
  piggy: orbit([1.55, 1.45, 2.2], 14, 25, 14),
  piggyR: orbit([1.55, 1.45, 2.2], 14, 5, 14),
  gate: orbit([3.0, 0.9, -2.3], 14, 40, 18),
  gateR: orbit([2.6, 0.9, -2.3], 13, 25, 16),
  bar: orbit([1.3, 1.3, 3.75], 8.5, 8, 10),
  barClose: orbit([1.3, 1.4, 3.75], 6.8, -4, 8),
  final: orbit([0, 1.4, -1.2], 46, 40, 30),
  finalFamily: orbit([-1.9, 1.0, -1.2], 5.6, 15, 8),
};

export const scenes: ScenePlan[] = [
  // ------------------------------------------------------------------ s1 · gancho
  {
    id: "scene-01-gancho",
    startFrame: sc(0).from,
    durationInFrames: sc(0).durationInFrames,
    voKey: "s1",
    narration: "Sabia que, quando um segurado do INSS falece, a família pode receber uma pensão todo mês?",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.far), key(22, P.hook, "out"), key(W("s1", 9) - 4, P.hookPunch, "soft"), key(end(0), P.hookUp, "soft")] },
    objects: [...SYSTEM(), PIPE],
    animations: [
      lerp("pipeAccident.grow", 0, 1, 1, 1),
      lerp("coins.accident.flow", 0, 1, 1, 1),
      lerp("piggy.level", 0, 1, 0.6, 0.6),
      lerp("family.wave", 10, 22, 0, 1, "out"),
      spring("inss.glow", W("s1", 6), W("s1", 6) + 24, 0, 1, 8),
      ...punch(W("s1", 9)),
      lerp("coinRain", W("s1", 11), W("s1", 11) + 10, 0, 1, "out"),
      lerp("coinRain", end(0) - 14, end(0) - 2, 1, 0, "in"),
      lerp("rewind", end(0) - 10, end(0), 0, 1, "in"),
    ],
    badges: [
      { text: "VOCÊ SABIA?", variant: "warning", icon: "?", appearAt: W("s1", 0), disappearAt: W("s1", 9) - 2 },
      { text: "A FAMÍLIA PODE RECEBER", variant: "positive", appearAt: W("s1", 9), disappearAt: end(0) },
    ],
    bigWords: [{ text: "PENSÃO TODO MÊS", at: W("s1", 13), until: end(0), color: GOLD, size: 100 }],
    highlights: ["SEGURADO", "INSS", "FAMÍLIA", "PENSÃO", "MÊS"],
    captions: [{ text: "Sabia que, quando um segurado do INSS falece, a família pode receber uma pensão todo mês?", from: voLocal("s1"), to: end(0) }],
    audioCues: [narration("s1", "ready"), sfx("whoosh-big", 0, 0.3), sfx("badge", W("s1", 0), 0.24), sfx("badge", W("s1", 9), 0.22), sfx("coin", W("s1", 11), 0.22), sfx("ding", W("s1", 13), 0.22), sfx("rewind", end(0) - 10, 0.28)],
  },
  // ------------------------------------------------------------------ s2 · seu José
  {
    id: "scene-02-jose",
    startFrame: sc(1).from,
    durationInFrames: sc(1).durationInFrames,
    voKey: "s2",
    narration: "O seu José trabalhava de carteira assinada e sustentava a casa.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.hookUp), key(12, P.jose, "out"), key(W("s2", 7), P.jose), key(end(1), P.family, "soft")] },
    objects: [...SYSTEM(), PIPE, o("marcos", "seu-jose")],
    animations: [
      lerp("rewind", 0, 10, 1, 0, "out"),
      ...whip(0),
      lerp("family.wave", 0, 8, 1, 0, "in"),
      lerp("pipeAccident.grow", 0, 10, 1, 0, "in"),
      lerp("coins.accident.flow", 0, 6, 1, 0, "linear"),
      lerp("piggy.level", 0, 10, 0.6, 0.35, "linear"),
      lerp("marcos.spot", 0, 1, 1, 1),
      lerp("marcos.wave", W("s2", 2), W("s2", 2) + 10, 0, 1, "out"),
      lerp("marcos.wave", W("s2", 5), W("s2", 5) + 10, 1, 0, "inOut"),
      ...punch(W("s2", 8)),
      lerp("family.hop", W("s2", 8), W("s2", 8) + 4, 0, 1, "out"),
    ],
    badges: [
      { text: "CARTEIRA ASSINADA", variant: "info", appearAt: W("s2", 5), disappearAt: W("s2", 8) - 2 },
      { text: "SUSTENTAVA A CASA", variant: "info", appearAt: W("s2", 8), disappearAt: end(1) },
    ],
    labels: [{ text: "SEU JOSÉ", point: JOSE_HEAD, at: W("s2", 2), until: W("s2", 7), off: [-170, -70], accent: Y }],
    highlights: ["JOSÉ", "CARTEIRA", "ASSINADA", "SUSTENTAVA", "CASA"],
    captions: [{ text: "O seu José trabalhava de carteira assinada e sustentava a casa.", from: voLocal("s2"), to: end(1) }],
    audioCues: [narration("s2", "ready"), sfx("whoosh", 0, 0.26), sfx("pop", W("s2", 2), 0.22), sfx("badge", W("s2", 5), 0.22), sfx("badge", W("s2", 8), 0.2)],
  },
  // ------------------------------------------------------------------ s3 · falecimento (tom respeitoso)
  {
    id: "scene-03-falecimento",
    startFrame: sc(2).from,
    durationInFrames: sc(2).durationInFrames,
    voKey: "s3",
    narration: "Infelizmente, ele faleceu. E a dona Rosa ficou com os dois filhos pequenos.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.family), key(W("s3", 2) + 4, orbit([-2.3, 2.3, -1.8], 9, 14, 12), "soft"), key(W("s3", 3) + 6, orbit([-2.3, 2.0, -1.8], 8, 10, 10)), key(W("s3", 5) + 4, P.family, "soft"), key(end(2), P.family)] },
    objects: [...SYSTEM(), o("marcos", "seu-jose"), PHOTO],
    animations: [
      lerp("family.hop", 0, 6, 1, 0, "in"),
      lerp("mood.gray", W("s3", 0), W("s3", 0) + 20, 0, 0.8, "inOut"),
      lerp("marcos.fade", W("s3", 2), W("s3", 2) + 24, 0, 1, "inOut"),
      lerp("star.rise", W("s3", 2), W("s3", 2) + 70, 0, 1, "inOut"),
      spring("photo.pop", W("s3", 2) + 14, W("s3", 2) + 38, 0, 1, 12),
      lerp("family.sad", W("s3", 2), W("s3", 2) + 16, 0, 1, "inOut"),
    ],
    badges: [{ text: "DOIS FILHOS PEQUENOS", variant: "info", appearAt: W("s3", 10), disappearAt: end(2) }],
    labels: [{ text: "DONA ROSA", point: ROSA_HEAD, at: W("s3", 5), until: W("s3", 10), off: [160, -70], accent: "#ff8fc1" }],
    highlights: ["FALECEU", "ROSA", "FILHOS"],
    captions: [{ text: "Infelizmente, ele faleceu. E a dona Rosa ficou com os dois filhos pequenos.", from: voLocal("s3"), to: end(2) }],
    audioCues: [narration("s3", "ready"), sfx("shimmer", W("s3", 2) + 4, 0.16), sfx("pop", W("s3", 5), 0.16), sfx("badge", W("s3", 10), 0.18)],
  },
  // ------------------------------------------------------------------ s4 · revelação
  {
    id: "scene-04-pensao",
    startFrame: sc(3).from,
    durationInFrames: sc(3).durationInFrames,
    voKey: "s4",
    narration: "É pra isso que existe a pensão por morte.",
    camera: { projection: "perspective", movement: "orbit", keys: [key(0, P.family), key(W("s4", 6) - 2, P.family), key(W("s4", 6) + 12, P.goldPipe, "out"), key(end(3), P.goldPipe)] },
    objects: [...SYSTEM(), o("accidentPipe", "cano-dourado-da-pensao", "inexistente", "aberto"), PHOTO],
    animations: [
      lerp("mood.gray", W("s4", 4), W("s4", 6) + 4, 0.8, 0, "inOut"),
      lerp("family.sad", W("s4", 6), W("s4", 6) + 12, 1, 0, "inOut"),
      ...flash(W("s4", 6), 0.6),
      ...whip(W("s4", 6) + 1),
      lerp("pipeAccident.grow", W("s4", 6) + 2, W("s4", 6) + 26, 0, 1, "out"),
      lerp("pipeAccident.glow", W("s4", 6) + 2, W("s4", 6) + 14, 0, 1, "out"),
      lerp("coins.accident.flow", W("s4", 6) + 20, W("s4", 6) + 30, 0, 1, "linear"),
    ],
    badges: [],
    bigWords: [{ text: "PENSÃO POR MORTE", at: W("s4", 6), until: end(3), color: GOLD, size: 84, y: 640, tilt: -3 }],
    highlights: ["PENSÃO", "MORTE"],
    captions: [{ text: "É pra isso que existe a pensão por morte.", from: voLocal("s4"), to: end(3) }],
    audioCues: [narration("s4", "ready"), sfx("shimmer", W("s4", 6), 0.28), sfx("whoosh", W("s4", 6), 0.2), sfx("glow", W("s4", 6) + 4, 0.2)],
  },
  // ------------------------------------------------------------------ s5 · para quem
  {
    id: "scene-05-dependentes-de-quem",
    startFrame: sc(4).from,
    durationInFrames: sc(4).durationInFrames,
    voKey: "s5",
    narration: "Ela é paga aos dependentes de quem era segurado do INSS ou já era aposentado.",
    camera: { projection: "perspective", movement: "orbit", keys: [key(0, P.goldPipe), key(10, P.piggy, "out"), key(end(4), P.piggyR, "linear")] },
    objects: [...SYSTEM(), PIPE, PHOTO],
    animations: [
      ...whip(0),
      lerp("pipeAccident.glow", 10, 40, 1, 0.4, "inOut"),
      lerp("piggy.level", 0, end(4), 0.35, 0.6, "linear"),
      ...punch(W("s5", 4)),
      ...punch(W("s5", 8), 0.6),
      ...punch(W("s5", 14), 0.6),
    ],
    badges: [{ text: "PARA OS DEPENDENTES", variant: "positive", appearAt: W("s5", 4), disappearAt: end(4) }],
    bigWords: [
      { text: "SEGURADO", at: W("s5", 8), until: W("s5", 11), color: B, size: 130 },
      { text: "OU APOSENTADO", at: W("s5", 14), until: end(4), color: B, size: 106 },
    ],
    highlights: ["DEPENDENTES", "SEGURADO", "INSS", "APOSENTADO"],
    captions: [{ text: "Ela é paga aos dependentes de quem era segurado do INSS ou já era aposentado.", from: voLocal("s5"), to: end(4) }],
    audioCues: [narration("s5", "ready"), sfx("whoosh", 0, 0.22), sfx("badge", W("s5", 4), 0.22), sfx("ding", W("s5", 8), 0.2), sfx("ding", W("s5", 14), 0.2)],
  },
  // ------------------------------------------------------------------ s6 · dependentes (1ª classe)
  {
    id: "scene-06-dependentes",
    startFrame: sc(5).from,
    durationInFrames: sc(5).durationInFrames,
    voKey: "s6",
    narration: "Dependentes são o marido ou a esposa, o companheiro ou a companheira, e os filhos menores de 21 anos ou com deficiência.",
    camera: { projection: "perspective", movement: "tracking", keys: [key(0, P.piggyR), key(10, P.gate, "out"), key(W("s6", 12), P.gate), key(end(5), P.gateR, "soft")] },
    objects: [...SYSTEM(), PIPE, PHOTO, o("gateFam", "portao-catraca+luz")],
    animations: [
      ...whip(0),
      lerp("family.atGate", 0, 2, 0, 1, "linear"),
      spring("gate.pop", 4, 28, 0, 1, 9),
      lerp("rosa.pass", W("s6", 3), W("s6", 3) + 40, 0, 1, "inOut"),
      ...punch(W("s6", 3), 0.6),
      ...punch(W("s6", 8), 0.6),
      ...punch(W("s6", 14), 0.6),
      lerp("family.wave", W("s6", 14), W("s6", 14) + 10, 0, 1, "out"),
    ],
    badges: [
      { text: "QUEM SÃO OS DEPENDENTES?", variant: "warning", icon: "?", appearAt: W("s6", 0), disappearAt: W("s6", 3) - 2 },
      { text: "CÔNJUGE, COMPANHEIRO(A) E FILHOS", variant: "positive", appearAt: W("s6", 3), disappearAt: end(5) },
    ],
    bigWords: [
      { text: "MARIDO OU ESPOSA", at: W("s6", 3), until: W("s6", 7), color: G, size: 92 },
      { text: "COMPANHEIRO(A)", at: W("s6", 7), until: W("s6", 12), color: G, size: 100 },
      { text: "FILHOS ATÉ 21", at: W("s6", 14), until: W("s6", 18), color: G, size: 110 },
      { text: "OU COM DEFICIÊNCIA", at: W("s6", 18), until: end(5), color: G, size: 82 },
    ],
    highlights: ["DEPENDENTES", "MARIDO", "ESPOSA", "COMPANHEIRO", "COMPANHEIRA", "FILHOS", "21 ANOS", "DEFICIÊNCIA"],
    captions: [{ text: "Dependentes são o marido ou a esposa, o companheiro ou a companheira, e os filhos menores de 21 anos ou com deficiência.", from: voLocal("s6"), to: end(5) }],
    audioCues: [narration("s6", "ready"), sfx("whoosh", 0, 0.22), sfx("pop", 6, 0.2), sfx("badge", W("s6", 0), 0.22), sfx("ding", W("s6", 3), 0.2), sfx("ding", W("s6", 8), 0.2), sfx("ding", W("s6", 14), 0.2), sfx("ding", W("s6", 18), 0.2)],
  },
  // ------------------------------------------------------------------ s7 · pais e irmãos
  {
    id: "scene-07-pais-irmaos",
    startFrame: sc(6).from,
    durationInFrames: sc(6).durationInFrames,
    voKey: "s7",
    narration: "Na falta deles, entram os pais e, depois, os irmãos menores de 21 anos ou com deficiência, desde que dependessem dele.",
    camera: { projection: "perspective", movement: "tracking", keys: [key(0, P.gateR), key(W("s7", 5), P.gate, "soft"), key(end(6), P.gateR, "soft")] },
    objects: [...SYSTEM(), PIPE, PHOTO, o("gateFam", "portao-catraca+luz"), o("parents", "pais-do-jose")],
    animations: [
      lerp("family.wave", 0, 8, 1, 0, "in"),
      spring("parents.pop", W("s7", 3) - 6, W("s7", 3) + 16, 0, 1, 9),
      lerp("parents.pass", W("s7", 5), W("s7", 5) + 40, 0, 1, "inOut"),
      ...punch(W("s7", 5), 0.6),
      ...punch(W("s7", 9), 0.6),
      ...punch(W("s7", 16), 0.6),
    ],
    badges: [
      { text: "DEPOIS: PAIS", variant: "info", appearAt: W("s7", 5), disappearAt: W("s7", 9) - 2 },
      { text: "DEPOIS: IRMÃOS", variant: "info", subtitle: "menores de 21 anos ou com deficiência", appearAt: W("s7", 9), disappearAt: end(6) },
    ],
    bigWords: [
      { text: "NA FALTA DELES", at: W("s7", 1), until: W("s7", 5), color: Y, size: 100 },
      { text: "PAIS", at: W("s7", 5), until: W("s7", 9), color: G, size: 180 },
      { text: "IRMÃOS", at: W("s7", 9), until: W("s7", 16), color: G, size: 160 },
      { text: "SE DEPENDIAM DELE", at: W("s7", 16), until: end(6), color: Y, size: 88 },
    ],
    highlights: ["FALTA", "PAIS", "IRMÃOS", "21 ANOS", "DEFICIÊNCIA", "DEPENDESSEM"],
    captions: [{ text: "Na falta deles, entram os pais e, depois, os irmãos menores de 21 anos ou com deficiência, desde que dependessem dele.", from: voLocal("s7"), to: end(6) }],
    audioCues: [narration("s7", "ready"), sfx("badge", W("s7", 1), 0.2), sfx("pop", W("s7", 3), 0.2), sfx("ding", W("s7", 5), 0.2), sfx("ding", W("s7", 9), 0.2), sfx("badge", W("s7", 16), 0.2)],
  },
  // ------------------------------------------------------------------ s8 · valor (50% + 10%)
  {
    id: "scene-08-valor",
    startFrame: sc(7).from,
    durationInFrames: sc(7).durationInFrames,
    voKey: "s8",
    narration: "O valor, em regra, é de 50% da aposentadoria, mais 10% por dependente, até chegar a 100%.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.gateR), key(10, P.bar, "out"), key(end(7), P.barClose, "soft")] },
    objects: [...SYSTEM(), PIPE, PHOTO, o("percent", "barra-de-porcentagem")],
    animations: [
      ...whip(0),
      lerp("family.atGate", 0, 2, 1, 0, "linear"),
      spring("bar.pop", 6, 26, 0, 1, 9),
      lerp("bar.level", W("s8", 6) - 2, W("s8", 6) + 16, 0, 0.5, "out"),
      ...punch(W("s8", 6)),
      lerp("bar.level", W("s8", 10) - 2, W("s8", 10) + 10, 0.5, 0.6, "out"),
      ...punch(W("s8", 10), 0.7),
      lerp("bar.level", W("s8", 13), W("s8", 16) + 10, 0.6, 1, "inOut"),
      ...punch(W("s8", 16)),
    ],
    badges: [{ text: "50% + 10% POR DEPENDENTE", variant: "info", subtitle: "em regra, até 100%", appearAt: W("s8", 6), disappearAt: end(7) }],
    bigWords: [
      { text: "50%", at: W("s8", 6), until: W("s8", 10) - 2, color: GOLD, size: 220, y: 560 },
      { text: "+10%", at: W("s8", 10), until: W("s8", 13), color: GOLD, size: 200, y: 560 },
      { text: "ATÉ 100%", at: W("s8", 16), until: end(7), color: GOLD, size: 150, y: 560 },
    ],
    highlights: ["VALOR", "50%", "APOSENTADORIA", "10%", "DEPENDENTE", "100%"],
    captions: [{ text: "O valor, em regra, é de 50% da aposentadoria, mais 10% por dependente, até chegar a 100%.", from: voLocal("s8"), to: end(7) }],
    audioCues: [narration("s8", "ready"), sfx("whoosh", 0, 0.22), sfx("pop", 8, 0.2), sfx("ding", W("s8", 6), 0.24), sfx("ding", W("s8", 10), 0.22), sfx("ding", W("s8", 16), 0.24)],
  },
  // ------------------------------------------------------------------ s9 · exemplo: 80%
  {
    id: "scene-09-exemplo",
    startFrame: sc(8).from,
    durationInFrames: sc(8).durationInFrames,
    voKey: "s9",
    narration: "No caso da dona Rosa e dos dois filhos, são três dependentes: 80%.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.barClose), key(W("s9", 4), P.family, "out"), key(W("s9", 10), P.family), key(W("s9", 10) + 8, P.barClose, "out"), key(end(8), P.barClose)] },
    objects: [...SYSTEM(), PIPE, PHOTO, o("percent", "barra-de-porcentagem")],
    animations: [
      lerp("bar.level", 0, 8, 1, 0.5, "inOut"),
      ...whip(W("s9", 4) - 4),
      lerp("family.hop", W("s9", 4), W("s9", 4) + 4, 0, 1, "out"),
      lerp("family.wave", W("s9", 7), W("s9", 7) + 8, 0, 1, "out"),
      ...whip(W("s9", 10)),
      lerp("bar.level", W("s9", 11), W("s9", 11) + 8, 0.5, 0.6, "out"),
      lerp("bar.level", W("s9", 11) + 8, W("s9", 11) + 16, 0.6, 0.7, "out"),
      lerp("bar.level", W("s9", 11) + 16, W("s9", 12), 0.7, 0.8, "out"),
      ...punch(W("s9", 12)),
    ],
    badges: [{ text: "3 DEPENDENTES", variant: "positive", subtitle: "50% + 3 × 10%", appearAt: W("s9", 9), disappearAt: end(8) }],
    bigWords: [{ text: "80%", at: W("s9", 12), until: end(8), color: GOLD, size: 240, y: 560 }],
    labels: [{ text: "DONA ROSA + 2 FILHOS", point: ROSA_HEAD, at: W("s9", 4), until: W("s9", 10), off: [160, -80], accent: "#ff8fc1" }],
    highlights: ["ROSA", "FILHOS", "TRÊS", "DEPENDENTES", "80%"],
    captions: [{ text: "No caso da dona Rosa e dos dois filhos, são três dependentes: 80%.", from: voLocal("s9"), to: end(8) }],
    audioCues: [narration("s9", "ready"), sfx("whoosh", W("s9", 4) - 4, 0.22), sfx("pop", W("s9", 4), 0.2), sfx("badge", W("s9", 9), 0.22), sfx("whoosh", W("s9", 10), 0.22), sfx("ding", W("s9", 12), 0.26)],
  },
  // ------------------------------------------------------------------ s10 · duração
  {
    id: "scene-10-duracao",
    startFrame: sc(9).from,
    durationInFrames: sc(9).durationInFrames,
    voKey: "s10",
    narration: "Pro cônjuge, a duração depende da idade e do tempo de união: pode durar alguns anos ou a vida toda.",
    camera: { projection: "perspective", movement: "orbit", keys: [key(0, P.barClose), key(10, P.piggy, "out"), key(end(9), P.piggyR, "linear")] },
    objects: [...SYSTEM(), PIPE, PHOTO, o("calendar", "calendario-3d"), o("hourglass", "ampulheta")],
    animations: [
      ...whip(0),
      lerp("bar.pop", 0, 8, 1, 0, "in"),
      spring("hourglass.pop", 6, 28, 0, 1, 9),
      lerp("calendar.flip", 0, 1, 0, 0),
      spring("calendar.pop", W("s10", 3), W("s10", 3) + 20, 0, 1, 9),
      lerp("calendar.flip", W("s10", 3), end(9), 0, 1, "linear"),
      ...punch(W("s10", 6), 0.6),
      ...punch(W("s10", 9), 0.6),
      ...punch(W("s10", 17)),
    ],
    badges: [{ text: "PARA O CÔNJUGE", variant: "info", subtitle: "depende da idade e do tempo de união", appearAt: W("s10", 1), disappearAt: end(9) }],
    bigWords: [
      { text: "IDADE", at: W("s10", 6), until: W("s10", 9), color: Y, size: 170 },
      { text: "TEMPO DE UNIÃO", at: W("s10", 9), until: W("s10", 12), color: Y, size: 100 },
      { text: "ALGUNS ANOS", at: W("s10", 14), until: W("s10", 16), color: GOLD, size: 116 },
      { text: "OU A VIDA TODA", at: W("s10", 16), until: end(9), color: GOLD, size: 100 },
    ],
    highlights: ["CÔNJUGE", "DURAÇÃO", "IDADE", "UNIÃO", "ANOS", "VIDA", "TODA"],
    captions: [{ text: "Pro cônjuge, a duração depende da idade e do tempo de união: pode durar alguns anos ou a vida toda.", from: voLocal("s10"), to: end(9) }],
    audioCues: [narration("s10", "ready"), sfx("whoosh", 0, 0.22), sfx("pop", 8, 0.2), sfx("badge", W("s10", 1), 0.22), sfx("tick", W("s10", 6), 0.2), sfx("tick", W("s10", 9), 0.2), sfx("ding", W("s10", 16), 0.24)],
  },
  // ------------------------------------------------------------------ s11 · final
  {
    id: "scene-11-final",
    startFrame: sc(10).from,
    durationInFrames: sc(10).durationInFrames,
    voKey: "s11",
    narration: "Gostou da informação? Manda esse vídeo pra um amigo que você acha que se encaixa nessa situação.",
    camera: { projection: "perspective", movement: "dolly-out", keys: [key(0, P.piggyR), key(14, P.final, "out"), key(W("s11", 11), P.final), key(W("s11", 11) + 30, P.finalFamily, "out"), key(end(10), P.finalFamily)] },
    objects: [...SYSTEM(), PIPE, PHOTO],
    animations: [
      ...whip(0),
      lerp("hourglass.pop", 0, 8, 1, 0, "in"),
      lerp("calendar.pop", 0, 8, 1, 0, "in"),
      lerp("coinRain", 10, 20, 0, 1, "out"),
      lerp("coinRain", W("s11", 3) + 10, W("s11", 3) + 22, 1, 0, "in"),
      lerp("piggy.level", 0, end(10), 0.6, 0.85, "linear"),
      spring("share", W("s11", 3), W("s11", 3) + 24, 0, 1, 8),
      lerp("share", W("s11", 11) - 6, W("s11", 11) + 2, 1, 0, "in"),
      lerp("family.wave", W("s11", 11) + 10, W("s11", 11) + 20, 0, 1, "out"),
      lerp("family.hop", W("s11", 11), W("s11", 11) + 4, 0, 1, "out"),
      spring("endcard", end(10) - 52, end(10) - 22, 0, 1, 10),
    ],
    badges: [
      { text: "GOSTOU DA INFORMAÇÃO?", variant: "warning", icon: "?", appearAt: W("s11", 0), disappearAt: W("s11", 3) - 2 },
      { text: "MANDA PRA UM AMIGO", variant: "positive", subtitle: "que se encaixa nessa situação", appearAt: W("s11", 3), disappearAt: end(10) - 54 },
    ],
    labels: [
      { text: "PENSÃO POR MORTE", point: [1.9, 3.5, 1.1], at: 14, until: W("s11", 3), off: [60, -150], accent: GOLD },
      { text: "INSS", point: [2.8, 4.0, -4.6], at: 18, until: W("s11", 3), off: [0, -70], accent: "#2f7df6" },
    ],
    highlights: ["GOSTOU", "INFORMAÇÃO", "MANDA", "AMIGO"],
    captions: [{ text: "Gostou da informação? Manda esse vídeo pra um amigo que você acha que se encaixa nessa situação.", from: voLocal("s11"), to: end(10) - 52 }],
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
