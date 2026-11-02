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

/** Cenário: praça do INSS, seu Antônio, a neta e o golpista mascarado. */
const SYSTEM = (): SceneObject[] => [o("island", "diorama-ilha"), o("inss", "predio-inss"), o("warehouse", "galpao"), o("antonio", "seu-antonio"), o("neta", "neta")];
const GOLPISTA = o("golpista", "golpista");
const SCAM = "Seu 13º está BLOQUEADO! Pague R$ 49,90 de taxa pra liberar: www.libera-seu-13.top";
const SCAM_CHAT = { title: "INSS BENEFÍCIOS", subtitle: "número desconhecido" };
const GOLPISTA_HEAD: Vec3 = [-0.55, 2.15, -1.6];
const ANTONIO_HEAD: Vec3 = [0.45, 2.25, -1.35];

const P = {
  antonio: orbit([0.45, 1.45, -1.35], 6, -15, 4),
  antonioLow: orbit([0.45, 1.85, -1.35], 6.4, -10, 2),
  duo: orbit([0.8, 1.2, -1.3], 8, -15, 5),
  duoLow: orbit([0.8, 1.6, -1.3], 8, -15, 3),
  golpista: orbit([-0.55, 1.45, -1.6], 5.6, 10, 4),
  golpistaLow: orbit([-0.55, 1.85, -1.6], 6.2, 10, 2),
  inss: orbit([2.4, 1.7, -4.2], 24, 4, 9),
  plaza: orbit([0.25, 1.0, -1.4], 13.5, -8, 7),
  plazaLow: orbit([0.25, 1.45, -1.4], 13.5, -8, 4),
  final: orbit([0.2, 1.4, -1.4], 30, 10, 18),
};

