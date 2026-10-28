"""Обложка истории для каталога: кусок страницы, уменьшенный до ширины карточки.

Запуск из корня сайта:  python3 -I tools/make_cover.py <папка истории> <страница> x y w h [имя.jpg [ширина]]
  например:  python3 -I tools/make_cover.py blackjack pages/bj-p34.jpg 0 0.42 0.62 0.58
x, y, w, h — кусок в долях страницы. Пишет <папка истории>/pages/cover.jpg, а с именем — этот файл
(так же режутся кадры для коллажа на главной); ширина по умолчанию 720.
"""
import sys
from pathlib import Path

from PIL import Image

WIDTH = 720   # карточка в каталоге не шире 360 css-пикселей, ×2 для чётких экранов


def main():
    if not 7 <= len(sys.argv) <= 9:
        sys.exit(__doc__)
    story, src = Path(sys.argv[1]), sys.argv[2]
    x, y, w, h = map(float, sys.argv[3:7])
    name = sys.argv[7] if len(sys.argv) > 7 else 'cover.jpg'
    width = int(sys.argv[8]) if len(sys.argv) > 8 else WIDTH
    page = Image.open(story / src).convert('RGB')
    W, H = page.size
    cover = page.crop((round(x * W), round(y * H), round((x + w) * W), round((y + h) * H)))
    cover = cover.resize((width, round(width * cover.height / cover.width)), Image.LANCZOS)
    out = story / 'pages' / Path(name).name
    cover.save(out, quality=82, progressive=True, optimize=True)
    print(f'{out}: {cover.width}×{cover.height}')


if __name__ == '__main__':
    main()
