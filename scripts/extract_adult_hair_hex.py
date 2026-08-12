#!/usr/bin/env python3
"""
Extracts each adult's canonical hair hex from their (already-imported) static portrait, by
sampling a band near the top of the opaque bounding box — hair is reliably at the top of the frame
across these renders, whereas there's no separate hair layer to mask against for adults (see
ART_ASSETS.md — only children needing dynamic recolor get one from the game).

This is a heuristic, not a precise mask — spot-check the output against known character colors
before trusting it (e.g. Camilla should be purple, Xander blond, Selena red).

Usage:
    python scripts/extract_adult_hair_hex.py
Writes: src/data/adultHairHex.ts
"""

from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ADULTS_DIR = ROOT / "public" / "art" / "portraits" / "adults"
OUT_PATH = ROOT / "src" / "data" / "adultHairHex.ts"


def extract_hex(path: Path) -> "tuple[str, int] | None":
    arr = np.array(Image.open(path).convert("RGBA"))
    alpha = arr[..., 3]
    opaque = alpha > 200
    ys, xs = np.where(opaque)
    if len(ys) == 0:
        return None
    y0, y1 = ys.min(), ys.max()
    x0, x1 = xs.min(), xs.max()
    height = y1 - y0
    width = x1 - x0

    band_y0 = y0 + max(2, int(height * 0.02))
    band_y1 = y0 + int(height * 0.16)
    band_x0 = x0 + int(width * 0.2)
    band_x1 = x0 + int(width * 0.8)

    band = arr[band_y0:band_y1, band_x0:band_x1]
    band_alpha = band[..., 3]
    band_rgb = band[..., :3].astype(np.int32)

    near_white = np.all(band_rgb > 235, axis=-1)
    near_black = np.all(band_rgb < 20, axis=-1)
    valid = (band_alpha > 200) & ~near_white & ~near_black

    pixels = band_rgb[valid]
    if len(pixels) == 0:
        return None
    med = np.median(pixels, axis=0).astype(int)
    return "#{:02x}{:02x}{:02x}".format(*med), len(pixels)


def main():
    results = {}
    low_confidence = []
    for path in sorted(ADULTS_DIR.glob("*.png")):
        char_id = path.stem
        result = extract_hex(path)
        if result is None:
            print(f"SKIP {char_id}: no usable pixels found")
            continue
        hexcode, count = result
        results[char_id] = hexcode
        if count < 100:
            low_confidence.append(f"{char_id} ({count} px)")

    lines = [
        "/**",
        " * Canonical hair hex per adult, auto-sampled from their real portrait by",
        " * scripts/extract_adult_hair_hex.py (top-of-head band, filtered for background/outline",
        " * pixels) — a heuristic, not a precise mask, so spot-check before trusting blindly.",
        " * Only present for characters with extracted game art (public/art/, git-ignored);",
        " * Corrin is intentionally excluded (their hair is player-chosen, not fixed game data).",
        " */",
        "export const adultHairHex: Record<string, string> = {",
    ]
    for char_id, hexcode in results.items():
        lines.append(f"  {char_id}: '{hexcode}',")
    lines.append("}")
    OUT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(f"\nWrote {len(results)} entries to {OUT_PATH}")
    if low_confidence:
        print("\nLow pixel count (double check these):")
        for lc in low_confidence:
            print(" -", lc)


if __name__ == "__main__":
    main()
