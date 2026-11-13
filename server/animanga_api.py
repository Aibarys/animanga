"""Аниманга: вход, регистрация, комментарии и статистика посещений. Только стандартная библиотека Python,
база — SQLite.

Сервер слушает 127.0.0.1 и стоит за nginx (адрес /api/). Он же решает, кого пускать в /private/:
перед каждым запросом туда nginx спрашивает /api/auth (auth_request) и пускает владельца сайта и читателей.

Роли: member — регистрируется сам, комментирует открытые страницы и удаляет свои комментарии;
reader — ещё и читает и комментирует личный раздел, но ничего не удаляет; owner — владелец: всё это,
плашка «автор сайта» и удаление любых комментариев.

Статистика: каждая открытая страница сайта отправляет /api/seen (auth.js), сервер записывает страницу, IP,
браузер, сайт, с которого пришли, и аккаунт, если вошли. Смотреть её (/admin/, запросы /api/admin/…) может
только владелец с именем из ANIMANGA_ADMIN. Записи старше HIT_DAYS дней удаляются. Страну и город по IP
сервер ищет сам, в бесплатной базе DB-IP «IP to City Lite» (CC BY 4.0) рядом с базой сайта: адреса никуда
не отправляются. Без базы статистика просто показывает адреса без мест.

  python3 -I server/animanga_api.py serve                — API (настройки — переменные окружения ниже)
  python3 -I server/animanga_api.py serve --dev .        — локально: API и сайт из папки на одном порту,
                                                           /private/ закрыт так же, как на сервере
  python3 -I server/animanga_api.py user add ИМЯ [--owner | --reader] — завести аккаунт; пароль спросит сам
  python3 -I server/animanga_api.py user role ИМЯ --owner | --reader | --member — сменить роль
  python3 -I server/animanga_api.py user passwd ИМЯ | ban ИМЯ | unban ИМЯ | list
  python3 -I server/animanga_api.py geoip [--force]     — скачать базу стран и городов, если вышла новая
                                                           (DB-IP выпускает её раз в месяц)

ANIMANGA_DB — файл базы (animanga.db), ANIMANGA_WEBROOT — папка сайта: обсуждение можно открыть только
у существующей страницы, ANIMANGA_ORIGIN — адреса сайта через запятую: запросы, которые что-то меняют,
принимаются только с них, ANIMANGA_PORT — порт (8087), ANIMANGA_ADMIN — владелец, которому видна
статистика (aiba), ANIMANGA_GEOIP — файл базы стран и городов (dbip-city-lite.mmdb рядом с ANIMANGA_DB).

Защита: пароли — scrypt с солью, в cookie — случайный токен (HttpOnly, Secure, SameSite=Lax), в базе
только его хеш. Подбор пароля, регистрации и комментарии ограничены по частоте; IP-адреса пишутся
только в статистику посещений, к аккаунтам и комментариям не привязываются. Комментарии — простой
текст, HTML из них на страницу не попадает (comments.js).
"""
import argparse
import functools
import getpass
import gzip
import hashlib
import hmac
import html
import http.server
import ipaddress
import json
import mmap
import os
import re
import secrets
import shutil
import sqlite3
import struct
import sys
import threading
import time
import traceback
import unicodedata
import urllib.error
import urllib.request
from collections import Counter, defaultdict, deque
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

DB = os.environ.get('ANIMANGA_DB', 'animanga.db')
GEOIP = os.environ.get('ANIMANGA_GEOIP') or str(Path(DB).resolve().parent / 'dbip-city-lite.mmdb')
GEOIP_URL = 'https://download.db-ip.com/free/dbip-city-lite-{month}.mmdb.gz'
WEBROOT = Path(os.environ.get('ANIMANGA_WEBROOT', '.')).resolve()
ORIGINS = {o.strip().rstrip('/') for o in os.environ.get('ANIMANGA_ORIGIN', '').split(',') if o.strip()}
PORT = int(os.environ.get('ANIMANGA_PORT', '8087'))
ADMIN = os.environ.get('ANIMANGA_ADMIN', 'aiba').casefold()

COOKIE = 'am_session'
SESSION_TTL = 30 * 86400
MAX_REQUEST = 16 * 1024
MAX_COMMENT = 2000
MAX_LINKS = 2
HIT_DAYS = 180                   # сколько дней хранится статистика посещений

