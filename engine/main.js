gsap.registerPlugin(ScrollTrigger);

// Каждая история — своя папка: index.html, story.js и pages/ рядом. Движок берёт story.js
// возле открытой страницы, поэтому все пути в сценарии — от папки истории
const root = document.getElementById('story');
const story = await import(new URL(root.dataset.story ?? 'story.js', document.baseURI).href);
const { pages, scenes } = story;
const params = new URLSearchParams(location.search);
const DEBUG = params.has('debug');
const FLAT = params.has('flat');   // ?flat — без слоёв и живых панелей, чтобы сравнить с плоской версией
const LIVE = Number(params.get('live')) || 1;   // ?live=4 — утрировать движение живых панелей, чтобы видеть карту
const INK = '#0e0d0c';
const MOVE = 1;      // перелёт камеры между шагами (в единицах таймлайна)
const HOLD = 1.4;    // сколько камера стоит на шаге
const PUSH = 0.05;   // лёгкий наезд, пока камера стоит, чтобы кадр не замирал
const FIT = 0.88;    // какую часть экрана занимает панель
const KP = 0.05;     // параллакс: насколько сильнее фона сдвигается близкий слой при движении камеры
const KZ = 0.05;     // насколько близкий слой «выдвигается» вперёд, пока камера стоит

const lenis = new Lenis({ lerp: 0.09 });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
window.lenis = lenis;

// Тонкая полоска сверху — сколько истории уже пролистано
const progress = document.querySelector('.progress');
if (progress) lenis.on('scroll', ({ progress: p }) => { progress.style.transform = `scaleX(${p})`; });

const sizes = {};
let layered = {};
let living = {};
const images = {};   // загруженные картинки по адресу — из них живые панели делают текстуры
const shots = [];
const canvases = [];

const el = (tag, cls, parent) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (parent) parent.appendChild(node);
  return node;
};

const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => {
    images[src] = img;
    resolve(img);
  };
  img.onerror = () => reject(new Error(`Не удалось загрузить ${src}`));
  img.src = src;
});

// Картинки страницы ставятся, когда до её сцены остаётся пара экранов: у полной главы страниц
// на десятки мегабайт, и ждать их все до первого кадра нельзя
const nearby = new Map();
const approach = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    approach.unobserve(entry.target);
    nearby.get(entry.target)?.forEach(([node, src]) => { node.src = src; });
    nearby.delete(entry.target);
  }
}, { rootMargin: '200% 0px' });

function loadNear(section, list) {
  nearby.set(section, list);
  approach.observe(section);
}

function fitCanvas(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(canvas.clientWidth * dpr);
  canvas.height = Math.round(canvas.clientHeight * dpr);
  return dpr;
}

// ---------- Камера: летает по странице и вырезает панель ----------

// Рамка панели — [x, y, w, h] или, для наклонных панелей, четырёхугольник [[x, y] × 4]:
// левый верхний угол, правый верхний, правый нижний, левый нижний. Всё в долях страницы.
const cornersOf = (shape) => {
  if (Array.isArray(shape[0])) return shape;
  const [x, y, w, h] = shape;
  return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
};

function shapeOf(pageId, view) {
  if (!view || view === 'page') return [0, 0, 1, 1];
  if (Array.isArray(view)) return view;
  const shape = pages[pageId].panels?.[view];
  if (!shape) throw new Error(`На странице «${pageId}» нет панели «${view}»`);
  return shape;
}

// Прямоугольник вокруг рамки — по нему камера наводится и подбирает масштаб
function rectOf(pageId, view) {
  const pts = cornersOf(shapeOf(pageId, view));
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return [x, y, Math.max(...xs) - x, Math.max(...ys) - y];
}

const FULL_PAGE = [[0, 0], [1, 0], [1, 1], [0, 1]];
const OUTWARD = [[-1, -1], [1, -1], [1, 1], [-1, 1]];   // куда раздвигать каждый угол выреза

