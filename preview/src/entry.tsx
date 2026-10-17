import * as React from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MotionProvider } from "@/components/animations/motion-provider";
import { THEME_STORAGE_KEY } from "@/components/theme/theme-provider";
import { DemoApp } from "./demo/app";
import { db } from "./demo/db";
import { navigate } from "./demo/router";
import { seed } from "./demo/seed";
import { setSession } from "./demo/supabase";
import { resumePendingJobs } from "./demo/worker";
import { loadRoute } from "./demo/routes";

document.documentElement.lang = "pt-BR";
try {
  const t = localStorage.getItem(THEME_STORAGE_KEY);
  document.documentElement.dataset.theme = t === "claro" ? "claro" : "grafite";
} catch {
  document.documentElement.dataset.theme = "grafite";
}

// "#/demo/recomecar" apaga a demonstração deste navegador
if (window.location.hash.startsWith("#/demo/recomecar")) {
  db.reset();
  setSession(null);
  try {
    indexedDB.deleteDatabase("tribuna-demo");
  } catch {
    // ignora
  }
  navigate("/", { replace: true });
}
// link antigo do editor rápido
if (window.location.hash === "#editor") navigate("/app/novo", { replace: true });

seed();

// Chamadas às rotas /api do app não existem na página publicada
const realFetch = window.fetch.bind(window);
window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url.startsWith("/api/")) return Promise.resolve(new Response(null, { status: 204 }));
  return realFetch(input, init);
};

resumePendingJobs();

// para depurar no console do navegador
(window as unknown as { __tribunaDemo: unknown }).__tribunaDemo = { db, loadRoute, navigate };

createRoot(document.getElementById("tribuna-root")!).render(
  <MotionProvider>
    <TooltipProvider delayDuration={250}>
      <DemoApp />
    </TooltipProvider>
    <Toaster />
  </MotionProvider>,
);
