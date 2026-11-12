"""Rebuild public/about/poster/*.webp from the Graphic Design export of the launch poster.

Usage: python scripts/poster-assets.py <folder with the PNG exports>
Needs Pillow, numpy and scipy. Source files are matched by the timestamp suffix of the export
(same names as the first export, 12 Nov). All layers share one canvas, so a 2x export
(2160 x 2700) works without changing any code.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

SRC = Path(sys.argv[1])
DST = Path(__file__).resolve().parent.parent / "public/about/poster"
LAYERS = {"paper": "180209", "wordmark": "180229", "car": "180234", "branch": "180217", "petals": "180248"}


def find(suffix):
    return next(SRC.glob(f"*{suffix}.png"))


def clean_wash(a, max_alpha):
    """Drop the poster's faint grey wash (low alpha, no colour) so layers do not show box edges."""
    al, rgb = a[..., 3], a[..., :3].astype(int)
    al[(al < max_alpha) & ((rgb.max(-1) - rgb.min(-1)) < 30)] = 0
    return a


for name, suffix in LAYERS.items():
    im = Image.open(find(suffix))
    if name == "paper":
        im.convert("RGB").save(DST / "paper.webp", "WEBP", quality=72, method=6)
        continue
    a = np.array(im.convert("RGBA"))
    if name == "branch":
        a = clean_wash(a, 90)
        box = Image.fromarray(a).getchannel("A").getbbox()
        Image.fromarray(a).crop(box).save(DST / "branch.webp", "WEBP", quality=82, method=6)
        continue
    if name == "petals":
        a = clean_wash(a, 40)
        lab, _ = ndimage.label(a[..., 3] > 20)
        for e in set(np.unique(np.concatenate([lab[:, 0], lab[:, -1], lab[0, :], lab[-1, :]]))) - {0}:
            a[..., 3][lab == e] = 0  # petals cut by the poster's own edge
    Image.fromarray(a).save(DST / f"{name}.webp", "WEBP", quality=82, method=6)

logo = Image.open(next(SRC.glob("IMG_*.PNG"))).convert("RGBA")
logo = logo.crop(logo.getchannel("A").getbbox())
logo.thumbnail((512, 512))
logo.save(DST.parent.parent / "brand/logo.webp", "WEBP", quality=90, method=6)  # header mark, not a poster layer
print("done:", sorted(p.name for p in DST.glob("*.webp")))