function stateFor(pageId, step) {
  const [x, y, w, h] = rectOf(pageId, step.view);
  const isPage = !step.view || step.view === 'page';
  const focus = step.focus ?? !isPage;
  const pad = 0.001;
  const state = {
    cx: x + w / 2,
    cy: y + h / 2,
    lw: Math.log(w),
    lh: Math.log(h),
    lz: Math.log(step.zoom ?? 1),
    bleed: focus ? 0 : 1,
    tint: step.tint ?? 0,
    pk: step.parallax ?? (isPage ? 0.3 : 1),   // сила параллакса на этом шаге
    hp: 0,                                      // 0 → 1, пока камера стоит на шаге
  };
  // Вырез — четыре угла q0…q3; без фокуса он раскрыт на всю страницу.
  // Камера перелетает между вырезами, плавно двигая каждый угол
  (focus ? cornersOf(shapeOf(pageId, step.view)) : FULL_PAGE).forEach(([px, py], i) => {
    state[`q${i}x`] = Math.min(1, Math.max(0, px + OUTWARD[i][0] * pad));
    state[`q${i}y`] = Math.min(1, Math.max(0, py + OUTWARD[i][1] * pad));
  });
  return state;
}

// Не даём камере выехать за край страницы, если кадр не обрезан рамкой
const keepInside = (t, scaled, view) => (scaled > view ? Math.min(0, Math.max(view - scaled, t)) : t);

