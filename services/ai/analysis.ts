import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { EDITING_STYLES, LEGAL_AREAS, OBJECTIVES, labelOf } from "../../lib/constants/domain";
import { EditPlanSchema, type ContentAnalysisProvider, type EditBrief, type EditPlan, type Transcript } from "../editing/types";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-5-5";

const SYSTEM_PROMPT = `Você é o diretor de edição de uma plataforma que transforma vídeos brutos de advogados brasileiros em conteúdo profissional para redes sociais e anúncios.

Sua tarefa: a partir da transcrição com tempos (em segundos) e do briefing do projeto, decidir o plano de edição — onde cortar, onde aproximar, quais termos destacar nas legendas, quando usar B-roll, grafismos, transições e CTA.

Princípios:
- Sobriedade e autoridade acima de tudo. O resultado deve parecer comunicação de um escritório sério, nunca um vídeo de entretenimento exagerado.
- Respeite o estilo de edição escolhido: "institucional" quase sem movimento; "dinamico" com zooms leves e destaques; "cinematografico" com movimentos suaves e textos mínimos; "performance" com gancho forte nos 3 primeiros segundos, cortes rápidos e CTA claro; "descontraido" mais humano e leve.
- Corte silêncios longos, vícios de linguagem ("é…", "né", "tipo") e trechos repetidos ou com erro, quando as configurações pedirem. Nunca corte no meio de uma palavra.
- Destaque termos jurídicos, prazos, números e referências a leis/artigos exatamente como foram ditos.
- B-roll deve ser contextual à área do Direito e neutro (sem imagens chocantes, sem pessoas identificáveis reais).
- Conformidade com o Provimento 205/2021 da OAB: sinalize em complianceFlags qualquer fala com promessa de resultado, garantia de êxito, captação indevida, mercantilização ou comparação com outros profissionais. Não reescreva a fala do advogado; apenas sinalize.
- Siga as instruções adicionais do advogado quando não conflitarem com a conformidade.
- Use somente tempos que existam na transcrição.`;

function describeBrief(brief: EditBrief) {
  const p = brief.project;
  const enabled = Object.entries(p.settings)
    .filter(([, v]) => v)
    .map(([k]) => k);
  return [
    `Projeto: ${p.name}`,
    `Objetivo: ${labelOf(OBJECTIVES, p.objective)}`,
    `Área do Direito: ${labelOf(LEGAL_AREAS, p.legalArea)}`,
    `Estilo de edição: ${labelOf(EDITING_STYLES, p.editingStyle)} (${p.editingStyle})`,
    `Plataformas: ${p.platforms.join(", ")} · Proporções: ${p.aspectRatios.join(", ")}`,
    `Configurações ativas: ${enabled.join(", ") || "nenhuma"}`,
    `Opções: ${JSON.stringify(p.options)}`,
    p.instructions ? `Instruções do advogado: ${p.instructions}` : "Instruções do advogado: nenhuma",
    p.revisionNotes.length ? `Ajustes solicitados: ${p.revisionNotes.map((r) => `${r.timestampSec ?? "-"}s: ${r.comment}`).join(" | ")}` : "",
    brief.lawyer.name ? `Advogado: ${brief.lawyer.name}${brief.lawyer.oab ? ` (${brief.lawyer.oab})` : ""}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function describeTranscript(t: Transcript) {
  return t.segments.map((s) => `[${s.start.toFixed(2)}–${s.end.toFixed(2)}] ${s.text}`).join("\n");
}

/** Análise semântica com Claude → plano de edição estruturado e validado. */
export const claudeAnalysisProvider: ContentAnalysisProvider = {
  name: "claude",
  async plan({ transcript, brief }): Promise<EditPlan> {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error("analysis_not_configured");
    const client = new Anthropic();
    const response = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      // Em caso de recusa por política, o próprio servidor reexecuta no modelo de fallback recomendado.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "high", format: betaZodOutputFormat(EditPlanSchema) },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `BRIEFING\n${describeBrief(brief)}\n\nTRANSCRIÇÃO (duração ${transcript.durationSec.toFixed(1)}s)\n${describeTranscript(transcript)}`,
        },
      ],
    });
    if (response.stop_reason === "refusal") throw new Error("analysis_refused");
    if (response.stop_reason === "max_tokens") throw new Error("analysis_truncated");
    if (!response.parsed_output) throw new Error("analysis_invalid_output");
    return response.parsed_output;
  },
};

export function getAnalysisProvider(): ContentAnalysisProvider {
  return claudeAnalysisProvider;
}
