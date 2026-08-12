# Fates Unit Planner

A Fire Emblem Fates marriage, pair-up, class/skill build, and inheritance planner. Plan out
parent pairings, see which children result and what they inherit, project a unit's stats through
promotions and multi-classing, and build out skill loadouts — all client-side, nothing leaves your
device.

**Live app:** https://athnir.github.io/Fire-Emblem-Fates-Unit-Planner/

## Installing

The live link above is a Progressive Web App (PWA) — it installs like a native app on every
platform below, straight from the browser, no app store needed. Same app either way; installing
just gets it its own window/icon and offline access instead of living in a browser tab.

### Windows
Open the link in **Chrome** or **Edge** → click the **install icon** (a monitor with a down arrow)
at the right side of the address bar → **Install**.

### Mac
Open the link in **Chrome** → same install icon in the address bar → **Install**.
(Safari on recent macOS versions also supports this via **File → Add to Dock**.)

### Linux
Open the link in **Chrome** or another Chromium-based browser → same install icon in the address
bar → **Install**.

### Android
Open the link in **Chrome** → tap the **⋮ menu** → **Install app** (or **Add to Home screen**,
depending on Chrome version).

### iPhone / iPad
Open the link in **Safari** specifically (this only works in Safari, not Chrome/Firefox on iOS) →
tap the **Share** button → **Add to Home Screen**. Installing this way (rather than just using it
in a regular Safari tab) also makes iOS much less likely to clear your saved plans over time.

Regardless of platform, use the **Export Backup** button (top of the app) any time you want a
downloadable copy of everything you've saved — it's the one guaranteed way to not lose progress no
matter what the browser does with its storage.

## Development

```bash
npm install
npm run dev        # start the dev server
npm run test        # run the test suite
npm run build        # production build (web)
npm run dist:win     # build the Windows portable .exe
```

The copyrighted game-extracted art and skill icons (`public/art/`, `public/skills/`) are
intentionally excluded from this repo — see [ART_ASSETS.md](ART_ASSETS.md) for how they're
extracted, and drop your own copies back into `public/` to restore real portraits/icons locally
(the app falls back to placeholder silhouettes/icons without them).
