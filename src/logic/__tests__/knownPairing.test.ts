import { describe, expect, it } from 'vitest'
import { charactersById } from '../../data/characters'
import { computeChild } from '../childCalculator'

/**
 * Formulas doc section 10 calls for validating against a known pairing before trusting the
 * full matrix. Uses "base stats as simpler estimate mode" for parent current-stats (per section 3
 * notes) since we don't have mid-playthrough leveled stats to plug in — so the resulting numbers
 * are intentionally low/conservative, not a real min-maxed result. The point is confirming the
 * formula wiring against a hand-computed expectation, not asserting "correct" gameplay numbers.
 */
describe('known pairing: Laslow x Corrin(F) -> Soleil', () => {
  const laslow = charactersById['laslow']
  const corrinF = charactersById['corrin_f']
  const soleil = charactersById['soleil']

  it('matches a hand-computed Str value using base stats as the current-stats estimate', () => {
    const result = computeChild({
      child: soleil,
      father: laslow,
      mother: corrinF,
      fatherCurrentStats: laslow.baseStats,
      motherCurrentStats: corrinF.baseStats,
    })

    // variable parent = mother (Corrin_f, default rule; Soleil is not Shigure/Kana)
    // growth[str] = (corrinF.growthRates.str=45 + soleil.growthRates.str=60) / 2 = 52.5
    expect(result.growthRates.str).toBe(52.5)

    // C = soleil.baseStats.str(7) + 52.5 * (level10 - 10) = 7
    // childClassBaseStat = Mercenary str base = 5
    // father personal = laslow.str(15) - Mercenary str base(5) = 10; diff = max(10-7,0) = 3
    // mother personal = corrinF.str(7) - Nohr Prince(ss) str base(7) = 0; diff = max(0-7,0) = 0
    // bonus = 3/4 = 0.75; cap = floor(7/10)+2 = 2 -> uncapped
    // final = 5 (class base) + 7 (C) + 0.75 (bonus) = 12.75
    expect(result.baseStats.str).toBe(12.75)
  })

  it('inherits one class from each parent using the real Class Set data', () => {
    const result = computeChild({
      child: soleil,
      father: laslow,
      mother: corrinF,
      fatherCurrentStats: laslow.baseStats,
      motherCurrentStats: corrinF.baseStats,
    })
    // Soleil's own class (Mercenary) collides with Laslow's default (Mercenary) -> his alternate (Ninja)
    // Corrin's Nohr Prince(ss) is beast-shifter-style (freely passed, like Wolfskin/Kitsune) since
    // Soleil isn't Kana — no Talent chosen here, so no second contribution from Corrin.
    expect(result.inheritedClasses.sort()).toEqual(['Mercenary', 'Ninja', 'Nohr Prince(ss)'].sort())
  })
})

describe('known pairing: Odin x Corrin(F) -> Ophelia', () => {
  const odin = charactersById['odin']
  const corrinF = charactersById['corrin_f']
  const ophelia = charactersById['ophelia']

  it('computes without error and inherits a sane class set', () => {
    const result = computeChild({
      child: ophelia,
      father: odin,
      mother: corrinF,
      fatherCurrentStats: odin.baseStats,
      motherCurrentStats: corrinF.baseStats,
    })
    // Ophelia's own class (Dark Mage) collides with Odin's default (Dark Mage) -> his alternate (Samurai)
    // Corrin's Nohr Prince(ss) is freely passed (Ophelia isn't Kana), no Talent chosen here.
    expect(result.inheritedClasses.sort()).toEqual(['Dark Mage', 'Samurai', 'Nohr Prince(ss)'].sort())
    expect(result.hasDragonVeinAccess).toBe(true) // Corrin is royal
  })
})
