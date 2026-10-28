// «Всеведущий читатель», глава 2. Формат и права — как в private/orv-0/story.js (только для себя).
export const strip = 'pages/strip.json';

export const CREDIT = 'Omniscient Reader · Sing Shong · Sleepy-C · Redice Studio · перевод AssleyTM, Kolabik';

// Токкэби в вагоне, первая кровь, деньги Хан Мён О сгорают — и приходит первый основной сценарий
export const frames = {
  3: { punch: 0.4, flash: 0.3 },
  6: { push: 0.6 },
  7: { shake: 0.2 },
  11: { push: 1 },
  12: { glow: [0.05, 0.12, 0.9, 0.82] },
  18: { glitch: 0.6, stars: { box: [0.1, 0.1, 0.8, 0.6], amount: 0.8 }, flash: { strength: 0.3, color: '#d9b3ff' }, punch: 0.4 },
  19: { glitch: 0.8, push: 1 },
  24: { push: 0.8 },
  26: { glitch: 0.6 },
  27: { glitch: 0.6, static: 0.4 },
  35: { static: 0.3 },
  50: { pulse: true, punch: 0.5, glitch: 0.4 },
  51: { blood: 0.8, shake: 0.8, speedlines: true },
  52: { blood: 0.6, shake: 0.4 },
  53: { blood: 0.5 },
  54: { blood: 0.5, shake: 0.5, pulse: true },
  55: { blood: 0.6, shake: 0.6 },
  56: { pulse: true, glitch: 0.5 },
  57: { push: 0.8 },
  58: { pulse: true },
  59: { pulse: true },
  60: { shake: 0.2 },
  61: { glitch: 0.5, pulse: true },
  62: { punch: 0.6, pulse: true },
  70: { embers: true, flash: { strength: 0.4, color: '#ffb347' }, shake: 0.4 },
  72: { embers: true },
  73: { punch: 0.4 },
  74: { shake: 0.3, glow: { box: [0, 0.15, 0.55, 0.55], color: 'gold' } },
  75: { system: [{ box: [0.27, 0.02, 0.48, 0.12], color: 'red' }, { box: [0.08, 0.68, 0.5, 0.11], color: 'red' }], static: 0.4 },
  76: { system: [{ box: [0.599, 0.407, 0.308, 0.373], soft: true }, { box: [0.413, 0.637, 0.116, 0.142], soft: true }] },
  77: { system: [{ box: [0.494, 0.364, 0.238, 0.307], soft: true }, { box: [0.285, 0.379, 0.186, 0.284], soft: true }] },
  78: { system: [0.07, 0.435, 0.919, 0.26] },
  79: { push: 1 },
  80: { system: [0, 0.025, 1, 0.285] },
  81: { system: [0, 0.222, 1, 0.606], push: 0.4 },
  83: { glow: { box: [0.35, 0.2, 0.4, 0.12], color: '#ff2bd0' }, pulse: true },
  84: { flash: { strength: 0.6, color: '#c58bff' }, shake: 0.6, punch: 0.5, stars: { amount: 0.8 } },
};

export const scenes = [
  { type: 'title', theme: 'ink', kicker: 'Глава 2', title: 'Всеведущий\nчитатель', credit: CREDIT, hint: 'Листай вниз ↓' },
  { type: 'strip' },
  { type: 'end', text: 'Конец главы 2', credit: CREDIT, next: { href: '../orv-3/', text: 'Глава 3 →' }, back: { href: '../manga/orv/', text: '← К списку глав' } },
];
