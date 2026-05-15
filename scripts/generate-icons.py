#!/usr/bin/env python3
"""Generate PWA icons and favicon from the piggy bank design."""

import math
from pathlib import Path
from PIL import Image, ImageDraw

BG = "#F07355"
PIG = "#FAF0E6"

def draw_rounded_rect(draw, x0, y0, x1, y1, radius, fill):
    draw.rectangle([x0 + radius, y0, x1 - radius, y1], fill=fill)
    draw.rectangle([x0, y0 + radius, x1, y1 - radius], fill=fill)
    draw.ellipse([x0, y0, x0 + radius * 2, y0 + radius * 2], fill=fill)
    draw.ellipse([x1 - radius * 2, y0, x1, y0 + radius * 2], fill=fill)
    draw.ellipse([x0, y1 - radius * 2, x0 + radius * 2, y1], fill=fill)
    draw.ellipse([x1 - radius * 2, y1 - radius * 2, x1, y1], fill=fill)


def draw_heart(draw, cx, cy, size, fill):
    """Draw a heart centered at (cx, cy) with given size."""
    points = []
    for i in range(360):
        t = math.radians(i)
        x = size * (16 * math.sin(t) ** 3)
        y = -size * (13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t))
        points.append((cx + x, cy + y))
    draw.polygon(points, fill=fill)


def make_icon(size: int) -> Image.Image:
    s = size
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Background with rounded corners
    r = int(s * 0.22)
    draw_rounded_rect(draw, 0, 0, s, s, r, BG)

    # Scale factors (designed at 1024)
    f = s / 1024

    def e(x, y, rx, ry, fill=PIG):
        draw.ellipse([x * f, y * f, (x + rx * 2) * f, (y + ry * 2) * f], fill=fill)

    def re(cx, cy, rx, ry, fill=PIG):
        e(cx - rx, cy - ry, rx, ry, fill)

    # Tail (back right) — draw first so body covers it
    tail_cx, tail_cy = 795, 480
    tail_r = 70
    tail_w = 28
    for i in range(200, 380):
        t = math.radians(i)
        tx = (tail_cx + tail_r * math.cos(t)) * f
        ty = (tail_cy + tail_r * math.sin(t)) * f
        draw.ellipse([tx - tail_w * f / 2, ty - tail_w * f / 2,
                      tx + tail_w * f / 2, ty + tail_w * f / 2], fill=PIG)

    # Main body
    re(560, 560, 255, 215)

    # Head (left side)
    re(335, 480, 155, 155)

    # Ear (small oval top of head)
    re(335, 290, 42, 60)
    # Ear inner cutout
    re(335, 305, 28, 42, BG)

    # Coin slot (top of head/body junction)
    slot_x, slot_y = int(380 * f), int(288 * f)
    slot_w, slot_h = int(95 * f), int(22 * f)
    slot_r = slot_h // 2
    draw_rounded_rect(draw, slot_x, slot_y, slot_x + slot_w, slot_y + slot_h, slot_r, BG)

    # Snout
    re(208, 500, 75, 58)
    # Nostrils
    re(220, 518, 18, 16, BG)
    re(258, 518, 18, 16, BG)

    # Eye
    re(308, 440, 20, 20, BG)
    # Eye shine
    re(318, 433, 8, 8, PIG)

    # Legs (4 rounded rects)
    leg_y0 = 745
    leg_h = 85
    leg_w = 58
    leg_r = int(leg_w * f * 0.4)
    for lx in [385, 468, 595, 678]:
        x0 = int(lx * f)
        y0 = int(leg_y0 * f)
        x1 = x0 + int(leg_w * f)
        y1 = y0 + int(leg_h * f)
        draw_rounded_rect(draw, x0, y0, x1, y1, leg_r, PIG)

    # Heart on body
    heart_size = 0.038 * f
    draw_heart(draw, 680 * f, 560 * f, heart_size, BG)

    return img


def main():
    public = Path(__file__).parent.parent / "public"
    public.mkdir(exist_ok=True)

    sizes = [512, 192, 180, 32, 16]
    for size in sizes:
        icon = make_icon(size)
        # Export as PNG
        if size == 180:
            icon.save(public / "apple-touch-icon.png", "PNG")
            print(f"Saved apple-touch-icon.png ({size}x{size})")
        elif size == 512:
            icon.save(public / "icon-512.png", "PNG")
            print(f"Saved icon-512.png")
        elif size == 192:
            icon.save(public / "icon-192.png", "PNG")
            print(f"Saved icon-192.png")

    # favicon.ico (multi-size: 16, 32)
    ico_16 = make_icon(16)
    ico_32 = make_icon(32)
    ico_32.save(public / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32)],
                append_images=[ico_16])
    print("Saved favicon.ico (16x16, 32x32)")


if __name__ == "__main__":
    main()
