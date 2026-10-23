import type { CaptionSettings, EditPlan, Pace, ProjectSettings, VinhetaSettings, Word } from '../types';
import { captionLimits, type CaptionPage, type CaptionWord } from './captions';
import { INTRO_DURATION, OUTRO_DURATION } from './vinheta';

export interface Segment {
  srcStart: number;
  srcEnd: number;
  outStart: number;
  /** Zoom base do trecho (alterna a cada corte para disfarçar o "pulo"). */
  zoom: number;
}

export interface Timeline {
  intro: number;
  outro: number;
  content: number;
  total: number;
  segments: Segment[];
  pages: CaptionPage[];
  zooms: { start: number; end: number }[];
  hook: { text: string; start: number; end: number } | null;
  removedSeconds: number;
  cuts: number;
}

export const PACE_SILENCE: Record<Pace, { minSilence: number; padding: number }> = {
  suave: { minSilence: 0.9, padding: 0.22 },
  equilibrado: { minSilence: 0.5, padding: 0.12 },
  acelerado: { minSilence: 0.3, padding: 0.06 },
};

/** Aplica por cima das opções os ajustes que a IA fez a pedido do usuário. */
export function effectiveSettings(settings: ProjectSettings, plan: EditPlan | null): { captions: CaptionSettings; vinheta: VinhetaSettings } {
  const o = plan?.overrides;
  const pick = <T,>(value: T | null | undefined, fallback: T) => (value === null || value === undefined ? fallback : value);
  return {
    captions: {
      enabled: pick(o?.captionsEnabled, settings.captions.enabled),
      style: pick(o?.captionStyle, settings.captions.style),
      position: pick(o?.position, settings.captions.position),
      size: pick(o?.size, settings.captions.size),
      color: pick(o?.color, settings.captions.color),
      uppercase: pick(o?.uppercase, settings.captions.uppercase),
    },
    vinheta: {
      ...settings.vinheta,
      title: pick(o?.introTitle, settings.vinheta.title),
      subtitle: pick(o?.introSubtitle, settings.vinheta.subtitle),
      outroTitle: pick(o?.outroTitle, settings.vinheta.outroTitle),
      outroSubtitle: pick(o?.outroSubtitle, settings.vinheta.outroSubtitle),
    },
  };
}

function subtract(keep: [number, number][], cut: [number, number]): [number, number][] {
  const out: [number, number][] = [];
  for (const [a, b] of keep) {
    if (cut[1] <= a || cut[0] >= b) out.push([a, b]);
    else {
      if (cut[0] > a) out.push([a, cut[0]]);
      if (cut[1] < b) out.push([cut[1], b]);
    }
  }
  return out;
}

interface BuildArgs {
  duration: number;
  voice: [number, number][] | null;
  words: Word[];
  plan: EditPlan;
  settings: ProjectSettings;
  captions: CaptionSettings;
  intro: boolean;
  outro: boolean;
}

