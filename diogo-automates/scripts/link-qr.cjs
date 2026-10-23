// Writes a page with the public link and its QR code, so the phone can open it by
// scanning the screen. Used by gerar-link-celular.ps1: node link-qr.cjs <link> <output.html>
const fs = require('node:fs');
const QRCode = require('qrcode');

const [link, output] = process.argv.slice(2);
if (!/^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/.test(link || '') || !output) {
  console.error('Uso: node link-qr.cjs https://<nome>.trycloudflare.com <arquivo.html>');
  process.exit(1);
}

QRCode.toString(link, { type: 'svg', margin: 2, color: { dark: '#000000', light: '#ffffff' } }).then(svg => {
  fs.writeFileSync(output, `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Link para o celular · Diogo Automates</title>
<style>
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #0a0b0d; color: #eef1f5;
         font-family: system-ui, -apple-system, "Segoe UI", sans-serif; text-align: center; }
  main { padding: 32px 16px; max-width: 420px; }
  h1 { font-size: 24px; margin: 0 0 8px; }
  p { color: #9aa3af; font-size: 16px; line-height: 1.5; margin: 0 0 20px; }
  .qr { background: #fff; border-radius: 16px; padding: 12px; width: 280px; margin: 0 auto 20px; }
  .qr svg { display: block; width: 100%; height: auto; }
  code { display: block; font-size: 15px; word-break: break-all; color: #5b9dff; }
</style>
</head>
<body>
<main>
  <h1>Abra no celular</h1>
  <p>Aponte a câmera do celular para o código e toque no link. Depois, digite a senha de acesso.</p>
  <div class="qr">${svg}</div>
  <code>${link}</code>
  <p style="margin-top:20px">O link também foi copiado. Ele funciona enquanto a janela do atalho estiver aberta.</p>
</main>
</body>
</html>
`);
});
