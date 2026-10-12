/* Berry's Iced Food · Porto Seguro
   JavaScript puro. Um motor de scroll que descansa quando nada muda,
   escrita no DOM só quando o valor muda, e movimento reduzido ao vivo. */
(() => {
  'use strict';

  window.__berrys = true; // avisa a rede de segurança do <head> que o script carregou
  const d = document;
  const root = d.documentElement;
  const $ = (s, c = d) => c.querySelector(s);
  const $$ = (s, c = d) => [...c.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const rng = seed => { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; };

  // mesma regra das <source> da hero: tela bem em pé recebe o recorte vertical
  const PORTRAIT_ASSETS = '(max-aspect-ratio: 7/10)';
  const mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
  const mqFine = matchMedia('(hover: hover) and (pointer: fine)');
  const mqDesk = matchMedia('(min-width: 900px)');
  const mqPortrait = matchMedia(PORTRAIT_ASSETS);
  let reduced = mqReduce.matches;
  let vh = innerHeight;
  let vw = innerWidth;

  /* ---------- entrada da página ---------- */
  const fontsReady = d.fonts && d.fonts.ready ? d.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise(r => setTimeout(r, 700))]).then(() => {
    requestAnimationFrame(() => {
      root.classList.add('is-loaded');
      setTimeout(() => root.classList.add('hero-settled'), 2600);
    });
  });

  /* ---------- rótulos dos botões (rolagem do texto no hover) ---------- */
  $$('.btn__label').forEach(l => {
    const roll = d.createElement('span');
    roll.className = 'btn__roll';
    roll.textContent = l.textContent.trim();
    l.textContent = '';
    l.append(roll);
  });

  /* ---------- aberto agora? (horário da Bahia) ---------- */
  const OPEN = 12 * 60, CLOSE = 23 * 60 + 30;
  function bahiaMinutes() {
    const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Bahia', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
    const get = t => +parts.find(p => p.type === t).value;
    return get('hour') * 60 + get('minute');
  }
  function updateStatus() {
    let t;
    try { t = bahiaMinutes(); } catch (e) { return; }
    const open = t >= OPEN && t < CLOSE;
    const txt = open ? 'Aberto agora' : (t < OPEN ? 'Abre hoje às 12h' : 'Abre amanhã às 12h');
    $$('[data-status]').forEach(el => {
      el.classList.toggle('is-open', open);
      el.classList.toggle('is-closed', !open);
      const s = $('[data-status-text]', el);
      if (s && s.textContent !== txt) s.textContent = txt;
    });
  }
  updateStatus();
  setInterval(updateStatus, 60000);

  /* ---------- nav ---------- */
  const nav = $('[data-nav]');
  let navSolid = null;
  function navState() {
    const solid = scrollY > Math.min(90, vh * .12);
    if (solid !== navSolid) { navSolid = solid; nav.classList.toggle('is-solid', solid); }
  }
  const navLinks = $$('[data-link]');
  const sectionMap = { inicio: 'inicio', resistir: 'inicio', experiencia: 'experiencia', sabores: 'sabores', 'jeito-berrys': 'sabores', sobre: 'sobre', galeria: 'galeria', instagram: 'galeria', localizacao: 'localizacao', vontade: 'localizacao' };
  const navIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const key = sectionMap[e.target.id];
      navLinks.forEach(a => a.classList.toggle('is-active', a.dataset.link === key));
    });
  }, { rootMargin: '-48% 0px -48% 0px' });
  Object.keys(sectionMap).forEach(id => { const el = d.getElementById(id); if (el) navIO.observe(el); });

  /* ---------- menu mobile ---------- */
  const menu = $('#menu');
  const menuOpen = $('[data-menu-open]');
  const menuClose = $('[data-menu-close]');
  let lastFocus = null;
  function openMenu() {
    lastFocus = d.activeElement;
    menu.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add('is-open')));
    menuOpen.setAttribute('aria-expanded', 'true');
    root.classList.add('menu-open');
    setTimeout(() => menuClose.focus(), 80);
  }
  function closeMenu(restoreFocus = true) {
    menu.classList.remove('is-open');
    menuOpen.setAttribute('aria-expanded', 'false');
    root.classList.remove('menu-open');
    setTimeout(() => { if (!menu.classList.contains('is-open')) menu.hidden = true; }, reduced ? 0 : 700);
    if (restoreFocus && lastFocus) lastFocus.focus();
  }
  menuOpen.addEventListener('click', openMenu);
  menuClose.addEventListener('click', () => closeMenu());
  menu.addEventListener('click', e => { if (e.target.closest('a')) closeMenu(false); });
  menu.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeMenu(); return; }
    if (e.key !== 'Tab') return;
    const f = $$('a[href], button', menu);
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && d.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && d.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  mqDesk.addEventListener('change', () => { if (mqDesk.matches && menu.classList.contains('is-open')) closeMenu(false); });

  /* ---------- vídeo da hero (a animação do cliente, em loop) ---------- */
  const hero = $('[data-hero]');
  const video = $('[data-hero-video]');
  const poster = $('.hero__poster');
  const saveData = !!(navigator.connection && navigator.connection.saveData);
  let videoArmed = false;
  let heroVisible = true;

  function videoSource() {
    const kind = mqPortrait.matches ? 'portrait' : '1280';
    const webm = video.canPlayType('video/webm; codecs="vp9"');
    return `assets/video/hero-${kind}.${webm ? 'webm' : 'mp4'}`;
  }
  function tryPlay() {
    if (!videoArmed || !heroVisible || d.hidden || reduced) return;
    const p = video.play();
    if (p && p.catch) p.catch(() => {});
  }
  function armVideo() {
    if (videoArmed || reduced || saveData || !video) return;
    videoArmed = true;
    video.src = videoSource();
    tryPlay();
  }
  if (video) {
    video.addEventListener('playing', () => hero.classList.add('is-playing'));
    video.addEventListener('error', () => {
      // a página fica completa com o poster por trás
      hero.classList.remove('is-playing');
      videoArmed = false;
      video.removeAttribute('src');
    });
    // o poster vence a disputa de banda: o vídeo só começa depois dele
    let started = false;
    const start = () => { if (!started) { started = true; armVideo(); } };
    if (poster && poster.complete) setTimeout(start, 150);
    else if (poster) { poster.addEventListener('load', start, { once: true }); poster.addEventListener('error', start, { once: true }); }
    setTimeout(start, 3500);
    mqPortrait.addEventListener('change', () => {
      if (!videoArmed) return;
      const next = videoSource();
      if (!video.src.endsWith(next)) {
        const t = video.currentTime;
        hero.classList.remove('is-playing');
        video.src = next;
        video.addEventListener('loadedmetadata', () => { video.currentTime = t % (video.duration || 1); }, { once: true });
        tryPlay();
      }
    });
  }
  new IntersectionObserver(([e]) => {
    heroVisible = e.isIntersecting;
    if (heroVisible) tryPlay(); else if (videoArmed) video.pause();
  }, { threshold: 0.02 }).observe(hero);

  /* ---------- entradas ---------- */
  $$('[data-stagger]').forEach(group => {
    $$(':scope > [data-reveal]', group).forEach((el, i) => {
      if (!el.style.getPropertyValue('--d')) el.style.setProperty('--d', (i * 0.09).toFixed(2) + 's');
    });
  });
  const revealIO = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      el.classList.add('in');
      revealIO.unobserve(el);
      const delay = parseFloat(el.style.getPropertyValue('--d')) || 0;
      setTimeout(() => el.classList.add('settled'), 1700 + delay * 1000);
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.01 });
  $$('[data-reveal]').forEach(el => revealIO.observe(el));

  /* seções "vivas": loops sussurrados só rodam com a seção na tela */
  const liveIO = new IntersectionObserver(entries => entries.forEach(e => e.target.classList.toggle('is-live', e.isIntersecting)), { rootMargin: '10% 0px' });
  $$('section, .ticker, .footer').forEach(s => liveIO.observe(s));

  /* ---------- motor de scroll ---------- */
  const drivers = [];
  const driverIO = new IntersectionObserver(entries => entries.forEach(e => {
    (e.target.__drivers || []).forEach(dr => { dr.on = e.isIntersecting; });
    if (e.isIntersecting) requestTick();
  }), { rootMargin: '30% 0px 30% 0px' });
  function drive(el, fn, watch = el) {
    const dr = { el, fn, on: false, last: Object.create(null) };
    (watch.__drivers || (watch.__drivers = [])).push(dr);
    drivers.push(dr);
    driverIO.observe(watch);
    return dr;
  }
  function setVar(dr, name, val, eps = 0.0005) {
    const prev = dr.last[name];
    if (prev !== undefined && Math.abs(prev - val) < eps) return;
    dr.last[name] = val;
    dr.el.style.setProperty(name, val);
  }
  let ticking = false;
  function requestTick() { if (!ticking) { ticking = true; requestAnimationFrame(tick); } }
  function tick() {
    ticking = false;
    navState();
    for (const dr of drivers) if (dr.on) dr.fn(dr);
    fabState();
  }
  addEventListener('scroll', requestTick, { passive: true });
  let resizeT;
  addEventListener('resize', () => {
    vh = innerHeight; vw = innerWidth;
    requestTick();
    clearTimeout(resizeT);
    resizeT = setTimeout(() => { $$('[data-drip]').forEach(buildDrip); fillTicker(); requestTick(); }, 180);
  });

  /* hero: encolhe, arredonda e revela o milk por baixo */
  const heroFrame = $('[data-hero-frame]');
  drive(heroFrame, dr => {
    const p = reduced ? 0 : clamp(scrollY / (vh * 0.85), 0, 1);
    setVar(dr, '--hp', +p.toFixed(4));
  }, hero);

  /* parallax: mede o pai (estável), move o filho */
  $$('[data-speed]').forEach(el => {
    const speed = parseFloat(el.dataset.speed) || 0;
    const ref = el.parentElement;
    const range = (el.dataset.range || '-160,160').split(',').map(Number);
    drive(el, dr => {
      if (reduced || !mqDesk.matches) { setVar(dr, '--py', 0, 0.5); return; }
      const r = ref.getBoundingClientRect();
      const y = clamp((r.top + r.height / 2 - vh / 2) * speed, range[0], range[1]);
      setVar(dr, '--py', Math.round(y * 10) / 10, 0.5);
    }, ref);
  });

  /* ---------- a calda: gotas geradas com semente fixa ---------- */
  function buildDrip(host) {
    const w = Math.round(host.getBoundingClientRect().width);
    if (!w || host.__w === w) return;
    host.__w = w;
    const r = rng(+host.dataset.seed || 1);
    const small = w < 700;
    const B = small ? 14 : 22;
    let x = 8 + r() * 30;
    let maxL = 0, longest = null;
    const drops = [];
    while (x < w - 12) {
      const rad = (small ? 5 : 7) + r() * (small ? 7 : 11);
      const L = (small ? 14 : 22) + r() * r() * (small ? 70 : 130);
      const dl = +(r() * 0.42).toFixed(3);
      drops.push({ cx: x + rad, rad, L, dl });
      if (L > maxL) { maxL = L; longest = drops[drops.length - 1]; }
      x += rad * 2 + (small ? 16 : 24) + r() * (small ? 60 : 110);
    }
    const H = Math.ceil(B + maxL + 110);
    let svg = `<svg width="${w}" height="${H}" viewBox="0 0 ${w} ${H}" fill="currentColor" focusable="false"><rect x="0" y="-1" width="${w}" height="${B + 1}"/>`;
    for (const p of drops) {
      const { cx, rad, L, dl } = p;
      const f = rad * 0.95;
      const k = (1 / (1 - dl)).toFixed(3);
      // ombro fixo que liga a gota à faixa
      svg += `<path d="M${(cx - rad - f).toFixed(1)} ${B}C${(cx - rad - f * .35).toFixed(1)} ${B} ${(cx - rad).toFixed(1)} ${(B + f * .35).toFixed(1)} ${(cx - rad).toFixed(1)} ${(B + f).toFixed(1)}L${(cx + rad).toFixed(1)} ${(B + f).toFixed(1)}C${(cx + rad).toFixed(1)} ${(B + f * .35).toFixed(1)} ${(cx + rad + f * .35).toFixed(1)} ${B} ${(cx + rad + f).toFixed(1)} ${B}Z"/>`;
      svg += `<g class="drip__d" style="--L:${L.toFixed(1)}px;--dl:${dl};--k:${k}"><path d="M${(cx - rad).toFixed(1)} ${(B - 2 - L).toFixed(1)}V${(B + L - rad).toFixed(1)}A${rad.toFixed(1)} ${rad.toFixed(1)} 0 0 0 ${(cx + rad).toFixed(1)} ${(B + L - rad).toFixed(1)}V${(B - 2 - L).toFixed(1)}Z"/>`;
      if (p === longest) svg += `<circle class="drip__drop" style="--dd:-${(r() * 4).toFixed(2)}s" cx="${cx.toFixed(1)}" cy="${(B + L - rad * .3).toFixed(1)}" r="${(rad * .55).toFixed(1)}"/>`;
      svg += '</g>';
    }
    svg += '</svg>';
    host.innerHTML = svg;
  }
  $$('[data-drip]').forEach(host => {
    buildDrip(host);
    drive(host, dr => {
      const top = host.getBoundingClientRect().top;
      const m = reduced ? 1 : clamp((vh * 0.98 - top) / (vh * 0.62), 0, 1);
      setVar(dr, '--melt', +m.toFixed(3), 0.002);
    });
  });

  /* rota MG → BA que se desenha */
  const route = $('[data-route]');
  if (route) drive(route, dr => {
    const r = route.getBoundingClientRect();
    const p = reduced ? 1 : clamp((vh * 0.92 - r.top) / (vh * 0.5), 0, 1);
    setVar(dr, '--draw', +p.toFixed(3), 0.002);
  });

  /* ---------- storytelling ---------- */
  const story = $('[data-story]');
  if (story) {
    const steps = $$('[data-story-step]', story);
    const imgs = $$('.story__frame img', story);
    const count = $('[data-story-count]', story);
    const bar = $('[data-story-bar]', story);
    let current = -1;
    const setStep = i => {
      if (i === current) return;
      current = i;
      story.dataset.step = String(i);
      steps.forEach((s, n) => s.classList.toggle('is-on', n === i));
      imgs.forEach((im, n) => im.classList.toggle('is-on', n === i));
      count.textContent = String(i + 1).padStart(2, '0');
    };
    setStep(0);
    const storyIO = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) setStep(+e.target.dataset.storyStep);
    }), { rootMargin: '-46% 0px -46% 0px' });
    steps.forEach(s => storyIO.observe(s));
    drive(bar, dr => {
      const r = story.getBoundingClientRect();
      const p = clamp((vh * 0.5 - r.top) / Math.max(1, r.height - vh), 0, 1);
      setVar(dr, '--sp', +p.toFixed(3), 0.002);
    }, story);
  }

  /* ---------- faixa cinética: lenta, acompanha a direção do scroll ---------- */
  const ticker = $('[data-ticker]');
  const track = $('[data-ticker-track]');
  function fillTicker() {
    if (!track) return;
    const group = track.firstElementChild;
    let guard = 0;
    while (track.scrollWidth < Math.max(vw, 1600) * 2.2 && guard++ < 12) track.append(group.cloneNode(true));
  }
  fillTicker();
  let tx = 0, boost = 0, dir = 1, dirS = 1, tOn = false, tRaf = null, tLast = 0, lastY = scrollY, groupW = 0;
  function tickerLoop(now) {
    const dt = Math.min(64, now - (tLast || now));
    tLast = now;
    if (!groupW) groupW = track.firstElementChild.getBoundingClientRect().width;
    dirS += (dir - dirS) * Math.min(1, dt / 400);
    boost *= Math.pow(0.9, dt / 16.67);
    tx -= (0.05 * dirS + boost * 0.02) * dt;
    if (tx <= -groupW) tx += groupW;
    if (tx > 0) tx -= groupW;
    track.style.transform = `translate3d(${tx.toFixed(2)}px,0,0)`;
    tRaf = (tOn && !reduced && !d.hidden) ? requestAnimationFrame(tickerLoop) : null;
    if (!tRaf) tLast = 0;
  }
  function startTicker() { if (!tRaf && tOn && !reduced && !d.hidden) tRaf = requestAnimationFrame(tickerLoop); }
  addEventListener('scroll', () => {
    const y = scrollY, dy = y - lastY;
    lastY = y;
    if (Math.abs(dy) > 1) { dir = dy > 0 ? 1 : -1; boost = clamp(boost + dy * 0.12 * dir, 0, 6); }
  }, { passive: true });
  if (ticker) new IntersectionObserver(([e]) => { tOn = e.isIntersecting; if (tOn) { groupW = 0; startTicker(); } }).observe(ticker);

  /* ---------- botões magnéticos (3 a 6px) ---------- */
  $$('[data-magnetic]').forEach(btn => {
    btn.addEventListener('pointermove', e => {
      if (!mqFine.matches || reduced || e.pointerType !== 'mouse') return;
      const r = btn.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      const y = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      btn.classList.add('is-mag');
      btn.style.setProperty('--mx', (x * 6).toFixed(2) + 'px');
      btn.style.setProperty('--my', (y * 5).toFixed(2) + 'px');
    });
    btn.addEventListener('pointerleave', () => {
      btn.classList.remove('is-mag');
      btn.style.setProperty('--mx', '0px');
      btn.style.setProperty('--my', '0px');
    });
  });

  /* ---------- elementos que respondem ao mouse ---------- */
  const depthEls = $$('[data-depth]').map(el => ({ el, k: parseFloat(el.dataset.depth) || 1, on: false }));
  const depthIO = new IntersectionObserver(entries => entries.forEach(e => {
    const o = depthEls.find(x => x.el === e.target);
    if (o) o.on = e.isIntersecting;
  }));
  depthEls.forEach(o => depthIO.observe(o.el));
  let px = 0, py = 0, cx = 0, cy = 0, pRaf = null;
  function pointerLoop() {
    cx += (px - cx) * 0.07;
    cy += (py - cy) * 0.07;
    for (const o of depthEls) {
      if (!o.on) continue;
      o.el.style.setProperty('--dx', (cx * o.k * 12).toFixed(2));
      o.el.style.setProperty('--dy', (cy * o.k * 12).toFixed(2));
    }
    pRaf = (Math.abs(px - cx) + Math.abs(py - cy) > 0.002) ? requestAnimationFrame(pointerLoop) : null;
  }
  addEventListener('pointermove', e => {
    if (!mqFine.matches || reduced || e.pointerType !== 'mouse') return;
    px = e.clientX / vw * 2 - 1;
    py = e.clientY / vh * 2 - 1;
    if (!pRaf) pRaf = requestAnimationFrame(pointerLoop);
  }, { passive: true });

  /* ---------- chips das combinações (o momento interativo) ---------- */
  const combo = $('[data-combo]');
  if (combo) {
    const cap = $('[data-mood-caption]', combo);
    const chips = $$('[data-mood-set]', combo);
    const CAPS = {
      none: 'Toque ou passe o mouse nos sabores.',
      morango: 'Morango: o vermelho que chama.',
      chocolate: 'Chocolate: a calda que escorre sem pressa.',
      cremoso: 'Cremoso: derrete devagar, do jeito certo.',
      jeito: 'Do seu jeito: quem decide a combinação é você.'
    };
    let pinned = 'none';
    const setMood = m => {
      if (combo.dataset.mood === m) return;
      combo.dataset.mood = m;
      cap.textContent = CAPS[m];
    };
    chips.forEach(ch => {
      const m = ch.dataset.moodSet;
      ch.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') setMood(m); });
      ch.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') setMood(pinned); });
      ch.addEventListener('focus', () => setMood(m));
      ch.addEventListener('blur', () => setMood(pinned));
      ch.addEventListener('click', () => {
        pinned = pinned === m ? 'none' : m;
        chips.forEach(c => c.setAttribute('aria-pressed', String(c.dataset.moodSet === pinned)));
        setMood(pinned === 'none' && mqFine.matches ? m : pinned);
      });
    });
  }

  /* ---------- galeria: cursor "ver foto" e lightbox ---------- */
  const gallery = $('[data-gallery]');
  const cursor = $('[data-cursor]');
  if (gallery && cursor) {
    gallery.addEventListener('pointermove', e => {
      if (!mqFine.matches || e.pointerType !== 'mouse') return;
      cursor.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      cursor.classList.toggle('is-on', !!e.target.closest('.shot'));
    }, { passive: true });
    gallery.addEventListener('pointerleave', () => cursor.classList.remove('is-on'));
    addEventListener('scroll', () => cursor.classList.remove('is-on'), { passive: true });
  }
  const lb = $('[data-lightbox]');
  const shots = $$('.shot');
  if (lb && shots.length) {
    const lbImg = $('[data-lb-img]', lb), lbCap = $('[data-lb-cap]', lb), lbCount = $('[data-lb-count]', lb);
    let idx = 0;
    const pad = n => String(n).padStart(2, '0');
    const show = i => {
      idx = (i + shots.length) % shots.length;
      const s = shots[idx];
      lbImg.src = s.dataset.full;
      lbImg.alt = $('img', s).alt;
      lbCap.textContent = s.dataset.caption || '';
      lbCount.textContent = `${pad(idx + 1)} / ${pad(shots.length)}`;
      lb.classList.remove('swap');
      void lb.offsetWidth;
      lb.classList.add('swap');
    };
    const open = i => {
      show(i);
      if (typeof lb.showModal === 'function') lb.showModal(); else lb.setAttribute('open', '');
      root.classList.add('lb-open');
      cursor && cursor.classList.remove('is-on');
    };
    const close = () => { if (lb.open) lb.close(); };
    shots.forEach((s, i) => s.addEventListener('click', () => open(i)));
    $('[data-lb-close]', lb).addEventListener('click', close);
    $('[data-lb-prev]', lb).addEventListener('click', () => show(idx - 1));
    $('[data-lb-next]', lb).addEventListener('click', () => show(idx + 1));
    lb.addEventListener('close', () => root.classList.remove('lb-open'));
    lb.addEventListener('click', e => { if (e.target === lb || e.target.classList.contains('lightbox__in')) close(); });
    lb.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') show(idx - 1);
      if (e.key === 'ArrowRight') show(idx + 1);
    });
    let sx = null;
    lb.addEventListener('pointerdown', e => { sx = e.clientX; });
    lb.addEventListener('pointerup', e => {
      if (sx === null) return;
      const dx = e.clientX - sx;
      sx = null;
      if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1));
    });
  }

  /* ---------- WhatsApp flutuante ---------- */
  const fab = $('[data-fab]');
  let fabHidden = false, fabOn = null;
  const endIO = new IntersectionObserver(entries => {
    entries.forEach(e => { e.target.__vis = e.isIntersecting; });
    fabHidden = $$('.final, .footer').some(el => el.__vis);
    requestTick();
  });
  $$('.final, .footer').forEach(el => endIO.observe(el));
  function fabState() {
    const on = scrollY > vh * 0.8 && !fabHidden;
    if (on !== fabOn) { fabOn = on; fab.classList.toggle('is-on', on); }
  }

  /* ---------- aba oculta: pausa tudo ---------- */
  d.addEventListener('visibilitychange', () => {
    d.body.classList.toggle('paused', d.hidden);
    if (d.hidden) { if (videoArmed) video.pause(); }
    else { tryPlay(); startTicker(); }
  });

  /* ---------- movimento reduzido ao vivo, nos dois sentidos ---------- */
  mqReduce.addEventListener('change', e => {
    reduced = e.matches;
    if (reduced) {
      if (videoArmed) video.pause();
      hero.classList.remove('is-playing');
      $$('[data-reveal]').forEach(el => el.classList.add('in', 'settled'));
      $$('[data-magnetic]').forEach(b => { b.style.setProperty('--mx', '0px'); b.style.setProperty('--my', '0px'); });
      depthEls.forEach(o => { o.el.style.setProperty('--dx', 0); o.el.style.setProperty('--dy', 0); });
    } else {
      if (!videoArmed) armVideo(); else tryPlay();
      startTicker();
    }
    requestTick();
  });

  const year = $('[data-year]');
  if (year) year.textContent = new Date().getFullYear();

  requestTick();
})();
