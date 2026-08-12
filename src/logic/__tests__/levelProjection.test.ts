import { describe, expect, it } from 'vitest'
import type { ClassData, StatBlock } from '../../data/types'
import { classGrowthRate, classStatCap, classStatDelta, projectStats } from '../levelProjection'

const zero: StatBlock = { hp: 0, str: 0, mag: 0, skl: 0, spd: 0, lck: 0, def: 0, res: 0 }
const base: StatBlock = { hp: 20, str: 10, mag: 0, skl: 8, spd: 9, lck: 5, def: 7, res: 4 }
const growth: StatBlock = { hp: 40, str: 50, mag: 0, skl: 50, spd: 55, lck: 25, def: 35, res: 30 }
const caps: StatBlock = { hp: 60, str: 40, mag: 40, skl: 40, spd: 40, lck: 40, def: 40, res: 40 }

describe('classStatDelta', () => {
  it('returns zero when the two classes are identical', () => {
    expect(classStatDelta(base, base)).toEqual(zero)
  })

  it('returns the per-stat difference between two classes', () => {
    const other: StatBlock = { ...base, str: base.str + 3, def: base.def - 1 }
    expect(classStatDelta(other, base)).toEqual({ ...zero, str: 3, def: -1 })
  })
})

describe('classStatCap', () => {
  it("adds the character's personal max-stat modifier onto the class's own max stats", () => {
    const classData = { maxStats: caps } as ClassData
    const modifiers: StatBlock = { ...zero, str: 2 }
    expect(classStatCap(classData, modifiers)).toEqual({ ...caps, str: 42 })
  })
})

describe('classGrowthRate', () => {
  it("adds the character's personal growth rate onto the class's own growth-rate contribution", () => {
    const classData = { growthModifiers: { ...zero, str: 20, def: 5 } } as ClassData
    expect(classGrowthRate(growth, classData)).toEqual({ ...growth, str: 70, def: 40 })
  })
})

describe('projectStats', () => {
  it('grows from startLevel to targetLevel with no class change', () => {
    const result = projectStats({
      baseStats: base, growthRates: growth, selectedGrowthRates: growth, originalCaps: caps, selectedCaps: caps,
      startLevel: 1, classDelta: zero, targetLevel: 11,
    })
    // str: 10 + 0.5 * 10 = 15
    expect(result.str).toBe(15)
    // spd: 9 + 0.55 * 10 = 14.5 -> rounds to 15 (Math.round(14.5)=15)
    expect(result.spd).toBe(15)
  })

  it('caps the projected stat at the class stat cap', () => {
    const result = projectStats({
      baseStats: base, growthRates: growth, selectedGrowthRates: growth, originalCaps: caps, selectedCaps: { ...caps, str: 12 },
      startLevel: 1, classDelta: zero, targetLevel: 20,
    })
    expect(result.str).toBe(12)
  })

  it('applies a one-time class delta plus continued growth when promoting (default, at level 20)', () => {
    const delta = { ...zero, def: 5 }
    const result = projectStats({
      baseStats: base, growthRates: growth, selectedGrowthRates: growth, originalCaps: caps, selectedCaps: caps,
      startLevel: 1, classDelta: delta, targetLevel: 1, promotionLevel: 20,
    })
    // def at promotion: 7 + 0.35*19 = 13.65, +5 delta = 18.65, + 0 further growth (targetLevel=1) -> rounds to 19
    expect(result.def).toBe(19)
  })

  it('cuts base-class growth short for an early promotion', () => {
    const delta = { ...zero, def: 5 }
    const early = projectStats({
      baseStats: base, growthRates: growth, selectedGrowthRates: growth, originalCaps: caps, selectedCaps: caps,
      startLevel: 1, classDelta: delta, targetLevel: 1, promotionLevel: 10,
    })
    const full = projectStats({
      baseStats: base, growthRates: growth, selectedGrowthRates: growth, originalCaps: caps, selectedCaps: caps,
      startLevel: 1, classDelta: delta, targetLevel: 1, promotionLevel: 20,
    })
    expect(early.def).toBeLessThan(full.def)
  })

  it('continues growing in the promoted class after the promotion point', () => {
    const delta = { ...zero, def: 5 }
    const atPromotion = projectStats({
      baseStats: base, growthRates: growth, selectedGrowthRates: growth, originalCaps: caps, selectedCaps: caps,
      startLevel: 1, classDelta: delta, targetLevel: 1, promotionLevel: 10,
    })
    const later = projectStats({
      baseStats: base, growthRates: growth, selectedGrowthRates: growth, originalCaps: caps, selectedCaps: caps,
      startLevel: 1, classDelta: delta, targetLevel: 11, promotionLevel: 10,
    })
    expect(later.def).toBeGreaterThan(atPromotion.def)
  })

  it('discards pre-promotion growth that would have exceeded the base-class cap, rather than carrying it through', () => {
    const delta = { ...zero, str: 2 }
    const lowOriginalCap = { ...caps, str: 12 }
    // Without the tier-1 cap, str at level 20 (pre-promotion) would be 10 + 0.5*19 = 19.5.
    const capped = projectStats({
      baseStats: base, growthRates: growth, selectedGrowthRates: growth, originalCaps: lowOriginalCap, selectedCaps: caps,
      startLevel: 1, classDelta: delta, targetLevel: 1, promotionLevel: 20,
    })
    // Correct: str caps at 12 pre-promotion, then +2 delta = 14 (not 19.5 + 2 = 21.5).
    expect(capped.str).toBe(14)
  })

  it('uses selectedGrowthRates (not the original growthRates) for post-promotion growth', () => {
    const delta = { ...zero, def: 5 }
    const higherPostPromotionGrowth: StatBlock = { ...growth, def: 100 }
    const result = projectStats({
      baseStats: base, growthRates: growth, selectedGrowthRates: higherPostPromotionGrowth,
      originalCaps: caps, selectedCaps: caps, startLevel: 1, classDelta: delta, targetLevel: 2, promotionLevel: 20,
    })
    // def at promotion (lvl 20, pre-promotion growth): 7 + 0.35*19 = 13.65, +5 delta = 18.65,
    // + one level of the SELECTED (post-promotion) growth rate: 18.65 + 1.0*1 = 19.65 -> rounds to 20.
    expect(result.def).toBe(20)
  })
})
