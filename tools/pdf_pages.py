"""Достаёт страницы главы из PDF тома в папку истории: <префикс>NN.jpg, номер = номер страницы PDF.

Запуск из корня сайта (нужен pdftoppm из poppler):
  python3 -I tools/pdf_pages.py <том.pdf> <первая> <последняя> blackjack/pages bj-p --spread=4,5
--spread=R,L — склеить две страницы в разворот <префикс>RR-LL.jpg; R встаёт справа, как в японском
издании (читается справа налево). Уже лежащие страницы не перезаписываются: под них могут быть
нарезаны 2.5D-слои.
"""
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image

QUALITY = 85


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if len(args) != 5:
        sys.exit(__doc__)
    pdf, first, last, out, prefix = args[0], int(args[1]), int(args[2]), Path(args[3]), args[4]
    spread = next((tuple(map(int, a.split('=')[1].split(','))) for a in sys.argv if a.startswith('--spread=')), ())
    out.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(['pdftoppm', '-r', '72', '-png', '-f', str(first), '-l', str(last), pdf, f'{tmp}/p'], check=True)
        raw = {int(f.stem.split('-')[-1]): f for f in Path(tmp).glob('p-*.png')}
        for n, src in sorted(raw.items()):
            dest = out / f'{prefix}{n:02d}.jpg'
            if n in spread or dest.exists():
                continue
            Image.open(src).convert('RGB').save(dest, quality=QUALITY)
            print(dest)
        if spread:
            right, left = (Image.open(raw[n]).convert('RGB') for n in spread)
            both = Image.new('RGB', (left.width + right.width, max(left.height, right.height)))
            both.paste(left, (0, 0))
            both.paste(right, (left.width, 0))
            dest = out / f'{prefix}{spread[0]:02d}-{spread[1]:02d}.jpg'
            both.save(dest, quality=QUALITY)
            print(dest, 'разворот')


if __name__ == '__main__':
    main()
