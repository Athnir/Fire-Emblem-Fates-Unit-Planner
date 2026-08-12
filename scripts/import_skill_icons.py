#!/usr/bin/env python3
"""
Slices the game's own skill icon sheets (Icon.bch -> skill.png + skill2.png, extracted via FEAT —
see ART_ASSETS.md for the same tool used on portraits) into individual per-skill PNGs, using
scripts/skill_icon_mapping.json (grid index -> skill id) to know which tile is which.

Both sheets use the same 24x24 grid (measured directly from the sheet's content bands — column and
row gaps land on exactly 24.0px apart, not the 32px a naive "512/16" guess would suggest); skill.png
is 21 cols x 10 rows (indices 0-209), skill2.png continues the same index space as a single 21-wide
row (indices 210-230). Index 0 is a blank placeholder tile, not a real skill.

The mapping file is intentionally incomplete and grown incrementally — this script only writes
whichever indices currently have an entry, so it's safe to re-run as more get identified. It's
plain text (index -> skill id), not copyrighted image data, so it's checked into the repo normally,
unlike public/skills/ itself (git-ignored — see .gitignore).

Usage:
    python scripts/import_skill_icons.py <path-to-FEAT-output-folder>

<path-to-FEAT-output-folder> should contain skill.png and skill2.png (wherever FEAT wrote them
when you dragged Icon.bch.lz onto it — e.g. the FEAT.exe folder itself, in an "Icon_" subfolder).
"""

import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "public" / "skills"
MAPPING_PATH = Path(__file__).resolve().parent / "skill_icon_mapping.json"

CELL = 24
SHEET_1_COLS = 21
SHEET_1_ROWS = 10  # indices 0-209
SHEET_2_START = 210  # skill2.png continues the same index space


def load_mapping() -> dict[int, str]:
    with open(MAPPING_PATH) as f:
        raw = json.load(f)
    return {int(k): v for k, v in raw.items()}


def slice_sheet(path: Path, cols: int, start_index: int) -> dict[int, Image.Image]:
    im = Image.open(path).convert("RGBA")
    rows = im.height // CELL
    tiles = {}
    for r in range(rows):
        for c in range(cols):
            idx = start_index + r * cols + c
            box = (c * CELL, r * CELL, (c + 1) * CELL, (r + 1) * CELL)
            tiles[idx] = im.crop(box)
    return tiles


def main(feat_output_dir: Path):
    sheet1 = feat_output_dir / "skill.png"
    sheet2 = feat_output_dir / "skill2.png"
    if not sheet1.is_file():
        raise SystemExit(f"No skill.png found at {sheet1}")

    tiles = slice_sheet(sheet1, SHEET_1_COLS, 0)
    if sheet2.is_file():
        tiles.update(slice_sheet(sheet2, SHEET_1_COLS, SHEET_2_START))

    mapping = load_mapping()
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    written = []
    missing_tiles = []
    for idx, skill_id in mapping.items():
        if idx not in tiles:
            missing_tiles.append((idx, skill_id))
            continue
        tiles[idx].save(OUT_DIR / f"{skill_id}.png")
        written.append(skill_id)

    print(f"Wrote {len(written)} icons to {OUT_DIR}")
    if missing_tiles:
        print(f"\n{len(missing_tiles)} mapped indices had no matching tile (bad index?):")
        for idx, skill_id in missing_tiles:
            print(f"  index {idx} -> {skill_id}")

    unmapped_tile_count = len(tiles) - 1 - len(mapping)  # -1 for the blank placeholder at index 0
    print(f"\n{unmapped_tile_count} sheet tiles still have no skill assigned in {MAPPING_PATH.name}.")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(1)
    main(Path(sys.argv[1]))