NAME_RE = re.compile(r'[^\W_][\w .-]{1,22}[^\W_]')     # 3–24 символа, по краям буква или цифра
RESERVED = {'admin', 'administrator', 'moderator', 'root', 'animanga', 'админ', 'администратор', 'модератор', 'аниманга'}
THREAD_RE = re.compile(r'(?:private/)?[a-z0-9][a-z0-9-]*(?:/[a-z0-9][a-z0-9-]*)?')
LINK_RE = re.compile(r'https?://|www\.', re.I)
BIDI = dict.fromkeys(map(ord, '‪‫‬‭‮⁦⁧⁨⁩'))   # переворот текста
HOST_RE = re.compile(r'[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+')
BOT_RE = re.compile(r'bot\b|bot/|spider|crawl|slurp|headless|lighthouse|python|curl|wget|preview', re.I)
TITLE_RE = re.compile(r'<title>(.*?)</title>', re.S)

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  key TEXT NOT NULL UNIQUE,              -- имя в нижнем регистре: «Иван» и «иван» — один человек
  hash BLOB NOT NULL,
  salt BLOB NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',   -- 'member', 'reader' (+ личный раздел) или 'owner' (см. выше)
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
CREATE TABLE IF NOT EXISTS hits (
  id INTEGER PRIMARY KEY,
  ts INTEGER NOT NULL,
  ip TEXT NOT NULL,
  path TEXT NOT NULL,                    -- страница без слешей по краям: '' — главная, 'private/slf-51'
  ref TEXT,                              -- домен чужого сайта, с которого пришли
  ua TEXT NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  locked INTEGER NOT NULL DEFAULT 0,     -- закрытая страница без доступа: человек видел форму входа
  bot INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS hits_by_time ON hits (ts);
CREATE INDEX IF NOT EXISTS hits_by_ip ON hits (ip, ts);
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


def sees_private(user):
    return bool(user) and user['role'] in ('owner', 'reader')


def can_delete(user, author_id):
    # владелец — любой комментарий, участник — свой, читатель личного раздела — никакой
    return bool(user) and (user['role'] == 'owner' or (user['role'] == 'member' and author_id == user['id']))


def is_admin(user):
    # статистику с IP-адресами видит один человек: владелец с именем ANIMANGA_ADMIN
    return is_owner(user) and user['key'] == ADMIN


@functools.lru_cache(maxsize=4096)
def ua_info(ua):
    """Устройство, браузер и система по строке User-Agent — грубо, но для статистики хватает."""
    device = ('Планшет' if 'iPad' in ua or ('Android' in ua and 'Mobile' not in ua)
              else 'Телефон' if re.search(r'Mobi|iPhone|Android', ua) else 'Компьютер')
    browser = next((name for key, name in (
        ('YaBrowser', 'Яндекс Браузер'), ('Edg', 'Edge'), ('OPR/', 'Opera'), ('Opera', 'Opera'),
        ('SamsungBrowser', 'Samsung Internet'), ('Firefox', 'Firefox'), ('FxiOS', 'Firefox'),
        ('CriOS', 'Chrome'), ('Chrome', 'Chrome'), ('Safari', 'Safari')) if key in ua), 'Другой')
    system = next((name for key, name in (
        ('iPhone', 'iOS'), ('iPad', 'iOS'), ('Android', 'Android'), ('Windows', 'Windows'),
        ('Macintosh', 'macOS'), ('CrOS', 'ChromeOS'), ('Linux', 'Linux')) if key in ua), 'Другая')
    return device, browser, system


@functools.lru_cache(maxsize=1024)
def _title(file, mtime):
    try:
        with open(file, encoding='utf-8') as f:
            m = TITLE_RE.search(f.read(8192))
    except OSError:
        return None
    return html.unescape(m[1]).strip().removesuffix(' — Аниманга') if m else None


def page_title(path):
    # Название берётся из самой страницы на диске, а не из запроса: подделать его нельзя
    if not path:
        return 'Главная'
    f = WEBROOT / path / 'index.html'
    try:
        mtime = f.stat().st_mtime
    except OSError:
        mtime = 0
    return _title(str(f), mtime) or path


class MaxMindDB:
    """Чтение базы в формате MaxMind DB (.mmdb) — ровно столько, сколько нужно для поиска по IP.
    Формат: двоичное дерево по битам адреса, в листьях — ссылки на записи в разделе данных."""

    MARKER = b'\xab\xcd\xefMaxMind.com'

    def __init__(self, path):
        with open(path, 'rb') as f:
            self.buf = mmap.mmap(f.fileno(), 0, access=mmap.ACCESS_READ)
        meta = self.buf.rfind(self.MARKER, max(0, len(self.buf) - 128 * 1024))
        if meta < 0:
            raise ValueError('это не база MaxMind DB')
        self.meta = self.decode(meta + len(self.MARKER), meta + len(self.MARKER))[0]
        self.nodes, self.record = self.meta['node_count'], self.meta['record_size']
        if self.record not in (24, 28, 32):
            raise ValueError(f'неизвестный размер записи: {self.record}')
        self.tree = self.record * 2 // 8 * self.nodes
        self.ipv4 = 0   # в базе с IPv6 адреса IPv4 лежат под 96 нулевыми битами
        if self.meta['ip_version'] == 6:
            for _ in range(96):
                if self.ipv4 >= self.nodes:
                    break
                self.ipv4 = self.child(self.ipv4, 0)

    def child(self, node, bit):
        b = self.buf
        if self.record == 24:
            o = node * 6 + bit * 3
            return int.from_bytes(b[o:o + 3], 'big')
        if self.record == 28:
            o = node * 7
            if bit:
                return (b[o + 3] & 0x0F) << 24 | int.from_bytes(b[o + 4:o + 7], 'big')
            return (b[o + 3] & 0xF0) << 20 | int.from_bytes(b[o:o + 3], 'big')
        o = node * 8 + bit * 4
        return int.from_bytes(b[o:o + 4], 'big')

    def lookup(self, ip):
        addr = ipaddress.ip_address(ip)
        if addr.version == 6 and self.meta['ip_version'] == 4:
            return None
        packed = addr.packed
        node = self.ipv4 if addr.version == 4 else 0
        for i in range(len(packed) * 8):
            if node >= self.nodes:
                break
            node = self.child(node, packed[i >> 3] >> (7 - (i & 7)) & 1)
        if node <= self.nodes:   # равно — адреса в базе нет
            return None
        return self.decode(self.tree + node - self.nodes, self.tree + 16)[0]

    def decode(self, off, base):
        b = self.buf
        ctrl = b[off]
        off += 1
        kind = ctrl >> 5
        if kind == 1:   # ссылка на значение в другом месте раздела данных
            size, v = ctrl >> 3 & 3, ctrl & 7
            if size == 3:
                to = int.from_bytes(b[off:off + 4], 'big')
            else:
                to = (v << 8 * (size + 1) | int.from_bytes(b[off:off + size + 1], 'big')) + (0, 2048, 526336)[size]
            return self.decode(base + to, base)[0], off + size + 1
        if kind == 0:   # расширенный тип — номер в следующем байте
            kind = 7 + b[off]
            off += 1
        size = ctrl & 0x1F
        if size >= 29:
            extra = size - 28
            size = (29, 285, 65821)[extra - 1] + int.from_bytes(b[off:off + extra], 'big')
            off += extra
        end = off + size
        if kind == 2:
            return b[off:end].decode('utf-8'), end
        if kind == 3:
            return struct.unpack('>d', b[off:end])[0], end
        if kind == 4:
            return bytes(b[off:end]), end
        if kind in (5, 6, 9, 10):
            return int.from_bytes(b[off:end], 'big'), end
        if kind == 8:
            return int.from_bytes(b[off:end], 'big', signed=size == 4), end
        if kind == 15:
            return struct.unpack('>f', b[off:end])[0], end
        if kind == 14:
            return bool(size), off
        if kind == 7:
            out = {}
            for _ in range(size):
                key, off = self.decode(off, base)
                out[key], off = self.decode(off, base)
            return out, off
        if kind == 11:
            out = []
            for _ in range(size):
                item, off = self.decode(off, base)
                out.append(item)
            return out, off
        raise ValueError(f'неизвестный тип данных: {kind}')


_geo = {'mtime': None, 'db': None}
_geo_lock = threading.Lock()


def place(ip):
    """Страна и город по IP: {'cc': 'KZ', 'country': ..., 'region': ..., 'city': ...} или None."""
    try:
        mtime = os.stat(GEOIP).st_mtime
    except OSError:
        return None
    with _geo_lock:   # базу обновили — открыть новую
        if _geo['mtime'] != mtime:
            try:
                _geo['db'] = MaxMindDB(GEOIP)
            except (OSError, ValueError, KeyError):
                _geo['db'] = None
            _geo['mtime'] = mtime
    return _place(ip, mtime) if _geo['db'] else None


@functools.lru_cache(maxsize=8192)
def _place(ip, mtime):
    try:
        rec = _geo['db'].lookup(ip)
    except (ValueError, IndexError, KeyError):
        return None
    if not isinstance(rec, dict) or not rec.get('country'):
        return None
    name = lambda part: (part or {}).get('names', {}).get('ru') or (part or {}).get('names', {}).get('en')
    # Город в базе бывает с районом — «Almaty (Bostandyk District)»: район отдельно, чтобы город не дробился
    city, _, district = (name(rec.get('city')) or '').partition(' (')
    return {'cc': rec['country'].get('iso_code'), 'country': name(rec['country']),
            'region': name((rec.get('subdivisions') or [None])[0]), 'city': city or None,
            'district': district.removesuffix(')') or None}


def update_geoip(force):
    """Скачивает свежую бесплатную базу DB-IP «IP to City Lite», если на диске не она. Новая выходит
    в начале месяца; пока её нет, остаётся прошлая."""
    marker = Path(GEOIP + '.month')
    have = marker.read_text().strip() if marker.is_file() and Path(GEOIP).is_file() and not force else None
    t = time.gmtime()
    months = [f'{t.tm_year}-{t.tm_mon:02}', f'{t.tm_year - (t.tm_mon == 1)}-{(t.tm_mon - 2) % 12 + 1:02}']
    for month in months:
        if have == month:
            print(f'база стран и городов свежая: {month}')
            return
        url = GEOIP_URL.format(month=month)
        tmp = Path(GEOIP + '.part')
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'animanga-geoip/1'})
            with urllib.request.urlopen(req, timeout=60) as res, gzip.open(res) as src, open(tmp, 'wb') as dst:
                shutil.copyfileobj(src, dst, 1 << 20)
        except urllib.error.HTTPError as e:
            tmp.unlink(missing_ok=True)
            if e.code == 404:
                continue
            sys.exit(f'не скачалась база стран и городов: {url} — {e}')
        except (OSError, EOFError) as e:
            tmp.unlink(missing_ok=True)
            sys.exit(f'не скачалась база стран и городов: {url} — {e}')
        try:
            MaxMindDB(tmp).lookup('8.8.8.8')
        except (ValueError, KeyError, IndexError) as e:
            tmp.unlink(missing_ok=True)
            sys.exit(f'скачанный файл — не база стран и городов: {e}')
        os.replace(tmp, GEOIP)
        marker.write_text(month + '\n')
        print(f'база стран и городов обновлена: {month} → {GEOIP}')
        return
    sys.exit('свежая база стран и городов не нашлась — оставляю прежнюю')


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
HIT = Limit(300, 3600)           # записей о просмотрах с одного IP в час — дальше не считаем


