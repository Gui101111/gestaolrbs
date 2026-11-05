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

/** Cenário: estradinha (tombo de moto), praça do INSS, o Diego (CLT) e o motoboy de aplicativo. */
const SYSTEM = (): SceneObject[] => [o("island", "diorama-ilha"), o("inss", "predio-inss"), o("warehouse", "galpao"), o("diego", "diego-motoboy-clt"), o("appboy", "motoboy-de-aplicativo")];
const ROAD = o("road", "estradinha-com-moto");
const MONEY = (): SceneObject[] => [o("piggy", "cofrinho"), o("accidentPipe", "cano-dourado-auxilio"), o("salaryPipe", "cano-do-salario")];
const DIEGO_HEAD: Vec3 = [0.45, 2.2, -1.35];
const APP_HEAD: Vec3 = [-0.45, 2.2, -1.05];

const P = {
  road: orbit([4.1, 0.6, 1.4], 7, -30, 12),
  roadWide: orbit([4.1, 0.7, 1.4], 9.5, -25, 14),
  diego: orbit([0.45, 1.45, -1.35], 6, -15, 4),
  diegoLow: orbit([0.45, 1.85, -1.35], 6.4, -12, 2),
  app: orbit([-0.45, 1.45, -1.05], 5.8, -4, 3),
  plaza: orbit([0.0, 1.0, -1.3], 13, -6, 7),
  plazaLow: orbit([0.0, 1.45, -1.3], 13, -6, 4),
  pipes: orbit([1.2, 2.0, -0.4], 22, -12, 22),
  final: orbit([0.0, 1.4, -1.3], 30, 10, 18),
};

