import type { Metadata } from "next";
import { LogoTile } from "@/components/Logo";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = { title: `Entrar · ${BRAND.name}` };

/**
 * Shown when APP_PASSWORD is set and the device hasn't signed in yet. A plain
 * form post, so it works before any client script loads. It covers the
 * sidebar from the root layout, whose links would only lead back here.
 */
export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ voltar?: string; erro?: string }>;
}) {
  const { voltar = "/", erro } = await searchParams;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-bg px-4 py-10">
      <form
        method="post"
        action="/api/entrar"
        className="w-full max-w-sm space-y-4 rounded-xl border border-edge-soft bg-panel p-6"
      >
        <LogoTile className="size-10" />
        <div>
          <h1 className="text-lg font-bold tracking-tight">{BRAND.name}</h1>
          <p className="mt-1 text-sm text-muted">
            Digite a senha de acesso definida no computador onde o app está rodando.
          </p>
        </div>

        <input type="hidden" name="voltar" value={voltar} />
        <label className="block space-y-1.5">
          <span className="text-sm text-text-2">Senha</span>
          <input
            type="password"
            name="senha"
            required
            autoFocus
            autoComplete="current-password"
            className="w-full rounded-lg border border-edge bg-panel-2 px-3 py-2 text-base outline-none focus:border-accent/50"
          />
        </label>
        {erro && <p className="text-sm text-danger">Senha incorreta. Tente novamente.</p>}

        <button
          type="submit"
          className="w-full rounded-lg bg-accent px-5 py-2.5 text-base font-bold text-accent-ink transition-opacity hover:opacity-90"
        >
          Entrar
        </button>
      </form>
    </div>
  );
}
