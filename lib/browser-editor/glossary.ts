/**
 * Termos do Direito que o reconhecimento de fala costuma errar ("INSS" vira
 * "eense e se", "auxílio-doença" vira "ouciou do ENSA"...). Corrige na saída
 * do Whisper, sem IA, juntando as palavras quebradas e mantendo o tempo.
 */
import type { Segment, TimedWord } from "@/lib/browser-editor/types";

/** Contexto dado ao Whisper antes de ouvir cada trecho (melhora a grafia dos termos). */
export const VOCABULARY =
  "Vídeo de advogado sobre direito previdenciário e trabalhista: INSS, auxílio-doença, auxílio-acidente, BPC/LOAS, aposentadoria, salário-maternidade, perícia médica.";

/** Minúsculas, sem acento e sem pontuação. */
export function bare(w: string) {
  return w
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

const tail = (w: string) => /[.,;:!?…]+$/.exec(w)?.[0] ?? "";

type Rule = { seq: RegExp[]; out: string; when?: (prev: string) => boolean };

const AUX = /^(auxilio|auxilios|auxiliu|auxiliou|auxilo|ouxilio|oxilio|ausilio|aussilio|ousilio|oussilio|ocilio|oucilio|ouciliu|ouciou|aucilio|auxilho|ouxilho)$/;
const DE = /^(de|do|da)$/;
const MASC = (p: string) => /^(o|do|no|pelo|ao|ou|e|com|contra|seu|meu|nosso)$/.test(p);

const RULES: Rule[] = [
  // INSS falado letra por letra ou colado de outro jeito
  { seq: [/^(i|e|y|ie|ii)$/, /^(ene|eni|en|n|ne|enne)$/, /^(esse|ess|s|ese|eci|esi)$/, /^(esse|ess|s|ese|eci|esi)$/], out: "INSS" },
  { seq: [/^(ine|ini|ien|inne|iene)$/, /^(esse|ess|s|ese)$/, /^(esse|ess|s|ese)$/], out: "INSS" },
  { seq: [/^(in|en)$/, /^(esse|ess|ss|s)$/, /^(esse|ess|s)$/], out: "INSS" },
  { seq: [/^(in|en)$/, /^(ss|esses|essess)$/], out: "INSS" },
  { seq: [/^(inss|innss|insss|inssi|inps|imss|inless|inlesse|inesse|ienesse|ieness|ienes|eense|einesse|ineses|inis|ins|inns|inse|enes|enss|ienss)$/], out: "INSS" },
  { seq: [/^(ines|enes|ines)$/], out: "INSS", when: MASC },
  // auxílios
  { seq: [AUX, DE, /^(doenca|doensa|doenssa|duenca|doenca)$/], out: "auxílio-doença" },
  { seq: [AUX, /^(doenca|doensa|doenssa|duenca|enca|ensa)$/], out: "auxílio-doença" },
  { seq: [AUX, DE, /^(acidente|acidentes|asidente|asidentes|acidenti|acidenchi)$/], out: "auxílio-acidente" },
  { seq: [AUX, /^(acidente|acidentes|asidente|asidentes|acidenti|acidenchi)$/], out: "auxílio-acidente" },
  { seq: [AUX, /^(reclusao|reclusoes|reclusa)$/], out: "auxílio-reclusão" },
  { seq: [/^(salario|salarios)$/, /^(maternidade|maternidad|maternidades)$/], out: "salário-maternidade" },
  { seq: [/^(salario|salarios)$/, /^(familia)$/], out: "salário-família" },
  // siglas
  { seq: [/^(bpc|bepece)$/, /^(loas|loaz|loass)$/], out: "BPC/LOAS" },
  { seq: [/^(be|bê|b)$/, /^(pe|pê|p)$/, /^(ce|cê|c|se)$/, /^(loas|loaz|loass)$/], out: "BPC/LOAS" },
  { seq: [/^(be|bê|b)$/, /^(pe|pê|p)$/, /^(ce|cê|c|se)$/], out: "BPC" },
  { seq: [/^(bpc|bepece|bepeces|bepecê|bpcs)$/], out: "BPC" },
  { seq: [/^(loas|loaz|loass)$/], out: "LOAS" },
  { seq: [/^(cnis|cenis|cenise|cnisi)$/], out: "CNIS" },
  { seq: [/^(fgts|fgtes|efegetes)$/], out: "FGTS" },
  { seq: [/^(efe|f)$/, /^(ge|gê|g)$/, /^(te|tê|t)$/, /^(esse|s)$/], out: "FGTS" },
  { seq: [/^(clt|celete|ceelete)$/], out: "CLT" },
  { seq: [/^(oab|oabe)$/], out: "OAB" },
  { seq: [/^(stf)$/], out: "STF" },
  { seq: [/^(stj)$/], out: "STJ" },
  { seq: [/^(rpv)$/], out: "RPV" },
  { seq: [/^(pis|pisi)$/, /^(pasep)$/], out: "PIS/Pasep" },
];

/** Corrige os termos numa lista de palavras (com ou sem tempo). */
export function fixTerms<T extends { text: string; start?: number; end?: number }>(words: T[]): T[] {
  const out: T[] = [];
  for (let i = 0; i < words.length; ) {
    let hit: { n: number; text: string } | null = null;
    for (const r of RULES) {
      if (i + r.seq.length > words.length) continue;
      if (!r.seq.every((re, k) => re.test(bare(words[i + k].text)))) continue;
      if (r.when && !r.when(bare(out[out.length - 1]?.text ?? ""))) continue;
      hit = { n: r.seq.length, text: r.out };
      break;
    }
    if (!hit) {
      out.push(words[i]);
      i++;
      continue;
    }
    const first = words[i];
    const last = words[i + hit.n - 1];
    // mantém maiúscula no começo de frase só para termos que não são siglas
    const lead = /^[A-ZÀ-Ý]/.test(first.text) && hit.text === hit.text.toLowerCase() ? hit.text.charAt(0).toUpperCase() + hit.text.slice(1) : hit.text;
    out.push({ ...first, text: lead + tail(last.text), end: last.end ?? first.end });
    i += hit.n;
  }
  return out;
}

/** "o que é o que é o que é…" (alucinação em laço do Whisper) vira uma vez só. */
export function collapseLoops<T extends { text: string; end?: number }>(words: T[]): T[] {
  const out = [...words];
  for (let n = 1; n <= 6; n++) {
    for (let i = 0; i + 2 * n <= out.length; ) {
      let reps = 1;
      const same = (a: number, b: number) => out.slice(a, a + n).every((w, k) => bare(w.text) === bare(out[b + k]?.text ?? ""));
      while (i + (reps + 1) * n <= out.length && same(i, i + reps * n)) reps++;
      // palavra repetida 2x é vício (corta depois); 3x ou mais em sequência é laço
      if (reps >= 3) {
        const kept = out.slice(i, i + n);
        const lastW = out[i + reps * n - 1];
        kept[n - 1] = { ...kept[n - 1], end: lastW.end ?? kept[n - 1].end };
        out.splice(i, reps * n, ...kept);
      }
      i++;
    }
  }
  return out;
}

/**
 * Texto novo (corrigido pela IA ou pela pessoa) sobre as palavras antigas:
 * mesma contagem mantém o tempo de cada uma; senão, redistribui no mesmo
 * intervalo, proporcional ao tamanho das palavras.
 */
export function realign(words: TimedWord[], text: string): TimedWord[] {
  const tokens = text.split(/\s+/).filter(Boolean);
  if (!words.length || !tokens.length) return [];
  if (tokens.length === words.length) return words.map((w, i) => ({ ...w, text: tokens[i] }));
  const start = words[0].start;
  const end = words[words.length - 1].end;
  const weight = (t: string) => t.replace(/[^\p{L}\p{N}]/gu, "").length + 1.5;
  const total = tokens.reduce((s, t) => s + weight(t), 0);
  let acc = 0;
  return tokens.map((t) => {
    const s = start + ((end - start) * acc) / total;
    acc += weight(t);
    return { text: t, start: s, end: start + ((end - start) * acc) / total };
  });
}

/** Mesmo trecho com outro texto (palavras com tempo acompanham). */
export function withText(seg: Segment, text: string): Segment {
  if (text === seg.text) return seg;
  return seg.words?.length ? { ...seg, text, words: realign(seg.words, text) } : { ...seg, text };
}

/** Correção dos termos e dos laços em todos os trechos. */
export function fixSegments(segments: Segment[]): Segment[] {
  return segments
    .map((s) => {
      if (s.words?.length) {
        const words = fixTerms(collapseLoops(s.words));
        return { ...s, words, text: words.map((w) => w.text).join(" ") };
      }
      const words = fixTerms(collapseLoops(s.text.split(/\s+/).filter(Boolean).map((text) => ({ text }))));
      return { ...s, text: words.map((w) => w.text).join(" ") };
    })
    .filter((s) => s.text.trim().length > 0);
}
