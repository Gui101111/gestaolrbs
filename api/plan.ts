import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { fail, json, requireUser } from './_lib/http.js';

/**
 * Planeja a edição: recebe a transcrição palavra por palavra, as opções escolhidas e o
 * pedido adicional do usuário, e devolve um plano estruturado (cortes, destaques,
 * zooms, título de gancho, ajustes de legenda e como cada pedido foi atendido).
 * Quem aplica o plano é o navegador, na hora de renderizar.
 */

const CAPTION_STYLES = ['recomendada', 'discreta', 'caixa', 'karaoke', 'impacto', 'minimalista'] as const;

const PlanSchema = z.object({
  title: z.string().describe('Título curto do projeto, 2 a 6 palavras.'),
  summary: z.string().describe('Uma ou duas frases, em português, contando o que foi feito na edição.'),
  remove_ranges: z
    .array(z.object({ from: z.number(), to: z.number(), reason: z.string() }))
    .describe('Intervalos de palavras (índices inclusivos) a cortar do vídeo.'),
  corrections: z
    .array(z.object({ index: z.number(), text: z.string() }))
    .describe('Grafia corrigida de uma palavra específica, para a legenda.'),
  highlights: z.array(z.number()).describe('Índices das palavras-chave destacadas na legenda.'),
  emphasis: z.array(z.number()).describe('Índices das palavras onde entra um zoom de ênfase.'),
  hook_title: z.string().nullable().describe('Título de gancho no topo nos primeiros segundos, ou null.'),
  overrides: z.object({
    captions_enabled: z.boolean().nullable(),
    caption_style: z.enum(CAPTION_STYLES).nullable(),
    position: z.enum(['bottom', 'middle', 'top']).nullable(),
    size: z.enum(['sm', 'md', 'lg']).nullable(),
    color: z.string().nullable().describe('Cor de destaque em #RRGGBB.'),
    uppercase: z.boolean().nullable(),
    intro_title: z.string().nullable(),
    intro_subtitle: z.string().nullable(),
    outro_title: z.string().nullable(),
    outro_subtitle: z.string().nullable(),
  }),
  instructions: z.array(
    z.object({
      request: z.string().describe('O pedido do usuário, resumido.'),
      status: z.enum(['feito', 'parcial', 'nao_possivel']),
      note: z.string().describe('Explicação curta, em português, do que foi feito ou por que não foi possível.'),
    }),
  ),
});

const SYSTEM = `Você é o editor de vídeo da Tribuna, um editor de vídeos com IA para quem grava vídeos falando para a câmera (Reels, TikTok, Shorts, YouTube).

Você recebe a transcrição do vídeo com cada palavra numerada ([índice]:palavra) e o tempo em segundos de cada trecho. Você não edita pixels: você devolve um plano que o motor de renderização aplica. O motor sabe fazer exatamente isto:
1. Cortar intervalos de palavras (remove_ranges, índices inclusivos). O corte acontece no tempo daquelas palavras.
2. Corrigir a grafia de uma palavra na legenda (corrections), uma palavra por vez, podendo incluir pontuação.
3. Destacar palavras-chave na legenda (highlights).
4. Dar um zoom de ênfase começando em uma palavra (emphasis).
5. Mostrar um título de gancho no topo nos primeiros segundos (hook_title).
6. Mudar a legenda: ligar/desligar, estilo, posição, tamanho, cor de destaque, maiúsculas (overrides).
7. Definir os textos da vinheta de abertura e de encerramento (overrides.intro_* e overrides.outro_*), que só aparecem se a vinheta estiver ligada nas opções.
As pausas e silêncios são cortados automaticamente por análise do áudio quando a opção está ligada; não é preciso listá-los.
O motor NÃO sabe: adicionar música, efeitos sonoros, imagens, B-roll, emojis animados, trocar o fundo, mudar a voz, criar falas novas, traduzir o áudio ou mudar o formato do vídeo.

O pedido adicional do usuário é a prioridade máxima. Leia com atenção, separe cada pedido individual e aplique todos que estiverem dentro das capacidades acima, mesmo que contrariem as opções marcadas. Registre cada pedido em instructions com o status (feito, parcial ou nao_possivel) e uma nota curta e clara em português. Se algo não for possível, diga isso e, quando houver, o que foi feito de mais próximo. Se não houver pedido adicional, devolva instructions vazio.

Regras de corte:
- Com "remover vícios de linguagem" ligado: corte hesitações ("é...", "ãh", "hum", "éé"), "tipo" e "né" usados como muleta, gaguejos, começos falsos e frases repetidas (quando a pessoa repete a mesma frase, mantenha a última tentativa completa).
- Nunca corte algo que mude o sentido do que foi dito, e não deixe frases gramaticalmente quebradas.
- Se o usuário pedir uma duração máxima, use os tempos para escolher os trechos menos importantes e cortar até caber.
- Com a opção desligada e sem pedido do usuário, não corte palavras.

Outras regras:
- highlights (se "destacar palavras-chave" estiver ligado ou for pedido): cerca de 1 palavra a cada 6 a 10, só palavras com peso (números, substantivos e verbos importantes), nunca artigos ou preposições.
- emphasis (se "zoom dinâmico" estiver ligado ou for pedido): cerca de 1 a cada 5 a 8 segundos, nos momentos mais fortes.
- hook_title (se "título de gancho" estiver ligado ou for pedido): até 7 palavras, no idioma do vídeo, sem aspas. Caso contrário, null.
- corrections: só quando a transcrição estiver claramente errada (nomes, marcas, termos técnicos, acentos).
- overrides: deixe null tudo o que o usuário não pediu para mudar. Cores sempre em #RRGGBB.
- title e summary em português do Brasil; textos que aparecem no vídeo, no idioma do vídeo.`;