function applyCamera(shot) {
  const { stage, cam, tint, W, H, st } = shot;
  const vw = stage.clientWidth;
  const vh = stage.clientHeight;
  const fit = Math.min((vw * FIT) / (Math.exp(st.lw) * W), (vh * FIT) / (Math.exp(st.lh) * H));
  const s = fit * Math.exp(st.lz);
  let tx = vw / 2 - s * st.cx * W;
  let ty = vh / 2 - s * st.cy * H;
  tx += (keepInside(tx, s * W, vw) - tx) * st.bleed;
  ty += (keepInside(ty, s * H, vh) - ty) * st.bleed;
  cam.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`;
  cam.style.clipPath = `polygon(${[0, 1, 2, 3].map((i) => `${st[`q${i}x`] * 100}% ${st[`q${i}y`] * 100}%`).join(', ')})`;
  tint.style.opacity = st.tint;

  // Близкие слои: сдвиг тем сильнее, чем дальше камера от их «якоря», и лёгкий рост к зрителю.
  // Рост идёт от центра кадра, поэтому слой как будто приближается, а не просто раздувается.
  for (const layer of shot.layers) {
    const k = layer.depth;
    const f = 1 + k * KZ * st.hp;
    const ox = k * KP * st.pk * (layer.ax - st.cx) * W;
    const oy = k * KP * st.pk * (layer.ay - st.cy) * H;
    const lx = (f - 1) * (layer.x - st.cx * W) + ox;
    const ly = (f - 1) * (layer.y - st.cy * H) + oy;
    layer.el.style.transform = `translate(${lx}px, ${ly}px) scale(${f})`;
  }
}

// ---------- Переход штриховкой: тушь вертикальными штрихами, как в референсе ----------

function createHatch(canvas) {
  const ctx = canvas.getContext('2d');
  // cover — тушь поднимается снизу и закрывает кадр, reveal — тушь уходит вверх и открывает его
  const state = { cover: 0, reveal: 0 };
  let noise = [];
  let colW = 2;

  function columns(amount, fromBottom) {
    const { width: w, height: h } = canvas;
    if (amount >= 1) { ctx.fillRect(0, 0, w, h); return; }
    const spread = 0.8;
    for (let i = 0; i < noise.length; i++) {
      const f = Math.min(1, Math.max(0, amount * (1 + spread) - spread * noise[i]));
      if (f <= 0) continue;
      const fh = Math.ceil(f * h);
      ctx.fillRect(i * colW, fromBottom ? h - fh : 0, colW, fh);
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = INK;
    if (state.reveal > 0) columns(state.reveal, false);
    if (state.cover > 0) columns(state.cover, true);
  }

  function resize() {
    const dpr = fitCanvas(canvas);
    colW = Math.max(2, Math.round(1.5 * dpr));
    const cols = Math.ceil(canvas.width / colW);
    const p = [0, 0, 0].map(() => Math.random() * 10);
    noise = Array.from({ length: cols }, (_, i) => {
      const t = i / cols;
      const smooth = 0.5 + 0.22 * Math.sin(t * 7 + p[0]) + 0.14 * Math.sin(t * 19 + p[1]) + 0.08 * Math.sin(t * 53 + p[2]);
      const jitter = (Math.random() - 0.5) * 0.22;
      const drip = Math.random() < 0.05 ? -Math.random() * 0.3 : 0;
      return Math.min(1, Math.max(0, smooth + jitter + drip));
    });
    draw();
  }

  canvases.push({ resize });
  return { state, draw };
}

// ---------- Линии концентрации (speed lines) ----------

function createSpeedLines(canvas) {
  const ctx = canvas.getContext('2d');
  const state = { amount: 0 };
  let frame = 0;
  let visible = false;

  function draw() {
    const { width: w, height: h } = canvas;
    ctx.clearRect(0, 0, w, h);
    visible = state.amount >= 0.01;
    if (!visible) return;
    const cx = w / 2;
    const cy = h / 2;
    const R = (Math.hypot(w, h) / 2) * 1.05;
    ctx.fillStyle = INK;
    ctx.globalAlpha = state.amount;
    ctx.beginPath();
    for (let k = 0; k < 120; k++) {
      const a = Math.random() * Math.PI * 2;
      const spread = 0.002 + Math.random() * 0.01;
      const r0 = R * (0.38 + Math.random() * 0.32);
      ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      ctx.lineTo(cx + Math.cos(a - spread) * R, cy + Math.sin(a - spread) * R);
      ctx.lineTo(cx + Math.cos(a + spread) * R, cy + Math.sin(a + spread) * R);
      ctx.closePath();
    }
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Перерисовка каждый третий кадр даёт «рваное» мерцание, как в аниме
  gsap.ticker.add(() => {
    if (state.amount < 0.01 && !visible) return;
    if (frame++ % 3 === 0 || state.amount < 0.01) draw();
  });

  canvases.push({ resize: () => { fitCanvas(canvas); draw(); } });
  return { state };
}

// ---------- Дым и блёстки: живые частицы прямо на странице ----------
// Холст лежит внутри камеры, поэтому частицы едут вместе с кадром и обрезаются рамкой панели.
// Они живут в реальном времени: дым идёт, даже когда скролл стоит.

const RATE = { smoke: 12, sparkle: 6 };   // сколько частиц в секунду даёт один источник

function createParticles(cam, W, H) {
  const canvas = el('canvas', 'particles', cam);
  const ctx = canvas.getContext('2d');
  const k = Math.min(1, 900 / W);        // дым мягкий, хватает холста меньше страницы
  canvas.width = Math.round(W * k);
  canvas.height = Math.round(H * k);
  const w = canvas.width;
  const h = canvas.height;
  const sources = [];
  const trails = [];                      // струйка дыма от каждой точки: свои частицы, свой ветер
  let sparks = [];
  let clock = 0;

  function spawn(src) {
    if (src.kind === 'smoke') {
      src.trails.forEach((trail) => {
        trail.parts.push({ birth: clock, age: 0, life: 3 + Math.random(), vy: (0.05 + Math.random() * 0.008) * w });
      });
      return;
    }
    const [x, y, bw, bh] = src.at;
    sparks.push({
      x: (x + Math.random() * bw) * w, y: (y + Math.random() * bh) * h, age: 0,
      life: 0.9 + Math.random() * 0.7, r: (0.012 + Math.random() * 0.018) * w, rot: Math.random() * 0.6 - 0.3,
    });
  }

  // Частица поднимается, а волна идёт вдоль струйки — соседние частицы почти рядом, линия плавная
  function place(trail, p) {
    const t = p.age / p.life;
    p.x = trail.x + trail.wind * p.age + Math.sin(p.birth * 1.3 + trail.phase - p.age * 0.9) * 0.025 * w * t;
    p.y = trail.y - p.vy * p.age;
  }

  // Мягкая дымка вокруг и тонкая серая струйка, как карандашный дым в манге
  function drawTrail(trail) {
    const list = trail.parts;
    for (const p of list) {
      place(trail, p);
      const t = p.age / p.life;
      const r = (0.01 + 0.05 * t) * w;
      const a = 0.18 * Math.min(1, t * 6) * (1 - t);
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      g.addColorStop(0, `rgba(165, 165, 170, ${a})`);
      g.addColorStop(1, 'rgba(165, 165, 170, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
    }
    ctx.lineCap = 'butt';             // круглые концы накладываются и дают тёмные узлы
    for (let i = 1; i < list.length; i++) {
      const a = list[i - 1];
      const b = list[i];
      const t = a.age / a.life;
      ctx.strokeStyle = `rgba(150, 150, 156, ${0.5 * Math.min(1, t * 8) * (1 - t)})`;
      ctx.lineWidth = (0.0018 + 0.005 * t) * w;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }

  // Четырёхлучевая звёздочка с обводкой тушью, вспыхивает и гаснет
  function drawSparkle(p) {
    const s = p.r * Math.sin((Math.PI * p.age) / p.life);
    const q = s * 0.16;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.quadraticCurveTo(q, -q, s, 0);
    ctx.quadraticCurveTo(q, q, 0, s);
    ctx.quadraticCurveTo(-q, q, -s, 0);
    ctx.quadraticCurveTo(-q, -q, 0, -s);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.lineWidth = Math.max(1, s * 0.09);
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.restore();
  }

  let dt = 0;
  const alive = (p) => (p.age += dt) < p.life;
  gsap.ticker.add((time, deltaTime) => {
    if (!sparks.length && !trails.some((t) => t.parts.length) && !sources.some((s) => s.amount > 0.01)) return;
    dt = Math.min(deltaTime, 50) / 1000;
    clock += dt;
    for (const src of sources) {
      src.acc += dt * RATE[src.kind] * src.amount;
      for (; src.acc >= 1; src.acc -= 1) spawn(src);
    }
    ctx.clearRect(0, 0, w, h);
    for (const trail of trails) {
      trail.parts = trail.parts.filter(alive);
      drawTrail(trail);
    }
    sparks = sparks.filter(alive);
    sparks.forEach(drawSparkle);
  });

  // Источник: kind — 'smoke' (at — точки) или 'sparkle' (at — рамка); amount таймлайн крутит от 0 до 1
  return {
    source(kind, at) {
      const src = { kind, at, amount: 0, acc: 0 };
      if (kind === 'smoke') {
        src.trails = at.map(([x, y]) => ({
          x: x * w, y: y * h, parts: [], phase: Math.random() * 6.28, wind: (Math.random() - 0.5) * 0.02 * w,
        }));
        trails.push(...src.trails);
      }
      sources.push(src);
      return src;
    },
  };
}

// ---------- Живая панель: скан чуть-чуть деформируется по карте весов ----------
// Карту готовит tools/make_living.py: R — где рисунок качается (волосы), G — где дышит (тело, голова),
// B — где струится (нарисованный дым). Шейдер берёт каждый пиксель со смещением из этой карты,
// поэтому дыр за «слоями» не бывает: двигается сам рисунок, как в Live2D.

const LIVING_VS = `
attribute vec2 pos;
varying vec2 uv;
void main() {
  uv = pos;
  gl_Position = vec4(pos.x * 2.0 - 1.0, 1.0 - pos.y * 2.0, 0.0, 1.0);
}`;

const LIVING_FS = `
precision highp float;
uniform sampler2D page;
uniform sampler2D map;
uniform vec4 box;       // рамка панели в долях страницы
uniform vec2 px;        // один пиксель страницы в долях страницы
uniform float time;
uniform vec3 sway;      // амплитуда в пикселях, скорость, волна
uniform vec2 breathe;   // амплитуда, скорость
uniform vec3 flow;      // амплитуда, скорость, волна
varying vec2 uv;
void main() {
  vec3 m = texture2D(map, uv).rgb;
  vec2 d = vec2(sway.x * m.r * sin(time * sway.y - uv.y * sway.z), 0.0);
  d.y -= breathe.x * m.g * (0.5 - 0.5 * cos(time * breathe.y));
  d += flow.x * m.b * vec2(sin(uv.y * flow.z + time * flow.y), 0.35 * sin(uv.x * flow.z * 0.6 + time * flow.y * 0.7));
  gl_FragColor = texture2D(page, box.xy + uv * box.zw - d * px);   // пиксель берём оттуда, откуда он «пришёл»
}`;

function createLiving(cam, spec, src, W, H) {
  const [x, y, w, h] = spec.box;
  const canvas = el('canvas', 'living', cam);
  Object.assign(canvas.style, { left: `${x * 100}%`, top: `${y * 100}%`, width: `${w * 100}%`, height: `${h * 100}%` });
  canvas.width = Math.round(w * W);
  canvas.height = Math.round(h * H);
  const state = { amount: 0 };
  const gl = canvas.getContext('webgl');
  if (!gl) return state;                 // без WebGL панель просто остаётся неподвижной

  const prog = gl.createProgram();
  [[gl.VERTEX_SHADER, LIVING_VS], [gl.FRAGMENT_SHADER, LIVING_FS]].forEach(([type, code]) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, code);
    gl.compileShader(shader);
    gl.attachShader(prog, shader);
  });
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn('Живая панель не собралась:', gl.getProgramInfoLog(prog));
    return state;
  }
  gl.useProgram(prog);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
  const pos = gl.getAttribLocation(prog, 'pos');
  gl.enableVertexAttribArray(pos);
  gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

  // Текстура 0 — вся страница (смещённый пиксель может прийти и из-за рамки), 1 — карта весов
  [images[src], images[spec.map]].forEach((image, unit) => {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, unit ? gl.NONE : gl.BROWSER_DEFAULT_WEBGL);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
  });
  const u = (name) => gl.getUniformLocation(prog, name);
  gl.uniform1i(u('page'), 0);
  gl.uniform1i(u('map'), 1);
  gl.uniform4f(u('box'), x, y, w, h);
  gl.uniform2f(u('px'), 1 / W, 1 / H);
  const { sway = [0, 0, 0], breathe = [0, 0], flow = [0, 0, 0] } = spec.motion;
  const uTime = u('time');
  const uSway = u('sway');
  const uBreathe = u('breathe');
  const uFlow = u('flow');

  // Пока панель не на экране, холст спрятан и под ним видна обычная страница
  let shown = false;
  gsap.ticker.add((time) => {
    const on = state.amount > 0.01;
    if (on !== shown) canvas.style.visibility = (shown = on) ? 'visible' : 'hidden';
    if (!on) return;
    const k = state.amount * LIVE;
    gl.uniform1f(uTime, time);
    gl.uniform3f(uSway, sway[0] * k, sway[1], sway[2]);
    gl.uniform2f(uBreathe, breathe[0] * k, breathe[1]);
    gl.uniform3f(uFlow, flow[0] * k, flow[1], flow[2]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  });
  return state;
}

function shake(target, strength = 1) {
  const s = 14 * strength;
  gsap.fromTo(target, { x: 0, y: 0 }, {
    keyframes: [
      { x: -s, y: s * 0.4, duration: 0.06 },
      { x: s * 0.8, y: -s * 0.5, duration: 0.06 },
      { x: -s * 0.5, y: s * 0.3, duration: 0.07 },
      { x: s * 0.3, y: -s * 0.2, duration: 0.08 },
      { x: 0, y: 0, duration: 0.1 },
    ],
    ease: 'none',
    overwrite: true,
  });
}

function addDebugRects(cam, pageId) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 1 1');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.classList.add('debug-shapes');
  cam.appendChild(svg);
  Object.entries(pages[pageId].panels ?? {}).forEach(([id, shape]) => {
    const pts = cornersOf(shape);
    const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    poly.setAttribute('points', pts.map((p) => p.join(',')).join(' '));
    svg.appendChild(poly);
    const label = el('span', 'debug-label', cam);
    label.textContent = id;
    Object.assign(label.style, { left: `${pts[0][0] * 100}%`, top: `${pts[0][1] * 100}%` });
  });
}

function scrubbed(section) {
  return gsap.timeline({
    defaults: { ease: 'power2.inOut' },
    scrollTrigger: { trigger: section, start: 'top top', end: 'bottom bottom', scrub: 0.5 },
  });
}

// ---------- Сцены ----------

function buildTitle(scene) {
  const section = el('section', 'scene', root);
  section.style.height = `${(scene.length ?? 1.2) * 100 + 100}vh`;
  const stage = el('div', 'stage paper', section);
  const wrap = el('div', 'title-wrap', stage);
  if (scene.kicker) el('p', 'kicker', wrap).textContent = scene.kicker;

  const h1 = el('h1', '', wrap);
  scene.title.split('\n').forEach((line, i) => {
    if (i) h1.appendChild(document.createElement('br'));
    line.split(' ').forEach((word, j) => {
      if (j) h1.appendChild(document.createTextNode(' '));
      const w = el('span', '', h1);
      w.style.whiteSpace = 'nowrap';
      [...word].forEach((ch) => { el('span', 'ch', w).textContent = ch; });
    });
  });
  if (scene.hint) el('p', 'hint', wrap).textContent = scene.hint;
  if (scene.credit) el('p', 'credit', stage).textContent = scene.credit;
  const hatch = createHatch(el('canvas', 'fx', stage));

  gsap.from(h1.querySelectorAll('.ch'), {
    yPercent: 110, rotate: 8, opacity: 0, duration: 0.9, ease: 'power4.out', stagger: 0.03, delay: 0.2,
  });

  const tl = scrubbed(section);
  tl.to(wrap, { scale: 0.94, opacity: 0.25, duration: 1, ease: 'none' }, 0);
  tl.to(hatch.state, { cover: 1, duration: 0.7, ease: 'power1.in', onUpdate: hatch.draw }, 0.3);
}

function buildEnd(scene) {
  const section = el('section', 'end', root);
  el('p', '', section).textContent = scene.text;
  if (scene.credit) el('p', 'credit', section).textContent = scene.credit;
  if (scene.next) {
    const next = el('a', 'next', section);
    next.href = scene.next.href;
    next.textContent = scene.next.text;
  }
  const back = el('a', 'back', section);
  back.href = '../';
  back.textContent = '← Ко всем историям';
}

function buildShot(scene) {
  const size = sizes[scene.page];
  const { steps } = scene;
  const section = el('section', 'scene', root);
  section.id = scene.page;              // index.html#p09 — сразу к этой странице
  section.style.height = `${(scene.length ?? steps.length) * 100 + 100}vh`;

  const stage = el('div', 'stage', section);
  const frame = el('div', 'frame', stage);
  const cam = el('div', 'camera', frame);
  cam.style.width = `${size.w}px`;
  cam.style.height = `${size.h}px`;
  const extra = FLAT ? null : layered[pages[scene.page].src];
  const img = el('img', 'page', cam);
  img.alt = '';
  img.decoding = 'async';
  const lazy = [[img, extra?.bg ?? pages[scene.page].src]];
  const lives = {};
  for (const spec of FLAT ? [] : living[pages[scene.page].src] ?? []) {
    if (steps.some((s) => s.live === spec.id)) lives[spec.id] = createLiving(cam, spec, pages[scene.page].src, size.w, size.h);
  }
  const layers = (extra?.layers ?? []).map((spec) => {
    const [x, y, w, h] = spec.box;
    const node = el('img', 'layer', cam);
    lazy.push([node, spec.src]);
    node.alt = '';
    Object.assign(node.style, { left: `${x * 100}%`, top: `${y * 100}%`, width: `${w * 100}%`, height: `${h * 100}%` });
    return { el: node, x: x * size.w, y: y * size.h, ax: spec.anchor[0], ay: spec.anchor[1], depth: spec.depth };
  });
  loadNear(section, lazy);
  const particles = steps.some((s) => s.smoke || s.sparkle) ? createParticles(cam, size.w, size.h) : null;
  const tint = el('div', 'tint', cam);
  if (DEBUG) addDebugRects(cam, scene.page);

  el('div', 'vignette', stage);
  const speed = createSpeedLines(el('canvas', 'fx', stage));
  const captions = el('div', 'fx', stage);
  const flash = el('div', 'flash', stage);
  const hatch = createHatch(el('canvas', 'fx', stage));

  const shot = { stage, cam, tint, layers, W: size.w, H: size.h, st: stateFor(scene.page, steps[0]) };
  const update = () => applyCamera(shot);
  shots.push(shot);
  update();

  const tl = scrubbed(section);
  let t = 0;

  if (scene.intro === 'hatch') {
    hatch.state.reveal = 1;
    tl.to(hatch.state, { reveal: 0, duration: MOVE, ease: 'power1.in', onUpdate: hatch.draw }, 0);
  }

  steps.forEach((step, i) => {
    if (i > 0) {
      tl.to(shot.st, { ...stateFor(scene.page, step), duration: MOVE, onUpdate: update }, t);
      t += MOVE;
    }
    const arrive = t;
    tl.to(shot.st, { lz: `+=${PUSH}`, hp: 1, duration: HOLD, ease: 'none', onUpdate: update }, t);
    t += HOLD;
    const leave = t;
    const isLast = i === steps.length - 1;

    if (step.caption) {
      const cfg = typeof step.caption === 'string' ? { text: step.caption } : step.caption;
      const cap = el('div', `caption ${cfg.at ?? 'bottom-left'}`, captions);
      cap.textContent = cfg.text;
      tl.fromTo(cap, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.3, ease: 'power3.out' }, arrive + 0.05);
      if (!isLast || scene.outro === 'hatch') {
        tl.to(cap, { autoAlpha: 0, y: -12, duration: 0.25, ease: 'power2.in' }, leave - 0.25);
      }
    }

    const effects = [].concat(step.effect ?? []);
    if (effects.includes('shake')) tl.call(() => shake(frame, step.strength ?? 1), null, arrive);
    if (effects.includes('speedlines')) {
      tl.to(speed.state, { amount: 1, duration: 0.25, ease: 'none' }, Math.max(0, arrive - 0.15));
      if (!isLast) tl.to(speed.state, { amount: 0, duration: 0.25, ease: 'none' }, leave - 0.25);
    }
    if (effects.includes('flash')) {
      const peak = 0.95 * Math.min(1, step.strength ?? 1);
      tl.fromTo(flash, { opacity: 0 }, { opacity: peak, duration: 0.05, ease: 'none', immediateRender: false }, Math.max(0, arrive - 0.05));
      tl.to(flash, { opacity: 0, duration: 0.45, ease: 'power2.out' }, arrive);
    }

    // Дым, блёстки и живая панель разгораются, когда камера подлетает к кадру, и гаснут перед уходом
    const sources = [];
    if (lives[step.live]) sources.push(lives[step.live]);
    if (step.smoke) sources.push(particles.source('smoke', typeof step.smoke[0] === 'number' ? [step.smoke] : step.smoke));
    if (step.sparkle) sources.push(particles.source('sparkle', step.sparkle === true ? rectOf(scene.page, step.view) : step.sparkle));
    for (const src of sources) {
      tl.to(src, { amount: 1, duration: 0.4, ease: 'none' }, Math.max(0, arrive - 0.4));
      tl.to(src, { amount: 0, duration: 0.4, ease: 'none' }, leave - 0.4);
    }
  });

  if (scene.outro === 'hatch') {
    tl.to(hatch.state, { cover: 1, duration: MOVE, ease: 'power1.out', onUpdate: hatch.draw }, t - 0.2);
  }
}

// ---------- Запуск ----------

// Манифесты слоёв и живых панелей — у какой истории они есть, она сама называет в story.js
async function loadManifest(path) {
  if (FLAT || !path) return {};
  try {
    const res = await fetch(path);
    return res.ok ? await res.json() : {};
  } catch {
    return {};
  }
}

async function init() {
  const loader = document.getElementById('loader');
  if (DEBUG) document.body.classList.add('debug');
  const title = scenes.find((s) => s.type === 'title')?.title;
  if (title && !document.title) document.title = `${title.replace('\n', ' ')} — Аниманга`;   // заголовок из index.html важнее
  try {
    [layered, living] = await Promise.all([loadManifest(story.layers), loadManifest(story.living)]);
    // Размер страницы можно назвать в story.js (size у истории или у страницы) — тогда её не ждём,
    // она подгрузится по дороге. Живой панели скан нужен сразу: из него делается текстура.
    // Где есть 2.5D-слои, на экране фон того же размера, что и страница, — сам скан нужен
    // только живой панели
    await Promise.all([
      ...Object.entries(pages).map(async ([id, page]) => {
        const known = page.size ?? story.size;
        if (known && !living[page.src]) {
          sizes[id] = { w: known[0], h: known[1] };
          return;
        }
        const img = await loadImage(layered[page.src]?.bg ?? page.src);
        sizes[id] = { w: img.naturalWidth, h: img.naturalHeight };
        if (layered[page.src] && living[page.src]) await loadImage(page.src);
      }),
      ...Object.values(living).flat().map((l) => loadImage(l.map)),
    ]);
    for (const scene of scenes) {
      if (scene.type === 'title') buildTitle(scene);
      else if (scene.type === 'end') buildEnd(scene);
      else buildShot(scene);
    }
  } catch (err) {
    loader.textContent = err.message;
    loader.classList.add('error');
    throw err;
  }

  canvases.forEach((c) => c.resize());
  ScrollTrigger.refresh();
  // index.html#p09 — сразу к странице. Lenis ещё помнит пустую страницу и не пустит дальше нуля,
  // поэтому сначала даём ему пересчитать высоту
  if (location.hash) {
    lenis.resize();
    lenis.scrollTo(location.hash, { immediate: true });
  }
  loader.classList.add('done');
}

window.addEventListener('resize', () => {
  shots.forEach(applyCamera);
  canvases.forEach((c) => c.resize());
});

init();
