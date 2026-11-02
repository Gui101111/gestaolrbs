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

/** Cenário: praça do INSS, o João e os dois filhos; cofrinho e cano dourado do benefício. */
const SYSTEM = (): SceneObject[] => [o("island", "diorama-ilha"), o("inss", "predio-inss"), o("warehouse", "galpao"), o("joao", "joao"), o("filho1", "filho-1"), o("filho2", "filho-2")];
const MONEY = (): SceneObject[] => [o("piggy", "cofrinho"), o("accidentPipe", "cano-dourado-do-bolsa-familia")];
const JOAO_HEAD: Vec3 = [0.45, 2.15, -1.35];
const RUMOR = "Bolsa Família NUNCA MAIS vai aumentar! E depois da eleição vai ACABAR!!!";
const CHAT = { title: "GRUPO DA RUA", subtitle: "Vizinho do 302, Dona Neide, +48" };
const VIZ = "#2980b9";

const P = {
  joao: orbit([0.45, 1.45, -1.35], 6, -15, 4),
  joaoLow: orbit([0.45, 1.85, -1.35], 6.4, -10, 2),
  family: orbit([0.45, 1.0, -1.25], 9.5, -10, 6),
  familyLow: orbit([0.45, 1.45, -1.25], 9.5, -10, 3),
  familyL: orbit([0.45, 1.0, -1.25], 9.5, -30, 6),
  pipes: orbit([1.2, 2.0, -0.4], 22, -12, 22),
  piggy: orbit([1.3, 1.4, 2.0], 16, -20, 14),
  final: orbit([0.3, 1.4, -1.3], 30, 10, 18),
};

