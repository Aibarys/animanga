// Статистика для владельца сайта: цифры из /api/admin/summary (сервер отдаёт их только ANIMANGA_ADMIN).
// Имена, адреса и сайты приходят от посетителей, поэтому на страницу всё попадает через textContent.
import { api, loginHref, me } from '../auth.js';

const $ = (id) => document.getElementById(id);
const num = new Intl.NumberFormat('ru-RU');
const timeFmt = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' });
const dateFmt = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' });
const longFmt = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
const dayFmt = new Intl.DateTimeFormat('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' });
const RANGES = [1, 7, 30, 90, 180];
const ROLES = { owner: 'владелец', reader: 'читатель' };
const SVG = 'http://www.w3.org/2000/svg';

const board = $('board');
const tip = $('tip');
const state = { days: 30, hideMine: true };
try {
  const saved = JSON.parse(localStorage.getItem('am-admin') ?? '{}');
  if (RANGES.includes(saved.days)) state.days = saved.days;
  if (typeof saved.hideMine === 'boolean') state.hideMine = saved.hideMine;
} catch {}
let data;
let loading = false;

function plural(n, [one, few, many]) {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  return a > 10 && a < 20 ? many : b === 1 ? one : b >= 2 && b <= 4 ? few : many;
}

function el(tag, props = {}, ...kids) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value === true ? '' : value);
  }
  node.append(...kids.flat().filter((k) => k != null && k !== false));
  return node;
}

function svg(tag, attrs = {}) {
  const node = document.createElementNS(SVG, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
}

const tag = (text, muted) => el('span', { class: muted ? 'tag muted' : 'tag', text });

// Место по IP ищет сервер в базе DB-IP: город там по-английски, страна по-русски, район и область — в подсказке
const placeTitle = (p) => p && [p.district, p.region, p.country].filter(Boolean).join(', ');
const placeCell = (p) => el('td', { title: placeTitle(p) }, p ? (p.city ?? p.region ?? p.country) : '—',
  p && (p.city || p.region) && el('span', { class: 'sub', text: p.country }));
const pageHref = (path) => (path ? `/${path}/` : '/');

function when(ts) {
  const d = new Date(ts * 1000);
  const days = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 864e5);
  return `${days === 0 ? 'сегодня' : days === 1 ? 'вчера' : dateFmt.format(d)}, ${timeFmt.format(d)}`;
}

function ago(ts) {
  const s = Date.now() / 1000 - ts;
  if (s < 60) return 'только что';
  if (s < 3600) return `${Math.floor(s / 60)} мин назад`;
  return when(ts);
}

// ---------- Загрузка ----------

function gate(text, login) {
  board.hidden = true;
  $('gate').hidden = false;
  $('gate-text').textContent = text;
  $('gate-login').hidden = !login;
  $('gate-login').href = loginHref('/admin/');
}

async function load() {
  if (loading) return;
  loading = true;
  board.classList.add('loading');
  const tz = new Date().getTimezoneOffset();
  const r = await api('GET', `/api/admin/summary?days=${state.days}&tz=${tz}&mine=${state.hideMine ? 0 : 1}`);
  loading = false;
  board.classList.remove('loading');
  if (r.status === 401 || r.status === 403) return gate(r.data.error, r.status === 401);
  if (!r.ok) {
    $('sub').textContent = r.data.error ?? 'Не получилось загрузить статистику — попробуйте обновить';
    return;
  }
  data = r.data;
  render();
}

function syncFilters() {
  for (const b of $('range').querySelectorAll('button')) b.setAttribute('aria-pressed', String(+b.dataset.days === state.days));
  $('mine').checked = state.hideMine;
  try {
    localStorage.setItem('am-admin', JSON.stringify(state));
  } catch {}
}

// ---------- Отрисовка ----------

