"""Seamless stylized ground tiles (cel-banded earth + grass), procedural.

  python assets/terrain/ground/make-ground-tiles.py [out_dir]

Writes ground-dirt.webp (1024, repeats every 10 world units) and ground-grass.webp (512).
Light comes from texture-space (+u, -v) = screen upper-left, matching the sprite rim light.
Tones are mid-value (L about 45-55) so sprites and additive VFX stay readable on top.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[3] / 'apps/client/public/assets/terrain'
OUT.mkdir(parents=True, exist_ok=True)


def periodic_noise(size, cutoff, seed):
    """Low-pass filtered white noise via FFT: periodic by construction (seamless)."""
    rng = np.random.default_rng(seed)
    spectrum = np.fft.fft2(rng.standard_normal((size, size)))
    fx = np.fft.fftfreq(size)[:, None] * size
    fy = np.fft.fftfreq(size)[None, :] * size
    spectrum *= np.exp(-((fx ** 2 + fy ** 2) / (2 * cutoff ** 2)))
    out = np.real(np.fft.ifft2(spectrum))
    return (out - out.min()) / (out.max() - out.min())


def banded(noise, tones, cuts):
    """Map a 0..1 noise field to flat cel tones separated at `cuts`."""
    img = np.zeros(noise.shape + (3,))
    level = np.digitize(noise, cuts)
    for i, tone in enumerate(tones):
        img[level == i] = tone
    return img


def draw_wrapped(draw, size, fn):
    for ox in (-size, 0, size):
        for oy in (-size, 0, size):
            fn(draw, ox, oy)


def to_image(arr):
    return Image.fromarray((np.clip(arr, 0, 1) * 255).astype(np.uint8))


def dirt_tile(size=1024):
    ss = size * 2
    noise = .6 * periodic_noise(ss, 5, 1) + .4 * periodic_noise(ss, 14, 2)
    noise = (noise - noise.min()) / (noise.max() - noise.min())
    tones = [np.array(t) for t in ((.50, .37, .24), (.60, .45, .29), (.68, .52, .33))]
    img = to_image(banded(noise, tones, [.38, .66]))
    draw = ImageDraw.Draw(img)
    rng = np.random.default_rng(3)
    for _ in range(22):  # chunky pebbles: dark outline, lit upper-left, shadowed lower-right
        x, y = rng.uniform(0, ss, 2)
        w, h = rng.uniform(26, 70), rng.uniform(18, 46)

        def pebble(d, ox, oy, x=x, y=y, w=w, h=h):
            cx, cy = x + ox, y + oy
            d.ellipse([cx - w - 4, cy - h - 4, cx + w + 4, cy + h + 4], fill=(70, 48, 30))
            d.ellipse([cx - w, cy - h, cx + w, cy + h], fill=(150, 124, 98))
            d.ellipse([cx - w * .75 + w * .25, cy - h * .75 - h * .2, cx + w * .55 + w * .25, cy + h * .45 - h * .2], fill=(188, 160, 126))
            d.ellipse([cx - w * .8 - w * .1, cy + h * .25, cx + w * .8 - w * .1, cy + h * .95], fill=(118, 94, 72))
        draw_wrapped(draw, ss, pebble)
    for _ in range(12):  # short hand-drawn cracks
        x, y = rng.uniform(0, ss, 2)
        ang = rng.uniform(0, 6.28)
        pts = [(x, y)]
        for _ in range(4):
            ang += rng.uniform(-.6, .6)
            x, y = x + np.cos(ang) * rng.uniform(18, 34), y + np.sin(ang) * rng.uniform(18, 34)
            pts.append((x, y))

        def crack(d, ox, oy, pts=pts):
            d.line([(px + ox, py + oy) for px, py in pts], fill=(76, 54, 36), width=5)
        draw_wrapped(draw, ss, crack)
    return img.resize((size, size), Image.LANCZOS)


def grass_tile(size=512):
    ss = size * 2
    noise = .7 * periodic_noise(ss, 6, 11) + .3 * periodic_noise(ss, 16, 12)
    noise = (noise - noise.min()) / (noise.max() - noise.min())
    tones = [np.array(t) for t in ((.27, .50, .17), (.34, .58, .21), (.43, .66, .26))]
    img = to_image(banded(noise, tones, [.40, .68]))
    draw = ImageDraw.Draw(img)
    rng = np.random.default_rng(13)
    for _ in range(420):  # blade ticks, light side toward upper-left
        x, y = rng.uniform(0, ss, 2)
        lit = rng.random() < .55

        def blade(d, ox, oy, x=x, y=y, lit=lit):
            d.line([(x + ox, y + oy), (x + ox + 6, y + oy - 14)], fill=(150, 205, 90) if lit else (36, 84, 34), width=4)
        draw_wrapped(draw, ss, blade)
    return img.resize((size, size), Image.LANCZOS)


if __name__ == '__main__':
    dirt_tile().save(OUT / 'ground-dirt.webp', quality=88, method=6)
    grass_tile().save(OUT / 'ground-grass.webp', quality=88, method=6)
    print('wrote', OUT)
