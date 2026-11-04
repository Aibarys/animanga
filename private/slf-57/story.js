// «Рубеж Шангри-Ла», глава 57.
// Оригинал: «Shangri-La Frontier» (シャングリラ・フロンティア), Katarina (история), Ryosuke Fuji (рисунок), Kodansha.
// Страницы — любительский перевод YONA ANART. Коммерческая манга: только для себя — папка private/
// на сайте закрыта, публично её не выкладывать. Формат — как в private/perekur/story.js, эффекты — в
// private/slf-1/story.js. Рамки: ?debug

const page = (n, size, panels) => ({ src: `pages/p${String(n).padStart(2, '0')}.jpg`, size, panels });

export const pages = {
  p01: page(1, [1124, 1600], {
    a: [0, 0, 0.932, 0.347],
    b: [0, 0.3465, 0.932, 0.3145],
    c: [0, 0.681, 0.932, 0.319],
  }),
  p02: page(2, [1124, 1600], {
    a: [0.352, 0, 0.648, 0.308],
    b: [0.066, 0, 0.281, 0.308],
    c: [0.641, 0.33, 0.312, 0.225],
    d: [0.066, 0.33, 0.569, 0.225],
    e: [0.58, 0.571, 0.42, 0.429],
    f: [0.438, 0.571, 0.137, 0.357],
    g: [0.066, 0.571, 0.464, 0.429],
  }),
  p03: page(3, [1124, 1600], {
    a: [0.497, 0, 0.435, 0.4],
    b: [0, 0, 0.493, 0.179],
    c: [0, 0.197, 0.493, 0.203],
    d: [0, 0.416, 0.932, 0.289],
    e: [0, 0.723, 0.932, 0.277],
  }),
  p04: page(4, [1124, 1600], {
    a: [0.324, 0, 0.676, 0.37],
    b: [0.066, 0.069, 0.252, 0.301],
    c: [0.066, 0.391, 0.934, 0.252],
    d: [0.402, 0.658, 0.598, 0.342],
    e: [0.066, 0.658, 0.333, 0.342],
  }),
  p05: page(5, [1124, 1600], {
    a: [0.284, 0, 0.648, 0.307],
    b: [0, 0, 0.28, 0.307],
    c: [0, 0.322, 0.932, 0.342],
    d: [0.622, 0.664, 0.31, 0.264],
    e: [0, 0.68, 0.72, 0.32],
  }),
  p06: page(6, [1124, 1600], {
    a: [[0.066, 0], [1, 0], [1, 0.222], [0.066, 0.266]],
    b: [[0.066, 0.281], [1, 0.215], [1, 1], [0.066, 1]],
    c: [0.3, 0.235, 0.7, 0.3],
    d: [0.066, 0.52, 0.62, 0.38],
  }),
  p07: page(7, [1124, 1600], {
    a: [0.716, 0.07, 0.216, 0.268],
    b: [0, 0, 0.712, 0.338],
    c: [0, 0.356, 0.932, 0.298],
    d: [0.52, 0.669, 0.412, 0.295],
    e: [0, 0.669, 0.517, 0.14],
    f: [0, 0.802, 0.517, 0.162],
  }),
  p08: page(8, [1124, 1600], {
    a: [0.066, 0, 0.934, 0.391],
    b: [[0.7355, 0.405], [1, 0.405], [1, 0.646], [0.7127, 0.646]],
    c: [[0.066, 0.405], [0.73, 0.405], [0.707, 0.646], [0.066, 0.646]],
    d: [0.066, 0.664, 0.934, 0.336],
  }),
  p09: page(9, [1124, 1600], {
    a: [[0, 0], [0.932, 0], [0.932, 0.122], [0, 0.209]],
    b: [[0, 0.17], [0.932, 0.1245], [0.932, 0.544], [0, 0.5155]],
    c: [[0, 0.524], [0.932, 0.5525], [0.932, 0.7575], [0, 0.7575]],
    d: [0.1, 0.765, 0.78, 0.235],
  }),
  p10: page(10, [1124, 1600], {
    a: [[0.066, 0], [1, 0], [1, 0.6], [0.066, 0.7665]],
    b: [0.5, 0.08, 0.5, 0.5],
    c: [[0.066, 0.7723], [1, 0.6058], [1, 1], [0.066, 1]],
  }),
  p11: page(11, [1124, 1600], {
    a: [[0, 0], [0.932, 0], [0.932, 0.393], [0, 0.558]],
    b: [[0.116, 0.548], [0.932, 0.405], [0.932, 0.652], [0.116, 0.652]],
    c: [0.62, 0.674, 0.312, 0.326],
    d: [0.49, 0.674, 0.125, 0.253],
    e: [0, 0.674, 0.484, 0.326],
  }),
  p12: page(12, [1124, 1600], {
    a: [0.483, 0, 0.517, 0.369],
    b: [0.066, 0.015, 0.414, 0.354],
    c: [0.066, 0.413, 0.817, 0.151],
    d: [0.413, 0.584, 0.587, 0.416],
    e: [0.066, 0.584, 0.344, 0.416],
  }),
  p13: page(13, [1124, 1600], {
    a: [0, 0, 0.932, 0.285],
    b: [0.355, 0.299, 0.577, 0.259],
    c: [0.115, 0.299, 0.4, 0.115],
    d: [0.115, 0.4325, 0.4, 0.126],
    e: [[0.63, 0.574], [0.932, 0.574], [0.932, 1], [0.586, 1]],
    f: [[0, 0.574], [0.627, 0.574], [0.584, 1], [0, 1]],
  }),
  p14: page(14, [1124, 1600], {
    a: [[0.066, 0], [1, 0], [1, 0.3275], [0.066, 0.385]],
    b: [[0.066, 0.398], [1, 0.34], [1, 0.611], [0.066, 0.611]],
    c: [0.507, 0.627, 0.493, 0.373],
    d: [0.066, 0.627, 0.436, 0.373],
  }),
  p15: page(15, [1124, 1600], {
    a: [0, 0, 0.932, 0.356],
    b: [0.678, 0.369, 0.254, 0.288],
    c: [0.116, 0.369, 0.558, 0.288],
    d: [0, 0.671, 0.932, 0.329],
  }),
  p16: page(16, [1124, 1600], {
    a: [0.066, 0, 0.934, 0.675],
    b: [0.1, 0.22, 0.85, 0.36],
    c: [0.705, 0.689, 0.295, 0.311],
    d: [0.066, 0.689, 0.636, 0.311],
  }),
  p17: page(17, [1124, 1600], {
    a: [[0, 0], [0.932, 0], [0.932, 0.4124], [0, 0.4412]],
    b: [[0, 0.4625], [0.932, 0.4337], [0.932, 0.779], [0, 0.779]],
    c: [0, 0.797, 0.932, 0.203],
  }),
};

