/**
 * Gera a página inicial estática com o editor de vídeo no navegador
 * (publicada como artifact do claude.ai). Ver preview/README.md.
 *
 *   cd preview && npm install --ignore-scripts && cd .. && npm run build && node preview/build.mjs
 *
 * Saída em preview/dist: index.html, app.js (landing + editor), asr.js
 * (transformers.js, carregado só quando precisa), app.css (o CSS do build do
 * Next), media/ e modelos/ (Whisper base em partes de até 12 MB, com extensão
 * .wasm, um dos tipos que o artifact serve).
 */
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.resolve(HERE, "..");
const OUT = path.join(HERE, "dist");
const CACHE = path.join(HERE, ".cache");
const { build } = createRequire(path.join(ROOT, "package.json"))("esbuild");
const shim = (f) => path.join(HERE, "src/shims", f);
const exts = ["", ".tsx", ".ts", ".jsx", ".js", "/index.tsx", "/index.ts"];
const PART = 12_000_000;
const WHISPER_PKG = "sts-whisper-base@1.0.0";
const WHISPER_ID = "Xenova/whisper-base";
const MODEL_FILES = [
  "config.json",
  "generation_config.json",
  "preprocessor_config.json",
  "tokenizer.json",
  "tokenizer_config.json",
  "special_tokens_map.json",
  "added_tokens.json",
  "normalizer.json",
  "onnx/encoder_model_quantized.onnx",
  "onnx/decoder_model_merged_quantized.onnx",
];

/**
 * O app de verdade roda no navegador: as páginas e as server actions são as
 * mesmas do Next; o que é de servidor (Supabase, e-mail, pagamentos, editor do
 * Claude Managed Agents) troca por versões de demonstração em src/shims.
 */
const FIXED = {
  "next/link": shim("next-link.tsx"),
  "next/image": shim("next-image.tsx"),
  "next/navigation": shim("next-navigation.ts"),
  "next/headers": shim("next-headers.ts"),
  "next/cache": shim("next-cache.ts"),
  "server-only": shim("server-only.ts"),
  "@/lib/supabase/server": shim("supabase-server.ts"),
  "@/lib/supabase/admin": shim("supabase-admin.ts"),
  "@/lib/supabase/client": shim("supabase-client.ts"),
  "@/services/email": shim("email.ts"),
  "@/services/payments": shim("payments.ts"),
  "@/services/editing/dispatch": shim("dispatch.ts"),
  "@/services/editing/claude/session-lifecycle": shim("session-lifecycle.ts"),
  "@/hooks/use-tus-upload": shim("use-tus-upload.ts"),
  "@/lib/actions/assistant": shim("assistant.ts"),
  "@/lib/download": shim("download.ts"),
};
const WRAPPED_ACTIONS = /^@\/lib\/actions\/(account|auth|billing|folders|profile|projects|waitlist)$/;

const aliasPlugin = {
  name: "alias",
  setup(b) {
    b.onResolve({ filter: /.*/ }, (a) => (FIXED[a.path] ? { path: FIXED[a.path] } : undefined));
    // server actions reais, embrulhadas para tratar redirect() como navegação
    b.onResolve({ filter: WRAPPED_ACTIONS }, (a) => ({ path: a.path, namespace: "acoes" }));
    b.onLoad({ filter: /.*/, namespace: "acoes" }, (a) => {
      const file = path.join(ROOT, `${a.path.slice(2)}.ts`);
      const src = fs.readFileSync(file, "utf8");
      const names = [...src.matchAll(/^export async function (\w+)/gm)].map((m) => m[1]);
      const lines = [
        `import * as real from ${JSON.stringify(file)};`,
        `import { wrapAction } from ${JSON.stringify(path.join(HERE, "src/demo/actions.ts"))};`,
        ...names.map((n) => `export const ${n} = wrapAction(real.${n});`),
        `export * from ${JSON.stringify(file)};`,
      ];
      // "export *" não sobrescreve os nomes já exportados acima (tipos e constantes passam direto)
      return { contents: lines.join("\n"), loader: "ts", resolveDir: path.dirname(file) };
    });
    b.onResolve({ filter: /^@\// }, (a) => {
      const base = path.join(ROOT, a.path.slice(2));
      for (const e of exts) if (fs.existsSync(base + e) && fs.statSync(base + e).isFile()) return { path: base + e };
      return { errors: [{ text: `não encontrado: ${a.path}` }] };
    });
  },
};

/** Copia um arquivo em partes de até 12 MB; devolve os caminhos publicados. */
function split(src, publishedBase) {
  const buf = fs.readFileSync(src);
  if (buf.length <= PART && !publishedBase.endsWith(".onnx") && !publishedBase.endsWith(".wasm")) {
    fs.mkdirSync(path.dirname(path.join(OUT, publishedBase)), { recursive: true });
    fs.writeFileSync(path.join(OUT, publishedBase), buf);
    return { parts: [publishedBase], size: buf.length };
  }
  const parts = [];
  for (let i = 0, o = 0; o < buf.length; i++, o += PART) {
    const rel = `${publishedBase}.${i}.wasm`;
    fs.mkdirSync(path.dirname(path.join(OUT, rel)), { recursive: true });
    fs.writeFileSync(path.join(OUT, rel), buf.subarray(o, o + PART));
    parts.push(rel);
  }
  return { parts, size: buf.length };
}

