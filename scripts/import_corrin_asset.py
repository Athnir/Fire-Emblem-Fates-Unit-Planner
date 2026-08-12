#!/usr/bin/env python3
"""
Builds one Corrin body model's bald base.png (once) plus one hairstyle's hair/<hairstyleId>.png
template, from the game's own extracted textures via FEAT — same HSL-decompose technique as
import_game_asset.py, adapted for Corrin's layout (see ART_ASSETS.md): 4 separate body models
(gender x height) each with several player-selectable hairstyles, instead of one fixed
model/hairstyle like every other character.

Usage:
    python scripts/import_corrin_asset.py <gender:m|f> <height:short|tall> <hairstyleId> <faceTmpPngPath> <hairTmpPngPath>
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
CORRIN_DIR = ROOT / "public" / "art" / "portraits" / "corrin"


def rgb_to_hsl_arr(arr: np.ndarray):
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    maxc = np.maximum(np.maximum(r, g), b)
    minc = np.minimum(np.minimum(r, g), b)
    l = (maxc + minc) / 2
    d = maxc - minc
    s = np.zeros_like(l)
    nz = d > 1e-6
    s[nz] = d[nz] / (1 - np.abs(2 * l[nz] - 1) + 1e-6)
    return s, l


def main(gender: str, height: str, hairstyle_id: str, face_path: Path, hair_path: Path):
    body_dir = CORRIN_DIR / f"{gender.lower()}_{height.lower()}"
    hair_dir = body_dir / "hair"
    hair_dir.mkdir(parents=True, exist_ok=True)

    base_path = body_dir / "base.png"
    if not base_path.exists():
        Image.open(face_path).convert("RGBA").save(base_path)
        print(f"Wrote {base_path} (bald body render)")
    else:
        print(f"{base_path} already exists, left alone (delete it first to redo the body render)")

    hair = np.array(Image.open(hair_path).convert("RGBA")).astype(np.float32)
    norm = hair[..., :3] / 255.0
    s, l = rgb_to_hsl_arr(norm)
    alpha = hair[..., 3]

    H, W = alpha.shape
    rgba = np.zeros((H, W, 4), dtype=np.uint8)
    rgba[..., 0] = (l * 255).astype(np.uint8)
    rgba[..., 1] = (s * 255).astype(np.uint8)
    rgba[..., 3] = alpha.astype(np.uint8)
    out_path = hair_dir / f"{hairstyle_id}.png"
    Image.fromarray(rgba, "RGBA").save(out_path)
    print(f"Wrote {out_path} ({int((alpha > 0).sum())} hair px)")


if __name__ == "__main__":
    if len(sys.argv) != 6:
        print(__doc__)
        sys.exit(1)
    main(sys.argv[1], sys.argv[2], sys.argv[3], Path(sys.argv[4]), Path(sys.argv[5]))
