// Confere se alguma chave de câmera/badge/bigWord passa do fim da cena (uso: node checkkeys.mjs <projeto>)
import { build } from "esbuild";
import path from "node:path";
const proj = path.resolve(process.argv[2]);
const out = path.join(proj, "out", "scenes-check.cjs");
await build({ entryPoints: [path.join(proj, "src/data/scenes.ts")], bundle: true, platform: "node", format: "cjs", outfile: out, logLevel: "silent", external: ["remotion"] });
const { createRequire } = await import("node:module");
const req = createRequire(import.meta.url);
const m = req(out);
let bad = 0;
for (const sc of m.scenes) {
  for (const k of sc.camera.keys) if (k.at > sc.durationInFrames || k.at < 0) { console.log("CAMERA", sc.id, k.at, ">", sc.durationInFrames); bad++; }
  for (let i = 1; i < sc.camera.keys.length; i++) if (sc.camera.keys[i].at < sc.camera.keys[i - 1].at) { console.log("ORDEM", sc.id, sc.camera.keys[i - 1].at, sc.camera.keys[i].at); bad++; }
}
console.log(bad ? `${bad} problema(s)` : "ok");
