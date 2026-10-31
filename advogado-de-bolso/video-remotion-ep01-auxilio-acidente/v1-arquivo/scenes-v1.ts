import { evaluateTrack, orbit, type EaseName, type TrackAnimation, type Vec3 } from "../utils/animation";
import { HAND_REACH, POCKET_WORK, VALVES } from "../layout";
import { DURATION, FPS, HEIGHT, s, SCENE_FRAMES, voLocal, WIDTH, wordLocal, type VoKey } from "../utils/timing";

// =====================================================================================================
// SCENE PLAN — "Trabalhar e receber do INSS ao mesmo tempo?" (auxílio-acidente) · Advogado de Bolso
// Fase 1 · versão 1 · AGUARDANDO APROVAÇÃO. Na Fase 2 este arquivo vira src/data/scenes.ts sem tradução.
//
// Parâmetros para src/utils/timing.ts (planejados; depois do TTS os cortes saem da voz real):
//   export const SECONDS = 90;                       // 2700 frames
//   export const VO_KEYS = ["s1","s2","s3","s4","s5","s6","s7","s8","s9","s10","s11","s12","s13","s14","s15","s16"] as const;
//   const PLANNED_SECONDS = [5.4, 5.2, 5.6, 4.2, 4.2, 5.8, 6.4, 8.0, 4.4, 6.4, 7.0, 3.0, 7.4, 6.4, 3.4, 7.2]; // soma 90
//   const FIRST_VO = 0.45;  const LEAD = 0.25;
//   const GAPS: number[] = Array(15).fill(0.5);      // se a voz não couber, reduzir para 0.4 (ajuste de sincronização)
//
// Cortes planejados (frames globais, [início, fim)):
//   s1 0–162 · s2 162–318 · s3 318–486 · s4 486–612 · s5 612–738 · s6 738–912 · s7 912–1104 · s8 1104–1344
//   s9 1344–1476 · s10 1476–1668 · s11 1668–1878 · s12 1878–1968 · s13 1968–2190 · s14 2190–2382
//   s15 2382–2484 · s16 2484–2700
//
// Planta da ilha (u3d, topo y=0): depósito (-2.8,0,-4.4) · INSS (2.8,0,-4.6) · cofrinho (1.3,0,2.0) ·
// banquinho/casa (-0.9,0,2.2) · posto de trabalho (-2.6,0,-1.8) · estante+escada (-2.6,0,-2.3) ·
// portão (2.8,0,-2.3) · mini-cenários x≈4–4.6 · cadeira de balanço (-3.8,0,3.8).
// Trilhas com unidade "0-1" são estados normalizados; "u3d" unidades do mundo; "deg" graus.
// =====================================================================================================

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
};

const sc = (i: number) => SCENE_FRAMES[i];
const end = (i: number) => SCENE_FRAMES[i].durationInFrames;
const W = wordLocal;
const key = (at: number, pose: { position: Vec3; target: Vec3 }, easing?: EaseName): CameraKey => ({ at, ...pose, easing });
const narration = (k: VoKey, status: AudioCue["status"]): AudioCue => ({ kind: "narration", src: `audio/vo/${k}.wav`, at: voLocal(k), volume: 1, status });
const sfx = (name: string, at: number, volume: number): AudioCue => ({ kind: "sfx", src: `audio/sfx/${name}.wav`, at, volume, status: "ready" });

/** Atalhos de dados (não mudam o contrato): objeto visível com estado, objeto oculto e trilhas. */
const o = (id: string, type: string, start?: string, stateEnd?: string): SceneObject =>
  start ? { id, type, visible: true, state: { start, end: stateEnd ?? start } } : { id, type, visible: true };
const off = (id: string, type: string): SceneObject => ({ id, type, visible: false });
const lerp = (target: string, startFrame: number, endFrame: number, from: number | undefined, to: number, easing: EaseName = "inOut", unit: TrackAnimation["unit"] = "0-1"): TrackAnimation =>
  ({ type: "interpolate", target, startFrame, endFrame, from, to, easing, unit });
const spring = (target: string, startFrame: number, endFrame: number, from: number | undefined, to: number, damping = 10, unit: TrackAnimation["unit"] = "0-1"): TrackAnimation =>
  ({ type: "spring", target, startFrame, endFrame, from, to, damping, unit });

/** Sistema persistente (presente em todas as cenas). */
const SYSTEM = (piggy: string, salary: string): SceneObject[] => [
  o("island", "diorama-ilha-flutuante"),
  o("warehouse", "deposito-empresa"),
  o("inss", "predio-inss"),
  o("piggy", "cofrinho-janela-de-corte", piggy),
  o("salaryPipe", "cano-salario-prata+valvula", salary),
  o("coins", "moedas-instanciadas"),
];

// Poses compartilhadas entre cenas: orbit(alvo, distância, azimute°, elevação°).
const P = {
  hook: orbit([0.35, 1.7, 2.2], 21, 16, 16),
  hookClose: orbit([0.3, 1.65, 2.2], 18.5, 14, 15),
  hookUp: orbit([0.5, 2.3, 1.2], 22, 10, 22),
  wide: orbit([0, 1.2, -1.2], 44, 18, 28),
  work: orbit([-2.2, 1.3, -2.0], 15, 22, 14),
  ladder: orbit([-2.6, 1.8, -2.2], 13, 25, 14),
  ladderLow: orbit([-2.3, 1.0, -2.0], 12, 28, 6),
  bench: orbit([0, 1.6, 1.6], 15, -5, 16),
  benchR: orbit([0.2, 1.6, 1.4], 15, 12, 16),
  inssPipes: orbit([1.6, 2.0, -1.2], 24, -12, 22),
  stamp: orbit([-0.6, 2.4, 2.0], 11, 10, 10),
  pipesWide: orbit([0.4, 1.8, -1.0], 26, 8, 22),
  hand: orbit([HAND_REACH[0] + 0.02, HAND_REACH[1] - 0.02, HAND_REACH[2] + 0.1], 1.1, 18, 34),
  handWide: orbit([HAND_REACH[0] + 0.05, 1.1, HAND_REACH[2] + 0.05], 2.6, 22, 18),
  face: orbit([-2.55, 1.75, -1.8], 7.8, 18, 6),
  pocket: orbit([POCKET_WORK[0], POCKET_WORK[1] + 0.08, POCKET_WORK[2]], 2.6, 18, 6),
  goldPipe: orbit([1.4, 2.4, -0.8], 26, -15, 24),
  piggy: orbit([1.55, 1.45, 2.2], 14, 25, 14),
  piggyR: orbit([1.55, 1.45, 2.2], 14, 5, 14),
  side: orbit([4.0, 0.8, 1.4], 14, -25, 16),
  sideWide: orbit([4.0, 0.9, 1.2], 18, -30, 20),
  gate: orbit([3.0, 0.9, -2.3], 14, 40, 18),
  gateR: orbit([3.2, 0.9, -2.3], 13.5, 30, 16),
  gateClose: orbit([3.3, 0.9, -2.3], 10.5, 28, 12),
  coin: orbit([1.3, 3.3, 2.0], 11.5, 12, 8),
  timeline: orbit([-1.2, 0.5, 3.6], 13, -62, 30),
  valve: orbit([2.4, 3.3, -0.6], 7, -15, 10),
  liaPhone: orbit([-2.5, 1.45, -1.6], 5.2, 12, 8),
  heroLow: orbit([VALVES.accident[0], VALVES.accident[1] + 0.2, VALVES.accident[2] + 0.15], 3.4, -35, 6),
  final: orbit([0, 1.4, -1.2], 48, 40, 30),
  finalClose: orbit([POCKET_WORK[0] - 0.1, POCKET_WORK[1] + 0.12, POCKET_WORK[2]], 3.0, 20, 6),
};

