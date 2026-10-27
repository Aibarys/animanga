// ---------- Вебтун: глава — одна длинная лента кадров встык, читается обычной прокруткой ----------
// Кадры режет tools/cut_strip.py (pages/s001.jpg … и pages/strip.json). Эффекты в story.js привязаны
// к номеру кадра: одни срабатывают, когда кадр доезжает до середины экрана (тряска, вспышка, удар,
// глитч), другие живут, пока кадр на экране (искры, звёзды, свечение, помехи, сердцебиение).
//
// Эффекты кадра — объект, всё необязательно. Рамка box — [x, y, w, h] в долях кадра; без неё берётся
// рисунок кадра (art из strip.json), то есть кадр без пустого фона вокруг.
//   system: true | box | [box, …] | { box, color }  — системное окно: включается с глитчем и полосой
//           сканирования, рамка светится. color: 'blue' (сценарий), 'red' (канал, созвездия), 'steel';
//           soft: true — без рамки, с размытыми краями (окна вдалеке, осколки света)
//   glitch: сила            — кадр рвётся на полосы и цветные каналы (сбой реальности)
//   static: сила | { box, amount } — телевизионные помехи поверх рамки
//   embers / stars / dust: true | box | { box, amount } — искры вверх, мерцающие звёзды, пыль и обломки вниз
//   glow:   box | { box, color } — мягкий пульсирующий свет: экран телефона, глаз, рога токкэби
//   shake:  сила   — тряска;   punch: сила — удар: кадр резко «въезжает» с увеличения
//   flash:  сила | { strength, color } — вспышка на весь экран;  strobe: цвет — мигание (молния, тревога)
//   blood:  сила   — красная вспышка и красные края экрана;  pulse: true — красные края бьются, как сердце
//   speedlines: true — линии концентрации;  push: сила — медленный наезд, пока кадр проезжает экран

const COLORS = { blue: '#5fd8ff', red: '#ff3b4a', steel: '#9cc3d9', gold: '#ffc861', white: '#ffffff', purple: '#c58bff', yellow: '#ffe36b' };
const tone = (c, fallback) => COLORS[c] ?? c ?? fallback;
const rand = (a, b) => a + Math.random() * (b - a);

// Фильтры, которые оставляют от картинки только красный или только сине-зелёный канал
function addChannelFilters() {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'channel-filters');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `
    <filter id="only-r" color-interpolation-filters="sRGB"><feColorMatrix values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"/></filter>
    <filter id="only-gb" color-interpolation-filters="sRGB"><feColorMatrix values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"/></filter>`;
  document.body.appendChild(svg);
}

