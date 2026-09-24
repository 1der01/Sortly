"""
make_icon.py - Generates the Sortly app icon assets (zero dependencies).

Draws a clean teal folder paired with a white downward sort arrow, matching
the brand identity note: "A clean folder combined with a sorting arrow."

Writes:
    assets/sortly-icon.png   256x256 preview / cross-platform window icon
    assets/sortly.ico        multi-size Windows icon (16, 32, 48, 64, 256)

Usage:
    python make_icon.py
"""

from __future__ import annotations

import math
import struct
import zlib
from pathlib import Path

ASSETS_DIR = Path(__file__).resolve().parent / "assets"
ICO_SIZES = (16, 32, 48, 64, 256)

TEAL = (20, 184, 166, 255)        # folder body
TEAL_DARK = (13, 148, 136, 255)   # folder tab
WHITE = (255, 255, 255, 255)      # sorting arrow


class Canvas:
    """Tiny RGBA raster canvas with rectangle and polygon fills."""

    def __init__(self, size: int):
        self.size = size
        self.px = bytearray(size * size * 4)  # transparent black

    def set_pixel(self, x: int, y: int, color):
        if 0 <= x < self.size and 0 <= y < self.size:
            i = (y * self.size + x) * 4
            self.px[i:i + 4] = bytes(color)

    def fill_rect(self, x0: int, y0: int, x1: int, y1: int, color):
        for y in range(max(0, y0), min(self.size, y1)):
            for x in range(max(0, x0), min(self.size, x1)):
                self.set_pixel(x, y, color)

    def fill_poly(self, points, color):
        ys = [p[1] for p in points]
        y_min = int(math.floor(min(ys)))
        y_max = int(math.ceil(max(ys)))
        for y in range(max(0, y_min), min(self.size, y_max)):
            yc = y + 0.5
            crossings = []
            n = len(points)
            for i in range(n):
                x1, y1 = points[i]
                x2, y2 = points[(i + 1) % n]
                if (y1 <= yc < y2) or (y2 <= yc < y1):
                    t = (yc - y1) / (y2 - y1)
                    crossings.append(x1 + t * (x2 - x1))
            crossings.sort()
            for i in range(0, len(crossings) - 1, 2):
                for x in range(int(math.ceil(crossings[i] - 0.5)), int(math.ceil(crossings[i + 1] - 0.5))):
                    self.set_pixel(x, y, color)


def render(size: int) -> Canvas:
    """Renders the Sortly logo at the given square size using fractional coordinates."""
    canvas = Canvas(size)

    def rect(fx0, fy0, fx1, fy1, color):
        canvas.fill_rect(round(fx0 * size), round(fy0 * size), round(fx1 * size), round(fy1 * size), color)

    def poly(points, color):
        canvas.fill_poly([(x * size, y * size) for x, y in points], color)

    rect(0.16, 0.22, 0.62, 0.40, TEAL_DARK)                     # folder tab
    rect(0.12, 0.32, 0.88, 0.78, TEAL)                          # folder body
    rect(0.455, 0.42, 0.545, 0.60, WHITE)                       # arrow shaft
    poly([(0.37, 0.58), (0.63, 0.58), (0.50, 0.72)], WHITE)     # arrow head
    return canvas


def to_png(size: int, canvas: Canvas) -> bytes:
    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    raw = b"".join(b"\x00" + bytes(canvas.px[y * size * 4:(y + 1) * size * 4]) for y in range(size))
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )


def to_ico(images) -> bytes:
    header = struct.pack("<HHH", 0, 1, len(images))
    offset = 6 + 16 * len(images)
    entries = b""
    payload = b""
    for size, data in images:
        dim = 0 if size >= 256 else size  # 0 means 256 in the ICO format
        entries += struct.pack("<BBBBHHII", dim, dim, 0, 0, 1, 32, len(data), offset)
        payload += data
        offset += len(data)
    return header + entries + payload


def main():
    ASSETS_DIR.mkdir(exist_ok=True)

    png_path = ASSETS_DIR / "sortly-icon.png"
    png_path.write_bytes(to_png(256, render(256)))

    ico_path = ASSETS_DIR / "sortly.ico"
    ico_path.write_bytes(to_ico([(size, to_png(size, render(size))) for size in ICO_SIZES]))

    print(f"Generated {png_path}")
    print(f"Generated {ico_path} ({', '.join(f'{s}px' for s in ICO_SIZES)})")


if __name__ == "__main__":
    main()
