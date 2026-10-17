import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Hand, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotFoundSignal, RedirectSignal } from "../shims/next-navigation";
import { startDownload } from "../shims/download";
import { onGesture } from "./deps";
import { navigate, refresh, useLoc } from "./router";
import { loadRoute, NotFoundPage, RouteRedirect } from "./routes";
import { currentUserId } from "./supabase";

type View = { node: React.ReactNode; key: string };

function GesturePrompt() {
  const [fn, setFn] = React.useState<(() => void) | null>(null);
  React.useEffect(() => onGesture((f) => setFn(() => f)), []);
  if (!fn) return null;
  return (
    <div className="fixed inset-0 z-[95] grid place-items-center bg-black/70 p-6 backdrop-blur-sm">
      <div className="max-w-sm rounded-[26px] border border-line bg-surface p-6 text-center shadow-[var(--shadow-pop)]">
        <Hand className="mx-auto size-8 text-gold" />
        <p className="mt-3 font-display text-lg font-bold text-fg">Toque para continuar</p>
        <p className="mt-1 text-sm text-fg-2">Este navegador pede um toque para tocar o vídeo enquanto gravamos a edição.</p>
        <Button variant="gold" size="lg" className="mt-5 w-full" onClick={() => fn()}>
          Continuar a edição
        </Button>
      </div>
    </div>
  );
}

/** Na demonstração o e-mail já sai confirmado: um atalho para seguir. */
function VerifyShortcut() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed inset-x-4 bottom-4 z-[60] mx-auto max-w-md rounded-[22px] border border-cyan/40 bg-surface/95 p-4 shadow-[var(--glow-cyan)] backdrop-blur-xl"
    >
      <div className="flex items-start gap-3">
        <MailCheck className="mt-0.5 size-5 shrink-0 text-cyan" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-fg">Nesta prévia o e-mail já está confirmado.</p>
          <p className="mt-0.5 text-xs text-fg-2">No app publicado, o link chega na sua caixa de entrada.</p>
        </div>
      </div>
      <Button variant="gold" className="mt-3 w-full" onClick={() => navigate("/onboarding")}>
        Continuar
      </Button>
    </motion.div>
  );
}

export function DemoApp() {
  const loc = useLoc();
  const [view, setView] = React.useState<View | null>(null);
  const [busy, setBusy] = React.useState(false);
  const seq = React.useRef(0);
  const routeKey = `${loc.path}${loc.search}`;

  React.useEffect(() => {
    const id = ++seq.current;
    const t = window.setTimeout(() => id === seq.current && setBusy(true), 160);
    loadRoute(loc.path, loc.search)
      .then((r) => {
        if (id !== seq.current) return;
        document.title = r.title;
        setView({ node: r.node, key: r.app ? "app" : loc.path });
      })
      .catch((e: unknown) => {
        if (id !== seq.current) return;
        if (e instanceof RedirectSignal || e instanceof RouteRedirect) {
          navigate(e.url, { replace: true });
          return;
        }
        if (e instanceof NotFoundSignal) {
          setView({ node: <NotFoundPage />, key: "404" });
          return;
        }
        console.error("[demo] rota falhou", e);
        setView({
          node: (
            <div className="grid min-h-dvh place-items-center bg-canvas p-6 text-center">
              <div>
                <p className="eyebrow">Algo deu errado</p>
                <p className="mt-3 font-display text-3xl text-fg">Não conseguimos abrir esta tela.</p>
                <p className="mt-2 text-sm text-fg-2">{e instanceof Error ? e.message : String(e)}</p>
                <div className="mt-6 flex justify-center gap-2">
                  <Button variant="gold" onClick={() => refresh()}>
                    Tentar de novo
                  </Button>
                  <Button variant="glass" onClick={() => navigate("/")}>
                    Ir para o início
                  </Button>
                </div>
              </div>
            </div>
          ),
          key: "erro",
        });
      })
      .finally(() => {
        window.clearTimeout(t);
        if (id === seq.current) setBusy(false);
      });
    return () => window.clearTimeout(t);
    // a versão muda com router.refresh() e revalidatePath()
  }, [loc.path, loc.search, loc.version, routeKey]);

  // Downloads (/api/projects/:id/download) e chamadas de progresso não saem da página
  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      const href = a?.getAttribute("href") ?? "";
      if (/^\/api\/projects\/[^/]+\/download/.test(href)) {
        e.preventDefault();
        void startDownload(href);
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return (
    <>
      <AnimatePresence>
        {busy && (
          <motion.div
            key="barra"
            initial={{ scaleX: 0, opacity: 1 }}
            animate={{ scaleX: 0.85, transition: { duration: 2.4, ease: [0.22, 1, 0.36, 1] } }}
            exit={{ scaleX: 1, opacity: 0, transition: { duration: 0.3 } }}
            className="fixed inset-x-0 top-0 z-[90] h-0.5 origin-left bg-brand-gradient shadow-[0_0_12px_var(--cyan)]"
          />
        )}
      </AnimatePresence>
      {view ? <React.Fragment key={view.key}>{view.node}</React.Fragment> : <div className="grid min-h-dvh place-items-center bg-canvas font-display text-2xl tracking-[0.4em] text-gold">TRIBUNA</div>}
      {loc.path === "/verificar-email" && currentUserId() && <VerifyShortcut />}
      <GesturePrompt />
    </>
  );
}
