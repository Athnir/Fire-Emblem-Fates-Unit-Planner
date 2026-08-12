#!/usr/bin/env python3
"""
Builds a child's hair-recolor template from a folder of same-pose, different-hair-color reference
images. See ART_ASSETS.md for the full explanation and folder layout.

Usage:
    python scripts/build_hair_template.py <childId> [--roi x0,y0,x1,y1] [--target-size WxH]

Reads:  public/art/portraits/children/<childId>/sources/*.{png,jpg,jpeg}
Writes: public/art/portraits/children/<childId>/template.png
        public/art/portraits/children/<childId>/_debug_mask.png  (inspect this if the mask looks wrong)
"""

import argparse
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
CHILDREN_DIR = ROOT / "public" / "art" / "portraits" / "children"


def tight_crop(im: Image.Image) -> Image.Image:
    """Crops to the bounding box of non-near-white content."""
    arr = np.array(im.convert("RGB"))
    non_white = ~np.all(arr > 240, axis=2)
    ys, xs = np.where(non_white)
    if len(ys) == 0:
        return im
    y0, y1 = ys.min(), ys.max()
    x0, x1 = xs.min(), xs.max()
    return im.crop((x0, y0, x1 + 1, y1 + 1))


def rgb_to_hsl_arr(arr: np.ndarray):
    """arr is HxWx3 float in [0,1]. Returns (S, L) arrays, each HxW."""
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    maxc = np.maximum(np.maximum(r, g), b)
    minc = np.minimum(np.minimum(r, g), b)
    l = (maxc + minc) / 2
    d = maxc - minc
    s = np.zeros_like(l)
    nz = d > 1e-6
    s[nz] = d[nz] / (1 - np.abs(2 * l[nz] - 1) + 1e-6)
    return s, l


def build_hair_mask(stack: np.ndarray, roi: "tuple[int,int,int,int] | None", threshold: float = 25.0) -> np.ndarray:
    """stack is (N,H,W,3) float in [0,255]. Returns an HxW boolean mask (largest connected
    high-cross-variant-color-variance blob, i.e. the region that actually changes hair color)."""
    H, W = stack.shape[1], stack.shape[2]
    std = stack.std(axis=0).sum(axis=2)

    region = np.ones((H, W), dtype=bool)
    if roi is not None:
        x0, y0, x1, y1 = roi
        region[:] = False
        region[y0:y1, x0:x1] = True

    mask = (std > threshold) & region
    labeled, num = ndimage.label(mask)
    if num == 0:
        raise SystemExit(
            "No hair region detected — the source images may be too similar, misaligned, or you "
            "may need --roi to exclude a same-toned prop (shield/armor) that's confusing the "
            "cross-image variance check."
        )
    sizes = ndimage.sum(mask, labeled, range(1, num + 1))
    biggest = np.argmax(sizes) + 1
    hair_mask = labeled == biggest
    return ndimage.binary_fill_holes(hair_mask)


