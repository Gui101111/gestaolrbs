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

/** Cenário: praça do INSS, a Rose (doméstica) e a vizinha; cofrinho e canos do benefício. */
const SYSTEM = (): SceneObject[] => [o("island", "diorama-ilha"), o("inss", "predio-inss"), o("warehouse", "galpao"), o("rose", "rose-domestica"), o("vizinha", "vizinha")];
const MONEY = (): SceneObject[] => [o("piggy", "cofrinho"), o("accidentPipe", "cano-dourado-auxilio"), o("salaryPipe", "cano-do-salario")];
const VIZ_HEAD: Vec3 = [-0.4, 1.95, -1.05];
const ROSE_HEAD: Vec3 = [0.45, 1.95, -1.35];
const VIZ_SAYS = "Doméstica não tem direito a nada!";

const P = {
  rose: orbit([0.45, 1.3, -1.35], 5.6, -15, 4),
  roseLow: orbit([0.45, 1.7, -1.35], 6.0, -12, 2),
  viz: orbit([-0.4, 1.4, -1.05], 5.8, -4, 3),
  plaza: orbit([0.3, 1.0, -1.35], 13, -6, 7),
  plazaLow: orbit([0.3, 1.45, -1.35], 13, -6, 4),
  pipes: orbit([1.2, 2.0, -0.4], 22, -12, 22),
  piggy: orbit([1.3, 1.4, 2.0], 16, -20, 14),
  final: orbit([0.2, 1.4, -1.35], 30, 10, 18),
};

