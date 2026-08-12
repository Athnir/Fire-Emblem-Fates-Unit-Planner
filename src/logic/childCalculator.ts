import { classesByName } from '../data/classes'
import { PARALLEL_CLASS_TABLE, type Character, type ClassData, type Route, type StatBlock } from '../data/types'
import { correctGenderedClass, getClassLine } from './classResolution'
import { computeBaseStats, computeGrowthRates, computeMaxStatModifiers } from './statCalculator'

type ParentSide = 'father' | 'mother'

const ZERO_STATS: StatBlock = { hp: 0, str: 0, mag: 0, skl: 0, spd: 0, lck: 0, def: 0, res: 0 }

/** Looks up a class's base-stat contribution by display name; falls back to zero for unregistered classes. */
function classBaseStatsFor(className: string): StatBlock {
  return classesByName[className]?.statModifiers ?? ZERO_STATS
}

/**
 * Per formulas doc section 1: variable parent is the mother everywhere EXCEPT Shigure (Azura's
 * child), where it's the father, and Kana (either gender), where it's whichever side ISN'T Corrin
 * — Kana is Corrin's own child, so the non-Corrin spouse is always the variable one regardless of
 * which of Kana's two gender entries (kana_m/kana_f) or which Corrin is involved.
 * Kept as an explicit lookup rather than a blanket "mother = variable" assumption.
 */
const kanaVariableParent = (_father: Character, mother: Character): ParentSide =>
  mother.id === 'corrin_f' ? 'father' : 'mother'

const VARIABLE_PARENT_OVERRIDES: Record<
  string,
  (father: Character, mother: Character) => ParentSide
> = {
  shigure: () => 'father',
  kana_m: kanaVariableParent,
  kana_f: kanaVariableParent,
}

export function determineVariableParent(
  childId: string,
  father: Character,
  mother: Character,
): ParentSide {
  return VARIABLE_PARENT_OVERRIDES[childId]?.(father, mother) ?? 'mother'
}

export interface HairSourceInfo {
  fixedSide: ParentSide
  fixedParentId: string
  /** The side whose identity actually determines hair color — usually the variable side, except
   * Shigure (always his fixed mother, Azura) — see the hairSourceParent comment in computeChild. */
  hairSourceSide: ParentSide
  /** True when hairSourceSide === fixedSide, i.e. hair is already fully determined with no pairing
   * choice needed (currently only Shigure). */
  isHairSourceFixed: boolean
}

/**
 * Determines which side supplies a child's hair WITHOUT needing real father/mother Character
 * objects — used by the Roster tab's hair-source picker, which has no pairing context (unlike
 * computeChild, used by the Unit Planner once an actual pairing is chosen). Relies on the same
 * "possibleParents' non-empty side is fixed" convention documented on the PossibleParents type;
 * for every child except Shigure, empty-side (variable) is also the hair-determining side, matching
 * determineVariableParent's own default (Kana's override collapses to the same result here since
 * this app always fixes Kana's Corrin-gender side — see kanaVariableParent).
 */
export function getHairSourceInfo(child: Character): HairSourceInfo | undefined {
  const parents = child.possibleParents
  if (!parents) return undefined
  const isFatherFixed = (parents.father?.length ?? 0) > 0
  const isMotherFixed = (parents.mother?.length ?? 0) > 0
  if (isFatherFixed === isMotherFixed) return undefined // both/neither fixed — not a supported shape
  const fixedSide: ParentSide = isFatherFixed ? 'father' : 'mother'
  const fixedParentId = (isFatherFixed ? parents.father : parents.mother)?.[0]
  if (!fixedParentId) return undefined
  const variableSide: ParentSide = fixedSide === 'father' ? 'mother' : 'father'
  const hairSourceSide: ParentSide = child.id === 'shigure' ? fixedSide : variableSide
  return { fixedSide, fixedParentId, hairSourceSide, isHairSourceFixed: hairSourceSide === fixedSide }
}

