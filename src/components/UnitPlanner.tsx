import { useEffect, useMemo, useRef, useState } from 'react'
import { characters, charactersById } from '../data/characters'
import { earliestChapterFor, earliestChildLevel, FINAL_CHAPTER, levelForChapter } from '../data/childLeveling'
import { classes as allClasses, classesById, classesByName } from '../data/classes'
import { STAT_KEYS, type Character, type ClassData, type Route, type StatBlock } from '../data/types'
import { childAvailableClasses, computeChild, fixedParentContribution } from '../logic/childCalculator'
import { getFixedParent } from '../logic/childLookup'
import { getOwnClassTree, isCorrinWithoutTalent, weaponRankBonus } from '../logic/classResolution'
import { applyCorrinBuild, withCorrinBuild } from '../logic/corrinBuild'
import { canFriendshipSeal, canMarry, canProduceChild, canSupport, isRouteCompatible } from '../logic/eligibility'
import { classGrowthRate, classStatCap, classStatDelta, getStartingLevel, projectStats } from '../logic/levelProjection'
import {
  baseClassPool,
  friendshipClassSources,
  marriageClassSources,
  ownClassSetSources,
  promotedClassPool,
  projectSegments,
  type ClassOption,
  type ClassSegment,
  type ClassSource,
} from '../logic/multiClass'
import {
  combineChildEntry,
  cumulativePairUpBonus,
  resolveAdultOrCorrinEntry,
  type Boon,
  type RankBonus,
} from '../data/pairUpCharacterBonus'
import { supports } from '../data/supports'
import { useCorrinBuildStore, type CorrinBuild } from '../state/corrinBuildStore'
import { usePlannerStore } from '../state/plannerStore'
import type { SavedBuild } from '../state/savedBuildsStore'
import { useScreenshotContextStore } from '../state/screenshotContextStore'
import { RouteFilter } from './RouteFilter'
import { SavedBuildsManager } from './SavedBuildsManager'

const STAT_LABELS: Record<string, string> = {
  hp: 'HP', str: 'Str', mag: 'Mag', skl: 'Skl', spd: 'Spd', lck: 'Lck', def: 'Def', res: 'Res',
}
const COMBAT_BONUS_LABELS: Record<string, string> = { hit: 'Hit', avoid: 'Avoid', crit: 'Crit', dodge: 'Dodge' }

/** DLC (Scroll item) and Amiibo classes, in that order — not tied to any character's normal class set. */
const ITEM_CLASSES = allClasses.filter((c) => c.isDlcClass || c.isAmiibo)