export function buildTimeline({ duration, voice, words, plan, settings, captions, intro, outro }: BuildArgs): Timeline {
  const introDur = intro ? INTRO_DURATION : 0;
  const outroDur = outro ? OUTRO_DURATION : 0;

  let keep: [number, number][] = settings.ai.removeSilences && voice?.length ? voice.map(([a, b]) => [a, b]) : [[0, duration]];

  for (const r of plan.removeRanges) {
    const a = words[r.from];
    const b = words[r.to];
    if (!a || !b) continue;
    const prev = words[r.from - 1];
    const next = words[r.to + 1];
    const cutStart = prev ? Math.max(prev.end, a.start - 0.08) : 0;
    const cutEnd = next ? Math.min(next.start, b.end + 0.08) : duration;
    if (cutEnd > cutStart) keep = subtract(keep, [cutStart, cutEnd]);
  }

  keep = keep
    .filter(([a, b]) => b - a >= 0.12)
    .reduce<[number, number][]>((acc, seg) => {
      const last = acc[acc.length - 1];
      if (last && seg[0] - last[1] < 0.06) last[1] = seg[1];
      else acc.push([...seg]);
      return acc;
    }, []);
  if (keep.length === 0) keep = [[0, duration]];

  const zoomCuts = settings.ai.zooms;
  const segments: Segment[] = [];
  let cursor = introDur;
  let cuts = 0;
  let alt = false;
  keep.forEach(([a, b], k) => {
    const prev = keep[k - 1];
    const realCut = prev ? a - prev[1] > 0.25 : false;
    if (prev && a - prev[1] > 0.05) cuts++;
    if (realCut && zoomCuts) alt = !alt;
    segments.push({ srcStart: a, srcEnd: b, outStart: cursor, zoom: alt ? 1.07 : 1 });
    cursor += b - a;
  });
  if (keep[0][0] > 0.3) cuts++;
  const content = cursor - introDur;

  const segmentOf = (time: number) => segments.find((s) => time >= s.srcStart && time < s.srcEnd);
  const toOut = (seg: Segment, time: number) => seg.outStart + Math.min(Math.max(time, seg.srcStart), seg.srcEnd) - seg.srcStart;

  const corrections = new Map(plan.corrections.map((c) => [c.index, c.text]));
  const highlights = new Set(plan.highlights);
  const mapped: (CaptionWord & { i: number })[] = [];
  for (const w of words) {
    const seg = segmentOf((w.start + w.end) / 2);
    if (!seg) continue;
    const start = toOut(seg, w.start);
    const end = Math.max(start + 0.05, toOut(seg, w.end));
    mapped.push({ i: w.i, text: corrections.get(w.i) ?? w.text, start, end, highlight: highlights.has(w.i) });
  }

  const pages: CaptionPage[] = [];
  if (captions.enabled && mapped.length) {
    const { maxWords, maxChars } = captionLimits(captions.style);
    let page: CaptionWord[] = [];
    let chars = 0;
    const flush = () => {
      if (page.length) pages.push({ start: page[0].start, end: page[page.length - 1].end + 0.35, words: page });
      page = [];
      chars = 0;
    };
    for (const w of mapped) {
      const last = page[page.length - 1];
      if (
        last &&
        (page.length >= maxWords ||
          chars + w.text.length + 1 > maxChars ||
          w.start - last.end > 0.6 ||
          /[.!?…]["”']?$/.test(last.text) ||
          (/[,;:]$/.test(last.text) && page.length >= Math.ceil(maxWords / 2)))
      ) {
        flush();
      }
      page.push(w);
      chars += w.text.length + 1;
    }
    flush();
    const contentEnd = introDur + content;
    pages.forEach((p, k) => {
      const next = pages[k + 1];
      p.end = Math.min(p.end, next ? next.start : contentEnd, contentEnd);
      if (p.end - p.start < 0.25) p.end = Math.min(p.start + 0.25, next ? next.start : contentEnd);
    });
  }

  const zooms: { start: number; end: number }[] = [];
  for (const idx of plan.emphasis) {
    const w = mapped.find((m) => m.i === idx);
    if (!w) continue;
    const start = Math.max(introDur, w.start - 0.05);
    const last = zooms[zooms.length - 1];
    if (last && start < last.end + 0.4) continue;
    zooms.push({ start, end: Math.min(start + 1.9, introDur + content) });
  }

  const hook = plan.hookTitle ? { text: plan.hookTitle, start: introDur, end: introDur + Math.min(3.4, content) } : null;

  return {
    intro: introDur,
    outro: outroDur,
    content,
    total: introDur + content + outroDur,
    segments,
    pages,
    zooms,
    hook,
    removedSeconds: Math.max(0, duration - content),
    cuts,
  };
}

const smooth = (x: number) => {
  const p = Math.max(0, Math.min(1, x));
  return p * p * (3 - 2 * p);
};

/** Fator de zoom no instante `t` (tempo de saída), somando o zoom base e o de ênfase. */
export function zoomAt(timeline: Timeline, segment: Segment, t: number) {
  let emphasis = 0;
  for (const z of timeline.zooms) {
    if (t < z.start || t > z.end) continue;
    emphasis = Math.min(smooth((t - z.start) / 0.32), smooth((z.end - t) / 0.45));
    break;
  }
  return segment.zoom * (1 + 0.12 * emphasis);
}
