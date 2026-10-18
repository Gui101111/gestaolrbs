/**
 * Pedidos da pessoa (observações do Novo vídeo e "Solicitar ajuste") viram
 * mudanças reais na edição. Com a IA, Claude interpreta o texto livre; sem
 * ela, um leitor de frases comuns em português cobre os pedidos mais
 * frequentes. O que não der para atender aparece na nota, nunca em silêncio.
 */
import { reviseWithClaude, type SampleFn } from "@/lib/browser-editor/ai";
import { CAPTION_Y } from "@/lib/browser-editor/draw";
import { renderInputs } from "@/lib/browser-editor/pipeline";
import { bookends } from "@/lib/browser-editor/render";
import { toSource } from "@/lib/browser-editor/timeline";
import type { Analysis, CaptionStyle, EditOptions, Intent, Interval, StyleId } from "@/lib/browser-editor/types";

type Mood = NonNullable<EditOptions["musicMood"]>;

const COLORS: [RegExp, string, string][] = [
  [/amarel/, "#FFD400", "amarelo"],
  [/dourad|ouro/, "#E8B84A", "dourado"],
  [/laranja/, "#FF8A1F", "laranja"],
  [/vermelh/, "#FF3B30", "vermelho"],
  [/rosa|pink/, "#FF4FA3", "rosa"],
  [/roxo|lilas|violeta/, "#9B6BFF", "roxo"],
  [/azul/, "#2E9BFF", "azul"],
  [/ciano|turquesa/, "#3BE3F0", "ciano"],
  [/verde/, "#2ED47A", "verde"],
  [/branc/, "#FFFFFF", "branco"],
];

/** Minúsculas sem acento, com o mesmo tamanho do texto (os índices batem com o original). */
function fold(text: string) {
  return [...text]
    .map((c) => {
      const base = c.length === 1 ? (c.normalize("NFD")[0] ?? c) : c;
      const low = base.toLowerCase();
      return low.length === c.length ? low : c;
    })
    .join("");
}

const OFF = /\b(tira|tirar|tire|tiram|remove|remova|remover|sem|retira|retire|retirar|esconde|esconda|desliga|desligue|apaga|apague|exclui|exclua|nao (quero|coloca|coloque|precisa|bota|bote|ponha|use|usa))\b/;
const ON = /\b(coloca|colocar|coloque|adiciona|adicione|adicionar|poe|ponha|inclui|inclua|liga|ligue|bota|bote|botar|usa|use|faltou|quero|volta|volte|com)\b/;
const CUT = /\b(corta|cortar|corte|cortem|tira|tirar|tire|remove|remova|apaga|apague|exclui|exclua|retira|retire|elimina|elimine)\b/;

