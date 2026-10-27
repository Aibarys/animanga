"""Находит панели на страницах манги разрезом по белым промежуткам (XY-cut).

Запуск из корня сайта:  python3 -I tools/detect_panels.py private/perekur/pages
Пишет <папка>/panels.json ({"p01.jpg": [[x, y, w, h], ...]} в долях страницы, в порядке чтения манги:
сверху вниз, в ряду — справа налево) и проверочный лист <папка>/_preview.jpg.
"""
import json
import sys
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

INK = 170          # всё темнее считается тушью
WORK_W = 700       # ширина, до которой уменьшаем страницу для анализа


def load(path):
    img = Image.open(path).convert('L')
    small = img.resize((WORK_W, round(img.height * WORK_W / img.width)))
    w, h = small.size
    px = small.load()
    return [[1 if px[x, y] < INK else 0 for x in range(w)] for y in range(h)], w, h


def profile(ink, x0, y0, x1, y1, axis):
    if axis == 'rows':
        return [sum(ink[y][x0:x1]) for y in range(y0, y1)]
    return [sum(ink[y][x] for y in range(y0, y1)) for x in range(x0, x1)]


def gaps(prof, size, min_gap):
    limit = max(1, size * 0.004)
    runs, start = [], None
    for i, v in enumerate(prof + [limit + 1]):
        if v <= limit:
            start = i if start is None else start
        elif start is not None:
            if i - start >= min_gap:
                runs.append((start, i))
            start = None
    return runs


def trim(ink, x0, y0, x1, y1):
    rows = profile(ink, x0, y0, x1, y1, 'rows')
    cols = profile(ink, x0, y0, x1, y1, 'cols')
    ys = [i for i, v in enumerate(rows) if v > 0]
    xs = [i for i, v in enumerate(cols) if v > 0]
    if not ys or not xs:
        return None
    return x0 + xs[0], y0 + ys[0], x0 + xs[-1] + 1, y0 + ys[-1] + 1


def split(ink, box, depth, out, w, h):
    box = trim(ink, *box)
    if not box:
        return
    x0, y0, x1, y1 = box
    if (x1 - x0) * (y1 - y0) < w * h * 0.012 or min(x1 - x0, y1 - y0) < min(w, h) * 0.06:
        return
    for axis in ('rows', 'cols'):
        size = (x1 - x0) if axis == 'rows' else (y1 - y0)
        length = (y1 - y0) if axis == 'rows' else (x1 - x0)
        runs = gaps(profile(ink, x0, y0, x1, y1, axis), size, max(4, round(min(w, h) * 0.008)))
        runs = [r for r in runs if r[0] > 0 and r[1] < length]
        if runs and depth < 6:
            cuts = [0] + [c for r in runs for c in r] + [length]
            for a, b in zip(cuts[::2], cuts[1::2]):
                sub = (x0, y0 + a, x1, y0 + b) if axis == 'rows' else (x0 + a, y0, x0 + b, y1)
                split(ink, sub, depth + 1, out, w, h)
            return
    out.append(box)


def reading_order(boxes):
    """Ряды — панели, которые перекрываются по высоте; в ряду читаем справа налево."""
    rows = []
    for b in sorted(boxes, key=lambda b: b[1]):
        for row in rows:
            top, bottom = min(r[1] for r in row), max(r[3] for r in row)
            overlap = min(bottom, b[3]) - max(top, b[1])
            if overlap > 0.5 * min(b[3] - b[1], bottom - top):
                row.append(b)
                break
        else:
            rows.append([b])
    return [b for row in rows for b in sorted(row, key=lambda b: -b[2])]


