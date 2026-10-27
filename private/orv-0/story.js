// «Всеведущий читатель», пролог.
// Оригинал: «Omniscient Reader» (전지적 독자 시점), роман Sing Shong, вебтун Sleepy-C, Redice Studio.
// Перевод — AssleyTM. Коммерческий вебтун: только для себя, как и «Перекур» — папка private/ на сайте
// закрыта паролем, публично не выкладывать.
//
// Вебтун читается лентой: кадры pages/s001.jpg … режет tools/cut_strip.py, эффекты — по номеру кадра,
// их язык описан в шапке engine/strip.js. Главный эффект истории — системные окна (system).
// Номера кадров поверх ленты: ?debug
export const strip = 'pages/strip.json';

export const CREDIT = 'Omniscient Reader · Sing Shong · Sleepy-C · Redice Studio · перевод AssleyTM';

// Пролог: страница забытой новеллы, битва из её конца, «мир новеллы станет реальностью»
export const frames = {
  8: { glow: { box: [0.02, 0.655, 0.96, 0.07], color: 'blue' } },
  13: { embers: true, shake: 0.7, punch: 0.6 },
  14: { embers: true },
  15: { embers: true, shake: 0.5, punch: 0.4 },
  16: { embers: true },
  17: { embers: true, shake: 0.6, punch: 0.5, pulse: true },
  18: { embers: true, push: 1 },
  20: { speedlines: true, shake: 0.4 },
  21: { glitch: 0.8, glow: { box: [0.05, 0.25, 0.9, 0.5], color: 'gold' } },
  22: { pulse: true, shake: 0.3 },
  23: { glow: { box: [0.08, 0.08, 0.84, 0.8], color: 'white' }, glitch: 0.4 },
  24: { shake: 0.3 },
  25: { glitch: 0.7 },
  26: { stars: true, push: 1 },
  27: { stars: { box: [0, 0, 1, 0.45] }, embers: { box: [0, 0.5, 1, 0.5] }, push: 0.8 },
  28: { flash: 0.7, shake: 0.6, punch: 0.5 },
  29: { flash: 0.8, shake: 0.8, punch: 0.7, dust: true },
  30: { embers: true, shake: 0.3 },
  31: { push: 1 },
  32: { flash: 0.5, shake: 0.5, embers: true },
  33: { embers: true },
  34: { push: 1 },
  35: { embers: true },
  36: { flash: 0.6, shake: 0.6, punch: 0.5, speedlines: true, embers: true },
  38: { dust: true, embers: true, push: 0.8 },
  39: { push: 1 },
  41: { glow: { box: [0.03, 0.71, 0.94, 0.075], color: 'blue' } },
  43: { glow: { box: [0, 0.33, 1, 0.15], color: 'blue' }, punch: 0.4 },
  45: { stars: true, push: 0.6 },
  46: { stars: { amount: 0.5 } },
  47: { push: 0.8 },
};

export const scenes = [
  { type: 'title', theme: 'ink', kicker: 'Пролог', title: 'Всеведущий\nчитатель', credit: CREDIT, hint: 'Листай вниз ↓' },
  { type: 'strip' },
  { type: 'end', text: 'Конец пролога', credit: CREDIT, next: { href: '../orv-1/', text: 'Глава 1 →' } },
];
