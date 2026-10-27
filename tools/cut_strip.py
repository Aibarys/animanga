"""Режет главу вебтуна (длинные вертикальные полосы) на кадры по промежуткам между ними.

Полосы главы склеиваются в одну ленту, промежуток — строки одного цвета подряд (белые, чёрные, ровный
фон), разрез идёт по его середине. На экране кадры встают встык, так что лента выглядит как исходная,
а кадр — единица для эффектов и ленивой загрузки. Слишком длинный кадр делится по самой ровной строке.

Запуск из корня сайта:
  python3 -I tools/cut_strip.py <папка истории> <папка с полосами главы>
Берутся картинки самой частой ширины, остальные (кредиты, баннеры команды) пропускаются.
Пишет <папка истории>/pages/s001.jpg … и pages/strip.json: {width, segments: [{src, h, art}]},
art — [x, y, w, h] рисунка внутри кадра (без фона вокруг) в долях кадра. Лист проверки: pages/_strip-N.jpg.
"""
import json
import sys
from collections import Counter
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw

QUALITY = 85
FLAT = 26        # строка ровная, если в каждом канале разброс яркости не больше
MIN_GAP = 18     # промежуток — хотя бы столько ровных строк подряд
MIN_SEG = 80     # кадр короче — приклеивается к соседнему
MAX_SEG = 2400   # кадр длиннее — делится


def row_spread(img):
    """Разброс яркости каждой строки (максимум по каналам), без краёв: там бывает рамка в пиксель."""
    small = img.resize((img.width // 2, img.height))
    w = small.width
    out = []
    for y in range(small.height):
        ext = small.crop((3, y, w - 3, y + 1)).getextrema()
        out.append(max(hi - lo for lo, hi in ext))
    return out


def cuts_for(spread, height):
    flat = [s <= FLAT for s in spread]
    cuts, start = [0], None
    for y, f in enumerate(flat + [False]):
        if f and start is None:
            start = y
        elif not f and start is not None:
            if y - start >= MIN_GAP and start > 0 and y < height:
                cuts.append((start + y) // 2)
            start = None
    cuts.append(height)
    # короткие куски приклеиваются к предыдущему
    merged = [cuts[0]]
    for c in cuts[1:]:
        if c - merged[-1] < MIN_SEG and len(merged) > 1:
            merged[-1] = c
        else:
            merged.append(c)
    # длинные делятся по самой ровной строке около середины каждой части
    final = [merged[0]]
    for c in merged[1:]:
        a = final[-1]
        while c - a > MAX_SEG:
            parts = -(-(c - a) // MAX_SEG)
            target = a + (c - a) // parts
            lo, hi = target - 300, target + 300
            y = min(range(lo, hi), key=lambda r: (spread[r], abs(r - target)))
            final.append(y)
            a = y
        final.append(c)
    return final


def art_box(part):
    """Рамка рисунка: всё, что заметно отличается от цвета фона в углу кадра."""
    bg = Image.new('RGB', part.size, part.getpixel((2, 2)))
    mask = ImageChops.difference(part, bg).convert('L').point(lambda v: 255 if v > 40 else 0)
    box = mask.getbbox()
    if not box:
        return [0, 0, 1, 1]
    w, h = part.size
    return [round(box[0] / w, 4), round(box[1] / h, 4), round((box[2] - box[0]) / w, 4), round((box[3] - box[1]) / h, 4)]


def sheet(story, segs, tape_parts, width):
    """Лист проверки: кадры с номерами, колонками по 200 px."""
    W, COLH, GAP = 200, 2400, 34
    k = W / width
    cols, col, y = [], [], 0
    for i, (seg, im) in enumerate(zip(segs, tape_parts)):
        h = max(1, round(im.height * k))
        if y + h > COLH and col:
            cols.append(col); col, y = [], 0
        col.append((i + 1, im.resize((W, h)), y)); y += h + 6
    if col:
        cols.append(col)
    for n in range(0, len(cols), 9):
        group = cols[n:n + 9]
        out = Image.new('RGB', (len(group) * (W + GAP), COLH + 10), (50, 50, 50))
        d = ImageDraw.Draw(out)
        for c, items in enumerate(group):
            x = c * (W + GAP) + GAP
            for num, im, yy in items:
                out.paste(im, (x, yy))
                d.text((x - GAP + 2, yy), str(num), fill=(255, 230, 0), font_size=14)
        out.save(story / 'pages' / f'_strip-{n // 9 + 1}.jpg', quality=80)


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    story, src = Path(sys.argv[1]), Path(sys.argv[2])
    files = sorted(src.glob('*.jpg'))
    widths = Counter(Image.open(f).width for f in files)
    width = widths.most_common(1)[0][0]
    strips = [Image.open(f).convert('RGB') for f in files if Image.open(f).width == width]
    skipped = [f.name for f in files if Image.open(f).width != width]
    total = sum(s.height for s in strips)
    tape = Image.new('RGB', (width, total))
    spread, y = [], 0
    for s in strips:
        tape.paste(s, (0, y))
        spread += row_spread(s)
        y += s.height
    cuts = cuts_for(spread, total)

    out = story / 'pages'
    out.mkdir(parents=True, exist_ok=True)
    for old in out.glob('s[0-9][0-9][0-9].jpg'):
        old.unlink()
    segs, parts = [], []
    for i, (a, b) in enumerate(zip(cuts, cuts[1:])):
        name = f's{i + 1:03d}.jpg'
        part = tape.crop((0, a, width, b))
        part.save(out / name, quality=QUALITY, progressive=True, optimize=True)
        segs.append({'src': f'pages/{name}', 'h': b - a, 'art': art_box(part)})
        parts.append(part)
    (out / 'strip.json').write_text(json.dumps({'width': width, 'segments': segs}, ensure_ascii=False, indent=1))
    sheet(story, segs, parts, width)
    print(f'{len(strips)} полос, {total} px → {len(segs)} кадров; пропущено: {", ".join(skipped) or "—"}')


if __name__ == '__main__':
    main()
