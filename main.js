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

  /* ---------- scroll-scrubbed frame sequence (beans fill + grinder explode) ---------- */
  const canvas = $('#seq'), ctx = canvas.getContext('2d');
  const SRC = [];
  for (let i = 1; i <= 71; i++) SRC.push(`assets/seq/fill/${String(i).padStart(3, '0')}.webp`);
  for (let i = 1; i <= 85; i++) SRC.push(`assets/seq/grind/${String(i).padStart(3, '0')}.webp`);
  const frames = new Array(SRC.length);
  const seq = { f: 0 };
  let lastDrawn = -1;
  function sizeCanvas() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
    lastDrawn = -1; draw();
  }
  const ok = im => im && im.complete && im.naturalWidth;
  function nearestLoaded(i) {
    for (let d = 0; d < frames.length; d++) {
      if (ok(frames[i - d])) return frames[i - d];
      if (ok(frames[i + d])) return frames[i + d];
    }
  }
  function draw() {
    const i = Math.max(0, Math.min(frames.length - 1, Math.round(seq.f)));
    if (i === lastDrawn) return;
    const img = nearestLoaded(i); if (!img) return;
    const cw = canvas.width, ch = canvas.height;
    const s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    const w = img.naturalWidth * s, h = img.naturalHeight * s;
    ctx.fillStyle = '#e2e1dd'; ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
    if (img === frames[i]) lastDrawn = i;
  }
  const loader = $('#loader');
  let loaded = 0;
  function load(i) {
    return new Promise(res => {
      if (frames[i]) return res();
      const im = new Image(); im.decoding = 'async';
      frames[i] = im;
      im.onload = im.onerror = () => { loaded++; loader.style.setProperty('--p', Math.min(1, loaded / 40)); if (Math.abs(i - seq.f) < 3) { lastDrawn = -1; draw(); } res(); };
      im.src = SRC[i];
    });
  }
  const first = []; for (let i = 0; i < SRC.length; i += 4) first.push(i);
  Promise.all(first.map(load)).then(() => {
    loader.classList.add('done'); lastDrawn = -1; draw();
    (async () => { for (let i = 0; i < SRC.length; i++) await load(i); })();
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
      .to(thread, { opacity: 0.9, duration: 0.2, onStart: () => thread.className = 'thread', onReverseComplete: () => thread.className = 'thread grounds' }, 4.5)
    // match cut → EVERY DROP (follow the stream down through the carafe)
      .to('.s3', { opacity: 0, y: -50, duration: 0.4 }, 5.9)
      .to(thread, { scaleY: 1, opacity: 1, duration: 0.3, onStart: () => thread.className = 'thread amber', onReverseComplete: () => thread.className = 'thread' }, 5.95)
      .to('#L-pour', { yPercent: -70, scale: 1.08, duration: XF * 2 + .2, ease: 'power1.inOut' }, 6.0)
      .fromTo('#L-drop', { opacity: 0, yPercent: 70 }, { opacity: 1, yPercent: 0, duration: XF * 2 + .2, ease: 'power1.inOut' }, 6.0)
      .to(thread, { opacity: 0, duration: 0.3 }, 6.6)
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
