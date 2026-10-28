"""Аниманга: вход, регистрация и комментарии. Только стандартная библиотека Python, база — SQLite.

Сервер слушает 127.0.0.1 и стоит за nginx (адрес /api/). Он же решает, кого пускать в /private/:
перед каждым запросом туда nginx спрашивает /api/auth (auth_request) и пускает только владельца сайта.

  python3 -I server/animanga_api.py serve                — API (настройки — переменные окружения ниже)
  python3 -I server/animanga_api.py serve --dev .        — локально: API и сайт из папки на одном порту,
                                                           /private/ закрыт так же, как на сервере
  python3 -I server/animanga_api.py user add ИМЯ --owner — завести аккаунт; пароль спросит сам
  python3 -I server/animanga_api.py user passwd ИМЯ | ban ИМЯ | unban ИМЯ | list

ANIMANGA_DB — файл базы (animanga.db), ANIMANGA_WEBROOT — папка сайта: обсуждение можно открыть только
у существующей страницы, ANIMANGA_ORIGIN — адреса сайта через запятую: запросы, которые что-то меняют,
принимаются только с них, ANIMANGA_PORT — порт (8087).

Защита: пароли — scrypt с солью, в cookie — случайный токен (HttpOnly, Secure, SameSite=Lax), в базе
только его хеш. Подбор пароля, регистрации и комментарии ограничены по частоте; IP-адреса в базу
не пишутся. Комментарии — простой текст, HTML из них на страницу не попадает (comments.js).
"""
import argparse
import getpass
import hashlib
import hmac
import http.server
import json
import os
import re
import secrets
import sqlite3
import sys
import threading
import time
import traceback
import unicodedata
from collections import defaultdict, deque
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

DB = os.environ.get('ANIMANGA_DB', 'animanga.db')
WEBROOT = Path(os.environ.get('ANIMANGA_WEBROOT', '.')).resolve()
ORIGINS = {o.strip().rstrip('/') for o in os.environ.get('ANIMANGA_ORIGIN', '').split(',') if o.strip()}
PORT = int(os.environ.get('ANIMANGA_PORT', '8087'))

COOKIE = 'am_session'
SESSION_TTL = 30 * 86400
MAX_REQUEST = 16 * 1024
MAX_COMMENT = 2000
MAX_LINKS = 2

NAME_RE = re.compile(r'[^\W_][\w .-]{1,22}[^\W_]')     # 3–24 символа, по краям буква или цифра
RESERVED = {'admin', 'administrator', 'moderator', 'root', 'animanga', 'админ', 'администратор', 'модератор', 'аниманга'}
THREAD_RE = re.compile(r'(?:private/)?[a-z0-9][a-z0-9-]*(?:/[a-z0-9][a-z0-9-]*)?')
LINK_RE = re.compile(r'https?://|www\.', re.I)
BIDI = dict.fromkeys(map(ord, '‪‫‬‭‮⁦⁧⁨⁩'))   # переворот текста

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  key TEXT NOT NULL UNIQUE,              -- имя в нижнем регистре: «Иван» и «иван» — один человек
  hash BLOB NOT NULL,
  salt BLOB NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',   -- 'owner' видит личный раздел и удаляет любые комментарии
  banned INTEGER NOT NULL DEFAULT 0,
  created INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,                -- sha256 токена из cookie: утечка базы не даёт войти
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY,
  thread TEXT NOT NULL,                  -- путь страницы: 'blackjack', 'manga/blackjack', 'private/orv-2'
  user_id INTEGER NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created INTEGER NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS comments_by_thread ON comments (thread, deleted, created);
