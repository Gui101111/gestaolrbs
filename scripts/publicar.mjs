/**
 * Publica o TRIBUNA de ponta a ponta com um comando:
 *   1. cria (ou reaproveita) o projeto no Supabase e espera ficar pronto;
 *   2. aplica as migrations (tabelas, regras de segurança, buckets);
 *   3. cria (ou reaproveita) o projeto na Vercel ligado ao GitHub, grava as
 *      variáveis e faz o deploy de produção da branch;
 *   4. configura o endereço do site e o login com Google no Supabase.
 *
 * Variáveis (nunca coloque tokens no código):
 *   SUPABASE_ACCESS_TOKEN   supabase.com/dashboard/account/tokens
 *   VERCEL_TOKEN            vercel.com/account/tokens
 *   GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET   (opcional) Google Cloud → Credenciais → ID do cliente OAuth
 *   ANTHROPIC_API_KEY       (opcional) revisão com Claude
 *   NOME=tribuna  REGIAO=sa-east-1  BRANCH=<branch atual>  REPO=Gui101111/gestaolrbs  VERCEL_TEAM_ID  SUPABASE_ORG_ID
 *
 * Uso: npm run publicar
 */
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = process.env;
const NOME = env.NOME ?? "tribuna";
const REGIAO = env.REGIAO ?? "sa-east-1";
const REPO = env.REPO ?? "Gui101111/gestaolrbs";
const BRANCH = env.BRANCH ?? execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: ROOT }).toString().trim();
const SUPA = env.SUPABASE_ACCESS_TOKEN;
const VERCEL = env.VERCEL_TOKEN;

