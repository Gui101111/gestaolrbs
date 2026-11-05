import type { Vec3 } from "./utils/animation";

// Planta da ilha (unidades do mundo, topo do gramado em y = 0). Usada pelo mundo 3D e pela câmera.
export const L = {
  islandCenter: [0, 0, -1.2] as Vec3,
  islandRadius: [6.8, 8.0] as [number, number],
  warehouse: [-2.8, 0, -4.4] as Vec3,
  warehouseSize: [4.2, 3.2, 3.4] as Vec3,
  inss: [2.8, 0, -4.6] as Vec3,
  inssSize: [4.0, 3.0, 3.0] as Vec3,
  piggy: [1.3, 0, 2.0] as Vec3,
  slot: [1.3, 2.3, 2.0] as Vec3,
  home: [-0.9, 0, 2.5] as Vec3,
  bench: [-0.9, 0, 2.45] as Vec3,
  work: [-2.6, 0, -1.8] as Vec3,
  shelf: [-3.7, 0, -2.6] as Vec3,
  ladderBase: [-3.05, 0, -2.05] as Vec3,
  landing: [-2.35, 0, -1.35] as Vec3,
  boxPile: [-2.1, 0, -1.75] as Vec3,
  crate: [-2.93, 0, -0.98] as Vec3,
  gate: [2.8, 0, -2.3] as Vec3,
  road: [4.1, 0, 1.4] as Vec3,
  house: [4.3, 0, -0.5] as Vec3,
  field: [3.4, 0, 3.6] as Vec3,
  chair: [-3.8, 0, 3.9] as Vec3,
  calendar: [0.15, 0, 3.05] as Vec3,
};

/** Pontos dos canos (início no prédio → fim na fenda do cofrinho). */
export const PIPES = {
  salary: [
    [-0.75, 2.3, -3.6],
    [-0.3, 3.05, -1.4],
    [0.6, 3.25, 0.6],
    [1.22, 3.05, 1.85],
    [1.24, 2.3, 2.0],
  ] as Vec3[],
  sick: [
    [1.0, 2.2, -3.2],
    [1.35, 3.3, -1.2],
    [1.45, 3.45, 0.7],
    [1.32, 3.1, 1.9],
    [1.3, 2.3, 2.0],
  ] as Vec3[],
  accident: [
    [2.5, 2.7, -3.15],
    [2.4, 3.35, -0.7],
    [1.9, 3.5, 1.1],
    [1.38, 3.1, 1.95],
    [1.36, 2.3, 2.0],
  ] as Vec3[],
};

/** Válvulas: posição sobre o cano (índice do ponto de controle). */
export const VALVES = {
  salary: [-0.3, 3.05, -1.4] as Vec3,
  accident: [2.4, 3.35, -0.7] as Vec3,
};

/** Mão direita do Marcos no posto de trabalho, com o braço estendido (close da cena 7). */
export const HAND_REACH: Vec3 = [-2.93, 1.29, -1.17];
/** Bolso da camisa do Marcos no posto de trabalho (a Lia mora aqui). */
export const POCKET_WORK: Vec3 = [-2.48, 1.32, -1.6];

/** EP02 (BPC): posições da Dona Maria, do filho, da mesa e da fila do portão. */
export const EP = {
  maria: [-2.6, 0, -1.75] as Vec3,
  son: [-1.5, 0, -1.6] as Vec3,
  table: [-2.05, 0, -0.75] as Vec3,
  queueMaria: [3.7, 0, -2.3] as Vec3,
  endMaria: [1.95, 0, -2.45] as Vec3,
  queueWc: [4.6, 0, -2.3] as Vec3,
  endWc: [1.05, 0, -2.2] as Vec3,
  cad: [-2.05, 1.55, -0.75] as Vec3,
};

/** EP03 (auxílio-doença): cama em casa e documento da perícia ao lado. */
export const EP3 = {
  bed: [-0.9, 0, 2.55] as Vec3,
  lying: [-0.9, 0.62, 3.4] as Vec3,
  doc: [-0.15, 1.45, 2.4] as Vec3,
};

