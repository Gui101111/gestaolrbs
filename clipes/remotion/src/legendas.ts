import { parseSrt, type Caption } from "@remotion/captions";

export type Palavra = { texto: string; iniMs: number; fimMs: number };

type Json3 = {
  events?: {
    tStartMs?: number;
    dDurationMs?: number;
    segs?: { utf8?: string; tOffsetMs?: number }[];
  }[];
};

// Legendas automáticas do YouTube (json3) já trazem o tempo de cada palavra.
const palavrasJson3 = (dados: Json3): Palavra[] => {
  const palavras: Palavra[] = [];
  for (const ev of dados.events ?? []) {
    const inicio = ev.tStartMs ?? 0;
    for (const seg of ev.segs ?? []) {
      const texto = (seg.utf8 ?? "").trim();
      if (!texto) continue;
      for (const w of texto.split(/\s+/)) {
        palavras.push({ texto: w, iniMs: inicio + (seg.tOffsetMs ?? 0), fimMs: 0 });
      }
    }
  }
  palavras.sort((a, b) => a.iniMs - b.iniMs);
  palavras.forEach((p, i) => {
    const prox = palavras[i + 1]?.iniMs ?? p.iniMs + 600;
    p.fimMs = Math.min(prox, p.iniMs + 1200);
  });
  return palavras;
};

// Em .srt o tempo de cada fala é dividido entre as palavras pelo nº de letras.
const palavrasSrt = (captions: Caption[]): Palavra[] => {
  const palavras: Palavra[] = [];
  for (const c of captions) {
    const ws = c.text.replace(/<[^>]+>/g, "").split(/\s+/).filter(Boolean);
    const total = ws.reduce((s, w) => s + w.length, 0) || 1;
    let t = c.startMs;
    for (const w of ws) {
      const d = ((c.endMs - c.startMs) * w.length) / total;
      palavras.push({ texto: w, iniMs: t, fimMs: t + d });
      t += d;
    }
  }
  return palavras;
};

export const carregarPalavras = async (
  url: string,
  inicioSeg: number,
  duracaoSeg: number,
): Promise<Palavra[]> => {
  const resposta = await fetch(url);
  const conteudo = await resposta.text();
  const todas = /\.json3?$/i.test(url)
    ? palavrasJson3(JSON.parse(conteudo) as Json3)
    : palavrasSrt(parseSrt({ input: conteudo }).captions);
  const ini = inicioSeg * 1000;
  const fim = ini + duracaoSeg * 1000;
  return todas
    .filter((p) => p.iniMs >= ini - 50 && p.iniMs < fim)
    .map((p) => ({
      texto: p.texto,
      iniMs: p.iniMs - ini,
      fimMs: Math.min(p.fimMs, fim) - ini,
    }));
};

// Blocos curtos (até 3 palavras / 16 letras) quebrados em pausas e pontuação.
export const agrupar = (
  palavras: Palavra[],
  maxPalavras = 3,
  maxLetras = 16,
  pausaMs = 450,
): Palavra[][] => {
  const grupos: Palavra[][] = [];
  let atual: Palavra[] = [];
  for (const p of palavras) {
    const ultima = atual[atual.length - 1];
    const letras = atual.reduce((s, w) => s + w.texto.length + 1, 0) + p.texto.length;
    const quebra =
      ultima &&
      (atual.length >= maxPalavras ||
        letras > maxLetras ||
        p.iniMs - ultima.fimMs > pausaMs ||
        /[.!?,;:]$/.test(ultima.texto));
    if (quebra) {
      grupos.push(atual);
      atual = [];
    }
    atual.push(p);
  }
  if (atual.length) grupos.push(atual);
  return grupos;
};