function render() {
  const { totals, site } = data;
  const sub = [];
  if (data.start) sub.push(`Считаем с ${longFmt.format(new Date(data.start * 1000))}`);
  else sub.push('Заходов пока не было — счётчик начнёт считать с первого посетителя');
  $('sub').replaceChildren(sub.join(''), ' · ', el('span', { class: 'live' }, 'сейчас на сайте: ', el('b', { text: num.format(data.online) })));

  tiles($('tiles'), [
    [totals.visitors, 'Посетители', 'разных IP-адресов'],
    [totals.views, 'Просмотры', 'открытых страниц'],
    [totals.new, 'Новые', 'впервые на сайте'],
    [totals.signed, 'С аккаунтом', 'заходили под своим именем'],
  ]);
  const roles = site.roles;
  tiles($('site'), [
    [site.visitors, 'Посетители', 'IP за всё время'],
    [site.views, 'Просмотры', 'за всё время'],
    [site.accounts, 'Аккаунты', `читателей ${roles.reader ?? 0} · участников ${roles.member ?? 0}` +
      (site.new_accounts ? ` · новых за период ${site.new_accounts}` : '')],
    [site.comments, 'Комментарии', `за период ${num.format(site.new_comments)}`],
  ]);
  $('foot').textContent = `Боты и сервисы предпросмотра ссылок не считаются (за период — ${num.format(totals.bots)} ` +
    `${plural(totals.bots, ['запрос', 'запроса', 'запросов'])}). Открыть закрытые страницы без доступа пытались ` +
    `${num.format(totals.locked)} ${plural(totals.locked, ['адрес', 'адреса', 'адресов'])}. Записи старше 180 дней удаляются сами.` +
    (data.geo ? '' : ' База стран и городов на сервере не найдена — поэтому мест нет (python3 -I animanga_api.py geoip).');

  chart();
  bars($('pages'), data.pages, {
    name: (p) => p.title,
    href: (p) => pageHref(p.path),
    note: (p) => [el('small', { class: 'path', text: pageHref(p.path) }), p.locked > 0 && tag(`вход ×${p.locked}`)],
    value: (p) => p.visitors,
    extra: (p) => `${num.format(p.views)} просм.`,
  });
  bars($('refs'), data.refs, { name: (r) => r.host, value: (r) => r.visitors, extra: (r) => `${num.format(r.views)} просм.` });
  for (const key of ['devices', 'browsers', 'systems']) bars($(key), data[key], { name: (d) => d.name, value: (d) => d.visitors });
  bars($('countries'), data.countries, { name: (c) => c.name ?? c.cc, value: (c) => c.visitors });
  bars($('cities'), data.cities, {
    name: (c) => c.name,
    note: (c) => el('small', { class: 'path', text: c.cc }),
    value: (c) => c.visitors,
  });
  $('geo-credit').hidden = !data.geo;
  visitors();
  accounts();
  recent();
}

function tiles(node, items) {
  node.style.setProperty('--n', items.length);
  node.replaceChildren(...items.map(([value, label, note]) =>
    el('div', {}, el('b', { text: num.format(value) }), el('span', { text: label }), el('small', { text: note }))));
}

function bars(node, items, { name, href, note, value, extra }) {
  if (!items.length) return node.replaceChildren(el('li', { class: 'empty', text: 'Пока ничего' }));
  const max = Math.max(...items.map(value), 1);
  node.replaceChildren(...items.map((it) => el('li', {},
    el(href ? 'a' : 'span', { class: 'name', href: href?.(it), title: name(it) }, name(it), note?.(it)),
    el('span', { class: 'num' }, num.format(value(it)), extra && el('small', { text: extra(it) })),
    el('span', { class: 'track' }, el('span', { class: 'fill', style: `width: ${(value(it) / max) * 100}%` })))));
}

