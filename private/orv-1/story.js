// «Всеведущий читатель», глава 1. Формат и права — как в private/orv-0/story.js (только для себя).
export const strip = 'pages/strip.json';

export const CREDIT = 'Omniscient Reader · Sing Shong · Sleepy-C · Redice Studio · перевод AssleyTM, Kolabik';

// Последняя глава новеллы, Ю Сан А в метро, письма автора tls123 — и в 19:00 мир меняет жанр
export const frames = {
  7: { glow: [0.12, 0.26, 0.75, 0.38] },
  10: { shake: 0.25 },
  11: { shake: 0.2 },
  12: { shake: 0.2 },
  13: { glitch: 0.8, push: 1 },
  18: { shake: 0.2, push: 0.8 },
  25: { push: 1 },
  31: { push: 0.8 },
  45: { glow: [0.08, 0.2, 0.9, 0.42] },
  47: { stars: { box: [0.25, 0.35, 0.7, 0.35], amount: 0.6 } },
  52: { glitch: 0.5 },
  55: { glow: [0.25, 0.13, 0.63, 0.66] },
  59: { push: 0.6 },
  65: { push: 0.8 },
  66: { glow: { box: [0.03, 0.32, 0.95, 0.27], color: 'blue' } },
  85: { shake: 0.2 },
  95: { shake: 0.15 },
  98: { system: { box: [0.05, 0.33, 0.89, 0.33], color: 'steel' }, punch: 0.3 },
  100: { system: { color: 'steel' }, punch: 0.3 },
  101: { system: { color: 'steel' }, punch: 0.3 },
  102: { punch: 0.5 },
  103: { system: { color: 'steel' } },
  104: { system: { box: [0.04, 0.05, 0.93, 0.55], color: 'steel' } },
  105: { glitch: 0.7, pulse: true },
  108: { system: { box: [0.08, 0.37, 0.85, 0.5], color: 'steel' } },
  111: { glow: [0.1, 0.27, 0.8, 0.45] },
  113: { glow: [0.05, 0.18, 0.85, 0.3], glitch: 0.6 },
  114: { strobe: '#000', shake: 0.2 },
  116: { shake: 0.9, flash: 0.5, speedlines: true, punch: 0.6 },
  117: { shake: 0.7, speedlines: true },
  118: { pulse: true, glitch: 0.6 },
  119: { embers: true },
  121: { system: [0.05, 0.55, 0.9, 0.25], punch: 0.5 },
  124: { strobe: 'red', shake: 0.4 },
  125: { flash: { strength: 0.6, color: '#ff7aa8' } },
  126: { strobe: 'red' },
  127: { flash: { strength: 0.9, color: '#ffd0d0' }, shake: 0.8, punch: 0.6 },
  128: { static: 0.6, glitch: 0.8 },
  129: { system: { box: [0.06, 0.49, 0.52, 0.23], color: 'red' }, static: { box: [0, 0.38, 1, 0.62], amount: 0.5 } },
  130: { system: { box: [0.1, 0.455, 0.51, 0.15], color: 'red' }, static: 0.4 },
  131: { glitch: 0.6 },
};

export const scenes = [
  { type: 'title', theme: 'ink', kicker: 'Глава 1', title: 'Всеведущий\nчитатель', credit: CREDIT, hint: 'Листай вниз ↓' },
  { type: 'strip' },
  { type: 'end', text: 'Конец главы 1', credit: CREDIT, next: { href: '../orv-2/', text: 'Глава 2 →' } },
];
