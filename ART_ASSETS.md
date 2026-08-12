# Character art

All copyrighted character art lives in `public/art/`, which is **git-ignored entirely** (see
`.gitignore`) — cloning this repo gets you a fully working app with placeholder silhouettes
instead of portraits. Drop your own `public/art/` folder back in to restore them; delete that one
folder before sharing the repo to strip all art back out cleanly.

## Layout

```
public/art/
  portraits/
    adults/
      <characterId>.png        # single static portrait, official art, used as-is
    children/
      <childId>/
        template.png            # generated — hair-only, see below, do not hand-edit
        base.png                 # generated — the face/armor/body render, hair recolored on top
        sources/                # whatever the template was built from, kept so it can be rebuilt
```

`<characterId>` / `<childId>` match the `id` field in `src/data/characters.ts` (e.g. `xander`,
`soleil`).

## Why children need a "template" instead of a plain portrait

Adults have one canonical hair color, so a single portrait file is enough. Children's hair color
depends on which parent they end up paired with, which the player picks in-app — so a static image
per child can't work. Instead, `template.png` is a **grayscale-ish shading template**: it encodes
how light/dark/saturated each hair pixel should be, with the actual hue discarded. At runtime
(`src/logic/portraitColorize.ts`) the app combines that template with whatever hex color is stored
for the hair-source parent (the existing "Upload hair reference" feature in the Roster tab) to
render the child's hair in the correct color, live, in a `<canvas>`.

`template.png` is an RGBA PNG where, for hair pixels only:
- **R** = lightness (0–255)
- **G** = saturation (0–255)
- **A** = 255 (0 everywhere else — this is the hair mask)

The app draws `base.png` first, then draws `template.png` recolored to the target hue on top —
together they form the full portrait.

## Method 1 (preferred): straight from the game's own extracted assets

Fates renders hair as a genuinely separate layer at runtime — the `face` texture already has its
own default-colored hair baked in underneath, drawn first, and the `hair` texture is drawn on top
of it almost pixel-for-pixel (that's not a coincidence we're exploiting, it's how the game itself
composites hair color onto a base face). That means:
- `base.png` = the face texture completely unmodified — no hole-cutting needed, since the hair
  layer drawn on top covers it anyway.
- `template.png` = a **direct HSL decompose of the hair texture alone** (lightness + saturation
  per pixel). Its original hue doesn't matter and gets fully discarded — recoloring at runtime
  replaces the hue entirely, it doesn't matter what color the source hair happened to be.

This means only ONE hair image is needed per character (not several different-colored variants).

1. Extract the game's face/hair textures with [FEAT](https://github.com/SciresM/FEAT) (drag your
   `RomFS/face/` folder's `.bin.lz`/`.bch.lz` files onto it — it decompresses and converts
   everything to `tmp.png` files automatically, organized by character/expression). Character
   folders are named in Japanese; cross-reference against Serenes Forest or a JP/EN name list to
   find the right one.
2. Each character has separate `face/<name>_st/` and `hair/<name>_st/` folders (also `_bu`/`_ct` —
   different in-game contexts/lighting; `_st` worked well in practice). Pick an expression from the
   face folder (`通常` = neutral is a good default) and the hair folder's `髪0`.
3. Run:
   ```bash
   python scripts/import_game_asset.py <childId> <path-to-face-tmp.png> <path-to-hair-tmp.png>
   ```
   This writes `base.png` (the face image, untouched) and `template.png` (HSL-decomposed hair)
   straight into `public/art/portraits/children/<childId>/`.
4. Refresh the app — the child's portrait should recolor live as you change their hair-source
   parent's reference color.

## Method 2 (fallback): multi-color reference sheet

For characters where you don't have extracted game assets, `scripts/build_hair_template.py` builds
the same template from a **reference sheet showing the same pose in several different hair
colors** (e.g. an official "which parent gives which hair color" chart) — 4–5+ variants minimum.
It auto-detects the hair region by comparing pixel variance across all the variants (whatever
changes color between them is hair, everything else gets masked out).

1. Put the individual, cropped-to-just-that-character variant images in
   `public/art/portraits/children/<childId>/sources/` (any filenames).
2. Run:
   ```bash
   python scripts/build_hair_template.py <childId>
   ```
3. If the auto-detected hair region picks up something it shouldn't (e.g. a shield with its own
   slight color variance), pass a manual region of interest:
   ```bash
   python scripts/build_hair_template.py <childId> --roi x0,y0,x1,y1
   ```
   (pixel coordinates after auto-alignment — check the generated `_debug_mask.png` to see what got
   picked up.) This method doesn't produce a real `base.png` face render — you'd still need one
   separately (e.g. one of the source variants with the hair region set transparent).

Both scripts require Python 3 with Pillow and scipy (`pip install pillow scipy`).

## Corrin

Corrin is excluded from every other pipeline above (`adultHairHex.ts`, the batch import) because,
unlike every other character, they aren't one fixed model with one hairstyle:

- **No default hairstyle** — the base model is bald; hair is a separate, player-selectable piece
  (several hairstyle options in-game, not just one).
- **4 body models** — female short, female tall, male short, male tall — each with its own base
  render and its own set of hairstyle renders.

Note this never affects a *child's* hair: Kana's hair always comes from whichever non-Corrin
character the player married (see `getHairSourceInfo` in `childCalculator.ts`), and Shigure's is
always fixed to Azura — Corrin never supplies a child's hair color. So this pipeline only feeds
Corrin's own Roster portrait, which is set independently per `corrin_m`/`corrin_f` via the Roster
tab's Height / Hairstyle / Hair color controls (`src/state/corrinAppearanceStore.ts`), defaulting
to Tall / Hairstyle 1 / a neutral placeholder color until changed.

Folder layout:

```
public/art/portraits/corrin/
  <gender>_<height>/          # m_short, m_tall, f_short, f_tall
    base.png                  # bald body render
    hair/
      <hairstyleId>.png       # packed hair template (see above), one per selectable hairstyle
```

Extraction is the same FEAT process as Method 1 above, just run once per body model (for the bald
base) and once per hairstyle within that body model (for the hair texture):

```bash
python scripts/import_corrin_asset.py <m|f> <short|tall> <hairstyleId> <face-tmp.png> <hair-tmp.png>
```

Add each hairstyle's id/display name to `CORRIN_HAIRSTYLES` in `src/data/corrinHairstyles.ts` as
it's extracted — the Roster dropdown reads straight from that list.
