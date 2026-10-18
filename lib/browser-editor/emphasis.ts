/**
 * Ênfase automática na legenda: sem perguntar nada, escolhe as palavras mais
 * fortes da fala (números, valores, prazos, termos jurídicos e palavras de
 * impacto) e marca como destaque, espaçadas para não virar tudo destaque.
 */
import { norm } from "@/lib/browser-editor/timeline";
import type { Segment, Word } from "@/lib/browser-editor/types";

const LEGAL = new Set(
  (
    "direito direitos lei leis justica juiz juiza processo processar acao indenizacao indenizar indenizado dano danos moral morais " +
    "aposentadoria aposentar inss beneficio beneficios bpc loas auxilio pensao alimenticia alimentos guarda divorcio heranca inventario " +
    "testamento contrato contratos multa multas rescisao demissao demitido demitida justa causa fgts clt ferias salario salarios horas extras " +
    "trabalhista trabalhistas reembolso reembolsar consumidor procon golpe golpes pix banco bancos plano saude liminar prazo prazos recurso " +
    "sentenca stf stj crime crimes prisao policia flagrante ilegal ilegais abusivo abusiva abusivos abusivas nulo nula devolucao devolver " +
    "cancelado cancelada cancelamento voo voos bagagem atraso atrasado negou negado negada previdenciario imposto impostos divida dividas " +
    "serasa usucapiao aluguel despejo condominio empresa patrao empregador empregado gestante estabilidade acidente invalidez revisao " +
    "inventario partilha pensionista idoso idosos deficiencia cobranca juros estorno fraude clonado vazamento lgpd seguro seguradora"
  ).split(" "),
);

const STRONG = new Set(
  (
    "nunca jamais sempre nenhum nenhuma ninguem todos todas proibido proibida obrigado obrigada obrigatorio obrigatoria urgente atencao " +
    "cuidado importante errado erro verdade mentira dobro triplo agora hoje rapido gratis gratuito gratuita imediato imediatamente " +
    "milhares milhoes facil simples segredo absurdo pode deve precisa vale perder perdeu ganhar receber recuperar"
  ).split(" "),
);

const UNIT = /^(anos?|mes(es)?|dias?|horas?|semanas?|reais|real|mil|milh(ao|oes)|bilh(ao|oes)|%|por|vezes|salarios?|parcelas?)$/;
const NUMBER_WORD = /^(um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|quinze|vinte|trinta|quarenta|cinquenta|cem|cento|duzentos|quinhentos|mil|metade|dobro)$/;

function score(words: Word[], i: number): number {
  const raw = words[i].text;
  const w = norm(raw);
  if (!w || w.length < 2) return 0;
  const next = norm(words[i + 1]?.text ?? "");
  if (/\d/.test(raw) || /^r\$/i.test(raw) || /%/.test(raw)) return 6;
  if (NUMBER_WORD.test(w) && UNIT.test(next)) return 5;
  if (LEGAL.has(w)) return 3.4 + Math.min(1, w.length / 12);
  if (STRONG.has(w)) return w === "pode" || w === "deve" || w === "precisa" || w === "vale" ? 2.4 : 3;
  if (w === "nao" && next.length > 2) return 2.6;
  if (w.length >= 10) return 2.2;
  return 0;
}

/**
 * Marca as palavras de destaque (mantém as que a IA já marcou). Uma a cada
 * ~1,6 s no máximo, sempre as de maior peso de cada trecho.
 */
export function emphasize(words: Word[], density = 1): Word[] {
  if (!words.length) return words;
  const minGap = 1.6 / Math.min(2, Math.max(0.5, density));
  const out = words.map((w) => ({ ...w }));
  const ranked = out
    .map((w, i) => ({ i, s: w.key ? 10 : score(out, i) }))
    .filter((x) => x.s >= 2.2)
    .sort((a, b) => b.s - a.s || out[a.i].start - out[b.i].start);
  const picked: number[] = [];
  for (const r of ranked) {
    const t = out[r.i].start;
    if (!out[r.i].key && picked.some((j) => Math.abs(out[j].start - t) < minGap)) continue;
    picked.push(r.i);
  }
  for (const i of picked) out[i].key = true;
  // "R$ 10 mil", "5 anos": a palavra seguinte vai junto no destaque
  for (const i of picked) {
    const n = out[i + 1];
    if (n && UNIT.test(norm(n.text)) && n.start - out[i].end < 0.4) n.key = true;
  }
  return out;
}

/** Trocas pedidas pela pessoa ("troque X por Y") aplicadas a um texto. */
export function replaceIn(text: string, list: { from: string; to: string }[] | undefined): string {
  let out = text;
  for (const r of list ?? []) {
    const from = r.from.trim();
    if (!from) continue;
    const esc = from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(`(^|[^\\p{L}\\p{N}])${esc}(?=$|[^\\p{L}\\p{N}])`, "giu"), (_m, pre: string) => `${pre}${r.to.trim()}`);
  }
  return out;
}

/** As mesmas trocas no texto da fala. */
export function applyReplacements(segments: Segment[], list: { from: string; to: string }[] | undefined): Segment[] {
  if (!list?.length) return segments;
  return segments.map((s) => {
    const text = replaceIn(s.text, list);
    return text === s.text ? s : { ...s, text };
  });
}