def build_template(child_id: str, roi: "tuple[int,int,int,int] | None", target_size: "tuple[int,int] | None"):
    child_dir = CHILDREN_DIR / child_id
    sources_dir = child_dir / "sources"
    if not sources_dir.is_dir():
        raise SystemExit(f"No sources folder found at {sources_dir} — create it and add reference images first.")

    paths = sorted(
        p for p in sources_dir.iterdir() if p.suffix.lower() in (".png", ".jpg", ".jpeg") and not p.name.startswith("_")
    )
    if len(paths) < 3:
        raise SystemExit(
            f"Found only {len(paths)} source image(s) in {sources_dir} — need at least 3 different "
            "hair-color variants (4-5+ recommended) to build a reliable template."
        )
    print(f"Found {len(paths)} source images for '{child_id}':", ", ".join(p.name for p in paths))

    tight = [tight_crop(Image.open(p).convert("RGB")) for p in paths]
    if target_size is None:
        # Use the median size across variants rather than a single reference, since a couple of
        # crops off by a few px shouldn't skew the common canvas.
        widths = sorted(im.width for im in tight)
        heights = sorted(im.height for im in tight)
        target_size = (widths[len(widths) // 2], heights[len(heights) // 2])
    print(f"Aligning all variants to {target_size[0]}x{target_size[1]}")

    aligned = [im.resize(target_size, Image.LANCZOS) for im in tight]
    imgs = [np.array(im).astype(np.float32) for im in aligned]
    stack = np.stack(imgs, axis=0)

    hair_mask = build_hair_mask(stack, roi)
    print(f"Hair mask: {hair_mask.sum()} px ({100 * hair_mask.mean():.1f}% of frame)")

    norm = stack / 255.0
    H, W = hair_mask.shape
    S_stack = np.zeros((len(paths), H, W), dtype=np.float32)
    L_stack = np.zeros((len(paths), H, W), dtype=np.float32)
    for i in range(len(paths)):
        s, l = rgb_to_hsl_arr(norm[i])
        S_stack[i] = s
        L_stack[i] = l

    template_L = np.zeros((H, W), dtype=np.float32)
    template_S = np.zeros((H, W), dtype=np.float32)
    template_L[hair_mask] = L_stack[:, hair_mask].mean(axis=0)
    template_S[hair_mask] = S_stack[:, hair_mask].mean(axis=0)

    rgba = np.zeros((H, W, 4), dtype=np.uint8)
    rgba[..., 0] = (template_L * 255).astype(np.uint8)
    rgba[..., 1] = (template_S * 255).astype(np.uint8)
    rgba[..., 3] = (hair_mask * 255).astype(np.uint8)

    out_path = child_dir / "template.png"
    Image.fromarray(rgba, "RGBA").save(out_path)
    print(f"Wrote {out_path}")

    # The template only carries hair pixels — the app composites it over this "everything but
    # hair" base layer (face/armor/body), with the hair region AND the white background both cut
    # to transparent so it drops cleanly onto the app's dark UI regardless of hair color chosen.
    base_source = imgs[0].astype(np.uint8)
    is_white_bg = np.all(base_source > 240, axis=2)
    base_rgba = np.zeros((H, W, 4), dtype=np.uint8)
    base_rgba[..., :3] = base_source
    base_rgba[..., 3] = 255
    base_rgba[hair_mask, 3] = 0
    base_rgba[is_white_bg, 3] = 0

    base_path = child_dir / "base.png"
    Image.fromarray(base_rgba, "RGBA").save(base_path)
    print(f"Wrote {base_path}")

    # Debug overlay: mask drawn in red over the first variant, so a bad run is obvious at a glance.
    debug_base = imgs[0].astype(np.uint8).copy()
    overlay = debug_base.copy()
    overlay[hair_mask] = [255, 0, 0]
    blended = (debug_base.astype(np.float32) * 0.4 + overlay.astype(np.float32) * 0.6).astype(np.uint8)
    debug_path = child_dir / "_debug_mask.png"
    Image.fromarray(blended).save(debug_path)
    print(f"Wrote {debug_path} — check this if the recolored hair looks wrong")


def parse_roi(s: str) -> "tuple[int,int,int,int]":
    parts = [int(x) for x in s.split(",")]
    if len(parts) != 4:
        raise argparse.ArgumentTypeError("--roi must be x0,y0,x1,y1")
    return tuple(parts)  # type: ignore[return-value]


def parse_size(s: str) -> "tuple[int,int]":
    w, h = s.lower().split("x")
    return int(w), int(h)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("child_id", help="Character id, matching src/data/characters.ts (e.g. soleil)")
    parser.add_argument("--roi", type=parse_roi, default=None, help="Restrict mask search to x0,y0,x1,y1 (post-alignment pixel coords)")
    parser.add_argument("--target-size", type=parse_size, default=None, help="Force alignment size, e.g. 280x340")
    args = parser.parse_args()

    try:
        build_template(args.child_id, args.roi, args.target_size)
    except SystemExit as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
