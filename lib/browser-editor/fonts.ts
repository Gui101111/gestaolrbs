/**
 * Fontes do canvas. No app (next/font) o nome real da família vem das
 * variáveis CSS; na página publicada, as variáveis apontam para o Google Fonts.
 */
const VARS: Record<string, string> = { Sora: "--font-sora", Manrope: "--font-manrope", "Instrument Serif": "--font-instrument" };
const memo = new Map<string, string>();

export function fam(name: string): string {
  const hit = memo.get(name);
  if (hit) return hit;
  let v = "";
  try {
    if (typeof document !== "undefined" && VARS[name]) v = getComputedStyle(document.body ?? document.documentElement).getPropertyValue(VARS[name]).trim();
  } catch {
    // sem DOM: usa o nome
  }
  const out = v || `"${name}"`;
  memo.set(name, out);
  return out;
}

/** `font` do canvas: peso, tamanho em px e família (com substitutas). */
export function font(weight: number | string, px: number, name: string, italic = false) {
  return `${italic ? "italic " : ""}${weight} ${Math.max(1, Math.round(px))}px ${fam(name)}, "Manrope", system-ui, sans-serif`;
}

export async function loadFonts(names: string[]) {
  const fams = new Set([...names, "Sora", "Manrope", "Instrument Serif"]);
  try {
    await Promise.all([...fams].flatMap((f) => [document.fonts.load(font(800, 48, f)), document.fonts.load(font(400, 48, f, true)), document.fonts.load(font(700, 48, f))]));
  } catch {
    // sem a fonte, o navegador usa a substituta
  }
}
