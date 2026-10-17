/**
 * Sobe as fontes da marca e as trilhas de fundo para o bucket editing-assets.
 *   npm run assets:setup
 *
 * Fontes: supabase/assets/fonts/<Familia>-Regular.ttf e -Bold.ttf (Google Fonts, licença OFL).
 * Trilhas: supabase/assets/music/<sobria|inspiradora|neutra>/*.m4a|mp3. As que vêm no
 * projeto são provisórias (sintetizadas por sandbox/gerar_trilhas.py); troque por faixas
 * licenciadas colocando os arquivos nas mesmas pastas e rodando o script de novo.
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "editing-assets";
const ROOT = path.join(process.cwd(), "supabase", "assets");
const MIME: Record<string, string> = { ".ttf": "font/ttf", ".otf": "font/otf", ".m4a": "audio/mp4", ".mp3": "audio/mpeg", ".aac": "audio/aac", ".wav": "audio/wav" };

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]));
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY");
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const files = [...walk(path.join(ROOT, "fonts")), ...walk(path.join(ROOT, "music"))].filter((f) => MIME[path.extname(f).toLowerCase()]);
  let ok = 0;
  for (const file of files) {
    const dest = path.relative(ROOT, file).split(path.sep).join("/");
    const { error } = await supabase.storage.from(BUCKET).upload(dest, fs.readFileSync(file), { contentType: MIME[path.extname(file).toLowerCase()], upsert: true });
    if (error) console.error(`✗ ${dest}: ${error.message}`);
    else {
      ok++;
      console.log(`✓ ${dest}`);
    }
  }
  console.log(`\n${ok}/${files.length} arquivos enviados para ${BUCKET}.`);
}

main().catch((e) => {
  console.error("Falhou:", e instanceof Error ? e.message : e);
  process.exit(1);
});