if (!SUPA || !VERCEL) {
  console.error("Defina SUPABASE_ACCESS_TOKEN e VERCEL_TOKEN (veja o topo deste arquivo).");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (m) => console.log(`• ${m}`);

async function call(base, token, route, init = {}) {
  const res = await fetch(base + route, { ...init, headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...(init.headers ?? {}) } });
  const text = await res.text();
  if (!res.ok) throw new Error(`${init.method ?? "GET"} ${route} → ${res.status} ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : null;
}
const sb = (route, init) => call("https://api.supabase.com/v1", SUPA, route, init);
const withTeam = (route) => (env.VERCEL_TEAM_ID ? `${route}${route.includes("?") ? "&" : "?"}teamId=${env.VERCEL_TEAM_ID}` : route);
const vc = (route, init) => call("https://api.vercel.com", VERCEL, withTeam(route), init);
const sql = (ref, query) => sb(`/projects/${ref}/database/query`, { method: "POST", body: JSON.stringify({ query }) });

// ---------------------------------------------------------------- Supabase
const orgs = await sb("/organizations");
const org = env.SUPABASE_ORG_ID ?? orgs[0]?.id;
if (!org) throw new Error("Nenhuma organização no Supabase. Crie uma em supabase.com/dashboard.");
let project = (await sb("/projects")).find((p) => p.name === NOME);
if (!project) {
  log(`Criando o projeto "${NOME}" no Supabase (${REGIAO})…`);
  project = await sb("/projects", { method: "POST", body: JSON.stringify({ name: NOME, organization_id: org, region: REGIAO, db_pass: crypto.randomBytes(24).toString("base64url") }) });
} else log(`Projeto "${NOME}" já existe no Supabase.`);
const ref = project.id;
for (let i = 0; ; i++) {
  const p = await sb(`/projects/${ref}`);
  if (p.status === "ACTIVE_HEALTHY") break;
  if (i > 90) throw new Error(`O projeto do Supabase não ficou pronto (status ${p.status}).`);
  if (i % 6 === 0) log(`Esperando o Supabase ficar pronto (${p.status})…`);
  await sleep(10_000);
}
const supabaseUrl = `https://${ref}.supabase.co`;
const keys = await sb(`/projects/${ref}/api-keys?reveal=true`);
const publishable = keys.find((k) => k.type === "publishable")?.api_key ?? keys.find((k) => k.name === "anon")?.api_key;
const secret = keys.find((k) => k.type === "secret")?.api_key ?? keys.find((k) => k.name === "service_role")?.api_key;
if (!publishable || !secret) throw new Error("Não encontrei as chaves do projeto no Supabase.");

log("Aplicando as migrations…");
await sql(ref, "create schema if not exists supabase_migrations; create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text);");
const done = new Set(((await sql(ref, "select version from supabase_migrations.schema_migrations")) ?? []).map((r) => r.version));
const dir = path.join(ROOT, "supabase/migrations");
for (const f of fs.readdirSync(dir).filter((x) => /^\d+_.+\.sql$/.test(x)).sort()) {
  const [version, ...rest] = f.replace(/\.sql$/, "").split("_");
  if (done.has(version)) continue;
  const body = fs.readFileSync(path.join(dir, f), "utf8");
  await sql(ref, `begin;\n${body}\n;\ninsert into supabase_migrations.schema_migrations (version, name, statements) values ('${version}', '${rest.join("_").replace(/'/g, "''")}', '{}');\ncommit;`);
  log(`  ${f}`);
}

// ------------------------------------------------------------------ Vercel
let vproj = await vc(`/v9/projects/${encodeURIComponent(NOME)}`).catch(() => null);
if (!vproj) {
  log(`Criando o projeto "${NOME}" na Vercel ligado a ${REPO}…`);
  vproj = await vc("/v11/projects", { method: "POST", body: JSON.stringify({ name: NOME, framework: "nextjs", gitRepository: { type: "github", repo: REPO } }) });
} else log(`Projeto "${NOME}" já existe na Vercel.`);
const vars = {
  NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishable,
  SUPABASE_SECRET_KEY: secret,
  VIDEO_EDITING_PROVIDER: "navegador",
  CRON_SECRET: crypto.randomBytes(24).toString("base64url"),
  JOBS_CALLBACK_SECRET: crypto.randomBytes(24).toString("base64url"),
  ...(env.ANTHROPIC_API_KEY ? { ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY } : {}),
};
await vc(`/v10/projects/${vproj.id}/env?upsert=true`, {
  method: "POST",
  body: JSON.stringify(Object.entries(vars).map(([key, value]) => ({ key, value, type: key.startsWith("NEXT_PUBLIC_") ? "plain" : "encrypted", target: ["production", "preview", "development"] }))),
});
log("Variáveis gravadas na Vercel.");

const [owner, repo] = REPO.split("/");
log(`Publicando a branch ${BRANCH} em produção…`);
const dep = await vc("/v13/deployments", { method: "POST", body: JSON.stringify({ name: NOME, project: vproj.id, target: "production", gitSource: { type: "github", org: owner, repo, ref: BRANCH } }) });
let state = dep.readyState;
for (let i = 0; !["READY", "ERROR", "CANCELED"].includes(state); i++) {
  if (i > 120) throw new Error("O deploy demorou demais; veja o painel da Vercel.");
  await sleep(10_000);
  state = (await vc(`/v13/deployments/${dep.id}`)).readyState;
  if (i % 3 === 0) log(`  deploy: ${state}`);
}
if (state !== "READY") throw new Error(`O deploy terminou com ${state}; veja os logs no painel da Vercel.`);
const domains = (await vc(`/v9/projects/${vproj.id}/domains`)).domains ?? [];
const domain = domains.find((d) => d.name.endsWith(".vercel.app"))?.name ?? domains[0]?.name ?? dep.url;
const site = `https://${domain}`;

// ------------------------------------------------------- endereço e Google
const auth = { site_url: site, uri_allow_list: `${site}/**` };
if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) Object.assign(auth, { external_google_enabled: true, external_google_client_id: env.GOOGLE_CLIENT_ID, external_google_secret: env.GOOGLE_CLIENT_SECRET });
await sb(`/projects/${ref}/config/auth`, { method: "PATCH", body: JSON.stringify(auth) });

console.log(`
Pronto! O TRIBUNA está no ar em ${site}
${
  env.GOOGLE_CLIENT_ID
    ? `Login com Google ligado. No Google Cloud (ID do cliente OAuth), confira o URI de redirecionamento autorizado:\n  ${supabaseUrl}/auth/v1/callback`
    : `Para ligar o Google: crie o ID do cliente OAuth com o URI de redirecionamento\n  ${supabaseUrl}/auth/v1/callback\ne rode de novo com GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET.`
}
Admin: depois de se cadastrar, rode no SQL Editor do Supabase:
  update public.profiles set role = 'admin' where email = 'seu@email';`);
