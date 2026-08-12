import { describe, expect, it } from 'vitest'
import { charactersById } from '../../data/characters'
import type { ClassData, StatBlock } from '../../data/types'
import {
  baseClassPool,
  friendshipClassSources,
  marriageClassSources,
  ownClassSetSources,
  projectSegments,
  promotedClassPool,
} from '../multiClass'

describe('ownClassSetSources', () => {
  it("returns a normal 2-class unit's default and secondary", () => {
    const laslow = charactersById['laslow'] // Mercenary/Ninja
    expect(ownClassSetSources(laslow)).toEqual([
      { name: 'Mercenary', sourceLabel: 'Own' },
      { name: 'Ninja', sourceLabel: 'Own' },
    ])
  })

  it("includes the tertiary class for the rare 3-set unit (Fuga)", () => {
    const fuga = charactersById['fuga']
    expect(ownClassSetSources(fuga).map((s) => s.name)).toEqual(['Samurai', 'Oni Savage', 'Monk'])
  })
})

describe('marriageClassSources', () => {
  it('returns nothing when no spouse is given', () => {
    expect(marriageClassSources(charactersById['laslow'], undefined)).toEqual([])
  })

  it("returns the spouse's granted class, following the normal seal-reclass rule", () => {
    const laslow = charactersById['laslow']
    const selena = charactersById['selena'] // Mercenary/Sky Knight — collides with Laslow's default
    expect(marriageClassSources(laslow, selena)).toEqual([
      { name: 'Sky Knight', sourceLabel: 'Marriage (Selena)' },
    ])
  })

  it('returns nothing when the spouse is Corrin with no Talent picked yet, instead of the locked Nohr Prince(ss)', () => {
    const laslow = charactersById['laslow']
    const corrinF = charactersById['corrin_f'] // raw data, no Talent applied
    expect(marriageClassSources(laslow, corrinF)).toEqual([])
  })
})

describe('friendshipClassSources', () => {
  const laslow = charactersById['laslow']
  const partners = [charactersById['odin'], charactersById['niles']]

  it('non-Corrin: returns nothing with no friend selected', () => {
    expect(friendshipClassSources(laslow, partners, '', false)).toEqual([])
  })

  it('non-Corrin: returns only the single selected friend', () => {
    const result = friendshipClassSources(laslow, partners, 'odin', false)
    expect(result).toHaveLength(1)
    expect(result[0].sourceLabel).toBe('Friendship (Odin)')
  })

  it('Corrin: returns every eligible partner at once, ignoring selectedFriendId', () => {
    const corrinM = charactersById['corrin_m']
    const result = friendshipClassSources(corrinM, partners, '', true)
    expect(result).toHaveLength(2)
    expect(result.map((s) => s.sourceLabel)).toEqual(['Friendship (Odin)', 'Friendship (Niles)'])
  })

  it('non-Corrin: grants nothing when the selected friend is Corrin — nobody can reach A+ with Corrin, so Corrin never has a friendship class to give', () => {
    const corrinM = charactersById['corrin_m']
    const result = friendshipClassSources(laslow, [corrinM], 'corrin_m', false)
    expect(result).toEqual([])
  })
})

describe('baseClassPool / promotedClassPool', () => {
  it('baseClassPool returns each source\'s base-tier class, deduping by class id and merging labels', () => {
    const sources = [
      { name: 'Cavalier', sourceLabel: 'Own' },
      { name: 'Cavalier', sourceLabel: 'Marriage (Xander)' },
      { name: 'Ninja', sourceLabel: 'Own' },
    ]
    const pool = baseClassPool(sources, 'all')
    expect(pool.map((o) => o.classData.name).sort()).toEqual(['Cavalier', 'Ninja'])
    const cavalierEntry = pool.find((o) => o.classData.name === 'Cavalier')
    expect(cavalierEntry?.sourceLabel).toBe('Own, Marriage (Xander)')
  })

  it('promotedClassPool returns every promotion for each source, not just one', () => {
    const sources = [{ name: 'Cavalier', sourceLabel: 'Own' }]
    const pool = promotedClassPool(sources, 'all')
    expect(pool.map((o) => o.classData.name).sort()).toEqual(['Great Knight', 'Paladin'])
  })

  it('promotedClassPool respects route-locked promotions (Corrin)', () => {
    const sources = [{ name: 'Nohr Prince(ss)', sourceLabel: 'Own' }]
    const pool = promotedClassPool(sources, 'Birthright')
    expect(pool.map((o) => o.classData.name)).toEqual(['Hoshido Noble'])
  })
})