// Столбики: посетители за день (или за час, если выбран один день). Просмотры — в подсказке и в таблице,
// второй оси у графика нет
function chart() {
  const hourly = data.hourly;
  const series = (hourly ?? data.daily).map((d) => ({
    ...d,
    axis: hourly ? String(d.hour) : d.day.slice(8, 10) + '.' + d.day.slice(5, 7),
    label: hourly ? `${d.hour}:00–${d.hour + 1}:00` : dayFmt.format(new Date(d.day + 'T00:00')),
  }));
  $('chart-title').textContent = hourly ? 'Посетители по часам (сегодня)' : 'Посетители по дням';
  chartTable(series, hourly);

  const box = $('chart');
  const max = Math.max(...series.map((d) => d.visitors));
  if (!max) return box.replaceChildren(el('p', { class: 'chart-empty', text: 'За этот период заходов нет' }));
  const W = Math.max(box.clientWidth, 280);
  const H = 220;
  const [top, bottom, left] = [10, 26, 34];
  const plotW = W - left;
  const plotH = H - top - bottom;
  const base = top + plotH;
  const raw = max / 4;
  const pow = 10 ** Math.floor(Math.log10(raw || 1));
  const step = Math.max(1, [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= raw));
  const yMax = Math.ceil(max / step) * step;
  const slot = plotW / series.length;
  const bw = Math.min(24, Math.max(2, slot - 2));
  const every = Math.ceil(40 / slot);

  const root = svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': $('chart-title').textContent });
  for (let v = 0; v <= yMax; v += step) {
    const y = base - (v / yMax) * plotH;
    root.append(svg('line', { class: 'grid', x1: left, x2: W, y1: y, y2: y }));
    const t = svg('text', { class: 'axis', x: left - 8, y: y + 4, 'text-anchor': 'end' });
    t.textContent = num.format(v);
    root.append(t);
  }
  series.forEach((d, i) => {
    const x = left + i * slot;
    const hit = svg('rect', { class: 'hit', x, y: top, width: slot, height: plotH, tabindex: 0,
      'aria-label': `${d.label}: ${d.visitors} ${plural(d.visitors, ['посетитель', 'посетителя', 'посетителей'])}, ${d.views} просм.` });
    root.append(hit);
    const h = (d.visitors / yMax) * plotH;
    let bar;
    if (h > 0) {
      const bx = x + (slot - bw) / 2;
      const r = Math.min(4, bw / 2, h);
      const y = base - h;
      bar = svg('path', { class: 'bar', d: `M${bx},${base}V${y + r}Q${bx},${y} ${bx + r},${y}H${bx + bw - r}Q${bx + bw},${y} ${bx + bw},${y + r}V${base}Z` });
      root.append(bar);
    }
    const show = () => {
      hideTip();
      bar?.classList.add('on');
      lit = bar;
      showTip(bar ?? hit, d);
    };
    hit.addEventListener('pointerenter', show);
    hit.addEventListener('focus', show);
    hit.addEventListener('pointerleave', hideTip);
    hit.addEventListener('blur', hideTip);
    if ((series.length - 1 - i) % every === 0) {
      const t = svg('text', { class: 'axis', x: x + slot / 2, y: H - 6, 'text-anchor': 'middle' });
      t.textContent = d.axis;
      root.append(t);
    }
  });
  box.replaceChildren(root);
}

function chartTable(series, hourly) {
  $('chart-table').replaceChildren(el('table', {},
    el('thead', {}, el('tr', {}, el('th', { text: hourly ? 'Час' : 'День' }), el('th', { class: 'n', text: 'Посетители' }), el('th', { class: 'n', text: 'Просмотры' }))),
    el('tbody', {}, series.slice().reverse().map((d) => el('tr', {},
      el('td', { text: d.label }), el('td', { class: 'n', text: num.format(d.visitors) }), el('td', { class: 'n', text: num.format(d.views) }))))));
}

