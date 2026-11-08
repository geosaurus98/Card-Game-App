"""Generate simple placeholder PNG icons for the PWA.

Usage: python3 tools/make_icons.py   (requires Pillow: pip install pillow)
Writes into ../icons/.
"""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "icons"
BG = (21, 101, 70)        # felt green (matches theme_color)
CARD = (250, 248, 240)
INK = (24, 24, 27)
RED = (196, 30, 58)


def spade(d, cx, cy, s, fill):
    """Draw a spade centred on (cx, cy) with overall height ~s."""
    r = s * 0.24
    # two lobes
    d.ellipse([cx - 2 * r + r * 0.15, cy - r * 0.2, cx + r * 0.15, cy + r * 1.8], fill=fill)
    d.ellipse([cx - r * 0.15, cy - r * 0.2, cx + 2 * r - r * 0.15, cy + r * 1.8], fill=fill)
    # top point
    d.polygon([(cx, cy - s * 0.5), (cx - 2 * r + r * 0.2, cy + r * 0.75), (cx + 2 * r - r * 0.2, cy + r * 0.75)], fill=fill)
    # stem
    d.polygon([(cx, cy + r * 0.6), (cx - r * 0.75, cy + s * 0.5), (cx + r * 0.75, cy + s * 0.5)], fill=fill)


def heart(d, cx, cy, s, fill):
    r = s * 0.26
    d.ellipse([cx - 2 * r, cy - s * 0.42, cx, cy - s * 0.42 + 2 * r], fill=fill)
    d.ellipse([cx, cy - s * 0.42, cx + 2 * r, cy - s * 0.42 + 2 * r], fill=fill)
    d.polygon([(cx - 2 * r + 1, cy - s * 0.42 + r * 1.2), (cx + 2 * r - 1, cy - s * 0.42 + r * 1.2), (cx, cy + s * 0.48)], fill=fill)


def make(size, maskable=False, rounded=True):
    scale = 4  # supersample for smooth edges
    S = size * scale
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if maskable or not rounded:
        d.rectangle([0, 0, S, S], fill=BG)
    else:
        d.rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * 0.2), fill=BG)
    # Maskable icons must keep content inside the central 80% "safe zone".
    content = 0.62 if maskable else 0.8
    cw, ch = S * content * 0.62, S * content * 0.86
    cx, cy = S / 2, S / 2
    # back card (tilted look via offset)
    off = S * 0.07
    d.rounded_rectangle([cx - cw / 2 + off, cy - ch / 2 - off * 0.4, cx + cw / 2 + off, cy + ch / 2 - off * 0.4],
                        radius=int(S * 0.04), fill=(230, 226, 214), outline=INK, width=max(2, S // 120))
    heart(d, cx + off + cw * 0.37, cy - off * 0.4 - ch * 0.36, S * 0.06, RED)
    # front card
    d.rounded_rectangle([cx - cw / 2 - off * 0.6, cy - ch / 2 + off * 0.3, cx + cw / 2 - off * 0.6, cy + ch / 2 + off * 0.3],
                        radius=int(S * 0.04), fill=CARD, outline=INK, width=max(2, S // 120))
    spade(d, cx - off * 0.6, cy + off * 0.3, S * content * 0.42, INK)
    return img.resize((size, size), Image.LANCZOS)


OUT.mkdir(exist_ok=True)
make(192).save(OUT / "icon-192.png")
make(512).save(OUT / "icon-512.png")
make(192, maskable=True).save(OUT / "icon-maskable-192.png")
make(512, maskable=True).save(OUT / "icon-maskable-512.png")
make(180, rounded=False).save(OUT / "apple-touch-icon.png")
make(32).save(OUT / "favicon-32.png")
print("icons written to", OUT)
