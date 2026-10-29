# Аниманга

Манга, которая оживает при прокрутке: камера перелетает по панелям страницы, а поверх идут
мягкие эффекты — дым, блёстки, тряска, вспышка, линии скорости, переходы штриховкой. Есть
2.5D-слои (облачка и предметы отделены от фона и сдвигаются с параллаксом) и «живые панели»:
WebGL-шейдер слегка деформирует сам скан, и персонаж дышит, качает волосами, дым струится.

Вебтун читается иначе: глава — одна лента кадров встык, как в оригинале, а эффекты привязаны к
кадрам — системные окна загружаются с глитчем и полосой сканирования, помехи, искры, кровь, сердцебиение.
В манге про VR-игру свой интерфейс: игровые окна собираются из крупных пикселей со сбоем цвета и голубым
свечением, а вход в игру и выход из неё рассыпают страницу на пиксели.

Каталог → страница манги (о манге, список глав, обсуждение) → глава. Вход, регистрация и
комментарии — маленький сервер на стандартном Python и SQLite (`server/`); он же пускает в личный
раздел только владельца сайта.

Статический сайт без сборки: GSAP + ScrollTrigger и Lenis с CDN.

## Запуск

```bash
python3 -m http.server 5173
```

- http://localhost:5173/ — каталог
- `/manga/blackjack/` — страница «Give My Regards to Black Jack», `/blackjack/` — первый эпизод целиком
- `/private/` — личный раздел, `/private/manga/perekur/`, `/private/manga/orv/`, `/private/manga/shangrila/` —
  страницы манги; на сервере открыт только владельцу сайта
- так вход и комментарии не работают (их блоки просто не показываются); чтобы проверить и их, вместо
  http.server — API вместе с сайтом на http://localhost:8087/, `/private/` закрыт так же, как на сервере:

```bash
ANIMANGA_DB=/tmp/animanga-dev.db python3 -I server/animanga_api.py serve --dev .
```

Локальный аккаунт владельца (пароль спросит сам):

```bash
ANIMANGA_DB=/tmp/animanga-dev.db python3 -I server/animanga_api.py user add ИМЯ --owner
```

- у любой истории: `?debug` — рамки панелей поверх страниц, `?flat` — без слоёв и живых панелей,
  `#p09` — сразу к странице; у вебтуна `?debug` подписывает номера кадров, `#k40` — сразу к кадру

## Устройство

- `index.html`, `site.css` — каталог; `manga/blackjack/`, `private/manga/perekur/`, `private/manga/orv/`,
  `private/manga/shangrila/` — страницы манги: сведения, главы, обсуждение. Новая глава — строка в списке глав её манги и `next`
  в сценарии предыдущей
- `login/` — вход и регистрация (на сервере она же отвечает с кодом 401 на любой адрес в `/private/`),
  `auth.js` — кто вошёл и плашка «Войти» в шапке, `comments.js` + `comments.css` — комментарии
  под главой и на странице манги
- `reading.js` — докуда дочитана каждая глава, только в localStorage браузера: пишет движок по мере
  прокрутки, `manga.js` на странице манги рисует полоски у глав и кнопку «Продолжить»
  (ссылка `#at=0.43` открывает главу там, где остановились), а список длиннее десяти глав
  делит на страницы по десять и открывает ту, где глава для продолжения
- `server/animanga_api.py` — API входа, регистрации и комментариев, только стандартная библиотека
  Python и SQLite; как он защищён — в шапке файла
- `engine/` — движок: сцены, камера, эффекты, слои, живые панели; `engine/strip.js` — лента вебтуна
  и её эффекты (язык эффектов — в шапке файла), грузится, только если в сценарии есть `strip`
- `blackjack/`, `private/perekur/`, `private/perekur-2/`, `private/perekur-3/` — истории. В папке истории: `index.html` (подключает движок),
  `story.js` (рамки панелей и шаги камеры, формат — в шапке `blackjack/story.js`), исходники для
  инструментов (`layers.json`, `living.json`) и `pages/` со страницами
- `private/orv-0/` … `private/orv-4/` — вебтун «Всеведущий читатель», пролог и главы 1–4: в `story.js`
  только эффекты по номерам кадров, сами кадры и `pages/strip.json` режет `cut_strip.py`
