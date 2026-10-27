"""Обложка истории для каталога: кусок страницы, уменьшенный до ширины карточки.

Запуск из корня сайта:  python3 -I tools/make_cover.py <папка истории> <страница> x y w h
  например:  python3 -I tools/make_cover.py blackjack pages/bj-p34.jpg 0 0.42 0.62 0.58
x, y, w, h — кусок в долях страницы. Пишет <папка истории>/pages/cover.jpg.
"""
import sys
from pathlib import Path

from PIL import Image

WIDTH = 720   # карточка в каталоге не шире 360 css-пикселей, ×2 для чётких экранов


def main():
    if len(sys.argv) != 7:
        sys.exit(__doc__)
    story, src = Path(sys.argv[1]), sys.argv[2]
    x, y, w, h = map(float, sys.argv[3:])
    page = Image.open(story / src).convert('RGB')
    W, H = page.size
    cover = page.crop((round(x * W), round(y * H), round((x + w) * W), round((y + h) * H)))
    cover = cover.resize((WIDTH, round(WIDTH * cover.height / cover.width)), Image.LANCZOS)
    out = story / 'pages' / 'cover.jpg'
    cover.save(out, quality=82, progressive=True, optimize=True)
    print(f'{out}: {cover.width}×{cover.height}')


if __name__ == '__main__':
    main()
