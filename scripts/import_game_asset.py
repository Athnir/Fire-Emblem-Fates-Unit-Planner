#!/usr/bin/env python3
"""
Builds a child's portrait base.png + template.png directly from the game's own extracted face/hair
textures (via FEAT — see ART_ASSETS.md), instead of the multi-variant reference-sheet method in
build_hair_template.py. The game already renders hair as a separate layer drawn on top of the face
(the face texture includes its own default-colored hair underneath, almost perfectly covered by the
hair layer — see notes in ART_ASSETS.md), so this only needs ONE hair image: decompose it straight
to lightness/saturation and discard its baked-in hue, since colorizing at runtime replaces the hue
entirely regardless of what was originally there.

Usage:
    python scripts/import_game_asset.py <childId> <faceTmpPngPath> <hairTmpPngPath>
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
CHILDREN_DIR = ROOT / "public" / "art" / "portraits" / "children"


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


def main(child_id: str, face_path: Path, hair_path: Path):
    child_dir = CHILDREN_DIR / child_id
    child_dir.mkdir(parents=True, exist_ok=True)

    face = Image.open(face_path).convert("RGBA")
    face.save(child_dir / "base.png")
    print(f"Wrote {child_dir / 'base.png'} (unmodified game face render)")

    hair = np.array(Image.open(hair_path).convert("RGBA")).astype(np.float32)
    norm = hair[..., :3] / 255.0
    s, l = rgb_to_hsl_arr(norm)
    alpha = hair[..., 3]

    H, W = alpha.shape
    rgba = np.zeros((H, W, 4), dtype=np.uint8)
    rgba[..., 0] = (l * 255).astype(np.uint8)
    rgba[..., 1] = (s * 255).astype(np.uint8)
    rgba[..., 3] = alpha.astype(np.uint8)
    Image.fromarray(rgba, "RGBA").save(child_dir / "template.png")
    print(f"Wrote {child_dir / 'template.png'} ({int((alpha > 0).sum())} hair px)")


if __name__ == "__main__":
    if len(sys.argv) != 4:
        print(__doc__)
        sys.exit(1)
    main(sys.argv[1], Path(sys.argv[2]), Path(sys.argv[3]))