def flood_panels(path, white=225, erode=2):
    """Для страниц, где облачка и рисунок залезают на промежутки: заливаем белое от краёв
    страницы (это поля и промежутки), а всё, куда заливка не дошла, делим на связные куски."""
    img = Image.open(path).convert('L')
    small = img.resize((WORK_W, round(img.height * WORK_W / img.width)))
    w, h = small.size
    data = small.tobytes()
    gutter = bytearray(w * h)
    queue = deque(i for i in range(w * h)
                  if (i < w or i >= w * (h - 1) or i % w in (0, w - 1)) and data[i] > white)
    for i in queue:
        gutter[i] = 1
    while queue:
        i = queue.popleft()
        x = i % w
        for j in ((i - 1) if x else -1, (i + 1) if x < w - 1 else -1, i - w, i + w):
            if 0 <= j < w * h and not gutter[j] and data[j] > white:
                gutter[j] = 1
                queue.append(j)
    # Сужаем «не промежутки», чтобы разорвать тонкие перемычки (контуры облачков через промежуток)
    mask = Image.frombytes('L', (w, h), bytes(0 if g else 255 for g in gutter))
    mask = mask.filter(ImageFilter.MinFilter(2 * erode + 1))
    body = mask.tobytes()
    seen = bytearray(w * h)
    boxes = []
    for s in range(w * h):
        if not body[s] or seen[s]:
            continue
        seen[s] = 1
        queue, x0, y0, x1, y1, area = deque([s]), w, h, 0, 0, 0
        while queue:
            i = queue.popleft()
            x, y = i % w, i // w
            area += 1
            x0, y0, x1, y1 = min(x0, x), min(y0, y), max(x1, x), max(y1, y)
            for j in ((i - 1) if x else -1, (i + 1) if x < w - 1 else -1, i - w, i + w):
                if 0 <= j < w * h and body[j] and not seen[j]:
                    seen[j] = 1
                    queue.append(j)
        if area > w * h * 0.012:
            boxes.append((max(0, x0 - erode), max(0, y0 - erode), min(w, x1 + 1 + erode), min(h, y1 + 1 + erode)))
    return boxes, w, h


def detect(path):
    ink, w, h = load(path)
    boxes = []
    split(ink, (0, 0, w, h), 0, boxes, w, h)
    if len(boxes) <= 2:                        # разрез по сплошным промежуткам не сработал
        boxes, w, h = flood_panels(path)
    return [[round(x0 / w, 4), round(y0 / h, 4), round((x1 - x0) / w, 4), round((y1 - y0) / h, 4)]
            for x0, y0, x1, y1 in reading_order(boxes)]


def preview(folder, result, out):
    tw, th, cols = 300, 420, 5
    names = sorted(result)
    rows = (len(names) - 1) // cols + 1
    sheet = Image.new('RGB', (cols * (tw + 8), rows * (th + 8)), 'white')
    for i, name in enumerate(names):
        img = Image.open(folder / name).convert('RGB')
        img.thumbnail((tw, th))
        d = ImageDraw.Draw(img)
        for n, (x, y, bw, bh) in enumerate(result[name], 1):
            X, Y, W, H = x * img.width, y * img.height, bw * img.width, bh * img.height
            d.rectangle([X, Y, X + W, Y + H], outline=(0, 190, 255), width=3)
            d.rectangle([X, Y, X + 22, Y + 20], fill=(0, 190, 255))
            d.text((X + 5, Y + 2), str(n), fill=(0, 0, 0), font_size=15)
        d.text((4, img.height - 20), name, fill=(255, 0, 60), font_size=16)
        sheet.paste(img, ((i % cols) * (tw + 8) + 4, (i // cols) * (th + 8) + 4))
    sheet.save(out, quality=82)


def main():
    folder = Path(sys.argv[1])
    result = {p.name: detect(p) for p in sorted(folder.glob('*.jpg')) if not p.name.startswith('_')}
    (folder / 'panels.json').write_text(json.dumps(result, indent=1), encoding='utf-8')
    preview(folder, result, folder / '_preview.jpg')
    for name, panels in result.items():
        print(name, len(panels))


if __name__ == '__main__':
    main()
