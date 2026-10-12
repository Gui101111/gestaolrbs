/**
 * Gera as fotos otimizadas (WebP) do site.
 *
 * 1. Coloque os arquivos originais em /assets-src com os nomes abaixo.
 * 2. Ajuste `crop` (frações 0–1 da imagem original) para mostrar SOMENTE a foto,
 *    sem barras do celular, interface do Google/Instagram ou faixas pretas.
 * 3. Rode `npm run images`.
 *
 * Se o original não existir, é gerado um placeholder na paleta Berry's.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const SRC = path.resolve("assets-src");
const OUT = path.resolve("public/images");

// crop: { left, top, width, height } em frações da imagem original
const images = [
  { out: "interior", src: "1000311595.jpg", w: 1600, h: 1067, crop: { left: 0, top: 0.14, width: 1, height: 0.62 } },
  { out: "balcao", src: "1000311599.jpg", w: 1600, h: 1067, crop: { left: 0, top: 0.14, width: 1, height: 0.62 } },
  { out: "self-service", src: "1000311601.jpg", w: 1200, h: 1500, crop: { left: 0, top: 0.12, width: 1, height: 0.72 } },
  { out: "toppings", src: "1000311600.jpg", w: 1600, h: 1200, crop: { left: 0, top: 0.12, width: 1, height: 0.72 } },
  { out: "ambiente", src: "1000311598.jpg", w: 1600, h: 1200, crop: { left: 0, top: 0.12, width: 1, height: 0.72 } },
  { out: "fachada", src: "1000311602.jpg", w: 1200, h: 1500, crop: { left: 0, top: 0.12, width: 1, height: 0.72 } },
  { out: "copos", src: "1000311597.jpg", w: 1200, h: 1500, crop: { left: 0, top: 0.1, width: 1, height: 0.6 } },
];

const palettes = [
  ["#50C1E8", "#087AA9"],
  ["#EFF7FA", "#25A9D6"],
  ["#25A9D6", "#104D72"],
  ["#B7804D", "#25A9D6"],
];

function placeholderSvg(w, h, i) {
  const [a, b] = palettes[i % palettes.length];
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <circle cx="${w * 0.78}" cy="${h * 0.22}" r="${Math.min(w, h) * 0.32}" fill="#fff" opacity=".16"/>
  <circle cx="${w * 0.18}" cy="${h * 0.82}" r="${Math.min(w, h) * 0.22}" fill="#fff" opacity=".12"/>
  <path d="M0 ${h * 0.7} C ${w * 0.25} ${h * 0.6}, ${w * 0.5} ${h * 0.8}, ${w} ${h * 0.66} L ${w} ${h} L 0 ${h} Z" fill="#fff" opacity=".14"/>
</svg>`);
}

fs.mkdirSync(OUT, { recursive: true });

for (const [i, img] of images.entries()) {
  const srcPath = path.join(SRC, img.src);
  const outPath = path.join(OUT, `${img.out}.webp`);
  if (fs.existsSync(srcPath)) {
    const meta = await sharp(srcPath).metadata();
    const c = img.crop;
    await sharp(srcPath)
      .extract({
        left: Math.round(c.left * meta.width),
        top: Math.round(c.top * meta.height),
        width: Math.round(c.width * meta.width),
        height: Math.round(c.height * meta.height),
      })
      .resize(img.w, img.h, { fit: "cover", position: "attention" })
      .webp({ quality: 82 })
      .toFile(outPath);
    console.log(`✔ ${img.src} → ${img.out}.webp`);
  } else {
    await sharp(placeholderSvg(img.w, img.h, i)).webp({ quality: 80 }).toFile(outPath);
    console.log(`… ${img.src} ausente → placeholder ${img.out}.webp`);
  }
}

// Imagem de compartilhamento (Open Graph) 1200x630
const ogBase = path.join(OUT, "interior.webp");
const ogSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs><linearGradient id="o" x1="0" x2="1"><stop offset="0" stop-color="#104D72" stop-opacity=".88"/><stop offset=".65" stop-color="#087AA9" stop-opacity=".25"/><stop offset="1" stop-color="#087AA9" stop-opacity="0"/></linearGradient></defs>
  <rect width="1200" height="630" fill="url(#o)"/>
  <text x="80" y="300" font-family="Arial, sans-serif" font-weight="800" font-size="110" fill="#fff" letter-spacing="4">BERRY'S</text>
  <text x="86" y="350" font-family="Arial, sans-serif" font-weight="700" font-size="30" fill="#fff" letter-spacing="14">ICED FOOD</text>
  <text x="86" y="440" font-family="Arial, sans-serif" font-size="34" fill="#fff">Sorvete artesanal • Porto Seguro – BA</text>
</svg>`);
await sharp(ogBase).resize(1200, 630, { fit: "cover" }).composite([{ input: ogSvg }]).jpeg({ quality: 85 }).toFile(path.resolve("public/og-image.jpg"));
console.log("✔ og-image.jpg");
