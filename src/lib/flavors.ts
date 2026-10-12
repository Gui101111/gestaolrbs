/**
 * Cores das bolas de sorvete das ilustrações (apenas visuais —
 * não representam sabores específicos do cardápio).
 */
export const scoopColors = {
  rosa: "#F6A6C1",
  azul: "#8DD3F2",
  creme: "#FFF0D2",
  chocolate: "#8A5634",
  menta: "#A9E4CB",
  amarelo: "#FFD873",
  lilas: "#C8B5F2",
  morango: "#F27C93",
} as const;

export const sauceColors = {
  chocolate: "#5B3220",
  morango: "#D93A5B",
  caramelo: "#C9802F",
  azul: "#3BA8DA",
} as const;

const c = scoopColors;
const s = sauceColors;

/** Combinações que o sorvete do hero percorre (a primeira lembra o sorvete da vaquinha). */
export const combos: { scoops: [string, string, string]; sauce: string; label: string }[] = [
  { scoops: [c.azul, c.rosa, c.rosa], sauce: s.azul, label: "Rosa e azul" },
  { scoops: [c.creme, c.morango, c.creme], sauce: s.morango, label: "Creme com calda vermelha" },
  { scoops: [c.chocolate, c.creme, c.chocolate], sauce: s.chocolate, label: "Chocolate e creme" },
  { scoops: [c.menta, c.lilas, c.amarelo], sauce: s.caramelo, label: "Colorido com caramelo" },
];