- `private/slf-1/` … `private/slf-30/`, `private/slf-5-5/`, `private/slf-15-5/` и `private/slf-25-5/` — «Рубеж
  Шангри-Ла», главы 1–30 и бонусные 5.5, 15.5 и 25.5:
  страничная манга, как «Перекур», плюс игровые эффекты `hud`, `tone` и переход `pixel` (описаны в шапке
  `private/slf-1/story.js`)
- `tools/` — инструменты на Python + Pillow, запускать из корня:
  `detect_panels.py` находит панели, `snap_panels.py` подгоняет рамки к линиям границ (ему нужен
  ещё node), `make_layers.py` режет 2.5D-слои, `make_living.py` строит карты живых панелей,
  `make_cover.py` делает обложку для каталога, `pdf_pages.py` достаёт страницы главы из PDF тома,
  `cut_strip.py` режет главу вебтуна на кадры по пустым промежуткам
- `deploy/` — конфиг nginx, служба systemd для API, `animanga-users` для аккаунтов и скрипт выкладки

## Страницы

Сканы в репозиторий не входят, как и всё, что из них собрано (папки `pages/`). Положить локально:

- `blackjack/pages/bj-p03.jpg` … `bj-p58.jpg` и разворот `bj-p04-05.jpg` — «Give My Regards to
  Black Jack», SHUHO SATO, т. 1, эпизод 1, раздача для свободного вторичного использования:
  https://densho810.com/free/ (английский PDF тома, страницы 3–58)
- `private/perekur/pages/p01.jpg` … `p15.jpg` — глава 1 «Smoking Behind the Supermarket with You»
  (Jinushi, Square Enix); коммерческая манга — только для себя, публично не выкладывать
- `private/perekur-2/pages/p01.jpg` … `p14.jpg` — глава 2 той же манги, на тех же условиях
- `private/perekur-3/pages/p01.jpg` … `p12.jpg` — глава 3, на тех же условиях
- `private/orv-0/pages/` … `private/orv-4/pages/` — «Omniscient Reader» (Sing Shong, Sleepy-C,
  Redice Studio), пролог и главы 1–4 в переводе AssleyTM и Kolabik; коммерческий вебтун — только
  для себя. Кадры режутся из папки с картинками главы:

```bash
python3 -I tools/cut_strip.py private/orv-0 "Всеведущий читатель/Глава 00"
```

- `private/slf-1/pages/p01.jpg` … — «Shangri-La Frontier» (Katarina, Ryosuke Fuji, Kodansha), главы 1–30,
  5.5, 15.5 и 25.5 в переводе YONA ANART; коммерческая манга — только для себя. Из папки «Рубеж Шангри-Ла/Глава 01» …
  «Глава 30», «Глава 05.5» (→ `slf-5-5`), «Глава 15.5» (→ `slf-15-5`), «Глава 25.5» (→ `slf-25-5`) — все картинки
  по порядку как `p01.jpg`, `p02.jpg`…, кроме последней в обычных главах (заметка переводчика с реквизитами);
  страницы выше 1600 px (главы 12–30, 15.5 и 25.5, разворот в главе 30 тоже) уменьшены до этой высоты с теми же
  пропорциями. Рамки уже в `story.js`: их нашли
  `detect_panels.py` и `snap_panels.py`, потом все страницы поправлены вручную

Страницы Black Jack — из PDF тома (нужен `pdftoppm` из poppler):

```bash
python3 -I tools/pdf_pages.py enbj001.pdf 3 58 blackjack/pages bj-p --spread=4,5
```

Потом собрать слои, живые панели и обложки:

```bash
python3 -I tools/make_layers.py blackjack
```

```bash
python3 -I tools/make_living.py private/perekur
```

```bash
python3 -I tools/make_living.py private/perekur-2
```

```bash
python3 -I tools/make_living.py private/perekur-3
```

```bash
python3 -I tools/make_cover.py blackjack pages/bj-p34.jpg 0 0.49 0.6 0.51
```

```bash
python3 -I tools/make_cover.py private/perekur pages/p01.jpg 0.28 0 0.64 0.56
```

