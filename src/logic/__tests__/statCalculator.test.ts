import { describe, expect, it } from 'vitest'
import {
  computeBaseStat,
  computeGrowthRate,
  computeMaxStatModifiers,
} from '../statCalculator'

describe('computeGrowthRate', () => {
  it('averages variable parent growth and child base growth', () => {
    expect(computeGrowthRate(60, 40)).toBe(50)
    expect(computeGrowthRate(0, 0)).toBe(0)
  })
})

describe('computeBaseStat', () => {
  const zeroClassBases = { childClassBaseStat: 0, fatherClassBaseStat: 0, motherClassBaseStat: 0 }

  it('adds no bonus when both parents are below the natural stat C', () => {
    // C = 10 + 50 * (10 - 10) = 10, both parents below 10 -> diffs clamp to 0 -> bonus 0
    const result = computeBaseStat({
      childAbsoluteBaseStat: 10, childFullGrowthRate: 50, level: 10,
      fatherCurrentStat: 5, motherCurrentStat: 5, ...zeroClassBases,
    })
    expect(result).toBe(10)
  })

  it('adds the parental bonus when parents exceed the natural stat C', () => {
    // C = 10, father 30 (+20), mother 20 (+10) -> bonus = 30/4 = 7.5, cap = floor(10/10)+2 = 3
    const result = computeBaseStat({
      childAbsoluteBaseStat: 10, childFullGrowthRate: 0, level: 10,
      fatherCurrentStat: 30, motherCurrentStat: 20, ...zeroClassBases,
    })
    expect(result).toBe(13)
  })

  it('does not cap when the bonus is below the cap', () => {
    // C = 10, father 12 (+2), mother 10 (+0) -> bonus = 2/4 = 0.5, cap = 3 -> uncapped
    const result = computeBaseStat({
      childAbsoluteBaseStat: 10, childFullGrowthRate: 0, level: 10,
      fatherCurrentStat: 12, motherCurrentStat: 10, ...zeroClassBases,
    })
    expect(result).toBe(10.5)
  })

  it('floors each diff at 0 individually before summing', () => {
    // C = 20, father 10 (diff -10 -> 0), mother 30 (diff 10) -> bonus = 10/4 = 2.5
    const result = computeBaseStat({
      childAbsoluteBaseStat: 20, childFullGrowthRate: 0, level: 10,
      fatherCurrentStat: 10, motherCurrentStat: 30, ...zeroClassBases,
    })
    expect(result).toBe(22.5)
  })

  it("adds the child's own class base stat flat, on top of C + bonus", () => {
    // Same as the first case (C=10, bonus=0) but with a class base stat of 17 added
    const result = computeBaseStat({
      childAbsoluteBaseStat: 10, childClassBaseStat: 17, childFullGrowthRate: 50, level: 10,
      fatherCurrentStat: 5, fatherClassBaseStat: 0, motherCurrentStat: 5, motherClassBaseStat: 0,
    })
    expect(result).toBe(27)
  })

  it('scales the growth-rate term as a percentage per level above baseline, not a raw multiplier', () => {
    // C = 10 + (50/100) * (18-10) = 10 + 4 = 14, both parents below 14 -> bonus 0.
    // Regression test for a bug where growth rate (a 0-100 percentage) was multiplied directly by
    // the level delta with no /100, e.g. turning growth 45 at 8 levels above baseline into +360
    // instead of +3.6 — every other test above uses level: 10, which zeroes out (level - 10) and
    // would pass regardless of this term's scale, so this needs its own non-10-level case.
    const result = computeBaseStat({
      childAbsoluteBaseStat: 10, childFullGrowthRate: 50, level: 18,
      fatherCurrentStat: 5, motherCurrentStat: 5, ...zeroClassBases,
    })
    expect(result).toBe(14)
  })

  it("subtracts each parent's own class base before computing their diff (personal stat, not raw current stat)", () => {
    // C = 10. Father's raw current stat is 30, but he's in a class with base 17, so his personal
    // stat is 13 (+3 over C). Mother's raw current stat is 20, class base 5, personal stat 15 (+5).
    // bonus = (3+5)/4 = 2, cap = floor(10/10)+2 = 3 -> uncapped.
    const result = computeBaseStat({
      childAbsoluteBaseStat: 10, childClassBaseStat: 0, childFullGrowthRate: 0, level: 10,
      fatherCurrentStat: 30, fatherClassBaseStat: 17, motherCurrentStat: 20, motherClassBaseStat: 5,
    })
    expect(result).toBe(12)
  })
})

describe('computeMaxStatModifiers', () => {
  it('sums father + mother + 1 bonus by default', () => {
    const stat = {
      hp: 1, str: 1, mag: 1, skl: 1, spd: 1, lck: 1, def: 1, res: 1,
    }
    const result = computeMaxStatModifiers(stat, stat, false)
    expect(result.hp).toBe(3)
  })

  it('drops the bonus to 0 for Kana with a child parent (second-gen marriage)', () => {
    const stat = {
      hp: 1, str: 1, mag: 1, skl: 1, spd: 1, lck: 1, def: 1, res: 1,
    }
    const result = computeMaxStatModifiers(stat, stat, true)
    expect(result.hp).toBe(2)
  })
})
