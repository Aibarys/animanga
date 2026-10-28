// «Рубеж Шангри-Ла», глава 12.
// Оригинал: «Shangri-La Frontier» (シャングリラ・フロンティア), Katarina (история), Ryosuke Fuji (рисунок), Kodansha.
// Страницы — любительский перевод YONA ANART. Коммерческая манга: только для себя — папка private/
// на сайте закрыта, публично её не выкладывать. Формат — как в private/perekur/story.js,
// эффекты hud, tone и переход 'pixel' — в шапке private/slf-1/story.js. Рамки: ?debug

const page = (n, size, panels) => ({ src: `pages/p${String(n).padStart(2, '0')}.jpg`, size, panels });

export const pages = {
  p01: page(1, [1124, 1600], {
    a: [[0, 0], [0.917, 0], [0.917, 0.398], [0, 0.41]],
    b: [[0.533, 0.41], [0.917, 0.392], [0.917, 0.693], [0.533, 0.693]],
    c: [[0, 0.437], [0.528, 0.411], [0.528, 0.693], [0, 0.693]],
    d: [0.285, 0.719, 0.632, 0.281],
    e: [0, 0.719, 0.445, 0.281],
  }),
  p02: page(2, [1124, 1600], {
    a: [0.078, 0, 0.922, 0.73],
    b: [0.33, 0.1, 0.6, 0.42],
    c: [0.078, 0.675, 0.922, 0.325],
  }),
  p03: page(3, [1124, 1600], {
    a: [0, 0, 0.917, 0.422],
    b: [0.64, 0.443, 0.277, 0.212],
    c: [0.33, 0.443, 0.325, 0.212],
    d: [0.095, 0.443, 0.305, 0.212],
    e: [0.47, 0.683, 0.447, 0.297],
    f: [0, 0.683, 0.505, 0.297],
  }),
  p04: page(4, [1124, 1600], {
    a: [0.081, 0, 0.919, 0.383],
    b: [0.081, 0.397, 0.919, 0.184],
    c: [[0.135, 0.601], [0.875, 0.627], [0.875, 0.724], [0.135, 0.761]],
    d: [0.245, 0.792, 0.535, 0.143],
  }),
  p05: page(5, [1124, 1600], {
    a: [0, 0, 0.917, 0.465],
    b: [0, 0.497, 0.917, 0.188],
    c: [0.24, 0.711, 0.676, 0.289],
    d: [0, 0.711, 0.231, 0.208],
  }),
  p06: page(6, [1124, 1600], {
    a: [0.079, 0, 0.921, 0.267],
    b: [0.416, 0.293, 0.584, 0.297],
    c: [0.079, 0.293, 0.326, 0.297],
    d: [0.079, 0.592, 0.921, 0.408],
    e: [0.37, 0.59, 0.33, 0.21],
  }),
  p07: page(7, [1124, 1600], {
    a: [0, 0, 0.917, 0.315],
    b: [0.57, 0.345, 0.347, 0.35],
    c: [0, 0.345, 0.558, 0.35],
    d: [0, 0.726, 0.917, 0.274],
  }),
  p08: page(8, [1124, 1600], {
    a: [0.081, 0, 0.919, 0.221],
    b: [0.546, 0.249, 0.454, 0.437],
    c: [0.081, 0.249, 0.458, 0.437],
    d: [0.081, 0.71, 0.919, 0.29],
  }),
  p09: page(9, [1124, 1600], {
    a: [0.12, 0, 0.797, 0.228],
    b: [0, 0.232, 0.917, 0.493],
    c: [0, 0.7, 0.917, 0.3],
  }),
  p10: page(10, [1124, 1600], {
    a: [0.079, 0, 0.921, 0.532],
    b: [0.078, 0.541, 0.796, 0.137],
    c: [0.079, 0.706, 0.921, 0.294],
  }),
  p11: page(11, [1124, 1600], {
    a: [0, 0, 0.917, 0.226],
    b: [0, 0.251, 0.917, 0.53],
    c: [0, 0.781, 0.917, 0.175],
  }),
  p12: page(12, [1124, 1600], {
    a: [0.079, 0, 0.921, 0.53],
    b: [[0.079, 0.45], [1, 0.45], [1, 0.713], [0.079, 0.69]],
    c: [0.079, 0.71, 0.921, 0.29],
  }),
  p13: page(13, [1124, 1600], {
    a: [0, 0, 0.917, 0.337],
    b: [0.542, 0.366, 0.375, 0.29],
    c: [0, 0.366, 0.532, 0.29],
    d: [0.479, 0.686, 0.438, 0.314],
    e: [0, 0.686, 0.469, 0.314],
  }),
  p14: page(14, [1124, 1600], {
    a: [0.079, 0, 0.921, 0.441],
    b: [0.545, 0.465, 0.455, 0.218],
    c: [0.079, 0.465, 0.458, 0.218],
    d: [0.079, 0.713, 0.921, 0.287],
  }),
  p15: page(15, [1124, 1600], {
    a: [[0, 0], [0.917, 0], [0.917, 0.285], [0, 0.33]],
    b: [[0.118, 0.347], [0.917, 0.308], [0.917, 0.624], [0.118, 0.595]],
    c: [[0, 0.615], [0.917, 0.647], [0.917, 1], [0, 1]],
  }),
  p16: page(16, [1124, 1600], {
    a: [0.079, 0, 0.921, 0.337],
    b: [0.313, 0.367, 0.561, 0.209],
    c: [0.079, 0.367, 0.27, 0.209],
    d: [0.079, 0.604, 0.921, 0.396],
    e: [0.55, 0.61, 0.38, 0.24],
  }),
  p17: page(17, [1124, 1600], {
    a: [0, 0, 0.917, 0.388],
    b: [0.119, 0.412, 0.798, 0.249],
    c: [0.49, 0.69, 0.427, 0.229],
    d: [0.39, 0.69, 0.155, 0.229],
    e: [0, 0.69, 0.383, 0.31],
  }),
  p18: page(18, [1124, 1600], {
    a: [0.452, 0, 0.548, 0.379],
    b: [0.081, 0.02, 0.465, 0.359],
    c: [0.081, 0.38, 0.919, 0.62],
    d: [0.6, 0.6, 0.4, 0.27],
  }),
};

