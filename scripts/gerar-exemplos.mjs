/**
 * Gera os vídeos da página Exemplos (public/media/exemplos/*.mp4 e .jpg).
 * Monta cada um no Chromium sem tela com o motor de edição do app e depois
 * converte para H.264/AAC (toca em qualquer celular) com o ffmpeg.
 *
 * Uso: npm run exemplos            (todos)
 *      npm run exemplos -- golpe-do-pix
 * Precisa do ffmpeg e do Chromium do Playwright.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "public/media/exemplos");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "exemplos-"));

await esbuild.build({
  entryPoints: [path.join(ROOT, "scripts/exemplos/compor.ts")],
  bundle: true,
  format: "esm",
  outfile: path.join(tmp, "compor.js"),
  tsconfig: path.join(ROOT, "tsconfig.json"),
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "warning",
});
fs.writeFileSync(
  path.join(tmp, "index.html"),
  `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Manrope:wght@400;500;600;700;800&family=Sora:wght@600;700;800&display=swap"><style>:root{--font-sora:"Sora";--font-manrope:"Manrope";--font-instrument:"Instrument Serif"}</style><script type="module" src="compor.js"></script>`,
);

const server = http.createServer((req, res) => {
  const f = path.join(tmp, decodeURIComponent((req.url ?? "/").split("?")[0]).replace(/^\/$/, "/index.html"));
  if (!f.startsWith(tmp) || !fs.existsSync(f)) return res.writeHead(404).end();
  res.writeHead(200, { "content-type": f.endsWith(".js") ? "text/javascript" : "text/html" }).end(fs.readFileSync(f));
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

await esbuild.build({ entryPoints: [path.join(ROOT, "content/exemplos.ts")], bundle: true, format: "esm", outfile: path.join(tmp, "list.mjs"), logLevel: "warning" });
const { exemplos } = await import(path.join(tmp, "list.mjs"));
const only = process.argv.slice(2);
const ids = exemplos.map((e) => e.id).filter((id) => !only.length || only.includes(id));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
fs.mkdirSync(OUT, { recursive: true });
try {
  for (const id of ids) {
    const page = await browser.newPage();
    page.on("pageerror", (e) => console.error("[página]", e.message));
    await page.goto(`http://127.0.0.1:${port}/`);
    await page.waitForFunction(() => window.compor, null, { timeout: 30_000 });
    await page.evaluate(() => document.fonts.ready);
    const t0 = Date.now();
    const r = await page.evaluate((x) => window.compor(x), id);
    await page.close();
    const raw = path.join(tmp, `${id}.vp9.mp4`);
    fs.writeFileSync(raw, Buffer.from(r.b64, "base64"));
    const mp4 = path.join(OUT, `${id}.mp4`);
    execFileSync("ffmpeg", ["-v", "error", "-y", "-i", raw, "-c:v", "libx264", "-preset", "slow", "-crf", "23", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-c:a", "aac", "-b:a", "128k", "-ar", "48000", mp4]);
    execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", "4.6", "-i", mp4, "-frames:v", "1", "-vf", "scale=540:-2", "-q:v", "4", path.join(OUT, `${id}.jpg`)]);
    console.log(`${id}: ${(fs.statSync(mp4).size / 1e6).toFixed(1)} MB em ${((Date.now() - t0) / 1000).toFixed(0)} s · ${r.beats.join(", ")}`);
  }
} finally {
  await browser.close();
  server.close();
  fs.rmSync(tmp, { recursive: true, force: true });
}
