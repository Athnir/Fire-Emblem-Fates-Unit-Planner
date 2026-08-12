#!/usr/bin/env python3
"""
One-shot Corrin import: reads FEAT's already-extracted face/hair renders directly from a FEAT
output root (the folder containing face/, hair/, accessory1/, accessory2/ — e.g. what you get from
dragging RomFS/face/*.bin.lz onto FEAT) and writes all 4 body models' bald base.png plus their 12
hairstyles' hair/style<N>.png templates into public/art/portraits/corrin/. See ART_ASSETS.md and
import_corrin_asset.py (the single-shot version this wraps/replaces for Corrin specifically).

Usage:
    python scripts/batch_import_corrin.py <feat_face_root>
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
CORRIN_DIR = ROOT / "public" / "art" / "portraits" / "corrin"

# "1" bodies are the short build, "2" are tall, per the user's own knowledge of the in-game avatar
# builder — flip this mapping if it turns out backwards once real art is visible in the app.
BODY_MODELS = {
    "f_short": "マイユニ女1",
    "f_tall": "マイユニ女2",
    "m_short": "マイユニ男1",
    "m_tall": "マイユニ男2",
}

CONTEXT = "st"
NEUTRAL_EXPRESSION = "通常"
HAIRSTYLE_COUNT = 12


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


def write_template(src_path: Path, dst_path: Path):
    img = np.array(Image.open(src_path).convert("RGBA")).astype(np.float32)
    norm = img[..., :3] / 255.0
    s, l = rgb_to_hsl_arr(norm)
    alpha = img[..., 3]
    h, w = alpha.shape
    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    rgba[..., 0] = (l * 255).astype(np.uint8)
    rgba[..., 1] = (s * 255).astype(np.uint8)
    rgba[..., 3] = alpha.astype(np.uint8)
    Image.fromarray(rgba, "RGBA").save(dst_path)


def main(feat_root: Path):
    for body_key, jp_name in BODY_MODELS.items():
        body_dir = CORRIN_DIR / body_key
        hair_dir = body_dir / "hair"
        hair_dir.mkdir(parents=True, exist_ok=True)

        face_src = feat_root / "face" / f"a{jp_name}_{CONTEXT}" / f"{NEUTRAL_EXPRESSION}_" / "tmp.png"
        base_dst = body_dir / "base.png"
        Image.open(face_src).convert("RGBA").save(base_dst)
        print(f"Wrote {base_dst}")

        for i in range(HAIRSTYLE_COUNT):
            hair_src = feat_root / "hair" / f"{jp_name}_{CONTEXT}" / f"髪{i}_" / "tmp.png"
            hair_dst = hair_dir / f"style{i + 1}.png"
            write_template(hair_src, hair_dst)
            print(f"Wrote {hair_dst}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(1)
    main(Path(sys.argv[1]))