function StatTable({
  title,
  stats,
  round,
  className,
  capStats,
}: {
  title: string
  stats: StatBlock
  round?: boolean
  className?: string
  /** When given, a stat that's reached its cap renders green, same convention the game itself uses —
   * only while it's actually AT the cap, so a promotion raising the cap turns it back to normal
   * until growth catches up to the new ceiling again. */
  capStats?: StatBlock
}) {
  return (
    <div className={className}>
      <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">{title}</h4>
      <div className="grid max-w-sm grid-cols-4 gap-x-3 gap-y-1 text-sm">
        {STAT_KEYS.map((key) => {
          const value = round ? Math.round(stats[key]) : stats[key]
          const capped = capStats !== undefined && value >= capStats[key]
          return (
            <div key={key} className="flex justify-between gap-2">
              <span className="text-neutral-500">{STAT_LABELS[key]}</span>
              <span className={`font-mono ${capped ? 'text-green-400' : 'text-neutral-100'}`}>{value}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Per-stat "from → to" comparison between a unit's original (join) class and a reclassed target,
 * so the actual change is legible at a glance instead of needing to remember the old numbers —
 * gains in light blue, drops in red, same "quick visual check" convention as the capped-stat green. */
function ClassModifierDiff({ title, from, to }: { title: string; from: StatBlock; to: StatBlock }) {
  return (
    <div>
      <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">{title}</h4>
      <div className="grid max-w-sm grid-cols-4 gap-x-3 gap-y-1 text-sm">
        {STAT_KEYS.map((key) => {
          const fromValue = from[key]
          const toValue = to[key]
          const color = toValue > fromValue ? 'text-sky-400' : toValue < fromValue ? 'text-red-400' : 'text-neutral-100'
          return (
            <div key={key} className="flex justify-between gap-2">
              <span className="text-neutral-500">{STAT_LABELS[key]}</span>
              <span className={`font-mono ${color}`}>{fromValue} → {toValue}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * One row per class segment: pick which of the pooled classes this stretch of levels was spent in,
 * and how many levels. `remaining` is how many more levels are available across the WHOLE list (not
 * just this row) — used both to cap the per-row input and to disable "Add" once exhausted.
 */
function SegmentEditor({
  pool,
  segments,
  onAdd,
  onUpdate,
  onRemove,
  cap,
  used,
}: {
  pool: ClassOption[]
  segments: ClassSegment[]
  onAdd: () => void
  onUpdate: (id: string, patch: Partial<ClassSegment>) => void
  onRemove: (id: string) => void
  cap: number
  used: number
}) {
  const remaining = cap - used
  return (
    <div className="space-y-2">
      <div className="text-xs text-neutral-400">
        {used} / {cap} levels planned
      </div>
      <div className="space-y-1.5">
        {segments.map((seg) => {
          const option = pool.find((o) => o.classData.id === seg.classId)
          const rowMax = Math.max(1, seg.levels + remaining)
          return (
            <div key={seg.id} className="flex flex-wrap items-center gap-2 rounded-md border border-neutral-800 p-2">
              <select
                value={seg.classId}
                onChange={(e) => onUpdate(seg.id, { classId: e.target.value })}
                className="w-full min-w-[9rem] max-w-xs rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-xs text-neutral-200"
              >
                {pool.map((o) => (
                  <option key={o.classData.id} value={o.classData.id}>
                    {o.classData.name} — {o.sourceLabel}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-1 text-xs text-neutral-400">
                Levels
                <input
                  type="number"
                  min={1}
                  max={rowMax}
                  value={seg.levels}
                  onChange={(e) => {
                    const raw = Math.round(Number(e.target.value)) || 1
                    onUpdate(seg.id, { levels: Math.min(Math.max(1, raw), rowMax) })
                  }}
                  className="w-14 rounded-md border border-neutral-700 bg-neutral-800 px-1.5 py-1 text-xs text-neutral-200"
                />
              </label>
              {!option && <span className="text-xs text-amber-400">no longer available</span>}
              <button
                type="button"
                onClick={() => onRemove(seg.id)}
                className="ml-auto text-xs text-neutral-500 hover:text-red-400"
              >
                Remove
              </button>
            </div>
          )
        })}
      </div>
      <button
        type="button"
        onClick={onAdd}
        disabled={pool.length === 0 || remaining <= 0}
        className="rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-xs text-neutral-300 transition-colors hover:border-neutral-600 disabled:opacity-40"
      >
        + Add class segment
      </button>
    </div>
  )
}

const PAIR_UP_RANKS = [
  { value: 'none', label: 'No rank' },
  { value: 'A', label: 'A rank' },
  { value: 'S', label: 'S rank' },
] as const
type PairUpRank = (typeof PAIR_UP_RANKS)[number]['value']

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
function resolveGivenEntry(
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

/**
 * Movement, weapon ranks, combat bonus, Aptitude growth toggle, and pair-up bonus for whichever
 * class this unit is currently in (their join/base class). "Given" pair-up bonus combines the
 * class-based layer (classData.pairUpBonus, always full regardless of rank) with the
 * character-specific layer (own support-rank table, cumulative by rank — see resolveGivenEntry
 * above and pairUpCharacterBonus.ts). If that layer can't be fully resolved yet (missing a variable
 * parent, or Corrin without boon+bane set anywhere in the chain), every field shows "–" instead of a
 * number that would otherwise look like a real (if low) total — see cumulativePairUpBonus's comment.
 */
function MechanicsSection({
  classData,
  statCaps,
  ownCharacter,
  getOwnVariableParentId,
  activeRoute,
  corrinBuild,
}: {
  classData: ClassData | undefined
  statCaps?: StatBlock
  ownCharacter: Character
  /** Resolves the variable-parent id for ownCharacter (if a child) or, recursively, for whichever
   * second-gen child ends up in ownCharacter's own parent chain (only possible for Kana) — see
   * resolveGivenEntry above. */
  getOwnVariableParentId: (childId: string) => string | undefined
  activeRoute: Route
  corrinBuild: CorrinBuild
}) {
  const [moveSkillOn, setMoveSkillOn] = useState(false)
  const [bootsOn, setBootsOn] = useState(false)
  const [pairUpRank, setPairUpRank] = useState<PairUpRank>('none')
  const [pairUpPartnerId, setPairUpPartnerId] = useState('')
  const [partnerVariableParentId, setPartnerVariableParentId] = useState('')
  const [partnerClassId, setPartnerClassId] = useState('')
  const [givenPairUpRank, setGivenPairUpRank] = useState<PairUpRank>('none')

  function selectRank(rank: PairUpRank) {
    setPairUpRank(rank)
    setPairUpPartnerId('')
    setPartnerVariableParentId('')
    setPartnerClassId('')
  }

  function selectPartner(id: string) {
    setPairUpPartnerId(id)
    setPartnerVariableParentId('')
    setPartnerClassId('')
  }

  // Pair-up itself (the class-based stat bonus) needs no support at all — any adjacent unit on the
  // route works ("No rank"). A-rank and S-rank narrow that down to who this unit can actually reach
  // that support tier with, per the real support-pair data (canSupport covers A, B, and friendship
  // ranks; S-capable partners also satisfy "at least A" so they appear in that tier too).
  const partnerOptions = useMemo(() => {
    return characters.filter((c) => {
      if (c.id === ownCharacter.id) return false
      if (!isRouteCompatible(c.route, activeRoute)) return false
      if (pairUpRank === 'S') return canMarry(supports, ownCharacter, c, activeRoute)
      if (pairUpRank === 'A') return canSupport(supports, ownCharacter, c, activeRoute)
      return true
    })
  }, [ownCharacter, activeRoute, pairUpRank])

  const partner = pairUpPartnerId ? charactersById[pairUpPartnerId] : undefined
  // If the partner is a child, their available classes depend on their own fixed/variable parents
  // (same resolution as this unit's own detail below) rather than a plain class-set lookup.
  const partnerFixedInfo = partner?.isChild ? getFixedParent(partner) : undefined
  const partnerFixedChar = partnerFixedInfo ? withCorrinBuild(charactersById[partnerFixedInfo.id], corrinBuild) : undefined
  // These two useMemo calls must stay ABOVE the `classData` early return below — React hooks can't
  // be called conditionally, and this component can render with classData undefined (no class
  // selected yet) just as easily as with it set.
  const partnerVariableCandidates = useMemo(() => {
    if (!partnerFixedInfo || !partnerFixedChar) return []
    return characters.filter((c) => {
      if (c.isChild || c.id === partnerFixedChar.id) return false
      const father = partnerFixedInfo.side === 'father' ? partnerFixedChar : c
      const mother = partnerFixedInfo.side === 'father' ? c : partnerFixedChar
      return canProduceChild(supports, father, mother, activeRoute)
    })
  }, [partnerFixedInfo, partnerFixedChar, activeRoute])
  const partnerVariableChar = partnerVariableParentId
    ? withCorrinBuild(charactersById[partnerVariableParentId], corrinBuild)
    : undefined

  const partnerDefaultClass = partner ? classesByName[partner.joinClass ?? partner.startingClass] : undefined
  const partnerAvailableClasses = useMemo(() => {
    if (!partner) return []
    if (partner.isChild && partnerFixedInfo && partnerFixedChar) {
      return childAvailableClasses(partner, partnerFixedChar, partnerFixedInfo.side, partnerVariableChar, activeRoute)
    }
    const tree = getOwnClassTree(partner, activeRoute)
    const byId = new Map<string, ClassData>()
    ;[...tree.base, ...tree.secondary, ...tree.tertiary].forEach((c) => byId.set(c.id, c))
    return Array.from(byId.values())
  }, [partner, partnerFixedInfo, partnerFixedChar, partnerVariableChar, activeRoute])
  const partnerClass = partnerAvailableClasses.find((c) => c.id === partnerClassId) ?? partnerDefaultClass

  if (!classData) return null

  const movBonus = (moveSkillOn ? 1 : 0) + (bootsOn ? 2 : 0)
  const finalMov = classData.movement + movBonus

  // The character-specific layer of the GIVEN bonus (added on top of classData.pairUpBonus below).
  // undefined means "can't be resolved yet" (missing a variable parent somewhere in the chain, or
  // Corrin without boon+bane) — the render below shows "–" for every field in that case rather than
  // a real-looking but incomplete number. See resolveGivenEntry's comment for why this can recurse.
  const givenEntry = resolveGivenEntry(ownCharacter, corrinBuild.boon, corrinBuild.bane, getOwnVariableParentId)
  const givenCharacterBonus = cumulativePairUpBonus(givenEntry, givenPairUpRank)

  return (
    <div className="space-y-3 border-t border-neutral-800 pt-3">
      {(classData.weaponRanks?.length || classData.combatBonus) && (
        <div className="text-sm text-neutral-300">
          {classData.weaponRanks?.length ? (
            <div>
              <span className="text-neutral-500">Weapon ranks: </span>
              {classData.weaponRanks
                .map((w) => {
                  const bonus = weaponRankBonus(w.type, w.rank)
                  return `${w.type} ${w.rank}${bonus ? ` (${bonus})` : ''}`
                })
                .join(', ')}
            </div>
          ) : null}
          {classData.combatBonus && (
            <div>
              <span className="text-neutral-500">Class bonus: </span>
              {Object.entries(classData.combatBonus)
                .map(([k, v]) => `${COMBAT_BONUS_LABELS[k] ?? k} ${v > 0 ? '+' : ''}${v}`)
                .join(', ')}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-xs text-neutral-300">
          <input type="checkbox" checked={moveSkillOn} onChange={(e) => setMoveSkillOn(e.target.checked)} />
          Movement +1 skill equipped
        </label>
        <label className="flex items-center gap-2 text-xs text-neutral-300">
          <input type="checkbox" checked={bootsOn} onChange={(e) => setBootsOn(e.target.checked)} />
          Boots equipped
        </label>
      </div>
      <div className="text-sm text-neutral-300">
        <span className="text-neutral-500">Movement: </span>
        {classData.movement}
        {movBonus > 0 ? ` + ${movBonus} = ${finalMov}` : ''}
      </div>

      <div>
        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Pair-up bonus given (as support partner)
        </h4>
        <div className="mb-1.5 flex gap-1.5">
          {PAIR_UP_RANKS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setGivenPairUpRank(r.value)}
              className={`rounded-md border px-2 py-1 text-xs transition-colors ${
                givenPairUpRank === r.value
                  ? 'border-violet-500 bg-violet-950/50 text-violet-200'
                  : 'border-neutral-700 bg-neutral-800 text-neutral-300 hover:border-neutral-600'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        {givenCharacterBonus === undefined && (
          <p className="mb-1.5 text-xs text-amber-400">
            Fill in everything needed to resolve this bonus (variable parent, Corrin's boon/bane if
            either parent is Corrin) to see real numbers here — showing "–" rather than a total that
            would otherwise look complete but is missing a piece.
          </p>
        )}
        <div className="grid max-w-sm grid-cols-4 gap-x-3 gap-y-1 text-sm">
          {(['str', 'mag', 'skl', 'spd', 'lck', 'def', 'res'] as const).map((key) => {
            const total = givenCharacterBonus === undefined ? undefined : classData.pairUpBonus[key] + (givenCharacterBonus[key] ?? 0)
            return (
              <div key={key} className="flex justify-between gap-2">
                <span className="text-neutral-500">{STAT_LABELS[key]}</span>
                <span className="font-mono text-neutral-100">
                  {total === undefined ? '–' : total > 0 ? `+${total}` : total}
                </span>
              </div>
            )
          })}
          <div className="flex justify-between gap-2">
            <span className="text-neutral-500">Mov</span>
            <span className="font-mono text-neutral-100">
              {givenCharacterBonus === undefined
                ? '–'
                : classData.pairUpBonus.mov > 0
                  ? `+${classData.pairUpBonus.mov}`
                  : classData.pairUpBonus.mov}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1 text-xs text-neutral-400">
        Pair-up bonus received from
        <div className="flex gap-1.5">
          {PAIR_UP_RANKS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => selectRank(r.value)}
              className={`rounded-md border px-2 py-1 text-xs transition-colors ${
                pairUpRank === r.value
                  ? 'border-violet-500 bg-violet-950/50 text-violet-200'
                  : 'border-neutral-700 bg-neutral-800 text-neutral-300 hover:border-neutral-600'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <select
          value={pairUpPartnerId}
          onChange={(e) => selectPartner(e.target.value)}
          className="w-full max-w-sm rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-200"
        >
          <option value="">(none selected)</option>
          {partnerOptions.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      {partner?.isChild && (
        <label className="flex flex-col gap-1 text-xs text-neutral-400">
          {partner.name}'s variable parent (needed for their real class options)
          <select
            value={partnerVariableParentId}
            onChange={(e) => {
              setPartnerVariableParentId(e.target.value)
              setPartnerClassId('')
            }}
            className="w-full max-w-sm rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-200"
          >
            <option value="">(none selected)</option>
            {partnerVariableCandidates.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
      )}
      {partnerAvailableClasses.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {partnerAvailableClasses.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setPartnerClassId(c.id)}
              className={`rounded-md border px-2 py-1 text-xs transition-colors ${
                (partnerClassId ? partnerClassId === c.id : partnerDefaultClass?.id === c.id)
                  ? 'border-violet-500 bg-violet-950/50 text-violet-200'
                  : 'border-neutral-700 bg-neutral-800 text-neutral-300 hover:border-neutral-600'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
      {partnerClass && (
        <p className="text-xs text-neutral-500">
          {partner?.name} in {partnerClass.name} grants: {(['str', 'mag', 'skl', 'spd', 'lck', 'def', 'res'] as const)
            .filter((key) => partnerClass.pairUpBonus[key] !== 0)
            .map((key) => `${STAT_LABELS[key]} +${partnerClass.pairUpBonus[key]}`)
            .join(', ') || 'no stat bonus'}
          {partnerClass.pairUpBonus.mov ? `, Mov +${partnerClass.pairUpBonus.mov}` : ''}
        </p>
      )}

      {statCaps && partnerClass && (
        <div>
          <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Technical max (stat cap + pair-up bonus from {partner?.name})
          </h4>
          <div className="grid max-w-sm grid-cols-4 gap-x-3 gap-y-1 text-sm">
            {STAT_KEYS.map((key) => {
              const bonus = key === 'hp' ? 0 : partnerClass.pairUpBonus[key]
              return (
                <div key={key} className="flex justify-between gap-2">
                  <span className="text-neutral-500">{STAT_LABELS[key]}</span>
                  <span className="font-mono text-neutral-100">{Math.round(statCaps[key]) + bonus}</span>
                </div>
              )
            })}
            <div className="flex justify-between gap-2">
              <span className="text-neutral-500">Mov</span>
              <span className="font-mono text-neutral-100">{finalMov + partnerClass.pairUpBonus.mov}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Adults and children share one detail body: a child's "effective" base/growth/max-stat-modifier
 * values just fall back to their own raw data until a variable parent is picked (computeChild then
 * supplies the real blended numbers), which lets the same class-projection and mechanics logic
 * apply to both — including Projected Stats, previously adult-only since children's stat-cap
 * formula wasn't generalized to classes besides their own starting one.
 */
function UnitDetail({
  character: rawCharacter,
  activeRoute,
  corrinBuild,
  pendingBuildData,
  onConsumePendingBuildData,
  onRequestLoadBuild,
}: {
  character: Character
  activeRoute: Route
  corrinBuild: CorrinBuild
  /** A build's saved `data` blob, once its characterId has already been switched to by the parent
   * (UnitPlanner owns `unitId`, which this component's own local state can't reach) — applied via
   * the effect below, keyed off this reference so it fires whether or not switching characters
   * actually remounted this component (loading a build for the ALREADY-selected character doesn't). */
  pendingBuildData: Record<string, unknown> | null
  onConsumePendingBuildData: () => void
  onRequestLoadBuild: (build: SavedBuild) => void
}) {
  const isCorrin = rawCharacter.id === 'corrin_m' || rawCharacter.id === 'corrin_f'
  const character = isCorrin ? applyCorrinBuild(rawCharacter, corrinBuild) : rawCharacter

  const marriagePartners = character.canMarry
    .map((id) => charactersById[id])
    .filter((c): c is Character => Boolean(c) && canMarry(supports, character, c, activeRoute))
    .map((c) => c.name)

  const isKana = character.id === 'kana_m' || character.id === 'kana_f'
  const fixedInfo = useMemo(() => (character.isChild ? getFixedParent(character) : undefined), [character])
  const [variableParentId, setVariableParentId] = useState('')
  const variableCandidates = useMemo(() => {
    if (!fixedInfo) return []
    const fixedChar = charactersById[fixedInfo.id]
    if (!fixedChar) return []
    // Children marrying children is a real mechanic (see MarriagePlanner's own comment on this),
    // but Kana is the only child whose OWN parent can be a second-gen child themselves ("second-gen
    // marriage") — every other child's non-fixed side is always an adult in practice, so the
    // exclusion stays for everyone but Kana to avoid surfacing a selectable-but-meaningless option.
    return characters.filter((c) => {
      if ((c.isChild && !isKana) || c.id === fixedChar.id) return false
      const father = fixedInfo.side === 'father' ? fixedChar : c
      const mother = fixedInfo.side === 'father' ? c : fixedChar
      return canProduceChild(supports, father, mother, activeRoute)
    })
  }, [fixedInfo, activeRoute, isKana])
  const fixedChar = fixedInfo ? withCorrinBuild(charactersById[fixedInfo.id], corrinBuild) : undefined
  const variableCharRaw = variableParentId ? charactersById[variableParentId] : undefined

  // Aptitude is Villager's class skill (not Mozu's personal one), so it's available to Mozu herself
  // and to any child who could actually have Mozu fill their variable-parent slot — checked against
  // `variableCandidates` (real eligibility) rather than whichever parent happens to be selected right
  // now, so a build with a different mother picked (or loaded from a different playthrough) doesn't
  // hide a toggle that's genuinely still available.
  const [aptitudeOn, setAptitudeOn] = useState(false)
  const aptitudeEligible = character.id === 'mozu' || variableCandidates.some((c) => c.id === 'mozu')

  // Only reachable for Kana (variableCandidates only ever includes a child for Kana — see above):
  // if Kana's own selected spouse is themselves a second-gen child, THEIR non-fixed parent needs
  // selecting too, to fully resolve either side's own Pair Up entry (see resolveGivenEntry).
  const kanaSpouseFixedInfo = useMemo(
    () => (variableCharRaw?.isChild ? getFixedParent(variableCharRaw) : undefined),
    [variableCharRaw],
  )
  const [kanaSpouseVariableParentId, setKanaSpouseVariableParentId] = useState('')
  const kanaSpouseVariableCandidates = useMemo(() => {
    if (!kanaSpouseFixedInfo) return []
    const fixedChar2 = charactersById[kanaSpouseFixedInfo.id]
    if (!fixedChar2) return []
    return characters.filter((c) => {
      if (c.isChild || c.id === fixedChar2.id) return false
      const father = kanaSpouseFixedInfo.side === 'father' ? fixedChar2 : c
      const mother = kanaSpouseFixedInfo.side === 'father' ? c : fixedChar2
      return canProduceChild(supports, father, mother, activeRoute)
    })
  }, [kanaSpouseFixedInfo, activeRoute])
  const getOwnVariableParentId = (childId: string): string | undefined => {
    if (childId === character.id) return variableParentId || undefined
    if (variableCharRaw && childId === variableCharRaw.id) return kanaSpouseVariableParentId || undefined
    return undefined
  }
  const variableChar = variableParentId ? withCorrinBuild(charactersById[variableParentId], corrinBuild) : undefined

  // Children auto-level with story progress rather than joining at one fixed level — the earliest
  // selectable chapter is their own real unlock requirement (never before Ch8, the earliest any
  // Deeprealms child can appear), and the level curve (src/data/childLeveling.ts) converts whatever
  // chapter is picked into a level, auto-promoting them once the story passes Ch18.
  const earliestChapter = character.isChild ? earliestChapterFor(character.unlockChapter, activeRoute) : undefined
  const [chapter, setChapter] = useState(earliestChapter ?? FINAL_CHAPTER)
  const effectiveChapter = earliestChapter !== undefined ? Math.max(chapter, earliestChapter) : undefined
  const chapterInfo = effectiveChapter !== undefined ? levelForChapter(effectiveChapter) : undefined
  const childAutoPromoted = Boolean(chapterInfo?.promoted)

  const childLevel = chapterInfo?.level ?? earliestChildLevel(character.unlockChapter, activeRoute)
  const childResult =
    fixedInfo && fixedChar && variableChar
      ? computeChild({
          child: character,
          father: fixedInfo.side === 'father' ? fixedChar : variableChar,
          mother: fixedInfo.side === 'father' ? variableChar : fixedChar,
          fatherCurrentStats: (fixedInfo.side === 'father' ? fixedChar : variableChar).baseStats,
          motherCurrentStats: (fixedInfo.side === 'father' ? variableChar : fixedChar).baseStats,
          level: childLevel,
        })
      : undefined

  const effectiveBaseStats = childResult?.baseStats ?? character.baseStats
  const effectiveGrowthRates = childResult?.growthRates ?? character.growthRates
  const effectiveMaxStatModifiers = childResult?.maxStatModifiers ?? character.maxStatModifiers

  const rawDefaultClassName = character.joinClass ?? character.startingClass
  // Characters who join already promoted (e.g. Camilla joins as Malig Knight, never as base Wyvern
  // Rider) never actually sit in the base tier, so only their promoted-tier options are relevant —
  // a child auto-promoted by the selected chapter is the same situation, just chapter-driven
  // instead of join-class-driven.
  const joinsPromoted =
    childAutoPromoted || (Boolean(character.joinClass) && classesByName[rawDefaultClassName]?.tier === 'promoted')

  // DLC classes are open to anyone; Amiibo classes are gender-locked (e.g. Witch/Great Lord are
  // female-only, the other three male-only) — only offer classes this unit could actually reclass
  // into. Mirrors Skill Planner's own unlock toggle exactly, so both tabs agree on what's available.
  const [unlockedItemClassIds, setUnlockedItemClassIds] = useState<string[]>([])
  const availableItemClasses = useMemo(
    () => ITEM_CLASSES.filter((c) => !c.genderLock || c.genderLock === character.gender),
    [character],
  )
  const unlockedItemClasses = availableItemClasses.filter((c) => unlockedItemClassIds.includes(c.id))
  function toggleItemClass(classId: string) {
    setUnlockedItemClassIds((prev) =>
      prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId],
    )
  }

  // Multi-classing: this unit's own marriage/friendship (separate from the child-parent selectors
  // above, which are about who made THIS unit, not who THIS unit later marries/befriends). Hoisted
  // above `availableClasses` so a selected spouse/friend's class shows up in the plain class picker
  // too, not just inside the multi-class segment editors further down.
  const isCorrinSelf = character.id === 'corrin_m' || character.id === 'corrin_f'
  const [ownSpouseId, setOwnSpouseId] = useState('')
  const [ownFriendId, setOwnFriendId] = useState('')
  const ownSpouseOptions = useMemo(
    () => characters.filter((c) => c.id !== character.id && isRouteCompatible(c.route, activeRoute) && canMarry(supports, character, c, activeRoute)),
    [character, activeRoute],
  )
  const ownSpouse = ownSpouseId ? withCorrinBuild(charactersById[ownSpouseId], corrinBuild) : undefined
  // For everyone else, Corrin is excluded from these options: nobody can actually reach A+ with
  // Corrin (the trigger Friendship Seal needs), so Corrin never has a friendship class to give —
  // only their Talent, and only via marriage or their own children, never friendship.
  const ownFriendEligible = useMemo(
    () =>
      characters.filter(
        (c) =>
          c.id !== character.id &&
          !(c.id === 'corrin_m' || c.id === 'corrin_f') &&
          isRouteCompatible(c.route, activeRoute) &&
          canFriendshipSeal(supports, character, c, activeRoute),
      ),
    [character, activeRoute],
  )
  // The plain picker only ever shows ONE friendship class at a time (the one picked below) — same
  // as everyone else, Corrin included, so it doesn't flood. The multi-class pool is different (see
  // classSources further down): Corrin has no distinguishable "A+" tier of their own (support caps
  // at A with virtually the whole same-gender cast, rather than being funneled into one
  // relationship), so it includes every eligible partner's class at once there instead, letting a
  // build freely mix classes from any of them without needing to keep changing the friend picked here.
  const friendshipSourceForPicker = friendshipClassSources(character, ownFriendEligible, ownFriendId, false)

  const availableClasses = useMemo(() => {
    const all = (() => {
      const byId = new Map<string, ClassData>()
      const own = character.isChild && fixedInfo && fixedChar
        ? childAvailableClasses(character, fixedChar, fixedInfo.side, variableChar, activeRoute)
        : (() => {
            const tree = getOwnClassTree(character, activeRoute)
            return [...tree.base, ...tree.secondary, ...tree.tertiary]
          })()
      own.forEach((c) => byId.set(c.id, c))
      // A selected spouse/friend's class belongs in the plain picker too, not just the multi-class
      // segment editors — otherwise there's no way to just reclass into it for the whole run.
      const pairingSources: ClassSource[] = [
        ...marriageClassSources(character, ownSpouse),
        ...friendshipSourceForPicker,
      ]
      baseClassPool(pairingSources, activeRoute).forEach((o) => byId.set(o.classData.id, o.classData))
      promotedClassPool(pairingSources, activeRoute).forEach((o) => byId.set(o.classData.id, o.classData))
      return Array.from(byId.values())
    })()
    // DLC/Amiibo classes are all `tier: 'promoted'` in the data, so appending them before the
    // joinsPromoted filter keeps them available either way — for a joinsPromoted unit they pass the
    // filter naturally; for everyone else nothing gets filtered out in the first place.
    const withItemClasses = [...all, ...unlockedItemClasses]
    return joinsPromoted ? withItemClasses.filter((c) => c.tier === 'promoted') : withItemClasses
  }, [
    character, activeRoute, joinsPromoted, fixedInfo, fixedChar, variableChar, unlockedItemClasses,
    ownSpouse, friendshipSourceForPicker,
  ])
  // An auto-promoted child has no real "default" promoted class (their base class often has two
  // promotion options) — just fall back to whichever promoted option sorts first.
  const defaultClassName = childAutoPromoted ? (availableClasses[0]?.name ?? rawDefaultClassName) : rawDefaultClassName
  const defaultClassId = classesByName[defaultClassName]?.id ?? availableClasses[0]?.id
  const [selectedClassId, setSelectedClassId] = useState(defaultClassId)
  const selectedClass = availableClasses.find((c) => c.id === selectedClassId) ?? classesByName[defaultClassName]

  // "Lock in as default" pins a specific class (e.g. Ryoma as Lodestar instead of his real join
  // class, Swordmaster) as the new baseline for EVERYTHING — real stat projection and the "Class
  // Modifiers" diff further down both use it. Unpinned, the baseline always stays the character's
  // actual starting class — no automatic tracking of whatever was last browsed, which gets
  // confusing fast once you're clicking through several options.
  const [pinnedCompareClassId, setPinnedCompareClassId] = useState<string | undefined>(undefined)
  const pinnedCompareClass = pinnedCompareClassId ? classesById[pinnedCompareClassId] : undefined
  const originalClass = pinnedCompareClass ?? classesByName[defaultClassName]
  const startLevel = character.isChild ? childLevel : getStartingLevel(character.startingLevel, activeRoute)
  // Songstress and the DLC/Amiibo classes are single 40-level classes (4 skill slots, no
  // base/promoted split) rather than a normal 20-level tier — same shape skillLevelsFor() detects.
  const is40LevelClass = selectedClass?.classSkills.length === 4
  const crossesPromotion =
    !is40LevelClass && Boolean(originalClass && selectedClass && originalClass.tier === 'base' && selectedClass.tier === 'promoted')
  const classDelta =
    originalClass && selectedClass ? classStatDelta(selectedClass.statModifiers, originalClass.statModifiers) : undefined
  const originalCaps = originalClass ? classStatCap(originalClass, effectiveMaxStatModifiers) : undefined
  const selectedCaps = selectedClass ? classStatCap(selectedClass, effectiveMaxStatModifiers) : undefined
  const displayedStatCaps = selectedCaps ?? character.statCaps
  // Serenes Forest splits growth into a personal component (character page) and a class component
  // (class page) — the real growth % is their sum, and that class component changes at promotion
  // just like the stat-modifier delta does, hence the separate original/selected values here.
  const originalGrowthRates = originalClass ? classGrowthRate(effectiveGrowthRates, originalClass) : effectiveGrowthRates
  const selectedGrowthRates = selectedClass ? classGrowthRate(effectiveGrowthRates, selectedClass) : effectiveGrowthRates
  const displayedGrowthRates = aptitudeOn
    ? STAT_KEYS.reduce((acc, key) => ({ ...acc, [key]: selectedGrowthRates[key] + 10 }), {} as StatBlock)
    : selectedGrowthRates
  const minPromoLevel = Math.max(10, startLevel)
  const [earlyPromote, setEarlyPromote] = useState(false)
  const [promotionLevel, setPromotionLevel] = useState(minPromoLevel)
  // Default to the character's actual join level, not an arbitrary max — matches what you'd see
  // recruiting them fresh, before any leveling has happened.
  const [targetLevel, setTargetLevel] = useState(startLevel)
  const promotionLevelClamped = Math.min(Math.max(promotionLevel, minPromoLevel), 19)
  const inPromotedPhase = selectedClass?.tier === 'promoted'
  const [eternalSeal, setEternalSeal] = useState(false)
  // Eternal Seal is a real Fates DLC item that removes a promoted class's normal level-20 cap —
  // only meaningful once actually in the promoted tier (is40LevelClass units, e.g. Songstress/
  // DLC/Amiibo classes, already reach 40 without it, so it only extends THEIR ceiling further too).
  const targetLevelOptions = is40LevelClass
    ? Array.from({ length: (eternalSeal ? 99 : 40) - startLevel + 1 }, (_, i) => startLevel + i)
    : crossesPromotion
      ? Array.from({ length: eternalSeal ? 99 : 20 }, (_, i) => i + 1)
      : inPromotedPhase
        ? Array.from({ length: (eternalSeal ? 99 : 20) - startLevel + 1 }, (_, i) => startLevel + i)
        : Array.from({ length: 20 - startLevel + 1 }, (_, i) => startLevel + i)
  // Unchecking Eternal Seal (or any other change that shrinks the option list) can leave the raw
  // `targetLevel` state pointing at a level that's no longer selectable — clamp at the point of use
  // rather than mutating state, same pattern as promotionLevelClamped above. Since every value the
  // list no longer contains was necessarily above the old max, clamping always lands exactly on the
  // new max when it needs to move at all, matching "default to the max level available."
  const targetLevelClamped = Math.min(targetLevel, targetLevelOptions[targetLevelOptions.length - 1] ?? targetLevel)
  const projected =
    classDelta && originalCaps && selectedCaps
      ? projectStats({
          baseStats: effectiveBaseStats,
          growthRates: originalGrowthRates,
          selectedGrowthRates,
          originalCaps,
          selectedCaps,
          startLevel,
          classDelta,
          targetLevel: targetLevelClamped,
          promotionLevel: crossesPromotion ? (earlyPromote ? promotionLevelClamped : 20) : undefined,
        })
      : undefined

  // ---- Multi-classing pool sources: own class set plus marriage (same single spouse as the plain
  // picker above) plus friendship — but for Corrin specifically, EVERY eligible partner's class at
  // once here (see friendshipSourceForPicker above for why), not just the one friend picked, so a
  // build can freely mix classes from any of them across segments.
  const ownSetSources: ClassSource[] = character.isChild
    ? (
        childResult
          ? childResult.inheritedClasses
          : fixedInfo && fixedChar
            ? [character.startingClass, ...fixedParentContribution(character, fixedChar)]
            : [character.startingClass]
      ).map((name) => ({ name, sourceLabel: 'Inherited' }))
    : ownClassSetSources(character)
  const friendshipSourcesForMultiClass = friendshipClassSources(character, ownFriendEligible, ownFriendId, isCorrinSelf)
  const classSources: ClassSource[] = [
    ...ownSetSources,
    ...marriageClassSources(character, ownSpouse),
    ...friendshipSourcesForMultiClass,
  ]
  const preClassPool = baseClassPool(classSources, activeRoute)
  const promotedClassPoolOptions = promotedClassPool(classSources, activeRoute)

  const segmentIdRef = useRef(0)
  function addSegment(pool: ClassOption[], remaining: number, setSegments: (fn: (prev: ClassSegment[]) => ClassSegment[]) => void) {
    if (pool.length === 0 || remaining <= 0) return
    const id = `seg-${segmentIdRef.current++}`
    setSegments((prev) => [...prev, { id, classId: pool[0].classData.id, levels: Math.min(1, remaining) }])
  }
  function updateSegment(setSegments: (fn: (prev: ClassSegment[]) => ClassSegment[]) => void, id: string, patch: Partial<ClassSegment>) {
    setSegments((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }
  function removeSegment(setSegments: (fn: (prev: ClassSegment[]) => ClassSegment[]) => void, id: string) {
    setSegments((prev) => prev.filter((s) => s.id !== id))
  }
  function resolveSegments(segments: ClassSegment[], pool: ClassOption[]) {
    return segments
      .map((s) => ({ classData: pool.find((o) => o.classData.id === s.classId)?.classData, levels: s.levels }))
      .filter((s): s is { classData: ClassData; levels: number } => Boolean(s.classData))
  }

  // One toggle covers both phases — before promotion (segments through preClassPool) and after
  // (segments through promotedClassPoolOptions). Unlike crossesPromotion/inPromotedPhase above
  // (which track whatever's picked in the plain top picker, for the simple non-multi-class flow),
  // this is purely about whether the CHARACTER starts base-tier at all — the segment editors and the
  // "Promote now" trigger below are entirely native to the multi-class flow, independent of the top
  // picker's current selection.
  const originalIs40Level = originalClass?.classSkills.length === 4
  const canMultiClassPromote = originalClass?.tier === 'base' && !originalIs40Level
  const [multiClassOn, setMultiClassOn] = useState(false)
  const [preSegments, setPreSegments] = useState<ClassSegment[]>([])
  // "Promote now" (earlyPromote/promotionLevel, shared with the simple flow's own "Promoted before
  // level 20" toggle above — the two never show at once, since one is multi-class-only and the other
  // is simple-flow-only) shrinks the pre-promotion budget to wherever it's set; unchecked, the full
  // level-20 budget applies, same as before.
  const preLevelsCap = canMultiClassPromote ? Math.max(0, (earlyPromote ? promotionLevelClamped : 20) - startLevel) : 0
  const preLevelsUsed = preSegments.reduce((sum, s) => sum + s.levels, 0)
  const validPreSegments = resolveSegments(preSegments, preClassPool)
  // Once the pre-promotion budget shrinks below what's already planned (picking an earlier promote
  // level after already filling in later segments), trim the excess off the END of the list — the
  // most recently planned segments are the ones that no longer fit.
  useEffect(() => {
    setPreSegments((prev) => {
      const total = prev.reduce((sum, s) => sum + s.levels, 0)
      if (total <= preLevelsCap) return prev
      let excess = total - preLevelsCap
      const next: ClassSegment[] = []
      for (let i = prev.length - 1; i >= 0; i--) {
        const seg = prev[i]
        if (excess <= 0) {
          next.unshift(seg)
        } else if (seg.levels <= excess) {
          excess -= seg.levels
        } else {
          next.unshift({ ...seg, levels: seg.levels - excess })
          excess = 0
        }
      }
      return next
    })
  }, [preLevelsCap])
  // The after-promotion editor unlocks once you've either explicitly promoted early or filled the
  // full pre-promotion budget — for a character with no pre-promotion phase at all (joins already
  // promoted, or is40Level), it's just always unlocked, same as it always applied to them before.
  const promotedPhaseUnlocked = !canMultiClassPromote || earlyPromote || preLevelsUsed >= preLevelsCap

  const [promotedSegments, setPromotedSegments] = useState<ClassSegment[]>([])
  const promotedStartLevel = canMultiClassPromote ? 1 : startLevel
  const promotedLevelsCap = Math.max(0, (eternalSeal ? 99 : 20) - promotedStartLevel)
  const promotedLevelsUsed = promotedSegments.reduce((sum, s) => sum + s.levels, 0)
  const validPromotedSegments = resolveSegments(promotedSegments, promotedClassPoolOptions)

  const multiClassResult: StatBlock | undefined = (() => {
    if (!multiClassOn) return undefined
    if (!promotedPhaseUnlocked) {
      return projectSegments(effectiveBaseStats, effectiveGrowthRates, effectiveMaxStatModifiers, validPreSegments)
    }
    let stageAStats: StatBlock
    let stageAClass: ClassData | undefined
    if (!canMultiClassPromote) {
      // Already promoted from the start (joinsPromoted) — no pre-promotion phase to multi-class through.
      stageAStats = effectiveBaseStats
      stageAClass = originalClass
    } else {
      stageAStats = projectSegments(effectiveBaseStats, effectiveGrowthRates, effectiveMaxStatModifiers, validPreSegments)
      stageAClass = validPreSegments.at(-1)?.classData ?? originalClass
    }

    const destinationClass = validPromotedSegments.length > 0 ? validPromotedSegments[0].classData : selectedClass
    if (!stageAClass || !destinationClass) return undefined

    const bumpDelta = classStatDelta(destinationClass.statModifiers, stageAClass.statModifiers)
    const bumpCap = classStatCap(destinationClass, effectiveMaxStatModifiers)
    const postBump = {} as StatBlock
    for (const key of STAT_KEYS) {
      postBump[key] = Math.min(stageAStats[key] + bumpDelta[key], bumpCap[key])
    }

    return projectSegments(postBump, effectiveGrowthRates, effectiveMaxStatModifiers, validPromotedSegments)
  })()
  const displayedProjection = multiClassResult ?? projected
  // Always the real sum of both phases' actual segment levels — never an inflated/hardcoded number,
  // so there's no "ghost" level counted that doesn't have real growth behind it.
  const displayedFinalLevel = multiClassOn ? startLevel + preLevelsUsed + promotedLevelsUsed : targetLevelClamped
  // The "rough estimate" cap comparison (which numbers render green, i.e. "at cap") needs to match
  // whichever class the segment chain actually ends in — not the plain top picker's browsing
  // selection, which is commonly left on the character's ORIGINAL class the whole time multi-classing
  // is used, entirely independent of what the segments below actually build through. The real game
  // never banks growth blocked by a lower cap for use in a later, higher-cap class (projectSegments
  // above already gets that right for the actual numbers) — but showing the ORIGINAL class's cap here
  // would misrepresent what's actually still gaining, since that's not the class the unit ends up in.
  const finalMultiClassClass = multiClassOn
    ? promotedPhaseUnlocked
      ? (validPromotedSegments.at(-1)?.classData ?? selectedClass)
      : (validPreSegments.at(-1)?.classData ?? originalClass)
    : undefined
  const roughEstimateCaps = finalMultiClassClass
    ? classStatCap(finalMultiClassClass, effectiveMaxStatModifiers)
    : displayedStatCaps
  // Same reasoning as roughEstimateCaps above — the "Stat Caps" panel (title, caps, and movement)
  // needs to reflect whichever class the segment chain actually ends in while multi-classing, not
  // stay stuck on the plain top picker's browsing selection.
  const statCapsDisplayClass = finalMultiClassClass ?? selectedClass

  const setUnitLabel = useScreenshotContextStore((state) => state.setUnitLabel)
  useEffect(() => {
    setUnitLabel(character.name)
    return () => setUnitLabel('')
  }, [character.name, setUnitLabel])

  const currentBuildData = {
    characterId: character.id,
    variableParentId,
    kanaSpouseVariableParentId,
    chapter,
    selectedClassId,
    earlyPromote,
    promotionLevel,
    targetLevel,
    eternalSeal,
    ownSpouseId,
    ownFriendId,
    multiClassOn,
    preSegments,
    promotedSegments,
    unlockedItemClassIds,
  }

  // Applying restore data as a plain function call (from SavedBuildsManager's onLoad) wouldn't work
  // when the build is for a DIFFERENT character than the one currently mounted here — UnitPlanner
  // owns `unitId`, so it has to switch characters itself first (see onRequestLoadBuild below) and
  // hand the data back down as a prop once the right character is showing. Keying this effect off
  // `pendingBuildData` itself (not just mount) covers BOTH cases: switching characters remounts this
  // component fresh (new key), while loading a build for the ALREADY-selected character doesn't
  // remount at all, just re-renders with a new pendingBuildData reference — either way the effect
  // still fires exactly once per load.
  useEffect(() => {
    if (!pendingBuildData) return
    const data = pendingBuildData as Partial<typeof currentBuildData>
    setVariableParentId(typeof data.variableParentId === 'string' ? data.variableParentId : '')
    setKanaSpouseVariableParentId(
      typeof data.kanaSpouseVariableParentId === 'string' ? data.kanaSpouseVariableParentId : '',
    )
    if (typeof data.chapter === 'number') setChapter(data.chapter)
    if (typeof data.selectedClassId === 'string') setSelectedClassId(data.selectedClassId)
    setEarlyPromote(Boolean(data.earlyPromote))
    if (typeof data.promotionLevel === 'number') setPromotionLevel(data.promotionLevel)
    if (typeof data.targetLevel === 'number') setTargetLevel(data.targetLevel)
    setEternalSeal(Boolean(data.eternalSeal))
    setOwnSpouseId(typeof data.ownSpouseId === 'string' ? data.ownSpouseId : '')
    setOwnFriendId(typeof data.ownFriendId === 'string' ? data.ownFriendId : '')
    setMultiClassOn(Boolean(data.multiClassOn))
    setPreSegments(Array.isArray(data.preSegments) ? (data.preSegments as ClassSegment[]) : [])
    setPromotedSegments(Array.isArray(data.promotedSegments) ? (data.promotedSegments as ClassSegment[]) : [])
    setUnlockedItemClassIds(Array.isArray(data.unlockedItemClassIds) ? (data.unlockedItemClassIds as string[]) : [])
    onConsumePendingBuildData()
  }, [pendingBuildData])

  return (
    <div className="space-y-4 border-t border-neutral-800 pt-4">
      {character.isChild && earliestChapter !== undefined && (
        <label className="flex flex-col gap-1 text-xs text-neutral-400">
          Current story chapter reached
          <select
            value={effectiveChapter}
            onChange={(e) => setChapter(Number(e.target.value))}
            className="w-full max-w-[10rem] rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-200"
          >
            {Array.from({ length: FINAL_CHAPTER - earliestChapter + 1 }, (_, i) => earliestChapter + i).map((ch) => (
              <option key={ch} value={ch}>Ch{ch}</option>
            ))}
          </select>
          <span className="text-neutral-500">
            At Ch{effectiveChapter}: Lv{childLevel}{childAutoPromoted ? ' (promoted)' : ''} · earliest possible is Ch{earliestChapter}
          </span>
        </label>
      )}
      {character.isChild && fixedInfo && (
        <label className="flex flex-col gap-1 text-xs text-neutral-400">
          Variable parent ({charactersById[fixedInfo.id]?.name ?? fixedInfo.id}'s spouse)
          <select
            value={variableParentId}
            onChange={(e) => setVariableParentId(e.target.value)}
            className="w-full max-w-sm rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-200"
          >
            <option value="">(none selected)</option>
            {variableCandidates.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
      )}
      {isKana && variableCharRaw?.isChild && kanaSpouseFixedInfo && (
        <label className="flex flex-col gap-1 text-xs text-neutral-400">
          {variableCharRaw.name}'s own variable parent ({charactersById[kanaSpouseFixedInfo.id]?.name ?? kanaSpouseFixedInfo.id}'s spouse)
          <select
            value={kanaSpouseVariableParentId}
            onChange={(e) => setKanaSpouseVariableParentId(e.target.value)}
            className="w-full max-w-sm rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-200"
          >
            <option value="">(none selected)</option>
            {kanaSpouseVariableCandidates.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <span className="text-neutral-500">
            Needed to fully resolve {variableCharRaw.name}'s own Pair Up bonus contribution below.
          </span>
        </label>
      )}
      {character.isChild && !fixedInfo && (
        <p className="text-xs text-amber-400">
          This child's parents aren't modeled yet, so these are unmodified base numbers, not a
          realistic computed stat.
        </p>
      )}
      {character.isChild && fixedInfo && !childResult && (
        <p className="text-xs text-neutral-500">
          Select a parent above to see {character.name}'s actual computed stats — these raw numbers
          are just the formula's base component, not a realistic final stat.
        </p>
      )}

      <div>
        <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-400">
          DLC / Amiibo classes unlocked for {character.name}
        </h4>
        <div className="flex flex-wrap gap-2">
          {availableItemClasses.map((c) => {
            const on = unlockedItemClassIds.includes(c.id)
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleItemClass(c.id)}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  on
                    ? 'border-violet-500 bg-violet-950/50 text-violet-200'
                    : 'border-neutral-700 bg-neutral-800 text-neutral-400 hover:border-neutral-600'
                }`}
              >
                {c.name} {c.isAmiibo ? '(Amiibo)' : '(DLC)'}
              </button>
            )
          })}
        </div>
      </div>

      {availableClasses.length > 1 && (
        <div>
          <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Available Classes
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {availableClasses.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedClassId(c.id)}
                className={`rounded-md border px-2 py-1 text-xs transition-colors ${
                  selectedClassId === c.id
                    ? 'border-violet-500 bg-violet-950/50 text-violet-200'
                    : 'border-neutral-700 bg-neutral-800 text-neutral-300 hover:border-neutral-600'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
          {selectedClass && (
            <label className="mt-1.5 flex items-center gap-2 text-xs text-neutral-300">
              <input
                type="checkbox"
                checked={pinnedCompareClassId !== undefined}
                onChange={(e) => setPinnedCompareClassId(e.target.checked ? selectedClassId : undefined)}
              />
              {pinnedCompareClass
                ? `Comparing against ${pinnedCompareClass.name} — uncheck to unlock`
                : `Lock in ${selectedClass.name} as the comparison baseline`}
            </label>
          )}
        </div>
      )}

      {originalClass && (
        <div className="space-y-2 border-t border-neutral-800 pt-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Multi-Classing
          </h4>
          <p className="text-xs text-neutral-500">
            Fill these in to unlock reclassing through {character.name}'s own marriage/friendship
            classes below, on top of their normal Class Set.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs text-neutral-400">
              {character.name}'s own spouse (Partner Seal)
              <select
                value={ownSpouseId}
                onChange={(e) => setOwnSpouseId(e.target.value)}
                className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-200"
              >
                <option value="">(none)</option>
                {ownSpouseOptions.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-neutral-400">
              {character.name}'s own A+ friend (Friendship Seal)
              <select
                value={ownFriendId}
                onChange={(e) => setOwnFriendId(e.target.value)}
                className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-200"
              >
                <option value="">(none)</option>
                {ownFriendEligible.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
          </div>
          {isCorrinSelf && (
            <p className="text-xs text-neutral-500">
              Corrin has no single "A+" partner in-game — the friend picked above only controls
              which ONE friendship class shows in the plain class picker further up. The multi-class
              pool below always includes every eligible same-sex A-rank partner's class at once
              ({character.name}'s route and gender already narrow this down), so a build can freely
              mix classes from any of them.
            </p>
          )}
          {ownSpouse && isCorrinWithoutTalent(ownSpouse) && (
            <p className="text-xs text-neutral-500">
              Select {ownSpouse.name}'s Talent in the Corrin Build panel to see the class gained through this marriage.
            </p>
          )}
        </div>
      )}

      {aptitudeEligible && (
        <label className="flex items-center gap-2 text-xs text-neutral-300">
          <input type="checkbox" checked={aptitudeOn} onChange={(e) => setAptitudeOn(e.target.checked)} />
          Aptitude equipped (+10% to every growth rate)
        </label>
      )}

      <div className="space-y-4">
        <StatTable
          title={aptitudeOn ? 'Growth % (with Aptitude)' : 'Growth %'}
          stats={displayedGrowthRates}
          round={Boolean(childResult)}
        />
        <StatTable
          title="Base Stats"
          stats={effectiveBaseStats}
          round={Boolean(childResult)}
        />
        <StatTable
          title={`Stat Caps (${statCapsDisplayClass?.name ?? defaultClassName})`}
          stats={roughEstimateCaps}
        />
        {statCapsDisplayClass && (
          <div className="text-sm text-neutral-300">
            <span className="text-neutral-500">Mov: </span>
            {statCapsDisplayClass.movement}
          </div>
        )}
      </div>

      {childResult && (
        <div className="text-sm">
          <span className="text-neutral-500">Inherited classes: </span>
          <span className="text-neutral-200">{childResult.inheritedClasses.join(', ')}</span>
        </div>
      )}

      {selectedClass && originalClass && selectedClass.name !== originalClass.name && (
        <ClassModifierDiff
          title={`${originalClass.name} → ${selectedClass.name} Class Modifiers`}
          from={originalClass.statModifiers}
          to={selectedClass.statModifiers}
        />
      )}

      {projected && (
        <div className="space-y-2 border-t border-neutral-800 pt-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Projected Stats ({selectedClass?.name})
          </h4>

          {!multiClassOn && crossesPromotion && (
            <label className="flex items-center gap-2 text-xs text-neutral-300">
              <input type="checkbox" checked={earlyPromote} onChange={(e) => setEarlyPromote(e.target.checked)} />
              Promoted before level 20
            </label>
          )}
          {!multiClassOn && crossesPromotion && earlyPromote && (
            <label className="flex flex-col gap-1 text-xs text-neutral-400">
              Promoted at level
              <select
                value={promotionLevelClamped}
                onChange={(e) => setPromotionLevel(Number(e.target.value))}
                className="w-full max-w-[10rem] rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-200"
              >
                {Array.from({ length: 19 - minPromoLevel + 1 }, (_, i) => minPromoLevel + i).map((lvl) => (
                  <option key={lvl} value={lvl}>{lvl}</option>
                ))}
              </select>
            </label>
          )}

          {originalClass && (
            <label className="flex items-center gap-2 text-xs text-neutral-300">
              <input
                type="checkbox"
                checked={multiClassOn}
                onChange={(e) => setMultiClassOn(e.target.checked)}
              />
              Multi-class (switch classes level-by-level)
            </label>
          )}

          {multiClassOn && canMultiClassPromote && (
            <div className="space-y-1.5 rounded-md border border-neutral-800 p-2">
              <p className="text-xs text-neutral-500">
                Up to level {earlyPromote ? promotionLevelClamped : 20} total, starting from {character.name}'s join level ({startLevel}).
              </p>
              <SegmentEditor
                pool={preClassPool}
                segments={preSegments}
                onAdd={() => addSegment(preClassPool, preLevelsCap - preLevelsUsed, setPreSegments)}
                onUpdate={(id, patch) => updateSegment(setPreSegments, id, patch)}
                onRemove={(id) => removeSegment(setPreSegments, id)}
                cap={preLevelsCap}
                used={preLevelsUsed}
              />
              <label className="flex items-center gap-2 text-xs text-neutral-300">
                <input
                  type="checkbox"
                  checked={earlyPromote}
                  onChange={(e) => {
                    // Default the promotion point to wherever the segments already reach, not the
                    // theoretical earliest level — "I've hit X level and want to promote now," not
                    // "reset back to the minimum and wipe what I already planned."
                    if (e.target.checked) setPromotionLevel(startLevel + preLevelsUsed)
                    setEarlyPromote(e.target.checked)
                  }}
                />
                Early promote
              </label>
              <p className="text-xs text-neutral-500">
                Locks in the segments above and lets you pre-promote before level 20, at whatever
                level they currently add up to — adjust "Promoted at level" below to pick a different
                point (trims the segments above to fit if you pick an earlier one).
              </p>
              {earlyPromote && (
                <label className="flex flex-col gap-1 text-xs text-neutral-400">
                  Promoted at level
                  <select
                    value={promotionLevelClamped}
                    onChange={(e) => setPromotionLevel(Number(e.target.value))}
                    className="w-full max-w-[10rem] rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-200"
                  >
                    {Array.from({ length: 19 - minPromoLevel + 1 }, (_, i) => minPromoLevel + i).map((lvl) => (
                      <option key={lvl} value={lvl}>{lvl}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          )}

          {(inPromotedPhase || (multiClassOn && promotedPhaseUnlocked)) && (
            <div className="space-y-1.5 rounded-md border border-neutral-800 p-2">
              <label className="flex items-center gap-2 text-xs text-neutral-300">
                <input type="checkbox" checked={eternalSeal} onChange={(e) => setEternalSeal(e.target.checked)} />
                Eternal Seal equipped (removes the normal level-20 promoted cap)
              </label>
              {multiClassOn && promotedPhaseUnlocked && (
                <>
                  <p className="text-xs text-neutral-500">
                    Up to level {eternalSeal ? 99 : 20} total, starting from level {promotedStartLevel}
                    {canMultiClassPromote ? ' (resets to 1 at promotion)' : ''}.
                  </p>
                  <SegmentEditor
                    pool={promotedClassPoolOptions}
                    segments={promotedSegments}
                    onAdd={() => addSegment(promotedClassPoolOptions, promotedLevelsCap - promotedLevelsUsed, setPromotedSegments)}
                    onUpdate={(id, patch) => updateSegment(setPromotedSegments, id, patch)}
                    onRemove={(id) => removeSegment(setPromotedSegments, id)}
                    cap={promotedLevelsCap}
                    used={promotedLevelsUsed}
                  />
                </>
              )}
            </div>
          )}

          {!multiClassOn && (
            <label className="flex flex-col gap-1 text-xs text-neutral-400">
              {crossesPromotion ? 'Level after promotion' : 'Level'}
              <select
                value={targetLevelClamped}
                onChange={(e) => setTargetLevel(Number(e.target.value))}
                className="w-full max-w-[10rem] rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-200"
              >
                {targetLevelOptions.map((lvl) => (
                  <option key={lvl} value={lvl}>{lvl}</option>
                ))}
              </select>
            </label>
          )}

          <StatTable
            title={`Level ${displayedFinalLevel} (rough estimate)`}
            stats={displayedProjection ?? projected}
            capStats={roughEstimateCaps}
          />
        </div>
      )}

      <MechanicsSection
        classData={selectedClass}
        statCaps={displayedStatCaps}
        ownCharacter={character}
        getOwnVariableParentId={getOwnVariableParentId}
        activeRoute={activeRoute}
        corrinBuild={corrinBuild}
      />

      {!character.isChild && (
        <div className="text-sm">
          <span className="text-neutral-500">Can marry: </span>
          {marriagePartners.length > 0 ? (
            <span className="text-neutral-200">{marriagePartners.join(', ')}</span>
          ) : (
            <span className="text-neutral-600">none in current roster</span>
          )}
        </div>
      )}

      <div data-export-hide>
        <SavedBuildsManager
          tab="unit"
          characterName={character.name}
          route={activeRoute}
          data={currentBuildData}
          canSave
          onLoad={onRequestLoadBuild}
        />
      </div>
    </div>
  )
}

export function UnitPlanner() {
  const activeRoute = usePlannerStore((state) => state.activeRoute)
  const corrinBuild = useCorrinBuildStore((state) => state.build)
  const [unitId, setUnitId] = useState('')
  // Saved builds' configuration data lives inside UnitDetail's own local state, but the character
  // SELECTION is owned here instead — loading a build for a different character than the one
  // currently showing needs to switch `unitId` first, then hand the rest of the data down once the
  // right UnitDetail is mounted (see the effect in UnitDetail keyed off this same value).
  const [pendingBuildData, setPendingBuildData] = useState<Record<string, unknown> | null>(null)

  const participants = useMemo(
    () => characters.filter((c) => isRouteCompatible(c.route, activeRoute)),
    [activeRoute],
  )
  const character = unitId ? charactersById[unitId] : undefined

  function handleRequestLoadBuild(build: SavedBuild) {
    const characterId = typeof build.data.characterId === 'string' ? build.data.characterId : ''
    if (!characterId || !charactersById[characterId]) return
    setUnitId(characterId)
    setPendingBuildData(build.data)
  }

  return (
    <div className="space-y-6">
      <RouteFilter />

      <div className="space-y-4 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
        <h3 className="text-base font-semibold text-neutral-100">Unit Planner</h3>
        <select
          value={unitId}
          onChange={(e) => setUnitId(e.target.value)}
          className="w-full max-w-sm rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-200"
        >
          <option value="">Select a unit…</option>
          {participants.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {character && (
          <UnitDetail
            key={character.id}
            character={character}
            activeRoute={activeRoute}
            corrinBuild={corrinBuild}
            pendingBuildData={pendingBuildData}
            onConsumePendingBuildData={() => setPendingBuildData(null)}
            onRequestLoadBuild={handleRequestLoadBuild}
          />
        )}
      </div>
    </div>
  )
}
