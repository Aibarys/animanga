"""Готовит «живые панели»: карту весов, по которой шейдер в браузере слегка деформирует скан.

Слои не вырезаются, а значит, за ними не бывает дыр: двигается сам рисунок, как в Live2D.
Читает tools/living.json, для каждой панели пишет в pages/living/:
  <страница>-<id>-map.png      — R: качание (волосы), G: дыхание (тело, голова), B: струение (нарисованный дым)
  <страница>-<id>-preview.jpg  — проверочная картинка: веса цветом поверх панели
  manifest.json                — рамки, карты и параметры движения

Запуск из папки prototype:  python3 -I tools/make_living.py
"""
import json
import math
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'pages' / 'living'
MOTIONS = ['sway', 'breathe', 'flow']   # порядок = каналы R, G, B
SCALE = 0.5                             # веса гладкие, хватает карты в половину разрешения
EDGE = 4                                # у краёв рамки рисунок стоит на месте (пиксели карты)


def ramp(spec, box, size, aspect):
    """Множитель 0…1: по вертикали (y: [где 0, где 1]) или от точки (from + reach)."""
    x, y, w, h = box
    mw, mh = size
    curve = spec.get('curve', 1)
    if 'y' in spec:
        a, b = spec['y']
        col = [min(1, max(0, (y + (j + 0.5) / mh * h - a) / (b - a))) ** curve for j in range(mh)]
        img = Image.new('L', (1, mh))
        img.putdata([round(255 * v) for v in col])
        return img.resize(size, Image.NEAREST)
    fx, fy = spec['from']
    data = []
    for j in range(mh):
        py = (y + (j + 0.5) / mh * h - fy) * aspect   # расстояние считаем в ширинах страницы
        for i in range(mw):
            px = x + (i + 0.5) / mw * w - fx
            data.append(round(255 * min(1, math.hypot(px, py) / spec['reach']) ** curve))
    img = Image.new('L', size)
    img.putdata(data)
    return img


def polygon(points, box, size, value=255):
    x, y, w, h = box
    mw, mh = size
    m = Image.new('L', size, 0)
    ImageDraw.Draw(m).polygon([((px - x) / w * mw, (py - y) / h * mh) for px, py in points], fill=value)
    return m


def build(src, panel, manifest):
    page = Image.open(ROOT / src).convert('RGB')
    W, H = page.size
    box = panel['box']
    x, y, w, h = box
    size = (round(w * W * SCALE), round(h * H * SCALE))
    channels = {m: Image.new('L', size, 0) for m in MOTIONS}

    for region in panel['regions']:
        m = polygon(region['poly'], box, size, round(255 * region.get('weight', 1)))
        m = m.filter(ImageFilter.GaussianBlur(region.get('soft', 8)))
        if 'ramp' in region:
            m = ImageChops.multiply(m, ramp(region['ramp'], box, size, H / W))
        channels[region['motion']] = ImageChops.lighter(channels[region['motion']], m)

    # Закреплённое: края рамки (иначе поедет обводка панели) и то, что перечислено в pins
    edge = Image.new('L', size, 0)
    ImageDraw.Draw(edge).rectangle([EDGE, EDGE, size[0] - 1 - EDGE, size[1] - 1 - EDGE], fill=255)
    edge = edge.filter(ImageFilter.GaussianBlur(EDGE / 2))
    for motion in MOTIONS:
        keep = edge.copy()
        for pin in panel.get('pins', []):
            if motion in pin['motions']:
                hole = polygon(pin['poly'], box, size).filter(ImageFilter.GaussianBlur(3))
                keep = ImageChops.subtract(keep, hole)
        channels[motion] = ImageChops.multiply(channels[motion], keep)

    stem = f'{Path(src).stem}-{panel["id"]}'
    Image.merge('RGB', [channels[m] for m in MOTIONS]).save(OUT / f'{stem}-map.png')

    crop = page.crop((round(x * W), round(y * H), round((x + w) * W), round((y + h) * H))).resize(size)
    preview = crop
    for motion, color in zip(MOTIONS, [(255, 40, 90), (0, 190, 255), (255, 200, 0)]):
        tint = Image.new('RGB', size, color)
        preview = Image.composite(tint, preview, channels[motion].point(lambda v: v * 0.6))
    preview.save(OUT / f'{stem}-preview.jpg', quality=82)

    manifest.setdefault(src, []).append({
        'id': panel['id'],
        'box': box,
        'map': f'pages/living/{stem}-map.png',
        'motion': panel['motion'],
    })
    print(f'{stem}: карта {size[0]}×{size[1]}')


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    spec = json.loads((ROOT / 'tools' / 'living.json').read_text(encoding='utf-8'))
    manifest = {}
    for src, panels in spec.items():
        if not src.startswith('_'):
            for panel in panels:
                build(src, panel, manifest)
    (OUT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    print('готово:', OUT)


if __name__ == '__main__':
    main()
