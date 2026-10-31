const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1080 }, deviceScaleFactor: 2 });
  p.on('console', m => console.log('console:', m.text()));
  p.on('pageerror', e => console.log('pageerror:', e.message));
  for (const [q, name] of [['', 'perfil-icone'], ['?nome=1', 'perfil-com-nome']]) {
    await p.goto('http://127.0.0.1:8765/index.html' + q);
    await p.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
    await p.waitForTimeout(300);
    await p.locator('#stage').screenshot({ path: name + '@2x.png' });
    console.log('ok', name);
  }
  await b.close();
})();
