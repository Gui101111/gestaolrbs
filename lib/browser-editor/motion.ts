/**
 * Plano de grafismos da edição: em que instante entra cada elemento
 * (palavra-chave com ícone, número em destaque, cartão em tela cheia),
 * as transições entre os cortes e os efeitos sonoros de cada um.
 * Tempos do corpo do vídeo (saída, sem a vinheta), salvo os efeitos
 * sonoros, que já vêm no tempo total do arquivo.
 */
import { iconFor, isIcon, type IconName } from "@/lib/browser-editor/icons";
import type { Look, TransitionKind } from "@/lib/browser-editor/looks";
import type { Cue, Sfx } from "@/lib/browser-editor/sound";
import { norm } from "@/lib/browser-editor/timeline";
import type { EditOptions, Interval, Moment, Word } from "@/lib/browser-editor/types";

export type Beat =
  | { kind: "callout"; at: number; dur: number; text: string; icon: IconName }
  | { kind: "stat"; at: number; dur: number; value: string; label: string; icon: IconName }
  | { kind: "card"; at: number; dur: number; title: string; sub: string; icon: IconName };

export interface MotionPlan {
  beats: Beat[];
  transitions: { at: number; kind: TransitionKind }[];
  /** Instantes de ênfase (zoom de impacto). */
  punches: number[];
  cues: Cue[];
}

export interface PlannedMoment extends Omit<Moment, "segmentId" | "word"> {
  /** Tempo do corpo (saída). */
  at: number;
}

const STOP = new Set(["de", "da", "do", "das", "dos", "a", "o", "as", "os", "e", "em", "no", "na", "nos", "nas", "que", "um", "uma", "para", "por", "com", "se", "ao", "à", "é", "foi", "seu", "sua", "você", "vc", "pra"]);

const NUMBER_WORDS: Record<string, number> = {
  um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10,
  onze: 11, doze: 12, quinze: 15, vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60, noventa: 90, cem: 100, cento: 100,
};
const UNITS: [RegExp, IconName, string][] = [
  [/^(reais|real)$/, "banknote", "R$"],
  [/^(anos?|meses|mes|dias?|horas?|semanas?)$/, "clock", ""],
  [/^(%|porcento|cento)$/, "percent", "%"],
  [/^(vezes)$/, "trending-up", ""],
  [/^(salarios?|minimos?)$/, "banknote", ""],
];

