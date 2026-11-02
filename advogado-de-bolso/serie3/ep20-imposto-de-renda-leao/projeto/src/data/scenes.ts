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

/** Cenário: praça do INSS, seu Jorge (aposentado), o cunhado e o Leão do Imposto de Renda. */
const SYSTEM = (): SceneObject[] => [o("island", "diorama-ilha"), o("inss", "predio-inss"), o("warehouse", "galpao"), o("jorge", "seu-jorge"), o("cunhado", "cunhado"), o("leao", "leao-do-imposto")];
const JORGE_HEAD: Vec3 = [0.45, 2.15, -1.35];
const CUN_HEAD: Vec3 = [1.25, 2.1, -1.2];
const LEAO_HEAD: Vec3 = [-0.6, 1.5, -1.7];

const P = {
  jorge: orbit([0.45, 1.45, -1.35], 6, -15, 4),
  jorgeLow: orbit([0.45, 1.85, -1.35], 6.4, -12, 2),
  duel: orbit([-0.25, 1.0, -1.45], 11, -6, 6),
  duelLow: orbit([-0.25, 1.4, -1.45], 11, -6, 3),
  lion: orbit([-0.7, 0.9, -1.7], 5.5, 25, 6),
  lionStart: orbit([-1.35, 0.95, -1.6], 5.0, 30, 6),
  cunhado: orbit([1.25, 1.45, -1.2], 5.6, -20, 4),
  plaza: orbit([0.0, 1.0, -1.4], 14, -8, 7),
  plazaLow: orbit([0.0, 1.45, -1.4], 14, -8, 4),
  final: orbit([0.0, 1.4, -1.4], 30, 10, 18),
};

