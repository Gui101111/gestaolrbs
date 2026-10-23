import { fail, json, requireUser } from './_lib/http.js';

/**
 * Recebe um trecho de áudio WAV (16 kHz, mono) no corpo da requisição e devolve a
 * transcrição com o tempo de cada palavra. Usa o Whisper da OpenAI ou, se só houver
 * GROQ_API_KEY, o Whisper hospedado pela Groq (mesmo formato de API).
 */

interface ApiWord {
  word: string;
  start: number;
  end: number;
}
interface ApiSegment {
  text: string;
  start: number;
  end: number;
}

const MAX_BYTES = 4_400_000;

function provider() {
  if (process.env.OPENAI_API_KEY) {
    return { url: 'https://api.openai.com/v1/audio/transcriptions', key: process.env.OPENAI_API_KEY, model: 'whisper-1' };
  }
  if (process.env.GROQ_API_KEY) {
    return { url: 'https://api.groq.com/openai/v1/audio/transcriptions', key: process.env.GROQ_API_KEY, model: 'whisper-large-v3-turbo' };
  }
  return null;
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '');

/**
 * As palavras do Whisper vêm sem pontuação; o texto dos segmentos vem pontuado.
 * Aqui alinhamos as duas listas para que as legendas mantenham vírgulas, pontos e
 * letras maiúsculas.
 */
function punctuate(words: ApiWord[], segments: ApiSegment[]) {
  const tokens = segments.flatMap((s) => s.text.split(/\s+/).filter((t) => normalize(t).length > 0));
  const out = words.map((w) => ({ text: w.word.trim(), start: w.start, end: w.end }));
  let t = 0;
  for (let i = 0; i < out.length && t < tokens.length; i++) {
    const target = normalize(out[i].text);
    let found = -1;
    for (let k = t; k < Math.min(tokens.length, t + 4); k++) {
      if (normalize(tokens[k]) === target) {
        found = k;
        break;
      }
    }
    if (found >= 0) {
      out[i].text = tokens[found];
      t = found + 1;
    }
  }
  return out.filter((w) => w.text.length > 0);
}

export async function POST(request: Request): Promise<Response> {
  const denied = await requireUser(request);
  if (denied) return denied;

  const p = provider();
  if (!p) {
    return fail('A transcrição não está configurada. Adicione OPENAI_API_KEY (ou GROQ_API_KEY) nas variáveis de ambiente.', 503, 'no_transcription_key');
  }

  const audio = await request.arrayBuffer();
  if (audio.byteLength === 0) return fail('Nenhum áudio recebido.');
  if (audio.byteLength > MAX_BYTES) return fail('Trecho de áudio grande demais.', 413);

  const lang = new URL(request.url).searchParams.get('lang');
  const form = new FormData();
  form.append('file', new Blob([audio], { type: 'audio/wav' }), 'trecho.wav');
  form.append('model', p.model);
  form.append('response_format', 'verbose_json');
  form.append('timestamp_granularities[]', 'word');
  form.append('timestamp_granularities[]', 'segment');
  if (lang && lang !== 'auto') form.append('language', lang);
  if (!lang || lang === 'pt') form.append('prompt', 'Transcrição em português do Brasil, com pontuação e acentuação corretas.');

  const res = await fetch(p.url, { method: 'POST', headers: { authorization: `Bearer ${p.key}` }, body: form });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    console.error('Falha na transcrição', res.status, detail.slice(0, 500));
    if (res.status === 401) return fail('A chave da API de transcrição é inválida.', 502);
    if (res.status === 429) return fail('Limite da API de transcrição atingido. Tente de novo em instantes.', 429);
    return fail('O serviço de transcrição não respondeu como esperado.', 502);
  }

  const data = (await res.json()) as { text?: string; language?: string; duration?: number; words?: ApiWord[]; segments?: ApiSegment[] };
  const words = punctuate(data.words ?? [], data.segments ?? []);
  return json({ text: data.text ?? '', language: data.language ?? lang ?? '', duration: data.duration ?? 0, words });
}
