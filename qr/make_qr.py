"""Generates the trading-card QR code for Blüe's Fan Club.

Needs: pip install segno pillow opencv-python-headless
Run:   python qr/make_qr.py   (from the repo root)

Writes SVG and PNG versions, with and without the center heart, then decodes every
PNG (including small, blurred copies that imitate print size) to confirm it scans.
"""
import math
import os
import segno
from PIL import Image, ImageDraw, ImageFilter

URL = 'https://cjflanagan1.github.io/blue-fan-club/'
BORDER = 4            # quiet zone, in modules
HEART_MODULES = 6.5   # heart width in modules; kept small so error correction covers it easily
INK = '#000000'
HEART = '#c0262d'     # red used on the card
OUT = os.path.dirname(os.path.abspath(__file__))

# H (30% recovery, version 5 = 37 modules). Tested against Q (version 4, 33 modules):
# H still scanned at smaller, blurrier sizes with the heart in place, so it wins.
qr = segno.make(URL, error='h', boost_error=False, micro=False)
matrix = [list(row) for row in qr.matrix]
n = len(matrix)
size = n + 2 * BORDER


def heart_points(cx, cy, width, steps=200):
    # Classic parametric heart, scaled so its width equals `width`.
    pts = []
    for i in range(steps):
        t = 2 * math.pi * i / steps
        x = 16 * math.sin(t) ** 3
        y = -(13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t))
        pts.append((x, y))
    s = width / 32
    return [(cx + x * s, cy + (y + 2.5) * s) for x, y in pts]


CLEAR = 9  # whole modules cleared behind the heart (odd so it stays centered)


def modules(heart):
    if not heart:
        return matrix
    lo = (n - CLEAR) // 2
    return [[on and not (lo <= x < lo + CLEAR and lo <= y < lo + CLEAR) for x, on in enumerate(row)]
            for y, row in enumerate(matrix)]


def write_svg(path, heart):
    rects = []
    for y, row in enumerate(modules(heart)):
        for x, on in enumerate(row):
            if on:
                rects.append(f'M{x + BORDER} {y + BORDER}h1v1h-1z')
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" shape-rendering="crispEdges">',
        f'<rect width="{size}" height="{size}" fill="#fff"/>',
        f'<path fill="{INK}" d="{"".join(rects)}"/>',
    ]
    if heart:
        c = size / 2
        pts = ' '.join(f'{x:.3f},{y:.3f}' for x, y in heart_points(c, c, HEART_MODULES))
        parts.append(f'<polygon fill="{HEART}" shape-rendering="geometricPrecision" points="{pts}"/>')
    parts.append('</svg>')
    with open(path, 'w') as f:
        f.write('\n'.join(parts) + '\n')


def render_png(heart, module_px=40):
    img = Image.new('RGB', (size * module_px, size * module_px), 'white')
    d = ImageDraw.Draw(img)
    for y, row in enumerate(modules(heart)):
        for x, on in enumerate(row):
            if on:
                x0, y0 = (x + BORDER) * module_px, (y + BORDER) * module_px
                d.rectangle([x0, y0, x0 + module_px - 1, y0 + module_px - 1], fill=INK)
    if heart:
        c = size * module_px / 2
        d.polygon(heart_points(c, c, HEART_MODULES * module_px), fill=HEART)
    return img


def decodes(img):
    import cv2
    import numpy as np
    arr = cv2.cvtColor(np.array(img.convert('RGB')), cv2.COLOR_RGB2BGR)
    text, _, _ = cv2.QRCodeDetector().detectAndDecode(arr)
    return text == URL


def main():
    print(f'QR version {qr.version}, error level {qr.error.upper()}, {n}x{n} modules')
    ok = True
    for heart, name in ((True, 'blue-fan-club-qr-heart'), (False, 'blue-fan-club-qr-plain')):
        write_svg(os.path.join(OUT, name + '.svg'), heart)
        img = render_png(heart)
        img.save(os.path.join(OUT, name + '.png'), dpi=(1200, 1200))
        # Imitate small print: shrink to ~3 px per module and blur slightly, then
        # place on a cream background like the card.
        checks = {'full size': img}
        for px in (150, 135, 120, 110):
            small = img.resize((px, px), Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.6))
            bg = Image.new('RGB', (px * 2, px * 2), (247, 238, 220))
            bg.paste(small, (px // 2, px // 2))
            checks[f'{px}px blurred'] = bg.resize((px * 4, px * 4), Image.NEAREST)
        for label, test_img in checks.items():
            result = decodes(test_img)
            ok &= result
            print(f'  {name} {label}: {"scans" if result else "FAILED"}')
    raise SystemExit(0 if ok else 1)


if __name__ == '__main__':
    main()