export const scenes: ScenePlan[] = [
  // ------------------------------------------------------------------ s1 · "o Leão vai morder!"
  {
    id: "scene-01-gancho",
    startFrame: sc(0).from,
    durationInFrames: sc(0).durationInFrames,
    voKey: "s1",
    narration: "O seu Jorge é aposentado e ganha três mil e duzentos. E o cunhado avisou: o Leão vai morder o teu bolso!",
    camera: { projection: "perspective", movement: "tracking", keys: [key(0, P.lionStart), key(22, P.lionStart), key(30, P.jorge, "out"), key(W("s1", 11) - 4, P.jorge), key(W("s1", 11) + 4, P.cunhado, "out"), key(W("s1", 15) - 4, P.cunhado), key(W("s1", 15) + 4, P.duel, "out"), key(end(0), P.duelLow, "linear")] },
    objects: [...SYSTEM()],
    animations: [
      lerp("leao.dx", 0, 1, 0, 0),
      lerp("leao.pop", 0, 1, 1, 1),
      spring("leao.roar", 2, 16, 0, 1, 8),
      lerp("leao.roar", 20, 26, 1, 0, "in"),
      lerp("camera.shake", 2, 5, 0, 0.8, "out"),
      lerp("camera.shake", 5, 16, 0.8, 0, "in"),
      ...whip(26),
      lerp("jorge.thumb", 30, 38, 0, 1, "out"),
      lerp("jorge.thumb", W("s1", 11) - 6, W("s1", 11), 1, 0, "in"),
      lerp("cunhado.laugh", W("s1", 13), W("s1", 13) + 6, 0, 1, "out"),
      lerp("leao.dx", W("s1", 15), W("s1", 18), 0, 0.85, "inOut"),
      spring("leao.roar", W("s1", 18), W("s1", 18) + 14, 0, 1, 8),
      spring("jorge.shock", W("s1", 18) + 2, W("s1", 18) + 18, 0, 1, 7),
      lerp("camera.shake", W("s1", 18), W("s1", 18) + 4, 0, 1, "out"),
      lerp("camera.shake", W("s1", 18) + 4, W("s1", 18) + 16, 1, 0, "in"),
      ...punch(W("s1", 18), 0.9),
    ],
    badges: [{ text: "APOSENTADO · R$ 3.200", variant: "info", appearAt: W("s1", 4), disappearAt: W("s1", 11) }],
    bigWords: [
      { text: "GRRR!", at: 2, until: 26, color: GOLD, size: 220, y: 1000, tilt: -6 },
      { text: "R$ 3.200", at: W("s1", 7), until: W("s1", 11), color: GOLD, size: 190, y: 1000, tilt: -5 },
      { text: "NHAC!", at: W("s1", 18), until: end(0), color: R, size: 220, y: 460, tilt: -8 },
    ],
    labels: [
      { text: "SEU JORGE", point: JORGE_HEAD, at: W("s1", 2), until: W("s1", 7), off: [0, -110], accent: "#a1887f" },
      { text: "CUNHADO", point: CUN_HEAD, at: W("s1", 13), until: W("s1", 15), off: [0, -110], accent: "#c77dff" },
      { text: "LEÃO DO IMPOSTO", point: LEAO_HEAD, at: W("s1", 16), until: end(0), off: [-60, 150], accent: GOLD },
    ],
    highlights: ["JORGE", "APOSENTADO", "TRÊS", "MIL", "DUZENTOS", "CUNHADO", "LEÃO", "MORDER", "BOLSO"],
    captions: [{ text: "O seu Jorge é aposentado e ganha três mil e duzentos. E o cunhado avisou: o Leão vai morder o teu bolso!", from: voLocal("s1"), to: end(0) }],
    audioCues: [narration("s1", "ready"), sfx("roar", 0, 0.4), sfx("whoosh", 26, 0.2), sfx("pop", W("s1", 2), 0.2), sfx("coin", W("s1", 7), 0.22), sfx("whoosh", W("s1", 11), 0.2), sfx("whoosh", W("s1", 15), 0.22), sfx("roar", W("s1", 18) - 2, 0.42), sfx("boing", W("s1", 18) + 4, 0.18)],
  },
  // ------------------------------------------------------------------ s2 · será? em 2026 mudou
  {
    id: "scene-02-sera",
    startFrame: sc(1).from,
    durationInFrames: sc(1).durationInFrames,
    voKey: "s2",
    narration: "Será? Em 2026, a regra mudou.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.duel), key(end(1), P.duelLow, "linear")] },
    objects: [...SYSTEM()],
    animations: [...whip(0), lerp("leao.roar", 0, 8, 1, 0.2, "inOut"), lerp("jorge.shock", 0, 6, 1, 0, "inOut"), lerp("cunhado.laugh", 0, 6, 1, 0, "in"), lerp("jorge.scratch", W("s2", 1), W("s2", 1) + 8, 0, 1, "out")],
    badges: [{ text: "A REGRA MUDOU", variant: "warning", icon: "?", appearAt: W("s2", 2), disappearAt: end(1) }],
    bigWords: [
      { text: "SERÁ?", at: W("s2", 0), until: W("s2", 1), color: Y, size: 220, y: 460, tilt: -6 },
      { text: "2026", at: W("s2", 1), until: end(1), color: GOLD, size: 230, y: 460, tilt: -5 },
    ],
    highlights: ["SERÁ", "2026", "REGRA", "MUDOU"],
    captions: [{ text: "Será? Em 2026, a regra mudou.", from: voLocal("s2"), to: end(1) }],
    audioCues: [narration("s2", "ready"), sfx("whoosh", 0, 0.22), sfx("scratch", 2, 0.3), sfx("ding", W("s2", 1), 0.22)],
  },
  // ------------------------------------------------------------------ s3 · isento até R$ 5 mil (o leão recua)
  {
    id: "scene-03-isento",
    startFrame: sc(2).from,
    durationInFrames: sc(2).durationInFrames,
    voKey: "s3",
    narration: "Quem ganha até cinco mil reais por mês ficou isento do Imposto de Renda. E isso vale pra aposentado do INSS também.",
    camera: { projection: "perspective", movement: "orbit", keys: [key(0, P.duel), key(W("s3", 9) - 2, P.duel), key(W("s3", 9) + 6, P.lion, "out"), key(W("s3", 14) - 2, P.lion), key(W("s3", 14) + 6, P.jorge, "out"), key(end(2), P.jorge)] },
    objects: [...SYSTEM()],
    animations: [
      ...whip(0),
      lerp("jorge.scratch", 0, 6, 1, 0, "in"),
      lerp("leao.roar", W("s3", 9), W("s3", 9) + 4, 0.2, 0, "in"),
      lerp("leao.sad", W("s3", 9), W("s3", 9) + 8, 0, 1, "inOut"),
      lerp("leao.dx", W("s3", 9) + 4, W("s3", 13), 0.85, -0.4, "inOut"),
      spring("jorge.ok", W("s3", 9), W("s3", 9) + 18, 0, 1, 7),
      lerp("jorge.ok", W("s3", 14), W("s3", 14) + 6, 1, 0, "in"),
      lerp("jorge.thumb", W("s3", 18), W("s3", 18) + 8, 0, 1, "out"),
      ...punch(W("s3", 9), 0.8),
    ],
    badges: [
      { text: "ATÉ R$ 5 MIL POR MÊS", variant: "positive", appearAt: W("s3", 3), disappearAt: W("s3", 14) },
      { text: "APOSENTADO DO INSS TAMBÉM", variant: "positive", appearAt: W("s3", 14), disappearAt: end(2) },
    ],
    bigWords: [{ text: "ISENTO!", at: W("s3", 9), until: W("s3", 14), color: G, size: 210, y: 460, tilt: -6 }],
    highlights: ["CINCO", "MIL", "MÊS", "ISENTO", "IMPOSTO", "RENDA", "APOSENTADO", "INSS"],
    captions: [
      { text: "Quem ganha até cinco mil reais por mês ficou isento do Imposto de Renda.", from: voLocal("s3"), to: W("s3", 14) },
      { text: "E isso vale pra aposentado do INSS também.", from: W("s3", 14), to: end(2) },
    ],
    audioCues: [narration("s3", "ready"), sfx("whoosh", 0, 0.22), sfx("badge", W("s3", 3), 0.2), sfx("ding", W("s3", 9), 0.26), sfx("sadtrombone", W("s3", 10), 0.18), sfx("badge", W("s3", 14), 0.2)],
  },
  // ------------------------------------------------------------------ s4 · de 5 mil a 7.350: paga menos
  {
    id: "scene-04-faixa",
    startFrame: sc(3).from,
    durationInFrames: sc(3).durationInFrames,
    voKey: "s4",
    narration: "Quem ganha entre cinco mil e sete mil trezentos e cinquenta passou a pagar menos.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.cunhado), key(end(3), P.cunhado)] },
    objects: [...SYSTEM()],
    animations: [
      ...whip(0),
      lerp("jorge.thumb", 0, 6, 1, 0, "in"),
      lerp("cunhado.scratch", W("s4", 2), W("s4", 2) + 8, 0, 1, "out"),
      lerp("cunhado.scratch", W("s4", 11), W("s4", 11) + 6, 1, 0, "in"),
      spring("cunhado.ok", W("s4", 11), W("s4", 11) + 18, 0, 1, 7),
      lerp("cunhado.hop", W("s4", 13), W("s4", 13) + 4, 0, 1, "out"),
    ],
    badges: [{ text: "IMPOSTO MENOR", variant: "positive", appearAt: W("s4", 11), disappearAt: end(3) }],
    bigWords: [
      { text: "DE R$ 5 MIL", at: W("s4", 3), until: W("s4", 11), color: "#ffffff", size: 160, y: 440, tilt: -5 },
      { text: "A R$ 7.350", at: W("s4", 6), until: W("s4", 11), color: GOLD, size: 160, y: 610, tilt: -5 },
      { text: "PAGA MENOS!", at: W("s4", 11), until: end(3), color: G, size: 170, y: 460, tilt: -5 },
    ],
    highlights: ["CINCO", "MIL", "SETE", "TREZENTOS", "CINQUENTA", "PAGAR", "MENOS"],
    captions: [{ text: "Quem ganha entre cinco mil e sete mil trezentos e cinquenta passou a pagar menos.", from: voLocal("s4"), to: end(3) }],
    audioCues: [narration("s4", "ready"), sfx("whoosh", 0, 0.22), sfx("pop", W("s4", 3), 0.2), sfx("pop", W("s4", 6), 0.2), sfx("cash", W("s4", 11), 0.26)],
  },
  // ------------------------------------------------------------------ s5 · atenção: mais de uma renda
  {
    id: "scene-05-atencao",
    startFrame: sc(4).from,
    durationInFrames: sc(4).durationInFrames,
    voKey: "s5",
    narration: "Só fica de olho: quem tem mais de uma renda pode ter imposto pra pagar na declaração.",
    camera: { projection: "perspective", movement: "orbit", keys: [key(0, P.duel), key(W("s5", 9), P.duel), key(W("s5", 9) + 8, P.lion, "out"), key(end(4), P.lion)] },
    objects: [...SYSTEM()],
    animations: [
      ...whip(0),
      lerp("cunhado.ok", 0, 6, 1, 0, "in"),
      lerp("cunhado.hop", 0, 1, 0, 0),
      lerp("leao.sad", W("s5", 9), W("s5", 9) + 6, 1, 0, "inOut"),
      lerp("leao.dx", W("s5", 9), W("s5", 12), -0.4, 0.1, "inOut"),
      spring("leao.roar", W("s5", 12), W("s5", 12) + 12, 0, 0.6, 8),
    ],
    badges: [
      { text: "FICA DE OLHO", variant: "warning", icon: "?", appearAt: W("s5", 1), disappearAt: W("s5", 4) },
      { text: "MAIS DE UMA RENDA?", variant: "warning", subtitle: "a soma pode gerar imposto na declaração", appearAt: W("s5", 4), disappearAt: end(4) },
    ],
    bigWords: [{ text: "OPA!", at: W("s5", 12), until: end(4), color: Y, size: 200, y: 460, tilt: 6 }],
    highlights: ["OLHO", "MAIS", "UMA", "RENDA", "IMPOSTO", "DECLARAÇÃO"],
    captions: [{ text: "Só fica de olho: quem tem mais de uma renda pode ter imposto pra pagar na declaração.", from: voLocal("s5"), to: end(4) }],
    audioCues: [narration("s5", "ready"), sfx("whoosh", 0, 0.22), sfx("badge", W("s5", 1), 0.2), sfx("badge", W("s5", 4), 0.2), sfx("roar", W("s5", 12), 0.22)],
  },
  // ------------------------------------------------------------------ s6 · o Leão nem chegou perto (foge) + óculos
  {
    id: "scene-06-foge",
    startFrame: sc(5).from,
    durationInFrames: sc(5).durationInFrames,
    voKey: "s6",
    narration: "Resultado: o Leão nem chegou perto do seu Jorge!",
    camera: { projection: "perspective", movement: "dolly-out", keys: [key(0, P.duel), key(end(5), P.plaza, "inOut")] },
    objects: [...SYSTEM()],
    animations: [
      ...whip(0),
      lerp("leao.roar", 0, 6, 0.6, 0, "in"),
      lerp("leao.ry", W("s6", 3), W("s6", 3) + 6, 0, Math.PI, "out", "rad"),
      lerp("leao.dx", W("s6", 3) + 4, end(5), 0.1, -4.5, "in"),
      lerp("jorge.shades", W("s6", 2), W("s6", 2) + 10, 0, 1, "in"),
      lerp("jorge.dance", W("s6", 6), W("s6", 6) + 6, 0, 1, "out"),
      spring("cunhado.shock", W("s6", 5), W("s6", 5) + 16, 0, 1, 7),
      ...punch(W("s6", 6), 0.7),
    ],
    badges: [],
    bigWords: [{ text: "MITO!", at: W("s6", 4), until: end(5), color: GOLD, size: 210, y: 300, tilt: -6 }],
    highlights: ["RESULTADO", "LEÃO", "NEM", "PERTO", "JORGE"],
    captions: [{ text: "Resultado: o Leão nem chegou perto do seu Jorge!", from: voLocal("s6"), to: end(5) }],
    audioCues: [narration("s6", "ready"), sfx("whoosh", 0, 0.22), sfx("ding", W("s6", 2) + 10, 0.22), sfx("whoosh-big", W("s6", 3) + 4, 0.26), sfx("airhorn", W("s6", 6), 0.18)],
  },
  // ------------------------------------------------------------------ s7 · comenta + siga
  {
    id: "scene-07-final",
    startFrame: sc(6).from,
    durationInFrames: sc(6).durationInFrames,
    voKey: "s7",
    narration: "E você, sentiu a diferença no bolso? Comenta aí, e siga o Advogado de Bolso em todas as redes!",
    camera: { projection: "perspective", movement: "dolly-out", keys: [key(0, P.plazaLow), key(W("s7", 10), P.plazaLow), key(W("s7", 18) + 20, P.final, "inOut"), key(end(6), P.final)] },
    objects: [...SYSTEM()],
    animations: [
      lerp("leao.dx", 0, 1, -4.5, -4.5),
      lerp("cunhado.shock", 0, 8, 1, 0, "inOut"),
      lerp("cunhado.sad", 0, 8, 0, 1, "inOut"),
      spring("comment", W("s7", 7), W("s7", 7) + 22, 0, 1, 8),
      lerp("comment", W("s7", 10) - 4, W("s7", 10) + 4, 1, 0, "in"),
      spring("follow", W("s7", 10), W("s7", 10) + 22, 0, 1, 8),
      lerp("follow", end(6) - 58, end(6) - 50, 1, 0, "in"),
      lerp("confetti", W("s7", 10), W("s7", 10) + 10, 0, 0.7, "out"),
      lerp("confetti", end(6) - 60, end(6) - 40, 0.7, 0, "in"),
      spring("endcard", end(6) - 52, end(6) - 22, 0, 1, 10),
    ],
    badges: [],
    chat: { title: "GRUPO DOS APOSENTADOS", subtitle: "Cunhado, Dona Neide, Seu Zé, +60", at: W("s7", 1), until: W("s7", 7), y: 260, msgs: [{ who: "Cunhado", text: "O Leão vai morder o teu bolso!", at: W("s7", 1), color: "#8e44ad" }, { who: "Jorge", text: "Mordeu nada, cunhado! kkkkk", at: W("s7", 4), me: true }] },
    highlights: ["SENTIU", "DIFERENÇA", "BOLSO", "COMENTA", "SIGA", "ADVOGADO", "REDES"],
    captions: [{ text: "E você, sentiu a diferença no bolso? Comenta aí, e siga o Advogado de Bolso em todas as redes!", from: voLocal("s7"), to: end(6) - 52 }],
    audioCues: [narration("s7", "ready"), sfx("plim", W("s7", 1), 0.24), sfx("plim", W("s7", 4), 0.2), sfx("pop", W("s7", 7), 0.26), sfx("ding", W("s7", 10), 0.22), sfx("final", end(6) - 52, 0.3)],
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
