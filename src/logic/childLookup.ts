import type { Character } from '../data/types'

export interface ParentRoles {
  father: Character
  mother: Character
}

export type ParentSide = 'father' | 'mother'

export interface FixedParentInfo {
  side: ParentSide
  id: string
}

/**
 * Every child has exactly one parent tied to a specific named character — the other side is
 * whoever that character actually marries (the "variable parent"). Shigure is Azura's son with a
 * variable father (whoever Azura marries); Kana M/F are each tied to one specific Corrin gender
 * (male Kana only to Corrin(F), female Kana only to Corrin(M)) — both fit the same one-fixed-side
 * pattern as every other child via possibleParents, no special-casing needed.
 */
export function getFixedParent(child: Character): FixedParentInfo | undefined {
  const pp = child.possibleParents
  if (pp?.father?.length === 1) return { side: 'father', id: pp.father[0] }
  if (pp?.mother?.length === 1) return { side: 'mother', id: pp.mother[0] }
  return undefined
}

/** Same-sex pairs have no father/mother assignment and thus no child. */
export function assignParentRoles(characterA: Character, characterB: Character): ParentRoles | undefined {
  if (characterA.gender === 'M' && characterB.gender === 'F') return { father: characterA, mother: characterB }
  if (characterA.gender === 'F' && characterB.gender === 'M') return { father: characterB, mother: characterA }
  return undefined
}

type MatchStatus = 'match' | 'no-match' | 'unconstrained'

function matchesSide(list: string[] | undefined, id: string): MatchStatus {
  if (!list || list.length === 0) return 'unconstrained'
  return list.includes(id) ? 'match' : 'no-match'
}

/**
 * A marriage unlocks each parent's OWN child paralogue independently, not just one exclusive
 * result — e.g. Corrin x Laslow unlocks both Kana F (Corrin's child) AND Soleil (Laslow's child)
 * as separate paralogues, each using the other spouse as their "other parent" for inheritance.
 * Every child has exactly one FIXED parent (e.g. Siegbert's father is always Xander, Shigure's
 * mother is always Azura, Kana F's father is always Corrin(M)) with the other side unconstrained —
 * handled generically via possibleParents, no special-casing needed for any child.
 */
export function findChildrenForPair(
  fatherId: string,
  motherId: string,
  candidates: Character[],
): Character[] {
  const results: Character[] = []

  for (const child of candidates) {
    const pp = child.possibleParents
    if (!pp) continue
    const fatherStatus = matchesSide(pp.father, fatherId)
    const motherStatus = matchesSide(pp.mother, motherId)
    if (fatherStatus === 'no-match' || motherStatus === 'no-match') continue
    if (fatherStatus === 'match' || motherStatus === 'match') results.push(child)
  }

  return results
}

interface PairingLike {
  characterAId: string
  characterBId: string
}

export interface ResolvedParents {
  fatherId: string
  motherId: string
}

/**
 * A child's ACTUAL parents given the plan the user has actually built (not just their fixed
 * identity) — e.g. Shigure's father is only known once some pairing in the plan marries Azura to
 * someone. Returns undefined if the plan doesn't yet resolve it (nothing married the fixed
 * parent), since we can't detect a family conflict we have no evidence of.
 */
export function resolveChildActualParents(
  child: Character,
  pairings: PairingLike[],
): ResolvedParents | undefined {
  const fixedInfo = getFixedParent(child)
  if (!fixedInfo) return undefined

  const { side, id } = fixedInfo
  for (const p of pairings) {
    const spouseId = p.characterAId === id ? p.characterBId : p.characterBId === id ? p.characterAId : undefined
    if (spouseId === undefined) continue
    return side === 'father' ? { fatherId: id, motherId: spouseId } : { fatherId: spouseId, motherId: id }
  }
  return undefined
}

/**
 * True if two characters are known to be parent-child or siblings/half-siblings GIVEN the plan
 * the user has actually built. Marriage/S-support between them should be blocked (they can still
 * reach A-rank/friendship support) — but only once the plan actually reveals the conflict, e.g.
 * Shigure and Soleil are only blocked from marrying if the plan shows Laslow married to whoever is
 * Shigure's variable parent (making Laslow Shigure's father too, same as Soleil's).
 */
export function isFamilyBlocked(
  characterA: Character,
  characterB: Character,
  pairings: PairingLike[],
): boolean {
  const parentsA = characterA.isChild ? resolveChildActualParents(characterA, pairings) : undefined
  const parentsB = characterB.isChild ? resolveChildActualParents(characterB, pairings) : undefined

  if (parentsA && (parentsA.fatherId === characterB.id || parentsA.motherId === characterB.id)) return true
  if (parentsB && (parentsB.fatherId === characterA.id || parentsB.motherId === characterA.id)) return true
  if (parentsA && parentsB) {
    const idsA = new Set([parentsA.fatherId, parentsA.motherId])
    if (idsA.has(parentsB.fatherId) || idsA.has(parentsB.motherId)) return true
  }
  return false
}
