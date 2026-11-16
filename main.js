(() => {
  gsap.registerPlugin(ScrollTrigger);
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const mobile = () => window.matchMedia('(max-width:760px)').matches;
  const XF = mobile() ? 0.2 : 0.4; // crossfade = 20% (10% on phones) of a 2-unit section

  /* ---------- image layers: cover + focal point (hero object always at left:50%) ---------- */
  const LAYERS = {
    pour: { el: $('#L-pour'), fx: 0.572, fy: 0.5, z: 1.0 },
    drop: { el: $('#L-drop'), fx: 0.505, fy: 0.5, z: 1.0 },
    cup:  { el: $('#L-cup'),  fx: 0.51,  fy: 0.5, z: 1.0 },
  };
  const IW = 1920, IH = 1080;
  function layoutLayer(L) {
    const vw = innerWidth, vh = innerHeight;
    let s = Math.max(vw / IW, vh / IH) * L.z;
    const need = vw / (2 * Math.min(L.fx, 1 - L.fx)) / IW;
    const needY = vh / (2 * Math.min(L.fy, 1 - L.fy)) / IH;
    s = Math.max(s, need, needY);
    const w = IW * s, h = IH * s;
    const img = L.el.querySelector('img');
    img.style.width = w + 'px'; img.style.height = h + 'px';
    img.style.left = (vw / 2 - L.fx * w) + 'px';
    img.style.top = (vh / 2 - L.fy * h) + 'px';
    L.w = w; L.h = h; L.top = vh / 2 - L.fy * h;
  }
  const yOf = (L, fy) => L.top + fy * L.h;

  /* ---------- scroll-scrubbed frame sequences (canvas, cover + focal point) ---------- */
  const V = '?v=3';
  const range = (dir, n) => Array.from({ length: n }, (_, i) => `assets/seq/${dir}/${String(i + 1).padStart(3, '0')}.webp${V}`);
  const ok = im => im && im.complete && im.naturalWidth;
  class Seq {
    constructor(canvas, src, fx = 0.5, fy = 0.5) {
      this.c = canvas; this.ctx = canvas.getContext('2d'); this.src = src; this.fx = fx; this.fy = fy;
      this.frames = new Array(src.length); this.f = 0; this.last = -1;
    }
    size() { const d = Math.min(devicePixelRatio || 1, 2); this.c.width = innerWidth * d; this.c.height = innerHeight * d; this.last = -1; this.draw(); }
    near(i) { for (let d = 0; d < this.frames.length; d++) { if (ok(this.frames[i - d])) return this.frames[i - d]; if (ok(this.frames[i + d])) return this.frames[i + d]; } }
    draw() {
      const i = Math.max(0, Math.min(this.frames.length - 1, Math.round(this.f)));
      if (i === this.last) return;
      const img = this.near(i); if (!img) return;
      const cw = this.c.width, ch = this.c.height, iw = img.naturalWidth, ih = img.naturalHeight;
      const s = Math.max(cw / iw, ch / ih, cw / (2 * Math.min(this.fx, 1 - this.fx)) / iw, ch / (2 * Math.min(this.fy, 1 - this.fy)) / ih);
      const w = iw * s, h = ih * s;
      this.ctx.drawImage(img, cw / 2 - this.fx * w, ch / 2 - this.fy * h, w, h);
      if (img === this.frames[i]) this.last = i;
    }
    load(i) {
      return new Promise(res => {
        if (this.frames[i]) return res();
        const im = new Image(); im.decoding = 'async'; this.frames[i] = im;
        im.onload = im.onerror = () => { bump(); if (Math.abs(i - this.f) < 4) { this.last = -1; this.draw(); } res(); };
        im.src = this.src[i];
      });
    }
  }
  const canvas = $('#seq');
  const heroSeq = new Seq(canvas, [...range('fill', 71), ...range('grind', 85)]);
  const pourSeq = new Seq($('#L-pour canvas'), range('pour', 85), 0.572, 0.5);
  const dropSeq = new Seq($('#L-drop canvas'), range('drop', 85), 0.505, 0.5);
  const SEQS = [heroSeq, pourSeq, dropSeq];
  const seq = heroSeq, draw = () => heroSeq.draw();
  const SRC = heroSeq.src;
  function sizeCanvas() { SEQS.forEach(q => q.size()); }
  const loader = $('#loader');
  let loaded = 0; const bump = () => { loaded++; loader.style.setProperty('--p', Math.min(1, loaded / 40)); };
  // pass 1: first frame of every scene + every 4th frame; pass 2: everything, all scenes in parallel
  const pass1 = [];
  SEQS.forEach(q => { for (let i = 0; i < q.src.length; i += 4) pass1.push(q.load(i)); pass1.push(q.load(q.src.length - 1)); });
  Promise.all(pass1).then(() => {
    loader.classList.add('done');
    SEQS.forEach(q => { q.last = -1; q.draw(); (async () => { for (let i = 0; i < q.src.length; i++) await q.load(i); })(); });
  });
  setTimeout(() => loader.classList.add('done'), 6000);

  /* ---------- bubbles ---------- */
  const bub = $('#bubbles');
  for (let i = 0; i < 16; i++) {
    const b = document.createElement('i'); const s = 4 + Math.random() * 12;
    Object.assign(b.style, { width: s + 'px', height: s + 'px', left: (50 + (Math.random() - .5) * 70) + '%', animationDuration: (2.5 + Math.random() * 3) + 's', animationDelay: (-Math.random() * 5) + 's' });
    bub.appendChild(b);
  }

  /* ---------- geometry for thread / ripples ---------- */
  const thread = $('#thread'), ripples = $('#ripples');
  const G = {};
  function geometry() {
    Object.values(LAYERS).forEach(layoutLayer);
    const vh = innerHeight;
    const dripTop = yOf(LAYERS.pour, 0.43);
    $('#L-pour').style.setProperty('--steamY', (dripTop - 190) + 'px');
    const impact = yOf(LAYERS.drop, 0.555);
    ripples.style.top = impact + 'px';
    bub.style.top = (impact + vh * 0.06) + 'px';
    bub.style.height = Math.max(80, vh - impact - vh * 0.06) + 'px';
    thread.style.height = vh + 'px';
    $('#s-drop').style.setProperty('--dropY', (yOf(LAYERS.drop, 0.40) / vh * 100) + '%');
    G.dripTop = dripTop; G.vh = vh;
  }

  /* ---------- Lenis ---------- */
  const lenis = new Lenis({ lerp: 0.085, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);

  /* ---------- stats counter ---------- */
  const st = { t: 36, g: 9, m: 60 };
  const tT = $('#st-t'), tG = $('#st-g'), tM = $('#st-m');
  const renderStats = () => {
    tT.textContent = Math.round(st.t) + '°C';
    tG.textContent = Math.round(st.g) + 'g';
    const m = Math.round(st.m); tM.textContent = Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0');
  };

  /* ---------- master timeline: one story, match cuts ---------- */
  let tl;
  function build() {
    if (tl) { tl.scrollTrigger && tl.scrollTrigger.kill(); tl.revert(); tl.kill(); }
    geometry();
    tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: '#track', start: 'top top', end: 'bottom bottom', scrub: 0.6, onUpdate: s => nav(s.progress) }
    });
    // 1 · ORDER COFFEE — beans fall into the hopper, the words part sideways
    tl.to(seq, { f: 70, duration: 1.9, onUpdate: draw }, 0)
      .to('.w-order', { xPercent: -95, filter: 'blur(10px)', opacity: 0, duration: 1.1, ease: 'power1.in' }, 0.15)
      .to('.w-coffee', { xPercent: 95, filter: 'blur(10px)', opacity: 0, duration: 1.1, ease: 'power1.in' }, 0.15)
      .to('.hero-copy,.hint', { y: -60, opacity: 0, duration: 0.6 }, 0.1)
    // 2 · 01 THE GRIND — precision burrs, exploded view
      .fromTo('.s2', { opacity: 0 }, { opacity: 1, duration: 0.01 }, 1.45)
      .from('.s2 .ln>span', { yPercent: 105, duration: 0.45, stagger: 0.12, ease: 'power3.out' }, 1.45)
      .from('.s2 .label', { opacity: 0, x: -20, duration: 0.35 }, 1.45)
      .from('.s2 .script', { opacity: 0, x: 30, duration: 0.4 }, 1.75)
      .from('.s2 .body', { opacity: 0, y: 20, duration: 0.4 }, 1.8)
      .to(seq, { f: SRC.length - 1, duration: 2.1, onUpdate: draw }, 1.9)
      .to('.s2', { opacity: 0, filter: 'blur(8px)', y: -30, duration: 0.45 }, 3.0)
    // the central thread: ground coffee falling
      .fromTo(thread, { opacity: 0, scaleY: 0 }, { opacity: 1, scaleY: 1, duration: 0.5, ease: 'power1.in', immediateRender: true,
          onStart: () => thread.className = 'thread grounds', onReverseComplete: () => thread.className = 'thread' }, 3.3)
    // match cut → 02 THE BLOOM (camera travels down)
      .to(canvas, { yPercent: -45, opacity: 0, duration: XF * 2, ease: 'power1.inOut' }, 3.85)
      .fromTo('#L-pour', { opacity: 0, yPercent: 40 }, { opacity: 1, yPercent: 0, duration: XF * 2, ease: 'power1.inOut' }, 3.85)
      .to(thread, { scaleY: () => G.dripTop / G.vh, duration: XF * 2, ease: 'power1.inOut' }, 3.85)
      .fromTo('.s3', { opacity: 0 }, { opacity: 1, duration: 0.01 }, 4.4)
      .from('.s3 .ln>span', { yPercent: 105, duration: 0.45, stagger: 0.12, ease: 'power3.out' }, 4.4)
      .from('.s3 .label', { opacity: 0, x: -20, duration: 0.35 }, 4.4)
      .from('.s3 .script', { opacity: 0, x: 30, duration: 0.4 }, 4.7)
      .from('.s3 .stats>div', { opacity: 0, y: 20, duration: 0.35, stagger: 0.08 }, 4.6)
      .to(st, { t: 92, g: 18, m: 210, duration: 1.2, onUpdate: renderStats, ease: 'power1.out' }, 4.6)
      .to(pourSeq, { f: 84, duration: 2.3, onUpdate: () => pourSeq.draw() }, 3.95)
      .fromTo('#L-pour canvas', { scale: 1.0 }, { scale: 1.07, duration: 2.1, transformOrigin: '57% 45%' }, 4.0)
      .fromTo('.steam', { opacity: 0, y: 30 }, { opacity: 0.8, y: -40, duration: 1.4 }, 4.3)
      .to('.steam', { opacity: 0, y: -90, duration: 0.6 }, 5.7)
      .to(thread, { opacity: 0.9, duration: 0.2, onStart: () => thread.className = 'thread', onReverseComplete: () => thread.className = 'thread grounds' }, 4.5)
      .to(thread, { opacity: 0, duration: 0.4 }, 4.9)
    // match cut → EVERY DROP (follow the stream down through the carafe)
      .to('.s3', { opacity: 0, y: -50, duration: 0.4 }, 5.9)
      .to(thread, { scaleY: 1, opacity: 1, duration: 0.3, onStart: () => thread.className = 'thread amber', onReverseComplete: () => thread.className = 'thread' }, 5.95)
      .to('#L-pour', { yPercent: -70, scale: 1.08, duration: XF * 2 + .2, ease: 'power1.inOut' }, 6.0)
      .fromTo('#L-drop', { opacity: 0, yPercent: 70 }, { opacity: 1, yPercent: 0, duration: XF * 2 + .2, ease: 'power1.inOut' }, 6.0)
      .to(thread, { opacity: 0, duration: 0.3 }, 6.6)
      .to(dropSeq, { f: 84, duration: 2.2, onUpdate: () => dropSeq.draw() }, 6.2)
      .fromTo('#L-drop canvas', { scale: 1.08 }, { scale: 1, duration: 2.2, transformOrigin: '50% 55%' }, 6.2)
      .fromTo('#ripples,#bubbles', { opacity: 0 }, { opacity: 1, duration: 0.4 }, 6.5)
      .fromTo('.s4', { opacity: 0 }, { opacity: 1, duration: 0.01 }, 6.5)
      .fromTo('.drop-title', { filter: 'blur(18px)', opacity: 0, scale: 1.12 }, { filter: 'blur(0px)', opacity: 1, scale: 1, duration: 0.7, ease: 'power2.out' }, 6.5)
      .from('.s4 .label', { opacity: 0, duration: 0.4 }, 6.9)
      .from('.w-drop .script', { opacity: 0, x: 20, duration: 0.4 }, 7.0)
      .to('.w-every', { x: -12, duration: 1 }, 7.2).to('.w-drop', { x: 12, duration: 1 }, 7.2)
    // match cut → the cup (crossfade: the cup already shows before the drop is gone)
      .to('.s4', { yPercent: -38, opacity: 0, filter: 'blur(4px)', duration: 0.8, ease: 'power1.in' }, 8.0)
      .to('#ripples,#bubbles', { opacity: 0, duration: 0.4 }, 8.0)
      .fromTo('#L-cup', { opacity: 0, scale: 1.3 }, { opacity: 1, scale: 1, duration: XF * 2 + .3, ease: 'power2.out' }, 8.0)
      .fromTo('#L-cup img', { scale: 1, rotation: 0 }, { scale: 1.08, rotation: -2.5, yPercent: -2, duration: 2.3, transformOrigin: '51% 50%' }, 8.0)
      .fromTo('#L-cup .shade', { xPercent: -6 }, { xPercent: 6, duration: 2.3 }, 8.0)
      .to('#L-drop', { opacity: 0, scale: 0.9, duration: XF * 2 + .3 }, 8.15)
    // 04 THE RITUAL — product cards reuse the journey frames
      .fromTo('.s5', { opacity: 0 }, { opacity: 1, duration: 0.01 }, 8.7)
      .from('.s5 .label', { opacity: 0, y: 10, duration: 0.3 }, 8.7)
      .from('.pick', { opacity: 0, y: 30, duration: 0.45, ease: 'power2.out' }, 8.75)
      .from('.card', { opacity: 0, y: 120, duration: 0.5, stagger: 0.09, ease: 'power3.out' }, 9.0)
      .to({}, { duration: 0.4 }, 9.9);
  }

  /* ---------- nav state ---------- */
  const steps = $$('#steps li'), links = $$('.pill a');
  const marks = [0.18, 0.42, 0.64, 0.86];
  function nav(p) {
    let k = -1; marks.forEach((m, i) => { if (p >= m) k = i; });
    steps.forEach((li, i) => li.classList.toggle('on', i === k));
    links.forEach((a, i) => a.classList.toggle('is-active', i === Math.max(0, k)));
  }
  nav(0);
  const target = { '#top': 0, '#s-grind': 0.24, '#s-pour': 0.52, '#s-drop': 0.72, '#s-shop': 1 };
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const p = target[a.getAttribute('href')]; if (p === undefined) return;
    e.preventDefault();
    const max = document.documentElement.scrollHeight - innerHeight;
    lenis.scrollTo(p * max, { duration: 2.2 });
  }));

  /* ---------- basket ---------- */
  let n = 0; const count = $('#count');
  $$('.add').forEach(b => b.addEventListener('click', () => {
    count.textContent = ++n;
    gsap.fromTo('.basket', { scale: 1.12 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1,.4)' });
    b.textContent = 'added'; setTimeout(() => (b.textContent = 'to cart'), 1200);
  }));

  sizeCanvas(); build();
  let rw = innerWidth, rt;
  addEventListener('resize', () => {
    sizeCanvas();
    clearTimeout(rt);
    rt = setTimeout(() => {
      if (Math.abs(innerWidth - rw) > 40) { rw = innerWidth; build(); ScrollTrigger.refresh(); }
      else { geometry(); ScrollTrigger.refresh(); }
    }, 150);
  });
})();
