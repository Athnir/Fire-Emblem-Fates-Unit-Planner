import { STAT_KEYS, type Character, type ClassData, type Route, type StatBlock } from '../data/types'
import { getClassLine, getSealReclassClass } from './classResolution'
import { classGrowthRate, classStatCap } from './levelProjection'

/** One contributor to a unit's available-class pool, labeled for display in the class picker. */
export interface ClassSource {
  name: string
  sourceLabel: string
}

export interface ClassOption {
  classData: ClassData
  sourceLabel: string
}

/** A unit's own Class Set — their default (+ secondary, + tertiary for the rare 3-set characters like Fuga) — always available regardless of any pairing. Corrin's own set (Nohr Prince(ss) + chosen Talent) works the same way once `withCorrinBuild`/`applyCorrinBuild` has been applied to `character`. */
export function ownClassSetSources(character: Character): ClassSource[] {
  return [character.startingClass, character.secondaryClass, character.tertiaryClass]
    .filter((n): n is string => Boolean(n))
    .map((name) => ({ name, sourceLabel: 'Own' }))
}

/** The class this unit gains via Partner Seal (S-support marriage) with `spouse`, once selected. Empty if `spouse` is Corrin with no Talent picked yet — there's nothing to grant. */
export function marriageClassSources(character: Character, spouse: Character | undefined): ClassSource[] {
  if (!spouse) return []
  const name = getSealReclassClass(character, spouse)
  return name ? [{ name, sourceLabel: `Marriage (${spouse.name})` }] : []
}

function isCorrin(character: Character): boolean {
  return character.id === 'corrin_m' || character.id === 'corrin_f'
}

/**
 * The class(es) this unit gains via Friendship Seal (A-rank+ same-sex support). Normally exactly
 * one, from a single selected A+ friend — matching how a real playthrough only has support points
 * to actually reach A+ with one partner. Corrin is asymmetric here: as the RECEIVER, the avatar has
 * no separate "A+" tier of their own (support caps at A with virtually the whole same-gender cast
 * rather than being funneled into one relationship), so every eligible partner's class is available
 * to pick from at once instead of requiring one to be singled out. But as a potential GIVER, nobody
 * can actually reach A+ with Corrin in the first place (that's the trigger Friendship Seal needs),
 * so Corrin never grants a friendship class to anyone — Corrin only ever passes their Talent along
 * through the normal marriage (Partner Seal) and child-inheritance mechanics, never friendship.
 */
export function friendshipClassSources(
  character: Character,
  eligiblePartners: Character[],
  selectedFriendId: string,
  isCorrinSelf: boolean,
): ClassSource[] {
  if (isCorrinSelf) {
    return eligiblePartners.flatMap((p) => {
      const name = getSealReclassClass(character, p)
      return name ? [{ name, sourceLabel: `Friendship (${p.name})` }] : []
    })
  }
  const friend = eligiblePartners.find((p) => p.id === selectedFriendId)
  if (!friend || isCorrin(friend)) return []
  const name = getSealReclassClass(character, friend)
  return name ? [{ name, sourceLabel: `Friendship (${friend.name})` }] : []
}

function dedupedPool(sources: ClassSource[], route: Route, pick: (line: ClassData[]) => ClassData[]): ClassOption[] {
  const byId = new Map<string, ClassOption>()
  sources.forEach(({ name, sourceLabel }) => {
    pick(getClassLine(name, route)).forEach((cls) => {
      const existing = byId.get(cls.id)
      if (existing) {
        if (!existing.sourceLabel.includes(sourceLabel)) existing.sourceLabel += `, ${sourceLabel}`
      } else {
        byId.set(cls.id, { classData: cls, sourceLabel })
      }
    })
  })
  return Array.from(byId.values())
}

/** Base-tier options for the pre-promotion multi-class picker: each source's own base-tier entry. */
export function baseClassPool(sources: ClassSource[], route: Route): ClassOption[] {
  return dedupedPool(sources, route, (line) => (line[0] ? [line[0]] : []))
}

/** Promoted-tier options for the post-promotion multi-class picker: every promotion reachable through each source's line (e.g. both Paladin and Great Knight, for a Cavalier-line source). */
export function promotedClassPool(sources: ClassSource[], route: Route): ClassOption[] {
  return dedupedPool(sources, route, (line) => line.slice(1))
}

export interface ClassSegment {
  id: string
  classId: string
  levels: number
}

/**
 * Sequentially applies each segment's class growth for its level count, clamping to that class's
 * own stat cap at the end of each segment. Mathematically identical to clamping after every
 * individual level in between, since growth only ever increases and a segment's cap is constant
 * throughout it — once a stat is capped mid-segment, further growth in that same class would be
 * wasted every subsequent level too.
 */
export function projectSegments(
  startStats: StatBlock,
  personalGrowthRates: StatBlock,
  maxStatModifiers: StatBlock,
  segments: { classData: ClassData; levels: number }[],
): StatBlock {
  let current: StatBlock = { ...startStats }
  for (const seg of segments) {
    if (seg.levels <= 0) continue
    const growth = classGrowthRate(personalGrowthRates, seg.classData)
    const cap = classStatCap(seg.classData, maxStatModifiers)
    const next = {} as StatBlock
    for (const key of STAT_KEYS) {
      next[key] = Math.min(current[key] + (growth[key] / 100) * seg.levels, cap[key])
    }
    current = next
  }
  const rounded = {} as StatBlock
  for (const key of STAT_KEYS) rounded[key] = Math.round(current[key])
  return rounded
}