const CREDIT = 'Shangri-La Frontier · Katarina · Ryosuke Fuji · Kodansha · перевод YONA ANART';

export const scenes = [
  {
    type: 'title',
    kicker: 'Глава 12 · Всё пришло в движение',
    title: 'Рубеж\nШангри-Ла',
    credit: CREDIT,
    hint: 'Листай вниз ↓',
  },
  {
    page: 'p01',
    intro: 'hatch',
    steps: [
      { view: 'page' },
      { view: 'a', effect: ['shake', 'speedlines'], strength: 0.6 },
      { view: 'b' },
      { view: 'c', effect: 'speedlines', strength: 0.4 },
      { view: 'd', effect: 'speedlines', strength: 0.5 },
      { view: 'e', zoom: 1.1 },
    ],
  },
  {
    page: 'p02',
    steps: [
      { view: 'page' },
      { view: 'a', effect: ['flash', 'shake'], strength: 0.9 },
      { view: 'b', effect: 'speedlines', strength: 0.6 },
      { view: 'c' },
    ],
  },
  {
    page: 'p03',
    steps: [
      { view: 'page' },
      { view: 'a', effect: ['flash', 'shake'], strength: 0.8 },
      { view: 'b', zoom: 1.05 },
      { view: 'c' },
      { view: 'd', zoom: 1.1 },
      { view: 'e', smoke: [[0.6, 0.78], [0.72, 0.73]] },
      { view: 'f', smoke: [0.28, 0.74] },
    ],
  },
  {
    page: 'p04',
    outro: 'hatch',
    steps: [
      { view: 'page' },
      { view: 'a' },
      { view: 'b' },
      { view: 'c', zoom: 1.1, effect: 'shake', strength: 0.4 },
      { view: 'd' },
    ],
  },
  {
    page: 'p05',
    intro: 'hatch',
    steps: [
      { view: 'page' },
      { view: 'a', zoom: 1.05 },
      { view: 'b' },
      { view: 'c', sparkle: [0.54, 0.72, 0.22, 0.13] },
      { view: 'd', zoom: 1.1 },
    ],
  },
  {
    page: 'p06',
    outro: 'pixel',
    steps: [
      { view: 'page' },
      { view: 'a' },
      { view: 'b' },
      { view: 'c' },
      { view: 'd', sparkle: true },
      { view: 'e', zoom: 1.05 },
    ],
  },
  {
    page: 'p07',
    intro: 'pixel',
    steps: [
      { view: 'page' },
      { view: 'a', hud: [0.21, 0.04, 0.49, 0.265] },
      { view: 'b', hud: [0.578, 0.518, 0.2, 0.158] },
      { view: 'c', hud: [[0.05, 0.355, 0.2, 0.08], [0.35, 0.52, 0.062, 0.04]] },
      { view: 'd', hud: true },
    ],
  },
  {
    page: 'p08',
    steps: [
      { view: 'page' },
      { view: 'a' },
      { view: 'b' },
      { view: 'c', hud: [0.205, 0.532, 0.11, 0.047] },
      { view: 'd' },
    ],
  },
  {
    page: 'p09',
    steps: [
      { view: 'page' },
      { view: 'a' },
      { view: 'b', effect: 'speedlines', strength: 0.5 },
      { view: 'c', zoom: 1.05, effect: 'speedlines', strength: 0.6 },
    ],
  },
  {
    page: 'p10',
    steps: [
      { view: 'page' },
      { view: 'a', effect: 'speedlines', strength: 0.4 },
      { view: 'b', effect: 'shake', strength: 0.35 },
      { view: 'c' },
    ],
  },
  {
    page: 'p11',
    steps: [
      { view: 'page' },
      { view: 'a', effect: 'speedlines', strength: 0.5 },
      { view: 'b', effect: ['flash', 'shake'], strength: 0.7 },
      { view: 'c', effect: 'speedlines', strength: 0.6 },
    ],
  },
  {
    page: 'p12',
    steps: [
      { view: 'page' },
      { view: 'a', effect: 'speedlines', strength: 0.4 },
      { view: 'b', effect: 'speedlines', strength: 0.7 },
      { view: 'c', effect: 'shake', strength: 0.6 },
    ],
  },
  {
    page: 'p13',
    steps: [
      { view: 'page' },
      { view: 'a', hud: [0.345, 0.045, 0.572, 0.292] },
      { view: 'b', effect: 'shake', strength: 0.35, hud: [0.543, 0.5, 0.2, 0.128] },
      { view: 'c' },
      { view: 'd', hud: [0.665, 0.705, 0.065, 0.055] },
      { view: 'e', zoom: 1.1 },
    ],
  },
  {
    page: 'p14',
    steps: [
      { view: 'page' },
      { view: 'a', hud: [0.118, 0.228, 0.51, 0.212] },
      { view: 'b', zoom: 1.1 },
      { view: 'c' },
      { view: 'd', effect: ['shake', 'speedlines'], strength: 0.6 },
    ],
  },
  {
    page: 'p15',
    steps: [
      { view: 'page' },
      { view: 'a', effect: 'speedlines', strength: 0.5, smoke: [[0.12, 0.27], [0.32, 0.28]] },
      { view: 'b', zoom: 1.1 },
      { view: 'c', effect: 'speedlines', strength: 0.6 },
    ],
  },
  {
    page: 'p16',
    steps: [
      { view: 'page' },
      { view: 'a', zoom: 1.05 },
      { view: 'b', zoom: 1.1 },
      { view: 'c' },
      { view: 'd' },
      { view: 'e', smoke: [[0.62, 0.68], [0.84, 0.66]] },
    ],
  },
  {
    page: 'p17',
    steps: [
      { view: 'page' },
      { view: 'a', effect: 'shake', strength: 0.4 },
      { view: 'b', zoom: 1.08 },
      { view: 'c', sparkle: true },
      { view: 'd' },
      { view: 'e' },
    ],
  },
  {
    page: 'p18',
    outro: 'hatch',
    steps: [
      { view: 'page' },
      { view: 'a', zoom: 1.05 },
      { view: 'b' },
      { view: 'c', tint: 0.25 },
      { view: 'd', zoom: 1.1 },
    ],
  },
  { type: 'end', text: 'Конец главы 12', credit: CREDIT, next: { href: '../slf-13/', text: 'Глава 13 →' }, back: { href: '../manga/shangrila/', text: '← К списку глав' } },
];
