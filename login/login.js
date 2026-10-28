// Вход и регистрация. Страница открывается двумя путями: как /login/?next=… и как ответ 401 на любой
// адрес в /private/ — тогда после входа она просто перезагружается, и nginx пускает дальше.
import { api, logout, me } from '../auth.js';

const $ = (id) => document.getElementById(id);
const onPrivate = location.pathname.startsWith('/private/');
const opened = performance.now();

// Куда вернуться после входа: только на свой сайт, не на чужой адрес из ссылки
function back() {
  if (onPrivate) return location.reload();
  const next = new URLSearchParams(location.search).get('next') ?? '/';
  location.assign(/^\/(?![/\\])/.test(next) ? next : '/');
}

function tab(which) {
  for (const name of ['login', 'register']) {
    $(`tab-${name}`).setAttribute('aria-selected', String(name === which));
    $(`${name}-form`).hidden = name !== which;
  }
}
$('tab-login').addEventListener('click', () => tab('login'));
$('tab-register').addEventListener('click', () => tab('register'));

function submit(form, build) {
  const error = form.querySelector('.form-error');
  const button = form.querySelector('button[type="submit"]');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const body = build(data);
    if (typeof body === 'string') { error.textContent = body; return; }
    button.disabled = true;
    error.textContent = '';
    const r = await api('POST', form.dataset.api, body);
    button.disabled = false;
    if (r.ok) back();
    else error.textContent = r.data.error ?? (r.status ? 'Не получилось, попробуйте ещё раз' : 'Сервер не отвечает');
  });
}

$('login-form').dataset.api = '/api/login';
submit($('login-form'), ({ name, password }) => ({ name, password }));

$('register-form').dataset.api = '/api/register';
submit($('register-form'), ({ name, password, repeat, website }) => {
  if (password !== repeat) return 'Пароли не совпадают';
  return { name, password, website, t: Math.round(performance.now() - opened) };
});

$('logout').addEventListener('click', logout);
$('private-note').hidden = !onPrivate;

const user = await me();
if (user) {
  $('forms').hidden = true;
  $('signed-in').hidden = false;
  $('who').textContent = user.name;
  $('member-note').hidden = !(onPrivate && user.role !== 'owner');
  $('private-note').hidden = true;
} else if (user === undefined) {
  $('login-form').querySelector('.form-error').textContent = 'Вход сейчас недоступен — сервер не отвечает.';
}
