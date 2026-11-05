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

/** Cenário: praça do INSS, a Júlia (desempregada e grávida) e a sogra. */
const SYSTEM = (): SceneObject[] => [o("island", "diorama-ilha"), o("inss", "predio-inss"), o("warehouse", "galpao"), o("julia", "julia"), o("sogra", "sogra")];
const DOC = o("doc", "documento-do-inss");
const BAR = o("pctBar", "relogio-do-periodo-de-graca");
const SOGRA_HEAD: Vec3 = [-0.4, 1.85, -1.05];
const JULIA_HEAD: Vec3 = [0.45, 1.95, -1.35];
const PINK = "#ff8fc1";

const P = {
  julia: orbit([0.45, 1.3, -1.35], 5.6, -15, 4),
  juliaLow: orbit([0.45, 1.7, -1.35], 6.0, -12, 2),
  sogra: orbit([-0.4, 1.35, -1.05], 5.6, -4, 3),
  plaza: orbit([0.3, 1.0, -1.35], 13, -6, 7),
  plazaLow: orbit([0.3, 1.45, -1.35], 13, -6, 4),
  bar: orbit([1.1, 1.1, -1.5], 8, -10, 6),
  doc: orbit([1.0, 1.15, -1.75], 7.5, 10, 4),
  final: orbit([0.2, 1.4, -1.35], 30, 10, 18),
};

