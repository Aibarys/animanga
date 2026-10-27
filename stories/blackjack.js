// Страницы манги.
// src — файл страницы, panels — рамки панелей (или просто областей кадра) в долях страницы:
// [x, y, ширина, высота], где 0 — левый/верхний край, 1 — правый/нижний. Наклонную панель можно
// задать четырьмя углами [[x, y], ×4] по часовой стрелке от левого верхнего — камера вырежет её по ним.
// Открой index.html?story=blackjack&debug, чтобы увидеть рамки поверх страниц.
//
// Источник: «Give My Regards to Black Jack», SHUHO SATO, т. 1, английская версия,
// официальная раздача для свободного вторичного использования: https://densho810.com/free/
// По условиям автора название и имя нужно указывать без изменений (см. credit ниже).
//
// 2.5D-слои (облачка, звуки, текст, столб, рука) описаны в tools/layers.json.
// После правок пересобрать: python3 -I tools/make_layers.py  (из папки prototype).
// Сравнить с плоской версией: index.html?story=blackjack&flat. Сила параллакса — KP и KZ в main.js,
// для отдельного шага — parallax: 0…1.
export const pages = {
  night: {
    src: 'pages/bj-p34.jpg',
    panels: {
      text: [0.26, 0.06, 0.72, 0.45],
      city: [0.0, 0.5, 0.7, 0.5],
    },
  },
  crash: {
    src: 'pages/bj-p37.jpg',
    panels: {
      wreck: [0.45, 0.0, 0.55, 0.5],
      ground: [0.0, 0.55, 0.6, 0.45],
    },
  },
  ambulance: {
    src: 'pages/bj-p38.jpg',
    panels: {
      a: [0.1114, 0.0, 0.7814, 0.3495],
      b1: [0.1114, 0.3626, 0.3466, 0.2626],
      b2: [0.467, 0.3626, 0.4258, 0.2626],
      c: [0.1114, 0.6333, 0.7857, 0.3667],
    },
  },
};

// Сценарий. Каждая сцена — одна страница, которая «проигрывается» скроллом.
//   length — длина сцены в экранах скролла (по умолчанию = числу шагов)
//   intro / outro — 'hatch' (переход штриховкой) или ничего (страница просто уезжает вверх)
//   steps — куда смотрит камера по очереди:
//     view    — 'page' (вся страница), id панели или своя рамка [x, y, w, h]
//     focus   — false, чтобы не обрезать кадр по рамке (для страниц без панелей)
//     zoom    — дополнительный наезд (1.3 = на 30% ближе)
//     tint    — красный тон от 0 до 1
//     effect  — 'shake', 'speedlines', 'flash' или массив из них
//     strength — сила тряски и вспышки (по умолчанию 1)
//     caption — текст плашки: строка или { text, at: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' }
export const scenes = [
  {
    type: 'title',
    kicker: 'Тест анимации · т. 1, стр. 34–38',
    title: 'Give My Regards\nto Black Jack',
    credit: 'Give My Regards to Black Jack · SHUHO SATO',
    hint: 'Листай вниз ↓',
  },
  {
    page: 'night',
    length: 4,
    intro: 'hatch',
    outro: 'hatch',
    steps: [
      { view: 'city', focus: false, zoom: 1.1, caption: { text: 'Ночь. Город спит — а больницы нет.', at: 'top-left' } },
      { view: 'text', focus: false },
      { view: 'page' },
    ],
  },
  {
    page: 'crash',
    length: 4,
    intro: 'hatch',
    steps: [
      { view: 'page', effect: ['flash', 'shake'] },
      { view: 'wreck', focus: false, zoom: 1.15, effect: 'speedlines', caption: { text: 'Где-то на окраине — авария.', at: 'bottom-left' } },
      { view: 'ground', focus: false, zoom: 1.1, tint: 0.9, effect: 'shake' },
    ],
  },
  {
    page: 'ambulance',
    length: 6,
    outro: 'hatch',
    steps: [
      { view: 'page' },
      { view: 'a', zoom: 1.05, caption: { text: 'Скорая уже в пути.', at: 'top-right' } },
      { view: 'b1', zoom: 1.1 },
      { view: 'b2' },
      { view: 'c', zoom: 1.2, effect: ['flash', 'shake'] },
    ],
  },
  { type: 'end', text: 'Конец теста', credit: 'Give My Regards to Black Jack · SHUHO SATO' },
];