class ApiError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status, self.message = status, message


def public_user(user):
    return {'name': user['name'], 'role': user['role'], 'admin': is_admin(user)} if user else None


def comment_json(row, user):
    return {
        'id': row['id'], 'name': row['name'], 'owner': row['role'] == 'owner', 'body': row['body'],
        'created': row['created'], 'mine': bool(user) and row['user_id'] == user['id'],
        'deletable': can_delete(user, row['user_id']),
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
        # Локально — как nginx на сервере: в /private/ владелец и читатели, остальным страница входа с кодом 401
        if path.startswith('/private/'):
            con = db()
            try:
                self.con = con
                allowed = sees_private(self.current_user())
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
        if path == '/api/auth':   # для nginx auth_request: 204 — владелец или читатель, 401 — все остальные
            return (204 if sees_private(user) else 401), None, ()
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
        if (method, path) == ('POST', '/api/seen'):
            return self.add_hit(self.read_json(), user)
        if (method, path) == ('GET', '/api/admin/summary'):
            return self.stats(query, user)
        if (method, path) == ('GET', '/api/admin/ip'):
            return self.ip_hits(query.get('ip', [''])[0], user)
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
        # Обсуждение есть только у существующей страницы сайта; личные видят только владелец и читатели
        if (not isinstance(thread, str) or len(thread) > 80 or not THREAD_RE.fullmatch(thread)
                or not (WEBROOT / thread / 'index.html').is_file()
                or (thread.startswith('private/') and not sees_private(user))):
            raise ApiError(404, 'Нет такого обсуждения')

    def list_comments(self, thread, user):
        self.check_thread(thread, user)
        rows = self.con.execute(
            'SELECT c.id, c.body, c.created, c.user_id, u.name, u.role FROM comments c JOIN users u ON u.id = c.user_id '
            'WHERE c.thread = ? AND c.deleted = 0 AND u.banned = 0 ORDER BY c.created DESC, c.id DESC LIMIT 300',
            (thread,)).fetchall()
        return 200, {'comments': [comment_json(r, user) for r in rows]}, ()

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
        if not row or (row['thread'].startswith('private/') and not sees_private(user)):
            raise ApiError(404, 'Нет такого комментария')
        if not can_delete(user, row['user_id']):
            raise ApiError(403, 'Удалять можно только свои комментарии' if user['role'] == 'member'
                           else 'Удалять комментарии этому аккаунту нельзя')
        self.con.execute('UPDATE comments SET deleted = 1 WHERE id = ?', (comment_id,))
        return 200, {'ok': True}, ()

    # ---------- Статистика посещений ----------

    def add_hit(self, data, user):
        # Счётчик не отвечает ошибками: чужие адреса, мусор и лишние запросы просто не записываются
        path, host = data.get('path'), data.get('ref')
        path = path.strip('/') if isinstance(path, str) else '-'
        ip = self.client_ip()
        if (len(path) > 80 or not (path == '' or THREAD_RE.fullmatch(path))
                or not (WEBROOT / path / 'index.html').is_file() or HIT.full(ip)):
            return 204, None, ()
        HIT.add(ip)
        own = (self.headers.get('Host') or '').split(':')[0].lower()
        host = host.lower() if isinstance(host, str) and len(host) <= 100 else ''
        host = host if HOST_RE.fullmatch(host) and host != own else None
        ua = (self.headers.get('User-Agent') or '')[:300]
        locked = (path.startswith('private/') and not sees_private(user)) or (path == 'admin' and not is_admin(user))
        self.con.execute('INSERT INTO hits (ts, ip, path, ref, ua, user_id, locked, bot) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                         (now(), ip, path, host, ua, user['id'] if user else None, int(locked),
                          int(not ua or bool(BOT_RE.search(ua)))))
        if secrets.randbelow(500) == 0:
            self.con.execute('DELETE FROM hits WHERE ts < ?', (now() - HIT_DAYS * 86400,))
        return 204, None, ()

    def need_admin(self, user):
        if not user:
            raise ApiError(401, 'Войдите, чтобы смотреть статистику')
        if not is_admin(user):
            raise ApiError(403, 'Статистика открыта только владельцу сайта')

    def stats(self, query, user):
        self.need_admin(user)

        def number(key, default, low, high):
            try:
                return min(max(int(query.get(key, [default])[0]), low), high)
            except ValueError:
                return default

        days = number('days', 30, 1, HIT_DAYS)
        shift = -60 * number('tz', 0, -840, 840)   # tz — как getTimezoneOffset() в браузере: минуты до UTC
        t = now()
        since = (t + shift) // 86400 * 86400 - shift - (days - 1) * 86400   # местная полночь days дней назад
        mine = query.get('mine', ['1'])[0] != '0'   # mine=0 — без заходов самого владельца
        skip = '' if mine else ' AND (h.user_id IS NULL OR h.user_id != %d)' % user['id']
        self.con.execute('DELETE FROM hits WHERE ts < ?', (t - HIT_DAYS * 86400,))

        rows = self.con.execute(
            'SELECT h.ts, h.ip, h.path, h.ref, h.ua, h.user_id, h.locked, u.name FROM hits h '
            'LEFT JOIN users u ON u.id = h.user_id WHERE h.ts >= ? AND h.bot = 0' + skip + ' ORDER BY h.ts, h.id',
            (since,)).fetchall()
        first_seen = dict(self.con.execute(
            'SELECT ip, MIN(ts) FROM hits WHERE bot = 0 GROUP BY ip HAVING MAX(ts) >= ?', (since,)).fetchall())

        daily = [{'day': time.strftime('%Y-%m-%d', time.gmtime(since + i * 86400 + shift)), 'ips': set(), 'views': 0}
                 for i in range(days)]
        hourly = [{'hour': h, 'ips': set(), 'views': 0} for h in range(24)]   # для «сегодня»: один день — по часам
        pages = defaultdict(lambda: {'views': 0, 'ips': set(), 'locked': 0})
        refs = defaultdict(lambda: {'views': 0, 'ips': set()})
        people = {}
        account_views = Counter()
        for r in rows:
            for day in (daily[min((r['ts'] - since) // 86400, days - 1)], hourly[(r['ts'] + shift) // 3600 % 24]):
                day['ips'].add(r['ip'])
                day['views'] += 1
            p = pages[r['path']]
            p['views'] += 1
            p['ips'].add(r['ip'])
            p['locked'] += r['locked']
            if r['ref']:
                refs[r['ref']]['views'] += 1
                refs[r['ref']]['ips'].add(r['ip'])
            v = people.setdefault(r['ip'], {'ip': r['ip'], 'views': 0, 'paths': set(), 'users': set(), 'locked': 0,
                                            'first': first_seen.get(r['ip'], r['ts'])})
            v['views'] += 1
            v['paths'].add(r['path'])
            v['locked'] += r['locked']
            v['last'], v['last_path'], v['ua'] = r['ts'], r['path'], r['ua']
            if r['name']:
                v['users'].add(r['name'])
                account_views[r['user_id']] += 1

        def top(counter, limit=None):
            return [{'name': k, 'visitors': n} for k, n in counter.most_common(limit)]

        devices, browsers, systems, countries, cities = Counter(), Counter(), Counter(), Counter(), Counter()
        for v in people.values():
            device, browser, system = ua_info(v.pop('ua'))
            v.update(device=device, browser=browser, os=system, pages=len(v.pop('paths')), users=sorted(v['users']),
                     last_title=page_title(v['last_path']), place=place(v['ip']))
            devices[device] += 1
            browsers[browser] += 1
            systems[system] += 1
            if v['place']:
                countries[v['place']['cc'], v['place']['country']] += 1
                if v['place']['city']:
                    cities[v['place']['city'], v['place']['cc']] += 1
        visitors = sorted(people.values(), key=lambda v: -v['last'])

        accounts = []
        for a in self.con.execute(
                'SELECT u.id, u.name, u.role, u.created, u.banned, '
                '(SELECT COUNT(*) FROM comments c WHERE c.user_id = u.id AND c.deleted = 0) AS comments, '
                '(SELECT MAX(ts) FROM hits h WHERE h.user_id = u.id) AS last FROM users u'):
            accounts.append({'name': a['name'], 'role': a['role'], 'created': a['created'], 'banned': bool(a['banned']),
                             'comments': a['comments'], 'last': a['last'], 'views': account_views[a['id']]})
        accounts.sort(key=lambda a: (-(a['last'] or 0), -a['created']))

        one = lambda sql, *args: self.con.execute(sql, args).fetchone()[0]
        return 200, {
            'days': days, 'since': since, 'until': t,
            'start': one('SELECT MIN(ts) FROM hits WHERE bot = 0'),
            'online': len({r['ip'] for r in rows if r['ts'] >= t - 300}),
            'totals': {
                'visitors': len(people), 'views': len(rows),
                'new': sum(1 for v in people.values() if v['first'] >= since),
                'signed': len({r['user_id'] for r in rows if r['user_id']}),
                'locked': sum(1 for v in people.values() if v['locked']),
                'bots': one('SELECT COUNT(*) FROM hits WHERE ts >= ? AND bot = 1', since),
            },
            'site': {
                'accounts': len(accounts),
                'roles': dict(Counter(a['role'] for a in accounts)),
                'new_accounts': sum(1 for a in accounts if a['created'] >= since),
                'comments': one('SELECT COUNT(*) FROM comments WHERE deleted = 0'),
                'new_comments': one('SELECT COUNT(*) FROM comments WHERE deleted = 0 AND created >= ?', since),
                'views': one('SELECT COUNT(*) FROM hits WHERE bot = 0'),
                'visitors': one('SELECT COUNT(DISTINCT ip) FROM hits WHERE bot = 0'),
            },
            'daily': [{'day': d['day'], 'visitors': len(d['ips']), 'views': d['views']} for d in daily],
            'hourly': [{'hour': h['hour'], 'visitors': len(h['ips']), 'views': h['views']} for h in hourly] if days == 1 else None,
            'pages': [{'path': k, 'title': page_title(k), 'views': p['views'], 'visitors': len(p['ips']), 'locked': p['locked']}
                      for k, p in sorted(pages.items(), key=lambda kv: (-len(kv[1]['ips']), -kv[1]['views']))[:40]],
            'refs': [{'host': k, 'views': r['views'], 'visitors': len(r['ips'])}
                     for k, r in sorted(refs.items(), key=lambda kv: -len(kv[1]['ips']))[:20]],
            'devices': top(devices), 'browsers': top(browsers), 'systems': top(systems),
            'geo': place('8.8.8.8') is not None,   # база стран и городов на месте и читается
            'countries': [{'cc': cc, 'name': name, 'visitors': n} for (cc, name), n in countries.most_common(20)],
            'cities': [{'name': city, 'cc': cc, 'visitors': n} for (city, cc), n in cities.most_common(20)],
            'visitors': visitors[:300],
            'accounts': accounts[:200],
            'recent': [{'ts': r['ts'], 'ip': r['ip'], 'path': r['path'], 'title': page_title(r['path']), 'place': place(r['ip']),
                        'user': r['name'], 'ref': r['ref'], 'locked': bool(r['locked'])} for r in rows[:-81:-1]],
        }, ()

    def ip_hits(self, ip, user):
        self.need_admin(user)
        rows = self.con.execute(
            'SELECT h.ts, h.path, h.ref, h.ua, h.locked, h.bot, u.name FROM hits h LEFT JOIN users u ON u.id = h.user_id '
            'WHERE h.ip = ? ORDER BY h.ts DESC, h.id DESC LIMIT 300', (ip[:64],)).fetchall()
        agents = Counter(r['ua'] for r in rows)
        return 200, {
            'ip': ip[:64],
            'place': place(ip[:64]),
            'total': self.con.execute('SELECT COUNT(*) FROM hits WHERE ip = ?', (ip[:64],)).fetchone()[0],
            'agents': [dict(zip(('device', 'browser', 'os'), ua_info(ua)), ua=ua, views=n) for ua, n in agents.most_common(10)],
            'hits': [{'ts': r['ts'], 'path': r['path'], 'title': page_title(r['path']), 'ref': r['ref'], 'user': r['name'],
                      'locked': bool(r['locked']), 'bot': bool(r['bot'])} for r in rows],
        }, ()

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
        title = {'owner': ' (владелец)', 'reader': ' (читатель личного раздела)'}.get(args.role, '')
        if args.action == 'add':
            if row:
                sys.exit('Это имя уже занято')
            salt, h = hash_password(ask_password())
            con.execute('INSERT INTO users (name, key, hash, salt, role, created) VALUES (?, ?, ?, ?, ?, ?)',
                        (name, name.casefold(), h, salt, args.role or 'member', now()))
            print(f'Готово: {name}{title}')
            return
        if not row:
            sys.exit('Нет такого аккаунта')
        if args.action == 'role':
            if not args.role:
                sys.exit('Какую роль: --owner, --reader или --member?')
            con.execute('UPDATE users SET role = ? WHERE id = ?', (args.role, row['id']))
            print(f'Готово: {name}{title or " (обычный участник)"}')
            return
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
    parser = argparse.ArgumentParser(description='Аниманга: вход, регистрация, комментарии и статистика')
    sub = parser.add_subparsers(dest='command', required=True)
    run = sub.add_parser('serve', help='запустить API')
    run.add_argument('--dev', metavar='ПАПКА', help='локально: ещё и раздавать сайт из этой папки')
    users = sub.add_parser('user', help='аккаунты')
    users.add_argument('action', choices=['add', 'role', 'passwd', 'ban', 'unban', 'list'])
    users.add_argument('name', nargs='?')
    roles = users.add_mutually_exclusive_group()
    roles.add_argument('--owner', dest='role', action='store_const', const='owner',
                       help='владелец: личный раздел, плашка «автор сайта», удаляет любые комментарии')
    roles.add_argument('--reader', dest='role', action='store_const', const='reader',
                       help='читатель: читает и комментирует личный раздел, ничего не удаляет')
    roles.add_argument('--member', dest='role', action='store_const', const='member',
                       help='обычный участник: только открытые страницы, удаляет свои комментарии')
    geo = sub.add_parser('geoip', help='скачать базу стран и городов DB-IP, если вышла новая')
    geo.add_argument('--force', action='store_true', help='скачать заново, даже если на диске уже эта')
    args = parser.parse_args()
    if args.command == 'serve':
        serve(args.dev)
    elif args.command == 'geoip':
        update_geoip(args.force)
    else:
        user_command(args)


if __name__ == '__main__':
    main()
