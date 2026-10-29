// Страница манги: у глав — полоска и «Прочитано на N%», в шапке — кнопка «Продолжить» к последней
// открытой главе (или «Дальше» к следующей, если та дочитана). Данные — reading.js.
import { chapterPath, readProgress } from './reading.js';

const DONE = 0.98;
const PER_PAGE = 10;
const links = [...document.querySelectorAll('.chapters a')];
const done = new Map();   // ссылка главы → сколько прочитано, 0…1
let last;

for (const a of links) {
  const read = readProgress(chapterPath(new URL(a.href).pathname));
  if (!read || read.p < 0.05) continue;
  done.set(a, read.p >= DONE ? 1 : read.p);
  a.style.setProperty('--read', read.p);
  const state = document.createElement('p');
  state.className = 'label chapter-state';
  state.textContent = read.p >= DONE ? 'Прочитано' : `Прочитано на ${Math.round(read.p * 100)}%`;
  a.querySelector('.chapter-title').after(state);
  if (!last || read.t > last.t) last = { a, ...read };
}

const button = document.querySelector('[data-continue]');
const finished = last?.p >= DONE;
// с какой главы продолжать: начатая — она же, дочитанная — следующая
const resume = last && (finished ? links[links.indexOf(last.a) + 1] : last.a);
if (button && resume) {
  // #at= — движок сам прокрутит туда, где остановились
  button.href = finished ? resume.href : `${resume.href}#at=${last.p}`;
  button.textContent = `${finished ? 'Дальше' : 'Продолжить'}: ${resume.querySelector('.chapter-title').textContent} →`;
  button.hidden = false;
}

// Длинный список — по страницам из десяти глав (бонусная идёт вместе с главой перед ней). Сразу
// открыта страница с главой, с которой продолжать; без скрипта виден весь список.
const list = document.querySelector('.chapters');
const groups = [];
let regular = 0;
for (const li of list?.children ?? []) {
  const num = li.querySelector('.chapter-title')?.textContent.match(/^Глава (\d+)/)?.[1];
  if (!groups.length || (num && regular && regular % PER_PAGE === 0)) groups.push({ items: [], from: num, to: num });
  const group = groups.at(-1);
  group.items.push(li);
  if (num) { regular++; group.from ??= num; group.to = num; }
}
const open = (resume ?? last?.a)?.closest('li');
if (groups.length > 1) paginate(groups, open ? groups.findIndex((g) => g.items.includes(open)) : 0);

function paginate(groups, start) {
  const tabs = document.createElement('div');
  tabs.className = 'chapter-pages';
  tabs.setAttribute('role', 'tablist');
  tabs.setAttribute('aria-label', 'Главы по страницам');
  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'button ghost chapter-next';
  let current;

  const show = (i, focus) => {
    current = i;
    groups.forEach((g, j) => {
      g.tab.setAttribute('aria-selected', String(i === j));
      g.tab.tabIndex = i === j ? 0 : -1;
      for (const li of g.items) li.hidden = i !== j;
    });
    next.hidden = i === groups.length - 1;
    if (!next.hidden) next.textContent = `Главы ${groups[i + 1].label} →`;
    if (focus) groups[i].tab.focus({ preventScroll: true });
  };

  groups.forEach((g, i) => {
    g.label = g.from === g.to ? g.from : `${g.from}–${g.to}`;
    const tab = g.tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'chapter-page';
    tab.setAttribute('role', 'tab');
    tab.textContent = g.label;
    // полоска под кнопкой — сколько глав на этой странице уже прочитано
    const read = g.items.reduce((sum, li) => sum + (done.get(li.querySelector('a')) ?? 0), 0) / g.items.length;
    if (read) tab.style.setProperty('--read', read);
    tab.addEventListener('click', () => show(i));
    tabs.append(tab);
  });

  // стрелки и Home/End — как у обычных вкладок
  tabs.addEventListener('keydown', (e) => {
    const to = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: groups.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    show((to + groups.length) % groups.length, true);
  });

  next.addEventListener('click', () => {
    if (current === groups.length - 1) return;
    show(current + 1, true);
    const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    tabs.scrollIntoView({ block: 'start', behavior: smooth ? 'smooth' : 'auto' });
  });

  list.before(tabs);
  list.after(next);
  show(Math.max(start, 0));
}
