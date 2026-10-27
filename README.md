# Аниманга

Манга, которая оживает при прокрутке: камера перелетает по панелям страницы, а поверх идут
мягкие эффекты — дым, блёстки, тряска, вспышка, линии скорости, переходы штриховкой. Есть
2.5D-слои (облачка и предметы отделены от фона и сдвигаются с параллаксом) и «живые панели»:
WebGL-шейдер слегка деформирует сам скан, и персонаж дышит, качает волосами, дым струится.

Вебтун читается иначе: глава — одна лента кадров встык, как в оригинале, а эффекты привязаны к
кадрам — системные окна загружаются с глитчем и полосой сканирования, помехи, искры, кровь, сердцебиение.

Статический сайт без сборки: GSAP + ScrollTrigger и Lenis с CDN.

## Запуск

```bash
python3 -m http.server 5173
```

- http://localhost:5173/ — каталог
- `/blackjack/` — первый эпизод «Give My Regards to Black Jack» целиком
- `/private/` — личный раздел; на сервере закрыт паролем
- у любой истории: `?debug` — рамки панелей поверх страниц, `?flat` — без слоёв и живых панелей,
  `#p09` — сразу к странице; у вебтуна `?debug` подписывает номера кадров, `#k40` — сразу к кадру

## Устройство

- `index.html`, `site.css` — каталог
- `engine/` — движок: сцены, камера, эффекты, слои, живые панели; `engine/strip.js` — лента вебтуна
  и её эффекты (язык эффектов — в шапке файла), грузится, только если в сценарии есть `strip`
- `blackjack/`, `private/perekur/`, `private/perekur-2/`, `private/perekur-3/` — истории. В папке истории: `index.html` (подключает движок),
  `story.js` (рамки панелей и шаги камеры, формат — в шапке `blackjack/story.js`), исходники для
  инструментов (`layers.json`, `living.json`) и `pages/` со страницами
- `private/orv-0/` … `private/orv-4/` — вебтун «Всеведущий читатель», пролог и главы 1–4: в `story.js`
  только эффекты по номерам кадров, сами кадры и `pages/strip.json` режет `cut_strip.py`
- `tools/` — инструменты на Python + Pillow, запускать из корня:
  `detect_panels.py` находит панели, `snap_panels.py` подгоняет рамки к линиям границ (ему нужен
  ещё node), `make_layers.py` режет 2.5D-слои, `make_living.py` строит карты живых панелей,
  `make_cover.py` делает обложку для каталога, `pdf_pages.py` достаёт страницы главы из PDF тома,
  `cut_strip.py` режет главу вебтуна на кадры по пустым промежуткам
- `deploy/` — конфиг nginx и скрипт выкладки

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

Пароль для личного раздела — уже после HTTPS (команда сама спросит пароль):

```bash
sudo htpasswd -c /etc/nginx/animanga.htpasswd aiba
```

Выкладка — с этой машины, из корня сайта:

```bash
deploy/deploy.sh user@host https://DOMAIN
```

Скрипт отправляет код и картинки без инструментов и проверочных листов. Личный раздел он выкладывает,
только если `https://DOMAIN/private/` и картинка внутри уже отвечают 401, то есть пароль работает.

Black Jack: по условиям автора название и имя указываются без изменений, а о публикации нужно
сообщить на info@densho810.com в течение месяца.
