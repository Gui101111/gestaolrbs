/**
 * Vícios de fala cortados sem IA, a partir do tempo de cada palavra:
 * "ééé", "ãh", "hum", "né" solto, palavra repetida ("eu eu") e frase
 * recomeçada ("eu vou… eu vou explicar"), além de hesitações longas entre
 * duas palavras (som sem texto no meio). Tempo da fonte.
 */
import { bare } from "@/lib/browser-editor/glossary";
import type { Interval, Segment, TimedWord } from "@/lib/browser-editor/types";

const FILLER = /^(e{2,}|ee+h*|a+h+|ah+n*|ã+h*|aa+|hu+m+|hm+|uh+m*|eh+|ehn|uhn|mm+|hum+)$/;
/** "né" de muleta no meio ou no fim da frase. */
const NE = /^ne$/;
/** Entre duas palavras, silêncio ou som sem texto acima disto vira corte. */
const GAP = 0.6;
const PAD = 0.06;

function cut(list: Interval[], start: number, end: number) {
  if (end - start >= 0.08) list.push({ start, end });
}

export function localMistakes(segments: Segment[]): Interval[] {
  const words: (TimedWord & { seg: number })[] = segments.flatMap((s) => (s.words ?? []).map((w) => ({ ...w, seg: s.id })));
  const out: Interval[] = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const b = bare(w.text);
    const next = words[i + 1];
    const prev = words[i - 1];
    // muleta isolada
    if (FILLER.test(b) || (NE.test(b) && (/[,?.]$/.test(w.text) || !next || next.seg !== w.seg))) {
      cut(out, prev ? Math.max(prev.end, w.start - 0.02) : w.start, next && next.seg === w.seg ? Math.min(next.start, w.end + 0.02) : w.end);
      continue;
    }
    if (!next || next.seg !== w.seg) continue;
    // palavra repetida em seguida: fica só a segunda
    if (b && b === bare(next.text) && !/^\d+$/.test(b) && next.start - w.end < 1.2) {
      cut(out, w.start, next.start);
      continue;
    }
    // frase recomeçada: as mesmas 2 a 4 palavras de novo logo depois
    for (let n = 4; n >= 2; n--) {
      if (i + 2 * n > words.length) continue;
      const a = words.slice(i, i + n);
      const r = words.slice(i + n, i + 2 * n);
      if (a.some((x) => x.seg !== w.seg) || r.some((x) => x.seg !== w.seg && x.seg !== w.seg + 1)) continue;
      if (a.every((x, k) => bare(x.text) === bare(r[k].text)) && r[0].start - a[n - 1].end < 1.5) {
        cut(out, a[0].start, r[0].start);
        i += n - 1;
        break;
      }
    }
    // hesitação longa entre duas palavras da mesma frase
    if (next.start - w.end > GAP) cut(out, w.end + PAD, next.start - PAD);
  }
  return out;
}
