/**
 * URL helpers for the optional, git-ignored public/art/ folder (see ART_ASSETS.md). These paths
 * may 404 — that's expected for anyone who hasn't dropped their own art folder in, and callers
 * should fall back to a placeholder rather than treating it as an error.
 *
 * Prefixed with import.meta.env.BASE_URL (Vite's own configured `base`, always trailing-slashed)
 * rather than a hardcoded leading slash — the app is served from a sub-path on GitHub Pages
 * (see vite.config.ts) but from the domain root everywhere else (dev, the Electron build's local
 * static server), so a literal "/art/..." would 404 on Pages specifically.
 */
const BASE = import.meta.env.BASE_URL

export function adultPortraitUrl(characterId: string): string {
  return `${BASE}art/portraits/adults/${characterId}.png`
}

export function childPortraitBaseUrl(childId: string): string {
  return `${BASE}art/portraits/children/${childId}/base.png`
}

/** Raw, already-colored hair texture straight from the game's own ROM data — see
 * colorizeRawHairTexture in portraitColorize.ts. Optional: children with no separately-tintable
 * hair layer in the game itself (e.g. Shigure, whose hair is always his fixed mother's) have no
 * raw.png, and render base.png alone with no hair overlay. */
export function childPortraitRawUrl(childId: string): string {
  return `${BASE}art/portraits/children/${childId}/raw.png`
}

type CorrinGender = 'M' | 'F'
type CorrinHeight = 'short' | 'tall'

function corrinBodyKey(gender: CorrinGender, height: CorrinHeight): string {
  return `${gender.toLowerCase()}_${height}`
}

export function corrinBaseUrl(gender: CorrinGender, height: CorrinHeight): string {
  return `${BASE}art/portraits/corrin/${corrinBodyKey(gender, height)}/base.png`
}

/** Raw, already-colored hair texture straight from the game's own ROM data (see
 * childPortraitRawUrl) — one per selectable Corrin hairstyle, per body variant. Identity-verified
 * via exact alpha-mask IoU (1.0 on all 48 combinations) against the formerly-used HSL template. */
export function corrinHairRawUrl(gender: CorrinGender, height: CorrinHeight, hairstyleId: string): string {
  return `${BASE}art/portraits/corrin/${corrinBodyKey(gender, height)}/hair_raw/${hairstyleId}.png`
}
