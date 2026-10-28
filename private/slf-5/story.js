// «Рубеж Шангри-Ла», глава 5.
// Оригинал: «Shangri-La Frontier» (シャングリラ・フロンティア), Katarina (история), Ryosuke Fuji (рисунок), Kodansha.
// Страницы — любительский перевод YONA ANART. Коммерческая манга: только для себя — папка private/
// на сайте закрыта, публично её не выкладывать. Формат — как в private/perekur/story.js,
// эффекты hud, tone и переход 'pixel' — в шапке private/slf-1/story.js. Рамки: ?debug

const page = (n, size, panels) => ({ src: `pages/p${String(n).padStart(2, '0')}.jpg`, size, panels });

export const pages = {
  p01: page(1, [728, 1045], {
    a: [0, 0, 0.955, 0.206],
    b: [0, 0.244, 0.955, 0.497],
    c: [0, 0.769, 0.955, 0.231],
  }),
  p02: page(2, [728, 1045], {
    a: [0.043, 0, 0.957, 0.28],
    b: [0.664, 0.302, 0.336, 0.374],
    c: [0.043, 0.302, 0.613, 0.374],
    d: [0.569, 0.705, 0.431, 0.244],
    e: [0.043, 0.705, 0.522, 0.295],
  }),
  p03: page(3, [728, 1045], {
    a: [[0, 0], [0.955, 0], [0.955, 0.492], [0, 0.522]],
    b: [[0, 0.538], [0.955, 0.493], [0.955, 1], [0, 1]],
    c: [0.42, 0.86, 0.48, 0.14],
  }),
  p04: page(4, [728, 1045], {
    a: [0.595, 0, 0.405, 0.296],
    b: [0.043, 0, 0.6, 0.296],
    c: [0.668, 0.32, 0.332, 0.313],
    d: [0.268, 0.32, 0.397, 0.313],
    e: [0.043, 0.32, 0.257, 0.313],
    f: [0.043, 0.64, 0.957, 0.36],
  }),
  p05: page(5, [728, 1045], {
    a: [0.639, 0.064, 0.316, 0.218],
    b: [0, 0, 0.632, 0.282],
    c: [0.315, 0.305, 0.64, 0.318],
    d: [0.108, 0.305, 0.31, 0.318],
    e: [0, 0.649, 0.955, 0.351],
  }),
  p06: page(6, [728, 1045], {
    a: [0.345, 0, 0.655, 0.365],
    b: [0.043, 0.015, 0.345, 0.35],
    c: [0.63, 0.375, 0.33, 0.23],
    d: [0.2, 0.388, 0.42, 0.217],
    e: [0.043, 0.388, 0.195, 0.217],
    f: [0.509, 0.631, 0.491, 0.369],
    g: [0.043, 0.631, 0.46, 0.317],
  }),
  p07: page(7, [728, 1045], {
    a: [0.248, 0, 0.707, 0.327],
    b: [0, 0, 0.245, 0.327],
    c: [0.397, 0.35, 0.558, 0.288],
    d: [0.108, 0.35, 0.297, 0.288],
    e: [0.634, 0.665, 0.321, 0.335],
    f: [0.428, 0.665, 0.199, 0.282],
    g: [0, 0.665, 0.42, 0.335],
  }),
  p08: page(8, [728, 1045], {
    a: [0.043, 0, 0.957, 0.322],
    b: [0.03, 0.335, 0.94, 0.26],
    c: [0.743, 0.6, 0.257, 0.4],
    d: [0.043, 0.6, 0.708, 0.4],
  }),
  p09: page(9, [728, 1045], {
    a: [0, 0, 0.955, 0.338],
    b: [0.047, 0.418, 0.908, 0.12],
    c: [0.545, 0.568, 0.41, 0.422],
    d: [0.04, 0.568, 0.5, 0.432],
  }),
  p10: page(10, [728, 1045], {
    a: [0.043, 0, 0.957, 0.224],
    b: [0.734, 0.245, 0.266, 0.48],
    c: [0.043, 0.245, 0.678, 0.48],
    d: [0.539, 0.752, 0.418, 0.248],
    e: [0.043, 0.752, 0.504, 0.238],
  }),
  p11: page(11, [728, 1045], {
    a: [0, 0, 0.955, 0.44],
    b: [0.076, 0.468, 0.879, 0.232],
    c: [0.458, 0.722, 0.497, 0.278],
    d: [0, 0.722, 0.495, 0.278],
  }),
  p12: page(12, [728, 1045], {
    a: [[0.043, 0], [1, 0], [1, 0.448], [0.043, 0.367]],
    b: [[0.043, 0.395], [0.885, 0.473], [0.885, 0.597], [0.043, 0.597]],
    c: [0.046, 0.619, 0.954, 0.381],
  }),
  p13: page(13, [728, 1045], {
    a: [0, 0, 0.955, 0.295],
    b: [0.109, 0.318, 0.846, 0.142],
    c: [0, 0.481, 0.955, 0.519],
    d: [0.55, 0.68, 0.4, 0.2],
  }),
  p14: page(14, [728, 1045], {
    a: [0.54, 0, 0.46, 0.495],
    b: [0.043, 0, 0.517, 0.495],
    c: [0.043, 0.525, 0.957, 0.173],
    d: [0.63, 0.722, 0.37, 0.278],
    e: [0.23, 0.722, 0.437, 0.278],
    f: [0.043, 0.722, 0.179, 0.278],
  }),
  p15: page(15, [728, 1045], {
    a: [0, 0, 0.955, 0.31],
    b: [0, 0.342, 0.955, 0.338],
    c: [0.109, 0.704, 0.846, 0.286],
  }),
  p16: page(16, [728, 1045], {
    a: [0.36, 0, 0.64, 0.403],
    b: [0.043, 0.015, 0.307, 0.388],
    c: [0.437, 0.431, 0.563, 0.569],
    d: [0.043, 0.431, 0.402, 0.125],
    e: [0.043, 0.584, 0.402, 0.416],
  }),
  p17: page(17, [728, 1045], {
    a: [0, 0, 0.955, 0.33],
    b: [0.17, 0.385, 0.64, 0.405],
    c: [0, 0.765, 0.955, 0.235],
  }),
  p18: page(18, [728, 1045], {
    a: [0.27, 0.05, 0.62, 0.3],
    b: [0.6, 0.39, 0.4, 0.17],
    c: [0.04, 0.78, 0.96, 0.22],
  }),
};