```bash
python3 -I tools/make_cover.py private/perekur-2 pages/p10.jpg 0.17 0 0.5 0.438
```

```bash
python3 -I tools/make_cover.py private/perekur-3 pages/p08.jpg 0.21 0.325 0.51 0.448
```

Обложки вебтуна — по кадру из каждой главы:

```bash
python3 -I tools/make_cover.py private/orv-0 pages/s027.jpg 0 0.22 1 0.41
```

```bash
python3 -I tools/make_cover.py private/orv-1 pages/s127.jpg 0 0.08 1 0.39
```

```bash
python3 -I tools/make_cover.py private/orv-2 pages/s018.jpg 0 0.025 1 0.388
```

```bash
python3 -I tools/make_cover.py private/orv-3 pages/s070.jpg 0 0.08 1 0.549
```

```bash
python3 -I tools/make_cover.py private/orv-4 pages/s064.jpg 0 0 1 0.40
```

Обложки «Рубежа Шангри-Ла» — по кадру из главы, а для страницы манги и карточки — цветная обложка главы 8:

```bash
python3 -I tools/make_cover.py private/slf-8 pages/p01.jpg 0 0.1 0.88 0.67 poster.jpg
```

```bash
python3 -I tools/make_cover.py private/slf-1 pages/p02.jpg 0.2 0.13 0.4 0.63
```

```bash
python3 -I tools/make_cover.py private/slf-2 pages/p06.jpg 0 0 1 0.85
```

```bash
python3 -I tools/make_cover.py private/slf-3 pages/p23.jpg 0 0 1 0.85
```

```bash
python3 -I tools/make_cover.py private/slf-4 pages/p01.jpg 0 0.2 0.56 0.41
```

```bash
python3 -I tools/make_cover.py private/slf-5 pages/p03.jpg 0 0 1 0.55
```

```bash
python3 -I tools/make_cover.py private/slf-5-5 pages/p01.jpg 0.08 0.15 0.84 0.45
```

```bash
python3 -I tools/make_cover.py private/slf-6 pages/p17.jpg 0 0 1 0.75
```

```bash
python3 -I tools/make_cover.py private/slf-7 pages/p04.jpg 0 0 1 0.62
```

```bash
python3 -I tools/make_cover.py private/slf-8 pages/p01.jpg 0.04 0.1 0.8 0.46
```

```bash
python3 -I tools/make_cover.py private/slf-9 pages/p18.jpg 0 0.36 1 0.64
```

```bash
python3 -I tools/make_cover.py private/slf-10 pages/p09.jpg 0 0.3 1 0.7
```

```bash
python3 -I tools/make_cover.py private/slf-11 pages/p16.jpg 0 0.2 0.62 0.325
```

```bash
python3 -I tools/make_cover.py private/slf-12 pages/p12.jpg 0.05 0.02 0.95 0.5
```

```bash
python3 -I tools/make_cover.py private/slf-13 pages/p02.jpg 0.11 0.46 0.39 0.54
```

```bash
python3 -I tools/make_cover.py private/slf-14 pages/p14.jpg 0.22 0 0.66 0.35
```

```bash
python3 -I tools/make_cover.py private/slf-15 pages/p03.jpg 0.15 0 0.58 0.306
```

```bash
python3 -I tools/make_cover.py private/slf-15-5 pages/p01.jpg 0.03 0.02 0.94 0.49
```

```bash
python3 -I tools/make_cover.py private/slf-16 pages/p03.jpg 0 0.55 0.62 0.327
```

```bash
python3 -I tools/make_cover.py private/slf-17 pages/p16.jpg 0.02 0 0.9 0.475
```

```bash
python3 -I tools/make_cover.py private/slf-18 pages/p12.jpg 0.3 0.34 0.56 0.295
```

```bash
python3 -I tools/make_cover.py private/slf-19 pages/p04.jpg 0.07 0 0.93 0.6
```

```bash
python3 -I tools/make_cover.py private/slf-20 pages/p09.jpg 0.5 0.66 0.48 0.253
```

```bash
python3 -I tools/make_cover.py private/slf-21 pages/p01.jpg 0.04 0.1 0.92 0.485
```

