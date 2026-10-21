"""Eternia wordmark for the setup screen (assets/logo.webp), drawn with the sheet's font: no third-party art.

    python tools/make-logo.py

Parchment letters with a gold edge over a soft dark-green shadow (readable on light and dark
backgrounds), and the gold rule with diamonds of the token nameplates under the name.
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FONT = os.path.join(ROOT, "assets", "fonts", "eczar", "Eczar-SemiBold.woff2")
OUT = os.path.join(ROOT, "assets", "logo.webp")

W, H = 800, 400
NAME = "ETERNIA"
SIZE = 120
TRACKING = 0.12
STROKE = 4
GOLD = (190, 146, 58, 255)
GOLD_DARK = (122, 88, 30, 255)
SHADOW = (12, 38, 27)
TOP = np.array([248, 242, 226], np.float32)
BOTTOM = np.array([222, 203, 160], np.float32)


def text_mask(font, stroke=0):
    """The name, letter by letter with tracking, as an L mask centered in the canvas."""
    widths = [font.getlength(ch) for ch in NAME]
    gap = SIZE * TRACKING
    total = sum(widths) + gap * (len(NAME) - 1)
    mask = Image.new("L", (W, H), 0)
    draw = ImageDraw.Draw(mask)
    top, bottom = font.getbbox(NAME)[1], font.getbbox(NAME)[3]
    y = 160 - (top + bottom) / 2
    x = (W - total) / 2
    for ch, w in zip(NAME, widths):
        draw.text((x, y), ch, font=font, fill=255, stroke_width=stroke, stroke_fill=255)
        x += w + gap
    return mask


def rule(draw, y, fill=GOLD, outline=GOLD_DARK):
    """Gold rule with a diamond at each end and one in the middle."""
    left, right = 230, W - 230
    draw.line([(left + 14, y), (right - 14, y)], fill=fill, width=3)
    for cx, r in ((left, 9), (W / 2, 12), (right, 9)):
        draw.polygon([(cx, y - r), (cx + r, y), (cx, y + r), (cx - r, y)], fill=fill, outline=outline)


def main():
    font = ImageFont.truetype(FONT, SIZE)
    mask = text_mask(font)

    out = Image.new("RGBA", (W, H), (0, 0, 0, 0))

    # Soft shadow under the letters and the rule
    shadow_mask = text_mask(font, STROKE)
    rule_mask = Image.new("L", (W, H), 0)
    rule(ImageDraw.Draw(rule_mask), 252, 255, 255)
    shadow_mask = Image.composite(Image.new("L", (W, H), 255), shadow_mask, rule_mask)
    shadow_mask = shadow_mask.filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.GaussianBlur(7))
    shadow = Image.new("RGBA", (W, H), SHADOW + (0,))
    shadow.putalpha(shadow_mask.point(lambda v: int(v * 0.75)))
    out.alpha_composite(shadow, (0, 4))

    # Gold edge: the letters drawn with a stroke
    edge = text_mask(font, STROKE)
    gold = Image.new("RGBA", (W, H), GOLD)
    gold.putalpha(edge)
    out.alpha_composite(gold)

    # Parchment fill, lighter at the top
    t = np.linspace(0, 1, H, dtype=np.float32)[:, None, None]
    fill = (TOP + (BOTTOM - TOP) * t).repeat(W, axis=1)
    fill_img = Image.fromarray(np.clip(fill, 0, 255).astype(np.uint8), "RGB").convert("RGBA")
    fill_img.putalpha(mask)
    out.alpha_composite(fill_img)

    rule(ImageDraw.Draw(out), 252)

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    out.save(OUT, "WEBP", quality=92, method=6)
    print(f"wrote {os.path.relpath(OUT, ROOT)}")


if __name__ == "__main__":
    main()
