"""Подгоняет рамки панелей из сценария к настоящим границам панелей на странице.

Для каждого края рамки ищет рядом чёрную линию границы (в том числе наклонную) и ставит край
чуть снаружи от неё, чтобы обводка панели попала в кадр целиком, а соседняя панель — нет.
Если края наклонные, рамка становится четырёхугольником [[x, y] × 4]: левый верхний угол, правый
верхний, правый нижний, левый нижний. Края по краю страницы и края без линии рядом не трогаются.

Запуск из папки prototype:
  python3 -I tools/snap_panels.py stories/supermarket.js           — отчёт и проверочные листы
  python3 -I tools/snap_panels.py stories/supermarket.js --write   — то же и записать рамки в сценарий
  ... --only=p05.c,p13.a  — проверочный лист только с этими панелями, крупнее
  ... --as-is             — ничего не подгонять, только нарисовать листы по рамкам из сценария
                            (проверить ручные правки: --write перезаписал бы их)
Листы пишутся рядом со страницами: <папка страниц>/_snap-N.jpg — каждая панель так, как её вырежет камера.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
WORK_W = 720        # ширина, до которой уменьшаем страницу для поиска
DARK = 110          # темнее — тушь обводки
BRIGHT = 200        # светлее — промежуток между панелями
REACH = 0.035       # насколько далеко от исходного края ищем линию (доля ширины страницы)
MIN_DARK = 0.45     # меньшая доля туши вдоль линии — это не граница
GAP = 4             # где проверять, что снаружи светло (пиксели рабочего размера)

READ_PAGES = """
import { pathToFileURL } from 'node:url';
const m = await import(pathToFileURL(process.argv[1]).href);
console.log(JSON.stringify(m.pages));
"""


def corners(shape):
    """Рамка [x, y, w, h] или четырёхугольник → четыре угла по часовой стрелке от левого верхнего."""
    if isinstance(shape[0], list):
        return [tuple(p) for p in shape]
    x, y, w, h = shape
    return [(x, y), (x + w, y), (x + w, y + h), (x, y + h)]


class Page:
    def __init__(self, path):
        img = Image.open(path).convert('L')
        self.size = img.size
        small = img.resize((WORK_W, round(img.height * WORK_W / img.width)))
        self.w, self.h = small.size
        self.data = small.tobytes()

    def px(self, x, y):
        xi, yi = int(x + 0.5), int(y + 0.5)
        if 0 <= xi < self.w and 0 <= yi < self.h:
            return self.data[yi * self.w + xi]
        return 255

    def line(self, a, b, out, n):
        """Доля туши на отрезке a–b и доля светлого чуть снаружи (out — единичная нормаль наружу)."""
        dark = bright = 0
        for k in range(n):
            t = (k + 0.5) / n
            x, y = a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t
            dark += self.px(x, y) < DARK
            bright += self.px(x + out[0] * GAP, y + out[1] * GAP) > BRIGHT
        return dark / n, bright / n


def snap_edge(page, a, b, out):
    """Ищет границу возле края a–b (в рабочих пикселях). Возвращает новый край и долю туши на нём."""
    horizontal = abs(out[1]) > 0.5
    reach = REACH * page.w
    edge_pos = (a[1] + b[1]) / 2 if horizontal else (a[0] + b[0]) / 2
    limit = page.h if horizontal else page.w
    sign = out[1] if horizontal else out[0]     # куда «наружу» по оси сдвига
    # Меряем не у самых углов: там линия переходит в соседнюю границу
    a2 = (a[0] + (b[0] - a[0]) * 0.06, a[1] + (b[1] - a[1]) * 0.06)
    b2 = (a[0] + (b[0] - a[0]) * 0.94, a[1] + (b[1] - a[1]) * 0.94)
    n = max(30, int(abs(b2[0] - a2[0]) + abs(b2[1] - a2[1])) // 6)

    def shifted(da, db):
        if horizontal:
            return (a2[0], a2[1] + da), (b2[0], b2[1] + db)
        return (a2[0] + da, a2[1]), (b2[0] + db, b2[1])

    def score(da, db):
        p, q = shifted(da, db)
        dark, bright = page.line(p, q, out, n)
        near = 1 - 0.25 * (abs(da) + abs(db)) / (2 * reach)    # при равенстве — ближе к исходному краю
        return dark * (0.4 + 0.6 * bright) * near, dark

    def dark_at(da, db):
        return page.line(*shifted(da, db), (0, 0), n)[0]

    if edge_pos < 0.006 * limit or edge_pos > 0.994 * limit:
        # У кромки страницы рамки часто нет — рисунок уходит в обрез. Но если панель стоит с полем,
        # её обводка — длинная ровная линия с белым полем снаружи: ищем такую чуть внутри
        for k in range(5, int(0.13 * limit)):
            dark, bright = page.line(*shifted(-sign * k, -sign * k), out, n)
            if dark >= 0.75 and bright >= 0.85:
                da = db = -sign * k
                break
        else:
            return a, b, None
    else:
        best = (-1, 0, 0, 0)
        steps = range(-int(reach), int(reach) + 1, 3)
        for da in steps:
            for db in steps:
                s, dark = score(da, db)
                if s > best[0]:
                    best = (s, dark, da, db)
        _, _, da0, db0 = best
        for da in range(da0 - 3, da0 + 4):
            for db in range(db0 - 3, db0 + 4):
                s, dark = score(da, db)
                if s > best[0]:
                    best = (s, dark, da, db)
        _, dark, da, db = best
        if dark < MIN_DARK:
            return a, b, dark
        # Если сразу внутри — светлая полоса и ещё одна линия, то мы стоим на обводке соседа,
        # а наша — та, внутренняя
        prof = [dark_at(da - sign * k, db - sign * k) for k in range(1, 17)]
        gap = next((i for i, v in enumerate(prof) if v < 0.15), None)
        if gap is not None:
            inner = next((i for i in range(gap, 16) if prof[i] >= max(0.6, 0.7 * dark)), None)
            if inner is not None:
                da, db, dark = da - sign * (inner + 1), db - sign * (inner + 1), prof[inner]
    # Найденная линия может лежать посреди толстой обводки — выходим к её наружному краю
    k = 0
    while k < 8:
        p, q = shifted(da + sign * (k + 1), db + sign * (k + 1))
        if page.line(p, q, (0, 0), n)[0] < dark * 0.5:
            break
        k += 1
    # Ещё полтора пикселя запаса — только если снаружи светлый промежуток, а не соседний рисунок
    p, q = shifted(da + sign * (k + 2), db + sign * (k + 2))
    pad = 1.5 if page.line(p, q, (0, 0), n)[0] < 0.1 else 0.5
    da, db = da + sign * (k + pad), db + sign * (k + pad)
    # Возвращаем край на всю исходную длину (углы потом найдём пересечением соседних краёв)
    if horizontal:
        return (a[0], a[1] + (da * 0.94 - db * 0.06) / 0.88), (b[0], b[1] + (db * 0.94 - da * 0.06) / 0.88), dark
    return (a[0] + (da * 0.94 - db * 0.06) / 0.88, a[1]), (b[0] + (db * 0.94 - da * 0.06) / 0.88, b[1]), dark


def intersect(l1, l2):
    (x1, y1), (x2, y2) = l1
    (x3, y3), (x4, y4) = l2
    d = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
    if abs(d) < 1e-9:
        return x2, y2
    t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / d
    return x1 + t * (x2 - x1), y1 + t * (y2 - y1)


def snap(page, shape):
    pts = [(x * page.w, y * page.h) for x, y in corners(shape)]
    outs = [(0, -1), (1, 0), (0, 1), (-1, 0)]          # верх, право, низ, лево
    edges, found = [], []
    for i in range(4):
        a, b, dark = snap_edge(page, pts[i], pts[(i + 1) % 4], outs[i])
        edges.append((a, b))
        found.append(dark)
    quad = [intersect(edges[(i + 3) % 4], edges[i]) for i in range(4)]
    quad = [(min(1, max(0, x / page.w)), min(1, max(0, y / page.h))) for x, y in quad]
    # Почти прямоугольник — пишем как [x, y, w, h], так проще читать сценарий
    xs, ys = [p[0] for p in quad], [p[1] for p in quad]
    tilt = max(abs(quad[0][1] - quad[1][1]), abs(quad[3][1] - quad[2][1]),
               abs(quad[0][0] - quad[3][0]), abs(quad[1][0] - quad[2][0]))
    if tilt < 0.003:
        return [round(min(xs), 4), round(min(ys), 4), round(max(xs) - min(xs), 4), round(max(ys) - min(ys), 4)], found
    return [[round(x, 4), round(y, 4)] for x, y in quad], found


def draw(img, shape, color, width):
    d = ImageDraw.Draw(img)
    pts = [(x * img.width, y * img.height) for x, y in corners(shape)]
    d.line(pts + pts[:1], fill=color, width=width)
    return pts


def sheets(pages, result, folder, only=None):
    """Каждая панель так, как её вырежет камера: внутри рамки — как есть, снаружи — притушено.
    Чужой кусочек у края внутри рамки сразу заметен."""
    cell, cols, per = (520, 4, 12) if only else (360, 6, 24)
    shots = []
    for pid, page in pages.items():
        img = Image.open(ROOT / page['src']).convert('RGB')
        W, H = img.size
        dim = img.point(lambda v: v // 4)
        for key in page['panels']:
            if only and f'{pid}.{key}' not in only:
                continue
            pts = corners(result[pid][key])
            mask = Image.new('L', img.size, 0)
            ImageDraw.Draw(mask).polygon([(x * W, y * H) for x, y in pts], fill=255)
            xs, ys = [x for x, _ in pts], [y for _, y in pts]
            m = 0.012
            box = (round(max(0, min(xs) - m) * W), round(max(0, min(ys) - m) * H),
                   round(min(1, max(xs) + m) * W), round(min(1, max(ys) + m) * H))
            shot = Image.composite(img, dim, mask).crop(box)
            shot.thumbnail((cell, cell))
            ImageDraw.Draw(shot).text((4, 2), f'{pid}.{key}', fill=(255, 0, 60), font_size=16)
            shots.append(shot)
    for n in range(0, len(shots), per):
        group = shots[n:n + per]
        rows = (len(group) - 1) // cols + 1
        sheet = Image.new('RGB', (cols * (cell + 6), rows * (cell + 6)), (90, 90, 90))
        for i, shot in enumerate(group):
            x, y = (i % cols) * (cell + 6), (i // cols) * (cell + 6)
            sheet.paste(shot, (x + (cell - shot.width) // 2, y + (cell - shot.height) // 2))
        sheet.save(folder / f'_snap{"-only" if only else ""}-{n // per + 1}.jpg', quality=88)


def literal(shape):
    num = lambda v: f'{v:.4f}'.rstrip('0').rstrip('.') if v not in (0, 1) else str(int(v))
    if isinstance(shape[0], list):
        return '[' + ', '.join(f'[{num(x)}, {num(y)}]' for x, y in shape) + ']'
    return '[' + ', '.join(num(v) for v in shape) + ']'


def write_back(story, result):
    text = story.read_text(encoding='utf-8')
    for pid, panels in result.items():
        start = re.search(rf'^\s*{pid}\s*:', text, re.M)
        for key, shape in panels.items():
            m = re.compile(rf'^(\s*{key}\s*:\s*)\[.*\](,\s*)$', re.M).search(text, start.end())
            text = text[:m.start()] + m.group(1) + literal(shape) + m.group(2) + text[m.end():]
    story.write_text(text, encoding='utf-8')


def main():
    story = Path(sys.argv[1])
    pages = json.loads(subprocess.run(['node', '--input-type=module', '-e', READ_PAGES, str(story.resolve())],
                                      check=True, capture_output=True, text=True).stdout)
    result = {}
    for pid, page in pages.items():
        img = Page(ROOT / page['src'])
        result[pid] = {}
        for key, shape in page['panels'].items():
            if '--as-is' in sys.argv:
                result[pid][key] = shape
                continue
            new, found = snap(img, shape)
            result[pid][key] = new
            marks = ''.join('·' if f is None else ('?' if f < MIN_DARK else '+') for f in found)
            weak = [f'{s}:{f:.0%}' for s, f in zip('ВПНЛ', found) if f is not None and f < 0.75]
            print(f'{pid}.{key}: {marks}  {"четырёхугольник " if isinstance(new[0], list) else ""}'
                  f'{literal(new)}{"  мало туши " + " ".join(weak) if weak else ""}')
    only = next((a.split('=', 1)[1].split(',') for a in sys.argv if a.startswith('--only=')), None)
    sheets(pages, result, (ROOT / next(iter(pages.values()))['src']).parent, only)
    if '--write' in sys.argv and '--as-is' not in sys.argv:
        write_back(story, result)
        print('рамки записаны в', story)
    print('края: верх право низ лево · + найдена линия, ? линии нет, · край страницы')


if __name__ == '__main__':
    main()