export const scenes: ScenePlan[] = [
  // ------------------------------------------------------------------ s1 · o tombo + "é de carteira assinada?"
  {
    id: "scene-01-gancho",
    startFrame: sc(0).from,
    durationInFrames: sc(0).durationInFrames,
    voKey: "s1",
    narration: "O Diego é motoboy, caiu de moto e ficou com sequela no joelho. A pergunta que vale ouro: ele é de carteira assinada?",
    camera: { projection: "perspective", movement: "tracking", keys: [key(0, P.road), key(W("s1", 13) - 4, P.roadWide, "linear"), key(W("s1", 13) + 4, P.diego, "out"), key(end(0), P.diegoLow, "linear")] },
    objects: [...SYSTEM(), ROAD],
    animations: [
      lerp("road.pop", 0, 1, 1, 1),
      lerp("moto.tip", 0, 1, 0, 0),
      lerp("rider.sit", 0, 1, 0, 0),
      lerp("moto.tip", 6, 16, 0, 85, "in", "deg"),
      ...flash(16, 0.7),
      lerp("camera.shake", 16, 19, 0, 1, "out"),
      lerp("camera.shake", 19, 30, 1, 0, "in"),
      lerp("rider.sit", 24, 30, 0, 1, "out"),
      lerp("vignette.red", W("s1", 10), W("s1", 10) + 8, 0, 0.45, "out"),
      lerp("vignette.red", W("s1", 13), W("s1", 13) + 6, 0.45, 0, "in"),
      ...whip(W("s1", 13)),
      lerp("diego.scratch", W("s1", 17), W("s1", 17) + 8, 0, 1, "out"),
    ],
    badges: [{ text: "SEQUELA NO JOELHO", variant: "negative", appearAt: W("s1", 10), disappearAt: W("s1", 13) }],
    bigWords: [
      { text: "TOMBO!", at: 16, until: W("s1", 10), color: R, size: 210, y: 1000, tilt: -8 },
      { text: "CARTEIRA ASSINADA?", at: W("s1", 21), until: end(0), color: GOLD, size: 100, y: 460, tilt: -4 },
    ],
    labels: [{ text: "DIEGO · MOTOBOY", point: DIEGO_HEAD, at: W("s1", 14), until: W("s1", 21), off: [0, -110], accent: R }],
    highlights: ["DIEGO", "MOTOBOY", "CAIU", "MOTO", "SEQUELA", "JOELHO", "PERGUNTA", "OURO", "CARTEIRA", "ASSINADA"],
    captions: [{ text: "O Diego é motoboy, caiu de moto e ficou com sequela no joelho. A pergunta que vale ouro: ele é de carteira assinada?", from: voLocal("s1"), to: end(0) }],
    audioCues: [narration("s1", "ready"), sfx("whoosh-big", 2, 0.26), sfx("thud", 16, 0.4), sfx("crack", 17, 0.26), sfx("boing", 26, 0.18), sfx("whoosh", W("s1", 13), 0.22), sfx("drumroll", W("s1", 13) + 4, 0.2)],
  },
  // ------------------------------------------------------------------ s2 · muda tudo
  {
    id: "scene-02-muda-tudo",
    startFrame: sc(1).from,
    durationInFrames: sc(1).durationInFrames,
    voKey: "s2",
    narration: "Porque isso muda tudo!",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.diegoLow), key(end(1), P.diego, "out")] },
    objects: [...SYSTEM()],
    animations: [lerp("diego.scratch", 0, 6, 1, 0, "in"), ...flash(W("s2", 2), 0.4), ...punch(W("s2", 2), 0.8), spring("diego.shock", W("s2", 2), W("s2", 2) + 14, 0, 0.7, 7)],
    badges: [],
    bigWords: [{ text: "MUDA TUDO!", at: W("s2", 2), until: end(1), color: Y, size: 180, y: 460, tilt: -6 }],
    highlights: ["MUDA", "TUDO"],
    captions: [{ text: "Porque isso muda tudo!", from: voLocal("s2"), to: end(1) }],
    audioCues: [narration("s2", "ready"), sfx("stamp", W("s2", 2), 0.3)],
  },
  // ------------------------------------------------------------------ s3 · CLT + sequela = direito
  {
    id: "scene-03-clt",
    startFrame: sc(2).from,
    durationInFrames: sc(2).durationInFrames,
    voKey: "s3",
    narration: "Se for empregado de carteira assinada e ficar com sequela, tem direito ao auxílio-acidente, mesmo voltando a trabalhar.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.diego), key(end(2), P.diegoLow, "linear")] },
    objects: [...SYSTEM()],
    animations: [
      ...whip(0),
      lerp("diego.shock", 0, 6, 0.7, 0, "inOut"),
      spring("diego.ok", W("s3", 5), W("s3", 5) + 18, 0, 1, 7),
      lerp("diego.thumb", W("s3", 10), W("s3", 10) + 8, 0, 1, "out"),
      ...punch(W("s3", 10), 0.7),
    ],
    badges: [
      { text: "EMPREGADO DE CARTEIRA ASSINADA", variant: "positive", appearAt: W("s3", 2), disappearAt: W("s3", 10) },
      { text: "MESMO VOLTANDO A TRABALHAR", variant: "positive", appearAt: W("s3", 14), disappearAt: end(2) },
    ],
    bigWords: [{ text: "TEM DIREITO!", at: W("s3", 10), until: end(2), color: G, size: 170, y: 1000, tilt: -5 }],
    highlights: ["EMPREGADO", "CARTEIRA", "ASSINADA", "SEQUELA", "DIREITO", "AUXÍLIO-ACIDENTE", "TRABALHAR"],
    captions: [{ text: "Se for empregado de carteira assinada e ficar com sequela, tem direito ao auxílio-acidente, mesmo voltando a trabalhar.", from: voLocal("s3"), to: end(2) }],
    audioCues: [narration("s3", "ready"), sfx("whoosh", 0, 0.22), sfx("badge", W("s3", 2), 0.2), sfx("ding", W("s3", 10), 0.24), sfx("badge", W("s3", 14), 0.2)],
  },
  // ------------------------------------------------------------------ s4 · vale até fora do trabalho
  {
    id: "scene-04-fora",
    startFrame: sc(3).from,
    durationInFrames: sc(3).durationInFrames,
    voKey: "s4",
    narration: "E vale até pra acidente fora do trabalho, tipo num passeio no fim de semana.",
    camera: { projection: "perspective", movement: "orbit", keys: [key(0, P.roadWide), key(end(3), P.road, "linear")] },
    objects: [...SYSTEM(), ROAD],
    animations: [...whip(0), lerp("diego.ok", 0, 1, 0, 0), lerp("diego.thumb", 0, 1, 0, 0), lerp("moto.tip", 0, 1, 85, 85, "linear", "deg"), lerp("rider.sit", 0, 1, 1, 1)],
    badges: [{ text: "ACIDENTE DE QUALQUER NATUREZA", variant: "info", appearAt: W("s4", 4), disappearAt: end(3) }],
    bigWords: [
      { text: "FORA DO TRABALHO", at: W("s4", 5), until: W("s4", 12), color: "#ffffff", size: 110, y: 440, tilt: -4 },
      { text: "FIM DE SEMANA", at: W("s4", 12), until: end(3), color: GOLD, size: 140, y: 440, tilt: -4 },
    ],
    highlights: ["ACIDENTE", "FORA", "TRABALHO", "PASSEIO", "FIM", "SEMANA"],
    captions: [{ text: "E vale até pra acidente fora do trabalho, tipo num passeio no fim de semana.", from: voLocal("s4"), to: end(3) }],
    audioCues: [narration("s4", "ready"), sfx("whoosh", 0, 0.22), sfx("badge", W("s4", 4), 0.2), sfx("pop", W("s4", 12), 0.2)],
  },
  // ------------------------------------------------------------------ s5 · app como autônomo: não tem direito
  {
    id: "scene-05-app",
    startFrame: sc(4).from,
    durationInFrames: sc(4).durationInFrames,
    voKey: "s5",
    narration: "Agora, se ele trabalha por aplicativo como autônomo, pagando o INSS por conta própria, não tem direito a esse benefício.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.app), key(end(4), P.app)] },
    objects: [...SYSTEM()],
    animations: [
      ...whip(0),
      lerp("appboy.wave", W("s5", 3), W("s5", 3) + 8, 0, 1, "out"),
      lerp("appboy.wave", W("s5", 14) - 4, W("s5", 14), 1, 0, "in"),
      spring("appboy.x", W("s5", 14), W("s5", 14) + 18, 0, 1, 7),
      lerp("appboy.sad", W("s5", 14), W("s5", 14) + 8, 0, 1, "inOut"),
      lerp("vignette.red", W("s5", 14), W("s5", 14) + 6, 0, 0.45, "out"),
      lerp("vignette.red", end(4) - 8, end(4), 0.45, 0, "in"),
    ],
    badges: [
      { text: "APLICATIVO COMO AUTÔNOMO", variant: "warning", appearAt: W("s5", 4), disappearAt: W("s5", 8) },
      { text: "PAGA POR CONTA PRÓPRIA", variant: "warning", subtitle: "contribuinte individual ou MEI", appearAt: W("s5", 8), disappearAt: W("s5", 14) },
    ],
    bigWords: [{ text: "SEM DIREITO", at: W("s5", 14), until: end(4), color: R, size: 160, y: 1000, tilt: -5 }],
    labels: [{ text: "MOTOBOY DE APP", point: APP_HEAD, at: W("s5", 3), until: W("s5", 14), off: [0, -110], accent: "#f39c12" }],
    highlights: ["APLICATIVO", "AUTÔNOMO", "INSS", "CONTA", "PRÓPRIA", "NÃO", "DIREITO", "BENEFÍCIO"],
    captions: [
      { text: "Agora, se ele trabalha por aplicativo como autônomo, pagando o INSS por conta própria,", from: voLocal("s5"), to: W("s5", 14) },
      { text: "não tem direito a esse benefício.", from: W("s5", 14), to: end(4) },
    ],
    audioCues: [narration("s5", "ready"), sfx("whoosh", 0, 0.22), sfx("pop", W("s5", 3), 0.2), sfx("badge", W("s5", 8), 0.2), sfx("buzz", W("s5", 14), 0.28), sfx("sadtrombone", W("s5", 15), 0.16)],
  },
  // ------------------------------------------------------------------ s6 · Diego CLT: recebe todo mês + salário
  {
    id: "scene-06-mito",
    startFrame: sc(5).from,
    durationInFrames: sc(5).durationInFrames,
    voKey: "s6",
    narration: "O Diego era de carteira assinada. Resultado: recebe o auxílio todo mês, junto com o salário!",
    camera: { projection: "perspective", movement: "orbit", keys: [key(0, P.diego), key(W("s6", 6) - 2, P.diego), key(W("s6", 6) + 8, P.pipes, "out"), key(end(5), P.pipes)] },
    objects: [...SYSTEM(), ...MONEY()],
    animations: [
      ...whip(0),
      lerp("appboy.x", 0, 6, 1, 0, "in"),
      lerp("diego.shades", W("s6", 2), W("s6", 2) + 10, 0, 1, "in"),
      lerp("diego.dance", W("s6", 5), W("s6", 5) + 6, 0, 1, "out"),
      lerp("piggy.level", 0, 1, 0.3, 0.3),
      lerp("coins.salary.flow", 0, 1, 0, 0),
      lerp("pipeAccident.grow", 0, 1, 0, 0),
      lerp("pipeAccident.grow", W("s6", 7), W("s6", 7) + 20, 0, 1, "out"),
      lerp("pipeAccident.glow", W("s6", 7), W("s6", 7) + 12, 0, 1, "out"),
      lerp("coins.accident.flow", W("s6", 7) + 14, W("s6", 7) + 24, 0, 1, "linear"),
      lerp("coins.salary.flow", W("s6", 12), W("s6", 12) + 10, 0, 1, "linear"),
      lerp("piggy.level", W("s6", 7) + 16, end(5), 0.3, 0.85, "linear"),
      lerp("coinRain", W("s6", 12), W("s6", 12) + 10, 0, 1, "out"),
      ...punch(W("s6", 6), 0.7),
    ],
    badges: [
      { text: "AUXÍLIO TODO MÊS", variant: "positive", appearAt: W("s6", 7), disappearAt: W("s6", 12) },
      { text: "+ SALÁRIO", variant: "positive", appearAt: W("s6", 12), disappearAt: end(5) },
    ],
    bigWords: [{ text: "MITO!", at: W("s6", 4), until: W("s6", 7) + 4, color: GOLD, size: 210, y: 300, tilt: -6 }],
    highlights: ["DIEGO", "CARTEIRA", "ASSINADA", "RESULTADO", "RECEBE", "AUXÍLIO", "MÊS", "SALÁRIO"],
    captions: [
      { text: "O Diego era de carteira assinada.", from: voLocal("s6"), to: W("s6", 6) },
      { text: "Resultado: recebe o auxílio todo mês, junto com o salário!", from: W("s6", 6), to: end(5) },
    ],
    audioCues: [narration("s6", "ready"), sfx("whoosh", 0, 0.22), sfx("ding", W("s6", 2) + 10, 0.24), sfx("airhorn", W("s6", 4), 0.18), sfx("coin", W("s6", 7) + 16, 0.22), sfx("cash", W("s6", 12), 0.28)],
  },
  // ------------------------------------------------------------------ s7 · marca + siga
  {
    id: "scene-07-final",
    startFrame: sc(6).from,
    durationInFrames: sc(6).durationInFrames,
    voKey: "s7",
    narration: "Conhece algum motoboy? Marca ele nos comentários, e siga o Advogado de Bolso em todas as redes!",
    camera: { projection: "perspective", movement: "dolly-out", keys: [key(0, P.plazaLow), key(W("s7", 8), P.plazaLow), key(W("s7", 16) + 20, P.final, "inOut"), key(end(6), P.final)] },
    objects: [...SYSTEM()],
    animations: [
      lerp("coinRain", 0, 6, 1, 0, "in"),
      lerp("appboy.sad", 0, 8, 1, 0.3, "inOut"),
      spring("comment", W("s7", 3), W("s7", 3) + 22, 0, 1, 8),
      lerp("comment", W("s7", 8) - 4, W("s7", 8) + 4, 1, 0, "in"),
      spring("follow", W("s7", 8), W("s7", 8) + 22, 0, 1, 8),
      lerp("follow", end(6) - 58, end(6) - 50, 1, 0, "in"),
      lerp("confetti", W("s7", 8), W("s7", 8) + 10, 0, 0.7, "out"),
      lerp("confetti", end(6) - 60, end(6) - 40, 0.7, 0, "in"),
      spring("endcard", end(6) - 52, end(6) - 22, 0, 1, 10),
    ],
    badges: [],
    chat: { title: "GRUPO DOS MOTOBOYS", subtitle: "Diego, Kauã, Biel, +80", at: W("s7", 0), until: W("s7", 3) + 4, y: 260, msgs: [{ who: "Kauã (app)", text: "E eu, que sou de aplicativo?", at: W("s7", 0), color: "#f39c12" }, { who: "Diego", text: "Aí é outra história, mano!", at: W("s7", 2), me: true }] },
    highlights: ["MOTOBOY", "MARCA", "COMENTÁRIOS", "SIGA", "ADVOGADO", "BOLSO", "REDES"],
    captions: [{ text: "Conhece algum motoboy? Marca ele nos comentários, e siga o Advogado de Bolso em todas as redes!", from: voLocal("s7"), to: end(6) - 52 }],
    audioCues: [narration("s7", "ready"), sfx("plim", W("s7", 0), 0.22), sfx("plim", W("s7", 2), 0.2), sfx("pop", W("s7", 3), 0.26), sfx("ding", W("s7", 8), 0.22), sfx("final", end(6) - 52, 0.3)],
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
