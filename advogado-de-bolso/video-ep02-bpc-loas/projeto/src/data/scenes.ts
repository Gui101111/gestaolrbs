import { evaluateTrack, orbit, type EaseName, type TrackAnimation, type Vec3 } from "../utils/animation";
import { EP } from "../layout";
import { DURATION, FPS, HEIGHT, SCENE_FRAMES, voLocal, WIDTH, wordLocal, type VoKey } from "../utils/timing";

// EP02 · BPC/LOAS — série de 5 vídeos pedida pelo usuário em 31/10/2026 ("pode começar").
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

/** Cenário fixo do episódio: ilha, casa da Dona Maria, INSS, cofrinho. */
const SYSTEM = (): SceneObject[] => [
  o("island", "diorama-ilha-flutuante"),
  o("home", "casa-da-dona-maria"),
  o("inss", "predio-inss"),
  o("piggy", "cofrinho-janela-de-corte"),
  o("coins", "moedas-instanciadas"),
];
const BPC_PIPE = o("accidentPipe", "cano-dourado-do-bpc");
const MARIA = o("maria", "dona-maria-66-anos");
const MARIA_HEAD: Vec3 = [EP.maria[0], 1.75, EP.maria[2]];

const P = {
  far: orbit([0, 1.4, -1.0], 46, 30, 32),
  hook: orbit([-0.6, 1.5, 0.2], 22, 18, 18),
  hookPunch: orbit([-0.6, 1.5, 0.2], 18, 14, 16),
  hookUp: orbit([0, 2.2, -0.5], 26, 12, 22),
  maria: orbit([-2.4, 1.1, -1.6], 6.5, 15, 8),
  mariaClose: orbit([-2.55, 1.3, -1.7], 4.2, 10, 6),
  family: orbit([-2.0, 1.0, -1.2], 8.5, 12, 12),
  table: orbit([-2.05, 0.95, -0.85], 5.2, 10, 26),
  goldPipe: orbit([1.4, 2.4, -0.8], 24, -15, 24),
  piggy: orbit([1.55, 1.45, 2.2], 14, 25, 14),
  piggyR: orbit([1.55, 1.45, 2.2], 14, 5, 14),
  gate: orbit([3.0, 0.9, -2.3], 14, 40, 18),
  gateR: orbit([2.6, 0.9, -2.3], 13, 25, 16),
  wcEnd: orbit([EP.endWc[0], 1.3, EP.endWc[2]], 6.5, 42, 24),
  coin: orbit([1.3, 3.3, 2.0], 11.5, 12, 8),
  cad: orbit([EP.cad[0], 1.35, EP.cad[2]], 5, 10, 12),
  final: orbit([0, 1.4, -1.2], 46, 40, 30),
  finalMaria: orbit([-2.5, 1.15, -1.6], 5.2, 15, 8),
};