/**
 * A normal parent contributes exactly one of their two classes — their default, unless it
 * collides with a class already present, in which case their alternate (or, if BOTH would
 * collide, the parallel-class-table substitute) is used instead. Per formulas doc section 6.
 * Corrin's "default" is Nohr Prince(ss) and "alternate" is their chosen Talent — same shape as any
 * other character's Class Set, following the same beast-shifter-style collision rule.
 *
 * Azura is a single exception, not a second case: her Songstress is uniquely non-inheritable, so
 * she never contributes it as a "default" — only her real secondary (Sky Knight), and only the
 * parallel substitute for Songstress (Troubadour) in the collision case (i.e. only for Shigure,
 * whose own primary already IS Sky Knight). Either way she still contributes exactly ONE class,
 * same as any other parent — never both Sky Knight and Troubadour at once.
 *
 * Any contributed class also gets corrected to the CHILD's own gender when it's Monk/Shrine
 * Maiden — matters most for Corrin's Talent (shared between corrin_m/corrin_f, only reachable via
 * the Nohr-Prince(ss) collision fallback, i.e. only for Kana), but applies just as well to any
 * other Monk/Shrine-Maiden-holding parent (Azama, Sakura, etc.) passing it to an opposite-gender
 * child — same as Corrin's own display, this needs the RECIPIENT's gender, not the giver's.
 */
function normalParentContribution(classSet: Set<string>, parent: Character, childGender: Character['gender']): string | undefined {
  const raw = (() => {
    if (parent.id === 'azura') {
      const secondary = parent.secondaryClass
      if (!secondary) return undefined
      return classSet.has(secondary) ? (PARALLEL_CLASS_TABLE[parent.startingClass] ?? secondary) : secondary
    }
    const def = parent.startingClass
    const alt = parent.secondaryClass
    const bothAlreadyPresent = classSet.has(def) && alt !== undefined && classSet.has(alt)
    if (bothAlreadyPresent) return PARALLEL_CLASS_TABLE[def] ?? alt
    if (!classSet.has(def)) return def
    return alt
  })()
  return raw ? correctGenderedClass(raw, childGender) : undefined
}

/**
 * The fixed parent's contributed class, computable independent of who the variable parent turns
 * out to be — only the child's own class factors into the collision check, since the fixed
 * parent's identity (and thus their contribution) never depends on the other side of the pairing.
 */
export function fixedParentContribution(child: Character, fixedParent: Character): string[] {
  const contributed = normalParentContribution(new Set([child.startingClass]), fixedParent, child.gender)
  return contributed ? [contributed] : []
}

const isCorrin = (c: Character): boolean => c.id === 'corrin_m' || c.id === 'corrin_f'

/**
 * Explicit rule function (not a static table) per formulas doc section 6.
 *
 * Order matters when the two parents' contributions would otherwise collide with each other (not
 * just with the child's own class): whichever parent is processed first "claims" a class with no
 * collision recorded, so if the SECOND parent's own default/alternate turns out to be that same
 * class, normalParentContribution sees it as if BOTH of the second parent's options were already
 * taken and falls all the way to a generic parallel-class substitute — even though the first
 * parent still had their own alternate available and could have yielded it instead.
 *
 * Corrin is always processed first when involved, so that a collision falls to the OTHER, ordinary
 * parent's alternate class rather than discarding Corrin's Talent (a deliberate player choice, not
 * background data) for an unrelated substitute — e.g. Kana with a Mercenary-talent Corrin and a
 * Laslow father (whose default is also Mercenary) should get Laslow's real secondary, Ninja, not a
 * parallel-table filler in place of Corrin's chosen Talent.
 */
export function inheritClasses(child: Character, father: Character, mother: Character): string[] {
  const classSet = new Set<string>([child.startingClass])

  const orderedParents = isCorrin(mother) && !isCorrin(father) ? [mother, father] : [father, mother]
  for (const parent of orderedParents) {
    const contributed = normalParentContribution(classSet, parent, child.gender)
    if (contributed) classSet.add(contributed)
  }

  return Array.from(classSet)
}

export interface ComputeChildInput {
  child: Character
  father: Character
  mother: Character
  /** Parents' actual current stat totals at recruitment time (not base stats) — pass base stats for a simpler estimate mode. */
  fatherCurrentStats: StatBlock
  motherCurrentStats: StatBlock
  /** Defaults to 10 if unset — callers should normally pass the level from earliestChildLevel/levelForChapter (src/data/childLeveling.ts) instead of relying on this fallback. */
  level?: number
}

