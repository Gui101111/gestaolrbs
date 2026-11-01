import { evaluateTrack, orbit, type EaseName, type TrackAnimation, type Vec3 } from "../utils/animation";
import { STAGE } from "../layout";
import { DURATION, FPS, HEIGHT, SCENE_FRAMES, voLocal, WIDTH, wordLocal, type VoKey } from "../utils/timing";

// EP13 · Série 2 (comédia "mito", sítio/forró) · Aposentadoria rural: seu Tonho.
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

/** Cenário fixo: sítio do seu Tonho (casa, milharal), INSS e o compadre que duvidou. */
const SYSTEM = (): SceneObject[] => [o("island", "diorama-ilha-sitio"), o("home", "casa-do-seu-tonho"), o("inss", "predio-inss"), o("tonho", "seu-tonho-60-anos"), o("esposa", "esposa-do-seu-tonho"), o("compadre", "compadre-zoeiro")];
const DOC = o("doc", "documento-gigante-do-inss");
const LIA = o("liaBig", "advogada-de-bolso");
const HOME: Vec3 = [-2.45, 0, -1.6];
const PLAZA: Vec3 = [0.45, 0, -1.35];
const DX = PLAZA[0] - HOME[0];
const DZ = PLAZA[2] - HOME[2];
const TONHO_HEAD: Vec3 = [HOME[0], 2.15, HOME[2]];
const COMPADRE_HEAD: Vec3 = [-0.4, 2.1, -1.05];
const ORANGE = "#ff9f1c";

const P = {
  compadre: orbit([-0.4, 1.45, -1.05], 6.0, -4, 3),
  compadrePush: orbit([-0.4, 1.5, -1.05], 5.0, -4, 2),
  tonho: orbit([HOME[0], 1.5, HOME[2]], 5.5, 8, 4),
  home: orbit([-2.7, 1.15, -1.55], 9.5, 10, 8),
  homeWide: orbit([-2.6, 1.3, -1.4], 14.5, 12, 10),
  corn: orbit([-4.0, 1.0, -0.8], 8, 24, 14),
  walkA: orbit([-2.2, 1.0, -1.5], 10, 0, 6),
  walkB: orbit([0.2, 1.0, -1.45], 10, 0, 6),
  doc: orbit([STAGE.doc[0], 1.2, STAGE.doc[2]], 5.6, 17, 3),
  docPush: orbit([STAGE.doc[0], 1.15, STAGE.doc[2]], 4.4, 17, 2),
  lia: orbit([0.85, 0.95, -1.3], 6.2, 6, 4),
  final: orbit([-1.4, 1.4, -1.4], 30, 12, 18),
};

