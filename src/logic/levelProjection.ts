import type { ClassData, Route, StatBlock } from '../data/types'
import { STAT_KEYS } from '../data/types'

/** The character's join level on this route, falling back to 1 (the near-universal default) when unset. */
export function getStartingLevel(startingLevel: Partial<Record<Route, number>> | undefined, route: Route): number {
  return startingLevel?.[route] ?? 1
}

/** Per-stat difference between two classes' statModifiers — the one-time bonus applied at promotion, or zero when the classes are the same. */
export function classStatDelta(selected: StatBlock, original: StatBlock): StatBlock {
  const result = {} as StatBlock
  for (const key of STAT_KEYS) {
    result[key] = selected[key] - original[key]
  }
  return result
}

/** A class's real stat cap for this specific character: its own maximum-stats table plus their personal max-stat modifier. */
export function classStatCap(classData: ClassData, maxStatModifiers: StatBlock): StatBlock {
  const result = {} as StatBlock
  for (const key of STAT_KEYS) {
    result[key] = classData.maxStats[key] + maxStatModifiers[key]
  }
  return result
}

/** A class's real growth rate for this specific character: their own personal growth rate plus the class's growth-rate contribution (Serenes Forest splits these across separate character/class pages — both are needed for the true total). */
export function classGrowthRate(personalGrowthRates: StatBlock, classData: ClassData): StatBlock {
  const result = {} as StatBlock
  for (const key of STAT_KEYS) {
    result[key] = personalGrowthRates[key] + classData.growthModifiers[key]
  }
  return result
}

export interface LevelProjectionInput {
  baseStats: StatBlock
  /** Growth rate while still in the character's original class — used for the pre-promotion phase (or the whole projection, when not crossing a promotion). */
  growthRates: StatBlock
  /** Growth rate in the class being projected into — used for the post-promotion phase, or the whole projection when not crossing a promotion (same as `growthRates` in that case, since growth itself changes at the promotion boundary just like the stat-modifier delta does). */
  selectedGrowthRates: StatBlock
  /** Stat cap while still in the character's original class — used to cut off pre-promotion growth that would have been wasted. */
  originalCaps: StatBlock
  /** Stat cap in the class being projected into (same as originalCaps when not crossing a promotion). */
  selectedCaps: StatBlock
  startLevel: number
  /** selectedClass.statModifiers - originalClass.statModifiers (zero block when viewing the character's own current class). */
  classDelta: StatBlock
  /**
   * The in-class level being projected to. When `promotionLevel` is set, this counts levels
   * *since promoting* (1 = right at promotion, no post-promotion growth yet); otherwise it counts
   * levels since `startLevel` in the character's original class.
   */
  targetLevel: number
  /** Set only when projecting into a promoted class the character doesn't start in — the base-class level they promoted at (10-19, or their startLevel if already above 10; omit for 20/never-early). */
  promotionLevel?: number
}

/**
 * Straight-line growth from `startLevel` to `endLevel` in one class, capped at that class's own
 * stat cap (excess growth is wasted, not carried over into a later class/tier). Shared by
 * `projectStats`'s pre-promotion stage and the multi-class segment engine (src/logic/multiClass.ts)
 * for whichever side of a promotion boundary isn't using custom class segments.
 */
export function stageEndStats(
  baseStats: StatBlock,
  growthRates: StatBlock,
  caps: StatBlock,
  startLevel: number,
  endLevel: number,
): StatBlock {
  const result = {} as StatBlock
  for (const key of STAT_KEYS) {
    result[key] = Math.min(baseStats[key] + (growthRates[key] / 100) * (endLevel - startLevel), caps[key])
  }
  return result
}

/**
 * Rough level-up projection: base stat + growth% per level, capped at each class's real stat cap.
 * When `promotionLevel` is given, growth is split into two stages — base-class growth up to the
 * promotion point (capped at the base class's own cap, since excess growth there is wasted, not
 * carried over), then the one-time class-delta bonus, then further growth in the new class using
 * `selectedGrowthRates` — the class's own growth-rate contribution changes at promotion, same as
 * its stat-modifier contribution does.
 */
export function projectStats(input: LevelProjectionInput): StatBlock {
  const { baseStats, growthRates, selectedGrowthRates, originalCaps, selectedCaps, startLevel, classDelta, targetLevel, promotionLevel } = input
  const result = {} as StatBlock
  for (const key of STAT_KEYS) {
    let value: number
    if (promotionLevel !== undefined) {
      const atPromotion = stageEndStats(baseStats, growthRates, originalCaps, startLevel, promotionLevel)[key]
      const postPromotionBase = Math.min(atPromotion + classDelta[key], selectedCaps[key])
      value = postPromotionBase + (selectedGrowthRates[key] / 100) * (targetLevel - 1)
    } else {
      value = baseStats[key] + classDelta[key] + (selectedGrowthRates[key] / 100) * (targetLevel - startLevel)
    }
    result[key] = Math.min(Math.round(value), selectedCaps[key])
  }
  return result
}
