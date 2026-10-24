import { ICONS, type IconName, type IconNode } from "@/lib/browser-editor/icons-data";

export type { IconName };

export const isIcon = (name: unknown): name is IconName => typeof name === "string" && name in ICONS;

const cache = new Map<IconName, Path2D[]>();

const nums = (v: string | number | undefined) => Number(v ?? 0);

function points(s: string) {
  const n = s
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  const out: [number, number][] = [];
  for (let i = 0; i + 1 < n.length; i += 2) out.push([n[i], n[i + 1]]);
  return out;
}

function build(node: IconNode): Path2D[] {
  return node.map(([tag, a]) => {
    if (tag === "path") return new Path2D(String(a.d));
    const p = new Path2D();
    if (tag === "circle") p.arc(nums(a.cx), nums(a.cy), nums(a.r), 0, Math.PI * 2);
    else if (tag === "ellipse") p.ellipse(nums(a.cx), nums(a.cy), nums(a.rx), nums(a.ry), 0, 0, Math.PI * 2);
    else if (tag === "rect") {
      const r = nums(a.rx ?? a.ry);
      if (r && typeof p.roundRect === "function") p.roundRect(nums(a.x), nums(a.y), nums(a.width), nums(a.height), r);
      else p.rect(nums(a.x), nums(a.y), nums(a.width), nums(a.height));
    } else if (tag === "line") {
      p.moveTo(nums(a.x1), nums(a.y1));
      p.lineTo(nums(a.x2), nums(a.y2));
    } else if (tag === "polyline" || tag === "polygon") {
      points(String(a.points)).forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
      if (tag === "polygon") p.closePath();
    }
    return p;
  });
}

/**
 * Desenha um ícone do Lucide centrado em (cx, cy). `draw` (0 a 1) desenha
 * o traço aos poucos, como se fosse feito à mão.
 */
export function drawIcon(
  ctx: CanvasRenderingContext2D,
  name: IconName,
  cx: number,
  cy: number,
  size: number,
  color: string,
  opts: { lineWidth?: number; draw?: number; glow?: string | null } = {},
) {
  let paths = cache.get(name);
  if (!paths) {
    paths = build(ICONS[name] as unknown as IconNode);
    cache.set(name, paths);
  }
  const draw = Math.min(1, Math.max(0, opts.draw ?? 1));
  if (draw <= 0) return;
  ctx.save();
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.scale(size / 24, size / 24);
  ctx.lineWidth = opts.lineWidth ?? 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = color;
  if (opts.glow) {
    ctx.shadowColor = opts.glow;
    ctx.shadowBlur = size * 0.35;
  }
  if (draw < 1) {
    const L = 90;
    ctx.setLineDash([L, L]);
    ctx.lineDashOffset = L * (1 - draw);
  }
  for (const p of paths) ctx.stroke(p);
  ctx.restore();
}

/** Palavras da fala → ícone do grafismo. A primeira regra que casa vence. */
const RULES: [RegExp, IconName][] = [
  [/\bvoo|a[ée]reo|avi[ãa]o|embarque|aeroporto|companhia a[ée]rea|anac\b/, "plane"],
  [/bagagem|mala\b/, "luggage"],
  [/pix|golpe|fraude|estelionat|clonad|invas[ãa]o de conta/, "shield-alert"],
  [/cart[ãa]o|cr[ée]dito|d[ée]bito|fatura/, "credit-card"],
  [/banco|financiamento|empr[ée]stimo|juros|consignad/, "landmark"],
  [/aposentad|inss|benef[íi]cio|previd|bpc|loas|aux[íi]lio/, "piggy-bank"],
  [/indeniza|reembolso|ressarci|devolu|dinheiro|valor|pagamento|\br\$|reais|sal[áa]rio|verba|multa/, "banknote"],
  [/fgts|rescis|demiss|demitid|justa causa|trabalh|emprego|carteira assinada|hora extra|clt/, "briefcase"],
  [/pens[ãa]o|alimentos|guarda|filho|crian[çc]a|menor/, "baby"],
  [/div[óo]rcio|casamento|uni[ãa]o est[áa]vel|fam[íi]lia|c[ôo]njuge/, "users"],
  [/heran[çc]a|invent[áa]rio|testamento|partilha/, "scroll-text"],
  [/im[óo]vel|aluguel|inquilino|despejo|usucapi|casa|apartamento|condom[íi]nio/, "house"],
  [/plano de sa[úu]de|sa[úu]de|m[ée]dic|cirurgia|tratamento|hospital|rem[ée]dio/, "heart-pulse"],
  [/carro|ve[íi]culo|tr[âa]nsito|multa de tr[âa]nsito|cnh|acidente/, "car"],
  [/compra|produto|loja|consumidor|procon|defeito|garantia/, "shopping-bag"],
  [/entrega|encomenda|correios/, "truck"],
  [/nome sujo|negativa|serasa|spc|cobran[çc]a|d[íi]vida/, "receipt"],
  [/contrato|cl[áa]usula|assinatura|documento|certid[ãa]o/, "file-text"],
  [/empresa|neg[óo]cio|cnpj|s[óo]cio|mei\b/, "building"],
  [/prazo|dias?\b|horas?\b|meses|anos?\b|tempo|urg[êe]ncia/, "clock"],
  [/processo|a[çc][ãa]o judicial|juiz|justi[çc]a|tribunal|senten[çc]a|liminar/, "gavel"],
  [/lei\b|artigo|c[óo]digo|constitui[çc][ãa]o|s[úu]mula|resolu[çc][ãa]o/, "book-open"],
  [/direito|direitos/, "scale"],
  [/aten[çc][ãa]o|cuidado|risco|perigo|alerta/, "triangle-alert"],
  [/celular|telefone|whatsapp|mensagem|liga[çc][ãa]o/, "smartphone"],
  [/e-?mail|notifica[çc][ãa]o/, "mail"],
  [/acordo|negocia|concilia/, "handshake"],
  [/prova|comprovante|nota fiscal|recibo|foto|print/, "camera"],
  [/dica|ideia|saiba|entenda/, "lightbulb"],
  [/sim\b|pode\b|consegue|tem direito/, "circle-check"],
  [/n[ãa]o pode|proibid|ilegal|abusiv/, "ban"],
];

export function iconFor(text: string): IconName | null {
  const t = text.toLocaleLowerCase("pt-BR");
  for (const [re, icon] of RULES) if (re.test(t)) return icon;
  return null;
}