describe('projectSegments', () => {
  const zero: StatBlock = { hp: 0, str: 0, mag: 0, skl: 0, spd: 0, lck: 0, def: 0, res: 0 }
  const base: StatBlock = { hp: 20, str: 10, mag: 0, skl: 8, spd: 9, lck: 5, def: 7, res: 4 }
  const personalGrowth: StatBlock = { hp: 40, str: 50, mag: 0, skl: 50, spd: 55, lck: 25, def: 35, res: 30 }

  function makeClass(growthModifiers: StatBlock, maxStats: StatBlock): ClassData {
    return {
      id: 'test', name: 'Test', tier: 'base', weaponTypes: [], classSkills: [],
      statModifiers: zero, maxStats, growthModifiers, movementType: 'infantry', movement: 5,
      pairUpBonus: { str: 0, mag: 0, skl: 0, spd: 0, lck: 0, def: 0, res: 0, mov: 0 },
    }
  }

  it('applies a single segment exactly like a straight-line projection', () => {
    const classA = makeClass(zero, { ...base, str: 40, hp: 60, mag: 40, skl: 40, spd: 40, lck: 40, def: 40, res: 40 })
    const result = projectSegments(base, personalGrowth, zero, [{ classData: classA, levels: 10 }])
    // str: 10 + 0.5 * 10 = 15
    expect(result.str).toBe(15)
  })

  it('chains growth across two different classes in sequence', () => {
    const highCap = { ...base, str: 99, hp: 99, mag: 99, skl: 99, spd: 99, lck: 99, def: 99, res: 99 }
    const classA = makeClass({ ...zero, str: 50 }, highCap)
    const classB = makeClass({ ...zero, str: 0 }, highCap) // zero growth-modifier, only personalGrowth.str=50 applies
    const result = projectSegments(base, personalGrowth, zero, [
      { classData: classA, levels: 5 },
      { classData: classB, levels: 5 },
    ])
    // Segment A: str = 10 + (50+50)/100 * 5 = 10 + 5 = 15
    // Segment B: str = 15 + (0+50)/100 * 5 = 15 + 2.5 = 17.5 -> rounds to 18
    expect(result.str).toBe(18)
  })

  it("caps a segment's growth at that class's own stat cap, and does not let a later higher-cap class retroactively add back what was wasted", () => {
    const lowCapClass = makeClass({ ...zero, str: 50 }, { ...base, str: 12, hp: 99, mag: 99, skl: 99, spd: 99, lck: 99, def: 99, res: 99 })
    const highCapClass = makeClass({ ...zero, str: 0 }, { ...base, str: 99, hp: 99, mag: 99, skl: 99, spd: 99, lck: 99, def: 99, res: 99 })
    const result = projectSegments(base, personalGrowth, zero, [
      { classData: lowCapClass, levels: 10 }, // would reach 10 + 1.0*10=20 uncapped, but caps at 12
      { classData: highCapClass, levels: 1 }, // personalGrowth.str=50 still applies: 12 + 0.5*1 = 12.5 -> 13
    ])
    // Far below the 21 (20 + another 0.5 level) it would've reached with no cap in segment 1 — the
    // wasted growth from being capped at 12 is gone for good, not restored once the cap goes away.
    expect(result.str).toBe(13)
  })

  it('a zero-level segment is a no-op', () => {
    const classA = makeClass({ ...zero, str: 50 }, { ...base, str: 99, hp: 99, mag: 99, skl: 99, spd: 99, lck: 99, def: 99, res: 99 })
    const result = projectSegments(base, personalGrowth, zero, [{ classData: classA, levels: 0 }])
    expect(result.str).toBe(10)
  })
})
