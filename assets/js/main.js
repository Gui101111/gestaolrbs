/* Viking Praia · motor de movimento
   Um único loop rAF lê o scroll e escreve só transform/opacity,
   e só quando o valor muda. Sem dependências. */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeIO = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const smooth = t => t * t * (3 - 2 * t);
  const rng = seed => { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; };

  const RM = matchMedia('(prefers-reduced-motion: reduce)');
  const MOBILE = matchMedia('(max-width: 759px)');
  let reduced = RM.matches;

  let vw = innerWidth, vh = innerHeight, sy = scrollY;

  /* ---------- título do hero: letras entram como espuma assentando ---------- */
  const title = $('[data-split]');
  if (title) {
    const txt = title.textContent.trim();
    title.textContent = '';
    const sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = txt;
    const vis = document.createElement('span');
    vis.setAttribute('aria-hidden', 'true');
    let i = 0;
    txt.split(/\s+/).forEach((word, wi) => {
      if (wi) vis.appendChild(document.createTextNode(' '));
      const w = document.createElement('span');
      w.className = 'w';
      for (const ch of word) {
        const c = document.createElement('span');
        c.className = 'c'; c.textContent = ch; c.style.setProperty('--i', i++);
        w.appendChild(c);
      }
      vis.appendChild(w);
    });
    title.append(sr, vis);
  }

  /* ---------- vídeo do hero: autoplay mudo, sem controles, sem clique ---------- */
  const hero = $('#inicio');
  const hv = $('#heroVideo');
  const heroMedia = $('#heroMedia');
  const heroContent = $('#heroContent');
  const heroShade = $('#heroShade');
  let heroVisible = true;

  function heroPlay() {
    if (!hv || reduced || !heroVisible || hv.dataset.skip || !hv.querySelector('source')) return;
    hv.muted = true;
    hv.defaultMuted = true;
    const p = hv.play();
    if (p && p.catch) p.catch(() => {
      // Modo economia de energia (iOS) pode bloquear: tenta no primeiro toque ou rolagem.
      const kick = () => { if (!reduced) hv.play().catch(() => {}); };
      addEventListener('touchstart', kick, { passive: true, once: true });
      addEventListener('pointerdown', kick, { once: true });
      addEventListener('scroll', kick, { passive: true, once: true });
    });
  }
  if (hv) {
    hv.removeAttribute('controls');
    const sources = $$('source', hv);
    const last = sources[sources.length - 1];
    const dead = () => hv.classList.add('is-dead');
    if (last) last.addEventListener('error', dead);
    hv.addEventListener('error', dead);
    if (reduced) { hv.removeAttribute('autoplay'); hv.pause(); } else heroPlay();
    new IntersectionObserver(([e]) => {
      heroVisible = e.isIntersecting;
      if (heroVisible) heroPlay(); else hv.pause();
    }).observe(hero);
  }

  /* ---------- nav ---------- */
  const nav = $('#nav');
  const toggle = $('.nav__toggle');
  const mmenu = $('#mmenu');
  function setMenu(open) {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    mmenu.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
    nav.classList.toggle('menu-on', open);
    if (open) { const a = $('a', mmenu); if (a) setTimeout(() => a.focus({ preventScroll: true }), 350); }
  }
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  $$('a', mmenu).forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape' && mmenu.classList.contains('is-open')) { setMenu(false); toggle.focus(); } });

  // link ativo
  const navLinks = $$('.nav__links a');
  const sections = navLinks.map(a => $(a.getAttribute('href'))).filter(Boolean);
  const secIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      navLinks.forEach(a => a.toggleAttribute('aria-current', a.getAttribute('href') === '#' + e.target.id));
      navLinks.forEach(a => { if (a.hasAttribute('aria-current')) a.setAttribute('aria-current', 'true'); });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach(s => secIO.observe(s));

  /* ---------- escudo: assinatura viva que viaja na diagonal ---------- */
  const shield = $('#shield');
  const shieldIn = $('.shield__in', shield);
  const dock = $('#dock');
  const SH = { s0: 0, x0: 0, y0: 0, x1: 0, y1: 0, s1: 1, x: null, y: 0, s: 1, r: 0, last: '' };

  function measureShield() {
    SH.s0 = shield.offsetWidth;
    const mob = MOBILE.matches;
    const cont = $('.nav__inner');
    const cs = getComputedStyle(cont);
    SH.x0 = cont.getBoundingClientRect().left + parseFloat(cs.paddingLeft);
    SH.y0 = mob ? 10 : 16;
    const d = dock.getBoundingClientRect();
    SH.x1 = d.left;
    SH.y1 = d.top;
    SH.s1 = d.width / SH.s0;
  }
  shield.addEventListener('click', e => {
    e.preventDefault();
    scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  });

  /* ---------- ondas SVG entre as seções ---------- */
  const LAYERS = [
    { base: 0.30, amp: 0.15, len: 0.62, spd: 0.32, dir: 1 },
    { base: 0.46, amp: 0.13, len: 0.45, spd: 0.45, dir: -1 },
    { base: 0.60, amp: 0.12, len: 0.78, spd: 0.55, dir: 1 }
  ];
  const waves = $$('[data-wave]').map((el, i) => {
    const svg = $('svg', el);
    const [back, mid, front, foam] = $$('path', svg);
    return { el, svg, paths: [back, mid, front], foam, seed: 1.3 + i * 2.1, vis: false, w: 0, h: 0 };
  });
  const waveIO = new IntersectionObserver(es => es.forEach(e => {
    const w = waves.find(x => x.el === e.target); if (w) w.vis = e.isIntersecting;
  }), { rootMargin: '120px 0px' });
  waves.forEach(w => waveIO.observe(w.el));

  function measureWaves() {
    waves.forEach(w => {
      w.w = w.el.clientWidth; w.h = w.el.clientHeight;
      w.svg.setAttribute('viewBox', `0 0 ${w.w} ${w.h}`);
    });
  }
  function wavePath(w, L, ph, boost, close) {
    const W = w.w, H = w.h, N = Math.max(24, Math.round(W / 28));
    const k = (Math.PI * 2) / (W * L.len);
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const x = (W * i) / N;
      const y = H * L.base + H * L.amp * (1 + boost) *
        (0.68 * Math.sin(k * x + ph * L.dir) + 0.32 * Math.sin(2.3 * k * x - ph * 1.3 * L.dir + w.seed));
      pts.push([x, y]);
    }
    let d = `M0 ${pts[0][1].toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
      d += ` Q${x0.toFixed(1)} ${y0.toFixed(1)} ${((x0 + x1) / 2).toFixed(1)} ${((y0 + y1) / 2).toFixed(1)}`;
    }
    d += ` L${W} ${pts[pts.length - 1][1].toFixed(1)}`;
    return close ? d + ` L${W} ${H + 2} L0 ${H + 2}Z` : d;
  }
  function drawWave(w, t, boost) {
    if (!w.w) return;
    const scrollPh = sy * 0.0032; // o mar acompanha a rolagem
    LAYERS.forEach((L, i) => {
      const ph = t * L.spd + scrollPh * (1 + i * 0.35);
      w.paths[i].setAttribute('d', wavePath(w, L, ph, boost * (1 - i * 0.2), true));
      if (i === 2) w.foam.setAttribute('d', wavePath(w, L, ph, boost * 0.6, false));
    });
  }

  /* ---------- fio do mar: a linha que conduz a página ---------- */
  const flow = $('#flow');
  const thread = $('#thread');
  const tBase = $('#threadBase'), tDraw = $('#threadDraw'), tHead = $('#threadHead'), tGlow = $('#threadGlow');
  const TH = { ys: [], xs: [], ls: [], total: 0, flowTop: 0, cur: 0, last: '' };

  function measureThread() {
    const fr = flow.getBoundingClientRect();
    const top = el => el.getBoundingClientRect().top - fr.top;
    const W = flow.clientWidth;
    const H = flow.offsetHeight;
    TH.flowTop = fr.top + scrollY;
    thread.setAttribute('viewBox', `0 0 ${W} ${H}`);

    const w0 = waves[0].el, w1 = waves[1].el, w2 = waves[2].el;
    const cont = $('.exp .container');
    const cl = cont.getBoundingClientRect().left + parseFloat(getComputedStyle(cont).paddingLeft);
    const xL = Math.max(7, Math.min(cl * 0.5, 64));
    const xR = W - xL;
    const amp = Math.max(1.5, Math.min(7, xL - 5));
    const xS = W * 0.64, xE = W * 0.36;

    const yS = top(w0) + w0.offsetHeight * 0.55;
    const yA = top(w0) + w0.offsetHeight + 90;
    const yB = top(w1) - 90;
    const yC = top(w1) + w1.offsetHeight + 40;
    const yD = top(w2) - 120;
    const yE = top(w2) + w2.offsetHeight * 0.55;

    const xAt = y => {
      if (y < yA) return lerp(xS, xL, smooth(clamp((y - yS) / (yA - yS), 0, 1)));
      if (y < yB) return xL + amp * Math.sin((y - yA) / 85);
      if (y < yC) return lerp(xL + amp * Math.sin((yB - yA) / 85), xR, smooth((y - yB) / (yC - yB)));
      if (y < yD) return xR - amp * Math.sin((y - yC) / 85);
      return lerp(xR - amp * Math.sin((yD - yC) / 85), xE, smooth(clamp((y - yD) / (yE - yD), 0, 1)));
    };
    const ys = [], xs = [], ls = [];
    let d = '', len = 0, px = 0, py = 0;
    for (let y = yS; y <= yE; y += 8) {
      const x = xAt(y);
      if (ys.length) len += Math.hypot(x - px, y - py);
      d += (ys.length ? ' L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
      ys.push(y); xs.push(x); ls.push(len);
      px = x; py = y;
    }
    TH.ys = ys; TH.xs = xs; TH.ls = ls; TH.total = len;
    tBase.setAttribute('d', d);
    tDraw.setAttribute('d', d);
    tDraw.style.strokeDasharray = `${len} ${len + 10}`;
    TH.last = '';
  }
  function threadAt(yDoc) {
    const { ys } = TH;
    if (!ys.length) return 0;
    const y = yDoc - TH.flowTop;
    if (y <= ys[0]) return 0;
    if (y >= ys[ys.length - 1]) return ys.length - 1;
    return (y - ys[0]) / 8;
  }
  function drawThread(fi) {
    const n = TH.ys.length; if (!n) return;
    const i0 = Math.floor(fi), i1 = Math.min(n - 1, i0 + 1), f = fi - i0;
    const l = lerp(TH.ls[i0], TH.ls[i1], f);
    const x = lerp(TH.xs[i0], TH.xs[i1], f), y = lerp(TH.ys[i0], TH.ys[i1], f);
    const key = l.toFixed(1);
    if (key === TH.last) return;
    TH.last = key;
    tDraw.style.strokeDashoffset = (TH.total - l).toFixed(1);
    const vis = l > 2 && l < TH.total - 2 ? 1 : 0;
    tHead.setAttribute('cx', x.toFixed(1)); tHead.setAttribute('cy', y.toFixed(1));
    tGlow.setAttribute('cx', x.toFixed(1)); tGlow.setAttribute('cy', y.toFixed(1));
    tHead.style.opacity = vis; tGlow.style.opacity = vis * 0.28;
  }

  /* ---------- parallax interno e flutuação de elementos de madeira ---------- */
  const plx = $$('[data-plx]').map(el => ({ el, a: parseFloat(el.dataset.plx) / 100, ins: $$('.plx__in', el), vis: false, last: '' }));
  const floats = $$('[data-float]').map(el => ({ el, f: parseFloat(el.dataset.float), vis: false, last: '' }));
  const palisade = $('#palisade');
  const visIO = new IntersectionObserver(es => es.forEach(e => {
    const o = plx.find(p => p.el === e.target) || floats.find(p => p.el === e.target);
    if (o) o.vis = e.isIntersecting;
  }), { rootMargin: '80px 0px' });
  plx.forEach(p => visIO.observe(p.el));
  floats.forEach(p => visIO.observe(p.el));

  const centerProg = el => {
    const r = el.getBoundingClientRect();
    return clamp((r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2), -1, 1);
  };

  // paliçada do rodapé (desenhada aqui para manter o HTML limpo)
  if (palisade) {
    const r = rng(7);
    let d = 'M0 110';
    for (let x = 0; x < 1440; x += 26) {
      const top = 22 + r() * 42, w = 24 + r() * 4;
      d += ` L${x + 1} ${top + 12} L${x + w / 2} ${top} L${x + w - 1} ${top + 12} L${x + w} 110`;
    }
    d += ' L1440 110 Z';
    $('path', palisade).setAttribute('d', d);
  }

  /* ---------- reveals ---------- */
  const revIO = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target;
    el.classList.add('in');
    revIO.unobserve(el);
    setTimeout(() => el.classList.add('done'), 1500);
  }), { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  $$('[data-reveal]').forEach(el => revIO.observe(el));

  // cards: máscara de onda, um de cada vez, nunca todos juntos
  const cards = $$('[data-card]');
  const queue = [];
  let pumping = false;
  function pump() {
    if (!queue.length) { pumping = false; return; }
    pumping = true;
    queue.sort((a, b) => cards.indexOf(a) - cards.indexOf(b));
    const c = queue.shift();
    c.classList.add('in');
    setTimeout(() => c.classList.add('done'), 2100);
    setTimeout(pump, 210);
  }
  const cardIO = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    cardIO.unobserve(e.target);
    queue.push(e.target);
    if (!pumping) pump();
  }), { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });
  cards.forEach(c => cardIO.observe(c));

  /* ---------- escudo em vídeo na Experiência (sem som) ---------- */
  const sFrame = $('#shieldFrame');
  const sVideo = $('#shieldVideo');
  const sReplay = $('#shieldReplay');
  let sLoaded = false;
  function shieldLoad() {
    if (sLoaded) return; sLoaded = true;
    sVideo.muted = true;
    const mp4 = sVideo.canPlayType('video/mp4; codecs="avc1.4d401f"');
    sVideo.src = sVideo.dataset.src + (mp4 ? '.mp4' : '.webm');
    sVideo.load();
  }
  function shieldPlay() {
    shieldLoad();
    sFrame.classList.remove('is-ended');
    try { sVideo.currentTime = 0; } catch (_) {}
    const go = () => { sVideo.classList.add('is-on'); sVideo.play().catch(() => sFrame.classList.add('is-ended')); };
    if (sVideo.readyState >= 2) go(); else sVideo.addEventListener('canplay', go, { once: true });
  }
  if (sVideo) {
    sVideo.addEventListener('ended', () => sFrame.classList.add('is-ended'));
    sVideo.addEventListener('error', () => { sVideo.classList.remove('is-on'); sFrame.classList.remove('is-ended'); });
    sReplay.addEventListener('click', shieldPlay);
    sFrame.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse' && sFrame.classList.contains('is-ended')) shieldPlay(); });
    new IntersectionObserver((es, o) => es.forEach(e => {
      if (!e.isIntersecting) return;
      o.disconnect();
      if (reduced) { sFrame.classList.add('is-ended'); return; }
      shieldPlay();
    }), { threshold: 0.45 }).observe(sFrame);
  }

  /* ---------- galeria: pontos no carrossel mobile ---------- */
  const mas = $('#masonry');
  const dots = $('#galDots');
  if (mas && dots) {
    const tiles = $$('.tile', mas);
    tiles.forEach(() => dots.appendChild(document.createElement('i')));
    const di = $$('i', dots);
    const upd = () => {
      if (!MOBILE.matches) return;
      const c = mas.scrollLeft + mas.clientWidth / 2;
      let best = 0, bd = Infinity;
      tiles.forEach((t, i) => { const d = Math.abs(t.offsetLeft + t.offsetWidth / 2 - c); if (d < bd) { bd = d; best = i; } });
      di.forEach((d, i) => d.classList.toggle('on', i === best));
    };
    mas.addEventListener('scroll', upd, { passive: true });
    upd();
  }

  /* ---------- mapa: carrega só quando chega perto ---------- */
  const map = $('#map');
  if (map) new IntersectionObserver((es, o) => es.forEach(e => {
    if (!e.isIntersecting) return;
    o.disconnect();
    const f = document.createElement('iframe');
    f.src = map.dataset.src;
    f.title = 'Mapa da Praia do Parracho, Arraial d’Ajuda';
    f.loading = 'lazy';
    f.referrerPolicy = 'no-referrer-when-downgrade';
    f.setAttribute('allowfullscreen', '');
    map.appendChild(f);
  }), { rootMargin: '500px 0px' }).observe(map);

  /* ---------- formulário: segue pronto para o WhatsApp ---------- */
  const form = $('#form');
  if (form) form.addEventListener('submit', e => {
    e.preventDefault();
    const nome = form.nome.value.trim();
    const wpp = form.whatsapp.value.trim();
    const email = form.email.value.trim();
    const msg = form.mensagem.value.trim();
    const bad = [];
    if (!nome) bad.push(form.nome);
    if (wpp.replace(/\D/g, '').length < 8) bad.push(form.whatsapp);
    if (email && !/^\S+@\S+\.\S+$/.test(email)) bad.push(form.email);
    if (!msg) bad.push(form.mensagem);
    $$('input,textarea', form).forEach(i => i.removeAttribute('aria-invalid'));
    const ok = $('#formOk');
    if (bad.length) {
      bad.forEach(i => i.setAttribute('aria-invalid', 'true'));
      bad[0].focus();
      ok.textContent = 'Confira os campos marcados, por favor.';
      ok.classList.add('show');
      return;
    }
    const text = `Olá, Viking Praia! Sou ${nome}.\n\n${msg}\n\nWhatsApp: ${wpp}${email ? `\nE-mail: ${email}` : ''}`;
    const url = 'https://wa.me/554599847212?text=' + encodeURIComponent(text);
    const win = window.open(url, '_blank', 'noopener');
    ok.textContent = 'Sua mensagem está pronta. ';
    const link = document.createElement('a');
    link.href = url; link.target = '_blank'; link.rel = 'noopener';
    link.textContent = win ? 'Se o WhatsApp não abriu, toque aqui.' : 'Toque aqui para abrir no WhatsApp.';
    ok.appendChild(link);
    ok.classList.add('show');
    form.reset();
  });

  /* ---------- medidas ---------- */
  let heroH = hero.offsetHeight;
  function measure() {
    vw = innerWidth; vh = innerHeight;
    heroH = hero.offsetHeight;
    measureShield();
    measureWaves();
    measureThread();
    SH.last = '';
    plx.forEach(p => (p.last = ''));
    floats.forEach(p => (p.last = ''));
    if (reduced) pinFinal();
  }
  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(measure, 120); }, { passive: true });
  addEventListener('load', measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  MOBILE.addEventListener('change', measure);

  /* ---------- loop principal ---------- */
  let lastT = performance.now();
  let lastSy = scrollY;
  let vel = 0;
  let heroLast = '';
  let navState = '';
  let rafId = null;

  function frame(t) {
    rafId = requestAnimationFrame(frame);
    const dt = Math.min(64, t - lastT); lastT = t;
    const k = 1 - Math.pow(1 - 0.11, dt / 16.67);
    sy = scrollY;
    const dy = sy - lastSy; lastSy = sy;
    vel = lerp(vel, clamp(Math.abs(dy) / 60, 0, 0.6), 1 - Math.pow(1 - 0.08, dt / 16.67));
    const ts = t / 1000;
    const mob = MOBILE.matches;

    // hero: parallax leve + zoom suave ao sair, some atrás da próxima seção
    if (sy <= heroH + 10) {
      const hp = clamp(sy / heroH, 0, 1);
      const key = sy.toFixed(0);
      if (key !== heroLast) {
        heroLast = key;
        heroMedia.style.transform = `translate3d(0,${(sy * 0.38).toFixed(1)}px,0) scale(${(1 + 0.065 * smooth(hp)).toFixed(4)})`;
        heroContent.style.transform = `translate3d(0,${(sy * 0.34).toFixed(1)}px,0)`;
        heroContent.style.opacity = clamp(1 - hp * 6, 0, 1).toFixed(3);
        heroShade.style.opacity = (hp * 0.6).toFixed(3);
        hero.classList.toggle('is-scrolled', sy > 30);
      }
    }

    // nav
    const solid = sy > heroH - (mob ? 90 : 120) || mmenu.classList.contains('is-open');
    const p = clamp(sy / (heroH * (mob ? 0.55 : 0.95)), 0, 1);
    const e = easeIO(p);
    const docked = e > 0.94;
    const ns = (solid ? 's' : '') + (docked ? 'd' : '');
    if (ns !== navState) { navState = ns; nav.classList.toggle('is-solid', solid); nav.classList.toggle('is-docked', docked); }

    // escudo: canto superior esquerdo -> diagonal -> topo direito
    {
      // trajeto: desce na diagonal para baixo da barra do menu, atravessa para a direita
      // e sobe para o encaixe no topo direito, sem nunca passar por cima dos links
      const px = 1 - Math.pow(1 - clamp(p / 0.86, 0, 1), 2.2);
      const tx = lerp(SH.x0, SH.x1, px);
      const navH = nav.offsetHeight;
      const dip = Math.max(0, navH + (mob ? 6 : 10) - SH.y0);
      const shape = smooth(clamp((p - 0.1) / 0.2, 0, 1)) * smooth(clamp((1 - p) / 0.12, 0, 1));
      const ty = lerp(SH.y0, SH.y1, smooth(clamp((p - 0.86) / 0.14, 0, 1))) + dip * shape;
      const tsc = lerp(1, SH.s1, 1 - Math.pow(1 - p, 2));
      const tr = mob ? 0 : -9 * Math.sin(Math.PI * e);
      if (SH.x === null) { SH.x = tx; SH.y = ty; SH.s = tsc; SH.r = tr; }
      SH.x = lerp(SH.x, tx, k); SH.y = lerp(SH.y, ty, k); SH.s = lerp(SH.s, tsc, k); SH.r = lerp(SH.r, tr, k);
      const floatA = mob ? lerp(2.5, 0.8, e) : lerp(5, 1.4, e);
      const bob = Math.sin(ts * 1.25) * floatA;
      const rotIdle = Math.sin(ts * 0.7) * (mob ? 0.8 : lerp(2, 1.2, e));
      const off = (SH.s0 * (1 - SH.s)) / 2; // origem no centro
      const v = `translate3d(${(SH.x - off).toFixed(2)}px,${(SH.y - off + bob).toFixed(2)}px,0) rotate(${(SH.r + rotIdle).toFixed(2)}deg) scale(${SH.s.toFixed(4)})`;
      if (v !== SH.last) { SH.last = v; shield.style.transform = v; }
    }

    // ondas
    waves.forEach(w => { if (w.vis) drawWave(w, ts, vel); });

    // fio do mar
    const target = threadAt(sy + vh * 0.62);
    TH.cur = lerp(TH.cur, target, k);
    drawThread(TH.cur);

    // fotos grandes: movimento interno de 3 a 5%
    plx.forEach(o => {
      if (!o.vis) return;
      const pr = centerProg(o.el);
      const px = (-pr * o.a * o.el.offsetHeight * 0.8).toFixed(1);
      if (px === o.last) return; o.last = px;
      o.ins.forEach(n => (n.style.transform = `translate3d(0,${px}px,0)`));
    });
    floats.forEach(o => {
      if (!o.vis) return;
      const px = (centerProg(o.el) * o.f * 420).toFixed(1);
      if (px === o.last) return; o.last = px;
      o.el.style.transform = `translate3d(0,${px}px,0)`;
    });
    if (palisade && sy + vh > document.body.scrollHeight - 900) {
      palisade.style.transform = `translate3d(${(-((sy * 0.03) % 26)).toFixed(1)}px,0,0)`;
    }
  }

  /* ---------- movimento reduzido: estado final, ao vivo nos dois sentidos ---------- */
  function pinFinal() {
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    if (hv) hv.pause();
    heroMedia.style.transform = ''; heroContent.style.transform = ''; heroContent.style.opacity = ''; heroShade.style.opacity = '';
    measureShield();
    shield.style.transform = `translate3d(${SH.x1 - (SH.s0 * (1 - SH.s1)) / 2}px,${SH.y1 - (SH.s0 * (1 - SH.s1)) / 2}px,0) scale(${SH.s1})`;
    nav.classList.add('is-docked');
    const onScroll = () => nav.classList.toggle('is-solid', scrollY > heroH - 120);
    onScroll();
    removeEventListener('scroll', pinFinal.scroll || onScroll);
    pinFinal.scroll = onScroll;
    addEventListener('scroll', onScroll, { passive: true });
    waves.forEach(w => drawWave(w, 0, 0));
    if (TH.total) { tDraw.style.strokeDashoffset = '0'; tHead.style.opacity = 0; tGlow.style.opacity = 0; }
    plx.forEach(o => o.ins.forEach(n => (n.style.transform = '')));
    floats.forEach(o => (o.el.style.transform = ''));
    $$('[data-reveal],[data-card]').forEach(el => el.classList.add('in', 'done'));
  }
  function unpin() {
    if (pinFinal.scroll) { removeEventListener('scroll', pinFinal.scroll); pinFinal.scroll = null; }
    SH.x = null; SH.last = ''; TH.last = ''; heroLast = ''; navState = '';
    plx.forEach(p => (p.last = '')); floats.forEach(p => (p.last = ''));
    if (rafId === null) { lastT = performance.now(); rafId = requestAnimationFrame(frame); }
    heroPlay();
  }
  RM.addEventListener('change', ev => { reduced = ev.matches; if (reduced) pinFinal(); else unpin(); });

  document.addEventListener('visibilitychange', () => {
    document.body.classList.toggle('paused', document.hidden);
    if (!document.hidden) heroPlay();
  });

  measure();
  if (reduced) pinFinal(); else rafId = requestAnimationFrame(frame);
})();
