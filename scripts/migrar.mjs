/**
 * Aplica as migrations de supabase/migrations no banco de produção durante o
 * build da Vercel (a integração Supabase da Vercel cria POSTGRES_URL_NON_POOLING).
 * Registra o que já rodou na mesma tabela do Supabase CLI, então `supabase db push`
 * continua funcionando depois. Sem banco configurado, ou em builds de prévia, não faz nada.
 *
 * Uso manual: SUPABASE_DB_URL=postgres://... node scripts/migrar.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const url = process.env.SUPABASE_DB_URL ?? process.env.POSTGRES_URL_NON_POOLING;

if (!url) {
  console.log("migrar: nenhum banco configurado (SUPABASE_DB_URL ou POSTGRES_URL_NON_POOLING); nada a fazer.");
  process.exit(0);
}
if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
  console.log(`migrar: build de ${process.env.VERCEL_ENV}; as migrations só rodam no deploy de produção.`);
  process.exit(0);
}

const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
const sql = postgres(url, { ssl: local ? false : "require", max: 1, prepare: false, onnotice: () => {} });
try {
  await sql`create schema if not exists supabase_migrations`;
  await sql`create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text)`;
  const done = new Set((await sql`select version from supabase_migrations.schema_migrations`).map((r) => r.version));
  const dir = path.join(ROOT, "supabase/migrations");
  const files = fs.readdirSync(dir).filter((f) => /^\d+_.+\.sql$/.test(f)).sort();
  let applied = 0;
  for (const f of files) {
    const [version, ...rest] = f.replace(/\.sql$/, "").split("_");
    if (done.has(version)) continue;
    const body = fs.readFileSync(path.join(dir, f), "utf8");
    await sql.begin(async (tx) => {
      await tx.unsafe(body);
      await tx`insert into supabase_migrations.schema_migrations (version, name, statements) values (${version}, ${rest.join("_")}, ${[body]})`;
    });
    console.log(`migrar: aplicada ${f}`);
    applied++;
  }
  console.log(applied ? `migrar: ${applied} migration(s) aplicada(s).` : "migrar: banco já atualizado.");
} catch (e) {
  console.error("migrar: falhou —", e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