export const scenes: ScenePlan[] = [
  // ------------------------------------------------------------------ s1 · o boato
  {
    id: "scene-01-gancho",
    startFrame: sc(0).from,
    durationInFrames: sc(0).durationInFrames,
    voKey: "s1",
    narration: "Esse é o João. Disseram pra ele que o Bolsa Família nunca mais ia aumentar, e que depois da eleição ia até acabar!",
    camera: { projection: "perspective", movement: "tracking", keys: [key(0, P.family), key(W("s1", 4) - 4, P.family), key(W("s1", 4) + 4, P.familyLow, "out"), key(end(0), P.familyLow)] },
    objects: [...SYSTEM()],
    animations: [
      lerp("joao.hop", 0, 4, 0, 1, "out"),
      lerp("filho1.hop", 0, 4, 0, 1, "out"),
      lerp("filho2.hop", 0, 4, 0, 1, "out"),
      lerp("joao.wave", 4, 12, 0, 1, "out"),
      lerp("joao.hop", W("s1", 4) - 6, W("s1", 4), 1, 0, "in"),
      lerp("filho1.hop", W("s1", 4) - 6, W("s1", 4), 1, 0, "in"),
      lerp("filho2.hop", W("s1", 4) - 6, W("s1", 4), 1, 0, "in"),
      lerp("joao.wave", W("s1", 4) - 6, W("s1", 4), 1, 0, "in"),
      spring("joao.shock", W("s1", 11), W("s1", 11) + 16, 0, 1, 7),
      lerp("joao.shock", W("s1", 11) + 16, W("s1", 11) + 26, 1, 0.2, "inOut"),
      lerp("joao.sad", W("s1", 14), W("s1", 14) + 8, 0, 1, "inOut"),
      spring("filho1.shock", W("s1", 22), W("s1", 22) + 14, 0, 0.8, 7),
      spring("filho2.shock", W("s1", 22) + 2, W("s1", 22) + 16, 0, 0.8, 7),
      lerp("vignette.red", W("s1", 22), W("s1", 22) + 6, 0, 0.5, "out"),
      lerp("vignette.red", end(0) - 6, end(0), 0.5, 0, "in"),
    ],
    badges: [],
    bigWords: [{ text: "BOLSA FAMÍLIA", at: 2, until: W("s1", 4), color: GOLD, size: 130, y: 1000, tilt: -5 }],
    labels: [{ text: "JOÃO", point: JOAO_HEAD, at: W("s1", 3), until: W("s1", 4) + 4, off: [-60, -120], accent: G }],
    chat: { ...CHAT, at: W("s1", 4) - 4, until: end(0), y: 260, msgs: [{ who: "Vizinho do 302", text: RUMOR, at: W("s1", 4), fwd: true, color: VIZ }] },
    highlights: ["JOÃO", "BOLSA", "FAMÍLIA", "NUNCA", "AUMENTAR", "ELEIÇÃO", "ACABAR"],
    captions: [{ text: "Esse é o João. Disseram pra ele que o Bolsa Família nunca mais ia aumentar, e que depois da eleição ia até acabar!", from: voLocal("s1"), to: end(0) }],
    audioCues: [narration("s1", "ready"), sfx("boing", 2, 0.24), sfx("plim", W("s1", 4), 0.3), sfx("boo", W("s1", 11), 0.2), sfx("thud", W("s1", 22), 0.26)],
  },
  // ------------------------------------------------------------------ s2 · desespero
  {
    id: "scene-02-desespero",
    startFrame: sc(1).from,
    durationInFrames: sc(1).durationInFrames,
    voKey: "s2",
    narration: "O João tem dois filhos pequenos e ficou desesperado.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.family), key(end(1), P.joao, "inOut")] },
    objects: [...SYSTEM()],
    animations: [
      ...whip(0),
      lerp("filho1.shock", 0, 6, 0.8, 0, "inOut"),
      lerp("filho2.shock", 0, 6, 0.8, 0, "inOut"),
      lerp("filho1.wave", W("s2", 4), W("s2", 4) + 8, 0, 1, "out"),
      lerp("filho2.wave", W("s2", 4) + 2, W("s2", 4) + 10, 0, 1, "out"),
      lerp("filho1.wave", W("s2", 6), W("s2", 6) + 6, 1, 0, "in"),
      lerp("filho2.wave", W("s2", 6), W("s2", 6) + 6, 1, 0, "in"),
      lerp("joao.scratch", W("s2", 7), W("s2", 7) + 8, 0, 1, "out"),
      lerp("filho1.sad", W("s2", 7), W("s2", 7) + 8, 0, 1, "inOut"),
      lerp("filho2.sad", W("s2", 7), W("s2", 7) + 8, 0, 1, "inOut"),
    ],
    badges: [{ text: "2 FILHOS PEQUENOS", variant: "info", appearAt: W("s2", 3), disappearAt: W("s2", 7) }],
    bigWords: [{ text: "E AGORA?!", at: W("s2", 8), until: end(1), color: R, size: 190, y: 460, tilt: -6 }],
    highlights: ["JOÃO", "DOIS", "FILHOS", "PEQUENOS", "DESESPERADO"],
    captions: [{ text: "O João tem dois filhos pequenos e ficou desesperado.", from: voLocal("s2"), to: end(1) }],
    audioCues: [narration("s2", "ready"), sfx("whoosh", 0, 0.22), sfx("pop", W("s2", 4), 0.2), sfx("badge", W("s2", 3), 0.2), sfx("sadtrombone", W("s2", 8), 0.22)],
  },
  // ------------------------------------------------------------------ s3 · plantão: reajuste de 15%
  {
    id: "scene-03-plantao",
    startFrame: sc(2).from,
    durationInFrames: sc(2).durationInFrames,
    voKey: "s3",
    narration: "Mas olha a notícia: em outubro, o Bolsa Família teve reajuste de 15%.",
    camera: { projection: "perspective", movement: "orbit", keys: [key(0, P.pipes), key(end(2), P.pipes)] },
    objects: [...SYSTEM(), ...MONEY()],
    animations: [
      ...whip(0),
      ...flash(2, 0.6),
      lerp("joao.scratch", 0, 1, 0, 0),
      lerp("joao.sad", 0, 1, 0, 0),
      lerp("filho1.sad", 0, 1, 0, 0),
      lerp("filho2.sad", 0, 1, 0, 0),
      lerp("piggy.level", 0, 1, 0.3, 0.3),
      lerp("pipeAccident.grow", 0, 1, 0, 0),
      lerp("pipeAccident.grow", W("s3", 6), W("s3", 9), 0, 1, "out"),
      lerp("pipeAccident.glow", W("s3", 6), W("s3", 9), 0, 1, "out"),
      lerp("coins.accident.flow", W("s3", 9), W("s3", 9) + 10, 0, 1, "linear"),
      lerp("piggy.level", W("s3", 10), end(2), 0.3, 0.55, "linear"),
      ...punch(W("s3", 12), 0.8),
    ],
    badges: [{ text: "OUTUBRO DE 2026", variant: "info", appearAt: W("s3", 4), disappearAt: W("s3", 10) }],
    bigWords: [
      { text: "PLANTÃO!", at: 2, until: W("s3", 4), color: R, size: 200, y: 460, tilt: -6 },
      { text: "+15%", at: W("s3", 12), until: end(2), color: GOLD, size: 240, y: 460, tilt: -6 },
    ],
    highlights: ["NOTÍCIA", "OUTUBRO", "BOLSA", "FAMÍLIA", "REAJUSTE", "15%"],
    captions: [{ text: "Mas olha a notícia: em outubro, o Bolsa Família teve reajuste de 15%.", from: voLocal("s3"), to: end(2) }],
    audioCues: [narration("s3", "ready"), sfx("whoosh-big", 0, 0.24), sfx("siren", 2, 0.16), sfx("badge", W("s3", 4), 0.2), sfx("coin", W("s3", 9), 0.22), sfx("cash", W("s3", 12), 0.3)],
  },
  // ------------------------------------------------------------------ s4 · de 600 pra 691 + R$ 173 por criança
  {
    id: "scene-04-valores",
    startFrame: sc(3).from,
    durationInFrames: sc(3).durationInFrames,
    voKey: "s4",
    narration: "O valor mínimo por família subiu de 600 pra 691 reais. E o adicional por criança pequena foi pra 173 reais.",
    camera: { projection: "perspective", movement: "orbit", keys: [key(0, P.piggy), key(W("s4", 9) - 2, P.piggy), key(W("s4", 9) + 8, P.familyL, "out"), key(end(3), P.familyL)] },
    objects: [...SYSTEM(), ...MONEY()],
    animations: [
      ...whip(0),
      lerp("piggy.level", 0, W("s4", 9), 0.55, 0.85, "linear"),
      lerp("coinRain", W("s4", 8), W("s4", 8) + 8, 0, 1, "out"),
      lerp("coinRain", W("s4", 9), W("s4", 9) + 8, 1, 0, "in"),
      lerp("joao.hop", W("s4", 9), W("s4", 9) + 4, 0, 1, "out"),
      lerp("filho1.hop", W("s4", 13), W("s4", 13) + 4, 0, 1, "out"),
      lerp("filho2.hop", W("s4", 13) + 2, W("s4", 13) + 6, 0, 1, "out"),
      spring("filho1.ok", W("s4", 17), W("s4", 17) + 18, 0, 1, 7),
      spring("filho2.ok", W("s4", 17) + 3, W("s4", 17) + 21, 0, 1, 7),
      lerp("plazaCoins", W("s4", 17), W("s4", 17) + 8, 0, 1, "out"),
    ],
    badges: [
      { text: "VALOR MÍNIMO POR FAMÍLIA", variant: "info", appearAt: W("s4", 1), disappearAt: W("s4", 9) },
      { text: "POR CRIANÇA DE 0 A 6 ANOS", variant: "positive", appearAt: W("s4", 11), disappearAt: end(3) },
    ],
    bigWords: [
      { text: "DE R$ 600", at: W("s4", 6), until: W("s4", 9), color: "#ffffff", size: 170, y: 440, tilt: -5 },
      { text: "PRA R$ 691", at: W("s4", 8), until: W("s4", 9) + 10, color: G, size: 170, y: 620, tilt: -5 },
      { text: "+ R$ 173", at: W("s4", 17), until: end(3), color: GOLD, size: 200, y: 460, tilt: -5 },
    ],
    highlights: ["VALOR", "MÍNIMO", "FAMÍLIA", "600", "691", "ADICIONAL", "CRIANÇA", "PEQUENA", "173"],
    captions: [
      { text: "O valor mínimo por família subiu de 600 pra 691 reais.", from: voLocal("s4"), to: W("s4", 9) },
      { text: "E o adicional por criança pequena foi pra 173 reais.", from: W("s4", 9), to: end(3) },
    ],
    audioCues: [narration("s4", "ready"), sfx("whoosh", 0, 0.22), sfx("badge", W("s4", 1), 0.2), sfx("pop", W("s4", 6), 0.2), sfx("cash", W("s4", 8), 0.28), sfx("whoosh", W("s4", 9), 0.2), sfx("badge", W("s4", 11), 0.2), sfx("coin", W("s4", 17), 0.24)],
  },
  // ------------------------------------------------------------------ s5 · boato de que ia acabar → FAKE
  {
    id: "scene-05-fake",
    startFrame: sc(4).from,
    durationInFrames: sc(4).durationInFrames,
    voKey: "s5",
    narration: "E o boato de que ia acabar depois da eleição? O governo desmentiu: os pagamentos seguem normais.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.familyLow), key(end(4), P.joaoLow, "inOut")] },
    objects: [...SYSTEM()],
    animations: [
      ...whip(0),
      lerp("plazaCoins", 0, 8, 1, 0, "in"),
      lerp("filho1.ok", 0, 6, 1, 0, "in"),
      lerp("filho2.ok", 0, 6, 1, 0, "in"),
      lerp("joao.thumb", W("s5", 13), W("s5", 13) + 8, 0, 1, "out"),
      spring("joao.ok", W("s5", 13), W("s5", 13) + 18, 0, 1, 7),
    ],
    badges: [{ text: "PAGAMENTOS SEGUEM NORMAIS", variant: "positive", appearAt: W("s5", 13), disappearAt: end(4) }],
    chat: { ...CHAT, at: 2, until: end(4), y: 260, fakeAt: W("s5", 12), msgs: [{ who: "Vizinho do 302", text: RUMOR, at: 4, fwd: true, color: VIZ }] },
    highlights: ["BOATO", "ACABAR", "ELEIÇÃO", "GOVERNO", "DESMENTIU", "PAGAMENTOS", "NORMAIS"],
    captions: [
      { text: "E o boato de que ia acabar depois da eleição?", from: voLocal("s5"), to: W("s5", 10) },
      { text: "O governo desmentiu: os pagamentos seguem normais.", from: W("s5", 10), to: end(4) },
    ],
    audioCues: [narration("s5", "ready"), sfx("whoosh", 0, 0.22), sfx("plim", 4, 0.24), sfx("stamp", W("s5", 12), 0.42), sfx("buzz", W("s5", 12) + 1, 0.22), sfx("ding", W("s5", 13) + 4, 0.22)],
  },
  // ------------------------------------------------------------------ s6 · a pergunta que não quer calar: 2027?
  {
    id: "scene-06-2027",
    startFrame: sc(5).from,
    durationInFrames: sc(5).durationInFrames,
    voKey: "s6",
    narration: "Agora, a pergunta que não quer calar: será que vai aumentar de novo em 2027?",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.family), key(end(5), P.joao, "inOut")] },
    objects: [...SYSTEM()],
    animations: [
      ...whip(0),
      lerp("joao.thumb", 0, 6, 1, 0, "in"),
      lerp("joao.ok", 0, 6, 1, 0, "in"),
      lerp("joao.scratch", W("s6", 7), W("s6", 7) + 8, 0, 1, "out"),
      lerp("filho1.hop", W("s6", 13), W("s6", 13) + 4, 1, 1, "linear"),
      ...punch(W("s6", 13), 0.7),
    ],
    badges: [{ text: "A PERGUNTA QUE NÃO QUER CALAR", variant: "warning", icon: "?", appearAt: W("s6", 1), disappearAt: end(5) }],
    bigWords: [
      { text: "VAI AUMENTAR?", at: W("s6", 7), until: W("s6", 13), color: "#ffffff", size: 130, y: 440, tilt: -4 },
      { text: "2027?", at: W("s6", 13), until: end(5), color: GOLD, size: 240, y: 440, tilt: -6 },
    ],
    highlights: ["PERGUNTA", "AUMENTAR", "NOVO", "2027"],
    captions: [{ text: "Agora, a pergunta que não quer calar: será que vai aumentar de novo em 2027?", from: voLocal("s6"), to: end(5) }],
    audioCues: [narration("s6", "ready"), sfx("whoosh", 0, 0.22), sfx("badge", W("s6", 1), 0.2), sfx("tick", W("s6", 7), 0.2), sfx("drumroll", W("s6", 7), 0.22), sfx("boing", W("s6", 13), 0.22)],
  },
  // ------------------------------------------------------------------ s7 · comenta + siga
  {
    id: "scene-07-final",
    startFrame: sc(6).from,
    durationInFrames: sc(6).durationInFrames,
    voKey: "s7",
    narration: "Comenta aí o que você acha, e siga o Advogado de Bolso em todas as redes!",
    camera: { projection: "perspective", movement: "dolly-out", keys: [key(0, P.familyLow), key(W("s7", 8), P.familyLow), key(W("s7", 15) + 20, P.final, "inOut"), key(end(6), P.final)] },
    objects: [...SYSTEM()],
    animations: [
      lerp("joao.scratch", 0, 6, 1, 0, "in"),
      lerp("joao.dance", 4, 10, 0, 1, "out"),
      lerp("filho1.dance", 6, 12, 0, 1, "out"),
      lerp("filho2.dance", 8, 14, 0, 1, "out"),
      spring("comment", W("s7", 0), W("s7", 0) + 22, 0, 1, 8),
      lerp("comment", W("s7", 7) - 4, W("s7", 7) + 4, 1, 0, "in"),
      spring("follow", W("s7", 7), W("s7", 7) + 22, 0, 1, 8),
      lerp("follow", end(6) - 58, end(6) - 50, 1, 0, "in"),
      lerp("confetti", W("s7", 7), W("s7", 7) + 10, 0, 0.7, "out"),
      lerp("confetti", end(6) - 60, end(6) - 40, 0.7, 0, "in"),
      spring("endcard", end(6) - 52, end(6) - 22, 0, 1, 10),
    ],
    badges: [],
    highlights: ["COMENTA", "SIGA", "ADVOGADO", "BOLSO", "REDES"],
    captions: [{ text: "Comenta aí o que você acha, e siga o Advogado de Bolso em todas as redes!", from: voLocal("s7"), to: end(6) - 52 }],
    audioCues: [narration("s7", "ready"), sfx("pop", W("s7", 0), 0.26), sfx("ding", W("s7", 7), 0.22), sfx("final", end(6) - 52, 0.3)],
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