export const scenes: ScenePlan[] = [
  // ------------------------------------------------------------------ s1 · a mensagem do golpe
  {
    id: "scene-01-gancho",
    startFrame: sc(0).from,
    durationInFrames: sc(0).durationInFrames,
    voKey: "s1",
    narration: "O seu Antônio recebeu uma mensagem: pague 49 reais e 90 de taxa pra liberar o seu décimo terceiro!",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.antonioLow), key(end(0), P.antonioLow)] },
    objects: [...SYSTEM()],
    animations: [
      lerp("antonio.hop", 0, 3, 0, 1, "out"),
      lerp("antonio.hop", 10, 14, 1, 0, "in"),
      lerp("antonio.scratch", W("s1", 7), W("s1", 7) + 8, 0, 1, "out"),
      ...punch(W("s1", 7), 0.6),
    ],
    badges: [],
    bigWords: [{ text: "R$ 49,90?", at: W("s1", 7), until: end(0), color: R, size: 200, y: 1000, tilt: -5 }],
    chat: { ...SCAM_CHAT, at: 2, until: end(0), y: 260, msgs: [{ who: "INSS Benefícios", text: SCAM, at: 4, color: "#1e63c8" }] },
    highlights: ["ANTÔNIO", "MENSAGEM", "PAGUE", "49", "TAXA", "LIBERAR", "DÉCIMO", "TERCEIRO"],
    captions: [{ text: "O seu Antônio recebeu uma mensagem: pague 49 reais e 90 de taxa pra liberar o seu décimo terceiro!", from: voLocal("s1"), to: end(0) }],
    audioCues: [narration("s1", "ready"), sfx("plim", 3, 0.34), sfx("pop", W("s1", 2), 0.18), sfx("buzz", W("s1", 7), 0.18)],
  },
  // ------------------------------------------------------------------ s2 · é golpe, vô!
  {
    id: "scene-02-golpe",
    startFrame: sc(1).from,
    durationInFrames: sc(1).durationInFrames,
    voKey: "s2",
    narration: "Ele já ia pagar, quando a neta gritou: é golpe, vô!",
    camera: { projection: "perspective", movement: "tracking", keys: [key(0, P.duoLow), key(W("s2", 9) + 10, P.duoLow), key(W("s2", 9) + 18, P.golpista, "out"), key(end(1), P.golpista)] },
    objects: [...SYSTEM(), GOLPISTA],
    animations: [
      lerp("antonio.scratch", 0, 6, 1, 0, "in"),
      lerp("antonio.thumb", W("s2", 1), W("s2", 1) + 8, 0, 1, "out"),
      lerp("neta.hop", W("s2", 6), W("s2", 6) + 4, 0, 1, "out"),
      spring("neta.shock", W("s2", 7), W("s2", 7) + 14, 0, 1, 7),
      lerp("neta.wave", W("s2", 7), W("s2", 7) + 6, 0, 1, "out"),
      lerp("neta.hop", W("s2", 9) + 6, W("s2", 9) + 10, 1, 0, "in"),
      lerp("antonio.thumb", W("s2", 9), W("s2", 9) + 4, 1, 0, "in"),
      spring("antonio.shock", W("s2", 9), W("s2", 9) + 16, 0, 1, 7),
      ...flash(W("s2", 9), 0.5),
      lerp("camera.shake", W("s2", 9), W("s2", 9) + 3, 0, 0.8, "out"),
      lerp("camera.shake", W("s2", 9) + 3, W("s2", 9) + 12, 0.8, 0, "in"),
      ...whip(W("s2", 9) + 11),
      lerp("golpista.laugh", W("s2", 9) + 14, W("s2", 9) + 18, 0, 1, "out"),
    ],
    badges: [],
    bigWords: [{ text: "É GOLPE, VÔ!", at: W("s2", 8), until: W("s2", 9) + 12, color: R, size: 150, y: 1000, tilt: -6 }],
    chat: { ...SCAM_CHAT, at: 0, until: W("s2", 9) + 12, y: 260, fakeAt: W("s2", 9), stamp: "GOLPE!", msgs: [{ who: "INSS Benefícios", text: SCAM, at: 0, color: "#1e63c8" }] },
    labels: [{ text: "GOLPISTA", point: GOLPISTA_HEAD, at: W("s2", 9) + 16, until: end(1), off: [0, -120], accent: R }],
    highlights: ["PAGAR", "NETA", "GRITOU", "GOLPE"],
    captions: [{ text: "Ele já ia pagar, quando a neta gritou: é golpe, vô!", from: voLocal("s2"), to: end(1) }],
    audioCues: [narration("s2", "ready"), sfx("pop-high", W("s2", 6), 0.22), sfx("stamp", W("s2", 9), 0.44), sfx("siren", W("s2", 9), 0.14), sfx("whoosh", W("s2", 9) + 11, 0.22)],
  },
  // ------------------------------------------------------------------ s3 · INSS não cobra taxa
  {
    id: "scene-03-taxa",
    startFrame: sc(2).from,
    durationInFrames: sc(2).durationInFrames,
    voKey: "s3",
    narration: "O INSS não cobra taxa nenhuma pra pagar benefício, nem pra liberar décimo terceiro.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.inss), key(W("s3", 9), P.inss), key(W("s3", 9) + 8, P.duo, "out"), key(end(2), P.duo)] },
    objects: [...SYSTEM()],
    animations: [
      ...whip(0),
      lerp("golpista.laugh", 0, 1, 0, 0),
      lerp("antonio.shock", 0, 6, 1, 0, "inOut"),
      lerp("neta.shock", 0, 6, 1, 0, "inOut"),
      spring("inss.glow", 2, 20, 0, 1, 8),
      lerp("inss.glow", W("s3", 9), W("s3", 9) + 8, 1, 0, "in"),
      spring("neta.ok", W("s3", 9) + 6, W("s3", 9) + 24, 0, 1, 7),
    ],
    badges: [
      { text: "O INSS NÃO COBRA TAXA", variant: "positive", appearAt: W("s3", 2), disappearAt: W("s3", 9) },
      { text: "NEM PRA LIBERAR 13º", variant: "positive", appearAt: W("s3", 9), disappearAt: end(2) },
    ],
    bigWords: [{ text: "TAXA: R$ 0", at: W("s3", 4), until: W("s3", 9), color: G, size: 170, y: 460, tilt: -5 }],
    highlights: ["INSS", "NÃO", "COBRA", "TAXA", "NENHUMA", "BENEFÍCIO", "DÉCIMO", "TERCEIRO"],
    captions: [{ text: "O INSS não cobra taxa nenhuma pra pagar benefício, nem pra liberar décimo terceiro.", from: voLocal("s3"), to: end(2) }],
    audioCues: [narration("s3", "ready"), sfx("whoosh", 0, 0.22), sfx("badge", W("s3", 2), 0.2), sfx("ding", W("s3", 4), 0.22), sfx("badge", W("s3", 9), 0.2)],
  },
  // ------------------------------------------------------------------ s4 · não clique; site oficial é gov.br
  {
    id: "scene-04-link",
    startFrame: sc(3).from,
    durationInFrames: sc(3).durationInFrames,
    voKey: "s4",
    narration: "E não manda link pra você clicar. Site oficial do governo termina com gov ponto br.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.antonioLow), key(W("s4", 7), P.antonioLow), key(W("s4", 7) + 8, P.duo, "out"), key(end(3), P.duo)] },
    objects: [...SYSTEM()],
    animations: [
      ...whip(0),
      lerp("neta.ok", 0, 6, 1, 0, "in"),
      lerp("antonio.scratch", W("s4", 3), W("s4", 3) + 6, 0, 1, "out"),
      lerp("antonio.scratch", W("s4", 7), W("s4", 7) + 6, 1, 0, "in"),
      lerp("neta.wave", W("s4", 13), W("s4", 13) + 8, 0, 1, "out"),
      ...punch(W("s4", 13), 0.7),
    ],
    badges: [{ text: "SITE OFICIAL TERMINA COM", variant: "info", appearAt: W("s4", 7), disappearAt: end(3) }],
    bigWords: [
      { text: "NÃO CLIQUE!", at: W("s4", 3), until: W("s4", 7), color: R, size: 170, y: 1000, tilt: -6 },
      { text: ".GOV.BR", at: W("s4", 13), until: end(3), color: G, size: 200, y: 460, tilt: -5 },
    ],
    chat: { ...SCAM_CHAT, at: 0, until: W("s4", 7), y: 260, fakeAt: W("s4", 3), stamp: "NÃO CLIQUE", msgs: [{ who: "INSS Benefícios", text: SCAM, at: 0, color: "#1e63c8" }] },
    highlights: ["NÃO", "LINK", "CLICAR", "SITE", "OFICIAL", "GOVERNO", "GOV", "BR"],
    captions: [
      { text: "E não manda link pra você clicar.", from: voLocal("s4"), to: W("s4", 7) },
      { text: "Site oficial do governo termina com gov ponto br.", from: W("s4", 7), to: end(3) },
    ],
    audioCues: [narration("s4", "ready"), sfx("whoosh", 0, 0.22), sfx("stamp", W("s4", 3), 0.4), sfx("buzz", W("s4", 3) + 1, 0.2), sfx("whoosh-soft", W("s4", 7), 0.2), sfx("ding", W("s4", 13), 0.24)],
  },
  // ------------------------------------------------------------------ s5 · confira no Meu INSS; nunca passe senha
  {
    id: "scene-05-dicas",
    startFrame: sc(4).from,
    durationInFrames: sc(4).durationInFrames,
    voKey: "s5",
    narration: "Na dúvida, confira tudo no aplicativo Meu INSS. E nunca passe senha nem código pra ninguém.",
    camera: { projection: "perspective", movement: "orbit", keys: [key(0, P.duo), key(W("s5", 8), P.antonio, "soft"), key(end(4), P.antonio)] },
    objects: [...SYSTEM()],
    animations: [
      ...whip(0),
      lerp("neta.wave", 0, 6, 1, 0, "in"),
      spring("antonio.ok", W("s5", 6), W("s5", 6) + 18, 0, 1, 7),
      lerp("antonio.ok", W("s5", 8), W("s5", 8) + 6, 1, 0, "in"),
      spring("antonio.x", W("s5", 11), W("s5", 11) + 18, 0, 1, 7),
      lerp("antonio.thumb", W("s5", 15), W("s5", 15) + 8, 0, 1, "out"),
    ],
    badges: [
      { text: "CONFIRA NO APLICATIVO MEU INSS", variant: "positive", appearAt: W("s5", 2), disappearAt: W("s5", 8) },
      { text: "NUNCA PASSE SENHA NEM CÓDIGO", variant: "negative", appearAt: W("s5", 8), disappearAt: end(4) },
    ],
    bigWords: [{ text: "SENHA? NUNCA!", at: W("s5", 11), until: end(4), color: R, size: 140, y: 1000, tilt: -5 }],
    highlights: ["DÚVIDA", "CONFIRA", "APLICATIVO", "MEU", "INSS", "NUNCA", "SENHA", "CÓDIGO"],
    captions: [
      { text: "Na dúvida, confira tudo no aplicativo Meu INSS.", from: voLocal("s5"), to: W("s5", 8) },
      { text: "E nunca passe senha nem código pra ninguém.", from: W("s5", 8), to: end(4) },
    ],
    audioCues: [narration("s5", "ready"), sfx("whoosh", 0, 0.22), sfx("badge", W("s5", 2), 0.2), sfx("ding", W("s5", 6), 0.22), sfx("badge", W("s5", 8), 0.2), sfx("buzz", W("s5", 11), 0.24)],
  },
  // ------------------------------------------------------------------ s6 · o golpista ficou falando sozinho
  {
    id: "scene-06-golpista",
    startFrame: sc(5).from,
    durationInFrames: sc(5).durationInFrames,
    voKey: "s6",
    narration: "E o golpista? Ficou falando sozinho.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.golpistaLow), key(end(5), P.golpistaLow)] },
    objects: [...SYSTEM(), GOLPISTA],
    animations: [...whip(0), lerp("antonio.x", 0, 1, 0, 0), lerp("antonio.thumb", 0, 1, 0, 0), lerp("golpista.sad", W("s6", 3), W("s6", 3) + 8, 0, 1, "inOut")],
    badges: [],
    chat: {
      title: "SEU ANTÔNIO",
      subtitle: "visto por último há 3 dias",
      at: 0,
      until: end(5),
      y: 260,
      fakeAt: W("s6", 5),
      stamp: "BLOQUEADO",
      stampColor: "#5b6573",
      msgs: [
        { who: "Golpista", text: "Oi vô, pagou a taxa?", at: 2, me: true },
        { who: "Golpista", text: "Alô???", at: W("s6", 3), me: true },
        { who: "Golpista", text: "Vô???", at: W("s6", 4), me: true },
      ],
    },
    highlights: ["GOLPISTA", "SOZINHO"],
    captions: [{ text: "E o golpista? Ficou falando sozinho.", from: voLocal("s6"), to: end(5) }],
    audioCues: [narration("s6", "ready"), sfx("whoosh", 0, 0.22), sfx("plim", 2, 0.18), sfx("plim", W("s6", 3), 0.18), sfx("plim", W("s6", 4), 0.18), sfx("lock", W("s6", 5), 0.3), sfx("sadtrombone", W("s6", 5) + 4, 0.24)],
  },
  // ------------------------------------------------------------------ s7 · comenta + siga
  {
    id: "scene-07-final",
    startFrame: sc(6).from,
    durationInFrames: sc(6).durationInFrames,
    voKey: "s7",
    narration: "Você já recebeu mensagem assim? Comenta aí, e siga o Advogado de Bolso em todas as redes!",
    camera: { projection: "perspective", movement: "dolly-out", keys: [key(0, P.plazaLow), key(W("s7", 8), P.plazaLow), key(W("s7", 16) + 20, P.final, "inOut"), key(end(6), P.final)] },
    objects: [...SYSTEM(), GOLPISTA],
    animations: [
      lerp("antonio.dance", 2, 8, 0, 1, "out"),
      lerp("neta.dance", 4, 10, 0, 1, "out"),
      lerp("antonio.shades", 2, 12, 0, 1, "in"),
      spring("comment", W("s7", 5), W("s7", 5) + 22, 0, 1, 8),
      lerp("comment", W("s7", 8) - 4, W("s7", 8) + 4, 1, 0, "in"),
      spring("follow", W("s7", 8), W("s7", 8) + 22, 0, 1, 8),
      lerp("follow", end(6) - 58, end(6) - 50, 1, 0, "in"),
      lerp("confetti", W("s7", 8), W("s7", 8) + 10, 0, 0.7, "out"),
      lerp("confetti", end(6) - 60, end(6) - 40, 0.7, 0, "in"),
      spring("endcard", end(6) - 52, end(6) - 22, 0, 1, 10),
    ],
    badges: [],
    labels: [{ text: "SEU ANTÔNIO", point: ANTONIO_HEAD, at: 4, until: W("s7", 5), off: [0, -110], accent: "#2980b9" }],
    highlights: ["RECEBEU", "MENSAGEM", "COMENTA", "SIGA", "ADVOGADO", "BOLSO", "REDES"],
    captions: [{ text: "Você já recebeu mensagem assim? Comenta aí, e siga o Advogado de Bolso em todas as redes!", from: voLocal("s7"), to: end(6) - 52 }],
    audioCues: [narration("s7", "ready"), sfx("ding", 12, 0.22), sfx("pop", W("s7", 5), 0.26), sfx("ding", W("s7", 8), 0.22), sfx("final", end(6) - 52, 0.3)],
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
