import { ClipboardList, MessageSquareText } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CAPTION_STYLES, CTA_TYPES, EDITING_STYLES, LEGAL_AREAS, TARGET_DURATIONS, labelOf } from "@/lib/constants/domain";
import { DETAIL_QUESTIONS, answersFromSettings } from "@/lib/constants/questions";
import { formatDateTime, formatDuration } from "@/lib/utils";
import type { Project, ProjectOptions, ProjectRevision } from "@/types/domain";

const ANSWER_LABEL = { sim: "Sim", nao: "Não", outro: "Outro" } as const;

/** Briefing do vídeo e histórico de ajustes, recolhidos em acordeão. */
export function ProjectBriefing({ project, revisions }: { project: Project; revisions: ProjectRevision[] }) {
  const settings = (project.settings ?? {}) as Record<string, boolean>;
  const options = (project.options ?? {}) as ProjectOptions;
  const answers = options.answers ?? answersFromSettings(settings);
  const rows: [string, string][] = [
    ["Área", labelOf(LEGAL_AREAS, project.legal_area)],
    ["Estilo", labelOf(EDITING_STYLES, project.editing_style)],
    ["Formatos", project.aspect_ratios.join(", ") || "—"],
    ["Duração final", labelOf(TARGET_DURATIONS, options.target_duration ?? "completo")],
    ["Legendas", settings.captions ? labelOf(CAPTION_STYLES, options.caption_style ?? "palavra") : "Não"],
    ["Chamada final", settings.cta ? `${labelOf(CTA_TYPES, options.cta_type)}${options.cta_text ? ` · ${options.cta_text}` : ""}` : "Não"],
    ["Trechos a remover", options.cut_ranges?.length ? options.cut_ranges.map((r) => `${r.start}–${r.end}`).join(", ") : "—"],
    ["Referência", options.reference_url || "—"],
    ["Duração original", formatDuration(project.source_duration_sec)],
  ];

  return (
    <Accordion type="multiple" className="glass rounded-[22px] px-5 md:px-6">
      <AccordionItem value="briefing">
        <AccordionTrigger>
          <span className="flex items-center gap-2.5">
            <ClipboardList className="size-4 text-cyan" /> Briefing
          </span>
        </AccordionTrigger>
        <AccordionContent className="pr-0">
          <dl className="grid gap-x-8 gap-y-2.5 text-sm sm:grid-cols-2">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 border-b border-line pb-2">
                <dt className="text-fg-3">{k}</dt>
                <dd className="min-w-0 text-right break-words text-fg">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-5 flex flex-wrap gap-1.5">
            {DETAIL_QUESTIONS.map((q) => {
              const a = answers[q.id];
              if (!a) return null;
              return (
                <span
                  key={q.id}
                  title={a === "outro" ? options.answers_text?.[q.id] : undefined}
                  className={
                    a === "nao"
                      ? "rounded-full border border-line px-2.5 py-1 text-[0.6875rem] text-fg-3 line-through"
                      : "rounded-full border border-cyan/30 bg-cyan/[0.07] px-2.5 py-1 text-[0.6875rem] text-fg"
                  }
                >
                  {q.label}
                  {a === "outro" ? ` · ${options.answers_text?.[q.id] ?? ANSWER_LABEL.outro}` : ""}
                </span>
              );
            })}
          </div>
          {project.instructions && (
            <p className="mt-5 rounded-2xl border border-line bg-fg/[0.03] p-4 text-sm leading-relaxed whitespace-pre-line text-fg-2">{project.instructions}</p>
          )}
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="ajustes" className="border-b-0">
        <AccordionTrigger>
          <span className="flex items-center gap-2.5">
            <MessageSquareText className="size-4 text-cyan" /> Ajustes{revisions.length ? ` · ${revisions.length}` : ""}
          </span>
        </AccordionTrigger>
        <AccordionContent className="pr-0">
          {revisions.length ? (
            <ul className="space-y-3">
              {revisions.map((r) => (
                <li key={r.id} className="rounded-2xl border border-line p-4">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-fg-3">{formatDateTime(r.created_at)}</span>
                    <span className={r.status === "resolved" ? "text-success" : "text-warning"}>
                      {r.status === "resolved" ? "Concluído" : r.status === "in_progress" ? "Em andamento" : "Aberto"}
                    </span>
                  </div>
                  {r.timestamp_sec != null && <p className="mt-2 font-mono text-xs text-cyan">em {formatDuration(r.timestamp_sec)}</p>}
                  <p className="mt-1 text-sm text-fg">{r.comment}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-fg-3">Nenhum ajuste solicitado.</p>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
