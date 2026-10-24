/**
 * Gera public/vendor/asr/: transformers.js (reconhecimento de fala no
 * navegador) e o ONNX Runtime em WebAssembly, servidos pelo próprio site.
 * Roda antes do `next build` e do `next dev`; a pasta não vai para o git.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "public/vendor/asr");
const DIST = path.join(ROOT, "node_modules/@huggingface/transformers/dist");

fs.mkdirSync(OUT, { recursive: true });
await esbuild.build({
  entryPoints: [path.join(ROOT, "scripts/asr/entrada.ts")],
  bundle: true,
  format: "iife",
  minify: true,
  outfile: path.join(OUT, "asr.js"),
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "warning",
});
for (const f of ["ort-wasm-simd-threaded.jsep.mjs", "ort-wasm-simd-threaded.jsep.wasm"]) fs.copyFileSync(path.join(DIST, f), path.join(OUT, f));
console.log("public/vendor/asr pronto");
