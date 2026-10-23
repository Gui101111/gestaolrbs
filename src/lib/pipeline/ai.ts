import { backend } from '../backend';
import type { EditPlan, ProjectSettings, Transcript, Word } from '../types';
import { ANALYSIS_RATE, encodeWav, splitForTranscription } from './audio';

export class ServiceUnavailable extends Error {}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await backend.accessToken();
  return token ? { authorization: `Bearer ${token}` } : {};
}

async function readError(res: Response) {
  try {
    const data = (await res.json()) as { error?: string; code?: string };
    return { message: data.error ?? `Erro ${res.status}`, code: data.code };
  } catch {
    return { message: `O servidor respondeu com erro ${res.status}.`, code: undefined };
  }
}

/** Transcreve o áudio em trechos, devolvendo as palavras com tempo no vídeo inteiro. */
export async function transcribe(
  mono: Float32Array,
  db: Float32Array,
  language: string,
  onProgress: (p: number) => void,
  signal?: AbortSignal,
): Promise<Transcript> {
  const chunks = splitForTranscription(mono, db);
  const words: Word[] = [];
  let text = '';
  let detected = language;
  for (let k = 0; k < chunks.length; k++) {
    const chunk = chunks[k];
    const body = encodeWav(chunk.samples, ANALYSIS_RATE);
    let res: Response | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        res = await fetch(`/api/transcribe?lang=${encodeURIComponent(language)}`, {
          method: 'POST',
          headers: { 'content-type': 'audio/wav', ...(await authHeaders()) },
          body,
          signal,
        });
      } catch (error) {
        if (signal?.aborted) throw error;
        res = null;
      }
      if (res && res.status < 500) break;
    }
    if (!res) throw new ServiceUnavailable('Não foi possível falar com o servidor de transcrição.');
    if (res.status === 404 || res.status === 503) {
      const err = await readError(res);
      throw new ServiceUnavailable(res.status === 404 ? 'O servidor de IA não foi encontrado neste endereço.' : err.message);
    }
    if (!res.ok) throw new Error((await readError(res)).message);
    const data = (await res.json()) as { text: string; language: string; words: { text: string; start: number; end: number }[] };
    for (const w of data.words) {
      const start = w.start + chunk.start;
      const end = Math.max(start + 0.02, w.end + chunk.start);
      words.push({ i: words.length, text: w.text, start, end });
    }
    text += (text ? ' ' : '') + data.text.trim();
    if (data.language) detected = data.language;
    onProgress((k + 1) / chunks.length);
  }
  return { language: detected, text, duration: mono.length / ANALYSIS_RATE, words };
}

export function describeOptions(settings: ProjectSettings) {
  return {
    remover_silencios: settings.ai.removeSilences,
    remover_vicios_de_linguagem: settings.ai.removeFillers,
    ritmo_dos_cortes: settings.ai.pace,
    zoom_dinamico: settings.ai.zooms,
    destacar_palavras_chave: settings.ai.highlightKeywords,
    titulo_de_gancho: settings.ai.hookTitle,
    legendas: settings.captions,
    vinheta_abertura: settings.vinheta.intro,
    vinheta_encerramento: settings.vinheta.outro,
    textos_da_vinheta: {
      abertura: settings.vinheta.title,
      abertura_subtitulo: settings.vinheta.subtitle,
      encerramento: settings.vinheta.outroTitle,
      encerramento_subtitulo: settings.vinheta.outroSubtitle,
    },
    formato: settings.format,
  };
}

export async function requestPlan(transcript: Transcript, duration: number, settings: ProjectSettings, signal?: AbortSignal): Promise<EditPlan> {
  let res: Response;
  try {
    res = await fetch('/api/plan', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(await authHeaders()) },
      body: JSON.stringify({
        words: transcript.words,
        duration,
        language: transcript.language,
        options: describeOptions(settings),
        prompt: settings.prompt,
      }),
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ServiceUnavailable('Não foi possível falar com o servidor de IA.');
  }
  if (res.status === 404 || res.status === 503) throw new ServiceUnavailable((await readError(res)).message);
  if (!res.ok) throw new Error((await readError(res)).message);
  return (await res.json()) as EditPlan;
}

const HESITATION = /^(é+|éé+|eh+|ãh+|ã+|ah+|ahn+|hum+|hm+|uhm*|um+|er+m*)[.,!?…]*$/i;
const STOPWORDS = new Set(
  'a o as os um uma de da do das dos em no na nos nas por para pra com sem que se e é ou mas mais muito bem já não sim isso esse essa este esta aqui ali lá eu você vocês ele ela eles elas nós me te lhe seu sua meu minha the and of to in is it you that for on with this'.split(' '),
);

/**
 * Plano feito sem IA, só com regras simples. Usado quando a IA de planejamento não
 * está configurada ou não respondeu, para que o vídeo saia mesmo assim.
 */
export function automaticPlan(transcript: Transcript | null, settings: ProjectSettings, title: string): EditPlan {
  const words = transcript?.words ?? [];
  const removeRanges = settings.ai.removeFillers
    ? words.filter((w) => HESITATION.test(w.text.trim())).map((w) => ({ from: w.i, to: w.i, reason: 'hesitação' }))
    : [];
  const clean = (t: string) => t.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  const highlights: number[] = [];
  const emphasis: number[] = [];
  if (settings.ai.highlightKeywords || settings.ai.zooms) {
    let lastHighlight = -10;
    let lastZoom = -10;
    for (const w of words) {
      const c = clean(w.text);
      const strong = /\d/.test(c) || (c.length >= 7 && !STOPWORDS.has(c));
      if (!strong) continue;
      if (settings.ai.highlightKeywords && w.i - lastHighlight >= 6) {
        highlights.push(w.i);
        lastHighlight = w.i;
      }
      if (settings.ai.zooms && w.start - lastZoom >= 6) {
        emphasis.push(w.i);
        lastZoom = w.start;
      }
    }
  }
  let hookTitle: string | null = null;
  if (settings.ai.hookTitle && words.length) {
    const first = transcript!.text.split(/(?<=[.!?])\s+/)[0] ?? '';
    hookTitle = first.split(/\s+/).slice(0, 7).join(' ').replace(/[,;:]$/, '') || null;
  }
  const done = [
    settings.ai.removeSilences ? 'cortes de pausas pela análise do áudio' : null,
    words.length && settings.captions.enabled ? 'legendas sincronizadas' : null,
    removeRanges.length ? `${removeRanges.length} hesitações removidas` : null,
    highlights.length ? 'palavras-chave destacadas por regras simples' : null,
  ].filter(Boolean);
  return {
    title,
    summary: `Edição automática, sem a IA de planejamento${done.length ? `: ${done.join(', ')}.` : '.'}`,
    removeRanges,
    corrections: [],
    highlights,
    emphasis,
    hookTitle,
    overrides: {
      captionsEnabled: null,
      captionStyle: null,
      position: null,
      size: null,
      color: null,
      uppercase: null,
      introTitle: null,
      introSubtitle: null,
      outroTitle: null,
      outroSubtitle: null,
    },
    instructions: [],
    source: 'automatico',
  };
}
