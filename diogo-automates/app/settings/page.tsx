"use client";

import { useEffect, useState } from "react";
import { AFFILIATE } from "@/lib/brand";
import { formatBytes, formatUsd } from "@/lib/shared";
import { formatBrl, type ExchangeRate } from "@/lib/currency";
import ExchangeNote from "@/components/ExchangeNote";

export default function SettingsPage() {
  const [keyId, setKeyId] = useState("");
  const [keySecret, setKeySecret] = useState("");
  const [hasSecret, setHasSecret] = useState(false);
  const [source, setSource] = useState<string | null>(null);
  const [maxConcurrent, setMaxConcurrent] = useState(4);
  const [spendCap, setSpendCap] = useState("");
  const [saved, setSaved] = useState(false);
  const [stats, setStats] = useState<{ diskBytes: number; outputs: number; allTime: { usd: number }; exchange: ExchangeRate | null } | null>(null);

  useEffect(() => {
    void (async () => {
      const [s, st] = await Promise.all([
        fetch("/api/settings", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/stats", { cache: "no-store" }).then((r) => r.json()).catch(() => null),
      ]);
      setKeyId(s.keyId ?? "");
      setHasSecret(Boolean(s.hasSecret));
      setSource(s.source ?? null);
      setMaxConcurrent(s.maxConcurrent ?? 4);
      setSpendCap(s.spendCap ?? "");
      setStats(st);
    })();
  }, []);

  async function save() {
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyId, keySecret, maxConcurrent, spendCap }),
    });
    if (keySecret.trim()) {
      setHasSecret(true);
      setSource("database");
    }
    setKeySecret("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  }

  return (
    <div className="h-full overflow-y-auto">
      <header className="flex h-[68px] items-center border-b border-edge-soft px-7">
        <h1 className="text-xl font-bold tracking-tight">Configurações</h1>
      </header>

      <div className="mx-auto max-w-2xl space-y-7 px-6 py-7">
        <section className="space-y-4 rounded-xl border border-edge-soft bg-panel p-5">
          <div>
            <h2 className="text-base font-semibold">Chave de API do Higgsfield</h2>
            <p className="mt-1 text-xs leading-relaxed text-faint">
              A chave tem duas partes. Crie uma no{" "}
              <a
                href={AFFILIATE.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline decoration-dotted underline-offset-2 hover:text-text"
              >
                Console do Higgsfield
              </a>
              , depois cole as duas partes aqui. Elas ficam no banco de dados local deste computador,
              e o segredo salvo nunca é enviado de volta ao navegador.
            </p>
          </div>

          {source === "environment" && (
            <p className="rounded-lg border border-accent/25 bg-accent/5 px-3 py-2.5 text-xs leading-relaxed text-muted">
              Uma chave já foi carregada de <code className="text-text">.env.local</code>.
              Não é necessário configurar outra. A chave informada abaixo terá prioridade neste computador.
            </p>
          )}

          <Field label="ID da chave">
            <input
              value={keyId}
              onChange={(e) => setKeyId(e.target.value)}
              placeholder="00000000-0000-0000-0000-000000000000"
              className="w-full rounded-lg border border-edge bg-panel-2 px-3 py-2 font-mono text-sm outline-none focus:border-accent/50"
            />
          </Field>

          <Field label="Segredo da chave">
            <input
              type="password"
              value={keySecret}
              onChange={(e) => setKeySecret(e.target.value)}
              placeholder={hasSecret ? "•••••••• (salvo — deixe em branco para manter)" : "Segredo de 64 caracteres"}
              className="w-full rounded-lg border border-edge bg-panel-2 px-3 py-2 font-mono text-sm outline-none focus:border-accent/50"
            />
          </Field>
        </section>

        <section className="space-y-4 rounded-xl border border-edge-soft bg-panel p-5">
          <h2 className="text-base font-semibold">Limites</h2>

          <Field
            label="Solicitações simultâneas"
            hint="O Higgsfield rejeita solicitações acima do limite da conta: 4 por padrão. As demais ficam na fila local."
          >
            <input
              type="number"
              min={1}
              max={16}
              value={maxConcurrent}
              onChange={(e) => setMaxConcurrent(Number(e.target.value))}
              className="w-28 rounded-lg border border-edge bg-panel-2 px-3 py-2 text-sm outline-none focus:border-accent/50"
            />
          </Field>

          <Field
            label="Limite de gastos (USD a cada 30 dias)"
            hint="Bloqueia novas gerações quando o gasto estimado ultrapassa este valor. Deixe em branco para não definir um limite."
          >
            <input
              type="number"
              min={0}
              step="0.01"
              value={spendCap}
              onChange={(e) => setSpendCap(e.target.value)}
              placeholder="sem limite"
              className="w-36 rounded-lg border border-edge bg-panel-2 px-3 py-2 text-sm outline-none focus:border-accent/50"
            />
            {spendCap !== "" && Number.isFinite(Number(spendCap)) && Number(spendCap) >= 0 && (
              <span className="mt-2 block text-xs text-accent">Equivalente estimado: {formatBrl(Number(spendCap), stats?.exchange?.rate)}</span>
            )}
          </Field>
        </section>

        <section className="rounded-xl border border-edge-soft bg-panel p-5">
          <h2 className="text-base font-semibold">Armazenamento</h2>
          <p className="mt-1 text-xs leading-relaxed text-faint">
            O Higgsfield exclui os arquivos gerados após cerca de sete dias. Por isso, cada resultado é
            baixado para <code className="text-muted">storage/media</code> neste projeto e
            disponibilizado a partir dessa pasta.
          </p>
          <dl className="mt-3 grid grid-cols-3 gap-3 border-t border-edge-soft pt-3 text-xs">
            <div>
              <dt className="text-faint">Arquivos</dt>
              <dd className="mt-0.5 font-mono text-text">{stats?.outputs ?? 0}</dd>
            </div>
            <div>
              <dt className="text-faint">Espaço em disco</dt>
              <dd className="mt-0.5 font-mono text-text">{formatBytes(stats?.diskBytes ?? 0)}</dd>
            </div>
            <div>
              <dt className="text-faint">Total gasto</dt>
              <dd className="mt-0.5 font-mono text-text">{formatUsd(stats?.allTime.usd ?? 0)}</dd>
              <dd className="mt-1 font-mono text-accent">≈ {formatBrl(stats?.allTime.usd, stats?.exchange?.rate)}</dd>
            </div>
          </dl>
        </section>

        <ExchangeNote exchange={stats ? stats.exchange : undefined} />

        <div className="flex items-center gap-3">
          <button
            onClick={save}
            className="rounded-lg bg-accent px-5 py-2.5 text-base font-bold text-accent-ink transition-opacity hover:opacity-90"
          >
            Salvar
          </button>
          {saved && <span className="text-sm text-accent">Salvo</span>}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs leading-relaxed text-faint">{hint}</span>}
    </label>
  );
}