const CREDIT = 'Shangri-La Frontier · Katarina · Ryosuke Fuji · Kodansha · перевод YONA ANART';

export const scenes = [
  {
    type: 'title',
    kicker: 'Глава 57 · Завывающий ветер Катавасии (и коты)',
    title: 'Рубеж\nШангри-Ла',
    credit: CREDIT,
    hint: 'Листай вниз ↓',
  },
  {
    page: 'p01',
    intro: 'hatch',
    steps: [
      { view: 'page' },
      { view: 'a', zoom: 1.05, effect: 'speedlines', strength: 0.5, sparkle: [0.33, 0.12, 0.36, 0.17] },
      { view: 'b' },
      { view: 'c', effect: 'shake', strength: 0.4 },
    ],
  },
  {
    page: 'p02',
    steps: [
      { view: 'page' },
      { view: 'a', effect: 'shake', strength: 0.4 },
      { view: 'b' },
      { view: 'c' },
      { view: 'd' },
      { view: 'e', zoom: 1.05, sparkle: true },
      { view: 'f' },
      { view: 'g', effect: 'shake', strength: 0.5 },
    ],
  },
  {
    page: 'p03',
    steps: [
      { view: 'page' },
      { view: 'a', zoom: 1.1, effect: 'shake', strength: 0.3 },
      { view: 'b' },
      { view: 'c' },
      { view: 'd', sparkle: [0.29, 0.47, 0.25, 0.11] },
      { view: 'e' },
    ],
  },
  {
    page: 'p04',
    steps: [
      { view: 'page' },
      { view: 'a' },
      { view: 'b' },
      { view: 'c', effect: 'shake', strength: 0.3 },
      { view: 'd' },
      { view: 'e' },
    ],
  },
  {
    page: 'p05',
    steps: [
      { view: 'page' },
      { view: 'a', effect: 'shake', strength: 0.3 },
      { view: 'b' },
      { view: 'c', effect: 'shake', strength: 0.5 },
      { view: 'd', effect: 'speedlines', strength: 0.5 },
      { view: 'e' },
    ],
  },
  {
    page: 'p06',
    steps: [
      { view: 'page' },
      { view: 'a' },
      { view: 'b', effect: 'speedlines', strength: 0.6 },
      { view: 'c', zoom: 1.1, sparkle: true },
      { view: 'd', effect: 'shake', strength: 0.5 },
    ],
  },
  {
    page: 'p07',
    steps: [
      { view: 'page' },
      { view: 'a' },
      { view: 'b' },
      { view: 'c', effect: 'speedlines', strength: 0.4 },
      { view: 'd', effect: 'shake', strength: 0.3 },
      { view: 'e' },
      { view: 'f' },
    ],
  },
  {
    page: 'p08',
    steps: [
      { view: 'page' },
      { view: 'a', zoom: 1.05, sparkle: [0.29, 0.18, 0.4, 0.18] },
      { view: 'b' },
      { view: 'c', sparkle: [0.1, 0.48, 0.42, 0.16] },
      { view: 'd' },
    ],
  },
  {
    page: 'p09',
    steps: [
      { view: 'page' },
      { view: 'a' },
      { view: 'b', zoom: 1.1 },
      { view: 'c' },
      { view: 'd' },
    ],
  },
  {
    page: 'p10',
    steps: [
      { view: 'page' },
      { view: 'a', effect: ['flash', 'speedlines'], strength: 0.8 },
      { view: 'b', zoom: 1.1 },
      { view: 'c', effect: ['speedlines', 'shake'], strength: 0.7 },
    ],
  },
  {
    page: 'p11',
    steps: [
      { view: 'page' },
      { view: 'a', effect: ['speedlines', 'shake'], strength: 0.6 },
      { view: 'b', effect: 'speedlines', strength: 0.5 },
      { view: 'c', sparkle: true },
      { view: 'd', zoom: 1.1 },
      { view: 'e' },
    ],
  },
  {
    page: 'p12',
    steps: [
      { view: 'page' },
      { view: 'a', effect: 'shake', strength: 0.6 },
      { view: 'b', effect: 'shake', strength: 0.7 },
      { view: 'c' },
      { view: 'd' },
      { view: 'e' },
    ],
  },
  {
    page: 'p13',
    steps: [
      { view: 'page' },
      { view: 'a', effect: 'speedlines', strength: 0.4 },
      { view: 'b' },
      { view: 'c' },
      { view: 'd', sparkle: true },
      { view: 'e', effect: 'shake', strength: 0.6 },
      { view: 'f', effect: ['speedlines', 'shake'], strength: 0.8 },
    ],
  },
  {
    page: 'p14',
    steps: [
      { view: 'page' },
      { view: 'a', effect: 'speedlines', strength: 0.5 },
      { view: 'b', effect: 'flash', strength: 0.4, sparkle: [0.55, 0.35, 0.45, 0.25] },
      { view: 'c' },
      { view: 'd' },
    ],
  },
  {
    page: 'p15',
    outro: 'pixel',
    steps: [
      { view: 'page' },
      { view: 'a' },
      { view: 'b' },
      { view: 'c' },
      { view: 'd' },
    ],
  },
  {
    page: 'p16',
    intro: 'pixel',
    steps: [
      { view: 'page' },
      { view: 'a' },
      { view: 'b', zoom: 1.05 },
      { view: 'c' },
      { view: 'd' },
    ],
  },
  {
    page: 'p17',
    outro: 'hatch',
    steps: [
      { view: 'page' },
      { view: 'a', hud: [0.075, 0.005, 0.775, 0.41] },
      { view: 'b', zoom: 1.05 },
      { view: 'c' },
    ],
  },
  { type: 'end', text: 'Конец главы 57', credit: CREDIT, next: { href: '../slf-58/', text: 'Глава 58 →' }, back: { href: '../manga/shangrila/', text: '← К списку глав' } },
];