export function buildStrip(root, ctx) {
  const { el, loadNear, shake, createSpeedLines, fitCanvas, canvases, strip, frames, debug } = ctx;
  const W = strip.width;
  addChannelFilters();
  const section = el('section', 'strip', root);
  const column = el('div', 'strip-col', section);

  // Всё, что на весь экран, лежит в одном фиксированном слое поверх ленты
  const layer = el('div', 'strip-fx', document.body);
  const sky = el('canvas', 'strip-particles', layer);
  const speed = createSpeedLines(el('canvas', 'strip-speed', layer), 'rgba(255, 255, 255, 0.92)');
  const blood = el('div', 'strip-blood', layer);
  const edges = el('div', 'strip-edges', layer);
  const flash = el('div', 'strip-flash', layer);
  const particles = createSky(sky, fitCanvas, canvases);
  let beat = 0;   // сколько кадров с сердцебиением сейчас на экране
  gsap.ticker.add((time) => {
    if (!beat) return;
    const t = time % 1.1;   // двойной удар сердца раз в 1.1 с
    const k = Math.exp(-((t - 0.1) ** 2) / 0.004) + 0.7 * Math.exp(-((t - 0.32) ** 2) / 0.004);
    edges.style.opacity = String(0.25 + 0.55 * k);
  });

  const flashOnce = (strength = 0.6, color = '#fff') => {
    gsap.killTweensOf(flash);
    gsap.fromTo(flash, { opacity: 0.95 * Math.min(1, strength), backgroundColor: color }, { opacity: 0, duration: 0.55, ease: 'power2.out' });
  };

  strip.segments.forEach((seg, i) => {
    const n = i + 1;
    const frame = el('div', 'seg', column);
    frame.id = `k${n}`;   // index.html#k40 — сразу к сороковому кадру
    frame.style.aspectRatio = `${W} / ${seg.h}`;
    const zoom = el('div', 'seg-zoom', frame);
    const hit = el('div', 'seg-hit', zoom);
    const img = el('img', '', hit);
    img.alt = '';
    img.decoding = 'async';
    img.width = W;
    img.height = seg.h;
    loadNear(frame, [[img, seg.src]]);
    if (debug) el('span', 'seg-label', frame).textContent = n;

    const fx = frames[n];
    if (!fx) return;
    const art = seg.art ?? [0, 0, 1, 1];
    const boxOf = (v) => (Array.isArray(v) && typeof v[0] === 'number' ? v : v?.box ?? art);
    const bursts = [];   // срабатывают, когда кадр доезжает до середины экрана
    const lives = [];    // включены, пока кадр на экране: (on) => …

    if (fx.shake) bursts.push(() => shake(column, fx.shake));
    if (fx.punch) bursts.push(() => gsap.fromTo(hit, { scale: 1 + 0.1 * fx.punch }, { scale: 1, duration: 0.5, ease: 'expo.out', overwrite: true }));
    if (fx.flash) {
      const f = typeof fx.flash === 'number' ? { strength: fx.flash } : fx.flash;
      bursts.push(() => flashOnce(f.strength ?? 0.6, tone(f.color, '#fff')));
    }
    if (fx.strobe) {
      const color = tone(fx.strobe === true ? 'yellow' : fx.strobe);
      bursts.push(() => [0, 0.14, 0.34].forEach((d, k) => gsap.delayedCall(d, () => flashOnce(k === 1 ? 0.35 : 0.6, color))));
    }
    if (fx.blood) {
      bursts.push(() => {
        gsap.killTweensOf(blood);
        gsap.fromTo(blood, { opacity: Math.min(1, 0.9 * fx.blood) }, { opacity: 0, duration: 1.1, ease: 'power2.out' });
        if (!beat) gsap.fromTo(edges, { opacity: 0.9 }, { opacity: 0, duration: 1.4, ease: 'power2.out' });
      });
    }
    if (fx.speedlines) {
      bursts.push(() => gsap.fromTo(speed.state, { amount: 1 }, { amount: 0, duration: 0.8, ease: 'power1.in', overwrite: true }));
    }
    if (fx.glitch) {
      const g = createGlitch(hit, seg.src, [0, 0, 1, 1], el);
      bursts.push(() => g.burst(fx.glitch, 0.55));
    }
    const systems = !fx.system ? [] : Array.isArray(fx.system) && typeof fx.system[0] !== 'number' ? fx.system : [fx.system];
    // Каждое окно загружается, когда до середины экрана доезжает оно само: в высоком кадре их бывает два
    for (const s of systems) {
      const box = boxOf(s);
      const holo = createHolo(hit, seg.src, box, tone(s.color, COLORS.blue), el, s.soft);
      ScrollTrigger.create({ trigger: frame, start: () => `top+=${frame.offsetHeight * (box[1] + box[3] / 2)} 62%`, onEnter: holo.boot });
      lives.push(holo.live);
    }
    if (fx.static) {
      const s = typeof fx.static === 'number' ? { amount: fx.static } : fx.static;
      const tv = createStatic(hit, boxOf(s), s.amount ?? 0.5, el, seg.h / W);
      bursts.push(tv.burst);
      lives.push(tv.live);
    }
    if (fx.glow) {
      const g = el('div', 'seg-glow', hit);
      place(g, boxOf(fx.glow));
      g.style.setProperty('--c', tone(fx.glow.color, COLORS.white));
      bursts.push(() => gsap.fromTo(g, { opacity: 1 }, { opacity: 0.6, duration: 1.2, ease: 'power2.out', overwrite: true }));
      lives.push((on) => gsap.to(g, { opacity: on ? 0.6 : 0, duration: 0.6, overwrite: true }));
    }
    if (fx.pulse) lives.push((on) => { beat += on ? 1 : -1; if (!beat) gsap.to(edges, { opacity: 0, duration: 0.4 }); });
    for (const kind of ['embers', 'stars', 'dust']) {
      if (!fx[kind]) continue;
      const v = fx[kind];
      const src = particles.source(kind, frame, v === true ? art : boxOf(v), v.amount ?? 1);
      lives.push((on) => { src.on = on; });
    }
    if (fx.push) {
      gsap.fromTo(zoom, { scale: 1 }, {
        scale: 1 + 0.08 * fx.push, ease: 'none',
        scrollTrigger: { trigger: frame, start: 'top bottom', end: 'bottom top', scrub: true },
      });
    }

    // Остальное срабатывает вместе с первым окном, а без окон — по середине рисунка, не всего кадра
    const [, by, , bh] = systems.length ? boxOf(systems[0]) : art;
    if (bursts.length) {
      ScrollTrigger.create({
        trigger: frame, start: () => `top+=${frame.offsetHeight * (by + bh / 2)} 62%`,
        onEnter: () => bursts.forEach((b) => b()),
      });
    }
    if (lives.length) {
      ScrollTrigger.create({
        trigger: frame, start: 'top bottom', end: 'bottom top',
        onToggle: (self) => lives.forEach((l) => l(self.isActive)),
      });
    }
  });
  return section;
}