function showTip(target, d) {
  tip.replaceChildren(el('b', { text: num.format(d.visitors) }),
    plural(d.visitors, ['посетитель', 'посетителя', 'посетителей']),
    el('span', { text: `${num.format(d.views)} ${plural(d.views, ['просмотр', 'просмотра', 'просмотров'])} · ${d.label}` }));
  tip.hidden = false;
  const r = target.getBoundingClientRect();
  const x = Math.min(Math.max(8, r.left + r.width / 2 - tip.offsetWidth / 2), innerWidth - tip.offsetWidth - 8);
  const y = r.top - tip.offsetHeight - 10;
  tip.style.left = `${x}px`;
  tip.style.top = `${y < 8 ? r.bottom + 10 : y}px`;
}

let lit;   // столбик под подсказкой: подсвечен и с клавиатуры, не только мышью

function hideTip() {
  tip.hidden = true;
  lit?.classList.remove('on');
}

// ---------- Таблицы ----------

const table = (head, rows) => el('table', {},
  el('thead', {}, el('tr', {}, head.map(([text, n]) => el('th', { class: n && 'n', text })))),
  el('tbody', {}, rows));

let shown = 25;
let shownRecent = 20;

const more = (left, onclick) => (left > 0 ? el('button', { type: 'button', class: 'link-button more', text: `Показать ещё ${left}`, onclick }) : '');

function visitors() {
  const list = data.visitors;
  const node = $('visitors');
  if (!list.length) return node.replaceChildren(el('p', { class: 'hint', text: 'За этот период заходов нет' }));
  const rows = list.slice(0, shown).map((v) => {
    const row = el('tr', { class: 'visitor', tabindex: 0, 'aria-expanded': 'false' },
      el('td', {},
        el('span', { class: 'ip', text: v.ip }),
        v.first >= data.since && tag('новый', true),
        v.locked > 0 && tag('стучался в закрытое'),
        v.users.length > 0 && el('span', { class: 'sub who-list', text: v.users.join(', ') })),
      placeCell(v.place),
      el('td', { class: 'when', text: ago(v.last) }),
      el('td', { class: 'n', text: num.format(v.views) }),
      el('td', { class: 'n', text: num.format(v.pages) }),
      el('td', {}, v.device, el('span', { class: 'sub', text: `${v.browser} · ${v.os}` })),
      el('td', {}, el('a', { href: pageHref(v.last_path), text: v.last_title })),
      el('td', { class: 'when', text: dateFmt.format(new Date(v.first * 1000)) }));
    const toggle = () => openVisitor(row, v.ip);
    row.addEventListener('click', (e) => e.target.closest('a') || toggle());
    row.addEventListener('keydown', (e) => (e.key === 'Enter' || e.key === ' ') && e.target === row && (e.preventDefault(), toggle()));
    return row;
  });
  node.replaceChildren(table([['IP и аккаунт'], ['Где'], ['Был'], ['Просм.', 1], ['Стр.', 1], ['Устройство'], ['Последняя страница'], ['Впервые']], rows),
    more(list.length - shown, () => { shown = list.length; visitors(); }));
}

async function openVisitor(row, ip) {
  if (row.getAttribute('aria-expanded') === 'true') {
    row.setAttribute('aria-expanded', 'false');
    row.nextElementSibling?.classList.contains('detail') && row.nextElementSibling.remove();
    return;
  }
  row.setAttribute('aria-expanded', 'true');
  const cell = el('td', { colspan: 8 }, el('p', { class: 'hint', text: 'Загружаю…' }));
  row.after(el('tr', { class: 'detail' }, cell));
  const r = await api('GET', `/api/admin/ip?ip=${encodeURIComponent(ip)}`);
  if (!r.ok) return cell.replaceChildren(el('p', { class: 'form-error', text: r.data.error ?? 'Не получилось загрузить' }));
  const d = r.data;
  const p = d.place;
  cell.replaceChildren(
    el('div', { class: 'detail-head' },
      el('span', {}, 'Всего заходов с этого адреса: ', el('b', { text: num.format(d.total) })),
      p && el('span', {}, 'Где: ', el('b', { text: [p.city, p.district, p.region, p.country].filter(Boolean).join(', ') })),
      // Провайдера знает только внешний сервис — адрес уходит туда, только когда сам нажмёшь на ссылку
      el('a', { href: `https://ipinfo.io/${encodeURIComponent(d.ip)}`, target: '_blank', rel: 'noopener noreferrer', text: 'Провайдер — на ipinfo.io ↗' })),
    el('ul', {}, d.agents.map((a) => el('li', { title: a.ua },
      `${a.device} · ${a.browser} · ${a.os} — ${num.format(a.views)} ${plural(a.views, ['заход', 'захода', 'заходов'])}`))),
    table([['Когда'], ['Страница'], ['Откуда'], ['Аккаунт']], d.hits.map((h) => el('tr', {},
      el('td', { class: 'when', text: when(h.ts) }),
      el('td', {}, el('a', { href: pageHref(h.path), text: h.title }), h.locked && tag('вход'), h.bot && tag('бот', true)),
      el('td', { text: h.ref ?? '' }),
      el('td', { class: 'who-list', text: h.user ?? '' })))));
}

