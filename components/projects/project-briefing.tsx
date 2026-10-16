import { CAPTION_STYLES, CTA_TYPES, EDITING_STYLES, EDIT_SETTINGS, LEGAL_AREAS, OBJECTIVES, PLATFORMS, TARGET_DURATIONS, labelOf } from "@/lib/constants/domain";
import { formatDateTime, formatDuration } from "@/lib/utils";
import type { Project, ProjectOptions, ProjectRevision } from "@/types/domain";

/** Todas as respostas do briefing + histórico de ajustes. */
export function ProjectBriefing({ project, revisions }: { project: Project; revisions: ProjectRevision[] }) {
  const settings = (project.settings ?? {}) as Record<string, boolean>;
  const options = (project.options ?? {}) as ProjectOptions;
  const enabled = EDIT_SETTINGS.filter((s) => settings[s.key]).map((s) => s.label);
  const rows: [string, string][] = [
    ["Objetivo", labelOf(OBJECTIVES, project.objective)],
    ["Área jurídica", labelOf(LEGAL_AREAS, project.legal_area)],
    ["Estilo", labelOf(EDITING_STYLES, project.editing_style)],
    ["Plataformas", project.platforms.map((p) => labelOf(PLATFORMS, p)).join(", ") || "—"],
    ["Formatos", project.aspect_ratios.join(", ") || "—"],
    ["Legendas", settings.captions ? labelOf(CAPTION_STYLES, options.caption_style ?? "palavra") : "Desativadas"],
    ["CTA final", settings.cta ? `${labelOf(CTA_TYPES, options.cta_type)}${options.cta_text ? ` — ${options.cta_text}` : ""}` : "Sem CTA"],
    ["Duração final", labelOf(TARGET_DURATIONS, options.target_duration ?? "completo")],
    ["Público-alvo", options.audience || "—"],
    ["Trechos a remover", options.cut_ranges?.length ? options.cut_ranges.map((r) => `${r.start}–${r.end}`).join(", ") : "—"],
    ["Referência", options.reference_url || "—"],
    ["Duração original", formatDuration(project.source_duration_sec)],
  ];

  return (
    <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div className="rounded-3xl border border-fg/[0.07] bg-fg/[0.02] p-6 md:p-7">
        <h2 className="font-display text-2xl text-ivory">Briefing do projeto</h2>
        <dl className="mt-5 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
          {rows.map(([k, v]) => (
            <div key={k} className="flex flex-col gap-0.5 border-b border-fg/[0.05] pb-2.5">
              <dt className="text-xs text-mist">{k}</dt>
              <dd className="break-words text-ivory/90">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-6">
          <p className="text-xs text-mist">Configurações</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {enabled.map((e) => (
              <span key={e} className="rounded-full border border-gold/20 bg-gold/[0.06] px-2.5 py-1 text-[0.6875rem] text-gold-light">
                {e}
              </span>
            ))}
          </div>
        </div>
        {project.instructions && (
          <div className="mt-6">
            <p className="text-xs text-mist">Instruções para a IA</p>
            <p className="mt-2 rounded-xl border border-fg/[0.06] bg-ink/50 p-4 text-sm leading-relaxed whitespace-pre-line text-ivory/85">{project.instructions}</p>
          </div>
        )}
      </div>
      <div className="rounded-3xl border border-fg/[0.07] bg-fg/[0.02] p-6 md:p-7">
        <h2 className="font-display text-2xl text-ivory">Ajustes</h2>
        {revisions.length ? (
          <ul className="mt-5 space-y-4">
            {revisions.map((r) => (
              <li key={r.id} className="rounded-xl border border-fg/[0.06] p-4">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-mist">{formatDateTime(r.created_at)}</span>
                  <span className={r.status === "resolved" ? "text-success" : "text-warning"}>
                    {r.status === "resolved" ? "Concluído" : r.status === "in_progress" ? "Em andamento" : "Aberto"}
                  </span>
                </div>
                {r.timestamp_sec != null && <p className="mt-2 font-mono text-xs text-gold-light">em {formatDuration(r.timestamp_sec)}</p>}
                <p className="mt-1 text-sm text-ivory/90">{r.comment}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-mist">Nenhum ajuste solicitado.</p>
        )}
      </div>
    </section>
  );
}
