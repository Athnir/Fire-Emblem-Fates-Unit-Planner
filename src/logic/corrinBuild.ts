import { STAT_KEYS, type Character, type StatBlock } from '../data/types'
import { correctGenderedClass } from './classResolution'
import type { CorrinBuild, StatKey } from '../state/corrinBuildStore'

type StatImpact = Partial<Record<StatKey, number>>

/**
 * All tables below are verified against Fire Emblem Wiki's Corrin/Stats page. Boon/Bane each
 * touch 3 stats for growth rate and stat-cap modifiers (the chosen stat + two secondary stats),
 * not just the one selected stat — this is a real, if under-documented, Fates mechanic.
 */
const BASE_STAT_DELTA: Record<StatKey, { boon: number; bane: number }> = {
  hp: { boon: 3, bane: -2 },
  str: { boon: 2, bane: -1 },
  mag: { boon: 3, bane: -2 },
  skl: { boon: 3, bane: -2 },
  spd: { boon: 2, bane: -1 },
  lck: { boon: 3, bane: -2 },
  def: { boon: 1, bane: -1 },
  res: { boon: 1, bane: -1 },
}

const GROWTH_BOON_IMPACT: Record<StatKey, StatImpact> = {
  hp: { hp: 15, def: 5, res: 5 },
  str: { str: 15, skl: 5, def: 5 },
  mag: { mag: 20, spd: 5, res: 5 },
  skl: { str: 5, skl: 25, def: 5 },
  spd: { skl: 5, spd: 15, lck: 5 },
  lck: { str: 5, mag: 5, lck: 25 },
  def: { lck: 5, def: 10, res: 5 },
  res: { mag: 5, spd: 5, res: 10 },
}

const GROWTH_BANE_IMPACT: Record<StatKey, StatImpact> = {
  hp: { hp: -10, def: -5, res: -5 },
  str: { str: -10, skl: -5, def: -5 },
  mag: { mag: -15, spd: -5, res: -5 },
  skl: { str: -5, skl: -20, def: -5 },
  spd: { skl: -5, spd: -10, lck: -5 },
  lck: { str: -5, mag: -5, lck: -20 },
  def: { lck: -5, def: -10, res: -5 },
  res: { mag: -5, spd: -5, res: -10 },
}

/** HP is unique: it never modifies its own cap (it isn't a column), but touches 5 other stats. */
const STATCAP_BOON_IMPACT: Record<StatKey, StatImpact> = {
  hp: { str: 1, mag: 1, lck: 2, def: 2, res: 2 },
  str: { str: 4, skl: 2, def: 2 },
  mag: { mag: 4, spd: 2, res: 2 },
  skl: { str: 2, skl: 4, def: 2 },
  spd: { skl: 2, spd: 4, lck: 2 },
  lck: { str: 2, mag: 2, lck: 4 },
  def: { lck: 2, def: 4, res: 2 },
  res: { mag: 2, spd: 2, res: 4 },
}

const STATCAP_BANE_IMPACT: Record<StatKey, StatImpact> = {
  hp: { str: -1, mag: -1, lck: -1, def: -1, res: -1 },
  str: { str: -3, skl: -1, def: -1 },
  mag: { mag: -3, spd: -1, res: -1 },
  skl: { str: -1, skl: -3, def: -1 },
  spd: { skl: -1, spd: -3, lck: -1 },
  lck: { str: -1, mag: -1, lck: -3 },
  def: { lck: -1, def: -3, res: -1 },
  res: { mag: -1, spd: -1, res: -3 },
}

function applyImpact(base: StatBlock, impact: StatImpact): StatBlock {
  const result = { ...base }
  for (const key of STAT_KEYS) {
    result[key] += impact[key] ?? 0
  }
  return result
}

/**
 * Returns Corrin with their chosen Boon/Bane/Talent applied on top of the neutral base data.
 * Non-Corrin characters (and a build with everything unset) pass through unchanged.
 */
export function applyCorrinBuild(character: Character, build: CorrinBuild): Character {
  let baseStats = { ...character.baseStats }
  let growthRates = { ...character.growthRates }
  let maxStatModifiers = { ...character.maxStatModifiers }

  if (build.boon) {
    baseStats = { ...baseStats, [build.boon]: baseStats[build.boon] + BASE_STAT_DELTA[build.boon].boon }
    growthRates = applyImpact(growthRates, GROWTH_BOON_IMPACT[build.boon])
    maxStatModifiers = applyImpact(maxStatModifiers, STATCAP_BOON_IMPACT[build.boon])
  }
  if (build.bane) {
    baseStats = { ...baseStats, [build.bane]: baseStats[build.bane] + BASE_STAT_DELTA[build.bane].bane }
    growthRates = applyImpact(growthRates, GROWTH_BANE_IMPACT[build.bane])
    maxStatModifiers = applyImpact(maxStatModifiers, STATCAP_BANE_IMPACT[build.bane])
  }

  // The Talent picker offers both Monk and Shrine Maiden regardless of which Corrin is selected
  // (see CORRIN_TALENT_CLASSES below) — correct it to whichever this specific Corrin can actually
  // be once the build is applied to them.
  const talentClass = build.talentClass ? correctGenderedClass(build.talentClass, character.gender) : undefined

  return {
    ...character,
    baseStats,
    growthRates,
    maxStatModifiers,
    secondaryClass: talentClass ?? character.secondaryClass,
  }
}

/** Corrin's boon/bane/talent selection (set in the Corrin Build panel) affects stats and class inheritance/reclass anywhere a Corrin appears. Non-Corrin characters pass through unchanged. */
export function withCorrinBuild(character: Character, build: CorrinBuild): Character {
  if (character.id !== 'corrin_m' && character.id !== 'corrin_f') return character
  return applyCorrinBuild(character, build)
}

/**
 * Corrin's reclass options at creation. Male/female Corrin share one build (only one exists per
 * playthrough), so both Monk and Shrine Maiden are offered — Monk/Shrine Maiden are mechanically
 * identical, just a gendered flavor name, so either works regardless of which Corrin gets used.
 */
export const CORRIN_TALENT_CLASSES = [
  'Cavalier', 'Knight', 'Fighter', 'Mercenary', 'Outlaw', 'Samurai', 'Oni Savage',
  'Spear Fighter', 'Diviner', 'Sky Knight', 'Archer', 'Wyvern Rider', 'Ninja',
  'Dark Mage', 'Troubadour', 'Apothecary', 'Monk', 'Shrine Maiden',
]
