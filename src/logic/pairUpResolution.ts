import { charactersById } from '../data/characters'
import {
  combineChildEntry,
  resolveAdultOrCorrinEntry,
  type Boon,
  type RankBonus,
} from '../data/pairUpCharacterBonus'
import type { Character } from '../data/types'
import { getFixedParent } from './childLookup'

/**
 * Resolves any character's own Pair Up entry (C/B/A/S), recursing into their parents if they're a
 * child themselves — needed for the "given" bonus, since a child's entry isn't looked up anywhere,
 * it's assembled from their parents' (see combineChildEntry). Only ever recurses one extra level in
 * practice (a child's own parent can't itself be a second-gen child by the game's actual family
 * structure), but Kana specifically CAN have a second-gen child as their non-Corrin parent (the
 * "second-gen marriage" mechanic), which is exactly that one extra level — getVariableParentId
 * supplies whichever variable-parent selection applies to each level (the unit's own for the top
 * call, the nested child's own separately-selected spouse for the recursive call).
 */
export function resolveGivenEntry(
  character: Character,
  corrinBoon: Boon | null,
  corrinBane: Boon | null,
  getVariableParentId: (childId: string) => string | undefined,
): RankBonus | undefined {
  if (!character.isChild) {
    return resolveAdultOrCorrinEntry(character.id, corrinBoon, corrinBane)
  }
  const fixedInfo = getFixedParent(character)
  if (!fixedInfo) return undefined
  const fixedChar = charactersById[fixedInfo.id]
  const variableId = getVariableParentId(character.id)
  const variableChar = variableId ? charactersById[variableId] : undefined
  if (!fixedChar || !variableChar) return undefined
  const father = fixedInfo.side === 'father' ? fixedChar : variableChar
  const mother = fixedInfo.side === 'father' ? variableChar : fixedChar
  const fatherEntry = resolveGivenEntry(father, corrinBoon, corrinBane, getVariableParentId)
  const motherEntry = resolveGivenEntry(mother, corrinBoon, corrinBane, getVariableParentId)
  return combineChildEntry(fatherEntry, motherEntry)
}
