import { cuttableSilences } from "@/lib/browser-editor/audio";
import type { Analysis, EditOptions, Interval, Plan, Segment, Word } from "@/lib/browser-editor/types";
import type { Look } from "@/lib/browser-editor/looks";

const MIN_KEEP = 0.25;

function union(list: Interval[]): Interval[] {
  const sorted = [...list].filter((i) => i.end > i.start).sort((a, b) => a.start - b.start);
  const out: Interval[] = [];
  for (const i of sorted) {
    const last = out[out.length - 1];
    if (last && i.start <= last.end + 0.06) last.end = Math.max(last.end, i.end);
    else out.push({ ...i });
  }
  return out;
}

/** Aproxima a borda de um corte da borda de fala mais próxima (até 0,4 s). */
function snap(t: number, edges: number[]) {
  let best = t;
  let dist = 0.4;
  for (const e of edges) {
    const d = Math.abs(e - t);
    if (d < dist) {
      dist = d;
      best = e;
    }
  }
  return best;
}

/** Decide o que fica: pausas longas e trechos com erro de gravação saem. */
export function buildPlan(a: Analysis, opts: EditOptions, look: Look): Plan {
  const cuts: Interval[] = [];
  let cutsPauses = 0;
  if (opts.cutPauses && a.speech.length) {
    const sil = cuttableSilences(a.speech, a.duration, look.minPause, look.pad);
    cutsPauses = sil.filter((s) => s.start > 0.01 && s.end < a.duration - 0.01).length;
    cuts.push(...sil);
  }
  let cutsMistakes = 0;
  if (opts.removeMistakes && a.review?.cutIds.length) {
    const starts = a.speech.map((s) => s.start);
    const ends = a.speech.map((s) => s.end);
    for (const id of a.review.cutIds) {
      const seg = a.segments.find((s) => s.id === id);
      if (!seg) continue;
      cuts.push({ start: snap(seg.start, starts), end: snap(seg.end, ends) });
      cutsMistakes++;
    }
  }
  const removed = union(cuts);
  let keep: Interval[] = [];
  let t = 0;
  for (const c of removed) {
    if (c.start > t) keep.push({ start: t, end: c.start });
    t = Math.max(t, c.end);
  }
  if (t < a.duration) keep.push({ start: t, end: a.duration });
  keep = keep.filter((k) => k.end - k.start >= MIN_KEEP);
  if (!keep.length) keep = [{ start: 0, end: a.duration }];
  const bodyDuration = keep.reduce((s, k) => s + (k.end - k.start), 0);
  return { keep, bodyDuration, cutsPauses, cutsMistakes, saved: Math.max(0, a.duration - bodyDuration) };
}

/** Tempo da fonte → tempo de saída (null se o instante foi cortado). */
export function toOut(keep: Interval[], t: number): number | null {
  let acc = 0;
  for (const k of keep) {
    if (t < k.start) return null;
    if (t <= k.end) return acc + (t - k.start);
    acc += k.end - k.start;
  }
  return null;
}

/** Tempo de saída → índice do trecho e tempo da fonte. */
export function toSource(keep: Interval[], out: number): { index: number; t: number } {
  let acc = 0;
  for (let i = 0; i < keep.length; i++) {
    const len = keep[i].end - keep[i].start;
    if (out <= acc + len) return { index: i, t: keep[i].start + (out - acc) };
    acc += len;
  }
  const last = keep.length - 1;
  return { index: last, t: keep[last]?.end ?? 0 };
}

const weight = (w: string) => w.replace(/[^\p{L}\p{N}]/gu, "").length + 1.5;

/**
 * Espalha as palavras de um trecho pela fala detectada dentro dele,
 * proporcional ao tamanho de cada palavra (pula as pausas).
 */
function distribute(text: string, start: number, end: number, speech: Interval[]): Word[] {
  const tokens = text.split(/\s+/).filter(Boolean);
  if (!tokens.length || end <= start) return [];
  let subs = speech
    .filter((r) => r.end > start && r.start < end)
    .map((r) => ({ start: Math.max(r.start, start), end: Math.min(r.end, end) }))
    .filter((r) => r.end - r.start > 0.05);
  if (!subs.length) subs = [{ start, end }];
  const total = subs.reduce((s, r) => s + (r.end - r.start), 0);
  const weights = tokens.map(weight);
  const sum = weights.reduce((s, w) => s + w, 0);
  const at = (p: number) => {
    let rest = p;
    for (const r of subs) {
      const len = r.end - r.start;
      if (rest <= len) return r.start + rest;
      rest -= len;
    }
    return subs[subs.length - 1].end;
  };
  let acc = 0;
  return tokens.map((tok, i) => {
    const s = at((acc / sum) * total);
    acc += weights[i];
    return { text: tok, start: s, end: Math.max(s + 0.05, at((acc / sum) * total)) };
  });
}

/** Palavras com tempo (da fonte) a partir dos trechos da transcrição. */
export function wordsFromSegments(segments: Segment[], speech: Interval[]): Word[] {
  return segments.flatMap((s) => distribute(s.text, s.start, s.end, speech));
}

/**
 * Sem transcrição automática: o roteiro colado vira trechos (uma frase por
 * trecho) espalhados pela fala detectada no vídeo todo.
 */
export function segmentsFromScript(script: string, speech: Interval[], duration: number): Segment[] {
  const sentences = script
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (!sentences.length) return [];
  const regions = speech.length ? speech : [{ start: 0, end: duration }];
  const total = regions.reduce((s, r) => s + (r.end - r.start), 0);
  const weights = sentences.map((s) => s.split(" ").reduce((a, w) => a + weight(w), 0));
  const sum = weights.reduce((a, b) => a + b, 0);
  const at = (p: number) => {
    let rest = p;
    for (const r of regions) {
      const len = r.end - r.start;
      if (rest <= len) return r.start + rest;
      rest -= len;
    }
    return regions[regions.length - 1].end;
  };
  let acc = 0;
  return sentences.map((text, id) => {
    const start = at((acc / sum) * total);
    acc += weights[id];
    return { id, text, start, end: at((acc / sum) * total) };
  });
}

const STOP = new Set(["de", "da", "do", "das", "dos", "a", "o", "as", "os", "e", "em", "no", "na", "nos", "nas", "que", "um", "uma", "para", "por", "com", "se", "ao", "à"]);
export const norm = (w: string) =>
  w
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}.]/gu, "")
    .replace(/\.$/, "");

/** Marca as palavras que a IA pediu para destacar. */
export function markKeywords(words: Word[], keywords: string[]): Word[] {
  const keys = new Set(keywords.flatMap((k) => k.split(/\s+/).map(norm)).filter((k) => k.length > 1 && !STOP.has(k)));
  return words.map((w) => (keys.has(norm(w.text)) ? { ...w, key: true } : w));
}

/** Palavras no tempo de saída; as que começam dentro de um corte somem. */
export function wordsToOut(words: Word[], keep: Interval[]): Word[] {
  const out: Word[] = [];
  for (const w of words) {
    const s = toOut(keep, w.start);
    if (s === null) continue;
    const e = toOut(keep, Math.min(w.end, keep.find((k) => w.start >= k.start && w.start <= k.end)?.end ?? w.end));
    out.push({ ...w, start: s, end: Math.max(s + 0.06, e ?? s + 0.2) });
  }
  return out;
}
