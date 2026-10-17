"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bot, CheckCircle2, RefreshCw, Send, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { adminRedispatchAction, adminReleaseReviewAction } from "@/lib/actions/admin";

export type AgentSessionView = {
  provider: string;
  status: string;
  version: number;
  costCents: number | null;
  activeSeconds: number | null;
  followups: number;
  stopReason: string | null;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
  observacoes: string | null;
  cortes: number | null;
  duracaoOriginal: number | null;
  duracaoFinal: number | null;
};

type Alert = { tempo: string; frase: string; motivo: string };

const STATUS: Record<string, { label: string; variant: "cyan" | "warning" | "success" | "danger" | "default" }> = {
  running: { label: "Editando", variant: "cyan" },
  finalizing: { label: "Conferindo arquivos", variant: "cyan" },
  awaiting_followup: { label: "Pedido para concluir", variant: "warning" },
  in_review: { label: "Em revisão", variant: "warning" },
  delivered: { label: "Entregue", variant: "success" },
  failed: { label: "Falhou · fila manual", variant: "danger" },
  archived: { label: "Arquivada", variant: "default" },
};

function money(cents: number | null) {
  return cents == null ? "—" : `US$ ${(cents / 100).toFixed(2)}`;
}

function minutes(sec: number | null) {
  if (sec == null) return "—";
  return sec < 90 ? `${sec}s` : `${Math.round(sec / 60)} min`;
}

/** Edição automática (Claude): estado da sessão, custo, alertas da OAB e liberação. */
export function AgentPanel({
  jobId,
  reviewStatus,
  session,
  alerts,
  claudeReady,
}: {
  jobId: string;
  reviewStatus: string;
  session: AgentSessionView | null;
  alerts: Alert[];
  claudeReady: boolean;
}) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) return void toast.error(res.error);
      toast.success(ok);
      router.refresh();
    });
  const st = session ? (STATUS[session.status] ?? { label: session.status, variant: "default" as const }) : null;

  return (
    <section className="glass rounded-[22px] p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-cyan/10 text-cyan">
            <Bot className="size-5" />
          </span>
          <div>
            <h2 className="font-sans text-base font-bold tracking-normal text-fg">Edição automática</h2>
            <p className="text-xs text-fg-3">
              {session ? `${session.provider === "claude-local" ? "Sandbox local" : "Claude Managed Agents"} · versão v${session.version}` : "Este job ainda não passou pelo agente."}
            </p>
          </div>
        </div>
        {st && <Badge variant={st.variant}>{st.label}</Badge>}
      </div>

      {session && (
        <dl className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          {[
            ["Custo", money(session.costCents)],
            ["Tempo ativo", minutes(session.activeSeconds)],
            ["Cortes", session.cortes ?? "—"],
            ["Duração", session.duracaoFinal != null ? `${session.duracaoOriginal ?? "?"}s → ${session.duracaoFinal}s` : "—"],
          ].map(([k, v]) => (
            <div key={String(k)} className="rounded-xl border border-line bg-surface/60 p-3">
              <dt className="text-xs text-fg-3">{k}</dt>
              <dd className="mt-0.5 font-semibold text-fg tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
      )}

      {session?.observacoes && <p className="mt-4 text-sm text-fg-2">{session.observacoes}</p>}
      {session?.error && <p className="mt-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{session.error}</p>}
      {session && session.followups > 0 && <p className="mt-2 text-xs text-fg-3">Pedidos para concluir enviados: {session.followups}</p>}

      {alerts.length > 0 && (
        <div className="mt-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-warning">
            <ShieldAlert className="size-4" /> Alertas OAB ({alerts.length})
          </p>
          <ul className="mt-2 space-y-2">
            {alerts.map((a, i) => (
              <li key={i} className="rounded-xl border border-line bg-surface/60 p-3 text-sm">
                <span className="mr-2 font-mono text-xs text-fg-3">{a.tempo}</span>
                <span className="text-fg">“{a.frase}”</span>
                <span className="mt-1 block text-xs text-warning">{a.motivo}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {reviewStatus === "pending" && (
          <Button variant="gold" loading={pending} onClick={() => run(() => adminReleaseReviewAction(jobId), "Vídeo liberado para o cliente.")}>
            {!pending && <CheckCircle2 />} Liberar para o cliente
          </Button>
        )}
        <Button
          variant="subtle"
          disabled={pending || !claudeReady}
          title={claudeReady ? undefined : "Configure a chave da Anthropic para usar o Claude"}
          onClick={() => run(() => adminRedispatchAction(jobId, "claude"), "Reprocessamento iniciado com o Claude.")}
        >
          <RefreshCw /> Reprocessar com Claude
        </Button>
        <Button variant="ghost" disabled={pending} onClick={() => run(() => adminRedispatchAction(jobId, "manual"), "Job movido para a fila manual.")}>
          <Send /> Mover para fila manual
        </Button>
      </div>
    </section>
  );
}
