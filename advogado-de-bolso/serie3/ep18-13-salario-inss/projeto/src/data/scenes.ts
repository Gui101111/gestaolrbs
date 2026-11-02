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

/** Cenário: praça do INSS, dona Lurdes (aposentada em julho), a vizinha e a dona Cida (BPC). */
const SYSTEM = (): SceneObject[] => [o("island", "diorama-ilha"), o("inss", "predio-inss"), o("warehouse", "galpao"), o("lurdes", "dona-lurdes"), o("vizinha", "vizinha")];
const VIZ_HEAD: Vec3 = [-0.4, 1.95, -1.05];
const LURDES_HEAD: Vec3 = [0.45, 1.85, -1.35];
const CIDA_HEAD: Vec3 = [1.25, 1.85, -1.35];
const VIZ_SAYS = "Esse ano não tem 13º pra você!";

const P = {
  lurdes: orbit([0.45, 1.3, -1.35], 5.6, -15, 4),
  lurdesLow: orbit([0.45, 1.7, -1.35], 6.0, -12, 2),
  viz: orbit([-0.4, 1.4, -1.05], 5.8, -4, 3),
  plaza: orbit([0.35, 1.0, -1.3], 13, -8, 7),
  plazaLow: orbit([0.35, 1.45, -1.3], 13, -8, 4),
  coin: orbit([1.3, 2.7, 2.0], 13, 12, 10),
  cida: orbit([1.25, 1.3, -1.35], 5.6, -20, 4),
  final: orbit([0.3, 1.4, -1.3], 30, 10, 18),
};

