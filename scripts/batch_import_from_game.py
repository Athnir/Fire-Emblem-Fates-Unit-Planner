#!/usr/bin/env python3
"""
Batch-imports every non-Corrin character's portrait from a FEAT-extracted Fates RomFS/face folder
(see ART_ASSETS.md). Cross-references the Japanese folder names against src/data/characters.ts ids.

Usage:
    python scripts/batch_import_from_game.py <path-to-extracted-face-folder>

<path-to-extracted-face-folder> should contain face/ and hair/ subfolders (i.e. the folder FEAT
wrote tmp.png files into), e.g. F:\\face\\face.
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PORTRAITS_DIR = ROOT / "public" / "art" / "portraits"

# id -> Japanese base folder name (matches src/data/characters.ts ids). Corrin is intentionally
# excluded — handled separately since their hair is player-chosen, not fixed game data.
JP_NAME = {
    "azura": "アクア", "xander": "マークス", "ryoma": "リョウマ", "camilla": "カミラ",
    "hinoka": "ヒノカ", "leo": "レオン", "takumi": "タクミ", "elise": "エリーゼ",
    "sakura": "サクラ", "silas": "サイラス", "kaze": "スズカゼ", "jakob": "ジョーカー",
    "felicia": "フェリシア", "laslow": "ラズワルド", "odin": "オーディン", "niles": "ゼロ",
    "arthur": "ハロルド", "benny": "ブノワ", "effie": "エルフィ", "gunter": "ギュンター",
    "nyx": "ニュクス", "selena": "ルーナ", "beruka": "ベルカ", "peri": "ピエリ",
    "charlotte": "シャーロッテ", "keaton": "フランネル", "flora": "フローラ", "rinkah": "リンカ",
    "hana": "カザハナ", "subaki": "ツバキ", "saizo": "サイゾウ", "orochi": "オロチ",
    "azama": "アサマ", "setsuna": "セツナ", "hayato": "ツクヨミ", "oboro": "オボロ",
    "hinata": "ヒナタ", "kagero": "カゲロウ", "reina": "ユウギリ", "kaden": "ニシキ",
    "scarlet": "クリムゾン", "yukimura": "ユキムラ", "shura": "アシュラ", "izana": "イザナ",
    "fuga": "フウガ", "mozu": "モズメ", "anna": "アンナ",
    "kana_m": "カンナ男", "kana_f": "カンナ女", "shigure": "シグレ",
    "siegbert": "ジークベルト", "shiro": "シノノメ", "soleil": "ソレイユ", "ophelia": "オフェリア",
    "nina": "エポニーヌ", "percy": "ルッツ", "ignatius": "イグニス", "sophie": "ゾフィー",
    "midori": "ミドリコ", "dwyer": "ディーア", "forrest": "フォレオ", "kiragi": "キサラギ",
    "asugi": "グレイ", "selkie": "キヌ", "hisame": "ヒサメ", "mitama": "ミタマ",
    "caeldori": "マトイ", "rhajat": "シャラ", "velouria": "べロア",
}

# Preferred expression, in priority order (some characters are missing some expressions).
EXPRESSION_PRIORITY = ["通常", "笑", "キメ"]
POSE = "st"


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


def find_expression(face_dir: Path) -> "Path | None":
    for expr in EXPRESSION_PRIORITY:
        candidate = face_dir / f"{expr}_" / "tmp.png"
        if candidate.is_file():
            return candidate
    return None


def build_template(hair_png: Path) -> Image.Image:
    hair = np.array(Image.open(hair_png).convert("RGBA")).astype(np.float32)
    s, l = rgb_to_hsl_arr(hair[..., :3] / 255.0)
    alpha = hair[..., 3]
    H, W = alpha.shape
    rgba = np.zeros((H, W, 4), dtype=np.uint8)
    rgba[..., 0] = (l * 255).astype(np.uint8)
    rgba[..., 1] = (s * 255).astype(np.uint8)
    rgba[..., 3] = alpha.astype(np.uint8)
    return Image.fromarray(rgba, "RGBA")


def main(extracted_root: Path):
    face_root = extracted_root / "face"
    hair_root = extracted_root / "hair"
    if not face_root.is_dir():
        raise SystemExit(f"No face/ folder found under {extracted_root}")

    ok, skipped, failed = [], [], []

    for char_id, jp_name in JP_NAME.items():
        face_dir = face_root / f"{jp_name}_{POSE}"
        if not face_dir.is_dir():
            failed.append(f"{char_id}: no face folder at {face_dir}")
            continue
        expr_png = find_expression(face_dir)
        if expr_png is None:
            failed.append(f"{char_id}: no usable expression in {face_dir}")
            continue

        hair_dir = hair_root / f"{jp_name}_{POSE}"
        hair_png = hair_dir / "髪0_" / "tmp.png"
        has_dynamic_hair = hair_png.is_file()

        if has_dynamic_hair:
            out_dir = PORTRAITS_DIR / "children" / char_id
            out_dir.mkdir(parents=True, exist_ok=True)
            Image.open(expr_png).convert("RGBA").save(out_dir / "base.png")
            build_template(hair_png).save(out_dir / "template.png")
            ok.append(f"{char_id} (dynamic hair)")
        else:
            out_dir = PORTRAITS_DIR / "adults"
            out_dir.mkdir(parents=True, exist_ok=True)
            Image.open(expr_png).convert("RGBA").save(out_dir / f"{char_id}.png")
            skipped.append(f"{char_id} (static — no separate hair layer in game data, e.g. Shigure)")
            ok.append(f"{char_id} (static)")

    print(f"\n{len(ok)} succeeded, {len(failed)} failed\n")
    if skipped:
        print("Static (no dynamic hair layer found):")
        for s in skipped:
            print(" -", s)
        print()
    if failed:
        print("FAILED:")
        for f in failed:
            print(" -", f)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(1)
    main(Path(sys.argv[1]))