export const scenes: ScenePlan[] = [
  // ------------------------------------------------------------------ s1 · demitida + grávida + a sogra
  {
    id: "scene-01-gancho",
    startFrame: sc(0).from,
    durationInFrames: sc(0).durationInFrames,
    voKey: "s1",
    narration: "A Júlia perdeu o emprego, descobriu que tava grávida, e a sogra disse: agora você não recebe nada!",
    camera: { projection: "perspective", movement: "tracking", keys: [key(0, P.julia), key(W("s1", 10) - 4, P.julia), key(W("s1", 10) + 4, P.sogra, "out"), key(end(0), P.sogra)] },
    objects: [...SYSTEM()],
    animations: [
      lerp("julia.belly", 0, 1, 0, 0),
      lerp("julia.baby", 0, 1, 0, 0),
      ...flash(2, 0.5),
      ...punch(2, 0.8),
      lerp("julia.sad", 2, 8, 0, 1, "out"),
      lerp("vignette.red", 2, 8, 0, 0.45, "out"),
      lerp("vignette.red", W("s1", 5), W("s1", 5) + 8, 0.45, 0, "in"),
      lerp("julia.sad", W("s1", 8), W("s1", 8) + 6, 1, 0, "inOut"),
      spring("julia.belly", W("s1", 8) - 2, W("s1", 8) + 16, 0, 1, 7),
      spring("julia.shock", W("s1", 8), W("s1", 8) + 14, 0, 0.8, 7),
      lerp("julia.shock", W("s1", 8) + 14, W("s1", 8) + 20, 0.8, 0, "inOut"),
      lerp("hearts", W("s1", 8), W("s1", 8) + 6, 0, 0.8, "out"),
      lerp("hearts", W("s1", 10) - 4, W("s1", 10), 0.8, 0, "in"),
      lerp("sogra.laugh", W("s1", 12), W("s1", 12) + 6, 0, 1, "out"),
      lerp("sogra.wave", W("s1", 12), W("s1", 12) + 8, 0, 1, "out"),
    ],
    badges: [],
    bigWords: [
      { text: "DEMITIDA!", at: 2, until: W("s1", 5), color: R, size: 190, y: 1000, tilt: -6 },
      { text: "GRÁVIDA!", at: W("s1", 8), until: W("s1", 10), color: PINK, size: 190, y: 1000, tilt: 5 },
    ],
    labels: [
      { text: "JÚLIA", point: JULIA_HEAD, at: 6, until: W("s1", 5), off: [-60, -110], accent: "#4fc3f7" },
      { text: "AGORA VOCÊ NÃO RECEBE NADA!", point: SOGRA_HEAD, at: W("s1", 12), until: end(0), off: [60, -150], accent: Y },
    ],
    highlights: ["JÚLIA", "PERDEU", "EMPREGO", "GRÁVIDA", "SOGRA", "NADA"],
    captions: [{ text: "A Júlia perdeu o emprego, descobriu que tava grávida, e a sogra disse: agora você não recebe nada!", from: voLocal("s1"), to: end(0) }],
    audioCues: [narration("s1", "ready"), sfx("thud", 2, 0.34), sfx("sadtrombone", 6, 0.16), sfx("boing", W("s1", 8), 0.26), sfx("shimmer", W("s1", 8) + 2, 0.2), sfx("whoosh", W("s1", 10), 0.22), sfx("pop", W("s1", 12), 0.2)],
  },
  // ------------------------------------------------------------------ s2 · será? final feliz
  {
    id: "scene-02-sera",
    startFrame: sc(1).from,
    durationInFrames: sc(1).durationInFrames,
    voKey: "s2",
    narration: "Será? Calma, que essa história tem final feliz.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.plaza), key(end(1), P.plazaLow, "linear")] },
    objects: [...SYSTEM()],
    animations: [...whip(0), lerp("sogra.laugh", 0, 8, 1, 0.4, "inOut"), lerp("sogra.wave", 0, 6, 1, 0, "in"), lerp("hearts", W("s2", 5), W("s2", 5) + 8, 0, 0.6, "out"), lerp("hearts", end(1) - 6, end(1), 0.6, 0, "in"), lerp("julia.hop", W("s2", 6), W("s2", 6) + 4, 0, 1, "out"), lerp("julia.hop", end(1) - 4, end(1), 1, 0, "in")],
    badges: [{ text: "TEM FINAL FELIZ", variant: "positive", appearAt: W("s2", 5), disappearAt: end(1) }],
    bigWords: [{ text: "SERÁ?", at: W("s2", 0), until: W("s2", 5), color: Y, size: 220, y: 460, tilt: -6 }],
    highlights: ["SERÁ", "CALMA", "FINAL", "FELIZ"],
    captions: [{ text: "Será? Calma, que essa história tem final feliz.", from: voLocal("s2"), to: end(1) }],
    audioCues: [narration("s2", "ready"), sfx("whoosh", 0, 0.22), sfx("scratch", 2, 0.3), sfx("shimmer", W("s2", 5), 0.18)],
  },
  // ------------------------------------------------------------------ s3 · período de graça
  {
    id: "scene-03-graca",
    startFrame: sc(2).from,
    durationInFrames: sc(2).durationInFrames,
    voKey: "s3",
    narration: "Quem sai do emprego continua segurada do INSS por um tempo. É o período de graça: em regra, 12 meses, e pode ser mais.",
    camera: { projection: "perspective", movement: "orbit", keys: [key(0, P.julia), key(W("s3", 11) - 4, P.julia), key(W("s3", 11) + 4, P.bar, "out"), key(end(2), P.bar)] },
    objects: [...SYSTEM(), BAR],
    animations: [
      ...whip(0),
      lerp("sogra.laugh", 0, 1, 0, 0),
      spring("julia.ok", W("s3", 5), W("s3", 5) + 18, 0, 1, 7),
      lerp("julia.ok", W("s3", 11), W("s3", 11) + 6, 1, 0, "in"),
      lerp("pct.pop", 0, 1, 0, 0),
      lerp("pct.level", 0, 1, 1, 1),
      spring("pct.pop", W("s3", 11), W("s3", 11) + 20, 0, 1, 8),
      lerp("pct.level", W("s3", 18), end(2), 1, 0.6, "linear"),
      ...punch(W("s3", 18), 0.6),
    ],
    badges: [
      { text: "AINDA SEGURADA DO INSS", variant: "positive", appearAt: W("s3", 5), disappearAt: W("s3", 11) },
      { text: "EM REGRA: 12 MESES", variant: "info", appearAt: W("s3", 16), disappearAt: W("s3", 20) },
      { text: "PODE SER MAIS", variant: "positive", subtitle: "conforme o tempo de contribuição e o desemprego", appearAt: W("s3", 20), disappearAt: end(2) },
    ],
    bigWords: [
      { text: "PERÍODO", at: W("s3", 13), until: W("s3", 18), color: "#ffffff", size: 170, y: 420, tilt: -5 },
      { text: "DE GRAÇA", at: W("s3", 14), until: W("s3", 18), color: G, size: 170, y: 590, tilt: -5 },
      { text: "12 MESES", at: W("s3", 18), until: end(2), color: GOLD, size: 200, y: 460, tilt: -5 },
    ],
    highlights: ["EMPREGO", "SEGURADA", "INSS", "TEMPO", "PERÍODO", "GRAÇA", "12", "MESES", "MAIS"],
    captions: [
      { text: "Quem sai do emprego continua segurada do INSS por um tempo.", from: voLocal("s3"), to: W("s3", 11) },
      { text: "É o período de graça: em regra, 12 meses, e pode ser mais.", from: W("s3", 11), to: end(2) },
    ],
    audioCues: [narration("s3", "ready"), sfx("whoosh", 0, 0.22), sfx("ding", W("s3", 5), 0.22), sfx("whoosh", W("s3", 11), 0.2), sfx("pop", W("s3", 11) + 2, 0.2), sfx("tick", W("s3", 18), 0.22), sfx("badge", W("s3", 20), 0.2)],
  },
  // ------------------------------------------------------------------ s4 · pediu no INSS: 120 dias (nasce o bebê)
  {
    id: "scene-04-120-dias",
    startFrame: sc(3).from,
    durationInFrames: sc(3).durationInFrames,
    voKey: "s4",
    narration: "A Júlia ainda tava nesse prazo. Então pediu o salário-maternidade direto no INSS: 120 dias.",
    camera: { projection: "perspective", movement: "orbit", keys: [key(0, P.bar), key(W("s4", 6) - 2, P.bar), key(W("s4", 6) + 6, P.doc, "out"), key(W("s4", 13) - 4, P.doc), key(W("s4", 13) + 4, P.juliaLow, "out"), key(end(3), P.juliaLow)] },
    objects: [...SYSTEM(), BAR, DOC],
    animations: [
      ...whip(0),
      lerp("pct.level", 0, 1, 0.6, 0.6),
      spring("julia.ok", W("s4", 5), W("s4", 5) + 18, 0, 1, 7),
      lerp("julia.ok", W("s4", 13) - 4, W("s4", 13), 1, 0, "in"),
      lerp("pct.pop", W("s4", 6), W("s4", 6) + 6, 1, 0, "in"),
      lerp("doc.pop", 0, 1, 0, 0),
      lerp("doc.deny", 0, 1, 0, 0),
      lerp("doc.ok", 0, 1, 0, 0),
      spring("doc.pop", W("s4", 7), W("s4", 7) + 20, 0, 1, 8),
      spring("doc.ok", W("s4", 11), W("s4", 11) + 20, 0, 1, 7),
      ...flash(W("s4", 13), 0.6),
      lerp("julia.belly", W("s4", 13), W("s4", 13) + 2, 1, 0, "linear"),
      lerp("julia.baby", W("s4", 13), W("s4", 13) + 2, 0, 1, "linear"),
      lerp("hearts", W("s4", 13), W("s4", 13) + 8, 0, 1, "out"),
      lerp("confetti", W("s4", 13), W("s4", 13) + 8, 0, 0.8, "out"),
      ...punch(W("s4", 13), 0.8),
    ],
    badges: [{ text: "PAGO DIRETO PELO INSS", variant: "info", appearAt: W("s4", 7), disappearAt: W("s4", 13) }],
    bigWords: [
      { text: "NO PRAZO!", at: W("s4", 5), until: W("s4", 6) + 6, color: G, size: 180, y: 460, tilt: -5 },
      { text: "120 DIAS", at: W("s4", 13), until: end(3), color: GOLD, size: 210, y: 300, tilt: -5 },
    ],
    highlights: ["JÚLIA", "PRAZO", "PEDIU", "SALÁRIO-MATERNIDADE", "INSS", "120", "DIAS"],
    captions: [
      { text: "A Júlia ainda tava nesse prazo.", from: voLocal("s4"), to: W("s4", 6) },
      { text: "Então pediu o salário-maternidade direto no INSS: 120 dias.", from: W("s4", 6), to: end(3) },
    ],
    audioCues: [narration("s4", "ready"), sfx("whoosh", 0, 0.22), sfx("ding", W("s4", 5), 0.22), sfx("pop", W("s4", 7), 0.2), sfx("stamp", W("s4", 11), 0.36), sfx("airhorn", W("s4", 13), 0.18), sfx("shimmer", W("s4", 13) + 2, 0.2)],
  },
  // ------------------------------------------------------------------ s5 · lei nova: 30 dias, senão libera automático
  {
    id: "scene-05-30-dias",
    startFrame: sc(4).from,
    durationInFrames: sc(4).durationInFrames,
    voKey: "s5",
    narration: "E desde maio de 2026, o INSS tem 30 dias pra liberar. Se atrasar, o benefício é liberado automaticamente, de forma provisória.",
    camera: { projection: "perspective", movement: "orbit", keys: [key(0, P.doc), key(W("s5", 11), P.bar, "soft"), key(W("s5", 16), P.bar), key(W("s5", 17) + 4, P.juliaLow, "out"), key(end(4), P.juliaLow)] },
    objects: [...SYSTEM(), BAR, DOC],
    animations: [
      ...whip(0),
      lerp("hearts", 0, 8, 1, 0, "in"),
      lerp("confetti", 0, 8, 0.8, 0, "in"),
      lerp("doc.ok", 0, 1, 1, 1),
      spring("pct.pop", W("s5", 8) - 4, W("s5", 8) + 16, 0, 1, 8),
      lerp("pct.level", W("s5", 8) - 4, W("s5", 8), 0.6, 1, "out"),
      lerp("pct.level", W("s5", 9), W("s5", 16), 1, 0, "linear"),
      ...flash(W("s5", 17), 0.5),
      lerp("julia.hop", W("s5", 17), W("s5", 17) + 4, 0, 1, "out"),
      lerp("julia.hop", end(4) - 6, end(4), 1, 0, "in"),
      lerp("plazaCoins", W("s5", 17), W("s5", 17) + 8, 0, 1, "out"),
    ],
    badges: [
      { text: "LEI 15.415/2026", variant: "info", appearAt: W("s5", 4), disappearAt: W("s5", 11) },
      { text: "SE ATRASAR", variant: "warning", appearAt: W("s5", 11), disappearAt: W("s5", 17) },
      { text: "LIBERAÇÃO PROVISÓRIA", variant: "positive", subtitle: "pra quem recebe direto do INSS", appearAt: W("s5", 17), disappearAt: end(4) },
    ],
    bigWords: [
      { text: "30 DIAS", at: W("s5", 8), until: W("s5", 11) + 10, color: GOLD, size: 210, y: 460, tilt: -5 },
      { text: "AUTOMÁTICO!", at: W("s5", 17), until: end(4), color: G, size: 170, y: 420, tilt: -5 },
    ],
    highlights: ["MAIO", "2026", "INSS", "30", "DIAS", "LIBERAR", "ATRASAR", "AUTOMATICAMENTE", "PROVISÓRIA"],
    captions: [
      { text: "E desde maio de 2026, o INSS tem 30 dias pra liberar.", from: voLocal("s5"), to: W("s5", 11) },
      { text: "Se atrasar, o benefício é liberado automaticamente, de forma provisória.", from: W("s5", 11), to: end(4) },
    ],
    audioCues: [narration("s5", "ready"), sfx("whoosh", 0, 0.22), sfx("badge", W("s5", 4), 0.2), sfx("ding", W("s5", 8), 0.24), sfx("drumroll", W("s5", 11), 0.18), sfx("cash", W("s5", 17), 0.28)],
  },
  // ------------------------------------------------------------------ s6 · a sogra já escolhe o nome
  {
    id: "scene-06-sogra",
    startFrame: sc(5).from,
    durationInFrames: sc(5).durationInFrames,
    voKey: "s6",
    narration: "E a sogra? Já tá escolhendo o nome do neto.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.plaza), key(end(5), P.plazaLow, "linear")] },
    objects: [...SYSTEM()],
    animations: [
      ...whip(0),
      lerp("plazaCoins", 0, 8, 1, 0, "in"),
      lerp("sogra.hop", W("s6", 3), W("s6", 3) + 4, 0, 1, "out"),
      lerp("sogra.wave", W("s6", 3), W("s6", 3) + 8, 0, 1, "out"),
      lerp("hearts", W("s6", 3), W("s6", 3) + 8, 0, 1, "out"),
      lerp("julia.shades", 4, 14, 0, 1, "in"),
    ],
    badges: [],
    bigWords: [{ text: "VOVÓ CORUJA!", at: W("s6", 3), until: end(5), color: PINK, size: 150, y: 300, tilt: -5 }],
    labels: [{ text: "VAI SE CHAMAR ENZO!", point: SOGRA_HEAD, at: W("s6", 5), until: end(5), off: [-60, -140], accent: Y }],
    highlights: ["SOGRA", "ESCOLHENDO", "NOME", "NETO"],
    captions: [{ text: "E a sogra? Já tá escolhendo o nome do neto.", from: voLocal("s6"), to: end(5) }],
    audioCues: [narration("s6", "ready"), sfx("whoosh", 0, 0.22), sfx("ding", 14, 0.2), sfx("boing", W("s6", 3), 0.22), sfx("pop", W("s6", 5), 0.2)],
  },
  // ------------------------------------------------------------------ s7 · marca nos comentários + siga
  {
    id: "scene-07-final",
    startFrame: sc(6).from,
    durationInFrames: sc(6).durationInFrames,
    voKey: "s7",
    narration: "Conhece alguma grávida desempregada? Marca ela nos comentários, e siga o Advogado de Bolso em todas as redes!",
    camera: { projection: "perspective", movement: "dolly-out", keys: [key(0, P.plazaLow), key(W("s7", 9), P.plazaLow), key(W("s7", 17) + 20, P.final, "inOut"), key(end(6), P.final)] },
    objects: [...SYSTEM()],
    animations: [
      lerp("hearts", 0, 10, 1, 0.5, "inOut"),
      lerp("julia.dance", 2, 8, 0, 1, "out"),
      lerp("sogra.dance", 4, 10, 0, 1, "out"),
      spring("comment", W("s7", 4), W("s7", 4) + 22, 0, 1, 8),
      lerp("comment", W("s7", 9) - 4, W("s7", 9) + 4, 1, 0, "in"),
      spring("follow", W("s7", 9), W("s7", 9) + 22, 0, 1, 8),
      lerp("follow", end(6) - 58, end(6) - 50, 1, 0, "in"),
      lerp("hearts", end(6) - 60, end(6) - 40, 0.5, 0, "in"),
      spring("endcard", end(6) - 52, end(6) - 22, 0, 1, 10),
    ],
    badges: [],
    chat: { title: "GRUPO DA FAMÍLIA", subtitle: "Sogra, Cunhada, Vó, +18", at: W("s7", 0), until: W("s7", 4), y: 260, msgs: [{ who: "Sogra", text: "Quem vai ser a madrinha??", at: W("s7", 0), color: "#2e7d5b" }, { who: "Júlia", text: "Calma, sogra! kkkkk", at: W("s7", 2), me: true }] },
    highlights: ["GRÁVIDA", "DESEMPREGADA", "MARCA", "COMENTÁRIOS", "SIGA", "ADVOGADO", "BOLSO", "REDES"],
    captions: [{ text: "Conhece alguma grávida desempregada? Marca ela nos comentários, e siga o Advogado de Bolso em todas as redes!", from: voLocal("s7"), to: end(6) - 52 }],
    audioCues: [narration("s7", "ready"), sfx("plim", W("s7", 0), 0.22), sfx("plim", W("s7", 2), 0.2), sfx("pop", W("s7", 4), 0.26), sfx("ding", W("s7", 9), 0.22), sfx("final", end(6) - 52, 0.3)],
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