function accounts() {
  $('accounts').replaceChildren(table([['Имя'], ['Последний заход'], ['Просм. за период', 1], ['Комм.', 1], ['Регистрация']],
    data.accounts.map((a) => el('tr', {},
      el('td', {}, a.name, ROLES[a.role] && tag(ROLES[a.role], true), a.banned && tag('заблокирован')),
      el('td', { class: 'when', text: a.last ? ago(a.last) : '—' }),
      el('td', { class: 'n', text: num.format(a.views) }),
      el('td', { class: 'n', text: num.format(a.comments) }),
      el('td', { class: 'when', text: longFmt.format(new Date(a.created * 1000)) })))));
}

function recent() {
  const list = data.recent;
  if (!list.length) return $('recent').replaceChildren(el('p', { class: 'hint', text: 'За этот период заходов нет' }));
  $('recent').replaceChildren(table([['Когда'], ['IP'], ['Где'], ['Страница'], ['Аккаунт'], ['Откуда']], list.slice(0, shownRecent).map((h) => el('tr', {},
    el('td', { class: 'when', text: when(h.ts) }),
    el('td', { class: 'ip', text: h.ip }),
    placeCell(h.place),
    el('td', {}, el('a', { href: pageHref(h.path), text: h.title }), h.locked && tag('вход')),
    el('td', { class: 'who-list', text: h.user ?? '' }),
    el('td', { text: h.ref ?? '' })))),
    more(list.length - shownRecent, () => { shownRecent = list.length; recent(); }));
}

// ---------- Управление ----------

$('range').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  state.days = +b.dataset.days;
  syncFilters();
  load();
});
$('mine').addEventListener('change', (e) => {
  state.hideMine = e.target.checked;
  syncFilters();
  load();
});
$('refresh').addEventListener('click', load);
$('as-table').addEventListener('click', (e) => {
  const on = e.currentTarget.getAttribute('aria-pressed') !== 'true';
  e.currentTarget.setAttribute('aria-pressed', String(on));
  e.currentTarget.textContent = on ? 'Графиком' : 'Таблицей';
  $('chart').hidden = on;
  $('chart-table').hidden = !on;
  if (!on && data) chart();   // скрытый график рисовался без ширины
});
let resizing;
addEventListener('resize', () => {
  cancelAnimationFrame(resizing);
  resizing = requestAnimationFrame(() => data && chart());
});
addEventListener('scroll', hideTip, { passive: true });

const user = await me();
if (user === undefined) gate('Статистика работает только вместе с API: на сервере или локально через serve --dev.');
else if (!user) gate('Войдите под аккаунтом владельца сайта.', true);
else if (!user.admin) gate('Эта страница открыта только владельцу сайта.');
else {
  board.hidden = false;
  syncFilters();
  load();
  // Раз в минуту цифры обновляются сами — если вкладка на виду и не раскрыт ни один адрес
  setInterval(() => {
    if (document.visibilityState === 'visible' && !document.querySelector('.detail')) load();
  }, 60000);
}
