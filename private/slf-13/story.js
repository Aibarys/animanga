// «Рубеж Шангри-Ла», глава 13.
// Оригинал: «Shangri-La Frontier» (シャングリラ・フロンティア), Katarina (история), Ryosuke Fuji (рисунок), Kodansha.
// Страницы — любительский перевод YONA ANART. Коммерческая манга: только для себя — папка private/
// на сайте закрыта, публично её не выкладывать. Формат — как в private/perekur/story.js,
// эффекты hud, tone и переход 'pixel' — в шапке private/slf-1/story.js. Рамки: ?debug

const page = (n, size, panels) => ({ src: `pages/p${String(n).padStart(2, '0')}.jpg`, size, panels });

export const pages = {
  p01: page(1, [1124, 1600], {
    a: [0.08, 0, 0.92, 0.498],
    b: [0.52, 0.405, 0.48, 0.367],
    c: [0.08, 0.515, 0.47, 0.258],
    d: [0.08, 0.792, 0.92, 0.208],
  }),
  p02: page(2, [2000, 1423], {
    a: [0.46, 0, 0.54, 1],
    b: [0.1, 0.08, 0.4, 0.38],
    c: [0.1, 0.42, 0.38, 0.58],
    d: [0.55, 0.9, 0.33, 0.1],
  }),
  p03: page(3, [1124, 1600], {
    a: [[0, 0], [0.925, 0], [0.925, 0.487], [0, 0.54]],
    b: [[0.303, 0.552], [0.925, 0.512], [0.925, 0.738], [0.33, 0.738]],
    c: [[0, 0.567], [0.315, 0.552], [0.342, 0.738], [0, 0.738]],
    d: [0.3, 0.752, 0.625, 0.248],
    e: [0, 0.752, 0.31, 0.248],
  }),
  p04: page(4, [1124, 1600], {
    a: [[0.08, 0], [1, 0], [1, 0.665], [0.08, 0.8]],
    b: [0.55, 0.12, 0.4, 0.18],
    c: [[0.08, 0.815], [1, 0.76], [1, 1], [0.08, 1]],
  }),
  p05: page(5, [1124, 1600], {
    a: [[0, 0], [0.925, 0], [0.925, 0.72], [0, 0.672]],
    b: [0, 0.45, 0.925, 0.235],
    c: [[0, 0.688], [0.925, 0.737], [0.925, 1], [0, 1]],
  }),
  p06: page(6, [1124, 1600], {
    a: [[0.672, 0.078], [1, 0.078], [1, 0.276], [0.597, 0.276]],
    b: [[0.08, 0], [0.69, 0], [0.6, 0.276], [0.08, 0.276]],
    c: [0.437, 0.302, 0.563, 0.2],
    d: [0.08, 0.302, 0.345, 0.198],
    e: [[0.742, 0.52], [1, 0.52], [1, 0.93], [0.85, 0.895]],
    f: [0.08, 0.512, 0.92, 0.488],
  }),
  p07: page(7, [1124, 1600], {
    a: [[0, 0], [0.925, 0], [0.925, 0.277], [0, 0.237]],
    b: [[0, 0.19], [0.925, 0.28], [0.925, 0.858], [0, 0.73]],
    c: [[0, 0.738], [0.925, 0.862], [0.925, 1], [0, 1]],
  }),
  p08: page(8, [1124, 1600], {
    a: [[0.08, 0], [1, 0], [1, 0.625], [0.08, 0.666]],
    b: [[0.08, 0.68], [1, 0.64], [1, 1], [0.08, 1]],
  }),
  p09: page(9, [1124, 1600], {
    a: [[0, 0], [0.925, 0], [0.925, 0.343], [0, 0.39]],
    b: [[0.24, 0.4], [0.925, 0.366], [0.925, 0.76], [0.285, 0.715]],
    c: [[0, 0.405], [0.243, 0.4], [0.27, 0.712], [0, 0.712]],
    d: [[0, 0.722], [0.925, 0.755], [0.925, 1], [0, 1]],
  }),
  p10: page(10, [1124, 1600], {
    a: [[0.08, 0], [1, 0], [1, 0.46], [0.08, 0.493]],
    b: [0.41, 0.483, 0.59, 0.185],
    c: [0.08, 0.497, 0.39, 0.171],
    d: [0.4, 0.69, 0.6, 0.31],
    e: [0.08, 0.69, 0.355, 0.235],
  }),
  p11: page(11, [1124, 1600], {
    a: [0, 0, 0.925, 0.318],
    b: [0.45, 0.02, 0.475, 0.29],
    c: [0.125, 0.33, 0.8, 0.088],
    d: [0.47, 0.44, 0.455, 0.183],
    e: [0, 0.44, 0.465, 0.183],
    f: [0, 0.63, 0.925, 0.37],
  }),
  p12: page(12, [1124, 1600], {
    a: [[0.08, 0], [1, 0], [1, 0.505], [0.08, 0.54]],
    b: [[0.08, 0.56], [0.875, 0.533], [0.875, 0.655], [0.08, 0.655]],
    c: [0.08, 0.645, 0.8, 0.278],
  }),
  p13: page(13, [1124, 1600], {
    a: [[0, 0], [0.925, 0], [0.925, 0.567], [0, 0.607]],
    b: [0.6, 0.6, 0.325, 0.322],
    c: [0, 0.664, 0.568, 0.336],
  }),
  p14: page(14, [1124, 1600], {
    a: [0.08, 0, 0.92, 0.388],
    b: [0.642, 0.413, 0.358, 0.352],
    c: [0.08, 0.413, 0.555, 0.352],
    d: [0.48, 0.792, 0.52, 0.208],
    e: [0.08, 0.792, 0.4, 0.208],
  }),
  p15: page(15, [1124, 1600], {
    a: [0.66, 0.078, 0.262, 0.255],
    b: [0, 0, 0.655, 0.332],
    c: [0, 0.355, 0.925, 0.37],
    d: [0, 0.738, 0.925, 0.262],
  }),
  p16: page(16, [1124, 1600], {
    a: [0.465, 0, 0.535, 0.3],
    b: [0.08, 0.03, 0.385, 0.27],
    c: [0.533, 0.328, 0.467, 0.37],
    d: [0.08, 0.328, 0.448, 0.37],
    e: [0.71, 0.722, 0.248, 0.203],
    f: [0.08, 0.722, 0.63, 0.278],
  }),
  p17: page(17, [1124, 1600], {
    a: [0, 0, 0.925, 0.437],
    b: [0.578, 0.462, 0.345, 0.143],
    c: [0, 0.462, 0.568, 0.333],
    d: [0.065, 0.82, 0.503, 0.14],
    e: [0.578, 0.59, 0.345, 0.41],
  }),
  p18: page(18, [1124, 1600], {
    a: [0.08, 0, 0.92, 1],
    b: [0.15, 0.03, 0.38, 0.53],
    c: [0.3, 0.62, 0.7, 0.38],
  }),
  p19: page(19, [1124, 1600], {
    a: [0, 0, 0.925, 0.353],
    b: [0.318, 0.373, 0.607, 0.303],
    c: [0.08, 0.373, 0.235, 0.303],
    d: [0.24, 0.698, 0.685, 0.302],
    e: [0, 0.698, 0.275, 0.302],
  }),
  p20: page(20, [1124, 1600], {
    a: [[0.08, 0], [1, 0], [1, 0.505], [0.08, 0.41]],
    b: [[0.08, 0.385], [1, 0.475], [1, 0.588], [0.08, 0.588]],
    c: [0.585, 0.612, 0.415, 0.275],
    d: [0.585, 0.885, 0.415, 0.115],
    e: [0.415, 0.612, 0.163, 0.388],
    f: [0.08, 0.612, 0.33, 0.388],
  }),
};