interface InWord {
  i: number;
  text: string;
  start: number;
  end: number;
}

function transcriptLines(words: InWord[]) {
  const lines: string[] = [];
  let current: string[] = [];
  let lineStart = 0;
  words.forEach((w, k) => {
    const prev = words[k - 1];
    const gap = prev ? w.start - prev.end : 0;
    if (!prev || gap > 0.6 || current.length >= 18) {
      if (current.length) lines.push(`[${lineStart.toFixed(1)}s] ${current.join(' ')}`);
      current = [];
      lineStart = w.start;
      if (prev && gap > 0.6) current.push(`(pausa ${gap.toFixed(1)}s)`);
    }
    current.push(`${w.i}:${w.text}`);
  });
  if (current.length) lines.push(`[${lineStart.toFixed(1)}s] ${current.join(' ')}`);
  return lines.join('\n');
}

const HEX = /^#[0-9a-fA-F]{6}$/;

export async function POST(request: Request): Promise<Response> {
  const denied = await requireUser(request);
  if (denied) return denied;
  if (!process.env.ANTHROPIC_API_KEY) {
    return fail('O planejamento com IA não está configurado. Adicione ANTHROPIC_API_KEY nas variáveis de ambiente.', 503, 'no_plan_key');
  }

  let body: { words: InWord[]; duration: number; language: string; options: Record<string, unknown>; prompt: string };
  try {
    body = await request.json();
  } catch {
    return fail('Requisição inválida.');
  }
  const words = Array.isArray(body.words) ? body.words : [];
  const prompt = String(body.prompt ?? '').slice(0, 4000).trim();

  const userContent = `Opções escolhidas pelo usuário:
${JSON.stringify(body.options ?? {}, null, 2)}

Duração do vídeo original: ${Number(body.duration ?? 0).toFixed(1)} s. Idioma: ${body.language || 'pt'}.

Transcrição (${words.length} palavras):
${words.length ? transcriptLines(words) : '(o vídeo não tem fala detectada)'}

<pedido_adicional_do_usuario>
${prompt || '(nenhum)'}
</pedido_adicional_do_usuario>`;

  const client = new Anthropic({ timeout: 240_000, maxRetries: 1 });
  let message;
  try {
    message = await client.beta.messages.parse({
      model: 'claude-opus-5-5',
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: betaZodOutputFormat(PlanSchema) },
      system: SYSTEM,
      messages: [{ role: 'user', content: userContent }],
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) return fail('A chave ANTHROPIC_API_KEY é inválida.', 502);
    if (error instanceof Anthropic.RateLimitError) return fail('Limite da IA atingido. Tente de novo em instantes.', 429);
    if (error instanceof Anthropic.APIError) {
      console.error('Erro da API Claude', error.status, error.message);
      return fail('A IA não conseguiu planejar a edição agora.', 502);
    }
    throw error;
  }

  if (message.stop_reason === 'refusal') return fail('A IA recusou este conteúdo.', 422, 'refusal');
  const plan = message.parsed_output;
  if (!plan) return fail('A IA devolveu um plano incompleto. Tente de novo.', 502);

  const n = words.length;
  const valid = (i: number) => Number.isInteger(i) && i >= 0 && i < n;
  const ints = (list: number[]) => list.map((i) => Math.round(i));
  const o = plan.overrides;

  return json({
    title: plan.title.trim(),
    summary: plan.summary.trim(),
    removeRanges: plan.remove_ranges
      .map((r) => ({ from: Math.round(Math.min(r.from, r.to)), to: Math.round(Math.max(r.from, r.to)), reason: r.reason }))
      .filter((r) => valid(r.from) && valid(r.to)),
    corrections: plan.corrections
      .map((c) => ({ index: Math.round(c.index), text: c.text.trim() }))
      .filter((c) => valid(c.index) && c.text),
    highlights: [...new Set(ints(plan.highlights).filter(valid))],
    emphasis: [...new Set(ints(plan.emphasis).filter(valid))].sort((a, b) => a - b),
    hookTitle: plan.hook_title?.trim() || null,
    overrides: {
      captionsEnabled: o.captions_enabled,
      captionStyle: o.caption_style,
      position: o.position,
      size: o.size,
      color: o.color && HEX.test(o.color) ? o.color.toUpperCase() : null,
      uppercase: o.uppercase,
      introTitle: o.intro_title,
      introSubtitle: o.intro_subtitle,
      outroTitle: o.outro_title,
      outroSubtitle: o.outro_subtitle,
    },
    instructions: plan.instructions,
    source: 'ia',
  });
}