function whisperSource() {
  const dir = path.join(CACHE, "whisper-base");
  if (!fs.existsSync(path.join(dir, "package"))) {
    fs.mkdirSync(dir, { recursive: true });
    const tgz = execFileSync("npm", ["pack", WHISPER_PKG, "--pack-destination", dir, "--silent"], { encoding: "utf8" }).trim().split("\n").pop();
    execFileSync("tar", ["-xzf", path.join(dir, tgz), "-C", dir]);
  }
  return path.join(dir, "package/models", WHISPER_ID);
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, "media"), { recursive: true });
fs.copyFileSync(path.join(HERE, "src/index.html"), path.join(OUT, "index.html"));

// Whisper: modelo + ONNX Runtime (WebAssembly)
const src = whisperSource();
const manifest = {
  modelId: WHISPER_ID,
  files: MODEL_FILES.map((name) => ({ name, ...split(path.join(src, name), `modelos/whisper-base/${name}`) })),
  wasm: { name: "ort-wasm-simd-threaded.jsep.wasm", ...split(path.join(HERE, "node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.jsep.wasm"), "ort/ort-wasm-simd-threaded.jsep.wasm") },
  ortDir: "ort/",
};
fs.copyFileSync(path.join(HERE, "node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.jsep.mjs"), path.join(OUT, "ort/ort-wasm-simd-threaded.jsep.mjs"));

const common = {
  bundle: true,
  minify: true,
  format: "iife",
  target: ["es2020"],
  platform: "browser",
  nodePaths: [path.join(HERE, "node_modules"), path.join(ROOT, "node_modules")],
  logLevel: "warning",
  legalComments: "none",
};

const res = await build({
  ...common,
  entryPoints: [path.join(HERE, "src/entry.tsx")],
  jsx: "automatic",
  outfile: path.join(OUT, "app.js"),
  define: {
    "process.env.NODE_ENV": '"production"',
    __WHISPER__: JSON.stringify(manifest),
  },
  // variáveis de ambiente que o código do app lê (o resto fica vazio)
  banner: {
    js: `var process=globalThis.process||{env:{NODE_ENV:"production",NEXT_PUBLIC_SITE_URL:location.origin,NEXT_PUBLIC_SUPABASE_URL:"https://demo.supabase.local",NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:"demo",HUMAN_REVIEW:"false",VIDEO_EDITING_PROVIDER:"claude"}};`,
  },
  plugins: [aliasPlugin],
  metafile: true,
});

await build({
  ...common,
  entryPoints: [path.join(HERE, "src/asr.ts")],
  outfile: path.join(OUT, "asr.js"),
  define: { "process.env.NODE_ENV": '"production"' },
  logOverride: { "empty-import-meta": "silent" },
});

// Caminhos absolutos /media/... viram relativos à página publicada
const js = fs.readFileSync(path.join(OUT, "app.js"), "utf8").replace(/(["'`])\/media\//g, "$1media/");
fs.writeFileSync(path.join(OUT, "app.js"), js);

const cssDir = path.join(ROOT, ".next/static/chunks");
const css = fs
  .readdirSync(cssDir)
  .filter((f) => f.endsWith(".css"))
  .map((f) => fs.readFileSync(path.join(cssDir, f), "utf8"))
  .find((c) => c.includes("--tw-"))
  .replace(/url\((["']?)\/media\//g, "url($1media/");
if (!css.includes("theme-stage")) throw new Error("CSS do Next sem as classes esperadas: rode `npm run build` antes");
fs.writeFileSync(path.join(OUT, "app.css"), css);

const used = new Set([...(js + css).matchAll(/media\/([\w.-]+\.(?:webp|mp4|png|jpg))/g)].map((m) => m[1]));
for (const f of used) fs.copyFileSync(path.join(ROOT, "public/media", f), path.join(OUT, "media", f));
// vídeos da página Exemplos (caminhos montados em tempo de execução)
fs.cpSync(path.join(ROOT, "public/media/exemplos"), path.join(OUT, "media/exemplos"), { recursive: true });

const kb = (f) => (fs.statSync(path.join(OUT, f)).size / 1024).toFixed(0);
console.log(`app.js ${kb("app.js")} KB · asr.js ${kb("asr.js")} KB · app.css ${kb("app.css")} KB · media ${[...used].join(", ")}`);
const modelMb = [...manifest.files, manifest.wasm].reduce((s, f) => s + f.size, 0) / 1e6;
console.log(`whisper + onnx: ${modelMb.toFixed(1)} MB em ${[...manifest.files, manifest.wasm].reduce((s, f) => s + f.parts.length, 0)} arquivos`);
const inputs = Object.keys(res.metafile.inputs).filter((k) => !k.includes("node_modules"));
console.log("módulos do projeto:", inputs.length);
