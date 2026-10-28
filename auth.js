// Вход на сайт: кто сейчас вошёл, запросы к API и плашка «Войти / имя · Выйти» в шапке.
// API — server/animanga_api.py за nginx по адресу /api/. Локально под python3 -m http.server его нет:
// тогда me() отдаёт undefined, а плашка и комментарии просто не показываются.

let current;

// null — никто не вошёл, { name, role } — вошёл, undefined — API недоступен
export function me() {
  current ??= api('GET', '/api/me').then((r) => (r.ok ? r.data.user : undefined));
  return current;
}

export async function api(method, path, body) {
  try {
    const res = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = (res.headers.get('Content-Type') ?? '').includes('json') ? await res.json() : {};
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: {} };
  }
}

export const loginHref = (next = location.pathname) => `/login/?next=${encodeURIComponent(next)}`;

export async function logout() {
  await api('POST', '/api/logout');
  location.reload();
}

async function mountAccount(node) {
  const user = await me();
  if (user === undefined) return;
  node.replaceChildren();
  if (user) {
    const who = document.createElement('span');
    who.className = 'who';
    who.textContent = user.name;
    const out = document.createElement('button');
    out.type = 'button';
    out.textContent = 'Выйти';
    out.addEventListener('click', logout);
    node.append(who, out);
    // Владельцу — короткий путь в закрытый раздел (остальным его не видно и не открыть)
    if (user.role === 'owner' && !location.pathname.startsWith('/private/')) {
      const own = document.createElement('a');
      own.href = '/private/';
      own.textContent = 'Личное';
      node.prepend(own);
    }
  } else {
    const link = document.createElement('a');
    link.href = loginHref();
    link.textContent = 'Войти';
    node.append(link);
  }
}

document.querySelectorAll('[data-account]').forEach(mountAccount);
