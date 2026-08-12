# Placeholder asset template

This folder mirrors every path the app looks up under `public/art/` and `public/skills/` (see
`ART_ASSETS.md` at the repo root) — same folder structure, same filenames, just filled with a flat
gray placeholder PNG instead of real, copyrighted game art. Those two folders are git-ignored, so
anyone who doesn't have them locally can use this as a starting point.

## How to use it

1. Copy this folder's contents into `public/` (i.e. `public-template/skills/*` → `public/skills/`,
   `public-template/art/*` → `public/art/`).
2. Replace individual placeholder PNGs with your own images, **keeping the exact same filename** —
   the app looks files up by id, not by browsing the folder, so the name is what matters.
3. Refresh the app.

You don't have to fill in everything — anything left as the placeholder (or missing entirely) falls
back to the app's own built-in silhouette/shield icon automatically.

## Regenerating this folder

If new skills or characters get added later and this template falls out of date, regenerate it from
whatever's currently in `public/`:

```bash
node scripts/generate_dummy_assets.mjs
```

It only ever writes into `public-template/` — your real files in `public/art/` and `public/skills/`
are never read for content, only listed for their filenames.
