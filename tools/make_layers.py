"""Режет страницы манги на слои для 2.5D-параллакса.

Читает <папка истории>/layers.json, для каждой страницы пишет в <папка истории>/pages/layers/:
  <страница>-bg.jpg      — фон, где вырезанные объекты заменены размытым продолжением соседних пикселей
  <страница>-<id>.webp   — вырезанный слой с прозрачностью, обрезанный по своим границам
  manifest.json          — какие слои есть, где они лежат и насколько они «ближе»
  <страница>-preview.jpg — проверочная картинка: слои подсвечены цветом

Запуск из корня сайта:  python3 -I tools/make_layers.py blackjack
"""
import json
import sys
from collections import deque
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps

STORY = Path(sys.argv[1] if len(sys.argv) > 1 else '.')   # папка истории: в ней layers.json и pages/
OUT = STORY / 'pages' / 'layers'
COLORS = [(255, 40, 90), (0, 190, 255), (255, 200, 0), (120, 255, 80), (200, 90, 255), (255, 130, 0)]


def px_box(frac, size):
    x, y, w, h = frac
    W, H = size
    return round(x * W), round(y * H), round((x + w) * W), round((y + h) * H)


def threshold(img, level):
    return img.point(lambda v: 255 if v >= level else 0)


def dilate(mask, radius):
    """Расширение маски; большие радиусы считаем на уменьшенной копии, чтобы было быстро."""
    if radius <= 0:
        return mask
    k = max(1, radius // 3)
    small = mask.resize((max(1, mask.width // k), max(1, mask.height // k)), Image.BOX)
    small = threshold(small, 1).filter(ImageFilter.MaxFilter(2 * max(1, round(radius / k)) + 1))
    return threshold(small.resize(mask.size, Image.BILINEAR), 128)


def close_holes(mask, radius):
    """Закрывает дырки (буквы внутри облачка): расширение, затем сужение."""
    k = 4
    small = threshold(mask.resize((max(1, mask.width // k), max(1, mask.height // k)), Image.BOX), 64)
    size = 2 * max(1, round(radius / k)) + 1
    small = small.filter(ImageFilter.MaxFilter(size)).filter(ImageFilter.MinFilter(size))
    return ImageChops.lighter(mask, threshold(small.resize(mask.size, Image.BILINEAR), 128))


def mask_poly(gray, spec):
    m = Image.new('L', gray.size, 0)
    ImageDraw.Draw(m).polygon([(x * gray.width, y * gray.height) for x, y in spec['poly']], fill=255)
    return m


def mask_bright(gray, spec):
    m = Image.new('L', gray.size, 0)
    for rect in spec['rects']:
        box = px_box(rect, gray.size)
        letters = threshold(gray.crop(box), spec.get('bright', 190))
        # «открытие» убирает светлые точки растра — остаются только толстые штрихи букв
        letters = letters.filter(ImageFilter.MinFilter(5)).filter(ImageFilter.MaxFilter(5))
        m.paste(dilate(letters, 5), box[:2])
    return m


def mask_bubbles(gray, spec):
    m = Image.new('L', gray.size, 0)
    x0, y0, x1, y1 = px_box(spec['within'], gray.size)
    x0, y0, x1, y1 = x0 + 4, y0 + 4, x1 - 4, y1 - 4
    crop = threshold(gray.crop((x0, y0, x1, y1)), 225)
    for sx, sy in spec['seeds']:
        p = (round(sx * gray.width) - x0, round(sy * gray.height) - y0)
        if crop.getpixel(p) == 255:
            ImageDraw.floodfill(crop, p, 128, thresh=0)
        else:
            print(f'  ! точка {sx, sy} попала не на белое — пропускаю')
    region = crop.point(lambda v: 255 if v == 128 else 0)
    share = sum(1 for v in region.tobytes() if v) / (region.width * region.height)
    if share > 0.45:
        print(f'  ! облачка заняли {share:.0%} панели — похоже, заливка утекла')
    region = dilate(close_holes(region, 14), 4)
    m.paste(region, (x0, y0))
    return m


def mask_text(gray, spec):
    """Буквы: тёмные пятна, вокруг которых почти везде светлая обводка, и только в строках bands."""
    cfg = spec['text']
    x0, y0, x1, y1 = px_box(cfg['box'], gray.size)
    crop = gray.crop((x0, y0, x1, y1))
    w, h = crop.size
    data = crop.tobytes()
    dark = bytearray(1 if v < 70 else 0 for v in data)
    bands = [(round(a * gray.height) - y0, round(b * gray.height) - y0) for a, b in cfg['bands']]
    seen = bytearray(w * h)
    keep = bytearray(w * h)
    accepted, doubtful = [], []
    for start in range(w * h):
        if not dark[start] or seen[start]:
            continue
        comp, queue = [], deque([start])
        seen[start] = 1
        while queue:
            i = queue.popleft()
            comp.append(i)
            x, y = i % w, i // w
            for j in ((i - 1) if x else -1, (i + 1) if x < w - 1 else -1, i - w, i + w):
                if 0 <= j < w * h and dark[j] and not seen[j]:
                    seen[j] = 1
                    queue.append(j)
        if not 20 <= len(comp) <= 20000:
            continue
        xs = [i % w for i in comp]
        ys = [i // w for i in comp]
        bw, bh = max(xs) - min(xs) + 1, max(ys) - min(ys) + 1
        cy = (min(ys) + max(ys)) / 2
        if bh > 110 or bw > 420 or not any(a <= cy <= b for a, b in bands):
            continue
        bright = total = 0
        for i in comp[::3]:
            x, y = i % w, i // w
            for dx, dy in ((2, 0), (-2, 0), (0, 2), (0, -2)):
                qx, qy = x + dx, y + dy
                if 0 <= qx < w and 0 <= qy < h and not dark[qy * w + qx]:
                    total += 1
                    bright += data[qy * w + qx] > 160
        # у букв обводка светлая на 48–80%, у мусора от рисунка — до 43%; мелким точкам нужен запас
        box = (min(xs), min(ys), max(xs), max(ys))
        if total and bright / total > (0.44 if len(comp) >= 60 else 0.6):
            accepted.append(box)
            for i in comp:
                keep[i] = 255
        elif len(comp) >= 150:
            doubtful.append((box, comp))

    # Добираем буквы-«сомневающиеся»: крупные пятна, целиком лежащие в строке между найденными буквами
    for a, b in bands:
        row = [bx for bx in accepted if a <= (bx[1] + bx[3]) / 2 <= b]
        if not row:
            continue
        left, right = min(bx[0] for bx in row), max(bx[2] for bx in row)
        top, bottom = min(bx[1] for bx in row) - 4, max(bx[3] for bx in row) + 4
        for (bx, comp) in doubtful:
            if left <= (bx[0] + bx[2]) / 2 <= right and bx[1] >= top and bx[3] <= bottom:
                for i in comp:
                    keep[i] = 255
    letters = Image.frombytes('L', (w, h), bytes(keep))
    m = Image.new('L', gray.size, 0)
    m.paste(dilate(letters, 7), (x0, y0))
    return m


def fill_holes(img, hole):
    """Заливает дырки размытием известных пикселей: сначала мелким, потом всё крупнее."""
    known = ImageOps.invert(hole)
    rgba = img.convert('RGBA')
    rgba.putalpha(known)
    pre = rgba.convert('RGBa')
    out, filled = img.copy(), known
    for r in (3, 6, 12, 24, 48, 96, 192):
        blurred = pre.filter(ImageFilter.GaussianBlur(r)).convert('RGBA')
        valid = threshold(blurred.getchannel('A'), 8)
        out.paste(blurred.convert('RGB'), mask=ImageChops.subtract(valid, filled))
        filled = ImageChops.lighter(filled, valid)
    return out


def build(src, cfg, manifest):
    page = Image.open(STORY / src).convert('RGB')
    gray = page.convert('L')
    stem = Path(src).stem
    union = Image.new('L', page.size, 0)
    preview = page.copy()
    entry = {'bg': f'pages/layers/{stem}-bg.jpg', 'layers': []}

    for n, spec in enumerate(cfg['layers']):
        print(f'{stem}: {spec["id"]}')
        if 'poly' in spec:
            mask = mask_poly(gray, spec)
        elif 'rects' in spec:
            mask = mask_bright(gray, spec)
        elif 'seeds' in spec:
            mask = mask_bubbles(gray, spec)
        else:
            mask = mask_text(gray, spec)
        bbox = mask.getbbox()
        if not bbox:
            print('  ! пустой слой — пропускаю')
            continue
        union = ImageChops.lighter(union, mask)
        alpha = mask.filter(ImageFilter.GaussianBlur(1.2))
        layer = page.convert('RGBA')
        layer.putalpha(alpha)
        layer.crop(bbox).save(OUT / f'{stem}-{spec["id"]}.webp', quality=90)
        x0, y0, x1, y1 = bbox
        W, H = page.size
        entry['layers'].append({
            'id': spec['id'],
            'src': f'pages/layers/{stem}-{spec["id"]}.webp',
            'box': [round(x0 / W, 5), round(y0 / H, 5), round((x1 - x0) / W, 5), round((y1 - y0) / H, 5)],
            'depth': spec['depth'],
            'anchor': spec['anchor'],
        })
        tint = Image.new('RGB', page.size, COLORS[n % len(COLORS)])
        preview = Image.composite(Image.blend(preview, tint, 0.45), preview, mask)

    fill_holes(page, dilate(union, 6)).save(OUT / f'{stem}-bg.jpg', quality=85)
    preview.thumbnail((900, 1300))
    preview.save(OUT / f'{stem}-preview.jpg', quality=80)
    manifest[src] = entry


def main():
    if not (STORY / 'layers.json').exists():
        sys.exit(__doc__)
    OUT.mkdir(parents=True, exist_ok=True)
    spec = json.loads((STORY / 'layers.json').read_text(encoding='utf-8'))
    manifest = {}
    for src, cfg in spec.items():
        if not src.startswith('_'):
            build(src, cfg, manifest)
    (OUT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    print('готово:', OUT)


if __name__ == '__main__':
    main()