const CREDIT = 'Shangri-La Frontier · Katarina · Ryosuke Fuji · Kodansha · перевод YONA ANART';

export const scenes = [
  {
    type: 'title',
    kicker: 'Глава 5 · Трэшовые игры и эго',
    title: 'Рубеж\nШангри-Ла',
    credit: CREDIT,
    hint: 'Листай вниз ↓',
  },
  {
    page: 'p01',
    intro: 'hatch',
    steps: [
      { view: 'page' },
      { view: 'a' },
      { view: 'b', zoom: 1.05 },
      { view: 'c' },
    ],
  },
  {
    page: 'p02',
    outro: 'hatch',
    steps: [
      { view: 'page' },
      { view: 'a' },
      { view: 'b' },
      { view: 'c' },
      { view: 'd', zoom: 1.05 },
      { view: 'e' },
    ],
  },
  {
    page: 'p03',
    intro: 'hatch',
    steps: [
      { view: 'page' },
      { view: 'a' },
      { view: 'b', tint: 0.25, tone: '#c8141c' },
      { view: 'c', zoom: 1.1, effect: 'shake', strength: 0.3 },
    ],
  },
  {
    page: 'p04',
    steps: [
      { view: 'page' },
      { view: 'a' },
      { view: 'b' },
      { view: 'c' },
      { view: 'd', sparkle: true },
      { view: 'e', effect: 'shake', strength: 0.5 },
      { view: 'f', zoom: 1.05 },
    ],
  },
  {
    page: 'p05',
    steps: [
      { view: 'page' },
      { view: 'a', zoom: 1.1, tint: 0.25, tone: '#c8141c' },
      { view: 'b', effect: 'shake', strength: 0.3 },
      { view: 'c', effect: 'shake', strength: 0.4, tint: 0.3, tone: '#c8141c' },
      { view: 'd' },
      { view: 'e', effect: 'shake', strength: 0.5 },
    ],
  },
  {
    page: 'p06',
    steps: [
      { view: 'page' },
      { view: 'a', zoom: 1.05 },
      { view: 'b' },
      { view: 'c' },
      { view: 'd' },
      { view: 'e', sparkle: true },
      { view: 'f', smoke: [0.95, 0.86] },
      { view: 'g' },
    ],
  },
  {
    page: 'p07',
    steps: [
      { view: 'page' },
      { view: 'a' },
      { view: 'b' },
      { view: 'c' },
      { view: 'd' },
      { view: 'e' },
      { view: 'f', effect: 'speedlines', strength: 0.5 },
      { view: 'g', effect: 'shake', strength: 0.5 },
    ],
  },
  {
    page: 'p08',
    steps: [
      { view: 'page' },
      { view: 'a', effect: 'shake', strength: 0.3, hud: [0.335, 0.2, 0.46, 0.1] },
      { view: 'b', hud: true, sparkle: [0.57, 0.34, 0.39, 0.26] },
      { view: 'c', effect: 'shake', strength: 0.4 },
      { view: 'd' },
    ],
  },
  {
    page: 'p09',
    steps: [
      { view: 'page' },
      { view: 'a', effect: 'shake', strength: 0.4 },
      { view: 'b' },
      { view: 'c' },
      { view: 'd', sparkle: [0.2, 0.82, 0.33, 0.18] },
    ],
  },
  {
    page: 'p10',
    outro: 'pixel',
    steps: [
      { view: 'page' },
      { view: 'a' },
      { view: 'b' },
      { view: 'c' },
      { view: 'd' },
      { view: 'e', hud: true },
    ],
  },
  {
    page: 'p11',
    intro: 'pixel',
    steps: [
      { view: 'page' },
      { view: 'a', hud: [[0.575, 0.035, 0.155, 0.065], [0.265, 0.135, 0.145, 0.065]] },
      { view: 'b', hud: [0.28, 0.475, 0.265, 0.08] },
      { view: 'c', hud: [0.465, 0.85, 0.135, 0.1] },
      { view: 'd', effect: 'flash', strength: 0.5, hud: [0.035, 0.732, 0.33, 0.16] },
    ],
  },
  {
    page: 'p12',
    steps: [
      { view: 'page' },
      { view: 'a', effect: ['speedlines', 'shake'], strength: 0.6 },
      { view: 'b', zoom: 1.05, effect: 'shake', strength: 0.3 },
      { view: 'c', effect: ['speedlines', 'shake'], strength: 0.7 },
    ],
  },
  {
    page: 'p13',
    steps: [
      { view: 'page' },
      { view: 'a' },
      { view: 'b', effect: ['speedlines', 'flash'], strength: 0.6 },
      { view: 'c', effect: ['speedlines', 'shake'], strength: 0.8 },
      { view: 'd', zoom: 1.1 },
    ],
  },
  {
    page: 'p14',
    steps: [
      { view: 'page' },
      { view: 'a', effect: 'speedlines', strength: 0.5 },
      { view: 'b' },
      { view: 'c', effect: ['flash', 'shake'], strength: 0.8 },
      { view: 'd', effect: 'shake', strength: 0.4, hud: [0.632, 0.722, 0.205, 0.085] },
      { view: 'e' },
      { view: 'f', zoom: 1.05 },
    ],
  },
  {
    page: 'p15',
    steps: [
      { view: 'page' },
      { view: 'a' },
      { view: 'b' },
      { view: 'c' },
    ],
  },
  {
    page: 'p16',
    steps: [
      { view: 'page' },
      { view: 'a' },
      { view: 'b' },
      { view: 'c', zoom: 1.08 },
      { view: 'd' },
      { view: 'e' },
    ],
  },
  {
    page: 'p17',
    steps: [
      { view: 'page' },
      { view: 'a' },
      { view: 'b', hud: true },
      { view: 'c', hud: [0.71, 0.815, 0.245, 0.185] },
    ],
  },
  {
    page: 'p18',
    outro: 'hatch',
    steps: [
      { view: 'page' },
      { view: 'a', zoom: 1.05, sparkle: true },
      { view: 'b', tint: 0.3, tone: '#c8141c', hud: [0.6, 0.395, 0.385, 0.16] },
      { view: 'c' },
    ],
  },
  { type: 'end', text: 'Конец главы 5', credit: CREDIT, next: { href: '../slf-5-5/', text: 'Бонус 5.5 →' }, back: { href: '../manga/shangrila/', text: '← К списку глав' } },
];
