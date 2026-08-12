import type { Route } from './types'

/**
 * Children auto-level based on story progress once recruited — a child picked up at Ch9 is the
 * same level at Ch20 as one picked up at Ch14, since it's a catch-up curve keyed on chapter
 * reached, not on individual EXP. Identical across all three routes (see the recruitment
 * spreadsheet's "Level Curve (all routes)" sheet, cross-checked against Serenes Forest): flat at
 * Lv10 through Ch11, climbs to Lv20 by Ch18, then an Offspring Seal auto-appears and auto-promotes
 * at Ch19, restarting the curve at promoted Lv2 up to Lv18 by the final chapter (27).
 */
interface LevelCurveEntry {
  chapter: number
  promoted: boolean
  level: number
}

const LEVEL_CURVE: LevelCurveEntry[] = [
  { chapter: 1, promoted: false, level: 10 },
  { chapter: 2, promoted: false, level: 10 },
  { chapter: 3, promoted: false, level: 10 },
  { chapter: 4, promoted: false, level: 10 },
  { chapter: 5, promoted: false, level: 10 },
  { chapter: 6, promoted: false, level: 10 },
  { chapter: 7, promoted: false, level: 10 },
  { chapter: 8, promoted: false, level: 10 },
  { chapter: 9, promoted: false, level: 10 },
  { chapter: 10, promoted: false, level: 10 },
  { chapter: 11, promoted: false, level: 10 },
  { chapter: 12, promoted: false, level: 11 },
  { chapter: 13, promoted: false, level: 12 },
  { chapter: 14, promoted: false, level: 14 },
  { chapter: 15, promoted: false, level: 15 },
  { chapter: 16, promoted: false, level: 17 },
  { chapter: 17, promoted: false, level: 18 },
  { chapter: 18, promoted: false, level: 20 },
  { chapter: 19, promoted: true, level: 2 },
  { chapter: 20, promoted: true, level: 4 },
  { chapter: 21, promoted: true, level: 6 },
  { chapter: 22, promoted: true, level: 8 },
  { chapter: 23, promoted: true, level: 10 },
  { chapter: 24, promoted: true, level: 12 },
  { chapter: 25, promoted: true, level: 14 },
  { chapter: 26, promoted: true, level: 16 },
  { chapter: 27, promoted: true, level: 18 },
]

export const FINAL_CHAPTER = 27

/**
 * No child can be recruited before Ch8 on any route (earliest Deeprealms/paralogue access point in
 * the story) — without this floor, a child whose fixed parent joins turn 1 (e.g. Corrin, for Kana)
 * would otherwise read as available from Ch1 onwards, which isn't actually possible in-game.
 */
export const EARLIEST_POSSIBLE_CHAPTER = 8

/** The level (and promotion state) a child auto-levels to once the story has reached this chapter. */
export function levelForChapter(chapter: number): { level: number; promoted: boolean } {
  const clamped = Math.min(Math.max(Math.round(chapter), 1), FINAL_CHAPTER)
  const entry = LEVEL_CURVE[clamped - 1]
  return { level: entry.level, promoted: entry.promoted }
}

/**
 * The earliest chapter this child can actually be recruited on a given route — their own specific
 * unlock requirement (support rank, paralogue prerequisites, fixed parent's own join timing), never
 * earlier than Ch8. Falls back to Ch8 if no per-route data is recorded.
 */
export function earliestChapterFor(unlockChapter: Partial<Record<Route, number>> | undefined, route: Route): number {
  const specific = unlockChapter?.[route]
  return Math.max(EARLIEST_POSSIBLE_CHAPTER, specific ?? EARLIEST_POSSIBLE_CHAPTER)
}

/** The level a child would actually be if recruited at their earliest possible chapter on this route — the baseline used wherever no specific chapter has been picked. */
export function earliestChildLevel(unlockChapter: Partial<Record<Route, number>> | undefined, route: Route): number {
  return levelForChapter(earliestChapterFor(unlockChapter, route)).level
}