const cap = (s: string) => (s ? s.charAt(0).toLocaleUpperCase("pt-BR") + s.slice(1) : s);
const clean = (w: string) => w.replace(/^[“"'(]+|[”"').,;:!?…]+$/g, "");

/** Números falados ("R$ 10 mil", "5 anos", "30%") viram destaque. */
function statsFrom(words: Word[]): { at: number; value: string; icon: IconName }[] {
  const out: { at: number; value: string; icon: IconName }[] = [];
  for (let i = 0; i < words.length; i++) {
    let k = i;
    let money = false;
    let tok = clean(words[k].text);
    if (/^r\$$/i.test(tok)) {
      money = true;
      k++;
      tok = clean(words[k]?.text ?? "");
    }
    if (/^r\$/i.test(tok)) {
      money = true;
      tok = tok.slice(2);
    }
    const pct = tok.endsWith("%");
    const digits = tok.replace(/%$/, "").replace(/\.(?=\d{3}\b)/g, "");
    const num = /^\d+(,\d+)?$/.test(digits) ? parseFloat(digits.replace(",", ".")) : NUMBER_WORDS[norm(tok)];
    if (num === undefined || !Number.isFinite(num) || (num === 1 && !money)) continue;
    let value = /^\d/.test(digits) ? digits : String(num);
    let j = k + 1;
    const next = norm(clean(words[j]?.text ?? ""));
    if (next === "mil" || next === "milhoes" || next === "milhao") {
      value += next === "mil" ? " mil" : next === "milhao" ? " milhão" : " milhões";
      j++;
    }
    let icon: IconName | null = money ? "banknote" : pct ? "percent" : null;
    if (pct) value += "%";
    if (!money && !pct) {
      let unit = norm(clean(words[j]?.text ?? ""));
      if (unit === "por" && norm(clean(words[j + 1]?.text ?? "")) === "cento") {
        j++;
        unit = "%";
      }
      for (const [re, ic, sym] of UNITS) {
        if (!re.test(unit)) continue;
        icon = ic;
        if (sym === "R$") money = true;
        else if (sym === "%") value += "%";
        else value += ` ${clean(words[j].text)}`;
        j++;
        break;
      }
    }
    if (money) value = `R$ ${value}`;
    if (!icon) continue;
    out.push({ at: words[i].start, value: value.toLocaleUpperCase("pt-BR"), icon });
    i = j - 1;
  }
  return out;
}

/** Expressão curta a partir da palavra que casou com um ícone (até 3 palavras). */
function phraseAt(words: Word[], i: number) {
  const parts: string[] = [];
  for (let k = i; k < Math.min(words.length, i + 3); k++) {
    const w = clean(words[k].text);
    if (!w) break;
    if (k > i && STOP.has(norm(w)) && k === i + 2) break;
    parts.push(w);
    if (/[.,;:!?…]$/.test(words[k].text)) break;
  }
  while (parts.length > 1 && STOP.has(norm(parts[parts.length - 1]))) parts.pop();
  return cap(parts.join(" "));
}

/** Sem IA: palavras com ícone conhecido e números viram grafismos. */
export function localMoments(words: Word[]): PlannedMoment[] {
  const out: PlannedMoment[] = [];
  for (const s of statsFrom(words)) out.push({ at: s.at, kind: "numero", text: "", icon: s.icon, value: s.value });
  for (let i = 0; i < words.length; i++) {
    const w = norm(clean(words[i].text));
    if (w.length < 3 || STOP.has(w)) continue;
    const icon = iconFor(`${words[i].text} ${words[i + 1]?.text ?? ""}`);
    if (!icon || icon === "circle-check" || icon === "lightbulb") continue;
    const text = phraseAt(words, i);
    if (text.length < 4) continue;
    out.push({ at: words[i].start, kind: "icone", text, icon });
    i += 2;
  }
  return out.sort((a, b) => a.at - b.at);
}

const BEAT_DUR = { callout: 1.9, stat: 2.2, card: 2.1 } as const;

const TRANSITION_SFX: Partial<Record<TransitionKind, Sfx>> = { whip: "swish", flash: "hit", zoom: "swish", dip: "whoosh" };

/**
 * Escolhe os grafismos sem amontoar: espaçamento pelo estilo e pela duração
 * do vídeo (vídeo curto ganha mais, vídeo longo, menos por minuto).
 */
export function planMotion(p: {
  words: Word[];
  moments: PlannedMoment[];
  keep: Interval[];
  bodyDur: number;
  introDur: number;
  outroDur: number;
  look: Look;
  opts: EditOptions;
  hasTitle: boolean;
  ctaInBody: boolean;
}): MotionPlan {
  const { look, opts, bodyDur } = p;
  const m = look.motion;
  const beats: Beat[] = [];
  const transitions: MotionPlan["transitions"] = [];
  const cues: Cue[] = [];
  const at = (t: number) => p.introDur + t;

  const lengthFactor = bodyDur < 30 ? 0.8 : bodyDur < 90 ? 1 : bodyDur < 240 ? 1.25 : 1.5;
  const gap = m.spacing * lengthFactor;
  const startAfter = p.hasTitle ? 3.3 : 1.2;
  const endBefore = bodyDur - (p.ctaInBody ? 3.8 : 1.2);

  if (opts.effects) {
    // cartões e números primeiro; destaques com ícone preenchem o resto
    const rank = { cartao: 0, numero: 1, icone: 2 } as const;
    const ordered = [...p.moments].sort((a, b) => rank[a.kind] - rank[b.kind] || a.at - b.at);
    const usedText = new Set<string>();
    const usedIcon: { icon: string; at: number }[] = [];
    for (const mo of ordered) {
      const d = mo.kind === "cartao" ? BEAT_DUR.card : mo.kind === "numero" ? BEAT_DUR.stat : BEAT_DUR.callout;
      if (mo.at < startAfter || mo.at + d > endBefore) continue;
      if (beats.some((b) => mo.at < b.at + b.dur + 0.25 && b.at < mo.at + d + 0.25)) continue;
      if (beats.some((b) => Math.abs(b.at - mo.at) < gap)) continue;
      const icon: IconName = isIcon(mo.icon) ? mo.icon : (iconFor(`${mo.text} ${mo.value ?? ""}`) ?? "sparkles");
      const key = norm(mo.text || mo.value || "");
      if (key && usedText.has(key)) continue;
      if (mo.kind === "icone" && usedIcon.some((u) => u.icon === icon && Math.abs(u.at - mo.at) < 12)) continue;
      if (mo.kind === "cartao") {
        if (!m.cards || !mo.text || beats.some((b) => b.kind === "card" && Math.abs(b.at - mo.at) < Math.max(9, gap * 2.5))) continue;
        beats.push({ kind: "card", at: mo.at, dur: d, title: mo.text, sub: mo.value ?? "", icon });
      } else if (mo.kind === "numero" && mo.value) {
        beats.push({ kind: "stat", at: mo.at, dur: d, value: mo.value, label: mo.text, icon });
      } else if (mo.text) {
        beats.push({ kind: "callout", at: mo.at, dur: d, text: mo.text, icon });
      } else continue;
      if (key) usedText.add(key);
      usedIcon.push({ icon, at: mo.at });
    }
    beats.sort((a, b) => a.at - b.at);

    // transições nos cortes (onde saiu uma pausa ou um erro)
    if (m.transition !== "cut") {
      let acc = 0;
      let lastT = -Infinity;
      for (let i = 0; i < p.keep.length - 1; i++) {
        acc += p.keep[i].end - p.keep[i].start;
        const removed = p.keep[i + 1].start - p.keep[i].end;
        if (removed < 0.45 || acc - lastT < m.transitionGap) continue;
        if (beats.some((b) => b.kind === "card" && acc > b.at - 0.2 && acc < b.at + b.dur + 0.2)) continue;
        if (acc < 0.6 || acc > bodyDur - 0.6) continue;
        transitions.push({ at: acc, kind: m.transition });
        lastT = acc;
      }
    }
  }

  // efeitos sonoros
  if (opts.effects) {
    if (p.introDur > 0) {
      cues.push({ at: 0.32, sfx: "whoosh", gain: 0.8 }, { at: 0.55, sfx: "chime", gain: 0.6 });
    }
    if (p.hasTitle) {
      for (const s of m.titleSfx) cues.push({ at: at(0.04), sfx: s, gain: s === "impact" ? 0.9 : 0.8 });
      cues.push({ at: at(3.0), sfx: "swish", gain: 0.45 });
    }
    for (const b of beats) {
      if (b.kind === "card") cues.push({ at: at(b.at), sfx: "whoosh", gain: 0.85 }, { at: at(b.at + b.dur - 0.1), sfx: "swish", gain: 0.4 });
      else {
        cues.push({ at: at(b.at), sfx: m.beatSfx, gain: 0.75 });
        if (m.beatSfx === "pop" && look.motion.callout === "sticker") cues.push({ at: at(b.at + 0.05), sfx: "sparkle", gain: 0.4 });
        if (b.kind === "stat") for (let k = 1; k <= 6; k++) cues.push({ at: at(b.at + 0.12 + k * 0.09), sfx: "tick", gain: 0.35 });
      }
    }
    for (const tr of transitions) {
      const s = TRANSITION_SFX[tr.kind];
      if (s) cues.push({ at: at(tr.at), sfx: s, gain: tr.kind === "dip" ? 0.35 : 0.6 });
    }
    if (p.ctaInBody) cues.push({ at: at(bodyDur - 3.4), sfx: "ding", gain: 0.6 });
    if (p.outroDur > 0) {
      if (m.riser) cues.push({ at: at(bodyDur), sfx: "riser", gain: 0.45 });
      cues.push({ at: at(bodyDur) + 0.05, sfx: "whoosh", gain: 0.7 }, { at: at(bodyDur) + 0.7, sfx: "chime", gain: 0.5 });
    }
  }

  const punches = look.zoom === "punch" ? beats.filter((b) => b.kind !== "card").map((b) => b.at) : [];
  return { beats, transitions, punches, cues: cues.sort((a, b) => a.at - b.at) };
}

/** Momentos da IA (trecho + palavra) → tempo do corpo. */
export function placeMoments(moments: Moment[], words: Word[], segments: { id: number; start: number; end: number }[], toOut: (t: number) => number | null): PlannedMoment[] {
  const out: PlannedMoment[] = [];
  for (const mo of moments) {
    const seg = segments.find((s) => s.id === mo.segmentId);
    let t: number | null = null;
    const first = norm(clean(mo.word.split(/\s+/)[0] ?? ""));
    if (first) {
      const inSeg = seg ? words.filter((w) => w.start >= seg.start - 0.05 && w.start < seg.end + 0.05) : words;
      const hit = inSeg.find((w) => norm(clean(w.text)) === first);
      if (hit) t = hit.start;
    }
    if (t === null && seg) t = seg.start + 0.25;
    if (t === null) continue;
    const o = toOut(t);
    if (o === null) continue;
    out.push({ kind: mo.kind, text: mo.text, icon: mo.icon, value: mo.value, at: o });
  }
  return out.sort((a, b) => a.at - b.at);
}