"""


def now():
    return int(time.time())


def db():
    con = sqlite3.connect(DB, timeout=10)
    con.row_factory = sqlite3.Row
    con.execute('PRAGMA foreign_keys = ON')
    return con


def init_db():
    con = db()
    con.execute('PRAGMA journal_mode = WAL')
    con.executescript(SCHEMA)
    con.close()


def hash_password(password, salt=None):
    salt = salt or secrets.token_bytes(16)
    return salt, hashlib.scrypt(password.encode(), salt=salt, n=2 ** 14, r=8, p=1, dklen=32)


DUMMY_SALT = secrets.token_bytes(16)


def check_password(row, password):
    # Хеш считается и для несуществующего имени: по времени ответа не понять, есть ли такой аккаунт
    _, h = hash_password(password, row['salt'] if row else DUMMY_SALT)
    return row is not None and hmac.compare_digest(h, row['hash'])


def token_hash(token):
    return hashlib.sha256(token.encode()).hexdigest()


def clean_name(name):
    name = ' '.join(unicodedata.normalize('NFKC', str(name)).split())
    return name if NAME_RE.fullmatch(name) and name.casefold() not in RESERVED else None


def is_owner(user):
    return bool(user) and user['role'] == 'owner'


class Limit:
    """Не больше count событий за window секунд на ключ. Счёт в памяти: после перезапуска — с нуля."""

    def __init__(self, count, window):
        self.count, self.window = count, window
        self.hits = defaultdict(deque)
        self.lock = threading.Lock()

    def _fresh(self, key):
        q = self.hits[key]
        while q and q[0] <= time.monotonic() - self.window:
            q.popleft()
        return q

    def full(self, key):
        with self.lock:
            return len(self._fresh(key)) >= self.count

    def add(self, key):
        with self.lock:
            self._fresh(key).append(time.monotonic())
            if len(self.hits) > 20000:   # старые ключи не копятся бесконечно
                for k in [k for k, q in self.hits.items() if not q or q[-1] <= time.monotonic() - self.window]:
                    del self.hits[k]


REGISTER = Limit(5, 3600)        # регистраций с одного IP в час
LOGIN_IP = Limit(20, 900)        # неудачных входов с одного IP за 15 минут
LOGIN_NAME = Limit(8, 900)       # неудачных входов в одно имя за 15 минут
POST_FAST = Limit(1, 15)         # комментарий не чаще раза в 15 секунд
POST_HOUR = Limit(30, 3600)      # и не больше 30 в час


class ApiError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status, self.message = status, message


def public_user(user):
    return {'name': user['name'], 'role': user['role']} if user else None


def comment_json(row, user):
    return {
        'id': row['id'], 'name': row['name'], 'owner': row['role'] == 'owner', 'body': row['body'],
        'created': row['created'], 'mine': bool(user) and row['user_id'] == user['id'],
    }


class Handler(http.server.SimpleHTTPRequestHandler):
    server_version = 'animanga'
    sys_version = ''
    timeout = 20
    dev = False

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(WEBROOT), **kwargs)

    def do_GET(self):
        self.route()

    def do_HEAD(self):
        self.route()

    def do_POST(self):
        self.route()

    def do_DELETE(self):
        self.route()

    def route(self):
        path = urlsplit(self.path).path
        if path.startswith('/api/'):
            return self.answer_api(path)
        if not self.dev or self.command not in ('GET', 'HEAD'):
            return self.send_json(404, {'error': 'Нет такого адреса'})
        # Локально — как nginx на сервере: в /private/ только владелец, остальным страница входа с кодом 401
        if path.startswith('/private/'):
            con = db()
            try:
                self.con = con
                allowed = is_owner(self.current_user())
            finally:
                con.close()
            if not allowed:
                return self.send_page(WEBROOT / 'login' / 'index.html', 401)
        super().do_HEAD() if self.command == 'HEAD' else super().do_GET()

    def answer_api(self, path):
        self.con = db()
        try:
            status, payload, headers = self.api(path, parse_qs(urlsplit(self.path).query))
            self.con.commit()   # до ответа: следующий запрос клиента уже увидит новую сессию или комментарий
        except ApiError as e:
            self.con.rollback()
            status, payload, headers = e.status, {'error': e.message}, ()
        except Exception:
            self.con.rollback()
            traceback.print_exc()
            status, payload, headers = 500, {'error': 'Ошибка на сервере'}, ()
        finally:
            self.con.close()
        self.send_json(status, payload, headers)

    def api(self, path, query):
        user = self.current_user()
        method = self.command
        if path == '/api/auth':   # для nginx auth_request: 204 — владелец, 401 — все остальные
            return (204 if is_owner(user) else 401), None, ()
        if method in ('POST', 'DELETE'):
            self.check_origin()
        if (method, path) == ('GET', '/api/me'):
            return 200, {'user': public_user(user)}, ()
        if (method, path) == ('POST', '/api/register'):
            return self.register(self.read_json())
        if (method, path) == ('POST', '/api/login'):
            return self.login(self.read_json())
        if (method, path) == ('POST', '/api/logout'):
            return self.logout()
        if path == '/api/comments' and method == 'GET':
            return self.list_comments(query.get('thread', [''])[0], user)
        if path == '/api/comments' and method == 'POST':
            return self.add_comment(self.read_json(), user)
        m = re.fullmatch(r'/api/comments/(\d{1,12})', path)
        if m and method == 'DELETE':
            return self.delete_comment(int(m[1]), user)
        raise ApiError(404, 'Нет такого адреса')

    # ---------- Аккаунты ----------

    def register(self, data):
        t = data.get('t')
        if data.get('website') or not isinstance(t, (int, float)) or t < 2500:   # ловушка и «слишком быстро» — бот
            raise ApiError(400, 'Не получилось — подождите пару секунд и попробуйте ещё раз')
        name = clean_name(data.get('name', ''))
        if not name:
            raise ApiError(400, 'Имя — от 3 до 24 символов: буквы, цифры, пробел, точка, дефис, подчёркивание')
        password = data.get('password')
        if not isinstance(password, str) or not 8 <= len(password) <= 200:
            raise ApiError(400, 'Пароль — от 8 символов')
        ip = self.client_ip()
        if REGISTER.full(ip):
            raise ApiError(429, 'Слишком много регистраций с этого адреса — попробуйте через час')
        REGISTER.add(ip)
        salt, h = hash_password(password)
        try:
            cur = self.con.execute(
                'INSERT INTO users (name, key, hash, salt, role, created) VALUES (?, ?, ?, ?, ?, ?)',
                (name, name.casefold(), h, salt, 'member', now()))
        except sqlite3.IntegrityError:
            raise ApiError(409, 'Это имя уже занято') from None
        return self.start_session(cur.lastrowid, 201)

    def login(self, data):
        ip = self.client_ip()
        name = clean_name(data.get('name', '')) or ''
        password = data.get('password')
        password = password[:200] if isinstance(password, str) else ''
        if LOGIN_IP.full(ip) or LOGIN_NAME.full(name.casefold()):
            raise ApiError(429, 'Слишком много попыток — подождите 15 минут')
        row = self.con.execute('SELECT * FROM users WHERE key = ?', (name.casefold(),)).fetchone() if name else None
        if not check_password(row, password):
            LOGIN_IP.add(ip)
            LOGIN_NAME.add(name.casefold())
            raise ApiError(401, 'Неверное имя или пароль')
        if row['banned']:
            raise ApiError(403, 'Аккаунт заблокирован')
        return self.start_session(row['id'], 200)

    def start_session(self, user_id, status):
        token = secrets.token_urlsafe(32)
        self.con.execute('DELETE FROM sessions WHERE expires < ?', (now(),))
        self.con.execute('INSERT INTO sessions (token, user_id, expires) VALUES (?, ?, ?)',
                         (token_hash(token), user_id, now() + SESSION_TTL))
        user = self.con.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
        return status, {'user': public_user(user)}, [('Set-Cookie', self.session_cookie(token, SESSION_TTL))]

    def logout(self):
        token = self.cookie(COOKIE)
        if token:
            self.con.execute('DELETE FROM sessions WHERE token = ?', (token_hash(token),))
        return 200, {'user': None}, [('Set-Cookie', self.session_cookie('', 0))]

    def current_user(self):
        token = self.cookie(COOKIE)
        if not token or len(token) > 100:
            return None
        return self.con.execute(
            'SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.expires > ? AND u.banned = 0',
            (token_hash(token), now())).fetchone()

    def session_cookie(self, token, max_age):
        secure = '' if self.dev else '; Secure'
        return f'{COOKIE}={token}; Path=/; Max-Age={max_age}; HttpOnly; SameSite=Lax{secure}'

    # ---------- Комментарии ----------

    def check_thread(self, thread, user):
        # Обсуждение есть только у существующей страницы сайта; личные видит только владелец
        if (not isinstance(thread, str) or len(thread) > 80 or not THREAD_RE.fullmatch(thread)
                or not (WEBROOT / thread / 'index.html').is_file()
                or (thread.startswith('private/') and not is_owner(user))):
            raise ApiError(404, 'Нет такого обсуждения')

    def list_comments(self, thread, user):
        self.check_thread(thread, user)
        rows = self.con.execute(
            'SELECT c.id, c.body, c.created, c.user_id, u.name, u.role FROM comments c JOIN users u ON u.id = c.user_id '
            'WHERE c.thread = ? AND c.deleted = 0 AND u.banned = 0 ORDER BY c.created DESC, c.id DESC LIMIT 300',
            (thread,)).fetchall()
        return 200, {'comments': [comment_json(r, user) for r in rows], 'moderator': is_owner(user)}, ()

    def add_comment(self, data, user):
        if not user:
            raise ApiError(401, 'Войдите, чтобы написать')
        thread = data.get('thread')
        self.check_thread(thread, user)
        body = data.get('body')
        if not isinstance(body, str):
            raise ApiError(400, 'Пустой комментарий')
        body = unicodedata.normalize('NFC', body).translate(BIDI).replace('\r\n', '\n')
        body = ''.join(ch for ch in body if ch in '\n\t' or unicodedata.category(ch) != 'Cc')
        body = re.sub(r'\n{3,}', '\n\n', body).strip()
        if not 1 <= len(body) <= MAX_COMMENT:
            raise ApiError(400, f'Комментарий — от 1 до {MAX_COMMENT} символов')
        if len(LINK_RE.findall(body)) > MAX_LINKS:
            raise ApiError(400, f'Не больше {MAX_LINKS} ссылок в комментарии')
        key = str(user['id'])
        if POST_FAST.full(key) or POST_HOUR.full(key):
            raise ApiError(429, 'Слишком часто — подождите немного')
        POST_FAST.add(key)
        POST_HOUR.add(key)
        cur = self.con.execute('INSERT INTO comments (thread, user_id, body, created) VALUES (?, ?, ?, ?)',
                               (thread, user['id'], body, now()))
        row = self.con.execute(
            'SELECT c.id, c.body, c.created, c.user_id, u.name, u.role FROM comments c JOIN users u ON u.id = c.user_id WHERE c.id = ?',
            (cur.lastrowid,)).fetchone()
        return 201, {'comment': comment_json(row, user)}, ()

    def delete_comment(self, comment_id, user):
        if not user:
            raise ApiError(401, 'Войдите, чтобы удалить')
        row = self.con.execute('SELECT user_id, thread FROM comments WHERE id = ? AND deleted = 0', (comment_id,)).fetchone()
        if not row or (row['thread'].startswith('private/') and not is_owner(user)):
            raise ApiError(404, 'Нет такого комментария')
        if row['user_id'] != user['id'] and not is_owner(user):
            raise ApiError(403, 'Удалять можно только свои комментарии')
        self.con.execute('UPDATE comments SET deleted = 1 WHERE id = ?', (comment_id,))
        return 200, {'ok': True}, ()

    # ---------- Запрос и ответ ----------

    def check_origin(self):
        # Чужой сайт не может отправить запрос от имени вошедшего: браузер всегда указывает Origin
        allowed = ORIGINS or ({f'http://localhost:{PORT}', f'http://127.0.0.1:{PORT}'} if self.dev else set())
        if (self.headers.get('Origin') or '').rstrip('/') not in allowed:
            raise ApiError(403, 'Запрос не с этого сайта')

    def read_json(self):
        if not (self.headers.get('Content-Type') or '').startswith('application/json'):
            raise ApiError(415, 'Нужен JSON')
        try:
            length = int(self.headers.get('Content-Length') or 0)
        except ValueError:
            length = 0
        if not 0 < length <= MAX_REQUEST:
            raise ApiError(400, 'Пустой или слишком большой запрос')
        try:
            data = json.loads(self.rfile.read(length))
        except ValueError:
            raise ApiError(400, 'Запрос не в JSON') from None
        if not isinstance(data, dict):
            raise ApiError(400, 'Запрос не в JSON')
        return data

    def cookie(self, name):
        for part in (self.headers.get('Cookie') or '').split(';'):
            key, _, value = part.strip().partition('=')
            if key == name:
                return value
        return None

    def client_ip(self):
        ip = self.client_address[0]
        if ip in ('127.0.0.1', '::1') and not self.dev:   # за nginx настоящий адрес — в X-Real-IP
            ip = self.headers.get('X-Real-IP') or ip
        return ip

    def send_json(self, status, payload, headers=()):
        body = b'' if payload is None else json.dumps(payload, ensure_ascii=False).encode()
        self.send_response(status)
        if payload is not None:
            self.send_header('Content-Type', 'application/json; charset=utf-8')
        if status != 204:
            self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        for key, value in headers:
            self.send_header(key, value)
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(body)

    def send_page(self, path, status):
        body = path.read_bytes()
        self.send_response(status)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(body)


def serve(dev_root):
    global WEBROOT
    if dev_root:
        WEBROOT = Path(dev_root).resolve()
        Handler.dev = True
    init_db()
    httpd = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), Handler)
    print(f'animanga api: http://127.0.0.1:{PORT}' + (f' (сайт из {WEBROOT})' if dev_root else ''), flush=True)
    httpd.serve_forever()


def ask_password():
    while True:
        password = getpass.getpass('Пароль (от 8 символов): ')
        if len(password) < 8:
            print('Короче 8 символов')
        elif getpass.getpass('Ещё раз: ') != password:
            print('Не совпадает')
        else:
            return password


def user_command(args):
    init_db()
    con = db()
    with con:
        if args.action == 'list':
            for r in con.execute('SELECT u.*, (SELECT COUNT(*) FROM comments c WHERE c.user_id = u.id AND c.deleted = 0) AS n '
                                 'FROM users u ORDER BY u.id'):
                flags = ' '.join(f for f in (r['role'] if r['role'] != 'member' else '', 'заблокирован' if r['banned'] else '') if f)
                print(f"{r['id']:>4}  {r['name']:<24} {time.strftime('%Y-%m-%d', time.localtime(r['created']))}  "
                      f"комментариев: {r['n']}  {flags}".rstrip())
            return
        name = clean_name(args.name or '') or sys.exit('Имя — от 3 до 24 символов: буквы, цифры, пробел, точка, дефис, подчёркивание')
        row = con.execute('SELECT * FROM users WHERE key = ?', (name.casefold(),)).fetchone()
        if args.action == 'add':
            if row:
                sys.exit('Это имя уже занято')
            salt, h = hash_password(ask_password())
            con.execute('INSERT INTO users (name, key, hash, salt, role, created) VALUES (?, ?, ?, ?, ?, ?)',
                        (name, name.casefold(), h, salt, 'owner' if args.owner else 'member', now()))
            print(f"Готово: {name}{' (владелец)' if args.owner else ''}")
            return
        if not row:
            sys.exit('Нет такого аккаунта')
        if args.action == 'passwd':
            salt, h = hash_password(ask_password())
            con.execute('UPDATE users SET hash = ?, salt = ? WHERE id = ?', (h, salt, row['id']))
            con.execute('DELETE FROM sessions WHERE user_id = ?', (row['id'],))
        elif args.action in ('ban', 'unban'):
            con.execute('UPDATE users SET banned = ? WHERE id = ?', (int(args.action == 'ban'), row['id']))
            con.execute('DELETE FROM sessions WHERE user_id = ?', (row['id'],))
        print('Готово')
    con.close()


def main():
    parser = argparse.ArgumentParser(description='Аниманга: вход, регистрация и комментарии')
    sub = parser.add_subparsers(dest='command', required=True)
    run = sub.add_parser('serve', help='запустить API')
    run.add_argument('--dev', metavar='ПАПКА', help='локально: ещё и раздавать сайт из этой папки')
    users = sub.add_parser('user', help='аккаунты')
    users.add_argument('action', choices=['add', 'passwd', 'ban', 'unban', 'list'])
    users.add_argument('name', nargs='?')
    users.add_argument('--owner', action='store_true', help='владелец: видит личный раздел и удаляет любые комментарии')
    args = parser.parse_args()
    if args.command == 'serve':
        serve(args.dev)
    else:
        user_command(args)


if __name__ == '__main__':
    main()