function place(node, [x, y, w, h]) {
  Object.assign(node.style, { left: `${x * 100}%`, top: `${y * 100}%`, width: `${w * 100}%`, height: `${h * 100}%` });
}

// Копия куска кадра той же картинкой фоном: на копиях делаются разрывы и сдвиг цветовых каналов.
// Картинку ставим только при первом срабатывании — к этому времени она уже загружена
function copyOf(node, src, [x, y, w, h]) {
  node.style.backgroundSize = `${100 / w}% ${100 / h}%`;
  node.style.backgroundPosition = `${w < 1 ? (x / (1 - w)) * 100 : 0}% ${h < 1 ? (y / (1 - h)) * 100 : 0}%`;
  return () => { if (!node.style.backgroundImage) node.style.backgroundImage = `url("${src}")`; };
}

// Сбой: красный и сине-зелёный каналы разъезжаются, полосы кадра дёргаются вбок, потом всё сходится
function createGlitch(parent, src, box, el) {
  const wrap = el('div', 'glitch', parent);
  place(wrap, box);
  const split = el('div', 'glitch-split', wrap);
  const r = el('div', 'glitch-r', split);
  const gb = el('div', 'glitch-gb', split);
  const slices = [0, 1, 2, 3].map(() => el('div', 'glitch-slice', wrap));
  const loads = [r, gb, ...slices].map((n) => copyOf(n, src, box));
  let timer = 0;

  function jolt(strength) {
    const s = 10 * strength;
    gsap.set(r, { x: -s * rand(0.5, 1) });
    gsap.set(gb, { x: s * rand(0.5, 1) });
    slices.forEach((sl) => {
      const top = rand(0, 92);
      sl.style.clipPath = `inset(${top}% 0 ${Math.max(0, 100 - top - rand(2, 12))}% 0)`;
      gsap.set(sl, { x: rand(-3, 3) * s, opacity: Math.random() < 0.8 ? 1 : 0 });
    });
  }

  return {
    burst(strength = 1, duration = 0.5) {
      loads.forEach((l) => l());
      clearInterval(timer);
      gsap.killTweensOf([wrap, r, gb]);
      gsap.set(wrap, { opacity: 1 });
      jolt(strength);
      timer = setInterval(() => jolt(strength), 60);
      gsap.delayedCall(duration, () => {
        clearInterval(timer);
        gsap.to([r, gb, ...slices], { x: 0, duration: 0.12 });
        gsap.to(wrap, { opacity: 0, duration: 0.25, delay: 0.1 });
      });
    },
  };
}