export const scenes: ScenePlan[] = [
  // ------------------------------------------------------------------ s1 · gancho (pergunta + piada)
  {
    id: "scene-01-gancho-pergunta",
    startFrame: sc(0).from,
    durationInFrames: sc(0).durationInFrames,
    voKey: "s1",
    narration: "Trabalhar e receber do INSS ao mesmo tempo? Parece golpe, né? Mas é lei.",
    camera: {
      projection: "perspective",
      movement: "dolly-in",
      keys: [key(0, P.hook), key(W("s1", 8), P.hookClose, "soft"), key(W("s1", 11), P.hookClose), key(end(0), P.hookUp, "soft")],
    },
    objects: [
      ...SYSTEM("cheio (flash-forward)", "aberto, moedas caindo"),
      o("accidentPipe", "cano-dourado+valvula", "aberto (teaser)", "aberto (teaser)"),
      o("marcos", "personagem-low-poly", "carregando caixa perto do cofrinho", "sorri para a câmera"),
      o("siren", "sirene-comica", "fora de cena", "esmagada"),
      o("lawBook", "livro-da-lei", "fora de cena", "sobre a sirene"),
    ],
    animations: [
      lerp("marcos.spot", 0, 1, 0, 0, "linear", "0-1"),
      lerp("coins.salary.flow", 0, 1, 1, 1),
      lerp("coins.accident.flow", 0, 1, 1, 1),
      lerp("pipeAccident.grow", 0, 1, 1, 1),
      lerp("piggy.level", 0, 1, 0.6, 0.6),
      lerp("marcos.carry", 0, s(2), 1, 1, "linear"),
      spring("siren.drop", W("s1", 8), W("s1", 8) + 30, 0, 1, 9),
      lerp("siren.flash", W("s1", 8), W("s1", 11), 0, 1, "linear"),
      lerp("marcos.squint", W("s1", 9), W("s1", 9) + 10, 0, 1, "out"),
      spring("lawBook.drop", W("s1", 11), W("s1", 11) + 24, 0, 1, 10),
      lerp("siren.drop", W("s1", 11), W("s1", 11) + 10, 1, 0, "in"),
      lerp("rewind", end(0) - 12, end(0), 0, 1, "in"),
    ],
    badges: [
      { text: "TRABALHAR E RECEBER DO INSS?", variant: "warning", icon: "?", appearAt: W("s1", 0), disappearAt: W("s1", 11) - 2 },
      { text: "É LEI", variant: "positive", subtitle: "Lei 8.213/91, art. 86", appearAt: W("s1", 11), disappearAt: end(0) },
    ],
    highlights: ["TRABALHAR", "INSS", "GOLPE", "LEI"],
    captions: [
      { text: "Trabalhar e receber do INSS ao mesmo tempo?", from: voLocal("s1"), to: W("s1", 8) },
      { text: "Parece golpe, né? Mas é lei.", from: W("s1", 8), to: end(0) },
    ],
    audioCues: [
      narration("s1", "ready"),
      sfx("coin", s(0.2), 0.22),
      sfx("siren", W("s1", 8) + 6, 0.24),
      sfx("thud", W("s1", 11) + 8, 0.34),
      sfx("badge", W("s1", 11), 0.26),
      sfx("rewind", end(0) - 12, 0.3),
    ],
  },
  // ------------------------------------------------------------------ s2 · o sistema: salário
  {
    id: "scene-02-marcos-salario",
    startFrame: sc(1).from,
    durationInFrames: sc(1).durationInFrames,
    voKey: "s2",
    narration: "Esse é o Marcos: carteira assinada, e todo mês o salário cai no cofrinho.",
    camera: {
      projection: "perspective",
      movement: "dolly-in",
      keys: [key(0, P.hookUp), key(s(1.2), P.wide, "soft"), key(W("s2", 4), P.wide), key(end(1), P.work, "soft")],
    },
    objects: [
      ...SYSTEM("quase vazio", "fechado → aberto"),
      o("accidentPipe", "cano-dourado+valvula", "aberto (teaser)", "recolhido"),
      o("marcos", "personagem-low-poly", "perto do cofrinho", "trabalhando no depósito"),
      o("workBooklet", "carteira-de-trabalho-3d", "fora de cena", "fora de cena"),
      o("labels", "rotulos-ancorados", "ocultos", "EMPRESA / INSS / COFRINHO / SALÁRIO"),
      o("lawBook", "livro-da-lei", "sobre a sirene", "removido pelo rebobinar"),
    ],
    animations: [
      lerp("rewind", 0, 14, 1, 0, "out"),
      lerp("marcos.carry", 0, 8, 1, 0, "in"),
      lerp("marcos.squint", 0, 10, 1, 0, "in"),
      lerp("pipeAccident.grow", 0, 14, 1, 0, "in"),
      lerp("coins.accident.flow", 0, 8, 1, 0, "linear"),
      lerp("coins.salary.flow", 0, 8, 1, 0, "linear"),
      lerp("piggy.level", 0, 14, 0.6, 0.15, "linear"),
      lerp("lawBook.drop", 0, 10, 1, 0, "in"),
      lerp("marcos.spot", 0, 14, 0, 1, "linear"),
      lerp("labels.system", 14, 44, 0, 1, "out"),
      spring("workBooklet.pop", W("s2", 4), W("s2", 4) + 30, 0, 1, 10),
      lerp("workBooklet.pop", W("s2", 7), W("s2", 7) + 20, 1, 0, "in"),
      lerp("coins.salary.flow", W("s2", 10), W("s2", 10) + 12, 0, 1, "out"),
      lerp("piggy.level", W("s2", 10), end(1), 0.15, 0.35, "linear"),
    ],
    badges: [
      { text: "CARTEIRA ASSINADA", variant: "info", appearAt: W("s2", 4), disappearAt: W("s2", 10) - 4 },
      { text: "SALÁRIO TODO MÊS", variant: "positive", appearAt: W("s2", 10), disappearAt: end(1) },
    ],
    highlights: ["MARCOS", "CARTEIRA", "ASSINADA", "SALÁRIO", "COFRINHO"],
    captions: [{ text: "Esse é o Marcos: carteira assinada, e todo mês o salário cai no cofrinho.", from: voLocal("s2"), to: end(1) }],
    audioCues: [
      narration("s2", "ready"),
      sfx("whoosh", 0, 0.24),
      sfx("pop", W("s2", 4), 0.26),
      sfx("badge", W("s2", 4), 0.24),
      sfx("coin", W("s2", 10) + 6, 0.22),
    ],
  },
  // ------------------------------------------------------------------ s3 · o acidente (cômico)
  {
    id: "scene-03-escada-danca",
    startFrame: sc(2).from,
    durationInFrames: sc(2).durationInFrames,
    voKey: "s3",
    narration: "Até que a escada resolveu dançar… e o Marcos caiu de mão no chão.",
    camera: {
      projection: "perspective",
      movement: "vertical",
      keys: [key(0, P.work), key(W("s3", 3), P.ladder, "soft"), key(W("s3", 9), P.ladder), key(end(2), P.ladderLow, "soft")],
    },
    objects: [
      ...SYSTEM("nível baixo", "aberto"),
      o("marcos", "personagem-low-poly", "subindo a escada", "caído sobre as caixas, tonto"),
      o("shelf", "estante-alta"),
      o("ladder", "escada", "parada", "balança e para"),
      o("boxPile", "pilha-de-caixas-macias"),
      o("dizzyStars", "particulas-estrelinhas", "ocultas", "girando"),
      o("labels", "rotulos-ancorados", "visíveis", "ocultos"),
    ],
    animations: [
      lerp("labels.system", 0, 10, 1, 0, "in"),
      lerp("marcos.climb", 0, 40, 0, 1.2, "inOut", "u3d"),
      lerp("ladder.wobble", W("s3", 4), W("s3", 9), 0, 1, "linear"),
      spring("marcos.fall", W("s3", 9), W("s3", 9) + 30, 0, 1, 12),
      lerp("ladder.wobble", W("s3", 9), W("s3", 9) + 7, 1, 0, "out"),
      lerp("camera.shake", W("s3", 9) + 27, W("s3", 9) + 32, 0, 1, "out"),
      lerp("camera.shake", W("s3", 9) + 32, W("s3", 9) + 39, 1, 0, "in"),
      lerp("dizzy.stars", W("s3", 9) + 32, W("s3", 9) + 47, 0, 1, "out"),
    ],
    badges: [{ text: "ACIDENTE", variant: "negative", appearAt: W("s3", 9), disappearAt: end(2) }],
    highlights: ["ESCADA", "DANÇAR", "CAIU", "MÃO"],
    captions: [{ text: "Até que a escada resolveu dançar… e o Marcos caiu de mão no chão.", from: voLocal("s3"), to: end(2) }],
    audioCues: [
      narration("s3", "ready"),
      sfx("boing", W("s3", 5), 0.24),
      sfx("thud", W("s3", 9) + 27, 0.38),
      sfx("badge", W("s3", 9), 0.24),
    ],
  },
  // ------------------------------------------------------------------ s4 · problema: salário parou
  {
    id: "scene-04-salario-parou",
    startFrame: sc(3).from,
    durationInFrames: sc(3).durationInFrames,
    voKey: "s4",
    narration: "Mão engessada, nada de trabalho. O salário parou. E agora?",
    camera: {
      projection: "perspective",
      movement: "tracking",
      keys: [key(0, P.ladderLow), key(s(1.0), P.bench, "soft"), key(end(3), P.benchR, "linear")],
    },
    objects: [
      ...SYSTEM("nível parado", "aberto → fechado (válvula vermelha)"),
      o("marcos", "personagem-low-poly", "caído, tonto", "sentado no banquinho, coçando a cabeça"),
      o("bench", "banquinho"),
      o("cast", "gesso+tipoia", "ausente", "na mão direita"),
      o("dizzyStars", "particulas-estrelinhas", "girando", "ocultas"),
    ],
    animations: [
      lerp("dizzy.stars", 0, 12, 1, 0, "in"),
      lerp("marcos.spot", 0, 30, 1, 0, "inOut"),
      lerp("marcos.recover", 0, 30, 0, 1, "inOut"),
      spring("cast.on", 4, 30, 0, 1, 10),
      lerp("marcos.sit", 24, 40, 0, 1, "inOut"),
      lerp("salaryValve.closed", W("s4", 6), W("s4", 6) + 10, 0, 1, "out"),
      lerp("coins.salary.flow", W("s4", 7), W("s4", 7) + 12, 1, 0, "in"),
      lerp("marcos.scratch", W("s4", 8), end(3), 0, 1, "linear"),
    ],
    badges: [
      { text: "SALÁRIO PAROU", variant: "negative", subtitle: "empresa paga só os 15 primeiros dias", appearAt: W("s4", 6), disappearAt: W("s4", 8) - 2 },
      { text: "E AGORA?", variant: "warning", icon: "?", appearAt: W("s4", 8), disappearAt: end(3) },
    ],
    highlights: ["ENGESSADA", "SALÁRIO", "PAROU", "AGORA"],
    captions: [{ text: "Mão engessada, nada de trabalho. O salário parou. E agora?", from: voLocal("s4"), to: end(3) }],
    audioCues: [
      narration("s4", "ready"),
      sfx("whoosh", 0, 0.2),
      sfx("pop", 6, 0.22),
      sfx("clunk", W("s4", 6), 0.3),
      sfx("badge", W("s4", 6), 0.24),
    ],
  },
  // ------------------------------------------------------------------ s5 · solução temporária: auxílio-doença
  {
    id: "scene-05-auxilio-doenca",
    startFrame: sc(4).from,
    durationInFrames: sc(4).durationInFrames,
    voKey: "s5",
    narration: "Calma! Enquanto ele se recupera, o INSS paga o auxílio-doença.",
    camera: { projection: "perspective", movement: "vertical", keys: [key(0, P.benchR), key(end(4), P.inssPipes, "soft")] },
    objects: [
      ...SYSTEM("nível parado → sobe", "fechado"),
      o("sickPipe", "cano-azul-temporario", "inexistente", "aberto"),
      o("hourglass", "ampulheta-3d", "oculta", "sobre o cano azul"),
      o("marcos", "personagem-low-poly", "sentado, preocupado", "sentado, joinha"),
      o("bench", "banquinho"),
      o("cast", "gesso+tipoia", "na mão direita"),
    ],
    animations: [
      lerp("inss.glow", 0, 15, 0, 1, "out"),
      lerp("marcos.scratch", 0, 12, 1, 0, "in"),
      lerp("pipeSick.grow", W("s5", 6), W("s5", 6) + 22, 0, 1, "out"),
      lerp("coins.sick.flow", W("s5", 6) + 22, W("s5", 6) + 32, 0, 1, "linear"),
      lerp("piggy.level", W("s5", 6) + 32, end(4), 0.35, 0.42, "linear"),
      spring("hourglass.pop", W("s5", 9), W("s5", 9) + 30, 0, 1, 10),
      lerp("marcos.thumb", W("s5", 6) + 22, W("s5", 6) + 37, 0, 1, "out"),
    ],
    badges: [
      { text: "AUXÍLIO-DOENÇA", variant: "positive", subtitle: "hoje: auxílio por incapacidade temporária", appearAt: W("s5", 6), disappearAt: end(4) },
    ],
    highlights: ["CALMA", "INSS", "AUXÍLIO-DOENÇA"],
    captions: [{ text: "Calma! Enquanto ele se recupera, o INSS paga o auxílio-doença.", from: voLocal("s5"), to: end(4) }],
    audioCues: [
      narration("s5", "ready"),
      sfx("glow", 0, 0.2),
      sfx("whoosh", W("s5", 6), 0.22),
      sfx("badge", W("s5", 6), 0.24),
      sfx("coin", W("s5", 6) + 26, 0.2),
      sfx("pop", W("s5", 9), 0.2),
    ],
  },
  // ------------------------------------------------------------------ s6 · alta: azul fecha, salário volta
  {
    id: "scene-06-pericia-alta",
    startFrame: sc(5).from,
    durationInFrames: sc(5).durationInFrames,
    voKey: "s6",
    narration: "Aí vem a perícia: alta! O gesso sai, o auxílio acaba e o salário volta.",
    camera: {
      projection: "perspective",
      movement: "dolly-out",
      keys: [key(0, P.inssPipes), key(W("s6", 2), P.stamp, "soft"), key(W("s6", 7), P.stamp), key(end(5), P.pipesWide, "soft")],
    },
    objects: [
      ...SYSTEM("nível estável", "fechado → aberto"),
      o("sickPipe", "cano-azul-temporario", "aberto", "recolhido"),
      o("hourglass", "ampulheta-3d", "sobre o cano azul", "oculta"),
      o("stamp", "carimbo-gigante+folha", "fora de cena", "carimbou ALTA"),
      o("cast", "gesso+tipoia", "na mão direita", "estourado em cacos"),
      o("marcos", "personagem-low-poly", "sentado", "caminhando de volta ao depósito"),
      o("bench", "banquinho"),
    ],
    animations: [
      lerp("marcos.thumb", 0, 15, 1, 0, "in"),
      spring("stamp.drop", W("s6", 3), W("s6", 4) + 12, 0, 1, 8),
      lerp("stamp.drop", W("s6", 4) + 14, W("s6", 4) + 30, 1, 0, "in"),
      lerp("cast.shatter", W("s6", 6), W("s6", 6) + 22, 0, 1, "out"),
      lerp("cast.on", W("s6", 6), W("s6", 6) + 2, 1, 0, "linear"),
      lerp("marcos.sit", W("s6", 6) + 22, W("s6", 6) + 37, 1, 0, "inOut"),
      lerp("coins.sick.flow", W("s6", 9) - 5, W("s6", 9) + 2, 1, 0, "linear"),
      lerp("pipeSick.grow", W("s6", 9), W("s6", 9) + 27, 1, 0, "in"),
      lerp("hourglass.pop", W("s6", 9), W("s6", 9) + 12, 1, 0, "in"),
      lerp("salaryValve.closed", W("s6", 13), W("s6", 13) + 10, 1, 0, "out"),
      lerp("coins.salary.flow", W("s6", 13) + 1, end(5), 0, 1, "out"),
      lerp("marcos.spot", W("s6", 6) + 42, end(5), 0, 1, "inOut"),
    ],
    badges: [
      { text: "PERÍCIA: ALTA", variant: "info", appearAt: W("s6", 4), disappearAt: W("s6", 9) - 3 },
      { text: "SALÁRIO VOLTA", variant: "positive", appearAt: W("s6", 13), disappearAt: end(5) },
    ],
    highlights: ["PERÍCIA", "ALTA", "GESSO", "SALÁRIO"],
    captions: [{ text: "Aí vem a perícia: alta! O gesso sai, o auxílio acaba e o salário volta.", from: voLocal("s6"), to: end(5) }],
    audioCues: [
      narration("s6", "ready"),
      sfx("stamp", W("s6", 4), 0.36),
      sfx("badge", W("s6", 4), 0.24),
      sfx("crack", W("s6", 6), 0.3),
      sfx("clunk", W("s6", 13), 0.26),
      sfx("coin", W("s6", 13) + 8, 0.2),
    ],
  },
  // ------------------------------------------------------------------ s7 · problema: sequela
  {
    id: "scene-07-dedos-nao-dobram",
    startFrame: sc(6).from,
    durationInFrames: sc(6).durationInFrames,
    voKey: "s7",
    narration: "Só que dois dedos não dobram mais. Ele tenta pegar a caixa… e a caixa ganha.",
    camera: {
      projection: "perspective",
      movement: "dolly-out",
      keys: [key(0, P.pipesWide), key(s(0.8), P.hand, "soft"), key(W("s7", 7), P.hand), key(W("s7", 11), P.handWide, "soft"), key(end(6), P.face, "soft")],
    },
    objects: [
      ...SYSTEM("nível estável", "aberto"),
      o("marcos", "personagem-low-poly (mão detalhada no close)", "mão aberta", "mão com 2 dedos rígidos, triste"),
      o("box", "caixote+caixa-com-alca", "sobre o caixote", "caída depois de quicar"),
      o("capacityGauge", "medidor-3d-capacidade (esquemático, sem números)", "oculto", "reduzido (laranja)"),
      off("sickPipe", "cano-azul-temporario"),
    ],
    animations: [
      lerp("marcos.reach", 0, 20, 0, 1, "inOut"),
      lerp("hand.close", 6, W("s7", 4), 0, 1, "inOut"),
      lerp("fingers.stiff", 0, 1, 1, 1, "linear"),
      lerp("stiff.glow", W("s7", 2), W("s7", 2) + 14, 0, 1, "out"),
      lerp("vignette.red", 30, 60, 0, 0.6, "inOut"),
      lerp("box.grip", W("s7", 9), W("s7", 9) + 24, 0, 1, "inOut"),
      lerp("box.slip", W("s7", 11), W("s7", 11) + 20, 0, 1, "in"),
      spring("box.bounce", W("s7", 11) + 20, W("s7", 11) + 50, 0, 1, 7),
      spring("capacity.pop", W("s7", 11), W("s7", 11) + 20, 0, 1, 10),
      lerp("capacity.level", W("s7", 12), W("s7", 12) + 25, 1, 0.6, "out"),
    ],
    badges: [
      { text: "SEQUELA", variant: "negative", subtitle: "dedos que não dobram", appearAt: W("s7", 4), disappearAt: W("s7", 11) + 4 },
      { text: "MENOS CAPACIDADE", variant: "negative", appearAt: W("s7", 12), disappearAt: end(6) },
    ],
    highlights: ["DEDOS", "DOBRAM", "CAIXA", "GANHA"],
    captions: [{ text: "Só que dois dedos não dobram mais. Ele tenta pegar a caixa… e a caixa ganha.", from: voLocal("s7"), to: end(6) }],
    audioCues: [
      narration("s7", "ready"),
      sfx("whoosh", 0, 0.2),
      sfx("tick", W("s7", 4), 0.22),
      sfx("badge", W("s7", 4), 0.24),
      sfx("boing", W("s7", 11) + 20, 0.26),
      sfx("badge", W("s7", 12), 0.24),
    ],
  },
  // ------------------------------------------------------------------ s8 · solução: auxílio-acidente
  {
    id: "scene-08-auxilio-acidente",
    startFrame: sc(7).from,
    durationInFrames: sc(7).durationInFrames,
    voKey: "s8",
    narration: "É pra isso que existe o auxílio-acidente: uma indenização do INSS pra quem ficou com sequela que reduz a capacidade de trabalho.",
    camera: {
      projection: "perspective",
      movement: "orbit",
      keys: [key(0, P.face), key(s(0.6), P.pocket, "soft"), key(W("s8", 5), P.pocket), key(W("s8", 6) + s(0.5), orbit([-0.4, 2.4, -1.6], 9, 30, 10), "soft"), key(W("s8", 6) + s(1.6), P.goldPipe, "soft"), key(end(7), P.piggy, "soft")],
    },
    objects: [
      ...SYSTEM("nível sobe", "aberto"),
      o("accidentPipe", "cano-dourado+valvula", "inexistente", "aberto, brilhando"),
      o("lia", "mascote-mini-advogada-low-poly", "no bolso", "volta ao bolso"),
      o("marcos", "personagem-low-poly", "triste", "surpreso e feliz"),
      o("capacityGauge", "medidor-3d-capacidade (esquemático, sem números)", "reduzido", "reduzido"),
      o("box", "caixote+caixa-com-alca", "caída"),
    ],
    animations: [
      spring("lia.pop", 6, 40, 0, 1, 9),
      lerp("lia.point", 40, 60, 0, 1, "out"),
      lerp("marcos.reach", W("s8", 6), W("s8", 6) + 20, 1, 0, "inOut"),
      lerp("vignette.red", W("s8", 6), W("s8", 6) + 22, 0.6, 0, "inOut"),
      lerp("pipeAccident.grow", W("s8", 6), W("s8", 6) + 52, 0, 1, "out"),
      lerp("pipeAccident.glow", W("s8", 6), W("s8", 6) + 22, 0, 1, "out"),
      lerp("pipeAccident.glow", W("s8", 6) + 52, W("s8", 6) + 82, 1, 0.3, "inOut"),
      lerp("coins.accident.flow", W("s8", 6) + 52, W("s8", 6) + 67, 0, 1, "linear"),
      lerp("piggy.level", W("s8", 6) + 67, end(7), 0.42, 0.55, "linear"),
      lerp("stiff.tone", W("s8", 15), W("s8", 15) + 13, 0, 1, "out"),
      lerp("lia.pop", end(7) - 25, end(7) - 5, 1, 0, "in"),
    ],
    badges: [
      { text: "AUXÍLIO-ACIDENTE", variant: "positive", appearAt: W("s8", 6), disappearAt: W("s8", 6) + 87 },
      { text: "INDENIZAÇÃO", variant: "info", subtitle: "sequela que reduz a capacidade de trabalho", appearAt: W("s8", 8), disappearAt: end(7) },
    ],
    highlights: ["AUXÍLIO-ACIDENTE", "INDENIZAÇÃO", "SEQUELA", "CAPACIDADE"],
    captions: [
      { text: "É pra isso que existe o auxílio-acidente:", from: voLocal("s8"), to: W("s8", 7) },
      { text: "uma indenização do INSS pra quem ficou com sequela que reduz a capacidade de trabalho.", from: W("s8", 7), to: end(7) },
    ],
    audioCues: [
      narration("s8", "ready"),
      sfx("pop", 8, 0.26),
      sfx("shimmer", W("s8", 6), 0.26),
      sfx("badge", W("s8", 6), 0.26),
      sfx("coin", W("s8", 6) + 56, 0.22),
      sfx("pop", end(7) - 24, 0.18),
    ],
  },
  // ------------------------------------------------------------------ s9 · soma com o salário
  {
    id: "scene-09-salario-mais-auxilio",
    startFrame: sc(8).from,
    durationInFrames: sc(8).durationInFrames,
    voKey: "s9",
    narration: "E ele continua trabalhando! Salário e auxílio caem juntos, todo mês.",
    camera: { projection: "perspective", movement: "orbit", keys: [key(0, P.piggy), key(end(8), P.piggyR, "linear")] },
    objects: [
      ...SYSTEM("duas colunas subindo (prata + ouro)", "aberto"),
      o("accidentPipe", "cano-dourado+valvula", "aberto"),
      o("marcos", "personagem-low-poly", "empilhando caixas ao fundo"),
      o("calendar", "calendario-3d", "oculto", "virou 3 folhas"),
      o("capacityGauge", "medidor-3d-capacidade (esquemático, sem números)", "reduzido", "oculto"),
    ],
    animations: [
      lerp("capacity.pop", 0, 12, 1, 0, "in"),
      lerp("marcos.work", 0, end(8), 0, 1, "linear"),
      lerp("piggy.split", W("s9", 4), W("s9", 4) + 16, 0, 1, "out"),
      lerp("piggy.level", W("s9", 4), end(8), 0.55, 0.75, "linear"),
      spring("calendar.pop", W("s9", 4) + 16, W("s9", 4) + 41, 0, 1, 10),
      lerp("calendar.flip", W("s9", 8), end(8), 0, 1, "linear"),
    ],
    badges: [{ text: "SALÁRIO + AUXÍLIO", variant: "positive", subtitle: "juntos, todo mês", appearAt: W("s9", 4), disappearAt: end(8) }],
    highlights: ["TRABALHANDO", "SALÁRIO", "AUXÍLIO", "JUNTOS"],
    captions: [{ text: "E ele continua trabalhando! Salário e auxílio caem juntos, todo mês.", from: voLocal("s9"), to: end(8) }],
    audioCues: [
      narration("s9", "ready"),
      sfx("badge", W("s9", 4), 0.24),
      sfx("coin", W("s9", 8), 0.22),
      sfx("whoosh", W("s9", 8) + 10, 0.14),
      sfx("coin", W("s9", 8) + 20, 0.2),
    ],
  },
  // ------------------------------------------------------------------ s10 · acidente de qualquer natureza
  {
    id: "scene-10-qualquer-natureza",
    startFrame: sc(9).from,
    durationInFrames: sc(9).durationInFrames,
    voKey: "s10",
    narration: "Ah, mas o tombo foi de moto, no fim de semana? Também vale: acidente de qualquer natureza.",
    camera: {
      projection: "perspective",
      movement: "orbit",
      keys: [key(0, P.piggyR), key(s(1.0), P.side, "soft"), key(W("s10", 12), P.side), key(end(9), P.sideWide, "soft")],
    },
    objects: [
      ...SYSTEM("cheio pela metade", "aberto"),
      o("accidentPipe", "cano-dourado+valvula", "aberto"),
      o("marcos", "personagem-low-poly (cópia de capacete na moto)", "na moto", "sentado ao lado da moto, tonto"),
      o("road", "trecho-de-estrada", "oculto", "visível"),
      o("moto", "moto-low-poly", "em pé", "tombada"),
      o("house", "casinha-mini-cenario", "oculta", "visível com ✔"),
      o("field", "campinho+bola", "oculto", "visível com ✔"),
      o("checks", "check-3d-verde", "ocultos", "sobre os 3 mini-cenários"),
      o("calendar", "calendario-3d", "visível", "oculto"),
    ],
    animations: [
      lerp("calendar.pop", 0, 12, 1, 0, "in"),
      spring("road.pop", 6, 30, 0, 1, 10),
      lerp("moto.tip", W("s10", 6), W("s10", 6) + 30, 0, 80, "in", "deg"),
      lerp("rider.sit", W("s10", 6) + 30, W("s10", 6) + 47, 0, 1, "out"),
      spring("house.pop", W("s10", 13), W("s10", 13) + 20, 0, 1, 10),
      spring("field.pop", W("s10", 13) + 8, W("s10", 13) + 28, 0, 1, 10),
      spring("checks.pop", W("s10", 15), W("s10", 15) + 30, 0, 1, 9),
    ],
    badges: [
      { text: "FORA DO TRABALHO?", variant: "warning", icon: "?", appearAt: W("s10", 3), disappearAt: W("s10", 3) + 87 },
      { text: "QUALQUER NATUREZA", variant: "positive", subtitle: "trabalho, trânsito, casa, lazer", appearAt: W("s10", 13), disappearAt: end(9) },
    ],
    highlights: ["MOTO", "SEMANA", "VALE", "QUALQUER", "NATUREZA"],
    captions: [{ text: "Ah, mas o tombo foi de moto, no fim de semana? Também vale: acidente de qualquer natureza.", from: voLocal("s10"), to: end(9) }],
    audioCues: [
      narration("s10", "ready"),
      sfx("whoosh", 0, 0.22),
      sfx("pop", 8, 0.2),
      sfx("badge", W("s10", 3), 0.22),
      sfx("boing", W("s10", 6) + 26, 0.26),
      sfx("pop", W("s10", 13), 0.2),
      sfx("ding", W("s10", 15), 0.22),
    ],
  },
  // ------------------------------------------------------------------ s11 · quem tem direito
  {
    id: "scene-11-quem-tem-direito",
    startFrame: sc(10).from,
    durationInFrames: sc(10).durationInFrames,
    voKey: "s11",
    narration: "Mas nem todo mundo tem direito. Vale pra carteira assinada, inclusive doméstico, avulso e segurado especial, tipo pequeno produtor rural.",
    camera: { projection: "perspective", movement: "tracking", keys: [key(0, P.sideWide), key(s(1.0), P.gate, "soft"), key(end(10), P.gateR, "linear")] },
    objects: [
      ...SYSTEM("cheio pela metade", "aberto"),
      o("accidentPipe", "cano-dourado+valvula", "aberto"),
      o("marcos", "personagem-low-poly", "trabalhando"),
      o("road", "trecho-de-estrada", "visível", "encolhido"),
      o("moto", "moto-low-poly", "tombada", "encolhida"),
      o("house", "casinha-mini-cenario", "visível", "encolhida"),
      o("field", "campinho+bola", "visível", "encolhido"),
      o("checks", "check-3d-verde", "visíveis", "encolhidos"),
      o("gate", "portao-catraca+luz", "oculto", "luz verde a cada passagem"),
      o("pawns", "5-bonecos (carteira, doméstica, portuário, rural, notebook)", "chegando pela direita", "4 passaram; o de notebook espera"),
    ],
    animations: [
      lerp("side.shrink", 0, 15, 0, 1, "in"),
      spring("gate.pop", 0, 30, 0, 1, 10),
      lerp("queue.arrive", 20, 80, 0, 1, "inOut"),
      lerp("pawn1.pass", W("s11", 8), W("s11", 8) + 24, 0, 1, "inOut"),
      lerp("pawn2.pass", W("s11", 11), W("s11", 11) + 24, 0, 1, "inOut"),
      lerp("pawn3.pass", W("s11", 12), W("s11", 12) + 24, 0, 1, "inOut"),
      lerp("pawn4.pass", W("s11", 14), W("s11", 14) + 24, 0, 1, "inOut"),
      lerp("gate.green", W("s11", 8), W("s11", 14) + 24, 0, 1, "linear"),
    ],
    badges: [
      { text: "QUEM TEM DIREITO?", variant: "warning", icon: "?", appearAt: W("s11", 1), disappearAt: W("s11", 8) - 6 },
      { text: "EMPREGADO E DOMÉSTICO", variant: "positive", appearAt: W("s11", 8), disappearAt: end(10) },
      { text: "AVULSO E SEGURADO ESPECIAL", variant: "positive", appearAt: W("s11", 12), disappearAt: end(10) },
    ],
    highlights: ["DIREITO", "CARTEIRA", "DOMÉSTICO", "AVULSO", "SEGURADO", "ESPECIAL"],
    captions: [
      { text: "Mas nem todo mundo tem direito.", from: voLocal("s11"), to: W("s11", 6) },
      { text: "Vale pra carteira assinada, inclusive doméstico, avulso e segurado especial, tipo pequeno produtor rural.", from: W("s11", 6), to: end(10) },
    ],
    audioCues: [
      narration("s11", "ready"),
      sfx("whoosh", 0, 0.2),
      sfx("pop", 4, 0.2),
      sfx("badge", W("s11", 1), 0.22),
      sfx("ding", W("s11", 8) + 12, 0.2),
      sfx("ding", W("s11", 11) + 12, 0.2),
      sfx("ding", W("s11", 12) + 12, 0.2),
      sfx("ding", W("s11", 14) + 12, 0.2),
    ],
  },
  // ------------------------------------------------------------------ s12 · MEI/autônomo de fora
  {
    id: "scene-12-mei-autonomo",
    startFrame: sc(11).from,
    durationInFrames: sc(11).durationInFrames,
    voKey: "s12",
    narration: "MEI e autônomo? Ficam de fora.",
    camera: { projection: "perspective", movement: "dolly-in", keys: [key(0, P.gateR), key(end(11), P.gateClose, "soft")] },
    objects: [
      ...SYSTEM("cheio pela metade", "aberto"),
      o("accidentPipe", "cano-dourado+valvula", "aberto"),
      o("marcos", "personagem-low-poly", "trabalhando"),
      o("gate", "portao-catraca+luz", "verde", "vermelho, travado"),
      o("pawns", "5-bonecos (carteira, doméstica, portuário, rural, notebook)", "o de notebook na frente", "o de notebook dá de ombros"),
      off("road", "trecho-de-estrada"),
      off("moto", "moto-low-poly"),
      off("house", "casinha-mini-cenario"),
      off("field", "campinho+bola"),
      off("checks", "check-3d-verde"),
    ],
    animations: [
      lerp("pawn5.try", 6, 30, 0, 1, "inOut"),
      spring("gate.block", W("s12", 3), W("s12", 3) + 30, 0, 1, 8),
      lerp("gate.red", W("s12", 3), W("s12", 3) + 7, 0, 1, "out"),
      lerp("pawn5.shrug", W("s12", 3) + 12, W("s12", 3) + 37, 0, 1, "inOut"),
    ],
    badges: [{ text: "MEI E AUTÔNOMO", variant: "negative", subtitle: "contribuinte individual não tem direito", appearAt: W("s12", 0), disappearAt: end(11) }],
    highlights: ["MEI", "AUTÔNOMO", "FORA"],
    captions: [{ text: "MEI e autônomo? Ficam de fora.", from: voLocal("s12"), to: end(11) }],
    audioCues: [narration("s12", "ready"), sfx("badge", W("s12", 0), 0.22), sfx("buzz", W("s12", 3), 0.24), sfx("clunk", W("s12", 3) + 4, 0.26)],
  },
  // ------------------------------------------------------------------ s13 · quanto e até quando
  {
    id: "scene-13-valor-ate-aposentar",
    startFrame: sc(12).from,
    durationInFrames: sc(12).durationInFrames,
    voKey: "s13",
    narration: "E quanto é? Em regra, metade do salário de benefício, a média das contribuições. E cai até ele se aposentar.",
    camera: {
      projection: "perspective",
      movement: "vertical",
      keys: [key(0, P.gateClose), key(s(0.9), P.coin, "soft"), key(W("s13", 13), P.coin), key(end(12), P.timeline, "soft")],
    },
    objects: [
      ...SYSTEM("cheio pela metade", "aberto"),
      o("accidentPipe", "cano-dourado+valvula", "aberto"),
      o("marcos", "personagem-low-poly", "trabalhando"),
      o("gate", "portao-catraca+luz", "vermelho", "encolhido"),
      o("pawns", "5-bonecos (carteira, doméstica, portuário, rural, notebook)", "na fila", "encolhidos"),
      o("bigCoin", "moeda-gigante-2-metades", "oculta", "metade entrou no cano dourado"),
      o("timeline", "linha-do-tempo-no-chao", "inexistente", "do cofrinho até a cadeira"),
      o("chair", "cadeira-de-balanco+placa-de-parada", "oculta", "fluxo dourado para aqui"),
    ],
    animations: [
      lerp("gate.pop", 0, 12, 1, 0, "in"),
      lerp("pawns.shrink", 0, 12, 0, 1, "in"),
      spring("bigCoin.pop", 6, 30, 0, 1, 10),
      lerp("bigCoin.spin", 6, W("s13", 5), 0, 720, "linear", "deg"),
      lerp("bigCoin.split", W("s13", 5), W("s13", 5) + 20, 0, 1, "out"),
      lerp("halfCoin.drop", W("s13", 5) + 24, W("s13", 5) + 54, 0, 1, "in"),
      lerp("bigCoin.pop", W("s13", 5) + 54, W("s13", 5) + 69, 1, 0, "in"),
      lerp("timeline.grow", W("s13", 14), W("s13", 14) + 29, 0, 1, "out"),
      lerp("timeline.coins", W("s13", 14), W("s13", 14) + 39, 0, 1, "linear"),
      spring("chair.pop", W("s13", 16), W("s13", 16) + 20, 0, 1, 10),
      spring("timeline.stop", end(12) - 17, end(12), 0, 1, 9),
    ],
    badges: [
      { text: "50% DO SALÁRIO DE BENEFÍCIO", variant: "info", subtitle: "em regra · média das contribuições", appearAt: W("s13", 5), disappearAt: W("s13", 14) - 6 },
      { text: "ATÉ A APOSENTADORIA", variant: "info", subtitle: "não acumula com aposentadoria", appearAt: W("s13", 14), disappearAt: end(12) },
    ],
    highlights: ["QUANTO", "METADE", "SALÁRIO", "BENEFÍCIO", "APOSENTAR"],
    captions: [
      { text: "E quanto é? Em regra, metade do salário de benefício, a média das contribuições.", from: voLocal("s13"), to: W("s13", 14) },
      { text: "E cai até ele se aposentar.", from: W("s13", 14), to: end(12) },
    ],
    audioCues: [
      narration("s13", "ready"),
      sfx("whoosh", 0, 0.2),
      sfx("pop", 8, 0.22),
      sfx("crack", W("s13", 5), 0.24),
      sfx("badge", W("s13", 5), 0.24),
      sfx("coin", W("s13", 5) + 50, 0.22),
      sfx("whoosh", W("s13", 14), 0.18),
      sfx("clunk", end(12) - 14, 0.22),
    ],
  },
  // ------------------------------------------------------------------ s14 · não é automático: pedido
  {
    id: "scene-14-cadeado-pedido-135",
    startFrame: sc(13).from,
    durationInFrames: sc(13).durationInFrames,
    voKey: "s14",
    narration: "Mas nem sempre o INSS libera sozinho. Junta os laudos e pede pelo telefone um três cinco.",
    camera: {
      projection: "perspective",
      movement: "tracking",
      keys: [key(0, P.timeline), key(s(1.0), P.valve, "soft"), key(W("s14", 6), P.valve), key(W("s14", 7) + s(0.6), P.liaPhone, "soft"), key(end(13), P.liaPhone)],
    },
    objects: [
      ...SYSTEM("cheio pela metade", "aberto"),
      o("accidentPipe", "cano-dourado+valvula", "aberto", "fechado com cadeado"),
      o("padlock", "cadeado", "fora de cena", "trancado na válvula"),
      o("timeline", "linha-do-tempo-no-chao", "visível"),
      o("chair", "cadeira-de-balanco+placa-de-parada", "visível"),
      o("marcos", "personagem-low-poly", "trabalhando", "ao telefone"),
      o("lia", "mascote-mini-advogada-low-poly", "no bolso", "fora do bolso com a pasta"),
      o("folder", "pasta-azul-laudos+raio-x", "oculta", "voando até o INSS"),
      o("phone", "celular-low-poly (tela 135 = rótulo 2D)", "oculto", "vibrando"),
      off("bigCoin", "moeda-gigante-2-metades"),
      off("gate", "portao-catraca+luz"),
      off("pawns", "5-bonecos"),
    ],
    animations: [
      lerp("marcos.work", 0, 15, 1, 0, "in"),
      lerp("accidentValve.closed", W("s14", 3), W("s14", 3) + 12, 0, 1, "out"),
      lerp("coins.accident.flow", W("s14", 3) + 7, W("s14", 3) + 17, 1, 0, "linear"),
      spring("padlock.drop", W("s14", 5), W("s14", 5) + 30, 0, 1, 10),
      spring("lia.pop", W("s14", 7), W("s14", 7) + 26, 0, 1, 9),
      spring("folder.pop", W("s14", 9), W("s14", 9) + 20, 0, 1, 10),
      spring("phone.pop", W("s14", 11), W("s14", 11) + 20, 0, 1, 10),
      lerp("phone.ring", W("s14", 11) + 14, W("s14", 11) + 44, 0, 1, "linear"),
      lerp("folder.fly", end(13) - 32, end(13), 0, 1, "inOut"),
      lerp("inss.review", end(13) - 12, end(13), 0, 1, "out"),
    ],
    badges: [
      { text: "NEM SEMPRE É AUTOMÁTICO", variant: "warning", appearAt: W("s14", 1), disappearAt: W("s14", 7) },
      { text: "PEDIDO PELO 135", variant: "info", subtitle: "leve laudos e exames", appearAt: W("s14", 11), disappearAt: end(13) },
    ],
    highlights: ["SOZINHO", "LAUDOS", "TELEFONE", "135"],
    captions: [
      { text: "Mas nem sempre o INSS libera sozinho.", from: voLocal("s14"), to: W("s14", 7) },
      { text: "Junta os laudos e pede pelo telefone 135.", from: W("s14", 7), to: end(13) },
    ],
    audioCues: [
      narration("s14", "ready"),
      sfx("whoosh", 0, 0.2),
      sfx("clunk", W("s14", 3), 0.28),
      sfx("lock", W("s14", 5) + 10, 0.3),
      sfx("badge", W("s14", 1), 0.24),
      sfx("pop", W("s14", 7), 0.22),
      sfx("phone", W("s14", 11) + 14, 0.22),
      sfx("whoosh", end(13) - 32, 0.16),
    ],
  },
  // ------------------------------------------------------------------ s15 · negado → recurso/Justiça
  {
    id: "scene-15-recurso-justica",
    startFrame: sc(14).from,
    durationInFrames: sc(14).durationInFrames,
    voKey: "s15",
    narration: "Negaram? Dá pra recorrer ou ir à Justiça.",
    camera: { projection: "perspective", movement: "orbit", keys: [key(0, P.liaPhone), key(W("s15", 2), P.heroLow, "soft"), key(end(14), P.heroLow)] },
    objects: [
      ...SYSTEM("cheio pela metade", "aberto"),
      o("accidentPipe", "cano-dourado+valvula", "fechado com cadeado", "aberto"),
      o("padlock", "cadeado", "trancado", "estourado"),
      o("folder", "pasta-azul-laudos+raio-x", "voltando do INSS", "carimbada"),
      o("denyStamp", "carimbo-vermelho", "fora de cena", "recolhido"),
      o("gavel", "martelo-de-juiz", "oculto", "bateu no cadeado"),
      o("lia", "mascote-mini-advogada-low-poly", "com a pasta", "sobre a válvula"),
      o("marcos", "personagem-low-poly", "ao telefone", "torcendo"),
      off("phone", "celular-low-poly"),
      o("timeline", "linha-do-tempo-no-chao", "visível"),
      o("chair", "cadeira-de-balanco+placa-de-parada", "visível"),
    ],
    animations: [
      lerp("folder.back", 0, 10, 0, 1, "out"),
      spring("denyStamp.drop", W("s15", 0), W("s15", 0) + 22, 0, 1, 8),
      lerp("inss.review", 10, 20, 1, 0, "in"),
      lerp("denyStamp.drop", W("s15", 0) + 30, W("s15", 0) + 45, 1, 0, "in"),
      lerp("lia.climb", 25, 45, 0, 1, "inOut"),
      lerp("gavel.swing", W("s15", 3), W("s15", 3) + 27, 0, -90, "in", "deg"),
      lerp("padlock.break", W("s15", 3) + 23, W("s15", 3) + 37, 0, 1, "out"),
      lerp("accidentValve.closed", W("s15", 3) + 32, W("s15", 3) + 45, 1, 0, "out"),
      lerp("coins.accident.flow", W("s15", 3) + 37, W("s15", 3) + 52, 0, 1, "linear"),
    ],
    badges: [
      { text: "NEGADO?", variant: "negative", appearAt: W("s15", 0), disappearAt: W("s15", 3) - 2 },
      { text: "RECURSO OU JUSTIÇA", variant: "positive", appearAt: W("s15", 3), disappearAt: end(14) },
    ],
    highlights: ["NEGARAM", "RECORRER", "JUSTIÇA"],
    captions: [{ text: "Negaram? Dá pra recorrer ou ir à Justiça.", from: voLocal("s15"), to: end(14) }],
    audioCues: [
      narration("s15", "ready"),
      sfx("stamp", W("s15", 0) + 10, 0.34),
      sfx("badge", W("s15", 0), 0.22),
      sfx("gavel", W("s15", 3) + 25, 0.36),
      sfx("crack", W("s15", 3) + 25, 0.26),
      sfx("coin", W("s15", 3) + 45, 0.22),
    ],
  },
  // ------------------------------------------------------------------ s16 · sistema completo + recompensa
  {
    id: "scene-16-pronto",
    startFrame: sc(15).from,
    durationInFrames: sc(15).durationInFrames,
    voKey: "s16",
    narration: "Pronto: agora você sabe como funciona o auxílio-acidente. Conhece alguém assim? Manda pra essa pessoa!",
    camera: {
      projection: "perspective",
      movement: "dolly-out",
      keys: [key(0, P.heroLow), key(s(3.4), P.final, "soft"), key(W("s16", 8), P.final), key(end(15), P.finalClose, "soft")],
    },
    objects: [
      ...SYSTEM("quase cheio", "aberto"),
      o("accidentPipe", "cano-dourado+valvula", "aberto", "aberto, brilhando"),
      o("timeline", "linha-do-tempo-no-chao", "visível"),
      o("chair", "cadeira-de-balanco+placa-de-parada", "visível"),
      o("marcos", "personagem-low-poly", "trabalhando", "joinha"),
      o("lia", "mascote-mini-advogada-low-poly", "sobre a válvula", "no ombro do Marcos, acenando"),
      o("labels", "rotulos-ancorados", "ocultos", "SALÁRIO / AUXÍLIO-ACIDENTE / INSS / COFRINHO"),
      off("padlock", "cadeado"),
      off("folder", "pasta-azul-laudos+raio-x"),
      off("denyStamp", "carimbo-vermelho"),
      off("gavel", "martelo-de-juiz"),
    ],
    animations: [
      lerp("lia.climb", 0, 30, 1, 0, "inOut"),
      lerp("marcos.work", 0, 20, 0, 1, "inOut"),
      lerp("marcos.work", W("s16", 8) + 9, W("s16", 8) + 19, 1, 0, "inOut"),
      lerp("final.labels", 20, 80, 0, 1, "out"),
      lerp("piggy.level", 0, 120, 0.75, 0.9, "linear"),
      lerp("pipeAccident.glow", W("s16", 7), W("s16", 7) + 15, 0.3, 1, "out"),
      lerp("pipeAccident.glow", W("s16", 7) + 15, W("s16", 7) + 31, 1, 0.3, "in"),
      lerp("lia.wave", W("s16", 8) + 9, end(15) - 16, 0, 1, "linear"),
      lerp("marcos.thumb", W("s16", 8) + 19, W("s16", 8) + 39, 0, 1, "out"),
      lerp("fade", end(15) - 18, end(15), 0, 1, "in"),
    ],
    badges: [
      { text: "AUXÍLIO-ACIDENTE", variant: "positive", subtitle: "como funciona? agora você sabe", size: "large", appearAt: W("s16", 0), disappearAt: W("s16", 8) + 19 },
      { text: "MANDA PRA QUEM PRECISA", variant: "warning", appearAt: W("s16", 11), disappearAt: end(15) - 36 },
      { text: "CONTEÚDO INFORMATIVO", variant: "info", subtitle: "cada caso exige análise individual", appearAt: end(15) - 36, disappearAt: end(15) },
    ],
    highlights: ["PRONTO", "AUXÍLIO-ACIDENTE", "CONHECE", "MANDA"],
    captions: [
      { text: "Pronto: agora você sabe como funciona o auxílio-acidente.", from: voLocal("s16"), to: W("s16", 8) },
      { text: "Conhece alguém assim? Manda pra essa pessoa!", from: W("s16", 8), to: end(15) - 18 },
    ],
    audioCues: [
      narration("s16", "ready"),
      sfx("whoosh", 0, 0.2),
      sfx("final", W("s16", 0), 0.3),
      sfx("glow", W("s16", 7), 0.22),
      sfx("pop", W("s16", 8) + 6, 0.2),
      sfx("ding", W("s16", 11), 0.2),
    ],
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
