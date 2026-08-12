import { describe, expect, it } from 'vitest'
import { characters, charactersById } from '../../data/characters'
import { assignParentRoles, findChildrenForPair, isFamilyBlocked, resolveChildActualParents } from '../childLookup'

const children = characters.filter((c) => c.isChild)

function ids(chars: ReturnType<typeof findChildrenForPair>) {
  return chars.map((c) => c.id).sort()
}

describe('assignParentRoles', () => {
  it('assigns father/mother by gender regardless of argument order', () => {
    const laslow = charactersById['laslow']
    const corrinF = charactersById['corrin_f']
    expect(assignParentRoles(laslow, corrinF)).toEqual({ father: laslow, mother: corrinF })
    expect(assignParentRoles(corrinF, laslow)).toEqual({ father: laslow, mother: corrinF })
  })

  it('returns undefined for a same-sex pair', () => {
    const corrinM = charactersById['corrin_m']
    const niles = charactersById['niles']
    expect(assignParentRoles(corrinM, niles)).toBeUndefined()
  })
})

describe('findChildrenForPair', () => {
  it("finds Siegbert for any of Xander's wives (other than Corrin)", () => {
    expect(ids(findChildrenForPair('xander', 'felicia', children))).toEqual(['siegbert'])
  })

  it("a marriage unlocks BOTH parents' own children, e.g. Laslow x Corrin(F) -> Kana M AND Soleil", () => {
    // Male Kana is only ever Corrin(F)'s child (father variable) — Kana F requires Corrin(M).
    expect(ids(findChildrenForPair('laslow', 'corrin_f', children))).toEqual(['kana_m', 'soleil'])
  })

  it('same for Xander x Corrin(F) -> Kana M AND Siegbert', () => {
    expect(ids(findChildrenForPair('xander', 'corrin_f', children))).toEqual(['kana_m', 'siegbert'])
  })

  it("finds Kana F for Corrin(M) regardless of spouse (Kana M requires Corrin(F) instead)", () => {
    expect(ids(findChildrenForPair('corrin_m', 'felicia', children))).toEqual(['kana_f'])
  })

  it('produces BOTH Kana F and Shigure for Corrin(M) x Azura specifically', () => {
    expect(ids(findChildrenForPair('corrin_m', 'azura', children))).toEqual(['kana_f', 'shigure'])
  })

  it('produces BOTH Shigure and the spouse’s own signature child for any other pairing with Azura', () => {
    // Shigure is Azura's son with a variable father (whoever she marries), the same pattern as
    // every other non-Kana child — not fixed to Corrin(M) specifically.
    expect(ids(findChildrenForPair('xander', 'azura', children))).toEqual(['shigure', 'siegbert'])
  })

  it('returns empty for an unknown parent id with no matching child', () => {
    expect(ids(findChildrenForPair('unknown_id_1', 'unknown_id_2', children))).toEqual([])
  })
})

describe('resolveChildActualParents', () => {
  it('resolves a standard child (Percy) once someone marries his fixed father (Arthur)', () => {
    const percy = charactersById['percy']
    const pairings = [{ characterAId: 'arthur', characterBId: 'corrin_f' }]
    expect(resolveChildActualParents(percy, pairings)).toEqual({ fatherId: 'arthur', motherId: 'corrin_f' })
  })

  it("resolves Shigure once someone marries Azura, regardless of who", () => {
    const shigure = charactersById['shigure']
    const pairings = [{ characterAId: 'laslow', characterBId: 'azura' }]
    expect(resolveChildActualParents(shigure, pairings)).toEqual({ fatherId: 'laslow', motherId: 'azura' })
  })

  it('resolves Kana (either gender entity) from either Corrin appearing in any pairing', () => {
    const kanaM = charactersById['kana_m']
    const kanaF = charactersById['kana_f']
    expect(resolveChildActualParents(kanaM, [{ characterAId: 'laslow', characterBId: 'corrin_f' }])).toEqual({
      fatherId: 'laslow',
      motherId: 'corrin_f',
    })
    expect(resolveChildActualParents(kanaF, [{ characterAId: 'corrin_m', characterBId: 'camilla' }])).toEqual({
      fatherId: 'corrin_m',
      motherId: 'camilla',
    })
  })

  it('returns undefined when the plan has no pairing involving the fixed parent', () => {
    const percy = charactersById['percy']
    expect(resolveChildActualParents(percy, [{ characterAId: 'xander', characterBId: 'corrin_f' }])).toBeUndefined()
  })
})

describe('isFamilyBlocked', () => {
  it("blocks Shigure x Soleil when Laslow is BOTH their father (via Azura AND Corrin(F) marriages)", () => {
    const shigure = charactersById['shigure']
    const soleil = charactersById['soleil']
    const pairings = [
      { characterAId: 'laslow', characterBId: 'azura' },
      // Laslow can only really marry once, but the planner lets you build hypothetical plans —
      // this models the exact case the app must catch: both children end up with Laslow as dad.
    ]
    // Soleil's father is unconditionally Laslow already (possibleParents.father = ['laslow']),
    // so no separate pairing is even needed to fix her side.
    expect(isFamilyBlocked(shigure, soleil, pairings)).toBe(true)
  })

  it('does NOT block Shigure x Soleil when Azura marries someone other than Soleil’s father', () => {
    const shigure = charactersById['shigure']
    const soleil = charactersById['soleil']
    const pairings = [{ characterAId: 'xander', characterBId: 'azura' }]
    expect(isFamilyBlocked(shigure, soleil, pairings)).toBe(false)
  })

  it('blocks Corrin(F) x Percy once Corrin(F) has married Percy’s fixed father (Arthur)', () => {
    const corrinF = charactersById['corrin_f']
    const percy = charactersById['percy']
    const pairings = [{ characterAId: 'arthur', characterBId: 'corrin_f' }]
    expect(isFamilyBlocked(corrinF, percy, pairings)).toBe(true)
  })

  it('does not block Corrin(F) x Percy when Corrin(F) has not married Arthur', () => {
    const corrinF = charactersById['corrin_f']
    const percy = charactersById['percy']
    expect(isFamilyBlocked(corrinF, percy, [])).toBe(false)
  })

  it('blocks Kana M x Percy as half-siblings once Corrin(F) marries Arthur (both get Corrin(F) as mother)', () => {
    // Kana M's fixed parent is Corrin(F) (mother) — Kana F is fixed to Corrin(M) instead, so
    // wouldn't be affected by a Corrin(F) x Arthur pairing at all.
    const kanaM = charactersById['kana_m']
    const percy = charactersById['percy']
    const pairings = [{ characterAId: 'arthur', characterBId: 'corrin_f' }]
    expect(isFamilyBlocked(kanaM, percy, pairings)).toBe(true)
  })

  it('does not block two unrelated adults', () => {
    const laslow = charactersById['laslow']
    const corrinF = charactersById['corrin_f']
    expect(isFamilyBlocked(laslow, corrinF, [])).toBe(false)
  })
})