function parseTime(v: string): number | null {
  const t = v.trim().replace(",", ".");
  if (/^\d{1,2}:\d{2}(\.\d+)?$/.test(t)) {
    const [m, s] = t.split(":");
    return Number(m) * 60 + Number(s);
  }
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Texto depois de "para", "por" ou ":" (ou entre aspas), com a grafia original. */
function textAfter(orig: string, folded: string, re: RegExp): string | null {
  const q = orig.match(/[“"']([^”"']{2,90})[”"']/);
  if (q) return q[1].trim();
  const m = re.exec(folded);
  if (!m) return null;
  const out = orig
    .slice(m.index + m[0].length)
    .trim()
    .replace(/^[“"']|[”"'.!]+$/g, "")
    .trim();
  return out.length >= 2 ? out.slice(0, 90) : null;
}

const NOT_WORD = /^(o |a |os |as )?(titulo|chamada|cta|legenda|musica|trilha|cor|estilo|fonte|letra|vinheta|logo|video|som|efeito|abertura|final|tamanho|posicao)\b/;

/** "troque X por Y" / "onde diz X, coloque Y" (grafia original preservada). */
function swapIn(orig: string, c: string): { from: string; to: string } | null {
  const forms: [RegExp, RegExp][] = [
    [
      /\b(?:troca|troque|trocar|substitui|substitua|substituir|corrige|corrija|corrigir|muda|mude|mudar|altera|altere)\s+(?:a palavra\s+|o nome\s+|o termo\s+|onde (?:esta|diz|aparece|escreveu|ta)\s+)?/,
      /\s+(?:por|pra|para)\s+/,
    ],
    [/\bonde (?:esta|diz|aparece|fala|ta|escreveu)\s+/, /,?\s+(?:coloca|coloque|e|deveria ser|era|bota|bote|escreve|escreva|troca por|troque por)\s+/],
  ];
  for (const [head, sep] of forms) {
    const h = head.exec(c);
    if (!h) continue;
    const at = h.index + h[0].length;
    const m = sep.exec(c.slice(at));
    if (!m) continue;
    const fromF = c.slice(at, at + m.index);
    if (NOT_WORD.test(fromF)) continue;
    const strip = (v: string) => v.replace(/^[“"']+|[”"'.!]+$/g, "").trim();
    const from = strip(orig.slice(at, at + m.index));
    const to = strip(orig.slice(at + m.index + m[0].length));
    if (from && to && from.length <= 60 && to.length <= 60) return { from, to };
  }
  return null;
}

/** Leitor de pedidos comuns (sem IA). */
export function parseRequest(text: string): Intent {
  const it: Intent = { set: {}, done: [] };
  const say = (s: string) => {
    if (!it.done.includes(s)) it.done.push(s);
  };
  const origAll = text.replace(/\s+/g, " ");
  const foldAll = fold(origAll);
  // uma frase por pedido ("…, e tira a música" também separa)
  const splitter = /[.;!?]+(?=\s|$)|\n+|,\s+|\s+e\s+(?=(mais|menos|com|sem|a|o|as|os|um|uma|legenda|musica|trilha|titulo|chamada|vinheta|logo|efeitos?|tira|tire|coloca|coloque|aumenta|aumente|diminui|diminua|muda|mude|troca|troque|corta|corte|deixa|deixe|bota|bote|poe|ponha|adiciona|adicione|remove|remova|destaca|destaque|abaixa|abaixe|sobe|suba|desce|desca|faz|faca|usa|use)\b)/g;
  const parts: [string, string][] = [];
  let last = 0;
  for (const m of foldAll.matchAll(splitter)) {
    parts.push([origAll.slice(last, m.index), foldAll.slice(last, m.index)]);
    last = m.index + m[0].length;
  }
  parts.push([origAll.slice(last), foldAll.slice(last)]);

  for (const [orig, c] of parts) {
    if (!c.trim()) continue;
    const off = OFF.test(c);
    const on = ON.test(c);

    // trocas de palavra na legenda: "troque X por Y", "onde diz X coloque Y"
    const swap = swapIn(orig, c);
    if (swap) {
      (it.replace ??= []).push(swap);
      say(`“${swap.from}” trocado por “${swap.to}” na legenda`);
      continue;
    }

    // cortes por tempo: "corta do 0:10 ao 0:15", "tira de 10 a 15 segundos"
    const range = /(\d{1,2}:\d{2}|\d+(?:[.,]\d+)?)\s*(?:s|seg|segundos?)?\s*(?:ate|ao|a|e|-|–)\s*(?:o\s+)?(\d{1,2}:\d{2}|\d+(?:[.,]\d+)?)/.exec(c);
    if (range && CUT.test(c)) {
      const a = parseTime(range[1]);
      const b = parseTime(range[2]);
      if (a !== null && b !== null && b > a) {
        (it.cutsOut ??= []).push({ start: a, end: b });
        say(`trecho de ${range[1]} a ${range[2]} cortado`);
        continue;
      }
    }
    if (CUT.test(c) && /(primeir|inicio|comeco)/.test(c) && !/titulo|vinheta/.test(c)) {
      const n = /(\d+(?:[.,]\d+)?)\s*(s|seg|segundos?)?/.exec(c);
      it.trimStart = n ? Number(n[1].replace(",", ".")) : 2;
      say(`${it.trimStart} s iniciais cortados`);
      continue;
    }
    if (CUT.test(c) && /(ultim|final do video|fim do video|no final|o final|o fim)/.test(c) && !/chamada|cta|vinheta|musica|trilha/.test(c)) {
      const n = /(\d+(?:[.,]\d+)?)\s*(s|seg|segundos?)?/.exec(c);
      it.trimEnd = n ? Number(n[1].replace(",", ".")) : 2;
      say(`${it.trimEnd} s finais cortados`);
      continue;
    }
    if (/(cortou|cortaram|cortado) demais|volta(r)? (o|a|os|as) (trecho|parte)|nao (era|e) (pra|para) cortar|desfaz|desfazer|restaura/.test(c)) {
      it.restore = true;
      it.set.cutPauses = false;
      say("cortes desfeitos");
      continue;
    }
    if (/mais curto|encurta|encurte|resum|muito longo|longo demais|mais rapido|acelera|mais agil|ritmo/.test(c)) {
      it.shorter = true;
      say("ritmo mais rápido, sem pausas nem repetições");
      continue;
    }

    // efeitos sonoros (antes de "efeito" em geral)
    if (/efeitos? sonor|barulh|sonzinho|som dos efeitos|sons? de efeito|sfx/.test(c)) {
      it.set.sfx = !off;
      say(off ? "sem efeitos sonoros" : "com efeitos sonoros");
      continue;
    }

    // trilha
    if (/musica|trilha|som de fundo|fundo musical|musiquinha|batida/.test(c)) {
      if (off && !/(alta|alto|forte) demais|muito (alta|alto)/.test(c)) {
        it.set.music = false;
        say("sem trilha sonora");
        continue;
      }
      if (/(alta|alto|forte) demais|muito (alta|alto|forte)|atrapalh|abaix|diminu|mais baix|baixinh|cobrindo|encobr|abafa|nao (da|consigo) (pra |para )?(ouvir|escutar) (a voz|o que)/.test(c)) {
        it.musicVolume = "baixa";
        say("trilha mais baixa");
        continue;
      }
      if (/(baixa|baixo) demais|muito (baixa|baixo)|aumenta|aumente|mais alt|mais forte|nao (da|consigo) (pra |para )?(ouvir|escutar) a (musica|trilha)/.test(c)) {
        it.musicVolume = "alta";
        it.set.music = true;
        say("trilha mais alta");
        continue;
      }
      const mood: [RegExp, Mood, string][] = [
        [/animad|agitad|energ|empolg|pra cima|para cima|batida forte/, "energica", "animada"],
        [/alegr|feliz|divertid/, "leve", "alegre"],
        [/epic|emocion|inspirador|cinematograf|dramatic/, "inspiradora", "épica"],
        [/seri[ao]|sobri|discret|elegante|classic/, "sobria", "sóbria"],
        [/calm|tranquil|suave|leve/, "neutra", "leve"],
      ];
      const hit = mood.find(([re]) => re.test(c));
      if (hit) {
        Object.assign(it.set, { music: true, musicMood: hit[1] });
        say(`trilha ${hit[2]}`);
        continue;
      }
      if (/outra|troca|troque|trocar|muda|mude|mudar|diferente|nao gostei/.test(c)) {
        it.newMusic = true;
        it.set.music = true;
        say("trilha trocada");
        continue;
      }
      if (on) {
        it.set.music = true;
        say("com trilha sonora");
        continue;
      }
    }

    // legenda: posição, tamanho, cor, estilo
    if (/legenda|letra|texto|escrita|frase/.test(c) && !/titulo|chamada/.test(c)) {
      let hit = false;
      if (/na frente (do|da|de)|tampando|cobrindo (o|a|meu|minha)|em cima (do|da) (rosto|cara|boca)|(para|pra|pro) baixo|abaix|desce|desca|descer|embaixo|em baixo|rodape|no pe\b|parte de baixo|inferior/.test(c)) {
        it.captionPos = "baixo";
        say("legenda mais para baixo");
        hit = true;
      } else if (/(para|pra|pro) cima|\bsobe\b|suba|subir|levanta|em cima|no topo|parte de cima|superior/.test(c)) {
        it.captionPos = "cima";
        say("legenda mais para cima");
        hit = true;
      } else if (/\b(meio|centro|centraliza|centralize|centralizar)\b/.test(c)) {
        it.captionPos = "meio";
        say("legenda no meio da tela");
        hit = true;
      }
      if (/pequena demais|muito pequena|maior|aumenta|aumente|aumentar|grande\b|nao (da|consigo) (pra |para )?ler|dificil de ler/.test(c) && !/grande demais|muito grande/.test(c)) {
        it.captionSize = "maior";
        say("legenda maior");
        hit = true;
      } else if (/grande demais|muito grande|enorme|menor|diminui|diminua|diminuir|reduz|pequen/.test(c)) {
        it.captionSize = "menor";
        say("legenda menor");
        hit = true;
      }
      const color = COLORS.find(([re]) => re.test(c));
      if (color && !/destaque|detalhe|grafismo/.test(c)) {
        it.set.captionColor = color[1];
        say(`legenda em ${color[2]}`);
        hit = true;
      }
      const style: [RegExp, CaptionStyle, string][] = [
        [/caixa alta|maiuscul/, "caixa_alta", "legenda em caixa alta"],
        [/palavra por palavra|uma palavra por vez|karaoke/, "palavra", "legenda palavra por palavra"],
        [/discret|simples|minuscul|normal|mais limpa/, "discreta", "legenda discreta"],
      ];
      const st = style.find(([re]) => re.test(c));
      if (st) {
        it.set.captionStyle = st[1];
        say(st[2]);
        hit = true;
      }
      if (hit) continue;
      if (off) {
        it.set.captions = false;
        say("sem legendas");
        continue;
      }
      if (on) {
        it.set.captions = true;
        say("com legendas");
        continue;
      }
    }

    // cor dos destaques e grafismos
    const accent = COLORS.find(([re]) => re.test(c));
    if (accent && /destaque|detalhe|grafismo|cor|tom/.test(c) && accent[2] !== "branco") {
      it.set.accentColor = accent[1];
      say(`destaques em ${accent[2]}`);
      continue;
    }

    // palavras para destacar
    if (/destac|destaq|enfatiz|enfase|realc|negrito/.test(c)) {
      const quoted = [...orig.matchAll(/[“"']([^”"']{2,40})[”"']/g)].map((m) => m[1].trim());
      const word = /(?:a palavra|o termo|a expressao|o nome)\s+(\S+(?:\s+\S+)?)/.exec(c);
      const list = quoted.length ? quoted : word ? [orig.slice(word.index + word[0].length - word[1].length, word.index + word[0].length).replace(/[.,!]+$/, "")] : [];
      if (list.length) {
        it.keywords = [...(it.keywords ?? []), ...list];
        say(`destaque em ${list.map((w) => `“${w}”`).join(", ")}`);
      } else {
        it.animation = "mais";
        say("mais destaque nas palavras importantes");
      }
      continue;
    }

    // quantidade de animação
    if (/mais (animac|anima|dinamic|efeito|grafismo|movimento|elemento|zoom|vida|energia|agitad|acao|emocao)|anima mais|pouca animacao|muito parado|parado demais|sem graca|monoton|chato|sem emocao/.test(c)) {
      Object.assign(it.set, { effects: true, zoom: true });
      it.animation = "mais";
      say("mais animação e grafismos");
      continue;
    }
    if (/menos (animac|anima|efeito|grafismo|zoom|movimento|elemento)|muito (poluido|carregado|exagerad|agitado)|exagerou|mais limpo|mais clean|polui|tont/.test(c)) {
      it.animation = "menos";
      say("menos animação");
      continue;
    }

    // título de impacto
    if (/titulo|frase (inicial|de abertura)|gancho|headline|chamada inicial/.test(c)) {
      const t = /\b(muda|mude|troca|troque|coloca|coloque|poe|ponha|bota|bote|altera|altere|escreve|escreva|seja|use)\b/.test(c) ? textAfter(orig, c, /\b(?:para|pra|por|como)\b\s*:?|:\s*/) : null;
      if (t && !off) {
        Object.assign(it.set, { hook: true, hookText: t });
        say(`título “${t}”`);
      } else if (off) {
        it.set.hook = false;
        say("sem título");
      } else if (on) {
        it.set.hook = true;
        say("com título");
      }
      continue;
    }

    // chamada final
    if (/chamada|\bcta\b|call to action|convite final|final do video (pedindo|chamando)/.test(c)) {
      const t = textAfter(orig, c, /\b(?:para|pra|por|como|dizendo)\b\s*:?|:\s*/);
      if (t && !off) {
        Object.assign(it.set, { cta: true, ctaText: t });
        say(`chamada final “${t}”`);
      } else if (off) {
        it.set.cta = false;
        say("sem chamada final");
      } else if (on) {
        it.set.cta = true;
        say("com chamada final");
      }
      continue;
    }

    if (/vinheta|abertura|encerramento|\bintro\b|introducao/.test(c) && (off || on)) {
      it.set.vignette = !off;
      say(off ? "sem vinheta" : "com vinheta");
      continue;
    }
    if (/\blogo|logomarca|marca d.?agua/.test(c) && (off || on)) {
      it.set.hideLogo = off;
      say(off ? "sem a logo" : "com a logo");
      continue;
    }
    if (/zoom|aproxima/.test(c) && (off || on)) {
      it.set.zoom = !off;
      say(off ? "sem zooms" : "com zooms");
      continue;
    }
    if (/grafismo|efeitos? visua|animac|elementos? grafic|icone/.test(c) && (off || on)) {
      it.set.effects = !off;
      say(off ? "sem grafismos" : "com grafismos");
      continue;
    }
    if (/pausa|silencio|respira/.test(c)) {
      it.set.cutPauses = !/nao corta|nao corte|deixa as pausas|mantem as pausas|mantenha/.test(c);
      say(it.set.cutPauses ? "pausas cortadas" : "pausas mantidas");
      continue;
    }

    // estilo de edição
    const styles: [RegExp, StyleId, string][] = [
      [/cinematograf|cinema|filme/, "cinematografico", "Cinematográfico"],
      [/institucional|formal|mais seri|sobri|profissional|elegante/, "institucional", "Institucional"],
      [/descontraid|divertid|engracad|informal/, "descontraido", "Descontraído"],
      [/performance|viral|tiktok/, "performance", "Performance"],
      [/estilo dinamic/, "dinamico", "Dinâmico"],
    ];
    const st = styles.find(([re]) => re.test(c));
    if (st) {
      it.set.style = st[1];
      say(`estilo ${st[2]}`);
    }
  }
  return it;
}

function clampN(v: number, a: number, b: number) {
  return Math.min(b, Math.max(a, v));
}

/** Aplica um pedido já entendido nas opções da edição. */
export function applyIntent(opts: EditOptions, it: Intent, ctx: { toSrc: (out: number) => number; bodyDur: number; duration: number }): EditOptions {
  const o: EditOptions = { ...opts, ...it.set };
  if (it.captionPos) {
    const cur = opts.captionShift ?? 0;
    o.captionShift =
      it.captionPos === "baixo" ? clampN(cur + 0.04, -0.4, 0.07) : it.captionPos === "cima" ? clampN(cur - 0.1, -0.31, 0.07) : it.captionPos === "meio" ? 0.6 - CAPTION_Y["9:16"] : 0;
  }
  if (it.captionSize) o.captionScale = clampN((opts.captionScale ?? 1) * (it.captionSize === "maior" ? 1.25 : 0.8), 0.6, 1.7);
  if (it.musicVolume) {
    o.music = true;
    o.musicVolume = clampN((opts.musicVolume ?? 1) * (it.musicVolume === "alta" ? 1.6 : 0.5), 0.2, 2.2);
  }
  if (it.newMusic) o.musicSeed = (opts.musicSeed ?? 0) + 1;
  if (it.animation) o.energy = clampN((opts.energy ?? 1) * (it.animation === "mais" ? 1.5 : 0.6), 0.4, 2.2);
  if (it.keywords?.length) o.extraKeywords = [...new Set([...(opts.extraKeywords ?? []), ...it.keywords])].slice(-20);
  if (it.replace?.length) o.replacements = [...(opts.replacements ?? []), ...it.replace].slice(-30);
  if (it.shorter) Object.assign(o, { cutPauses: true, removeMistakes: true });
  const cuts: Interval[] = [...(it.cutsSource ?? [])];
  for (const c of it.cutsOut ?? []) cuts.push({ start: ctx.toSrc(c.start), end: ctx.toSrc(c.end) });
  if (it.trimStart) cuts.push({ start: 0, end: ctx.toSrc(it.trimStart) });
  if (it.trimEnd) cuts.push({ start: ctx.toSrc(Math.max(0, ctx.bodyDur - it.trimEnd)), end: ctx.duration + 1 });
  const valid = cuts.filter((c) => c.end - c.start > 0.05);
  o.extraCuts = it.restore ? valid : [...(opts.extraCuts ?? []), ...valid];
  return o;
}

/** Só o que dá para guardar (sem a logo, que é arquivo). */
export function savedOptions(opts: EditOptions): Partial<EditOptions> {
  const rest: Partial<EditOptions> = { ...opts };
  delete rest.logo;
  return rest;
}

/**
 * Lê o pedido e devolve as opções (e a fala) ajustadas e uma nota honesta
 * para a pessoa. `atOut`: instante marcado no player (tempo do vídeo final).
 */
export async function applyRequest(p: {
  text: string;
  /** Observações do Novo vídeo ou pedido de ajuste (muda só a nota). */
  kind: "observacoes" | "ajuste";
  atOut: number | null;
  sample: SampleFn | null;
  opts: EditOptions;
  analysis: Analysis;
  signal?: AbortSignal;
}): Promise<{ opts: EditOptions; analysis: Analysis; note: string; changed: boolean }> {
  const text = p.text.trim();
  if (!text) return { opts: p.opts, analysis: p.analysis, note: "", changed: false };
  const before = renderInputs(p.analysis, p.opts);
  const intro = bookends(p.opts, before.title, before.cta).introDur;
  const bodyDur = before.plan.bodyDuration;
  const toSrc = (out: number) => toSource(before.plan.keep, clampN(out - intro, 0, bodyDur)).t;
  const atSource = p.atOut !== null ? toSrc(p.atOut) : null;

  let analysis = p.analysis;
  let intent: Intent | null = null;
  let note = "";
  if (p.sample) {
    const r = await reviseWithClaude(p.sample, text, atSource, p.opts, p.analysis.segments, p.signal).catch(() => null);
    if (r) {
      intent = r.intent;
      note = r.note;
      if (r.fixes.length) {
        const segs = analysis.segments.map((s) => {
          const f = r.fixes.find((x) => x.id === s.id);
          return f ? { ...s, text: f.text } : s;
        });
        analysis = { ...analysis, segments: segs, review: analysis.review ? { ...analysis.review, segments: segs } : null };
      }
    }
  }
  if (!intent) {
    intent = parseRequest(text);
    note = intent.done.length
      ? `${p.kind === "ajuste" ? "Ajuste aplicado" : "Observações aplicadas"}: ${intent.done.join(", ")}.`
      : `Não consegui entender o pedido “${text.slice(0, 120)}” sem a revisão com IA. Peça de forma direta, por exemplo: “legenda maior”, “música mais baixa”, “mais animação”, “corta do 0:10 ao 0:15” ou “troque X por Y”.`;
  }
  const opts = applyIntent(p.opts, intent, { toSrc, bodyDur, duration: p.analysis.duration });
  const changed = analysis !== p.analysis || JSON.stringify(savedOptions(opts)) !== JSON.stringify(savedOptions(p.opts));
  return { opts, analysis, note, changed };
}