```bash
python3 -I tools/make_cover.py private/slf-22 pages/p15.jpg 0.425 0.312 0.5 0.264
```

```bash
python3 -I tools/make_cover.py private/slf-23 pages/p09.jpg 0.235 0.69 0.535 0.282
```

```bash
python3 -I tools/make_cover.py private/slf-24 pages/p05.jpg 0 0.27 0.71 0.374
```

```bash
python3 -I tools/make_cover.py private/slf-25 pages/p01.jpg 0 0 0.86 0.453
```

```bash
python3 -I tools/make_cover.py private/slf-25-5 pages/p01.jpg 0.03 0 0.94 0.437
```

```bash
python3 -I tools/make_cover.py private/slf-26 pages/p03.jpg 0.015 0 0.9 0.474
```

```bash
python3 -I tools/make_cover.py private/slf-27 pages/p17.jpg 0.08 0.48 0.48 0.253
```

```bash
python3 -I tools/make_cover.py private/slf-28 pages/p05.jpg 0.02 0 0.85 0.448
```

```bash
python3 -I tools/make_cover.py private/slf-29 pages/p17.jpg 0.19 0.37 0.5 0.2635
```

```bash
python3 -I tools/make_cover.py private/slf-30 pages/p16.jpg 0.12 0.42 0.5 0.527
```

Кадры для коллажа на главной (и ленты кадров в карточке Black Jack):

```bash
python3 -I tools/make_cover.py blackjack pages/bj-p07.jpg 0.02 0.48 0.66 0.5 hero-smile.jpg 640
```

```bash
python3 -I tools/make_cover.py blackjack pages/bj-p47.jpg 0.07 0.04 0.75 0.41 hero-surgery.jpg 720
```

```bash
python3 -I tools/make_cover.py blackjack pages/bj-p54.jpg 0 0.6 1 0.4 hero-glare.jpg 900
```

## Выкладка на сервер

Один раз на сервере (Ubuntu/Debian), `DOMAIN` — ваш домен:

```bash
sudo apt install nginx certbot python3-certbot-nginx apache2-utils
```

```bash
sudo mkdir -p /var/www/animanga && sudo chown "$USER" /var/www/animanga
```

Положить `deploy/nginx.conf` в `/etc/nginx/sites-available/animanga`, заменить в нём `DOMAIN`, затем:

```bash
sudo ln -s /etc/nginx/sites-available/animanga /etc/nginx/sites-enabled/ && sudo nginx -t && sudo systemctl reload nginx
```

```bash
sudo certbot --nginx -d DOMAIN
```

Служба входа и комментариев: системный пользователь, папка для кода, служба и команда для аккаунтов
(в `deploy/animanga-api.service` заменить `DOMAIN`):

```bash
sudo useradd --system --no-create-home --shell /usr/sbin/nologin animanga
```

```bash
sudo mkdir -p /opt/animanga && sudo chown "$USER" /opt/animanga
```

```bash
sudo cp animanga-api.service /etc/systemd/system/ && sudo cp animanga-users /usr/local/bin/
```

Код в `/opt/animanga` положит скрипт выкладки, после первой выкладки:

```bash
sudo systemctl daemon-reload && sudo systemctl enable --now animanga-api
```

Аккаунт владельца — уже после HTTPS (пароль спросит сам). Владелец видит личный раздел и удаляет
любые комментарии; все остальные регистрируются на сайте сами и могут только комментировать:

```bash
animanga-users add aiba --owner
```

Там же: `animanga-users list`, `passwd ИМЯ`, `ban ИМЯ` (блокирует вход и прячет комментарии), `unban ИМЯ`.

Выкладка — с этой машины, из корня сайта:

```bash
deploy/deploy.sh user@host https://DOMAIN
```

Скрипт отправляет код и картинки без инструментов и проверочных листов, код API — в `/opt/animanga`
с перезапуском службы. Личный раздел он выкладывает, только если `https://DOMAIN/private/` и картинка
внутри уже отвечают 401 тому, кто не вошёл.

Black Jack: по условиям автора название и имя указываются без изменений, а о публикации нужно
сообщить на info@densho810.com в течение месяца.
