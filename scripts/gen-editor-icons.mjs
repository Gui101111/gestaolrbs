/**
 * Gera lib/browser-editor/icons-data.ts com os traços de alguns ícones do
 * Lucide (licença ISC) para o editor desenhar no canvas.
 * Uso: node scripts/gen-editor-icons.mjs
 */
import fs from "node:fs";
import path from "node:path";

const NAMES = [
  "plane", "plane-takeoff", "luggage", "clock", "timer", "calendar-days", "hourglass", "banknote", "wallet", "piggy-bank",
  "hand-coins", "coins", "percent", "scale", "gavel", "landmark", "scroll-text", "file-text", "file-check", "file-pen-line",
  "briefcase", "building", "house", "key-round", "users", "baby", "heart", "heart-pulse", "stethoscope", "shield-check",
  "shield-alert", "triangle-alert", "circle-check", "circle-x", "smartphone", "credit-card", "shopping-cart", "shopping-bag", "car", "receipt",
  "message-circle", "phone", "mail", "globe", "map-pin", "search", "lightbulb", "sparkles", "arrow-right", "trending-up",
  "trending-down", "ban", "lock", "user", "user-check", "handshake", "book-open", "graduation-cap", "zap", "star",
  "thumbs-up", "megaphone", "bell", "calculator", "package", "truck", "badge-question-mark", "badge-check", "hand-heart", "siren",
  "qr-code", "bus", "hospital", "pill", "accessibility", "tractor", "store", "laptop", "camera",
];

const dir = "node_modules/lucide-react/dist/esm/icons";
const out = {};
const missing = [];
for (const n of NAMES) {
  const f = path.join(dir, `${n}.mjs`);
  if (!fs.existsSync(f)) {
    missing.push(n);
    continue;
  }
  const mod = await import(path.resolve(f));
  const node = mod.__iconData?.node;
  if (!node) {
    missing.push(n);
    continue;
  }
  out[n] = node.map(([tag, attrs]) => {
    const { key: _key, ...rest } = attrs;
    return [tag, rest];
  });
}
if (missing.length) console.warn("faltando:", missing.join(", "));
const body = `/* Gerado por scripts/gen-editor-icons.mjs a partir do Lucide (ISC, https://lucide.dev). Não edite à mão. */
export type IconNode = [string, Record<string, string | number>][];
export const ICONS = ${JSON.stringify(out)} as const satisfies Record<string, IconNode>;
export type IconName = keyof typeof ICONS;
`;
fs.writeFileSync("lib/browser-editor/icons-data.ts", body);
console.log(Object.keys(out).length, "ícones");