const CREDIT = 'Shangri-La Frontier · Katarina · Ryosuke Fuji · Kodansha · перевод YONA ANART';

export const scenes = [
  {
    type: 'title',
    kicker: 'Глава 13 · Усилия окупились',
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
      { view: 'd', tint: 0.25 },
    ],
  },
  {
    page: 'p02',
    steps: [
      { view: 'page' },
      { view: 'a', zoom: 1.05 },
      { view: 'b' },
      { view: 'c', sparkle: true },
      { view: 'd' },
    ],
  },
  {
    page: 'p03',
    steps: [
      { view: 'page' },
      { view: 'a' },
      { view: 'b' },
      { view: 'c', zoom: 1.1 },
      { view: 'd', effect: 'speedlines', strength: 0.6 },
      { view: 'e', tint: 0.25, tone: '#c8141c' },
    ],
  },
  {
    page: 'p04',
    steps: [
      { view: 'page' },
      { view: 'a', effect: ['flash', 'speedlines'], strength: 0.8 },
      { view: 'b', zoom: 1.1, tint: 0.3, tone: '#c8141c' },
      { view: 'c' },
    ],
  },
  {
    page: 'p05',
    steps: [
      { view: 'page' },
      { view: 'a', effect: ['shake', 'flash'], strength: 0.9, smoke: [[0.25, 0.45], [0.5, 0.42], [0.75, 0.45]] },
      { view: 'b' },
      { view: 'c', effect: 'shake', strength: 0.4 },
    ],
  },
  {
    page: 'p06',
    steps: [
      { view: 'page' },
      { view: 'a', zoom: 1.1 },
      { view: 'b' },
      { view: 'c', effect: 'shake', strength: 0.4 },
      { view: 'd' },
      { view: 'e', effect: 'shake', strength: 0.5 },
      { view: 'f', effect: 'speedlines', strength: 0.8 },
    ],
  },
  {
    page: 'p07',
    steps: [
      { view: 'page' },
      { view: 'a', effect: 'speedlines', strength: 0.5 },
      { view: 'b', effect: 'speedlines', strength: 0.7 },
      { view: 'c', zoom: 1.05 },
    ],
  },
  {
    page: 'p08',
    steps: [
      { view: 'page' },
      { view: 'a', effect: 'shake', strength: 0.5 },
      { view: 'b', effect: 'speedlines', strength: 0.5 },
    ],
  },
  {
    page: 'p09',
    steps: [
      { view: 'page' },
      { view: 'a', effect: 'speedlines', strength: 0.6 },
      { view: 'b', zoom: 1.05 },
      { view: 'c' },
      { view: 'd', effect: 'shake', strength: 0.5 },
    ],
  },
  {
    page: 'p10',
    steps: [
      { view: 'page' },
      { view: 'a', effect: ['shake', 'flash'], strength: 0.8 },
      { view: 'b' },
      { view: 'c', hud: [0.21, 0.512, 0.125, 0.048] },
      { view: 'd', tint: 0.2, tone: '#c8141c' },
      { view: 'e', zoom: 1.05 },
    ],
  },
  {
    page: 'p11',
    steps: [
      { view: 'page' },
      { view: 'a', sparkle: [0, 0, 0.37, 0.3] },
      { view: 'b', zoom: 1.05, effect: 'speedlines', strength: 0.4 },
      { view: 'c', effect: 'shake', strength: 0.3 },
      { view: 'd' },
      { view: 'e', effect: 'speedlines', strength: 0.4 },
      { view: 'f', effect: ['flash', 'shake'], strength: 0.8 },
    ],
  },
  {
    page: 'p12',
    steps: [
      { view: 'page' },
      { view: 'a', tint: 0.25, tone: '#c8141c' },
      { view: 'b', effect: 'shake', strength: 0.3 },
      { view: 'c' },
    ],
  },
  {
    page: 'p13',
    steps: [
      { view: 'page' },
      { view: 'a', effect: 'speedlines', strength: 0.6 },
      { view: 'b', effect: 'shake', strength: 0.8 },
      { view: 'c', effect: 'shake', strength: 0.3 },
    ],
  },
  {
    page: 'p14',
    steps: [
      { view: 'page' },
      { view: 'a', effect: ['shake', 'speedlines'], strength: 0.5 },
      { view: 'b' },
      { view: 'c' },
      { view: 'd', sparkle: [0.55, 0.8, 0.17, 0.14] },
      { view: 'e', hud: [0.08, 0.83, 0.095, 0.17] },
    ],
  },
  {
    page: 'p15',
    steps: [
      { view: 'page' },
      { view: 'a', zoom: 1.1 },
      { view: 'b', hud: [0, 0, 0.47, 0.33] },
      { view: 'c' },
      { view: 'd' },
    ],
  },
  {
    page: 'p16',
    steps: [
      { view: 'page' },
      { view: 'a' },
      { view: 'b', hud: [0.08, 0.13, 0.2, 0.17] },
      { view: 'c' },
      { view: 'd', zoom: 1.05 },
      { view: 'e' },
      { view: 'f', zoom: 1.05 },
    ],
  },
  {
    page: 'p17',
    steps: [
      { view: 'page' },
      { view: 'a', effect: 'speedlines', strength: 0.6 },
      { view: 'b' },
      { view: 'c', zoom: 1.05 },
      { view: 'd', zoom: 1.1 },
      { view: 'e' },
    ],
  },
  {
    page: 'p18',
    steps: [
      { view: 'page' },
      { view: 'a' },
      { view: 'b', zoom: 1.05 },
      { view: 'c' },
    ],
  },
  {
    page: 'p19',
    steps: [
      { view: 'page' },
      { view: 'a' },
      { view: 'b', effect: 'speedlines', strength: 0.4 },
      { view: 'c', effect: 'shake', strength: 0.4 },
      { view: 'd', tint: 0.2, tone: '#c8141c' },
      { view: 'e', zoom: 1.1 },
    ],
  },
  {
    page: 'p20',
    outro: 'hatch',
    steps: [
      { view: 'page' },
      { view: 'a', effect: 'speedlines', strength: 0.5 },
      { view: 'b', tint: 0.25, tone: '#c8141c', hud: [0.325, 0.46, 0.415, 0.113] },
      { view: 'c', effect: 'shake', strength: 0.4 },
      { view: 'd', zoom: 1.1 },
      { view: 'e', effect: 'speedlines', strength: 0.6 },
      { view: 'f', effect: 'shake', strength: 0.7 },
    ],
  },
  { type: 'end', text: 'Конец главы 13', credit: CREDIT, next: { href: '../slf-14/', text: 'Глава 14 →' }, back: { href: '../manga/shangrila/', text: '← К списку глав' } },
];
