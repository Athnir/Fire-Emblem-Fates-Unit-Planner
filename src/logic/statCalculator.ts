import { STAT_KEYS, type StatBlock } from '../data/types'

/**
 * child_growth_rate[stat] = (variable_parent_growth_rate[stat] + child_base_growth_rate[stat]) / 2
 * Non-variable parent's growths do not factor in at all.
 */
export function computeGrowthRate(variableParentGrowth: number, childBaseGrowth: number): number {
  return (variableParentGrowth + childBaseGrowth) / 2
}

export function computeGrowthRates(
  variableParentGrowths: StatBlock,
  childBaseGrowths: StatBlock,
): StatBlock {
  const result = {} as StatBlock
  for (const stat of STAT_KEYS) {
    result[stat] = computeGrowthRate(variableParentGrowths[stat], childBaseGrowths[stat])
  }
  return result
}

export interface BaseStatInputs {
  childAbsoluteBaseStat: number
  /** The child's own default class's base-stat contribution (added once, flat, on top of C+bonus). */
  childClassBaseStat: number
  childFullGrowthRate: number
  level: number
  /** Parent's actual current stat total at recruitment time (not their base stats, ideally). */
  fatherCurrentStat: number
  /** Base-stat contribution of whichever class the father's fatherCurrentStat was measured in. */
  fatherClassBaseStat: number
  motherCurrentStat: number
  motherClassBaseStat: number
}

/**
 * Step 1: C = child's "natural" stat at their join level (their own absolute base + any growth
 * from levels above the level-10 baseline).
 * Step 2: parental bonus — each parent's contribution is their PERSONAL stat (current stat minus
 * their own class's base-stat contribution), not their raw displayed/current stat — capped.
 * Step 3: the child's own class's base-stat contribution is added once, flat, on top.
 * Verified against Fire Emblem Wiki's children stat-formula pages (e.g. Nina/Stats).
 */
export function computeBaseStat(inputs: BaseStatInputs): number {
  const {
    childAbsoluteBaseStat,
    childClassBaseStat,
    childFullGrowthRate,
    level,
    fatherCurrentStat,
    fatherClassBaseStat,
    motherCurrentStat,
    motherClassBaseStat,
  } = inputs

  // childFullGrowthRate is a percentage integer (e.g. 45 meaning 45%), same units as every other
  // growth rate in the data (characters.ts, computeGrowthRate) — dividing by 100 here converts it
  // to the per-level fractional gain the formula actually needs. Missing this turned a few points
  // of expected growth into hundreds (e.g. growth 45, 8 levels above baseline: 45*8=360 instead of
  // the intended 0.45*8=3.6) — every existing test happened to use level: 10, zeroing out
  // (level - 10) and hiding the bug completely regardless of this term's scale.
  const C = childAbsoluteBaseStat + (childFullGrowthRate / 100) * (level - 10)
  const fatherPersonalStat = fatherCurrentStat - fatherClassBaseStat
  const motherPersonalStat = motherCurrentStat - motherClassBaseStat
  const fatherDiff = Math.max(fatherPersonalStat - C, 0)
  const motherDiff = Math.max(motherPersonalStat - C, 0)
  const bonus = (fatherDiff + motherDiff) / 4
  const bonusCapped = Math.min(bonus, Math.floor(C / 10) + 2)
  return childClassBaseStat + C + bonusCapped
}

export function computeBaseStats(
  childAbsoluteBaseStats: StatBlock,
  childClassBaseStats: StatBlock,
  childFullGrowthRates: StatBlock,
  level: number,
  fatherCurrentStats: StatBlock,
  fatherClassBaseStats: StatBlock,
  motherCurrentStats: StatBlock,
  motherClassBaseStats: StatBlock,
): StatBlock {
  const result = {} as StatBlock
  for (const stat of STAT_KEYS) {
    result[stat] = computeBaseStat({
      childAbsoluteBaseStat: childAbsoluteBaseStats[stat],
      childClassBaseStat: childClassBaseStats[stat],
      childFullGrowthRate: childFullGrowthRates[stat],
      level,
      fatherCurrentStat: fatherCurrentStats[stat],
      fatherClassBaseStat: fatherClassBaseStats[stat],
      motherCurrentStat: motherCurrentStats[stat],
      motherClassBaseStat: motherClassBaseStats[stat],
    })
  }
  return result
}

/**
 * child_max_stat_modifiers = father + mother + bonus.
 * bonus = 1, except bonus = 0 when the child is Kana AND one of Kana's own parents is itself a child character.
 */
export function computeMaxStatModifiers(
  fatherMaxStatModifiers: StatBlock,
  motherMaxStatModifiers: StatBlock,
  isKanaWithChildParent: boolean,
): StatBlock {
  const bonus = isKanaWithChildParent ? 0 : 1
  const result = {} as StatBlock
  for (const stat of STAT_KEYS) {
    result[stat] = fatherMaxStatModifiers[stat] + motherMaxStatModifiers[stat] + bonus
  }
  return result
}
