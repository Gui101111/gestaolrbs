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

/** Cenário: praça do INSS com a urna, o Lucas (17 anos), o primo do grupo e o "pé-de-meia" gigante. */
const SYSTEM = (): SceneObject[] => [o("island", "diorama-ilha"), o("inss", "predio-inss"), o("warehouse", "galpao"), o("lucas", "lucas-17-anos"), o("primo", "primo-kevin")];
const URNA = o("urna", "urna-eletronica");
const MEIA = o("meia", "pe-de-meia-gigante");
const LUCAS_HEAD: Vec3 = [0.75, 1.9, -1.45];
const PRIMO_HEAD: Vec3 = [-0.35, 1.85, -1.05];
const RUMOR = "Mano, quem votou no Flávio vai PERDER O PÉ-DE-MEIA! kkkk é sério";
const CHAT = { title: "GRUPO DA TURMA 3º B", subtitle: "Primo Kevin, Duda, Gabi, +31" };

const P = {
  urna: orbit([1.1, 1.1, -1.6], 5.4, 25, 8),
  lucasLow: orbit([0.75, 1.65, -1.45], 5.8, 12, 2),
  plaza: orbit([0.25, 1.0, -1.4], 13.5, -6, 7),
  plazaLow: orbit([0.25, 1.45, -1.4], 13.5, -6, 4),
  primo: orbit([-0.35, 1.35, -1.05], 5.5, -4, 3),
  sock: orbit([-1.2, 0.95, -1.8], 9.5, 15, 8),
  sockClose: orbit([-1.2, 1.15, -1.8], 7.5, 15, 10),
  bar: orbit([1.15, 1.1, -1.5], 8, -10, 6),
  final: orbit([0.0, 1.4, -1.4], 30, 10, 18),
};

