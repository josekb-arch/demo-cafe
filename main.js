(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = () => window.matchMedia('(max-width:760px)').matches;
  const loader = $('#loader');
  const hideLoader = () => { loader.classList.add('done'); setTimeout(() => (loader.hidden = true), 700); };

  /* ---------- basket (both modes) ---------- */
  let n = 0; const count = $('#count');
  $$('.add').forEach(b => b.addEventListener('click', () => {
    count.textContent = ++n;
    $('.basket').setAttribute('aria-label', `my basket, ${n} item${n === 1 ? '' : 's'}`);
    if (!RM && window.gsap) gsap.fromTo('.basket', { scale: 1.12 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1,.4)' });
    b.textContent = 'added'; setTimeout(() => (b.textContent = 'to cart'), 1200);
  }));

  /* ---------- prefers-reduced-motion: static, readable page ---------- */
  if (RM) {
    root.classList.add('rm');
    $$('.txt').forEach(s => { s.removeAttribute('inert'); s.removeAttribute('aria-hidden'); });
    $('#st-t').textContent = '92°C'; $('#st-g').textContent = '18g'; $('#st-m').textContent = '3:30';
    hideLoader();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  const XF = isMobile() ? 0.2 : 0.4; // crossfade = 20% (10% on phones) of a 2-unit section
  const T_END = 10.3;
  const PORTRAIT = innerWidth / innerHeight < 0.75; // phones get centre-cropped frames (half the pixels)

  /* ---------- image layers: cover + focal point (hero object always at left:50%) ---------- */
  const LAYERS = {
    pour: { el: $('#L-pour'), fx: 0.572, fy: 0.5 },
    drop: { el: $('#L-drop'), fx: 0.505, fy: 0.5 },
    cup:  { el: $('#L-cup'),  fx: 0.51,  fy: 0.5 },
  };
  const IW = 1920, IH = 1080;
  function layoutLayer(L) {
    const vw = innerWidth, vh = innerHeight;
    const s = Math.max(vw / IW, vh / IH, vw / (2 * Math.min(L.fx, 1 - L.fx)) / IW, vh / (2 * Math.min(L.fy, 1 - L.fy)) / IH);
    const w = IW * s, h = IH * s, img = L.el.querySelector('img');
    img.style.width = w + 'px'; img.style.height = h + 'px';
    img.style.left = (vw / 2 - L.fx * w) + 'px'; img.style.top = (vh / 2 - L.fy * h) + 'px';
    L.h = h; L.top = vh / 2 - L.fy * h;
  }
  const yOf = (L, fy) => L.top + fy * L.h;

  /* ---------- scroll-scrubbed frame sequences on canvas ---------- */
  const V = '?v=4';
  const range = (dir, n) => Array.from({ length: n }, (_, i) => `assets/seq/${dir}${PORTRAIT ? '-m' : ''}/${String(i + 1).padStart(3, '0')}.webp${V}`);
  const ok = im => im && im.complete && im.naturalWidth;
  class Seq {
    constructor(canvas, src, fx = 0.5, fy = 0.5) {
      this.c = canvas; this.ctx = canvas.getContext('2d', { alpha: false }); this.src = src;
      this.fx = PORTRAIT ? 0.5 : fx; this.fy = fy; // portrait frames are already cropped around the focal point
      this.frames = new Array(src.length); this.f = 0; this.last = -1; this.started = false;
    }
    size() { // 1 canvas px per CSS px: the frames are 1280px, more pixels only cost fill-rate
      const w = Math.round(innerWidth), h = Math.round(innerHeight);
      if (this.c.width !== w || this.c.height !== h) { this.c.width = w; this.c.height = h; }
      this.last = -1; this.draw();
    }
    near(i) { for (let d = 0; d < this.frames.length; d++) { if (ok(this.frames[i - d])) return this.frames[i - d]; if (ok(this.frames[i + d])) return this.frames[i + d]; } }
    draw() {
      const i = Math.max(0, Math.min(this.frames.length - 1, Math.round(this.f)));
      if (i === this.last) return;
      const img = this.near(i); if (!img) return;
      const cw = this.c.width, ch = this.c.height, iw = img.naturalWidth, ih = img.naturalHeight;
      const s = Math.max(cw / iw, ch / ih, cw / (2 * Math.min(this.fx, 1 - this.fx)) / iw, ch / (2 * Math.min(this.fy, 1 - this.fy)) / ih);
      const w = iw * s, h = ih * s;
      this.ctx.drawImage(img, cw / 2 - this.fx * w, ch / 2 - this.fy * h, w, h);
      this.c.classList.add('ready');
      if (img === this.frames[i]) this.last = i;
    }
    load(i) {
      return new Promise(res => {
        if (this.frames[i]) return res();
        const im = new Image(); this.frames[i] = im;
        const done = () => { if (Math.abs(i - this.f) < 4) { this.last = -1; this.draw(); } res(); };
        im.onload = () => (im.decode ? im.decode().catch(() => {}) : Promise.resolve()).then(done);
        im.onerror = res;
        im.src = this.src[i];
      });
    }
    async start() { // coarse pass (every 4th frame) then fill in
      if (this.started) return; this.started = true;
      const coarse = []; for (let i = 0; i < this.src.length; i += 4) coarse.push(i); coarse.push(this.src.length - 1);
      for (let k = 0; k < coarse.length; k += 6) await Promise.all(coarse.slice(k, k + 6).map(i => this.load(i)));
      for (let i = 0; i < this.src.length; i++) if (!this.frames[i]) await this.load(i);
    }
  }
  const canvas = $('#seq');
  const heroSeq = new Seq(canvas, [...range('fill', 71), ...range('grind', 85)]);
  const pourSeq = new Seq($('#L-pour canvas'), range('pour', 60), 0.572, 0.5);
  const dropSeq = new Seq($('#L-drop canvas'), range('drop', 60), 0.505, 0.5);
  const SEQS = [heroSeq, pourSeq, dropSeq];
  const sizeCanvas = () => SEQS.forEach(q => q.size());
  // hero: first frame, then the rest. pour/drop: lazy, when their section gets close (see onProgress)
  heroSeq.load(0).then(() => { hideLoader(); heroSeq.start(); });
  setTimeout(hideLoader, 5000);

  /* ---------- bubbles ---------- */
  const bub = $('#bubbles');
  for (let i = 0; i < 14; i++) {
    const b = document.createElement('i'); const s = 4 + Math.random() * 12;
    Object.assign(b.style, { width: s + 'px', height: s + 'px', left: (50 + (Math.random() - .5) * 70) + '%', animationDuration: (2.5 + Math.random() * 3) + 's', animationDelay: (-Math.random() * 5) + 's' });
    bub.appendChild(b);
  }

  /* ---------- geometry: thread, stream, ripples ---------- */
  const thread = $('#thread'), stream = $('#stream'), ripples = $('#ripples');
  const G = {};
  function geometry() {
    Object.values(LAYERS).forEach(layoutLayer);
    const vh = innerHeight, mob = isMobile();
    // the thread never crosses the nav: below the top bar, above the phone tab bar
    const T = mob ? 70 : 74, B = mob ? vh - 84 : vh;
    thread.style.top = T + 'px'; thread.style.height = (B - T) + 'px';
    const dripTop = yOf(LAYERS.pour, 0.43);
    $('#L-pour').style.setProperty('--steamY', (dripTop - 190) + 'px');
    const spout = yOf(LAYERS.drop, 0.27), impact = yOf(LAYERS.drop, 0.555);
    stream.style.top = spout + 'px'; stream.style.height = (impact - spout) + 'px';
    ripples.style.top = impact + 'px';
    bub.style.top = (impact + vh * 0.06) + 'px';
    bub.style.height = Math.max(80, vh - impact - vh * 0.06) + 'px';
    $('#s-drop').style.setProperty('--dropY', (yOf(LAYERS.drop, 0.40) / vh * 100) + '%');
    G.T = T; G.H = B - T; G.dripTop = dripTop;
  }

  /* ---------- Lenis ---------- */
  const lenis = new Lenis({ lerp: 0.085, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);

  /* ---------- stats counter ---------- */
  const st = { t: 38, g: 4, m: 60 };
  const tT = $('#st-t'), tG = $('#st-g'), tM = $('#st-m');
  const renderStats = () => {
    tT.textContent = Math.round(st.t) + '°C';
    tG.textContent = Math.round(st.g) + 'g';
    const m = Math.round(st.m); tM.textContent = Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0');
  };
  renderStats();

  /* ---------- master timeline: one story, match cuts ---------- */
  let tl;
  function build() {
    if (tl) { tl.scrollTrigger && tl.scrollTrigger.kill(); tl.revert(); tl.kill(); }
    geometry();
    tl = gsap.timeline({
      defaults: { ease: 'none' },
      onUpdate: () => onProgress(tl.progress()), // runs while the scrub catches up, not only on scroll events
      scrollTrigger: { trigger: '#track', start: 'top top', end: 'bottom bottom', scrub: 0.6 }
    });
    // 1 · ORDER COFFEE — beans fall into the hopper, the words part sideways
    tl.to(heroSeq, { f: 70, duration: 1.9, onUpdate: () => heroSeq.draw() }, 0)
      .to('.w-order', { xPercent: -95, filter: 'blur(10px)', opacity: 0, duration: 1.1, ease: 'power1.in' }, 0.15)
      .to('.w-coffee', { xPercent: 95, filter: 'blur(10px)', opacity: 0, duration: 1.1, ease: 'power1.in' }, 0.15)
      .to('.hero-copy,.hint,.s1-scrim', { y: -60, opacity: 0, duration: 0.6 }, 0.1)
    // 2 · 01 THE GRIND — precision burrs, exploded view
      .fromTo('.s2', { opacity: 0 }, { opacity: 1, duration: 0.01 }, 1.45)
      .from('.s2 .ln>span', { yPercent: 105, duration: 0.45, stagger: 0.12, ease: 'power3.out' }, 1.45)
      .from('.s2 .label', { opacity: 0, x: -20, duration: 0.35 }, 1.45)
      .from('.s2 .script', { opacity: 0, x: 30, duration: 0.4 }, 1.75)
      .from('.s2 .body', { opacity: 0, y: 20, duration: 0.4 }, 1.8)
      .to(heroSeq, { f: heroSeq.src.length - 1, duration: 2.1, onUpdate: () => heroSeq.draw() }, 1.9)
      .to('.s2', { opacity: 0, filter: 'blur(8px)', y: -30, duration: 0.45 }, 3.0)
    // the central thread: ground coffee falling (below the nav)
      .fromTo(thread, { opacity: 0, scaleY: 0 }, { opacity: 1, scaleY: 1, duration: 0.5, ease: 'power1.in', immediateRender: true,
          onStart: () => thread.className = 'thread grounds', onReverseComplete: () => thread.className = 'thread' }, 3.3)
    // match cut → 02 THE BLOOM (camera travels down)
      .to(canvas, { yPercent: -45, autoAlpha: 0, duration: XF * 2, ease: 'power1.inOut' }, 3.85)
      .fromTo('#L-pour', { autoAlpha: 0, yPercent: 40 }, { autoAlpha: 1, yPercent: 0, duration: XF * 2, ease: 'power1.inOut' }, 3.85)
      .to(thread, { scaleY: () => Math.max(0, (G.dripTop - G.T) / G.H), duration: XF * 2, ease: 'power1.inOut' }, 3.85)
      .fromTo('.s3', { opacity: 0 }, { opacity: 1, duration: 0.01 }, 4.4)
      .from('.s3 .ln>span', { yPercent: 105, duration: 0.45, stagger: 0.12, ease: 'power3.out' }, 4.4)
      .from('.s3 .label', { opacity: 0, x: -20, duration: 0.35 }, 4.4)
      .from('.s3 .script', { opacity: 0, x: 30, duration: 0.4 }, 4.7)
      .from('.s3 .stats>div', { opacity: 0, y: 20, duration: 0.35, stagger: 0.08 }, 4.6)
      .to(st, { t: 92, g: 18, m: 210, duration: 1.2, onUpdate: renderStats, ease: 'power1.out' }, 4.6)
      .to(pourSeq, { f: pourSeq.src.length - 1, duration: 2.3, onUpdate: () => pourSeq.draw() }, 3.95)
      .fromTo('#L-pour canvas', { scale: 1.0 }, { scale: 1.07, duration: 2.1, transformOrigin: '57% 45%' }, 4.0)
      .fromTo('.steam', { autoAlpha: 0, y: 30 }, { autoAlpha: 0.8, y: -40, duration: 1.4 }, 4.3)
      .to('.steam', { autoAlpha: 0, y: -90, duration: 0.6 }, 5.7)
      .to(thread, { opacity: 0.9, duration: 0.2, onStart: () => thread.className = 'thread', onReverseComplete: () => thread.className = 'thread grounds' }, 4.5)
      .to(thread, { opacity: 0, duration: 0.4 }, 4.9)
    // match cut → EVERY DROP (the thread stays hidden while the camera travels)
      .to('.s3', { opacity: 0, y: -50, duration: 0.4 }, 5.9)
      .to('#L-pour', { yPercent: -70, scale: 1.08, duration: XF * 2 + .2, ease: 'power1.inOut' }, 6.0)
      .fromTo('#L-drop', { autoAlpha: 0, yPercent: 70 }, { autoAlpha: 1, yPercent: 0, duration: XF * 2 + .2, ease: 'power1.inOut' }, 6.0)
      .to(dropSeq, { f: dropSeq.src.length - 1, duration: 2.2, onUpdate: () => dropSeq.draw() }, 6.2)
      .fromTo('#L-drop canvas', { scale: 1.08 }, { scale: 1, duration: 2.2, transformOrigin: '50% 55%' }, 6.2)
      .fromTo('#ripples,#bubbles', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, 6.5)
      .fromTo('.s4', { opacity: 0 }, { opacity: 1, duration: 0.01 }, 6.5)
      .fromTo('.drop-title', { filter: 'blur(18px)', opacity: 0, scale: 1.12 }, { filter: 'blur(0px)', opacity: 1, scale: 1, duration: 0.7, ease: 'power2.out' }, 6.5)
    // one continuous stream from the carafe through EVERY | DROP into the surface
      .fromTo(stream, { opacity: 0, scaleY: 0 }, { opacity: 1, scaleY: 1, duration: 0.4, ease: 'power1.in', immediateRender: true }, XF > 0.3 ? 7.0 : 6.8)
      .from('.s4 .label', { opacity: 0, duration: 0.4 }, 6.9)
      .from('.w-drop .script', { opacity: 0, x: 20, duration: 0.4 }, 7.0)
      .to('.w-every', { x: -12, duration: 1 }, 7.2).to('.w-drop', { x: 12, duration: 1 }, 7.2)
    // match cut → the cup (crossfade: the cup already shows before the drop is gone)
      .to(stream, { opacity: 0, duration: 0.3 }, 8.0)
      .to('.s4', { yPercent: -38, opacity: 0, filter: 'blur(4px)', duration: 0.8, ease: 'power1.in' }, 8.0)
      .to('#ripples,#bubbles', { autoAlpha: 0, duration: 0.4 }, 8.0)
      .fromTo('#L-cup', { autoAlpha: 0, scale: 1.3 }, { autoAlpha: 1, scale: 1, duration: XF * 2 + .3, ease: 'power2.out' }, 8.0)
      .fromTo('#L-cup img', { scale: 1, rotation: 0 }, { scale: 1.1, rotation: -2, duration: 2.3, transformOrigin: '51% 50%' }, 8.0)
      .fromTo('#L-cup .shade', { xPercent: -6 }, { xPercent: 6, duration: 2.3 }, 8.0)
      .to('#L-drop', { autoAlpha: 0, scale: 0.9, duration: XF * 2 + .3 }, 8.15)
    // 04 THE RITUAL — product cards reuse the journey frames
      .fromTo('.s5', { opacity: 0 }, { opacity: 1, duration: 0.01 }, 8.7)
      .from('.s5 .label', { opacity: 0, y: 10, duration: 0.3 }, 8.7)
      .from('.pick', { opacity: 0, y: 30, duration: 0.45, ease: 'power2.out' }, 8.75)
      .from('.card', { opacity: 0, y: 120, duration: 0.5, stagger: 0.09, ease: 'power3.out' }, 9.0)
      .to({}, { duration: 0.4 }, 9.9);
    onProgress(tl.progress());
  }

  /* ---------- per-scroll housekeeping: nav, lazy-load, inert, paused loops ---------- */
  const steps = $$('#steps li'), links = $$('.pill a');
  const marks = [0.18, 0.42, 0.64, 0.86];
  const sections = $$('.txt');
  const stage = $('.stage');
  const loops = [ // CSS loops only run while their scene is on screen
    ['run-steam', 4.1 / T_END, 6.2 / T_END],
    ['run-drop', 6.2 / T_END, 8.5 / T_END],
  ];
  function onProgress(p) {
    let k = -1; marks.forEach((m, i) => { if (p >= m) k = i; });
    steps.forEach((li, i) => li.classList.toggle('on', i === k));
    links.forEach((a, i) => { const on = i === Math.max(0, k); a.classList.toggle('is-active', on); on ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current'); });
    if (p > 0.12) pourSeq.start();   // ~2 scenes ahead of THE BLOOM
    if (p > 0.38) dropSeq.start();   // ahead of EVERY DROP
    loops.forEach(([c, a, b]) => stage.classList.toggle(c, p >= a && p <= b));
    sections.forEach(s => {
      const vis = s.id === 's-hero' ? p < 0.12 : Number(gsap.getProperty(s, 'opacity')) > 0.05;
      if (vis === !s.inert) return;
      s.inert = !vis; vis ? s.removeAttribute('aria-hidden') : s.setAttribute('aria-hidden', 'true');
    });
  }

  const target = { '#top': 0, '#s-grind': 0.24, '#s-pour': 0.52, '#s-drop': 0.72, '#s-shop': 1 };
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const p = target[a.getAttribute('href')]; if (p === undefined) return;
    e.preventDefault();
    const max = root.scrollHeight - innerHeight;
    lenis.scrollTo(p * max, { duration: 2.2 });
    if (a.getAttribute('href') === '#s-shop') setTimeout(() => $('.card .add').focus({ preventScroll: true }), 2300);
  }));

  sizeCanvas(); build();
  let rw = innerWidth, rt;
  addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      sizeCanvas();
      if (Math.abs(innerWidth - rw) > 40) { rw = innerWidth; build(); }
      else geometry();
      ScrollTrigger.refresh();
    }, 150);
  });
})();
