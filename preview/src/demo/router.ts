/**
 * Roteador da página publicada: as rotas do app vivem no hash
 * (#/app/projetos?pasta=...), porque o artifact é uma página só.
 * Âncoras da landing (#exemplos) continuam sendo âncoras da rota "/".
 */
import * as React from "react";

export type Loc = { path: string; search: string; anchor: string };

function parse(): Loc {
  const h = window.location.hash;
  if (!h.startsWith("#/")) return { path: "/", search: "", anchor: h.slice(1) };
  const raw = h.slice(1);
  const q = raw.indexOf("?");
  const path = (q < 0 ? raw : raw.slice(0, q)) || "/";
  return { path: path.length > 1 ? path.replace(/\/$/, "") : path, search: q < 0 ? "" : raw.slice(q), anchor: "" };
}

/** Caminho real da página publicada (as rotas vivem só no hash). */
const BASE = `${window.location.pathname}${window.location.search}`;
const origPush = history.pushState.bind(history);
const origReplace = history.replaceState.bind(history);

let loc = parse();
let version = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());

window.addEventListener("hashchange", () => {
  const next = parse();
  if (next.path !== loc.path || next.search !== loc.search || next.anchor !== loc.anchor) {
    loc = next;
    emit();
  }
});

/** "/app/projetos?x=1" → "#/app/projetos?x=1"; "/#planos" → "#planos". */
export function toHref(url: string) {
  if (url.startsWith("#")) return url;
  const u = new URL(url, "https://tribuna.local");
  if (u.pathname === "/" && u.hash && !u.search) return u.hash;
  if (u.pathname === "/" && !u.search) return "#/";
  return `#${u.pathname}${u.search}`;
}

export function isInternal(url: string) {
  return url.startsWith("/") && !url.startsWith("//") && !url.startsWith("/api/");
}

export function navigate(url: string, opts?: { replace?: boolean; scroll?: boolean }) {
  const href = toHref(url);
  const target = `${BASE}${href === "#/" ? "" : href}`;
  if (opts?.replace) origReplace(null, "", target);
  else origPush(null, "", target);
  const prev = loc;
  loc = parse();
  if (loc.path !== prev.path && opts?.scroll !== false) window.scrollTo({ top: 0 });
  emit();
}

/** Recarrega os dados da rota atual (como o router.refresh do Next). */
export function refresh() {
  version++;
  emit();
}

let refreshQueued = false;
export function scheduleRefresh() {
  if (refreshQueued) return;
  refreshQueued = true;
  queueMicrotask(() => {
    refreshQueued = false;
    refresh();
  });
}

const snapshot = () => `${loc.path}${loc.search}|${loc.anchor}|${version}`;
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => void listeners.delete(fn);
};

export function useLoc(): Loc & { version: number } {
  React.useSyncExternalStore(subscribe, snapshot);
  return { ...loc, version };
}

export const currentLoc = () => loc;

/**
 * O app também troca a URL direto (history.replaceState("/app/novo?id=...")).
 * Na página publicada isso viraria um caminho de verdade e quebraria os
 * arquivos relativos; aqui vira rota no hash.
 */
function patch(orig: typeof history.pushState) {
  return (data: unknown, unused: string, url?: string | URL | null) => {
    const u = typeof url === "string" ? url : url instanceof URL ? url.href : null;
    if (u && u.startsWith("/") && !u.startsWith("//")) {
      orig(data, unused, `${BASE}${toHref(u) === "#/" ? "" : toHref(u)}`);
      loc = parse();
      emit();
      return;
    }
    orig(data, unused, url);
  };
}
history.pushState = patch(origPush);
history.replaceState = patch(origReplace);
