"""Textures of the parchment character sheet (styles/sheet.css), drawn from noise: no third-party art.

    python tools/make-textures.py

Writes assets/sheet/:
- parchment.webp     the page: warm off-white paper with soft mottling and darker edges
- header.webp        the dark green band behind the name (repeats horizontally)
- sidebar.webp       the green banner of the sidebar, with gold edges (stretched to the sheet height)
- sidebar-tail.webp  the swallowtail end of the banner
and tools/_textures.png, a contact sheet for review (not packaged).
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(HERE), "assets", "sheet")
rng = np.random.default_rng(1427)


def noise(w, h, blur, sx=1.0, sy=1.0):
    """Gaussian-blurred white noise in [-1, 1]; sx/sy stretch it (streaks)."""
    gw, gh = max(2, int(w / sx)), max(2, int(h / sy))
    im = Image.fromarray((rng.random((gh, gw)) * 255).astype(np.uint8), "L")
    if blur:
        im = im.filter(ImageFilter.GaussianBlur(blur))
    im = im.resize((w, h), Image.BICUBIC)
    a = np.asarray(im, dtype=np.float32)
    a -= a.mean()
    return a / (np.abs(a).max() or 1)


def lerp(a, b, t):
    return a + (b - a) * t


def parchment(w=900, h=1200):
    base = np.array([246, 241, 229], np.float32)
    edge = np.array([214, 197, 163], np.float32)
    mottle = 0.55 * noise(w, h, 40) + 0.3 * noise(w, h, 12) + 0.15 * noise(w, h, 3)
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.sqrt(((x - w / 2) / (w / 2)) ** 2 + ((y - h / 2) / (h / 2)) ** 2) / np.sqrt(2)
    vig = np.clip((d - 0.38) / 0.62, 0, 1) ** 1.6
    img = lerp(base, edge, (vig * 0.85)[..., None])
    img += mottle[..., None] * np.array([7, 8, 12], np.float32) * -1
    img += (rng.random((h, w, 1)) - 0.5) * 5
    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), "RGB")


def cloth(w, h, top, mid, bottom):
    """Green cloth: vertical gradient, fine weave and a darker band at the sides."""
    top, mid, bottom = (np.array(c, np.float32) for c in (top, mid, bottom))
    t = np.linspace(0, 1, h, dtype=np.float32)[:, None, None]
    grad = np.where(t < 0.5, lerp(top, mid, t * 2), lerp(mid, bottom, (t - 0.5) * 2))
    grad = np.broadcast_to(grad, (h, w, 3)).copy()
    weave = 0.5 * noise(w, h, 0.6) + 0.35 * noise(w, h, 1.2, sx=1, sy=6) + 0.25 * noise(w, h, 18)
    grad *= (1 + 0.07 * weave)[..., None]
    return grad


def header(w=800, h=90):
    img = cloth(w, h, (40, 88, 60), (31, 74, 50), (22, 56, 37))
    y = np.arange(h, dtype=np.float32)[:, None, None]
    img *= 1 - 0.25 * np.clip((y - (h - 10)) / 10, 0, 1)   # shade into the navigation band
    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), "RGB")


GOLD = (201, 169, 78, 255)
GOLD_DIM = (150, 122, 52, 255)


def sidebar(w=224, h=720):
    img = cloth(w, h, (22, 56, 37), (32, 78, 53), (26, 66, 45))
    x = np.arange(w, dtype=np.float32)[None, :, None]
    side = np.minimum(x, w - 1 - x)
    img *= 1 - 0.28 * np.clip(1 - side / 22, 0, 1) ** 2      # darker towards the edges
    rgba = np.dstack([np.clip(img, 0, 255), np.full((h, w), 255, np.float32)]).astype(np.uint8)
    im = Image.fromarray(rgba, "RGBA")
    d = ImageDraw.Draw(im)
    for xx, col in ((2, GOLD), (w - 3, GOLD), (4, GOLD_DIM), (w - 5, GOLD_DIM)):
        d.line([(xx, 0), (xx, h)], fill=col, width=1)
    return im


def sidebar_tail(w=224, h=52, s=4):
    """Swallowtail end of the banner, drawn 4x and scaled down (smooth edges)."""
    W, H = w * s, h * s
    body = cloth(W, H, (26, 66, 45), (25, 63, 43), (24, 60, 41))
    x = np.arange(W, dtype=np.float32)[None, :, None]
    side = np.minimum(x, W - 1 - x) / s
    body *= 1 - 0.28 * np.clip(1 - side / 22, 0, 1) ** 2
    tex = Image.fromarray(np.dstack([np.clip(body, 0, 255), np.full((H, W), 255, np.float32)]).astype(np.uint8), "RGBA")
    mask = Image.new("L", (W, H), 0)
    notch = 19
    shape = [(0, 0), (W, 0), (W, (h - 0.5) * s), (W / 2, notch * s), (0, (h - 0.5) * s)]
    ImageDraw.Draw(mask).polygon(shape, fill=255)
    out = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    out.paste(tex, (0, 0), mask)
    d = ImageDraw.Draw(out)
    for off, col, width in ((2.5, GOLD, 1.2), (4.5, GOLD_DIM, 1.0)):
        o = off * s
        d.line([(o, 0), (o, (h - 3 - off * 0.4) * s), (W / 2, (notch + off * 1.1) * s), (W - o, (h - 3 - off * 0.4) * s), (W - o, 0)],
               fill=col, width=int(width * s), joint="curve")
    cx, cy, r = W / 2, (notch - 9) * s, 3.2 * s          # a small gold diamond above the notch
    d.polygon([(cx, cy - r), (cx + r, cy), (cx, cy + r), (cx - r, cy)], fill=GOLD)
    return out.resize((w, h), Image.LANCZOS)


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    pieces = {
        "parchment.webp": parchment(),
        "header.webp": header(),
        "sidebar.webp": sidebar(),
        "sidebar-tail.webp": sidebar_tail(),
    }
    for name, im in pieces.items():
        im.save(os.path.join(OUT, name), "WEBP", quality=88, method=6)
        print(f"{name}: {im.size[0]}x{im.size[1]}, {os.path.getsize(os.path.join(OUT, name)) // 1024} KB")

    # Contact sheet: the page with the header band and the banner on top, as on the sheet.
    sheet = Image.new("RGB", (760, 760), (60, 60, 60))
    page = pieces["parchment.webp"].resize((750, 750))
    sheet.paste(page, (5, 5))
    for x in range(5, 755, 800):
        sheet.paste(pieces["header.webp"].crop((0, 0, 750, 90)), (5, 5))
    banner = pieces["sidebar.webp"].resize((224, 698))
    sheet.paste(banner, (13, 5), banner)
    tail = pieces["sidebar-tail.webp"]
    sheet.paste(tail, (13, 703), tail)
    preview = os.path.join(HERE, "_textures.png")
    sheet.save(preview)
    print("preview:", preview)