export const scenes: ScenePlan[] = [
  // ------------------------------------------------------------------ s1 · aposentou! e a vizinha: "sem 13º"
  {
    id: "scene-01-gancho",
    startFrame: sc(0).from,
    durationInFrames: sc(0).durationInFrames,
    voKey: "s1",
    narration: "A dona Lurdes se aposentou em julho, e a vizinha garantiu: esse ano não tem décimo terceiro pra você!",
    camera: { projection: "perspective", movement: "tracking", keys: [key(0, P.lurdes), key(W("s1", 8) - 4, P.lurdes), key(W("s1", 8) + 4, P.viz, "out"), key(W("s1", 13) - 2, P.viz), key(W("s1", 13) + 6, P.plaza, "out"), key(end(0), P.plaza)] },
    objects: [...SYSTEM()],
    animations: [
      ...flash(1, 0.4),
      lerp("confetti", 0, 6, 0, 1, "out"),
      lerp("confetti", W("s1", 7), W("s1", 8), 1, 0, "in"),
      lerp("lurdes.dance", 2, 8, 0, 1, "out"),
      lerp("lurdes.dance", W("s1", 7), W("s1", 8), 1, 0, "in"),
      lerp("vizinha.laugh", W("s1", 9), W("s1", 9) + 6, 0, 1, "out"),
      lerp("vizinha.wave", W("s1", 10), W("s1", 10) + 8, 0, 1, "out"),
      spring("lurdes.shock", W("s1", 15), W("s1", 15) + 16, 0, 1, 7),
      lerp("lurdes.shock", W("s1", 15) + 16, end(0), 1, 0.2, "inOut"),
      lerp("lurdes.sad", W("s1", 16), W("s1", 16) + 8, 0, 1, "inOut"),
    ],
    badges: [],
    bigWords: [
      { text: "APOSENTADA!", at: 2, until: W("s1", 7), color: GOLD, size: 160, y: 1000, tilt: -5 },
      { text: "SEM 13º?!", at: W("s1", 15), until: end(0), color: R, size: 190, y: 460, tilt: -6 },
    ],
    labels: [
      { text: "DONA LURDES", point: LURDES_HEAD, at: W("s1", 2), until: W("s1", 7), off: [0, -120], accent: "#7cc4ff" },
      { text: VIZ_SAYS.toUpperCase(), point: VIZ_HEAD, at: W("s1", 10), until: W("s1", 15), off: [-80, -150], accent: Y },
    ],
    highlights: ["LURDES", "APOSENTOU", "JULHO", "VIZINHA", "GARANTIU", "DÉCIMO", "TERCEIRO"],
    captions: [{ text: "A dona Lurdes se aposentou em julho, e a vizinha garantiu: esse ano não tem décimo terceiro pra você!", from: voLocal("s1"), to: end(0) }],
    audioCues: [narration("s1", "ready"), sfx("airhorn", 1, 0.2), sfx("whoosh", W("s1", 8), 0.22), sfx("pop", W("s1", 10), 0.2), sfx("boo", W("s1", 15), 0.2), sfx("boing", W("s1", 15) + 2, 0.18)],
  },
  // ------------------------------------------------------------------ s2 · será?
  {
    id: "scene-02-sera",
    startFrame: sc(1).from,
    durationInFrames: sc(1).durationInFrames,
    voKey: "s2",
    narration: "Será? Vamos aos fatos.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.plaza), key(end(1), P.plazaLow, "linear")] },
    objects: [...SYSTEM()],
    animations: [...whip(0), lerp("lurdes.shock", 0, 6, 0.2, 0, "inOut")],
    badges: [{ text: "VAMOS AOS FATOS", variant: "warning", icon: "?", appearAt: W("s2", 1), disappearAt: end(1) }],
    bigWords: [{ text: "SERÁ?", at: W("s2", 0), until: end(1), color: Y, size: 220, y: 460, tilt: -6 }],
    highlights: ["SERÁ", "FATOS"],
    captions: [{ text: "Será? Vamos aos fatos.", from: voLocal("s2"), to: end(1) }],
    audioCues: [narration("s2", "ready"), sfx("whoosh", 0, 0.22), sfx("scratch", 2, 0.3), sfx("badge", W("s2", 1), 0.2)],
  },
  // ------------------------------------------------------------------ s3 · proporcional: de julho a dezembro = metade
  {
    id: "scene-03-proporcional",
    startFrame: sc(2).from,
    durationInFrames: sc(2).durationInFrames,
    voKey: "s3",
    narration: "Quem começou a receber do INSS depois de maio ganha o décimo terceiro proporcional. De julho a dezembro, são seis meses: metade.",
    camera: { projection: "perspective", movement: "orbit", keys: [key(0, P.lurdes), key(W("s3", 9) - 4, P.lurdes), key(W("s3", 9) + 4, P.coin, "out"), key(end(2), P.coin)] },
    objects: [...SYSTEM(), o("piggy", "cofrinho"), o("bigCoin", "moeda-do-13")],
    animations: [
      ...whip(0),
      lerp("vizinha.laugh", 0, 6, 1, 0, "in"),
      lerp("vizinha.wave", 0, 6, 1, 0, "in"),
      lerp("lurdes.sad", 0, 8, 1, 0, "inOut"),
      lerp("piggy.level", 0, 1, 0.3, 0.3),
      lerp("bigCoin.pop", 0, 1, 0, 0),
      lerp("bigCoin.split", 0, 1, 0, 0),
      lerp("halfCoin.drop", 0, 1, 0, 0),
      spring("bigCoin.pop", W("s3", 11) - 4, W("s3", 11) + 18, 0, 1, 8),
      lerp("bigCoin.spin", W("s3", 11) - 4, W("s3", 21), 0, 720, "out", "deg"),
      lerp("bigCoin.split", W("s3", 21), W("s3", 21) + 10, 0, 1, "out"),
      lerp("halfCoin.drop", W("s3", 21) + 12, end(2) - 2, 0, 1, "inOut"),
      lerp("piggy.level", W("s3", 21) + 20, end(2), 0.3, 0.5, "linear"),
    ],
    badges: [
      { text: "COMEÇOU A RECEBER DEPOIS DE MAIO", variant: "info", appearAt: W("s3", 1), disappearAt: W("s3", 9) },
      { text: "13º PROPORCIONAL", variant: "positive", appearAt: W("s3", 13), disappearAt: end(2) },
    ],
    bigWords: [
      { text: "13º", at: W("s3", 11), until: W("s3", 15), color: GOLD, size: 240, y: 440, tilt: -5 },
      { text: "JUL A DEZ", at: W("s3", 15), until: W("s3", 19), color: "#ffffff", size: 170, y: 440, tilt: 4 },
      { text: "6 MESES", at: W("s3", 19), until: W("s3", 21), color: GOLD, size: 190, y: 440, tilt: -4 },
      { text: "METADE!", at: W("s3", 21), until: end(2), color: G, size: 190, y: 440, tilt: -5 },
    ],
    highlights: ["RECEBER", "INSS", "MAIO", "DÉCIMO", "TERCEIRO", "PROPORCIONAL", "JULHO", "DEZEMBRO", "SEIS", "MESES", "METADE"],
    captions: [
      { text: "Quem começou a receber do INSS depois de maio ganha o décimo terceiro proporcional.", from: voLocal("s3"), to: W("s3", 14) },
      { text: "De julho a dezembro, são seis meses: metade.", from: W("s3", 14), to: end(2) },
    ],
    audioCues: [narration("s3", "ready"), sfx("whoosh", 0, 0.22), sfx("badge", W("s3", 1), 0.2), sfx("whoosh", W("s3", 9), 0.2), sfx("coin", W("s3", 11), 0.26), sfx("tick", W("s3", 15), 0.2), sfx("tick", W("s3", 19), 0.2), sfx("crack", W("s3", 21), 0.22), sfx("coin", W("s3", 21) + 30, 0.22)],
  },
  // ------------------------------------------------------------------ s4 · paga a partir de 24/11
  {
    id: "scene-04-data",
    startFrame: sc(3).from,
    durationInFrames: sc(3).durationInFrames,
    voKey: "s4",
    narration: "E esse pagamento começa no dia 24 de novembro, pra quem recebe até um salário mínimo.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.plaza), key(W("s4", 6), P.lurdes, "soft"), key(end(3), P.lurdes)] },
    objects: [...SYSTEM()],
    animations: [
      ...whip(0),
      lerp("bigCoin.pop", 0, 1, 0, 0),
      lerp("lurdes.hop", W("s4", 6), W("s4", 6) + 4, 0, 1, "out"),
      spring("lurdes.ok", W("s4", 6), W("s4", 6) + 18, 0, 1, 7),
      lerp("plazaCoins", W("s4", 6), W("s4", 6) + 8, 0, 1, "out"),
      ...punch(W("s4", 6), 0.7),
    ],
    badges: [{ text: "PRA QUEM RECEBE ATÉ 1 SALÁRIO MÍNIMO", variant: "info", subtitle: "acima disso, o depósito vem em dezembro", appearAt: W("s4", 7), disappearAt: end(3) }],
    bigWords: [{ text: "24/11", at: W("s4", 6), until: end(3), color: GOLD, size: 230, y: 1000, tilt: -5 }],
    highlights: ["PAGAMENTO", "COMEÇA", "24", "NOVEMBRO", "SALÁRIO", "MÍNIMO"],
    captions: [{ text: "E esse pagamento começa no dia 24 de novembro, pra quem recebe até um salário mínimo.", from: voLocal("s4"), to: end(3) }],
    audioCues: [narration("s4", "ready"), sfx("whoosh", 0, 0.22), sfx("cash", W("s4", 6), 0.28), sfx("badge", W("s4", 7), 0.2)],
  },
  // ------------------------------------------------------------------ s5 · BPC não tem 13º
  {
    id: "scene-05-bpc",
    startFrame: sc(4).from,
    durationInFrames: sc(4).durationInFrames,
    voKey: "s5",
    narration: "Mas atenção: quem recebe BPC não tem décimo terceiro, porque o BPC é assistencial.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.plaza), key(W("s5", 4), P.cida, "soft"), key(end(4), P.cida)] },
    objects: [...SYSTEM(), o("cida", "dona-cida-bpc")],
    animations: [
      ...whip(0),
      lerp("plazaCoins", 0, 8, 1, 0, "in"),
      lerp("lurdes.ok", 0, 6, 1, 0, "in"),
      spring("cida.pop", 2, 22, 0, 1, 8),
      spring("cida.x", W("s5", 5), W("s5", 5) + 18, 0, 1, 7),
      lerp("cida.sad", W("s5", 5), W("s5", 5) + 8, 0, 1, "inOut"),
    ],
    badges: [
      { text: "ATENÇÃO", variant: "warning", icon: "?", appearAt: W("s5", 1), disappearAt: W("s5", 5) },
      { text: "BPC NÃO TEM 13º", variant: "negative", appearAt: W("s5", 5), disappearAt: W("s5", 12) },
      { text: "O BPC É ASSISTENCIAL", variant: "info", appearAt: W("s5", 12), disappearAt: end(4) },
    ],
    bigWords: [{ text: "BPC: SEM 13º", at: W("s5", 5), until: end(4), color: R, size: 150, y: 1000, tilt: -5 }],
    labels: [{ text: "DONA CIDA · BPC", point: CIDA_HEAD, at: 6, until: W("s5", 5), off: [0, -120], accent: G }],
    highlights: ["ATENÇÃO", "BPC", "NÃO", "DÉCIMO", "TERCEIRO", "ASSISTENCIAL"],
    captions: [{ text: "Mas atenção: quem recebe BPC não tem décimo terceiro, porque o BPC é assistencial.", from: voLocal("s5"), to: end(4) }],
    audioCues: [narration("s5", "ready"), sfx("whoosh", 0, 0.22), sfx("pop", 4, 0.2), sfx("buzz", W("s5", 5), 0.26), sfx("badge", W("s5", 12), 0.2)],
  },
  // ------------------------------------------------------------------ s6 · a vizinha errou feio
  {
    id: "scene-06-errou",
    startFrame: sc(5).from,
    durationInFrames: sc(5).durationInFrames,
    voKey: "s6",
    narration: "Ou seja: a vizinha errou feio!",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.plaza), key(end(5), P.plazaLow, "linear")] },
    objects: [...SYSTEM()],
    animations: [
      ...whip(0),
      lerp("cida.x", 0, 1, 0, 0),
      lerp("lurdes.shades", 2, 12, 0, 1, "in"),
      spring("vizinha.shock", W("s6", 4), W("s6", 4) + 14, 0, 1, 7),
      lerp("vizinha.sad", W("s6", 5), W("s6", 5) + 8, 0, 1, "inOut"),
      lerp("lurdes.dance", 12, 18, 0, 1, "out"),
      ...punch(W("s6", 4), 0.7),
    ],
    badges: [],
    bigWords: [{ text: "ERROU FEIO!", at: W("s6", 3), until: end(5), color: R, size: 160, y: 300, tilt: -6 }],
    highlights: ["VIZINHA", "ERROU", "FEIO"],
    captions: [{ text: "Ou seja: a vizinha errou feio!", from: voLocal("s6"), to: end(5) }],
    audioCues: [narration("s6", "ready"), sfx("whoosh", 0, 0.22), sfx("ding", 12, 0.22), sfx("sadtrombone", W("s6", 4), 0.24)],
  },
  // ------------------------------------------------------------------ s7 · comenta + siga
  {
    id: "scene-07-final",
    startFrame: sc(6).from,
    durationInFrames: sc(6).durationInFrames,
    voKey: "s7",
    narration: "E o seu décimo terceiro, já tá na conta? Comenta aí, e siga o Advogado de Bolso em todas as redes!",
    camera: { projection: "perspective", movement: "dolly-out", keys: [key(0, P.plazaLow), key(W("s7", 12), P.plazaLow), key(W("s7", 20) + 20, P.final, "inOut"), key(end(6), P.final)] },
    objects: [...SYSTEM()],
    animations: [
      spring("comment", W("s7", 9), W("s7", 9) + 22, 0, 1, 8),
      lerp("comment", W("s7", 12) - 4, W("s7", 12) + 4, 1, 0, "in"),
      spring("follow", W("s7", 12), W("s7", 12) + 22, 0, 1, 8),
      lerp("follow", end(6) - 58, end(6) - 50, 1, 0, "in"),
      lerp("confetti", W("s7", 12), W("s7", 12) + 10, 0, 0.7, "out"),
      lerp("confetti", end(6) - 60, end(6) - 40, 0.7, 0, "in"),
      spring("endcard", end(6) - 52, end(6) - 22, 0, 1, 10),
    ],
    badges: [],
    chat: { title: "GRUPO DO PRÉDIO", subtitle: "Vizinha do 12, Síndico, +30", at: W("s7", 1), until: W("s7", 9), y: 260, msgs: [{ who: "Vizinha do 12", text: VIZ_SAYS, at: W("s7", 1), color: "#d35400" }, { who: "Lurdes", text: "Dia 24 cai na conta, vizinha! kkkkk", at: W("s7", 4), me: true }] },
    highlights: ["DÉCIMO", "TERCEIRO", "CONTA", "COMENTA", "SIGA", "ADVOGADO", "BOLSO", "REDES"],
    captions: [{ text: "E o seu décimo terceiro, já tá na conta? Comenta aí, e siga o Advogado de Bolso em todas as redes!", from: voLocal("s7"), to: end(6) - 52 }],
    audioCues: [narration("s7", "ready"), sfx("plim", W("s7", 1), 0.24), sfx("plim", W("s7", 4), 0.2), sfx("pop", W("s7", 9), 0.26), sfx("ding", W("s7", 12), 0.22), sfx("final", end(6) - 52, 0.3)],
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