export const scenes: ScenePlan[] = [
  // ------------------------------------------------------------------ s1 · "ai!" + a vizinha
  {
    id: "scene-01-gancho",
    startFrame: sc(0).from,
    durationInFrames: sc(0).durationInFrames,
    voKey: "s1",
    narration: "A Rose é empregada doméstica, machucou a mão na cozinha, e a vizinha disse: doméstica não tem direito a nada!",
    camera: { projection: "perspective", movement: "tracking", keys: [key(0, P.rose), key(W("s1", 10) - 4, P.rose), key(W("s1", 10) + 4, P.viz, "out"), key(end(0), P.viz)] },
    objects: [...SYSTEM()],
    animations: [
      ...flash(2, 0.6),
      spring("rose.shock", 2, 16, 0, 1, 7),
      lerp("rose.shock", 16, 26, 1, 0, "inOut"),
      lerp("camera.shake", 2, 5, 0, 1, "out"),
      lerp("camera.shake", 5, 16, 1, 0, "in"),
      lerp("vignette.red", 2, 8, 0, 0.5, "out"),
      lerp("vignette.red", W("s1", 5), W("s1", 5) + 8, 0.5, 0, "in"),
      lerp("rose.sad", 14, 22, 0, 1, "inOut"),
      lerp("vizinha.laugh", W("s1", 12), W("s1", 12) + 6, 0, 1, "out"),
      lerp("vizinha.wave", W("s1", 12), W("s1", 12) + 8, 0, 1, "out"),
    ],
    badges: [],
    bigWords: [
      { text: "AI!", at: 2, until: W("s1", 5), color: R, size: 230, y: 1000, tilt: -8 },
      { text: "MÃO MACHUCADA", at: W("s1", 5), until: W("s1", 10), color: "#ffffff", size: 120, y: 1000, tilt: -4 },
    ],
    labels: [
      { text: "ROSE · DOMÉSTICA", point: ROSE_HEAD, at: W("s1", 1), until: W("s1", 10) - 2, off: [0, -110], accent: "#9b5de5" },
      { text: VIZ_SAYS.toUpperCase(), point: VIZ_HEAD, at: W("s1", 13), until: end(0), off: [60, -140], accent: Y },
    ],
    highlights: ["ROSE", "EMPREGADA", "DOMÉSTICA", "MACHUCOU", "MÃO", "VIZINHA", "DIREITO", "NADA"],
    captions: [{ text: "A Rose é empregada doméstica, machucou a mão na cozinha, e a vizinha disse: doméstica não tem direito a nada!", from: voLocal("s1"), to: end(0) }],
    audioCues: [narration("s1", "ready"), sfx("crack", 2, 0.36), sfx("thud", 2, 0.3), sfx("boing", 6, 0.2), sfx("whoosh", W("s1", 10), 0.22), sfx("pop", W("s1", 13), 0.2)],
  },
  // ------------------------------------------------------------------ s2 · será? errou feio
  {
    id: "scene-02-sera",
    startFrame: sc(1).from,
    durationInFrames: sc(1).durationInFrames,
    voKey: "s2",
    narration: "Será? A vizinha errou feio.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.plaza), key(end(1), P.plazaLow, "linear")] },
    objects: [...SYSTEM()],
    animations: [...whip(0), lerp("vizinha.laugh", 0, 6, 1, 1, "linear"), lerp("vizinha.laugh", W("s2", 3), W("s2", 3) + 4, 1, 0, "in"), spring("vizinha.shock", W("s2", 3), W("s2", 3) + 14, 0, 0.8, 7), lerp("vizinha.wave", 0, 6, 1, 0, "in")],
    badges: [],
    bigWords: [
      { text: "SERÁ?", at: W("s2", 0), until: W("s2", 3), color: Y, size: 220, y: 460, tilt: -6 },
      { text: "ERROU FEIO!", at: W("s2", 3), until: end(1), color: R, size: 170, y: 460, tilt: -6 },
    ],
    highlights: ["SERÁ", "VIZINHA", "ERROU", "FEIO"],
    captions: [{ text: "Será? A vizinha errou feio.", from: voLocal("s2"), to: end(1) }],
    audioCues: [narration("s2", "ready"), sfx("whoosh", 0, 0.22), sfx("scratch", 2, 0.28), sfx("buzz", W("s2", 3), 0.2)],
  },
  // ------------------------------------------------------------------ s3 · desde 2015, doméstica tem direito
  {
    id: "scene-03-2015",
    startFrame: sc(2).from,
    durationInFrames: sc(2).durationInFrames,
    voKey: "s3",
    narration: "Desde 2015, empregada doméstica de carteira assinada também tem direito ao auxílio-acidente.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.rose), key(end(2), P.roseLow, "linear")] },
    objects: [...SYSTEM()],
    animations: [
      ...whip(0),
      lerp("vizinha.shock", 0, 6, 0.8, 0, "inOut"),
      lerp("rose.sad", 0, 8, 1, 0, "inOut"),
      spring("rose.ok", W("s3", 7), W("s3", 7) + 18, 0, 1, 7),
      lerp("rose.hop", W("s3", 11), W("s3", 11) + 4, 0, 1, "out"),
      ...punch(W("s3", 11), 0.7),
    ],
    badges: [
      { text: "LEI COMPLEMENTAR 150/2015", variant: "info", appearAt: W("s3", 1), disappearAt: W("s3", 5) },
      { text: "DOMÉSTICA DE CARTEIRA ASSINADA", variant: "positive", appearAt: W("s3", 5), disappearAt: end(2) },
    ],
    bigWords: [
      { text: "DESDE 2015", at: W("s3", 1), until: W("s3", 11), color: GOLD, size: 180, y: 1000, tilt: -5 },
      { text: "AUXÍLIO-ACIDENTE", at: W("s3", 11), until: end(2), color: G, size: 110, y: 1000, tilt: -4 },
    ],
    highlights: ["2015", "EMPREGADA", "DOMÉSTICA", "CARTEIRA", "ASSINADA", "DIREITO", "AUXÍLIO-ACIDENTE"],
    captions: [{ text: "Desde 2015, empregada doméstica de carteira assinada também tem direito ao auxílio-acidente.", from: voLocal("s3"), to: end(2) }],
    audioCues: [narration("s3", "ready"), sfx("whoosh", 0, 0.22), sfx("ding", W("s3", 1), 0.22), sfx("badge", W("s3", 5), 0.2), sfx("airhorn", W("s3", 11), 0.16)],
  },
  // ------------------------------------------------------------------ s4 · a sequela (raio-x)
  {
    id: "scene-04-sequela",
    startFrame: sc(3).from,
    durationInFrames: sc(3).durationInFrames,
    voKey: "s4",
    narration: "A Rose ficou com sequela: dois dedos não dobram direito, e isso atrapalha o trabalho dela.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.roseLow), key(end(3), P.rose, "linear")] },
    objects: [...SYSTEM()],
    animations: [
      ...whip(0),
      lerp("rose.ok", 0, 6, 1, 0, "in"),
      lerp("rose.hop", 0, 4, 1, 0, "in"),
      spring("xray", W("s4", 4), W("s4", 4) + 24, 0, 1, 10),
      lerp("xray.crack", W("s4", 6), W("s4", 6) + 8, 0, 1, "out"),
      lerp("xray", W("s4", 10) - 6, W("s4", 10), 1, 0, "in"),
      lerp("rose.sad", W("s4", 10), W("s4", 10) + 8, 0, 0.7, "inOut"),
    ],
    badges: [{ text: "REDUZ A CAPACIDADE PRO TRABALHO", variant: "warning", appearAt: W("s4", 10), disappearAt: end(3) }],
    bigWords: [{ text: "SEQUELA", at: W("s4", 4), until: W("s4", 10), color: R, size: 190, y: 1100, tilt: -5 }],
    highlights: ["ROSE", "SEQUELA", "DOIS", "DEDOS", "NÃO", "DOBRAM", "ATRAPALHA", "TRABALHO"],
    captions: [{ text: "A Rose ficou com sequela: dois dedos não dobram direito, e isso atrapalha o trabalho dela.", from: voLocal("s4"), to: end(3) }],
    audioCues: [narration("s4", "ready"), sfx("whoosh", 0, 0.22), sfx("shimmer", W("s4", 4), 0.2), sfx("crack", W("s4", 6), 0.24), sfx("badge", W("s4", 10), 0.2)],
  },
  // ------------------------------------------------------------------ s5 · 50% todo mês + continua trabalhando
  {
    id: "scene-05-valor",
    startFrame: sc(4).from,
    durationInFrames: sc(4).durationInFrames,
    voKey: "s5",
    narration: "Então ela recebe uma indenização todo mês, em regra, metade do salário de benefício, e continua trabalhando.",
    camera: { projection: "perspective", movement: "orbit", keys: [key(0, P.pipes), key(W("s5", 14) - 2, P.pipes), key(W("s5", 14) + 8, P.piggy, "soft"), key(end(4), P.piggy)] },
    objects: [...SYSTEM(), ...MONEY()],
    animations: [
      ...whip(0),
      lerp("rose.sad", 0, 1, 0, 0),
      lerp("piggy.level", 0, 1, 0.3, 0.3),
      lerp("coins.salary.flow", 0, 1, 0, 0),
      lerp("pipeAccident.grow", 0, 1, 0, 0),
      lerp("pipeAccident.grow", W("s5", 4) - 4, W("s5", 4) + 18, 0, 1, "out"),
      lerp("pipeAccident.glow", W("s5", 4), W("s5", 4) + 12, 0, 1, "out"),
      lerp("coins.accident.flow", W("s5", 4) + 14, W("s5", 4) + 24, 0, 1, "linear"),
      lerp("coins.salary.flow", W("s5", 14), W("s5", 14) + 10, 0, 1, "linear"),
      lerp("piggy.level", W("s5", 4) + 18, end(4), 0.3, 0.85, "linear"),
      lerp("coinRain", W("s5", 14), W("s5", 14) + 10, 0, 1, "out"),
      ...punch(W("s5", 9), 0.6),
    ],
    badges: [
      { text: "INDENIZAÇÃO MENSAL", variant: "info", appearAt: W("s5", 4), disappearAt: W("s5", 9) },
      { text: "DO SALÁRIO DE BENEFÍCIO", variant: "positive", appearAt: W("s5", 10), disappearAt: W("s5", 14) },
      { text: "+ SALÁRIO DO TRABALHO", variant: "positive", appearAt: W("s5", 14), disappearAt: end(4) },
    ],
    bigWords: [{ text: "50%", at: W("s5", 9), until: W("s5", 14), color: GOLD, size: 230, y: 460, tilt: -5 }],
    highlights: ["INDENIZAÇÃO", "MÊS", "REGRA", "METADE", "SALÁRIO", "BENEFÍCIO", "CONTINUA", "TRABALHANDO"],
    captions: [
      { text: "Então ela recebe uma indenização todo mês, em regra, metade do salário de benefício,", from: voLocal("s5"), to: W("s5", 14) },
      { text: "e continua trabalhando.", from: W("s5", 14), to: end(4) },
    ],
    audioCues: [narration("s5", "ready"), sfx("whoosh", 0, 0.22), sfx("badge", W("s5", 4), 0.2), sfx("coin", W("s5", 4) + 16, 0.22), sfx("ding", W("s5", 9), 0.24), sfx("cash", W("s5", 14), 0.28)],
  },
  // ------------------------------------------------------------------ s6 · até se aposentar + a vizinha sem palavras
  {
    id: "scene-06-mito",
    startFrame: sc(5).from,
    durationInFrames: sc(5).durationInFrames,
    voKey: "s6",
    narration: "E isso vai até ela se aposentar. E a vizinha? Ficou sem palavras.",
    camera: { projection: "perspective", movement: "tracking", keys: [key(0, P.rose), key(W("s6", 7) - 2, P.rose), key(W("s6", 7) + 6, P.plaza, "out"), key(end(5), P.plazaLow, "linear")] },
    objects: [...SYSTEM()],
    animations: [
      ...whip(0),
      lerp("coinRain", 0, 6, 1, 0, "in"),
      lerp("rose.shades", 2, 12, 0, 1, "in"),
      lerp("rose.dance", 14, 20, 0, 1, "out"),
      spring("vizinha.shock", W("s6", 9), W("s6", 9) + 14, 0, 1, 7),
      lerp("vizinha.sad", W("s6", 10), W("s6", 10) + 8, 0, 1, "inOut"),
      ...punch(W("s6", 3), 0.6),
    ],
    badges: [],
    bigWords: [
      { text: "ATÉ SE APOSENTAR", at: W("s6", 3), until: W("s6", 7), color: GOLD, size: 110, y: 300, tilt: -4 },
      { text: "MITO!", at: W("s6", 7), until: end(5), color: GOLD, size: 210, y: 300, tilt: -6 },
    ],
    labels: [{ text: "...", point: VIZ_HEAD, at: W("s6", 10), until: end(5), off: [0, -120], accent: "#9aa3ad" }],
    highlights: ["APOSENTAR", "VIZINHA", "SEM", "PALAVRAS"],
    captions: [{ text: "E isso vai até ela se aposentar. E a vizinha? Ficou sem palavras.", from: voLocal("s6"), to: end(5) }],
    audioCues: [narration("s6", "ready"), sfx("whoosh", 0, 0.22), sfx("ding", 12, 0.22), sfx("whoosh", W("s6", 7), 0.2), sfx("sadtrombone", W("s6", 10), 0.22)],
  },
  // ------------------------------------------------------------------ s7 · marca + siga
  {
    id: "scene-07-final",
    startFrame: sc(6).from,
    durationInFrames: sc(6).durationInFrames,
    voKey: "s7",
    narration: "Conhece alguma doméstica que passou por isso? Marca ela nos comentários, e siga o Advogado de Bolso em todas as redes!",
    camera: { projection: "perspective", movement: "dolly-out", keys: [key(0, P.plazaLow), key(W("s7", 12), P.plazaLow), key(W("s7", 20) + 20, P.final, "inOut"), key(end(6), P.final)] },
    objects: [...SYSTEM()],
    animations: [
      spring("comment", W("s7", 7), W("s7", 7) + 22, 0, 1, 8),
      lerp("comment", W("s7", 12) - 4, W("s7", 12) + 4, 1, 0, "in"),
      spring("follow", W("s7", 12), W("s7", 12) + 22, 0, 1, 8),
      lerp("follow", end(6) - 58, end(6) - 50, 1, 0, "in"),
      lerp("confetti", W("s7", 12), W("s7", 12) + 10, 0, 0.7, "out"),
      lerp("confetti", end(6) - 60, end(6) - 40, 0.7, 0, "in"),
      spring("endcard", end(6) - 52, end(6) - 22, 0, 1, 10),
    ],
    badges: [],
    chat: { title: "GRUPO DO CONDOMÍNIO", subtitle: "Vizinha do 12, Síndico, +40", at: W("s7", 0), until: W("s7", 7), y: 260, msgs: [{ who: "Vizinha do 12", text: VIZ_SAYS, at: W("s7", 0), color: "#d35400" }, { who: "Rose", text: "Tem sim, vizinha! kkkkk", at: W("s7", 3), me: true }] },
    highlights: ["DOMÉSTICA", "MARCA", "COMENTÁRIOS", "SIGA", "ADVOGADO", "BOLSO", "REDES"],
    captions: [{ text: "Conhece alguma doméstica que passou por isso? Marca ela nos comentários, e siga o Advogado de Bolso em todas as redes!", from: voLocal("s7"), to: end(6) - 52 }],
    audioCues: [narration("s7", "ready"), sfx("plim", W("s7", 0), 0.22), sfx("plim", W("s7", 3), 0.2), sfx("pop", W("s7", 7), 0.26), sfx("ding", W("s7", 12), 0.22), sfx("final", end(6) - 52, 0.3)],
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
