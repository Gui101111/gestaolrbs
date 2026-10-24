/**
 * Rotas da página publicada: as mesmas páginas e layouts do app (Next),
 * chamados no navegador. As páginas de servidor são funções async que
 * buscam dados (no banco de demonstração) e devolvem a árvore de componentes.
 */
import * as React from "react";
import * as MarketingLayout from "@/app/(marketing)/layout";
import * as MarketingHome from "@/app/(marketing)/page";
import * as Terms from "@/app/(marketing)/termos/page";
import * as Privacy from "@/app/(marketing)/privacidade/page";
import * as AuthLayout from "@/app/(auth)/layout";
import * as Login from "@/app/(auth)/entrar/page";
import * as Register from "@/app/(auth)/criar-conta/page";
import * as VerifyEmail from "@/app/(auth)/verificar-email/page";
import * as ForgotPassword from "@/app/(auth)/recuperar-senha/page";
import * as ResetPassword from "@/app/(auth)/nova-senha/page";
import * as AppLayout from "@/app/app/layout";
import AppTemplate from "@/app/app/template";
import * as AppHome from "@/app/app/page";
import * as Projects from "@/app/app/projetos/page";
import * as Folder from "@/app/app/projetos/[pastaId]/page";
import * as Video from "@/app/app/video/[id]/page";
import * as NewVideo from "@/app/app/novo/page";
import * as Settings from "@/app/app/configuracoes/page";
import NotFoundPage from "@/app/not-found";
import { NO_LOGIN } from "@/lib/no-login";
import { ensureGuest } from "./supabase";

/** Sem login, o começo e as telas de entrar levam direto ao app. */
const GUEST_TO_APP = /^\/(entrar|criar-conta|verificar-email|recuperar-senha|nova-senha|login|register)?$/;

type Mod = { default: (props: never) => unknown; metadata?: { title?: unknown } };
type Route = { re: RegExp; params?: string[]; page: Mod; layouts?: Mod[]; template?: boolean; app?: boolean };

const routes: Route[] = [
  { re: /^\/$/, page: MarketingHome, layouts: [MarketingLayout] },
  { re: /^\/termos$/, page: Terms, layouts: [MarketingLayout] },
  { re: /^\/privacidade$/, page: Privacy, layouts: [MarketingLayout] },
  { re: /^\/entrar$/, page: Login, layouts: [AuthLayout] },
  { re: /^\/criar-conta$/, page: Register, layouts: [AuthLayout] },
  { re: /^\/verificar-email$/, page: VerifyEmail, layouts: [AuthLayout] },
  { re: /^\/recuperar-senha$/, page: ForgotPassword, layouts: [AuthLayout] },
  { re: /^\/nova-senha$/, page: ResetPassword, layouts: [AuthLayout] },
  { re: /^\/app$/, page: AppHome, layouts: [AppLayout], template: true, app: true },
  { re: /^\/app\/projetos$/, page: Projects, layouts: [AppLayout], template: true, app: true },
  { re: /^\/app\/projetos\/([^/]+)$/, params: ["pastaId"], page: Folder, layouts: [AppLayout], template: true, app: true },
  { re: /^\/app\/video\/([^/]+)$/, params: ["id"], page: Video, layouts: [AppLayout], template: true, app: true },
  { re: /^\/app\/novo$/, page: NewVideo, layouts: [AppLayout], template: true, app: true },
  { re: /^\/app\/configuracoes$/, page: Settings, layouts: [AppLayout], template: true, app: true },
];

/** Os mesmos redirecionamentos do next.config.ts. */
const REDIRECTS: [RegExp, string][] = [
  [/^\/login$/, "/entrar"],
  [/^\/register$/, "/criar-conta"],
  [/^\/verify-email$/, "/verificar-email"],
  [/^\/forgot-password$/, "/recuperar-senha"],
  [/^\/reset-password$/, "/nova-senha"],
  [/^\/app\/perfil$/, "/app/configuracoes"],
  [/^\/app\/biblioteca$/, "/app/projetos"],
  [/^\/app\/projetos\/novo$/, "/app/novo"],
  [/^\/onboarding$/, "/app"],
  [/^\/app\/(exemplos|como-fazer|marca)$/, "/app"],
  [/^\/app\/assinatura$/, "/app/configuracoes"],
];

export class RouteRedirect {
  constructor(public url: string) {}
}

export type Loaded = { node: React.ReactNode; title: string; app: boolean; notFound?: boolean };

async function call(mod: Mod, props: Record<string, unknown>): Promise<React.ReactNode> {
  const out = (mod.default as (p: Record<string, unknown>) => unknown)(props);
  return (out instanceof Promise ? await out : out) as React.ReactNode;
}

function titleOf(mod: Mod): string {
  const t = mod.metadata?.title;
  if (typeof t === "string") return `${t} · TRIBUNA`;
  return "TRIBUNA — Vídeos jurídicos editados por IA";
}

export async function loadRoute(path: string, search: string): Promise<Loaded> {
  if (NO_LOGIN) {
    ensureGuest();
    if (GUEST_TO_APP.test(path)) throw new RouteRedirect("/app");
  }
  for (const [re, to] of REDIRECTS) if (re.test(path)) throw new RouteRedirect(`${to}${search}`);
  if (path === "/auth/callback" || path === "/auth/confirm") throw new RouteRedirect(new URLSearchParams(search).get("next") || "/app");
  if (path.startsWith("/admin")) throw new RouteRedirect("/app");

  for (const r of routes) {
    const m = path.match(r.re);
    if (!m) continue;
    const params = Object.fromEntries((r.params ?? []).map((k, i) => [k, decodeURIComponent(m[i + 1])]));
    const sp: Record<string, string | string[]> = {};
    new URLSearchParams(search).forEach((v, k) => {
      const cur = sp[k];
      sp[k] = cur === undefined ? v : Array.isArray(cur) ? [...cur, v] : [cur, v];
    });
    let node = await call(r.page, { params: Promise.resolve(params), searchParams: Promise.resolve(sp) });
    if (r.template) node = <AppTemplate key={path}>{node}</AppTemplate>;
    for (const L of [...(r.layouts ?? [])].reverse()) node = await call(L, { children: node, params: Promise.resolve(params) });
    return { node, title: titleOf(r.page), app: Boolean(r.app) };
  }
  return { node: <NotFoundPage />, title: "Página não encontrada · TRIBUNA", app: false, notFound: true };
}

export { NotFoundPage };