/** EP04 (salário-maternidade): Ana, mesa de manicure, berço, desempregada e martelo do STF. */
export const EP4 = {
  ana: [-2.6, 0, -1.7] as Vec3,
  manicure: [-1.75, 0, -1.55] as Vec3,
  crib: [-1.6, 0, -0.55] as Vec3,
  jobless: [3.6, 0, -0.2] as Vec3,
  gavel: [1.3, 2.9, 3.4] as Vec3,
};

/** Visual do protagonista neste episódio (EP05: Lucas, uniforme vermelho da loja). */
export const LOOK: { shirt?: string; hair?: string; mustache?: boolean; hat?: "straw" } = {};

// ---------------------------------------------------------------- série 2 (comédia "mito")
/** night = Halloween (céu roxo/laranja, abóboras, morcegos, lua); farm = sítio (milharal, bandeirinhas). */
export const THEME: { night: boolean; farm: boolean } = { night: false, farm: false };

export type Actor = {
  id: string;
  kind: "marcos" | "cunhado" | "tonho" | "woman" | "vizinha" | "elder" | "sogra" | "lia" | "ghost" | "pawn" | "kid" | "wheel" | "leao" | "golpista" | "baby";
  pawnKind?: "carteira" | "domestica" | "portuario" | "rural" | "mei";
  at: Vec3;
  ry?: number;
  s?: number;
  shirt?: string;
  hair?: string;
  top?: string;
  dress?: string;
  witch?: boolean;
  backpack?: boolean;
  helmet?: boolean;
};

/** Pontos fixos do palco (diante do INSS). */
export const STAGE = {
  doc: [1.35, 0, -2.1] as Vec3,
  docRy: 0.3,
  coinsAt: [-0.3, 0, -3.6] as Vec3,
  ball: [-1.25, 0, -0.85] as Vec3,
  cad: [0.45, 2.45, -1.2] as Vec3,
  urna: [1.4, 0, -1.75] as Vec3,
  meia: [-1.35, 0, -1.8] as Vec3,
  urnaRy: -0.6,
  chickens: [
    [-3.0, 0, -0.55],
    [-2.2, 0, -0.35],
    [-1.65, 0, -0.95],
    [-2.75, 0, -1.05],
  ] as Vec3[],
  bar: [1.45, 0, -1.6] as Vec3,
  gavel: [2.25, 1.0, -1.85] as Vec3,
  folder: [0.95, 0.8, -1.05] as Vec3,
  myth: [0.4, 2.4, -1.6] as Vec3,
  ghosts: [
    [-1.2, 1.6, -0.6],
    [1.9, 2.0, -0.2],
    [0.2, 2.6, -2.6],
  ] as Vec3[],
  corn: [-4.15, 0, -0.75] as Vec3,
  buntingA: [-4.0, 2.35, -2.55] as Vec3,
  buntingB: [-1.2, 2.35, -2.55] as Vec3,
};

/** Elenco do episódio (o Marcos principal continua no World; aqui ficam os coadjuvantes). */
export const CAST: Actor[] = [
  { id: "julia", kind: "woman", at: [0.45, 0, -1.35], top: "#4fc3f7" },
  { id: "sogra", kind: "sogra", at: [-0.4, 0, -1.05], ry: 0.45, dress: "#2e7d5b", top: "#a5d6a7" },
];

/** EP06 (pensão por morte): família da dona Rosa, porta-retrato e barra de porcentagem. */
export const EP6 = {
  rosa: [-1.85, 0, -1.45] as Vec3,
  kid1: [-1.3, 0, -1.2] as Vec3,
  kid2: [-2.35, 0, -1.15] as Vec3,
  photo: [-2.5, 1.55, -2.85] as Vec3,
  bar: [1.3, 0, 3.75] as Vec3,
  queueRosa: [3.7, 0, -2.3] as Vec3,
  endRosa: [2.0, 0, -2.55] as Vec3,
  queueParents: [4.6, 0, -2.3] as Vec3,
  endParents: [1.15, 0, -2.35] as Vec3,
};
