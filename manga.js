// Страница манги: у глав — полоска и «Прочитано на N%», в шапке — кнопка «Продолжить» к последней
// открытой главе (или «Дальше» к следующей, если та дочитана). Данные — reading.js.
import { chapterPath, readProgress } from './reading.js';

const DONE = 0.98;
const links = [...document.querySelectorAll('.chapters a')];
let last;

for (const a of links) {
  const read = readProgress(chapterPath(new URL(a.href).pathname));
  if (!read || read.p < 0.05) continue;
  a.style.setProperty('--read', read.p);
  const state = document.createElement('p');
  state.className = 'label chapter-state';
  state.textContent = read.p >= DONE ? 'Прочитано' : `Прочитано на ${Math.round(read.p * 100)}%`;
  a.querySelector('.chapter-title').after(state);
  if (!last || read.t > last.t) last = { a, ...read };
}

const button = document.querySelector('[data-continue]');
if (button && last) {
  const finished = last.p >= DONE;
  const next = finished ? links[links.indexOf(last.a) + 1] : last.a;
  if (next) {
    // #at= — движок сам прокрутит туда, где остановились
    button.href = finished ? next.href : `${next.href}#at=${last.p}`;
    button.textContent = `${finished ? 'Дальше' : 'Продолжить'}: ${next.querySelector('.chapter-title').textContent} →`;
    button.hidden = false;
  }
}