// Системное окно (главный эффект): глитч при включении, полоса сканирования сверху вниз, светящаяся
// рамка и строки развёртки. Пока окно на экране, оно чуть мерцает и изредка снова сбоит
function createHolo(parent, src, box, color, el, soft) {
  const holo = el('div', soft ? 'holo soft' : 'holo', parent);
  place(holo, box);
  holo.style.setProperty('--c', color);
  const body = el('div', 'holo-body', holo);
  const sweep = el('div', 'holo-sweep', holo);
  const glitch = createGlitch(parent, src, box, el);
  let blink = null;

  function boot() {
    glitch.burst(0.9, 0.45);
    gsap.fromTo(body, { opacity: 0 }, {
      keyframes: [{ opacity: 1, duration: 0.05 }, { opacity: 0.3, duration: 0.06 }, { opacity: 1, duration: 0.05 }, { opacity: 0.5, duration: 0.08 }, { opacity: 1, duration: 0.1 }],
      ease: 'none',
    });
    // Полоса сканирования проходит окно сверху донизу и гаснет у нижнего края, не вылезая за рамку
    gsap.fromTo(sweep, { top: '0%' }, { top: '78%', duration: 0.9, ease: 'power1.inOut' });
    gsap.fromTo(sweep, { opacity: 0 }, { keyframes: [{ opacity: 1, duration: 0.12 }, { opacity: 1, duration: 0.5 }, { opacity: 0, duration: 0.28 }], ease: 'none' });
  }

  function live(on) {
    holo.classList.toggle('on', on);
    blink?.kill();
    blink = null;
    if (!on) return;
    const again = () => { glitch.burst(0.35, 0.12); blink = gsap.delayedCall(rand(2.5, 5), again); };
    blink = gsap.delayedCall(rand(2.5, 5), again);
  }

  return { boot, live };
}

// Помехи: маленький холст с шумом, растянутый на рамку, плюс бегущая полоса, как у старого телевизора
// aspect — высота кадра к ширине: зерно помех мелкое и чуть вытянуто вдоль строк, как на экране
function createStatic(parent, box, amount, el, aspect) {
  const canvas = el('canvas', 'tv', parent);
  place(canvas, box);
  canvas.width = 180;
  canvas.height = Math.min(640, Math.max(24, Math.round((180 * 1.5 * aspect * box[3]) / box[2])));
  const c = canvas.getContext('2d');
  const noise = c.createImageData(canvas.width, canvas.height);
  const roll = el('div', 'tv-roll', parent);
  place(roll, box);
  let on = false;
  let frame = 0;
  gsap.ticker.add(() => {
    if (!on || frame++ % 2) return;
    const d = noise.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = Math.random() * 255;
      d[i] = d[i + 1] = d[i + 2] = v;
      d[i + 3] = 255;
    }
    c.putImageData(noise, 0, 0);
  });
  return {
    burst() {
      gsap.fromTo(canvas, { opacity: Math.min(0.9, amount + 0.35) }, { opacity: 0.14 * amount, duration: 0.6, ease: 'power2.out', overwrite: true });
    },
    live(active) {
      on = active;
      gsap.to(canvas, { opacity: active ? 0.14 * amount : 0, duration: 0.4, overwrite: true });
      roll.classList.toggle('on', active);
    },
  };
}

// ---------- Частицы поверх ленты: искры, звёзды, пыль ----------
// Один холст на весь экран; частица помнит место в долях своего кадра, поэтому едет вместе с ним,
// и рисуется только внутри него

const RATE = { embers: 16, stars: 7, dust: 12 };

