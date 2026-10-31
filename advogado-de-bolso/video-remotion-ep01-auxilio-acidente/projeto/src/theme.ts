import { continueRender, delayRender, staticFile } from "remotion";

// Configuração visual central: paleta, materiais, luz, câmera e áreas seguras.
// Fonte Montserrat servida localmente (public/fonts) — o render não depende de internet.

export const FONT = "Montserrat";

if (typeof document !== "undefined" && typeof FontFace !== "undefined") {
  const handle = delayRender("Carregando Montserrat");
  Promise.all(
    [700, 800, 900].map((w) =>
      new FontFace(FONT, `url(${staticFile(`fonts/montserrat-${w}.woff2`)}) format("woff2")`, { weight: String(w) }).load().then((face) => {
        document.fonts.add(face);
      }),
    ),
  )
    .then(() => continueRender(handle))
    .catch((err) => {
      console.error(err);
      continueRender(handle);
    });
}

export const PALETTE = {
  // Estados didáticos (sempre com ícone + texto, nunca só cor)
  positive: "#20b85a",
  negative: "#e5383b",
  info: "#2f7df6",
  warning: "#f8c815",
  // Interface
  text: "#ffffff",
  outline: "#0a1420",
  accent: "#53d6ff",
  // Marca
  navy: "#0b2160",
  denim: "#2c5cc2",
  gold: "#f2bd3a",
  // Mundo
  grass: "#8cc152",
  grassDark: "#6fa83c",
  dirt: "#b98a5d",
  dirtDark: "#8c6443",
  pedestal: "#1d2b45",
  wall: "#eef1f4",
  wallShade: "#cfd6de",
  roof: "#e0663d",
  inssBlue: "#2c5cc2",
  column: "#f7f7f2",
  wood: "#b07a46",
  woodDark: "#7e5531",
  cardboard: "#c99a5b",
  metal: "#a2abb5",
  skin: "#c98e63",
  hair: "#2b1d16",
  shirt: "#7fb2e5",
  pants: "#59616b",
  boots: "#5b3b25",
  piggy: "#f6a5c0",
  silver: "#eef3f8",
  coinGold: "#ffc531",
  sickBlue: "#5aa9f2",
  red: "#e5383b",
  green: "#20b85a",
  yellow: "#f8c815",
} as const;

/** Acabamento levemente fosco para todo o diorama. */
export const MATTE = { roughness: 0.88, metalness: 0, flatShading: true } as const;
export const METAL = { roughness: 0.38, metalness: 0.55, flatShading: true } as const;

export const LIGHTING = {
  ambient: 0.55,
  hemisphere: { sky: "#e6f4ff", ground: "#6b5a48", intensity: 1.0 },
  key: { position: [9, 16, 12] as [number, number, number], intensity: 2.5, color: "#fff4e2" },
  fill: { position: [-12, 6, 8] as [number, number, number], intensity: 0.75, color: "#cfe6ff" },
  rim: { position: [-4, 8, -12] as [number, number, number], intensity: 0.6, color: "#ffffff" },
  shadowMapSize: 1536,
} as const;

/** Perspectiva suave: FOV baixo e câmera afastada preservam a leitura do esquema. */
export const CAMERA = { fov: 24, near: 0.1, far: 400 } as const;

/** Faixas seguras para Shorts/Reels (px numa tela 1080x1920). */
export const SAFE = {
  top: 250,
  bottom: 1540,
  side: 90,
  badgeTop: 262,
  captionCenterY: 1418,
} as const;

/** Fundo em degradê: céu claro; esquenta (dourado) quando a solução aparece. */
export const SKY = {
  day: ["#7cc3ee", "#bfe3f5", "#f3f1e4"],
  warm: ["#f7b267", "#fbd38d", "#fff4d6"],
} as const;

/** Cores das palavras-chave nas legendas (as demais palavras ficam brancas). */
const G = "#4be37f";
const R = "#ff6b6b";
const Y = "#ffd43b";
const GOLD = "#ffc531";
export const KEYWORD_COLOR: Record<string, string> = {
  GOLPE: R,
  LEI: G,
  ESCADA: Y,
  DANÇAR: Y,
  CAIU: R,
  MÃO: R,
  ENGESSADA: R,
  PAROU: R,
  AGORA: Y,
  CALMA: G,
  ALTA: G,
  DEDOS: R,
  DOBRAM: R,
  GANHA: R,
  "AUXÍLIO-ACIDENTE": GOLD,
  INDENIZAÇÃO: GOLD,
  SEQUELA: R,
  CAPACIDADE: R,
  JUNTOS: G,
  TRABALHANDO: G,
  VALE: G,
  QUALQUER: G,
  NATUREZA: G,
  MOTO: Y,
  SEMANA: Y,
  DIREITO: Y,
  MEI: R,
  AUTÔNOMO: R,
  FORA: R,
  QUANTO: Y,
  METADE: GOLD,
  SOZINHO: Y,
  "135": Y,
  NEGARAM: R,
  RECORRER: G,
  JUSTIÇA: G,
  PRONTO: G,
  MANDA: Y,
};
export const KEYWORD_DEFAULT = "#4fdcff";
