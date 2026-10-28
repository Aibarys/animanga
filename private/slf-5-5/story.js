// «Рубеж Шангри-Ла», бонусная глава 5.5 — рассказ текстом.
// Оригинал: «Shangri-La Frontier» (シャングリラ・フロンティア), Katarina (история), Ryosuke Fuji (рисунок), Kodansha.
// Страницы — любительский перевод YONA ANART. Коммерческая манга: только для себя — папка private/
// на сайте закрыта, публично её не выкладывать. Формат — как в private/perekur/story.js,
// эффекты hud, tone и переход 'pixel' — в шапке private/slf-1/story.js. Рамки: ?debug

const page = (n, size, panels) => ({ src: `pages/p${String(n).padStart(2, '0')}.jpg`, size, panels });

export const pages = {
  p01: page(1, [1115, 1600], {
    a: [0, 0, 1, 0.36],
    b: [0, 0.32, 1, 0.36],
    c: [0, 0.64, 1, 0.36],
  }),
  p02: page(2, [1115, 1600], {
    a: [0, 0, 1, 0.36],
    b: [0, 0.32, 1, 0.36],
    c: [0, 0.64, 1, 0.36],
  }),
  p03: page(3, [1115, 1600], {
    a: [0, 0, 1, 0.36],
    b: [0, 0.32, 1, 0.36],
    c: [0, 0.64, 1, 0.36],
  }),
  p04: page(4, [1115, 1600], {
    a: [0, 0, 1, 0.36],
    b: [0, 0.32, 1, 0.36],
    c: [0, 0.64, 1, 0.36],
  }),
  p05: page(5, [1115, 1600], {
    a: [0, 0, 1, 0.36],
    b: [0, 0.32, 1, 0.36],
    c: [0, 0.64, 1, 0.36],
  }),
  p06: page(6, [1115, 1600], {
    a: [0, 0, 1, 0.36],
    b: [0, 0.32, 1, 0.36],
    c: [0, 0.64, 1, 0.36],
  }),
  p07: page(7, [1115, 1600], {
    a: [0, 0, 1, 0.36],
    b: [0, 0.32, 1, 0.36],
    c: [0, 0.64, 1, 0.36],
  }),
  p08: page(8, [1115, 1600], {
    a: [0, 0, 1, 0.36],
    b: [0, 0.32, 1, 0.36],
    c: [0, 0.64, 1, 0.36],
  }),
  p09: page(9, [1115, 1600], {
    a: [0, 0, 1, 0.21],
    b: [0, 0.2, 1, 0.52],
    c: [0, 0.71, 1, 0.29],
  }),
};

const CREDIT = 'Shangri-La Frontier · Katarina · Ryosuke Fuji · Kodansha · перевод YONA ANART';

export const scenes = [
  {
    type: 'title',
    kicker: 'Бонус: Неизведанная территория',
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
      { view: 'b' },
      { view: 'c' },
    ],
  },
  {
    page: 'p02',
    steps: [
      { view: 'page' },
      { view: 'a' },
      { view: 'b' },
      { view: 'c' },
    ],
  },
  {
    page: 'p03',
    steps: [
      { view: 'page' },
      { view: 'a' },
      { view: 'b' },
      { view: 'c' },
    ],
  },
  {
    page: 'p04',
    steps: [
      { view: 'page' },
      { view: 'a' },
      { view: 'b' },
      { view: 'c' },
    ],
  },
  {
    page: 'p05',
    steps: [
      { view: 'page' },
      { view: 'a' },
      { view: 'b' },
      { view: 'c' },
    ],
  },
  {
    page: 'p06',
    steps: [
      { view: 'page' },
      { view: 'a' },
      { view: 'b' },
      { view: 'c' },
    ],
  },
  {
    page: 'p07',
    steps: [
      { view: 'page' },
      { view: 'a' },
      { view: 'b' },
      { view: 'c' },
    ],
  },
  {
    page: 'p08',
    steps: [
      { view: 'page' },
      { view: 'a' },
      { view: 'b' },
      { view: 'c' },
    ],
  },
  {
    page: 'p09',
    outro: 'hatch',
    steps: [
      { view: 'page' },
      { view: 'a' },
      { view: 'b' },
      { view: 'c' },
    ],
  },
  { type: 'end', text: 'Конец бонусной главы', credit: CREDIT, next: { href: '../slf-6/', text: 'Глава 6 →' }, back: { href: '../manga/shangrila/', text: '← К списку глав' } },
];
