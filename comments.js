// Комментарии под главой и на странице манги: <div data-comments></div>, обсуждение — путь страницы
// ('blackjack', 'manga/blackjack', 'private/orv-2'). Читать может каждый, кому видна страница, писать —
// после входа; в личном разделе обсуждения видит только владелец сайта. Текст выводится только как
// текст (textContent), никакого HTML из комментариев на страницу не попадает.
import { api, loginHref, me } from './auth.js';

const MAX = 2000;
const when = new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function el(tag, className, parent, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  parent?.append(node);
  return node;
}

const threadOf = () => location.pathname.replace(/index\.html$/, '').replace(/^\/+|\/+$/g, '');

async function mount(root) {
  const thread = root.dataset.thread ?? threadOf();
  const user = await me();
  const box = root.closest('section') ?? root;
  if (user === undefined) { box.hidden = true; return; }   // API нет — нет и обсуждения

  const res = await api('GET', `/api/comments?thread=${encodeURIComponent(thread)}`);
  if (!res.ok) { box.hidden = true; return; }
  const { moderator } = res.data;
  root.replaceChildren();
  const wrap = el('div', 'cm', root);

  if (user) {
    const form = el('form', 'cm-form', wrap);
    const text = el('textarea', '', form);
    text.name = 'body';
    text.maxLength = MAX;
    text.rows = 4;
    text.required = true;
    text.placeholder = `${user.name}, что скажете?`;
    text.setAttribute('aria-label', 'Комментарий');
    text.dataset.lenisPrevent = '';   // своя прокрутка поля, а не плавная прокрутка страницы
    const row = el('div', 'cm-row', form);
    const count = el('span', 'cm-count', row, `0 / ${MAX}`);
    const send = el('button', 'cm-send', row, 'Отправить');
    send.type = 'submit';
    const error = el('p', 'cm-error', form);
    error.setAttribute('role', 'alert');
    text.addEventListener('input', () => { count.textContent = `${text.value.length} / ${MAX}`; });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      send.disabled = true;
      error.textContent = '';
      const r = await api('POST', '/api/comments', { thread, body: text.value });
      send.disabled = false;
      if (!r.ok) { error.textContent = r.data.error ?? 'Не получилось отправить, попробуйте ещё раз'; return; }
      text.value = '';
      count.textContent = `0 / ${MAX}`;
      list.prepend(item(r.data.comment));
      empty.hidden = true;
    });
  } else {
    const note = el('p', 'cm-note', wrap, 'Чтобы написать, ');
    const link = el('a', '', note, 'войдите или зарегистрируйтесь');
    link.href = loginHref();
    note.append('.');
  }

  const list = el('ol', 'cm-list', wrap);
  const empty = el('p', 'cm-note cm-empty', wrap, 'Пока никто не написал — будьте первым!');
  empty.hidden = res.data.comments.length > 0;

  function item(c) {
    const li = el('li', 'cm-item');
    const head = el('div', 'cm-head', li);
    el('span', 'cm-name', head, c.name);
    if (c.owner) el('span', 'cm-badge', head, 'автор сайта');
    const time = el('time', 'cm-time', head, when.format(new Date(c.created * 1000)));
    time.dateTime = new Date(c.created * 1000).toISOString();
    if (c.mine || moderator) {
      const del = el('button', 'cm-del', head, 'Удалить');
      del.type = 'button';
      del.addEventListener('click', async () => {
        if (!confirm('Удалить комментарий?')) return;
        const r = await api('DELETE', `/api/comments/${c.id}`);
        if (r.ok) { li.remove(); empty.hidden = list.children.length > 0; }
      });
    }
    el('p', 'cm-body', li, c.body);
    return li;
  }
  list.append(...res.data.comments.map(item));
}

document.querySelectorAll('[data-comments]').forEach(mount);
