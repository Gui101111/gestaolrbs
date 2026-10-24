import { ShieldAlert } from "lucide-react";

export type ComplianceAlert = { tempo: string; tempoSec: number | null; frase: string; motivo: string };

/** Falas sinalizadas na revisão OAB (Provimento 205/2021). Nada é cortado: o advogado decide. */
export function ComplianceAlerts({ alerts }: { alerts: ComplianceAlert[] }) {
  if (!alerts.length) return null;
  return (
    <section aria-labelledby="oab-titulo" className="rounded-[22px] border border-warning/35 bg-warning/[0.07] p-5 md:p-6">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-warning/15 text-warning">
          <ShieldAlert className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 id="oab-titulo" className="font-sans text-base font-bold tracking-normal text-fg">
            Pontos de atenção · OAB
          </h2>
          <p className="mt-0.5 text-sm text-fg-2">Revise antes de publicar. Nada foi cortado.</p>
        </div>
      </div>
      <ul className="mt-4 space-y-2.5">
        {alerts.map((a, i) => (
          <li key={i} className="flex gap-3 rounded-2xl border border-line bg-surface/70 p-3.5">
            <span className="mt-0.5 shrink-0 rounded-md bg-fg/[0.06] px-1.5 py-0.5 font-mono text-xs text-fg-2 tabular-nums">{a.tempo || "—"}</span>
            <div className="min-w-0">
              <p className="text-sm text-fg">“{a.frase}”</p>
              <p className="mt-1 text-xs font-semibold text-warning">{a.motivo}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