export const scenes: ScenePlan[] = [
  // ------------------------------------------------------------------ s1 · gancho
  {
    id: "scene-01-gancho",
    startFrame: sc(0).from,
    durationInFrames: sc(0).durationInFrames,
    voKey: "s1",
    narration: "Você sabia que tem gente que recebe um salário mínimo por mês do INSS sem nunca ter contribuído?",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.far), key(22, P.hook, "out"), key(W("s1", 13) - 4, P.hookPunch, "soft"), key(end(0), P.hookUp, "soft")] },
    objects: [...SYSTEM(), BPC_PIPE, MARIA, o("calendar", "calendario-3d")],
    animations: [
      lerp("pipeAccident.grow", 0, 1, 1, 1),
      lerp("coins.accident.flow", 0, 1, 1, 1),
      lerp("piggy.level", 0, 1, 0.6, 0.6),
      lerp("maria.hop", 0, 1, 1, 1),
      lerp("maria.wave", 10, 22, 0, 1, "out"),
      lerp("coinRain", 0, 12, 0, 1, "out"),
      lerp("coinRain", end(0) - 14, end(0) - 2, 1, 0, "in"),
      spring("inss.glow", W("s1", 13), W("s1", 13) + 24, 0, 1, 8),
      ...punch(W("s1", 13)),
      spring("calendar.pop", W("s1", 10) - 10, W("s1", 10) + 14, 0, 1, 9),
      lerp("calendar.flip", W("s1", 10), W("s1", 14), 0, 1, "linear"),
      ...punch(W("s1", 14), 0.7),
      lerp("rewind", end(0) - 10, end(0), 0, 1, "in"),
    ],
    badges: [
      { text: "VOCÊ SABIA?", variant: "warning", icon: "?", appearAt: W("s1", 0), disappearAt: W("s1", 8) - 2 },
      { text: "1 SALÁRIO MÍNIMO POR MÊS", variant: "info", appearAt: W("s1", 8), disappearAt: end(0) },
    ],
    bigWords: [{ text: "SEM CONTRIBUIR?", at: W("s1", 14), until: end(0), color: Y, size: 104 }],
    highlights: ["SALÁRIO", "MÍNIMO", "INSS", "CONTRIBUÍDO"],
    captions: [{ text: "Você sabia que tem gente que recebe um salário mínimo por mês do INSS sem nunca ter contribuído?", from: voLocal("s1"), to: end(0) }],
    audioCues: [
      narration("s1", "ready"),
      sfx("whoosh-big", 0, 0.3),
      sfx("coin", 8, 0.22),
      sfx("badge", W("s1", 0), 0.24),
      sfx("coin", W("s1", 8), 0.22),
      sfx("pop", W("s1", 13), 0.28),
      sfx("ding", W("s1", 14), 0.24),
      sfx("rewind", end(0) - 10, 0.28),
    ],
  },
  // ------------------------------------------------------------------ s2 · Dona Maria
  {
    id: "scene-02-dona-maria",
    startFrame: sc(1).from,
    durationInFrames: sc(1).durationInFrames,
    voKey: "s2",
    narration: "Essa é a Dona Maria. Ela tem 66 anos e nunca pagou o INSS.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.hookUp), key(12, P.maria, "out"), key(W("s2", 7) - 4, P.maria), key(W("s2", 7) + 6, P.mariaClose, "out"), key(end(1), P.maria, "soft")] },
    objects: [...SYSTEM(), BPC_PIPE, MARIA],
    animations: [
      lerp("rewind", 0, 10, 1, 0, "out"),
      ...whip(0),
      lerp("pipeAccident.grow", 0, 10, 1, 0, "in"),
      lerp("coins.accident.flow", 0, 6, 1, 0, "linear"),
      lerp("piggy.level", 0, 10, 0.6, 0.15, "linear"),
      lerp("maria.hop", 0, 6, 1, 0, "in"),
      lerp("calendar.pop", 0, 8, 1, 0, "in"),
      lerp("maria.wave", W("s2", 5), W("s2", 5) + 10, 1, 0, "inOut"),
      ...punch(W("s2", 7), 0.8),
      lerp("maria.sad", W("s2", 9), W("s2", 9) + 10, 0, 0.6, "inOut"),
    ],
    badges: [{ text: "NUNCA PAGOU O INSS", variant: "warning", appearAt: W("s2", 9), disappearAt: end(1) }],
    bigWords: [{ text: "66 ANOS", at: W("s2", 7), until: W("s2", 9) - 2, color: Y, size: 150 }],
    labels: [{ text: "DONA MARIA", point: MARIA_HEAD, at: W("s2", 3), until: W("s2", 7), off: [-170, -70], accent: Y }],
    highlights: ["MARIA", "66 ANOS", "NUNCA", "INSS"],
    captions: [{ text: "Essa é a Dona Maria. Ela tem 66 anos e nunca pagou o INSS.", from: voLocal("s2"), to: end(1) }],
    audioCues: [narration("s2", "ready"), sfx("whoosh", 0, 0.26), sfx("pop", W("s2", 3), 0.22), sfx("ding", W("s2", 7), 0.24), sfx("badge", W("s2", 9), 0.22)],
  },
  // ------------------------------------------------------------------ s3 · renda apertada
  {
    id: "scene-03-renda-apertada",
    startFrame: sc(2).from,
    durationInFrames: sc(2).durationInFrames,
    voKey: "s3",
    narration: "Ela mora com o filho, e a renda da casa é bem apertada.",
    camera: { projection: "perspective", movement: "tracking", keys: [key(0, P.maria), key(W("s3", 4) - 4, P.family, "out"), key(W("s3", 7), P.family), key(W("s3", 7) + 10, P.table, "out"), key(end(2), P.table)] },
    objects: [...SYSTEM(), MARIA, o("son", "filho"), o("incomeTable", "mesa-da-renda")],
    animations: [
      spring("son.pop", W("s3", 4) - 4, W("s3", 4) + 20, 0, 1, 9),
      spring("income.pop", W("s3", 7) - 6, W("s3", 7) + 18, 0, 1, 9),
      lerp("income.amount", 0, 1, 0.45, 0.45),
      lerp("income.amount", W("s3", 12) - 4, W("s3", 12) + 14, 0.45, 0.12, "inOut"),
      lerp("maria.sad", W("s3", 12), W("s3", 12) + 10, 0.6, 1, "inOut"),
      lerp("vignette.red", W("s3", 12) - 4, W("s3", 12) + 12, 0, 0.4, "inOut"),
      ...punch(W("s3", 12), 0.7),
    ],
    badges: [{ text: "RENDA APERTADA", variant: "negative", appearAt: W("s3", 7), disappearAt: end(2) }],
    labels: [{ text: "FILHO", point: [EP.son[0], 1.95, EP.son[2]], at: W("s3", 4), until: W("s3", 7), off: [150, -60], accent: G }],
    highlights: ["FILHO", "RENDA", "APERTADA"],
    captions: [{ text: "Ela mora com o filho, e a renda da casa é bem apertada.", from: voLocal("s3"), to: end(2) }],
    audioCues: [narration("s3", "ready"), sfx("pop", W("s3", 4), 0.22), sfx("coin", W("s3", 7), 0.2), sfx("badge", W("s3", 7), 0.22), sfx("buzz", W("s3", 12), 0.2)],
  },
  // ------------------------------------------------------------------ s4 · revelação BPC/LOAS
  {
    id: "scene-04-bpc",
    startFrame: sc(3).from,
    durationInFrames: sc(3).durationInFrames,
    voKey: "s4",
    narration: "É pra gente como ela que existe o BPC, também chamado de LOAS.",
    camera: { projection: "perspective", movement: "orbit", keys: [key(0, P.table), key(W("s4", 6), P.mariaClose, "out"), key(W("s4", 8) - 2, P.mariaClose), key(W("s4", 8) + 12, P.goldPipe, "out"), key(end(3), P.goldPipe)] },
    objects: [...SYSTEM(), o("accidentPipe", "cano-dourado-do-bpc", "inexistente", "aberto"), MARIA, o("son", "filho"), o("incomeTable", "mesa-da-renda")],
    animations: [
      ...whip(W("s4", 6) - 6),
      ...flash(W("s4", 8)),
      ...whip(W("s4", 8) + 1),
      lerp("speed", W("s4", 8), W("s4", 8) + 4, 0, 1, "out"),
      lerp("speed", W("s4", 8) + 18, W("s4", 8) + 28, 1, 0, "in"),
      lerp("vignette.red", W("s4", 8), W("s4", 8) + 10, 0.4, 0, "out"),
      lerp("maria.sad", W("s4", 8), W("s4", 8) + 10, 1, 0, "out"),
      lerp("pipeAccident.grow", W("s4", 8) + 2, W("s4", 8) + 26, 0, 1, "out"),
      lerp("pipeAccident.glow", W("s4", 8) + 2, W("s4", 8) + 14, 0, 1, "out"),
      lerp("coins.accident.flow", W("s4", 8) + 20, W("s4", 8) + 30, 0, 1, "linear"),
      ...punch(W("s4", 12)),
    ],
    badges: [{ text: "BENEFÍCIO DE PRESTAÇÃO CONTINUADA", variant: "info", appearAt: W("s4", 9), disappearAt: end(3) }],
    bigWords: [
      { text: "BPC", at: W("s4", 8), until: W("s4", 12) - 2, color: GOLD, size: 230, y: 600 },
      { text: "LOAS", at: W("s4", 12), until: end(3), color: GOLD, size: 200, y: 600 },
    ],
    highlights: ["BPC", "LOAS"],
    captions: [{ text: "É pra gente como ela que existe o BPC, também chamado de LOAS.", from: voLocal("s4"), to: end(3) }],
    audioCues: [narration("s4", "ready"), sfx("whoosh", W("s4", 6) - 6, 0.22), sfx("shimmer", W("s4", 8), 0.3), sfx("whoosh-big", W("s4", 8), 0.24), sfx("glow", W("s4", 8) + 4, 0.22), sfx("ding", W("s4", 12), 0.22)],
  },
  // ------------------------------------------------------------------ s5 · um salário mínimo por mês
  {
    id: "scene-05-valor",
    startFrame: sc(4).from,
    durationInFrames: sc(4).durationInFrames,
    voKey: "s5",
    narration: "Ele paga um salário mínimo todo mês pra quem não tem como se manter.",
    camera: { projection: "perspective", movement: "orbit", keys: [key(0, P.goldPipe), key(10, P.piggy, "out"), key(end(4), P.piggyR, "linear")] },
    objects: [...SYSTEM(), BPC_PIPE, MARIA, o("calendar", "calendario-3d")],
    animations: [
      ...whip(0),
      lerp("pipeAccident.glow", 10, 40, 1, 0.4, "inOut"),
      lerp("piggy.level", 0, end(4), 0.15, 0.5, "linear"),
      lerp("coinRain", W("s5", 3), W("s5", 3) + 8, 0, 1, "out"),
      lerp("coinRain", W("s5", 8), W("s5", 8) + 12, 1, 0, "in"),
      ...punch(W("s5", 3)),
      lerp("calendar.flip", 0, 1, 1, 0),
      spring("calendar.pop", W("s5", 5) - 8, W("s5", 5) + 14, 0, 1, 9),
      lerp("calendar.flip", W("s5", 5), W("s5", 8), 0, 1, "linear"),
    ],
    badges: [{ text: "1 SALÁRIO MÍNIMO", variant: "positive", subtitle: "todo mês", appearAt: W("s5", 3), disappearAt: end(4) }],
    highlights: ["SALÁRIO", "MÍNIMO", "MÊS", "MANTER"],
    captions: [{ text: "Ele paga um salário mínimo todo mês pra quem não tem como se manter.", from: voLocal("s5"), to: end(4) }],
    audioCues: [narration("s5", "ready"), sfx("whoosh", 0, 0.22), sfx("coin", W("s5", 3), 0.24), sfx("badge", W("s5", 3), 0.22), sfx("tick", W("s5", 5) + 2, 0.2), sfx("tick", W("s5", 6) + 6, 0.2)],
  },
  // ------------------------------------------------------------------ s6 · quem pode receber
  {
    id: "scene-06-quem-pode",
    startFrame: sc(5).from,
    durationInFrames: sc(5).durationInFrames,
    voKey: "s6",
    narration: "Quem pode receber? O idoso a partir de 65 anos e a pessoa com deficiência de qualquer idade.",
    camera: { projection: "perspective", movement: "tracking", keys: [key(0, P.piggyR), key(10, P.gate, "out"), key(W("s6", 11), P.gate), key(end(5), P.gateR, "soft")] },
    objects: [...SYSTEM(), BPC_PIPE, MARIA, o("gateEp", "portao-catraca+luz"), o("cadeirante", "pessoa-em-cadeira-de-rodas")],
    animations: [
      ...whip(0),
      lerp("maria.atGate", 0, 2, 0, 1, "linear"),
      lerp("calendar.pop", 0, 8, 1, 0, "in"),
      spring("gate.pop", 4, 30, 0, 1, 9),
      lerp("maria.pass", W("s6", 4), W("s6", 4) + 30, 0, 1, "inOut"),
      ...punch(W("s6", 8)),
      spring("wc.pop", W("s6", 10), W("s6", 10) + 20, 0, 1, 9),
      lerp("wc.pass", W("s6", 11), W("s6", 11) + 30, 0, 1, "inOut"),
      lerp("wc.wave", W("s6", 15), W("s6", 15) + 10, 0, 1, "out"),
      lerp("maria.wave", W("s6", 15), W("s6", 15) + 10, 0, 1, "out"),
    ],
    badges: [
      { text: "QUEM PODE RECEBER?", variant: "warning", icon: "?", appearAt: W("s6", 0), disappearAt: W("s6", 4) - 2 },
      { text: "IDOSO A PARTIR DE 65 ANOS", variant: "positive", appearAt: W("s6", 4), disappearAt: end(5) },
      { text: "PESSOA COM DEFICIÊNCIA", variant: "positive", subtitle: "de qualquer idade", appearAt: W("s6", 11), disappearAt: end(5) },
    ],
    bigWords: [{ text: "65+", at: W("s6", 8), until: W("s6", 10), color: G, size: 220, y: 560 }],
    highlights: ["RECEBER", "IDOSO", "65 ANOS", "DEFICIÊNCIA", "QUALQUER"],
    captions: [{ text: "Quem pode receber? O idoso a partir de 65 anos e a pessoa com deficiência de qualquer idade.", from: voLocal("s6"), to: end(5) }],
    audioCues: [
      narration("s6", "ready"),
      sfx("whoosh", 0, 0.22),
      sfx("pop", 6, 0.2),
      sfx("badge", W("s6", 0), 0.22),
      sfx("ding", W("s6", 4) + 15, 0.22),
      sfx("pop", W("s6", 8), 0.22),
      sfx("ding", W("s6", 11) + 15, 0.22),
      sfx("badge", W("s6", 11), 0.22),
    ],
  },
  // ------------------------------------------------------------------ s7 · regra de renda (1/4)
  {
    id: "scene-07-renda",
    startFrame: sc(6).from,
    durationInFrames: sc(6).durationInFrames,
    voKey: "s7",
    narration: "Mas tem regra de renda: em regra, a renda por pessoa da família precisa ser de até um quarto do salário mínimo.",
    camera: { projection: "perspective", movement: "tracking", keys: [key(0, P.gateR), key(10, P.family, "out"), key(W("s7", 8), P.table, "out"), key(W("s7", 16) - 4, P.table), key(W("s7", 16) + 6, P.coin, "out"), key(end(6), P.coin)] },
    objects: [...SYSTEM(), BPC_PIPE, MARIA, o("son", "filho"), o("incomeTable", "mesa-da-renda"), o("quarterCoin", "moeda-dividida-em-4")],
    animations: [
      ...whip(0),
      lerp("maria.atGate", 0, 2, 1, 0, "linear"),
      lerp("maria.wave", 0, 6, 1, 0, "in"),
      lerp("income.amount", 0, 1, 0.12, 0.5),
      lerp("income.split", W("s7", 9), W("s7", 12), 0, 1, "inOut"),
      ...punch(W("s7", 10), 0.6),
      ...whip(W("s7", 16) - 4),
      spring("quarter.pop", W("s7", 16) - 2, W("s7", 16) + 22, 0, 1, 9),
      lerp("quarter.spin", W("s7", 16) - 2, W("s7", 17), 0, 360, "out", "deg"),
      lerp("quarter.slice", W("s7", 17), W("s7", 17) + 14, 0, 1, "out"),
      ...punch(W("s7", 17)),
    ],
    badges: [
      { text: "RENDA POR PESSOA", variant: "info", subtitle: "renda da casa ÷ pessoas da família", appearAt: W("s7", 8), disappearAt: W("s7", 16) - 2 },
      { text: "ATÉ 1/4 DO SALÁRIO MÍNIMO", variant: "warning", subtitle: "em regra", appearAt: W("s7", 17), disappearAt: end(6) },
    ],
    bigWords: [{ text: "1/4", at: W("s7", 17), until: end(6), color: GOLD, size: 230, y: 560 }],
    highlights: ["RENDA", "PESSOA", "FAMÍLIA", "1/4", "SALÁRIO", "MÍNIMO"],
    captions: [{ text: "Mas tem regra de renda: em regra, a renda por pessoa da família precisa ser de até um quarto do salário mínimo.", from: voLocal("s7"), to: end(6) }],
    audioCues: [narration("s7", "ready"), sfx("whoosh", 0, 0.22), sfx("badge", W("s7", 8), 0.22), sfx("coin", W("s7", 9), 0.22), sfx("whoosh", W("s7", 16) - 4, 0.22), sfx("crack", W("s7", 17), 0.24), sfx("ding", W("s7", 17) + 2, 0.24)],
  },
  // ------------------------------------------------------------------ s8 · CadÚnico e avaliação
  {
    id: "scene-08-cadunico-avaliacao",
    startFrame: sc(7).from,
    durationInFrames: sc(7).durationInFrames,
    voKey: "s8",
    narration: "A família também precisa estar no Cadastro Único. E, pra pessoa com deficiência, tem avaliação médica e social.",
    camera: { projection: "perspective", movement: "tracking", keys: [key(0, P.coin), key(10, P.cad, "out"), key(W("s8", 8) - 4, P.cad), key(W("s8", 8) + 6, P.wcEnd, "out"), key(end(7), P.wcEnd)] },
    objects: [...SYSTEM(), BPC_PIPE, MARIA, o("son", "filho"), o("incomeTable", "mesa-da-renda"), o("cadCard", "cartao-cadastro-unico"), o("cadeirante", "pessoa-em-cadeira-de-rodas"), o("avaliacao", "documento+carimbo")],
    animations: [
      ...whip(0),
      lerp("quarter.pop", 0, 8, 1, 0, "in"),
      spring("cad.pop", W("s8", 6) - 4, W("s8", 6) + 20, 0, 1, 8),
      ...punch(W("s8", 6)),
      ...whip(W("s8", 8) - 4),
      lerp("cad.pop", W("s8", 8), W("s8", 8) + 6, 1, 0, "in"),
      lerp("pericia.drop", W("s8", 8) + 8, W("s8", 14), 0, 1, "in"),
      lerp("pericia.mark", W("s8", 14), W("s8", 14) + 2, 0, 1, "linear"),
      ...flash(W("s8", 14), 0.5),
      ...punch(W("s8", 14)),
      lerp("pericia.drop", W("s8", 14) + 14, W("s8", 14) + 30, 1, 0, "inOut"),
    ],
    badges: [
      { text: "CADASTRO ÚNICO", variant: "positive", subtitle: "família inscrita e atualizada", appearAt: W("s8", 6), disappearAt: W("s8", 8) },
      { text: "AVALIAÇÃO MÉDICA E SOCIAL", variant: "info", subtitle: "para a pessoa com deficiência", appearAt: W("s8", 14), disappearAt: end(7) },
    ],
    bigWords: [{ text: "CADÚNICO", at: W("s8", 6), until: W("s8", 8) - 2, color: G, size: 130 }],
    highlights: ["CADASTRO", "ÚNICO", "DEFICIÊNCIA", "AVALIAÇÃO", "MÉDICA", "SOCIAL"],
    captions: [{ text: "A família também precisa estar no Cadastro Único. E, pra pessoa com deficiência, tem avaliação médica e social.", from: voLocal("s8"), to: end(7) }],
    audioCues: [narration("s8", "ready"), sfx("whoosh", 0, 0.22), sfx("pop", W("s8", 6), 0.24), sfx("badge", W("s8", 6), 0.22), sfx("whoosh", W("s8", 8) - 4, 0.22), sfx("stamp", W("s8", 14), 0.4), sfx("badge", W("s8", 14) + 2, 0.22)],
  },
  // ------------------------------------------------------------------ s9 · atenção
  {
    id: "scene-09-atencao",
    startFrame: sc(8).from,
    durationInFrames: sc(8).durationInFrames,
    voKey: "s9",
    narration: "Atenção: o BPC não paga décimo terceiro e não deixa pensão.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.wcEnd), key(10, P.piggy, "out"), key(end(8), P.piggyR, "linear")] },
    objects: [...SYSTEM(), BPC_PIPE, MARIA, o("calendar", "calendario-3d")],
    animations: [
      ...whip(0),
      lerp("calendar.flip", 0, 1, 1, 0),
      spring("calendar.pop", 6, 26, 0, 1, 9),
      lerp("calendar.flip", W("s9", 3), W("s9", 6), 0, 1, "linear"),
      ...punch(W("s9", 5)),
      ...punch(W("s9", 8)),
      lerp("vignette.red", W("s9", 5), W("s9", 5) + 8, 0, 0.3, "out"),
      lerp("vignette.red", end(8) - 10, end(8), 0.3, 0, "in"),
    ],
    badges: [{ text: "ATENÇÃO", variant: "warning", appearAt: W("s9", 0), disappearAt: end(8) }],
    bigWords: [
      { text: "SEM 13º", at: W("s9", 5), until: W("s9", 8) - 2, color: R, size: 190 },
      { text: "NÃO DEIXA PENSÃO", at: W("s9", 8), until: end(8), color: R, size: 92 },
    ],
    highlights: ["ATENÇÃO", "BPC", "13º", "PENSÃO"],
    captions: [{ text: "Atenção: o BPC não paga décimo terceiro e não deixa pensão.", from: voLocal("s9"), to: end(8) }],
    audioCues: [narration("s9", "ready"), sfx("whoosh", 0, 0.22), sfx("badge", W("s9", 0), 0.22), sfx("buzz", W("s9", 5), 0.24), sfx("buzz", W("s9", 8), 0.24)],
  },
  // ------------------------------------------------------------------ s10 · final + compartilhar
  {
    id: "scene-10-final",
    startFrame: sc(9).from,
    durationInFrames: sc(9).durationInFrames,
    voKey: "s10",
    narration: "Gostou da informação? Manda esse vídeo pra um amigo que você acha que se encaixa nessa situação.",
    camera: { projection: "perspective", movement: "dolly-out", keys: [key(0, P.piggyR), key(14, P.final, "out"), key(W("s10", 11), P.final), key(W("s10", 11) + 30, P.finalMaria, "out"), key(end(9), P.finalMaria)] },
    objects: [...SYSTEM(), BPC_PIPE, MARIA, o("son", "filho")],
    animations: [
      ...whip(0),
      lerp("calendar.pop", 0, 8, 1, 0, "in"),
      lerp("coinRain", 10, 20, 0, 1, "out"),
      lerp("coinRain", W("s10", 3) + 10, W("s10", 3) + 22, 1, 0, "in"),
      lerp("piggy.level", 0, end(9), 0.5, 0.8, "linear"),
      spring("share", W("s10", 3), W("s10", 3) + 24, 0, 1, 8),
      lerp("share", W("s10", 11) - 6, W("s10", 11) + 2, 1, 0, "in"),
      lerp("maria.hop", W("s10", 11), W("s10", 11) + 4, 0, 1, "out"),
      lerp("maria.wave", W("s10", 11) + 10, W("s10", 11) + 20, 0, 1, "out"),
      lerp("son.thumb", W("s10", 11) + 14, W("s10", 11) + 26, 0, 1, "out"),
      spring("endcard", end(9) - 52, end(9) - 22, 0, 1, 10),
    ],
    badges: [
      { text: "GOSTOU DA INFORMAÇÃO?", variant: "warning", icon: "?", appearAt: W("s10", 0), disappearAt: W("s10", 3) - 2 },
      { text: "MANDA PRA UM AMIGO", variant: "positive", subtitle: "que se encaixa nessa situação", appearAt: W("s10", 3), disappearAt: end(9) - 54 },
    ],
    labels: [
      { text: "BPC / LOAS", point: [1.9, 3.5, 1.1], at: 14, until: W("s10", 3), off: [90, -150], accent: GOLD },
      { text: "INSS", point: [2.8, 4.0, -4.6], at: 18, until: W("s10", 3), off: [0, -70], accent: "#2f7df6" },
      { text: "DONA MARIA", point: MARIA_HEAD, at: 22, until: W("s10", 3), off: [-150, -80], accent: Y },
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
