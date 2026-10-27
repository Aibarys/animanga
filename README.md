# Аниманга

Манга, которая оживает при прокрутке: камера перелетает по панелям страницы, а поверх идут
мягкие эффекты — дым, блёстки, тряска, вспышка, линии скорости, переходы штриховкой. Есть
2.5D-слои (облачка и предметы отделены от фона и сдвигаются с параллаксом) и «живые панели»:
WebGL-шейдер слегка деформирует сам скан, и персонаж дышит, качает волосами, дым струится.

GSAP + ScrollTrigger и Lenis с CDN, без сборки.

## Запуск

```bash
python3 -m http.server 5173
```

- http://localhost:5173/ — «История о перекуре за супермаркетом», глава 1
- `?story=blackjack` — сцена из «Give My Regards to Black Jack»
- `?debug` — рамки панелей поверх страниц, `?flat` — без слоёв и живых панелей,
  `#p09` — сразу к странице

## Страницы

Сканы в репозиторий не входят, как и всё, что из них собрано (папка `pages/`). Положить локально:

- `pages/bj-p34.jpg`, `bj-p37.jpg`, `bj-p38.jpg` — «Give My Regards to Black Jack», SHUHO SATO,
  раздача для вторичного использования: https://densho810.com/free/
- `pages/supermarket/p01.jpg` … `p15.jpg` — глава 1 «Smoking Behind the Supermarket with You»
  (Jinushi, Square Enix); коммерческая манга, только для локального теста

Потом собрать слои и живые панели:

```bash
python3 -I tools/make_layers.py
```

```bash
python3 -I tools/make_living.py
```

## Устройство

- `main.js` — движок: сцены, камера, эффекты, слои, живые панели
- `stories/*.js` — истории: рамки панелей и шаги камеры; формат описан в шапке `stories/blackjack.js`
- `tools/` — инструменты на Python + Pillow:
  `detect_panels.py` находит панели, `snap_panels.py` подгоняет рамки к линиям границ
  (ему нужен ещё node), `make_layers.py` режет 2.5D-слои по `layers.json`,
  `make_living.py` строит карты живых панелей по `living.json`