export interface ComputedChild {
  childId: string
  variableParent: ParentSide
  growthRates: StatBlock
  baseStats: StatBlock
  maxStatModifiers: StatBlock
  inheritedClasses: string[]
  hasDragonVeinAccess: boolean
  hairSourceParentId: string
}

export function computeChild(input: ComputeChildInput): ComputedChild {
  const { child, father, mother, fatherCurrentStats, motherCurrentStats } = input
  const level = input.level ?? 10

  const variableParent = determineVariableParent(child.id, father, mother)
  const variableParentGrowths =
    variableParent === 'father' ? father.growthRates : mother.growthRates
  const growthRates = computeGrowthRates(variableParentGrowths, child.growthRates)

  const baseStats = computeBaseStats(
    child.baseStats,
    classBaseStatsFor(child.startingClass),
    growthRates,
    level,
    fatherCurrentStats,
    classBaseStatsFor(father.joinClass ?? father.startingClass),
    motherCurrentStats,
    classBaseStatsFor(mother.joinClass ?? mother.startingClass),
  )

  const isKana = child.id === 'kana_m' || child.id === 'kana_f'
  const isKanaWithChildParent = isKana && (father.isChild || mother.isChild)
  const maxStatModifiers = computeMaxStatModifiers(
    father.maxStatModifiers,
    mother.maxStatModifiers,
    isKanaWithChildParent,
  )

  const inheritedClasses = inheritClasses(child, father, mother)

  const hasDragonVeinAccess = Boolean(
    father.isRoyal || father.hasFirstBlood || mother.isRoyal || mother.hasFirstBlood,
  )

  // Hair follows the same mother-default/father-exception rule as the variable parent for
  // most children (e.g. male Kana -> father/Corrin's hair, per formulas doc section 8) — but
  // Shigure is a further FIXED exception: always Azura's hair regardless of the variable-parent
  // rule (which is the father, for his growth/class computations).
  const hairSourceParent: ParentSide = child.id === 'shigure' ? 'mother' : variableParent
  const hairSourceParentId = hairSourceParent === 'father' ? father.id : mother.id

  return {
    childId: child.id,
    variableParent,
    growthRates,
    baseStats,
    maxStatModifiers,
    inheritedClasses,
    hasDragonVeinAccess,
    hairSourceParentId,
  }
}

/**
 * All classes reachable by a child: their own Class Set + fixed parent's contribution (always
 * known, regardless of who the variable parent turns out to be), plus — once a variable parent is
 * given — that parent's own contributed class-line too. Shared by the Roster child-detail panel
 * and by the pair-up partner picker (a child can be picked as someone's pair-up partner too, and
 * needs the same parent-dependent class resolution to show their real available classes).
 */
export function childAvailableClasses(
  child: Character,
  fixedParent: Character,
  fixedSide: ParentSide,
  variableParent: Character | undefined,
  route: Route,
): ClassData[] {
  const ownClassLine = getClassLine(child.startingClass, route)
  const guaranteedById = new Map<string, ClassData>(ownClassLine.map((c) => [c.id, c]))
  fixedParentContribution(child, fixedParent).forEach((name) => {
    getClassLine(name, route).forEach((c) => guaranteedById.set(c.id, c))
  })
  const guaranteedNames = new Set(Array.from(guaranteedById.values(), (c) => c.name))

  if (!variableParent) return Array.from(guaranteedById.values())

  const father = fixedSide === 'father' ? fixedParent : variableParent
  const mother = fixedSide === 'father' ? variableParent : fixedParent
  const result = computeChild({
    child,
    father,
    mother,
    fatherCurrentStats: father.baseStats,
    motherCurrentStats: mother.baseStats,
  })

  const extraById = new Map<string, ClassData>()
  result.inheritedClasses
    .filter((name) => !guaranteedNames.has(name))
    .forEach((name) => {
      getClassLine(name, route).forEach((c) => {
        if (!guaranteedNames.has(c.name)) extraById.set(c.id, c)
      })
    })

  return [...guaranteedById.values(), ...extraById.values()]
}