export const scenes: ScenePlan[] = [
  // ------------------------------------------------------------------ s1 · primeiro voto e o boato
  {
    id: "scene-01-gancho",
    startFrame: sc(0).from,
    durationInFrames: sc(0).durationInFrames,
    voKey: "s1",
    narration: "Esse é o Lucas, 17 anos. Votou pela primeira vez, no Flávio Bolsonaro, e já disseram que ele vai perder o Pé-de-Meia!",
    camera: { projection: "perspective", movement: "tracking", keys: [key(0, P.urna), key(W("s1", 13) - 6, P.urna), key(W("s1", 13) + 2, P.lucasLow, "out"), key(end(0), P.lucasLow)] },
    objects: [...SYSTEM(), URNA],
    animations: [
      lerp("meia.pop", 0, 1, 0, 0),
      lerp("urna.pop", 0, 1, 1, 1),
      lerp("urna.press", 3, 8, 0, 1, "in"),
      ...punch(8, 0.6),
      lerp("lucas.hop", 10, 14, 0, 1, "out"),
      lerp("lucas.hop", W("s1", 13) - 6, W("s1", 13), 1, 0, "in"),
      lerp("lucas.thumb", W("s1", 5), W("s1", 5) + 8, 0, 1, "out"),
      lerp("lucas.thumb", W("s1", 13) - 6, W("s1", 13), 1, 0, "in"),
      lerp("lucas.ry", W("s1", 13) - 6, W("s1", 13) + 2, 1.1, 0, "inOut", "rad"),
      spring("lucas.shock", W("s1", 18), W("s1", 18) + 16, 0, 1, 7),
      lerp("lucas.shock", W("s1", 18) + 16, end(0), 1, 0.3, "inOut"),
      lerp("lucas.sad", W("s1", 19), W("s1", 19) + 8, 0, 1, "inOut"),
    ],
    badges: [],
    bigWords: [{ text: "1º VOTO!", at: 6, until: W("s1", 5), color: G, size: 190, y: 1000, tilt: -5 }],
    labels: [{ text: "LUCAS · 17 ANOS", point: LUCAS_HEAD, at: W("s1", 3), until: W("s1", 13) - 4, off: [-60, -130], accent: GOLD }],
    chat: { ...CHAT, at: W("s1", 13) - 4, until: end(0), y: 260, msgs: [{ who: "Primo Kevin", text: RUMOR, at: W("s1", 13), fwd: true, color: "#c0392b" }] },
    highlights: ["LUCAS", "17", "PRIMEIRA", "VEZ", "FLÁVIO", "BOLSONARO", "PERDER", "PÉ-DE-MEIA"],
    captions: [{ text: "Esse é o Lucas, 17 anos. Votou pela primeira vez, no Flávio Bolsonaro, e já disseram que ele vai perder o Pé-de-Meia!", from: voLocal("s1"), to: end(0) }],
    audioCues: [narration("s1", "ready"), sfx("urna", 5, 0.32), sfx("pop", W("s1", 3), 0.18), sfx("ding", W("s1", 5), 0.2), sfx("plim", W("s1", 13), 0.3), sfx("boo", W("s1", 18), 0.2), sfx("boing", W("s1", 18) + 2, 0.18)],
  },
  // ------------------------------------------------------------------ s2 · será?
  {
    id: "scene-02-sera",
    startFrame: sc(1).from,
    durationInFrames: sc(1).durationInFrames,
    voKey: "s2",
    narration: "Será que é verdade? Bora entender.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.plaza), key(W("s2", 3) + 4, P.plaza), key(W("s2", 4), P.primo, "out"), key(end(1), P.primo)] },
    objects: [...SYSTEM(), URNA],
    animations: [...whip(0), lerp("primo.laugh", 2, 8, 0, 1, "out"), lerp("lucas.shock", 0, 6, 0.3, 0, "inOut")],
    badges: [{ text: "SERÁ QUE É VERDADE?", variant: "warning", icon: "?", appearAt: W("s2", 0), disappearAt: end(1) }],
    bigWords: [{ text: "SERÁ?", at: W("s2", 0), until: W("s2", 4), color: Y, size: 220, y: 480, tilt: -6 }],
    labels: [{ text: "PRIMO DO GRUPO", point: PRIMO_HEAD, at: W("s2", 4), until: end(1), off: [60, -120], accent: "#e74c3c" }],
    highlights: ["VERDADE", "ENTENDER"],
    captions: [{ text: "Será que é verdade? Bora entender.", from: voLocal("s2"), to: end(1) }],
    audioCues: [narration("s2", "ready"), sfx("whoosh", 0, 0.22), sfx("scratch", 2, 0.3), sfx("whoosh", W("s2", 4) - 2, 0.2)],
  },
  // ------------------------------------------------------------------ s3 · o que é o Pé-de-Meia
  {
    id: "scene-03-pe-de-meia",
    startFrame: sc(2).from,
    durationInFrames: sc(2).durationInFrames,
    voKey: "s3",
    narration: "O Pé-de-Meia é pra estudante do ensino médio de escola pública, com a família no Cadastro Único.",
    camera: { projection: "perspective", movement: "orbit", keys: [key(0, P.sock), key(W("s3", 4), P.sock), key(W("s3", 5) + 4, P.plaza, "soft"), key(end(2), P.plaza)] },
    objects: [...SYSTEM(), MEIA, o("cadStage", "cartao-cadastro-unico")],
    animations: [
      ...whip(0),
      lerp("primo.laugh", 0, 6, 1, 0, "in"),
      lerp("lucas.sad", 0, 6, 1, 0, "inOut"),
      spring("meia.pop", W("s3", 1) - 4, W("s3", 1) + 18, 0, 1, 7),
      lerp("meia.fill", 0, 1, 0, 0),
      lerp("lucas.wave", W("s3", 5), W("s3", 5) + 8, 0, 1, "out"),
      lerp("lucas.wave", W("s3", 11), W("s3", 11) + 8, 1, 0, "inOut"),
      lerp("cadStage.pop", 0, 1, 0, 0),
      spring("cadStage.pop", W("s3", 15) - 2, W("s3", 15) + 18, 0, 1, 8),
    ],
    badges: [
      { text: "ENSINO MÉDIO · ESCOLA PÚBLICA", variant: "info", appearAt: W("s3", 4), disappearAt: W("s3", 11) + 6 },
      { text: "FAMÍLIA NO CADASTRO ÚNICO", variant: "info", appearAt: W("s3", 13), disappearAt: end(2) },
    ],
    bigWords: [{ text: "PÉ-DE-MEIA", at: W("s3", 1), until: W("s3", 4) + 4, color: GOLD, size: 150, y: 460, tilt: -5 }],
    highlights: ["PÉ-DE-MEIA", "ESTUDANTE", "ENSINO", "MÉDIO", "ESCOLA", "PÚBLICA", "CADASTRO", "ÚNICO"],
    captions: [{ text: "O Pé-de-Meia é pra estudante do ensino médio de escola pública, com a família no Cadastro Único.", from: voLocal("s3"), to: end(2) }],
    audioCues: [narration("s3", "ready"), sfx("whoosh", 0, 0.22), sfx("boing", W("s3", 1), 0.26), sfx("badge", W("s3", 4), 0.2), sfx("pop", W("s3", 15), 0.22)],
  },
  // ------------------------------------------------------------------ s4 · quanto paga (a meia enche!)
  {
    id: "scene-04-valores",
    startFrame: sc(3).from,
    durationInFrames: sc(3).durationInFrames,
    voKey: "s4",
    narration: "Ele paga parcelas de 200 reais pela frequência, e mais mil reais por ano concluído, guardados até a formatura.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.sock), key(W("s4", 9), P.sockClose, "soft"), key(end(3), P.sockClose)] },
    objects: [...SYSTEM(), MEIA],
    animations: [
      ...whip(0),
      lerp("cadStage.pop", 0, 1, 0, 0),
      lerp("meia.fill", W("s4", 4), W("s4", 4) + 12, 0, 0.4, "out"),
      lerp("meia.fill", W("s4", 9), W("s4", 9) + 14, 0.4, 1, "out"),
      lerp("meia.pop", W("s4", 4), W("s4", 4) + 4, 1, 1.15, "out"),
      lerp("meia.pop", W("s4", 4) + 4, W("s4", 4) + 10, 1.15, 1, "inOut"),
      lerp("meia.pop", W("s4", 9), W("s4", 9) + 4, 1, 1.2, "out"),
      lerp("meia.pop", W("s4", 9) + 4, W("s4", 9) + 10, 1.2, 1, "inOut"),
      lerp("plazaCoins", W("s4", 9), W("s4", 9) + 8, 0, 1, "out"),
      lerp("plazaCoins", W("s4", 14), W("s4", 14) + 10, 1, 0, "in"),
    ],
    badges: [{ text: "GUARDADO ATÉ A FORMATURA", variant: "positive", appearAt: W("s4", 14), disappearAt: end(3) }],
    bigWords: [
      { text: "R$ 200", at: W("s4", 4), until: W("s4", 9) - 2, color: GOLD, size: 200, y: 460, tilt: -5 },
      { text: "+ R$ 1.000 POR ANO", at: W("s4", 9), until: W("s4", 14), color: G, size: 120, y: 460, tilt: -4 },
    ],
    highlights: ["PARCELAS", "200", "REAIS", "FREQUÊNCIA", "MIL", "ANO", "CONCLUÍDO", "FORMATURA"],
    captions: [
      { text: "Ele paga parcelas de 200 reais pela frequência,", from: voLocal("s4"), to: W("s4", 7) },
      { text: "e mais mil reais por ano concluído, guardados até a formatura.", from: W("s4", 7), to: end(3) },
    ],
    audioCues: [narration("s4", "ready"), sfx("whoosh", 0, 0.22), sfx("coin", W("s4", 4), 0.24), sfx("cash", W("s4", 9), 0.28), sfx("coin", W("s4", 9) + 4, 0.2), sfx("badge", W("s4", 14), 0.2)],
  },
  // ------------------------------------------------------------------ s5 · 80% de presença + ENEM
  {
    id: "scene-05-presenca",
    startFrame: sc(4).from,
    durationInFrames: sc(4).durationInFrames,
    voKey: "s5",
    narration: "A regra de ouro é ter pelo menos 80% de presença. E quem é do terceiro ano e faz o ENEM nos dois dias ganha mais 200.",
    camera: { projection: "perspective", movement: "orbit", keys: [key(0, P.bar), key(W("s5", 11), P.bar), key(W("s5", 11) + 8, P.plaza, "soft"), key(end(4), P.plaza)] },
    objects: [...SYSTEM(), MEIA, o("pctBar", "barra-de-presenca")],
    animations: [
      ...whip(0),
      lerp("plazaCoins", 0, 1, 0, 0),
      spring("pct.pop", 2, 22, 0, 1, 8),
      lerp("pct.level", 0, 1, 0, 0),
      lerp("pct.level", W("s5", 5), W("s5", 8) + 6, 0, 0.8, "out"),
      spring("lucas.ok", W("s5", 8) + 4, W("s5", 8) + 22, 0, 1, 7),
      lerp("lucas.ok", W("s5", 11), W("s5", 11) + 6, 1, 0, "in"),
      lerp("pct.pop", W("s5", 11), W("s5", 11) + 6, 1, 0, "in"),
      lerp("lucas.hop", W("s5", 20), W("s5", 20) + 4, 0, 1, "out"),
      lerp("lucas.hop", W("s5", 24) + 4, W("s5", 24) + 8, 1, 0, "in"),
      lerp("meia.fill", W("s5", 24), W("s5", 24) + 6, 1, 1, "linear"),
      lerp("meia.pop", W("s5", 24), W("s5", 24) + 4, 1, 1.2, "out"),
      lerp("meia.pop", W("s5", 24) + 4, W("s5", 24) + 10, 1.2, 1, "inOut"),
      ...punch(W("s5", 24), 0.7),
    ],
    badges: [
      { text: "PRESENÇA MÍNIMA", variant: "warning", appearAt: W("s5", 5), disappearAt: W("s5", 11) },
      { text: "3º ANO · ENEM NOS 2 DIAS", variant: "info", appearAt: W("s5", 15), disappearAt: end(4) },
    ],
    bigWords: [
      { text: "80%", at: W("s5", 8), until: W("s5", 11), color: GOLD, size: 230, y: 460, tilt: -5 },
      { text: "ENEM", at: W("s5", 20), until: W("s5", 24), color: "#ffffff", size: 200, y: 460, tilt: 4 },
      { text: "+ R$ 200", at: W("s5", 24), until: end(4), color: G, size: 200, y: 460, tilt: -5 },
    ],
    highlights: ["REGRA", "OURO", "80%", "PRESENÇA", "TERCEIRO", "ANO", "ENEM", "DOIS", "DIAS", "200"],
    captions: [
      { text: "A regra de ouro é ter pelo menos 80% de presença.", from: voLocal("s5"), to: W("s5", 11) },
      { text: "E quem é do terceiro ano e faz o ENEM nos dois dias ganha mais 200.", from: W("s5", 11), to: end(4) },
    ],
    audioCues: [narration("s5", "ready"), sfx("whoosh", 0, 0.22), sfx("pop", 4, 0.2), sfx("ding", W("s5", 8), 0.24), sfx("whoosh-soft", W("s5", 11), 0.2), sfx("badge", W("s5", 15), 0.2), sfx("cash", W("s5", 24), 0.28)],
  },
  // ------------------------------------------------------------------ s6 · conta presença, não voto → FAKE; voto secreto + óculos
  {
    id: "scene-06-fake",
    startFrame: sc(5).from,
    durationInFrames: sc(5).durationInFrames,
    voKey: "s6",
    narration: "Ou seja: o que conta é presença na escola, não o voto. E o voto é secreto!",
    camera: { projection: "perspective", movement: "tracking", keys: [key(0, P.lucasLow), key(W("s6", 12), P.lucasLow), key(W("s6", 12) + 8, P.plaza, "out"), key(end(5), P.plaza)] },
    objects: [...SYSTEM(), URNA],
    animations: [
      ...whip(0),
      lerp("meia.pop", 0, 1, 0, 0),
      lerp("lucas.ry", 0, 1, 0, 0, "linear", "rad"),
      lerp("urna.press", 0, 1, 1, 1),
      lerp("lucas.shades", W("s6", 14), W("s6", 14) + 10, 0, 1, "in"),
      spring("primo.shock", W("s6", 15), W("s6", 15) + 16, 0, 1, 7),
      lerp("lucas.dance", W("s6", 16), W("s6", 16) + 6, 0, 1, "out"),
      ...punch(W("s6", 16), 0.7),
    ],
    badges: [],
    bigWords: [{ text: "VOTO SECRETO", at: W("s6", 14), until: end(5), color: GOLD, size: 130, y: 300, tilt: -4 }],
    chat: { ...CHAT, at: 2, until: W("s6", 12), y: 260, fakeAt: W("s6", 9), msgs: [{ who: "Primo Kevin", text: RUMOR, at: 4, fwd: true, color: "#c0392b" }] },
    highlights: ["CONTA", "PRESENÇA", "ESCOLA", "NÃO", "VOTO", "SECRETO"],
    captions: [{ text: "Ou seja: o que conta é presença na escola, não o voto. E o voto é secreto!", from: voLocal("s6"), to: end(5) }],
    audioCues: [narration("s6", "ready"), sfx("whoosh", 0, 0.22), sfx("plim", 4, 0.2), sfx("stamp", W("s6", 9), 0.42), sfx("buzz", W("s6", 9) + 1, 0.22), sfx("whoosh-soft", W("s6", 12) + 2, 0.2), sfx("ding", W("s6", 14) + 10, 0.24), sfx("boing", W("s6", 15), 0.2)],
  },
  // ------------------------------------------------------------------ s7 · comenta + siga
  {
    id: "scene-07-final",
    startFrame: sc(6).from,
    durationInFrames: sc(6).durationInFrames,
    voKey: "s7",
    narration: "E você, acha que o Lucas cai nessa? Comenta aí o que você acha, e siga o Advogado de Bolso em todas as redes!",
    camera: { projection: "perspective", movement: "dolly-out", keys: [key(0, P.plazaLow), key(W("s7", 14), P.plazaLow), key(W("s7", 23) + 20, P.final, "inOut"), key(end(6), P.final)] },
    objects: [...SYSTEM(), URNA],
    animations: [
      lerp("primo.shock", 0, 8, 1, 0, "inOut"),
      lerp("primo.sad", 0, 8, 0, 1, "inOut"),
      spring("comment", W("s7", 8), W("s7", 8) + 22, 0, 1, 8),
      lerp("comment", W("s7", 15) - 4, W("s7", 15) + 4, 1, 0, "in"),
      spring("follow", W("s7", 15), W("s7", 15) + 22, 0, 1, 8),
      lerp("follow", end(6) - 58, end(6) - 50, 1, 0, "in"),
      lerp("confetti", W("s7", 15), W("s7", 15) + 10, 0, 0.7, "out"),
      lerp("confetti", end(6) - 60, end(6) - 40, 0.7, 0, "in"),
      spring("endcard", end(6) - 52, end(6) - 22, 0, 1, 10),
    ],
    badges: [],
    chat: { ...CHAT, at: W("s7", 1), until: W("s7", 8), y: 260, msgs: [{ who: "Primo Kevin", text: RUMOR, at: W("s7", 1), fwd: true, color: "#c0392b" }, { who: "Lucas", text: "Caio não, primo kkkkk", at: W("s7", 5), me: true }] },
    highlights: ["LUCAS", "COMENTA", "SIGA", "ADVOGADO", "BOLSO", "REDES"],
    captions: [{ text: "E você, acha que o Lucas cai nessa? Comenta aí o que você acha, e siga o Advogado de Bolso em todas as redes!", from: voLocal("s7"), to: end(6) - 52 }],
    audioCues: [narration("s7", "ready"), sfx("plim", W("s7", 1), 0.24), sfx("plim", W("s7", 5), 0.2), sfx("pop", W("s7", 8), 0.26), sfx("ding", W("s7", 15), 0.22), sfx("final", end(6) - 52, 0.3)],
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
