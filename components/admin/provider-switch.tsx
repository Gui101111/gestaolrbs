"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bot, Hand, Server } from "lucide-react";
import { toast } from "sonner";
import { adminSetEditingProviderAction } from "@/lib/actions/admin";
import { cn } from "@/lib/utils";

type Key = "manual" | "claude" | "external";

const OPTIONS: { key: Key; label: string; text: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "manual", label: "Manual", text: "A equipe edita e entrega pelo painel.", icon: Hand },
  { key: "claude", label: "Claude", text: "O agente edita; a equipe revisa.", icon: Bot },
  { key: "external", label: "Worker externo", text: "Servidor próprio com FFmpeg.", icon: Server },
];

/** Motor de edição dos próximos envios, trocável sem deploy. */
export function ProviderSwitch({
  active,
  override,
  envDefault,
  claudeStatus,
  inReview,
  humanReview,
}: {
  active: string;
  override: string | null;
  envDefault: string;
  claudeStatus: "api" | "local" | "missing";
  inReview: { id: string; name: string }[];
  humanReview: boolean;
}) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const choose = (key: Key | "env") =>
    start(async () => {
      const res = await adminSetEditingProviderAction(key);
      if (!res.ok) return void toast.error(res.error);
      toast.success("Motor de edição atualizado.");
      router.refresh();
    });

  return (
    <section className="glass rounded-[22px] p-5 md:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-sans text-base font-bold tracking-normal text-fg">Motor de edição</h2>
        <p className="text-xs text-fg-3">
          Padrão do ambiente: <span className="font-semibold text-fg-2">{envDefault}</span>
          {override && (
            <>
              {" · "}
              <button type="button" className="text-link underline-offset-4 hover:underline" onClick={() => choose("env")} disabled={pending}>
                voltar ao padrão
              </button>
            </>
          )}
        </p>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Motor de edição">
        {OPTIONS.map((o) => {
          const on = active === o.key;
          const disabled = pending || (o.key === "claude" && claudeStatus === "missing");
          return (
            <button
              key={o.key}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={disabled}
              onClick={() => choose(o.key)}
              className={cn(
                "rounded-2xl border p-4 text-left transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50",
                on ? "border-cyan/60 bg-cyan/[0.07] shadow-[0_0_24px_-10px_var(--cyan)]" : "border-line hover:border-line-strong",
              )}
            >
              <span className="flex items-center gap-2 text-sm font-bold text-fg">
                <o.icon className="size-4 text-cyan" /> {o.label}
              </span>
              <span className="mt-1 block text-xs text-fg-3">{o.text}</span>
              {o.key === "claude" && (
                <span className="mt-2 block text-[0.6875rem] font-semibold text-fg-2">
                  {claudeStatus === "api" ? "Chave configurada" : claudeStatus === "local" ? "Sandbox local (desenvolvimento)" : "Falta ANTHROPIC_API_KEY / CLAUDE_AGENT_ID"}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-fg-3">
        Revisão humana {humanReview ? "ligada: vídeos do Claude esperam sua liberação." : "desligada: vídeos do Claude vão direto ao cliente."}
      </p>
      {inReview.length > 0 && (
        <div className="mt-4 rounded-2xl border border-warning/35 bg-warning/[0.07] p-4">
          <p className="text-sm font-semibold text-fg">Aguardando sua revisão ({inReview.length})</p>
          <ul className="mt-2 space-y-1 text-sm">
            {inReview.map((p) => (
              <li key={p.id}>
                <Link href={`/admin/projetos/${p.id}`} className="text-link underline-offset-4 hover:underline">
                  {p.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
