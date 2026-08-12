import type { Character, Route, SupportPair } from '../data/types'

export function findSupportPair(
  supports: SupportPair[],
  characterAId: string,
  characterBId: string,
): SupportPair | undefined {
  return supports.find(
    (s) =>
      (s.characterA === characterAId && s.characterB === characterBId) ||
      (s.characterA === characterBId && s.characterB === characterAId),
  )
}

export function isRouteCompatible(pairRoutes: Route[], activeRoute: Route): boolean {
  if (activeRoute === 'all') return true
  return pairRoutes.includes('all') || pairRoutes.includes(activeRoute)
}

/** Same-sex pairings can still support up to A-rank/friendship, just never produce a child. */
export function isSameSexPairing(characterA: Character, characterB: Character): boolean {
  if (characterA.gender === 'both' || characterB.gender === 'both') return false
  return characterA.gender === characterB.gender
}

export function canSupport(
  supports: SupportPair[],
  characterA: Character,
  characterB: Character,
  activeRoute: Route,
): boolean {
  const pair = findSupportPair(supports, characterA.id, characterB.id)
  if (!pair || pair.maxRank === 'not-available') return false
  return isRouteCompatible(pair.route, activeRoute)
}

/** Marriage (S-support) eligibility — does not by itself guarantee a child (see canProduceChild). */
export function canMarry(
  supports: SupportPair[],
  characterA: Character,
  characterB: Character,
  activeRoute: Route,
): boolean {
  const pair = findSupportPair(supports, characterA.id, characterB.id)
  if (!pair || pair.maxRank !== 'S') return false
  return isRouteCompatible(pair.route, activeRoute)
}

export function canProduceChild(
  supports: SupportPair[],
  characterA: Character,
  characterB: Character,
  activeRoute: Route,
): boolean {
  if (isSameSexPairing(characterA, characterB)) return false
  return canMarry(supports, characterA, characterB, activeRoute)
}

/**
 * Friendship Seal eligibility — same-sex A(+) support only. Excludes opposite-sex sibling A-rank
 * supports (e.g. Xander x Camilla), which are real non-romantic supports but don't unlock
 * Friendship Seal reclassing in-game (that's specifically a same-gender mechanic). Kana (gender
 * 'both') is exempted from the same-sex check itself, since our single Kana entity represents
 * either gender and all of Kana's own support data here is genuinely same-sex.
 */
export function canFriendshipSeal(
  supports: SupportPair[],
  characterA: Character,
  characterB: Character,
  activeRoute: Route,
): boolean {
  const eitherIsBoth = characterA.gender === 'both' || characterB.gender === 'both'
  if (!eitherIsBoth && !isSameSexPairing(characterA, characterB)) return false
  return canSupport(supports, characterA, characterB, activeRoute)
}