export const scenes: ScenePlan[] = [
  // ------------------------------------------------------------------ s1 · gancho
  {
    id: "scene-01-gancho",
    startFrame: sc(0).from,
    durationInFrames: sc(0).durationInFrames,
    voKey: "s1",
    narration: "Diziam que o seu Tonho nunca ia se aposentar, porque nunca pagou o INSS. Pois é...",
    camera: { projection: "perspective", movement: "tracking", keys: [key(0, P.compadrePush), key(W("s1", 3) - 4, P.compadre, "soft"), key(W("s1", 3) + 4, P.tonho, "out"), key(W("s1", 14) - 2, P.tonho), key(W("s1", 14) + 6, P.home, "out"), key(end(0), P.home)] },
    objects: [...SYSTEM()],
    animations: [
      lerp("compadre.dx", 0, 1, 0, 0),
      lerp("compadre.dz", 0, 1, 0, 0),
      lerp("compadre.ry", 0, 1, 0, 0, "linear", "rad"),
      lerp("compadre.sad", 0, 1, 0, 0),
      lerp("compadre.laugh", 0, 4, 0, 1, "out"),
      ...punch(2, 0.8),
      ...whip(W("s1", 3)),
      lerp("tonho.sad", W("s1", 3), W("s1", 3) + 8, 0, 1, "out"),
      // flash do final: forró, óculos e confete
      ...whip(W("s1", 14)),
      ...flash(W("s1", 14) + 2, 0.5),
      lerp("tonho.sad", W("s1", 14) + 2, W("s1", 14) + 4, 1, 0, "linear"),
      lerp("tonho.shades", W("s1", 14) + 4, W("s1", 14) + 14, 0, 1, "in"),
      lerp("tonho.dance", W("s1", 14) + 12, W("s1", 14) + 16, 0, 1, "out"),
      lerp("esposa.dance", W("s1", 14) + 12, W("s1", 14) + 16, 0, 1, "out"),
      lerp("confetti", W("s1", 14) + 4, W("s1", 14) + 10, 0, 1, "out"),
      lerp("rewind", end(0) - 10, end(0), 0, 1, "in"),
    ],
    badges: [{ text: "NUNCA PAGOU O CARNÊ", variant: "negative", appearAt: W("s1", 10), disappearAt: W("s1", 14) - 2 }],
    bigWords: [
      { text: "DIZIAM...", at: 2, until: W("s1", 3), color: "#ffffff", size: 160, y: 1120, tilt: 4 },
      { text: "NUNCA!", at: W("s1", 5), until: W("s1", 10), color: R, size: 200, y: 460, tilt: -6 },
      { text: "POIS É...", at: W("s1", 14), until: end(0), color: GOLD, size: 170, y: 1000, tilt: -5 },
    ],
    labels: [
      { text: "COMPADRE", point: COMPADRE_HEAD, at: 6, until: W("s1", 3), off: [0, -120], accent: "#c77dff" },
      { text: "SEU TONHO", point: TONHO_HEAD, at: W("s1", 4), until: W("s1", 5), off: [0, -110], accent: ORANGE },
    ],
    highlights: ["TONHO", "NUNCA", "APOSENTAR", "PAGOU", "INSS"],
    captions: [{ text: "Diziam que o seu Tonho nunca ia se aposentar, porque nunca pagou o INSS. Pois é...", from: voLocal("s1"), to: end(0) }],
    audioCues: [narration("s1", "ready"), sfx("boing", 2, 0.28), sfx("whoosh", W("s1", 3), 0.22), sfx("pop", W("s1", 4), 0.2), sfx("buzz", W("s1", 5), 0.2), sfx("badge", W("s1", 10), 0.2), sfx("scratch", W("s1", 14) - 2, 0.38), sfx("airhorn", W("s1", 14) + 6, 0.2), sfx("rewind", end(0) - 10, 0.3)],
  },
  // ------------------------------------------------------------------ s2 · a roça
  {
    id: "scene-02-roca",
    startFrame: sc(1).from,
    durationInFrames: sc(1).durationInFrames,
    voKey: "s2",
    narration: "O seu Tonho trabalha na roça com a família, plantando milho e mandioca, desde menino.",
    camera: { projection: "perspective", movement: "orbit", keys: [key(0, P.home), key(W("s2", 9) - 4, P.home), key(W("s2", 9) + 6, P.corn, "soft"), key(W("s2", 13), P.corn), key(end(1), P.home, "soft")] },
    objects: [...SYSTEM()],
    animations: [
      lerp("rewind", 0, 10, 1, 0, "out"),
      ...whip(0),
      lerp("tonho.shades", 0, 1, 0, 0),
      lerp("tonho.dance", 0, 1, 0, 0),
      lerp("esposa.dance", 0, 1, 0, 0),
      lerp("confetti", 0, 1, 0, 0),
      lerp("tonho.sad", 0, 8, 1, 0, "inOut"),
      lerp("tonho.wave", W("s2", 2), W("s2", 2) + 8, 0, 1, "out"),
      lerp("tonho.wave", W("s2", 5), W("s2", 5) + 8, 1, 0, "inOut"),
      lerp("esposa.wave", W("s2", 8), W("s2", 8) + 8, 0, 1, "out"),
      lerp("esposa.wave", W("s2", 9) + 6, W("s2", 9) + 12, 1, 0, "in"),
      lerp("tonho.hop", W("s2", 13), W("s2", 13) + 4, 0, 1, "out"),
      lerp("tonho.hop", end(1) - 6, end(1), 1, 0, "in"),
    ],
    badges: [
      { text: "TRABALHO NA ROÇA", variant: "info", appearAt: W("s2", 3), disappearAt: W("s2", 9) - 2 },
      { text: "DESDE MENINO", variant: "info", appearAt: W("s2", 13), disappearAt: end(1) },
    ],
    bigWords: [{ text: "MILHO E MANDIOCA", at: W("s2", 10), until: W("s2", 13), color: GOLD, size: 110, y: 460, tilt: -4 }],
    labels: [{ text: "FAMÍLIA", point: [-3.05, 1.95, -1.75], at: W("s2", 8), until: W("s2", 9) + 4, off: [-40, -110], accent: Y }],
    highlights: ["TONHO", "ROÇA", "FAMÍLIA", "MILHO", "MANDIOCA", "MENINO"],
    captions: [{ text: "O seu Tonho trabalha na roça com a família, plantando milho e mandioca, desde menino.", from: voLocal("s2"), to: end(1) }],
    audioCues: [narration("s2", "ready"), sfx("whoosh", 0, 0.24), sfx("pop", W("s2", 2), 0.2), sfx("badge", W("s2", 3), 0.2), sfx("pop", W("s2", 8), 0.2), sfx("whoosh-soft", W("s2", 9), 0.2), sfx("ding", W("s2", 10), 0.22), sfx("badge", W("s2", 13), 0.2)],
  },
  // ------------------------------------------------------------------ s3 · 60 anos, foi pedir
  {
    id: "scene-03-pedido",
    startFrame: sc(2).from,
    durationInFrames: sc(2).durationInFrames,
    voKey: "s3",
    narration: "Fez 60 anos e foi pedir a aposentadoria rural. E o INSS...",
    camera: { projection: "perspective", movement: "tracking", keys: [key(0, P.tonho), key(W("s3", 3), P.tonho), key(W("s3", 4), P.walkA, "soft"), key(W("s3", 8) - 6, P.walkB, "inOut"), key(W("s3", 8) + 6, P.doc, "soft"), key(end(2), P.docPush, "inOut")] },
    objects: [...SYSTEM(), DOC],
    animations: [
      ...whip(0),
      lerp("tonho.hop", 0, 1, 0, 0),
      spring("tonho.ok", W("s3", 1), W("s3", 1) + 18, 0, 1, 7),
      lerp("tonho.ok", W("s3", 3), W("s3", 3) + 6, 1, 0, "in"),
      lerp("tonho.ry", W("s3", 3), W("s3", 3) + 6, 0, Math.PI / 2, "out", "rad"),
      lerp("tonho.dx", W("s3", 3) + 4, W("s3", 8) - 6, 0, DX, "inOut"),
      lerp("tonho.dz", W("s3", 3) + 4, W("s3", 8) - 6, 0, DZ, "inOut"),
      lerp("tonho.ry", W("s3", 8) - 10, W("s3", 8) - 2, Math.PI / 2, 0, "inOut", "rad"),
      lerp("doc.pop", 0, 1, 0, 0),
      lerp("doc.deny", 0, 1, 0, 0),
      lerp("doc.ok", 0, 1, 0, 0),
      spring("doc.pop", W("s3", 7), W("s3", 7) + 22, 0, 1, 9),
    ],
    badges: [{ text: "APOSENTADORIA RURAL", variant: "positive", appearAt: W("s3", 5), disappearAt: W("s3", 8) - 2 }],
    bigWords: [{ text: "60 ANOS", at: W("s3", 1), until: W("s3", 3) + 4, color: GOLD, size: 190, y: 1000, tilt: -5 }],
    highlights: ["60", "ANOS", "PEDIR", "APOSENTADORIA", "RURAL", "INSS"],
    captions: [
      { text: "Fez 60 anos e foi pedir a aposentadoria rural.", from: voLocal("s3"), to: W("s3", 8) },
      { text: "E o INSS...", from: W("s3", 8), to: end(2) },
    ],
    audioCues: [narration("s3", "ready"), sfx("whoosh", 0, 0.2), sfx("ding", W("s3", 1), 0.24), sfx("whoosh-soft", W("s3", 4), 0.2), sfx("badge", W("s3", 5), 0.2), sfx("pop-high", W("s3", 7), 0.18), sfx("drumroll", end(2) - 40, 0.32)],
  },
  // ------------------------------------------------------------------ s4 · negou
  {
    id: "scene-04-negado",
    startFrame: sc(3).from,
    durationInFrames: sc(3).durationInFrames,
    voKey: "s4",
    narration: "Negou! Disse que faltava prova do trabalho no campo.",
    camera: { projection: "perspective", movement: "tracking", keys: [key(0, P.docPush), key(W("s4", 4) - 4, P.doc, "soft"), key(W("s4", 4) + 4, P.compadre, "out"), key(end(3), P.compadrePush, "linear")] },
    objects: [...SYSTEM(), DOC],
    animations: [
      spring("doc.deny", 6, 30, 0, 1, 8),
      ...flash(6, 0.8),
      lerp("camera.shake", 6, 9, 0, 1, "out"),
      lerp("camera.shake", 9, 22, 1, 0, "in"),
      lerp("vignette.red", 6, 12, 0, 0.6, "out"),
      lerp("vignette.red", W("s4", 4), W("s4", 4) + 10, 0.6, 0, "inOut"),
      spring("tonho.shock", 6, 20, 0, 1, 8),
      lerp("tonho.shock", 20, 28, 1, 0, "inOut"),
      lerp("tonho.sad", 20, 28, 0, 1, "inOut"),
      ...whip(W("s4", 4)),
      lerp("compadre.laugh", W("s4", 4) + 2, W("s4", 4) + 8, 0, 1, "out"),
    ],
    badges: [{ text: "FALTA PROVA DO TRABALHO RURAL", variant: "negative", appearAt: W("s4", 1), disappearAt: end(3) }],
    bigWords: [{ text: "NEGOU!", at: 6, until: W("s4", 4), color: R, size: 210, tilt: -7 }],
    labels: [{ text: "EU NÃO FALEI?", point: COMPADRE_HEAD, at: W("s4", 5), until: end(3), off: [140, -20], accent: Y }],
    highlights: ["NEGOU", "FALTAVA", "PROVA", "TRABALHO", "CAMPO"],
    captions: [{ text: "Negou! Disse que faltava prova do trabalho no campo.", from: voLocal("s4"), to: end(3) }],
    audioCues: [narration("s4", "ready"), sfx("stamp", 6, 0.46), sfx("boo", 6, 0.22), sfx("badge", W("s4", 1), 0.2), sfx("whoosh", W("s4", 4), 0.22), sfx("boing", W("s4", 6), 0.2)],
  },
  // ------------------------------------------------------------------ s5 · provas + recurso
  {
    id: "scene-05-provas",
    startFrame: sc(4).from,
    durationInFrames: sc(4).durationInFrames,
    voKey: "s5",
    narration: "Aí a advogada de bolso juntou a autodeclaração, as notas de venda da produção e os documentos da terra, e entrou com recurso.",
    camera: { projection: "perspective", movement: "orbit", keys: [key(0, P.compadrePush), key(W("s5", 1), P.lia, "out"), key(end(4), P.lia)] },
    objects: [...SYSTEM(), DOC, LIA, o("liaFolder", "pasta-com-as-provas")],
    animations: [
      lerp("compadre.laugh", 0, 8, 1, 0, "inOut"),
      ...whip(W("s5", 0)),
      spring("liaBig.pop", W("s5", 2) - 4, W("s5", 2) + 20, 0, 1, 8),
      lerp("liaBig.wave", W("s5", 2) + 4, W("s5", 2) + 10, 0, 1, "out"),
      lerp("liaBig.wave", W("s5", 5), W("s5", 5) + 6, 1, 0, "in"),
      lerp("liaBig.point", W("s5", 5), W("s5", 5) + 8, 0, 1, "out"),
      spring("liaFolder.pop", W("s5", 7) - 2, W("s5", 7) + 18, 0, 1, 8),
      lerp("liaFolder.pop", W("s5", 9), W("s5", 9) + 4, 1, 1.3, "out"),
      lerp("liaFolder.pop", W("s5", 9) + 4, W("s5", 9) + 10, 1.3, 1, "inOut"),
      lerp("liaFolder.pop", W("s5", 16), W("s5", 16) + 4, 1, 1.3, "out"),
      lerp("liaFolder.pop", W("s5", 16) + 4, W("s5", 16) + 10, 1.3, 1, "inOut"),
      lerp("tonho.sad", W("s5", 16), W("s5", 16) + 8, 1, 0, "inOut"),
      lerp("tonho.hop", W("s5", 20), W("s5", 20) + 4, 0, 1, "out"),
      ...punch(W("s5", 22), 0.8),
    ],
    badges: [
      { text: "AUTODECLARAÇÃO", variant: "info", appearAt: W("s5", 7), disappearAt: W("s5", 9) },
      { text: "NOTAS DE VENDA DA PRODUÇÃO", variant: "info", appearAt: W("s5", 9), disappearAt: W("s5", 15) },
      { text: "DOCUMENTOS DA TERRA", variant: "info", appearAt: W("s5", 15), disappearAt: W("s5", 19) },
    ],
    bigWords: [{ text: "RECURSO!", at: W("s5", 22), until: end(4), color: GOLD, size: 180, y: 480, tilt: -5 }],
    labels: [{ text: "ADVOGADA DE BOLSO", point: [1.2, 1.6, -1.25], at: W("s5", 2), until: W("s5", 7), off: [0, -130], accent: GOLD }],
    highlights: ["ADVOGADA", "BOLSO", "AUTODECLARAÇÃO", "NOTAS", "VENDA", "PRODUÇÃO", "DOCUMENTOS", "TERRA", "RECURSO"],
    captions: [
      { text: "Aí a advogada de bolso juntou a autodeclaração,", from: voLocal("s5"), to: W("s5", 8) },
      { text: "as notas de venda da produção e os documentos da terra,", from: W("s5", 8), to: W("s5", 19) },
      { text: "e entrou com recurso.", from: W("s5", 19), to: end(4) },
    ],
    audioCues: [narration("s5", "ready"), sfx("whoosh-big", W("s5", 0), 0.24), sfx("pop-high", W("s5", 2) - 2, 0.24), sfx("shimmer", W("s5", 2), 0.18), sfx("pop", W("s5", 7), 0.22), sfx("pop", W("s5", 9), 0.22), sfx("pop", W("s5", 16), 0.22), sfx("badge", W("s5", 22), 0.24)],
  },
  // ------------------------------------------------------------------ s6 · resultado? APROVADO!
  {
    id: "scene-06-aprovado",
    startFrame: sc(5).from,
    durationInFrames: sc(5).durationInFrames,
    voKey: "s6",
    narration: "Resultado? Aprovado!",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.doc), key(W("s6", 1) - 2, P.docPush, "soft"), key(end(5), P.docPush)] },
    objects: [...SYSTEM(), DOC, LIA, o("liaFolder", "pasta-com-as-provas")],
    animations: [
      ...whip(0),
      lerp("doc.deny", W("s6", 1) - 12, W("s6", 1) - 4, 1, 0, "in"),
      spring("doc.ok", W("s6", 1), W("s6", 1) + 20, 0, 1, 7),
      ...flash(W("s6", 1), 0.8),
      ...punch(W("s6", 1)),
      lerp("confetti", W("s6", 1), W("s6", 1) + 6, 0, 1, "out"),
    ],
    badges: [],
    bigWords: [
      { text: "RESULTADO?", at: W("s6", 0), until: W("s6", 1), color: "#ffffff", size: 150, y: 520, tilt: -4 },
      { text: "APROVADO!", at: W("s6", 1), until: end(5), color: G, size: 190, tilt: -6 },
    ],
    highlights: ["RESULTADO", "APROVADO"],
    captions: [{ text: "Resultado? Aprovado!", from: voLocal("s6"), to: end(5) }],
    audioCues: [narration("s6", "ready"), sfx("whoosh", 0, 0.2), sfx("tick", W("s6", 0) + 8, 0.2), sfx("tick", W("s6", 0) + 16, 0.2), sfx("stamp", W("s6", 1), 0.4), sfx("airhorn", W("s6", 1), 0.26)],
  },
  // ------------------------------------------------------------------ s7 · salário mínimo + forró na varanda
  {
    id: "scene-07-forro",
    startFrame: sc(6).from,
    durationInFrames: sc(6).durationInFrames,
    voKey: "s7",
    narration: "Hoje o seu Tonho recebe um salário mínimo todo mês, e o forró na varanda nunca mais parou.",
    camera: { projection: "perspective", movement: "orbit", keys: [key(0, P.tonho), key(W("s7", 10) - 2, P.tonho), key(W("s7", 10) + 8, P.homeWide, "out"), key(end(6), P.homeWide)] },
    objects: [...SYSTEM(), o("bunting", "bandeirinhas")],
    animations: [
      ...whip(0),
      lerp("liaBig.pop", 0, 1, 0, 0),
      lerp("tonho.dx", 0, 1, 0, 0),
      lerp("tonho.dz", 0, 1, 0, 0),
      lerp("tonho.sad", 0, 1, 0, 0),
      lerp("tonho.hop", 0, 1, 0, 0),
      lerp("compadre.dx", 0, 1, -1.25, -1.25),
      lerp("compadre.dz", 0, 1, -0.2, -0.2),
      lerp("compadre.ry", 0, 1, -0.9, -0.9, "linear", "rad"),
      lerp("compadre.laugh", 0, 1, 0, 0),
      lerp("compadre.sad", 0, 1, 1, 1),
      lerp("confetti", 0, 10, 1, 0, "in"),
      lerp("tonho.shades", 4, 14, 0, 1, "in"),
      lerp("tonho.thumb", 16, 24, 0, 1, "out"),
      ...punch(W("s7", 5), 0.6),
      lerp("tonho.thumb", W("s7", 10) - 4, W("s7", 10), 1, 0, "in"),
      lerp("tonho.dance", W("s7", 12), W("s7", 12) + 6, 0, 1, "out"),
      lerp("esposa.dance", W("s7", 12), W("s7", 12) + 6, 0, 1, "out"),
      lerp("confetti", W("s7", 12), W("s7", 12) + 8, 0, 1, "out"),
    ],
    badges: [{ text: "TODO MÊS", variant: "positive", appearAt: W("s7", 8), disappearAt: W("s7", 10) }],
    bigWords: [
      { text: "1 SALÁRIO MÍNIMO", at: W("s7", 5), until: W("s7", 10) - 2, color: GOLD, size: 120, y: 1000, tilt: -4 },
      { text: "FORRÓ!", at: W("s7", 12), until: end(6), color: ORANGE, size: 210, y: 440, tilt: -6 },
    ],
    labels: [{ text: "COMPADRE", point: [-1.65, 2.0, -1.25], at: W("s7", 15), until: end(6), off: [60, -100], accent: "#c77dff" }],
    highlights: ["TONHO", "RECEBE", "SALÁRIO", "MÍNIMO", "MÊS", "FORRÓ", "VARANDA"],
    captions: [
      { text: "Hoje o seu Tonho recebe um salário mínimo todo mês,", from: voLocal("s7"), to: W("s7", 10) },
      { text: "e o forró na varanda nunca mais parou.", from: W("s7", 10), to: end(6) },
    ],
    audioCues: [narration("s7", "ready"), sfx("whoosh", 0, 0.22), sfx("ding", 14, 0.24), sfx("coin", W("s7", 5), 0.22), sfx("badge", W("s7", 8), 0.2), sfx("whoosh", W("s7", 10), 0.2), sfx("airhorn", W("s7", 12), 0.18)],
  },
  // ------------------------------------------------------------------ s8 · a regra
  {
    id: "scene-08-regra",
    startFrame: sc(7).from,
    durationInFrames: sc(7).durationInFrames,
    voKey: "s8",
    narration: "A regra: 60 anos pro homem, 55 pra mulher, e 15 anos de trabalho no campo, mesmo sem pagar carnê.",
    camera: { projection: "perspective", movement: "orbit", keys: [key(0, P.home), key(W("s8", 8) - 4, P.home), key(W("s8", 8) + 6, P.corn, "soft"), key(W("s8", 13) - 2, P.corn), key(W("s8", 13) + 8, P.home, "soft"), key(end(7), P.home)] },
    objects: [...SYSTEM(), o("bunting", "bandeirinhas")],
    animations: [
      ...whip(0),
      lerp("confetti", 0, 8, 1, 0, "in"),
      lerp("tonho.dance", 0, 8, 1, 0, "inOut"),
      lerp("esposa.dance", 0, 8, 1, 0, "inOut"),
      spring("tonho.ok", W("s8", 2), W("s8", 2) + 18, 0, 1, 7),
      spring("esposa.ok", W("s8", 5), W("s8", 5) + 18, 0, 1, 7),
      lerp("tonho.ok", W("s8", 8) - 4, W("s8", 8), 1, 0, "in"),
      lerp("esposa.ok", W("s8", 8) - 4, W("s8", 8), 1, 0, "in"),
      lerp("tonho.thumb", W("s8", 13) + 6, W("s8", 13) + 14, 0, 1, "out"),
    ],
    badges: [
      { text: "HOMEM: 60 ANOS", variant: "positive", appearAt: W("s8", 2), disappearAt: W("s8", 5) },
      { text: "MULHER: 55 ANOS", variant: "positive", appearAt: W("s8", 5), disappearAt: W("s8", 8) },
      { text: "15 ANOS DE TRABALHO RURAL", variant: "info", subtitle: "mesmo com intervalos", appearAt: W("s8", 8), disappearAt: W("s8", 13) },
      { text: "MESMO SEM PAGAR CARNÊ", variant: "positive", appearAt: W("s8", 13), disappearAt: end(7) },
    ],
    bigWords: [
      { text: "60", at: W("s8", 2), until: W("s8", 5), color: GOLD, size: 240, y: 440, tilt: -5 },
      { text: "55", at: W("s8", 5), until: W("s8", 8), color: "#ff8fc1", size: 240, y: 440, tilt: 5 },
      { text: "15 ANOS NA ROÇA", at: W("s8", 8), until: W("s8", 13), color: G, size: 120, y: 440, tilt: -4 },
    ],
    highlights: ["REGRA", "60", "ANOS", "HOMEM", "55", "MULHER", "15", "TRABALHO", "CAMPO", "CARNÊ"],
    captions: [
      { text: "A regra: 60 anos pro homem, 55 pra mulher,", from: voLocal("s8"), to: W("s8", 7) },
      { text: "e 15 anos de trabalho no campo, mesmo sem pagar carnê.", from: W("s8", 7), to: end(7) },
    ],
    audioCues: [narration("s8", "ready"), sfx("whoosh", 0, 0.22), sfx("ding", W("s8", 2), 0.22), sfx("ding", W("s8", 5), 0.22), sfx("whoosh-soft", W("s8", 8), 0.2), sfx("badge", W("s8", 8), 0.2), sfx("badge", W("s8", 13), 0.22)],
  },
  // ------------------------------------------------------------------ s9 · CTA
  {
    id: "scene-09-final",
    startFrame: sc(8).from,
    durationInFrames: sc(8).durationInFrames,
    voKey: "s9",
    narration: "Conhece alguém da roça? Manda esse vídeo pra ele!",
    camera: { projection: "perspective", movement: "dolly-out", keys: [key(0, P.homeWide), key(W("s9", 4), P.homeWide), key(W("s9", 8) + 24, P.final, "inOut"), key(end(8), P.final)] },
    objects: [...SYSTEM(), o("bunting", "bandeirinhas")],
    animations: [
      ...whip(0),
      lerp("tonho.thumb", 0, 6, 1, 0, "in"),
      lerp("tonho.dance", W("s9", 1), W("s9", 1) + 6, 0, 1, "out"),
      lerp("esposa.dance", W("s9", 1), W("s9", 1) + 6, 0, 1, "out"),
      lerp("compadre.sad", W("s9", 3), W("s9", 3) + 6, 1, 0, "inOut"),
      lerp("compadre.dance", W("s9", 3) + 4, W("s9", 3) + 10, 0, 1, "out"),
      lerp("confetti", 4, 12, 0, 0.7, "out"),
      spring("share", W("s9", 4), W("s9", 4) + 24, 0, 1, 8),
      lerp("share", end(8) - 58, end(8) - 50, 1, 0, "in"),
      lerp("confetti", end(8) - 60, end(8) - 40, 0.7, 0, "in"),
      spring("endcard", end(8) - 52, end(8) - 22, 0, 1, 10),
    ],
    badges: [{ text: "MANDA PRA ALGUÉM DA ROÇA", variant: "positive", appearAt: W("s9", 4), disappearAt: end(8) - 54 }],
    highlights: ["ROÇA", "MANDA", "VÍDEO"],
    captions: [{ text: "Conhece alguém da roça? Manda esse vídeo pra ele!", from: voLocal("s9"), to: end(8) - 52 }],
    audioCues: [narration("s9", "ready"), sfx("whoosh-big", 0, 0.22), sfx("pop", W("s9", 4), 0.24), sfx("ding", W("s9", 4) + 4, 0.22), sfx("final", end(8) - 52, 0.3)],
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
