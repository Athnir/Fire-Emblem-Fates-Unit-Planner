import { describe, expect, it } from 'vitest'
import { charactersById } from '../../data/characters'
import { applyCorrinBuild, CORRIN_TALENT_CLASSES } from '../corrinBuild'
import { DEFAULT_CORRIN_BUILD } from '../../state/corrinBuildStore'

describe('applyCorrinBuild', () => {
  const corrinM = charactersById['corrin_m']

  it('passes through unchanged with no boon/bane/talent set', () => {
    const result = applyCorrinBuild(corrinM, DEFAULT_CORRIN_BUILD)
    expect(result.baseStats).toEqual(corrinM.baseStats)
    expect(result.growthRates).toEqual(corrinM.growthRates)
    expect(result.secondaryClass).toBe(corrinM.secondaryClass)
  })

  it('applies the Strength boon: +2 base, +15% Str growth, +5% Skl/Def growth', () => {
    const result = applyCorrinBuild(corrinM, { boon: 'str', bane: null, talentClass: null })
    expect(result.baseStats.str).toBe(corrinM.baseStats.str + 2)
    expect(result.growthRates.str).toBe(corrinM.growthRates.str + 15)
    expect(result.growthRates.skl).toBe(corrinM.growthRates.skl + 5)
    expect(result.growthRates.def).toBe(corrinM.growthRates.def + 5)
    // untouched stats stay untouched
    expect(result.growthRates.mag).toBe(corrinM.growthRates.mag)
  })

  it('applies the Magic bane: -2 base, -15% Mag growth, -5% Spd/Res growth', () => {
    const result = applyCorrinBuild(corrinM, { boon: null, bane: 'mag', talentClass: null })
    expect(result.baseStats.mag).toBe(corrinM.baseStats.mag - 2)
    expect(result.growthRates.mag).toBe(corrinM.growthRates.mag - 15)
    expect(result.growthRates.spd).toBe(corrinM.growthRates.spd - 5)
    expect(result.growthRates.res).toBe(corrinM.growthRates.res - 5)
  })

  it("applies HP boon's unique 5-stat stat-cap-modifier spread (HP itself is never a cap column)", () => {
    const result = applyCorrinBuild(corrinM, { boon: 'hp', bane: null, talentClass: null })
    expect(result.maxStatModifiers.str).toBe(1)
    expect(result.maxStatModifiers.mag).toBe(1)
    expect(result.maxStatModifiers.lck).toBe(2)
    expect(result.maxStatModifiers.def).toBe(2)
    expect(result.maxStatModifiers.res).toBe(2)
    expect(result.maxStatModifiers.skl).toBe(0)
    expect(result.maxStatModifiers.spd).toBe(0)
  })

  it('combines boon and bane stat-cap modifiers when both are set on different stats', () => {
    const result = applyCorrinBuild(corrinM, { boon: 'str', bane: 'lck', talentClass: null })
    // Str boon: str+4, skl+2, def+2. Lck bane: str-1, mag-1, lck-3.
    expect(result.maxStatModifiers.str).toBe(4 - 1)
    expect(result.maxStatModifiers.skl).toBe(2)
    expect(result.maxStatModifiers.def).toBe(2)
    expect(result.maxStatModifiers.mag).toBe(-1)
    expect(result.maxStatModifiers.lck).toBe(-3)
  })

  it('sets secondaryClass to the chosen talent class', () => {
    const result = applyCorrinBuild(corrinM, { boon: null, bane: null, talentClass: 'Ninja' })
    expect(result.secondaryClass).toBe('Ninja')
  })

  it('corrects the shared Monk/Shrine Maiden talent to whichever this specific Corrin can actually be', () => {
    const corrinF = charactersById['corrin_f']
    // The Talent picker offers both regardless of which Corrin is selected (one shared build) —
    // applying it should always land on the gender-correct class for the Corrin it's applied to.
    expect(applyCorrinBuild(corrinM, { boon: null, bane: null, talentClass: 'Shrine Maiden' }).secondaryClass).toBe('Monk')
    expect(applyCorrinBuild(corrinM, { boon: null, bane: null, talentClass: 'Monk' }).secondaryClass).toBe('Monk')
    expect(applyCorrinBuild(corrinF, { boon: null, bane: null, talentClass: 'Monk' }).secondaryClass).toBe('Shrine Maiden')
    expect(applyCorrinBuild(corrinF, { boon: null, bane: null, talentClass: 'Shrine Maiden' }).secondaryClass).toBe('Shrine Maiden')
  })

  it('does not mutate the original character object', () => {
    const before = JSON.stringify(corrinM)
    applyCorrinBuild(corrinM, { boon: 'str', bane: 'mag', talentClass: 'Ninja' })
    expect(JSON.stringify(corrinM)).toBe(before)
  })
})

describe('CORRIN_TALENT_CLASSES', () => {
  it('offers both Monk and Shrine Maiden since one shared build covers either gender', () => {
    expect(CORRIN_TALENT_CLASSES).toContain('Monk')
    expect(CORRIN_TALENT_CLASSES).toContain('Shrine Maiden')
  })
})