function createSky(canvas, fitCanvas, canvases) {
  const c = canvas.getContext('2d');
  const sources = [];
  let dpr = 1;
  canvases.push({ resize: () => { dpr = fitCanvas(canvas); } });

  function spawn(src) {
    const [x, y, w, h] = src.box;
    const p = { x: x + Math.random() * w, y: y + Math.random() * h, age: 0, seed: Math.random() * 6.28 };
    if (src.kind === 'embers') Object.assign(p, { y: y + h * rand(0.4, 1), life: rand(1.2, 2.6), vy: -rand(0.05, 0.13), r: rand(1.2, 3.2), hue: rand(14, 42) });
    if (src.kind === 'stars') Object.assign(p, { life: rand(1.1, 2.2), r: rand(3, 8) });
    if (src.kind === 'dust') Object.assign(p, { y: y + h * rand(0, 0.6), life: rand(2, 3.5), vy: rand(0.03, 0.07), vx: rand(-0.02, 0.02), r: rand(1, 2.6) });
    src.parts.push(p);
  }

  function draw(src, rect) {
    const k = rect.width * dpr;
    const ox = rect.left * dpr;
    const oy = rect.top * dpr;
    const aspect = rect.height / rect.width;   // y в долях высоты кадра → в долях ширины
    for (const p of src.parts) {
      const t = p.age / p.life;
      if (src.kind === 'embers') {
        const px = ox + (p.x + Math.sin(p.seed + p.age * 3) * 0.012) * k;
        const py = oy + (p.y * aspect + p.vy * p.age) * k;
        const a = Math.sin(Math.PI * t) * (0.6 + 0.4 * Math.sin(p.age * 17 + p.seed));
        const r = p.r * dpr;
        c.fillStyle = `hsla(${p.hue}, 100%, 60%, ${0.35 * a})`;
        c.beginPath(); c.arc(px, py, r * 2.6, 0, 6.28); c.fill();
        c.fillStyle = `hsla(${p.hue + 15}, 100%, 82%, ${a})`;
        c.beginPath(); c.arc(px, py, r, 0, 6.28); c.fill();
      } else if (src.kind === 'stars') {
        const px = ox + p.x * k;
        const py = oy + p.y * aspect * k;
        const s = p.r * dpr * Math.sin(Math.PI * t);
        const q = s * 0.14;
        c.save();
        c.translate(px, py);
        c.globalAlpha = Math.sin(Math.PI * t);
        c.fillStyle = 'rgba(190, 225, 255, 0.35)';
        c.beginPath(); c.arc(0, 0, s * 0.9, 0, 6.28); c.fill();
        c.fillStyle = '#fff';
        c.beginPath();
        c.moveTo(0, -s); c.quadraticCurveTo(q, -q, s, 0); c.quadraticCurveTo(q, q, 0, s);
        c.quadraticCurveTo(-q, q, -s, 0); c.quadraticCurveTo(-q, -q, 0, -s);
        c.fill();
        c.restore();
      } else {
        const px = ox + (p.x + p.vx * p.age) * k;
        const py = oy + (p.y * aspect + p.vy * p.age) * k;
        c.fillStyle = `rgba(70, 62, 58, ${0.75 * Math.sin(Math.PI * t)})`;
        c.fillRect(px, py, p.r * dpr * 1.6, p.r * dpr);
      }
    }
  }

  let dt = 0;
  const alive = (p) => (p.age += dt) < p.life;
  gsap.ticker.add((time, deltaTime) => {
    const busy = sources.filter((s) => s.on || s.parts.length);
    if (!busy.length && !canvas.dirty) return;
    dt = Math.min(deltaTime, 50) / 1000;
    c.clearRect(0, 0, canvas.width, canvas.height);
    canvas.dirty = busy.length > 0;
    for (const src of busy) {
      const rect = src.frame.getBoundingClientRect();
      if (src.on) {
        src.acc += dt * RATE[src.kind] * src.amount * Math.min(2, rect.height / innerHeight + 0.4);
        for (; src.acc >= 1; src.acc -= 1) spawn(src);
      }
      src.parts = src.parts.filter(alive);
      c.save();
      c.beginPath();
      c.rect(rect.left * dpr, rect.top * dpr, rect.width * dpr, rect.height * dpr);
      c.clip();
      if (src.kind === 'embers') c.globalCompositeOperation = 'lighter';
      draw(src, rect);
      c.restore();
    }
  });

  return {
    source(kind, frame, box, amount) {
      const src = { kind, frame, box, amount, on: false, acc: 0, parts: [] };
      sources.push(src);
      return src;
    },
  };
}
