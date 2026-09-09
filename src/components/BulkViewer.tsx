import { useMemo, useState } from 'react'
import { characters, charactersById } from '../data/characters'
import { classesById } from '../data/classes'
import { skillsById } from '../data/skills'
import { STAT_KEYS, type PairUpBonus, type StatBlock } from '../data/types'
import { classStatCap } from '../logic/levelProjection'
import { useCorrinBuildStore } from '../state/corrinBuildStore'
import { useSavedBuildsStore } from '../state/savedBuildsStore'
import { AssetIcon } from './AssetIcon'
import { ParentChecker } from './ParentChecker'
import { RouteFilter } from './RouteFilter'
import { UnitDetail, type UnitPlanComputedSummary } from './UnitPlanner'

const STAT_LABELS: Record<string, string> = {
  hp: 'HP', str: 'Str', mag: 'Mag', skl: 'Skl', spd: 'Spd', lck: 'Lck', def: 'Def', res: 'Res',
}

/**
 * Read-only(ish) whole-roster overview: pick one saved Skill Set and one saved Unit Set (same
 * route), and this merges them by character into one table — final class, weapons, skills, backpack,
 * growth %, and max stats side by side, instead of one unit at a time. Numbers are computed by
 * mounting UnitDetail itself off-screen per roster member (see its `headless` prop) so this never
 * has to duplicate Unit Planner's own leveling/multi-class/child-stat math.
 */
function TeamViewerPanel() {
  const buildSets = useSavedBuildsStore((state) => state.buildSets)
  const patchBuildSetEntryData = useSavedBuildsStore((state) => state.patchBuildSetEntryData)
  const corrinBuild = useCorrinBuildStore((state) => state.build)

  const skillSets = useMemo(() => buildSets.filter((b) => b.tab === 'skills'), [buildSets])
  const unitSets = useMemo(() => buildSets.filter((b) => b.tab === 'unit'), [buildSets])

  const [skillSetId, setSkillSetId] = useState('')
  const [unitSetId, setUnitSetId] = useState('')

  const skillSet = skillSets.find((b) => b.id === skillSetId)
  const unitSet = unitSets.find((b) => b.id === unitSetId)
  const routeMismatch = Boolean(skillSet && unitSet && skillSet.route !== unitSet.route)

  const rosterIds = useMemo(() => {
    if (routeMismatch) return []
    const ids: string[] = []
    unitSet?.entries.forEach((e) => ids.push(e.characterId))
    skillSet?.entries.forEach((e) => {
      if (!ids.includes(e.characterId)) ids.push(e.characterId)
    })
    return ids
  }, [skillSet, unitSet, routeMismatch])

  const [summaries, setSummaries] = useState<Record<string, UnitPlanComputedSummary>>({})

  // Set explicitly in Skill Planner (a checkbox there), not inferred from the loadout — a unit can
  // carry Replicate normally without being flagged this way, and a pure backpack donor may have no
  // real Unit Planner build to infer anything from at all.
  const isBackpackUnit = (characterId: string) =>
    Boolean(skillSet?.entries.find((e) => e.characterId === characterId)?.data.isBackpackUnit)
  const getBackpackClassId = (characterId: string): string | undefined => {
    const raw = skillSet?.entries.find((e) => e.characterId === characterId)?.data.backpackClassId
    return typeof raw === 'string' && raw ? raw : undefined
  }

  // A unit only occupies a "front" slot if they're actually deployed with a REAL Unit Set entry
  // (one with a selectedClassId — see the render filter below) AND aren't marked as a backpack unit
  // — that flag means both their instances are backpacks, both are separate front deployments, or
  // one of each, so their own row never counts as an ordinary single front occupant either way.
  const hasFrontSlot = (id: string) =>
    !isBackpackUnit(id) &&
    Boolean(unitSet?.entries.some((e) => e.characterId === id && typeof e.data.selectedClassId === 'string'))

  // summary.backpackId only exists once a headless UnitDetail has resolved it, which never happens
  // for a backpack-only entry (no selectedClassId — see the render filter below) — fall back to the
  // raw stored pick so counting (and the dropdown itself) still sees what was actually saved.
  const getBackpackId = (id: string): string | undefined => {
    const resolved = summaries[id]?.backpackId
    if (resolved) return resolved
    const raw = unitSet?.entries.find((e) => e.characterId === id)?.data.pairUpPartnerId
    return typeof raw === 'string' && raw ? raw : undefined
  }

  // How many "slots" (own front row, if it counts + times named as someone else's backpack) each
  // roster member fills — normally capped at 1 (a unit is either deployed as themselves or riding as
  // a backpack, never both), raised to 2 for a unit marked as a backpack unit (a real clone, so both
  // at once is legal). Purely informational: nothing here is blocked, just flagged.
  const backpackCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const id of rosterIds) {
      const backpackId = getBackpackId(id)
      if (backpackId) counts.set(backpackId, (counts.get(backpackId) ?? 0) + 1)
    }
    return counts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rosterIds, summaries, unitSet])
  const slotCap = (id: string) => (isBackpackUnit(id) ? 2 : 1)
  const totalSlots = (id: string) => (hasFrontSlot(id) ? 1 : 0) + (backpackCounts.get(id) ?? 0)
  const isOverCap = (id: string) => totalSlots(id) > slotCap(id)

  // What a unit's backpack actually gives, for whoever they're backing — a backpack-unit's class is
  // whatever was explicitly picked in Skill Planner (never their raw default class: this replaces
  // that guess entirely, so every lead they back agrees on the same number instead of each one
  // possibly resolving a different default on its own). A normal (non-backpack-unit) partner's bonus
  // still comes from Unit Planner's own resolution (summary.pairUpBonus).
  const resolvePairUpBonus = (leadId: string): PairUpBonus | undefined => {
    const backpackId = getBackpackId(leadId)
    if (!backpackId) return undefined
    if (isBackpackUnit(backpackId)) {
      const classId = getBackpackClassId(backpackId)
      return classId ? classesById[classId]?.pairUpBonus : undefined
    }
    return summaries[leadId]?.pairUpBonus
  }

  // A row's own stats+movement: normally Unit Planner's own headless computation (summary), but a
  // backpack unit with no real Unit Set entry has none of that — fall back to a static class-cap
  // computed directly from whichever class was picked for them in Skill Planner.
  const getOwnStats = (id: string): { stats: StatBlock; movement: number } | undefined => {
    const summary = summaries[id]
    if (summary?.maxStats && summary.movement !== undefined) {
      return { stats: summary.maxStats, movement: summary.movement }
    }
    if (isBackpackUnit(id)) {
      const classId = getBackpackClassId(id)
      const character = charactersById[id]
      const cls = classId ? classesById[classId] : undefined
      if (character && cls) return { stats: classStatCap(cls, character.maxStatModifiers), movement: cls.movement }
    }
    return undefined
  }

  /** Own stats/movement with the resolved backpack bonus folded in — HP is never touched, since
   * Pair-Up bonuses never include it (see PairUpBonus's own definition). */
  function adjustedStats(id: string): { stats: StatBlock; movement: number } | undefined {
    const own = getOwnStats(id)
    if (!own) return undefined
    const bonus = resolvePairUpBonus(id)
    if (!bonus) return own
    const stats = { ...own.stats }
    for (const key of STAT_KEYS) {
      if (key === 'hp') continue
      stats[key] += bonus[key]
    }
    return { stats, movement: own.movement + bonus.mov }
  }

  function handleReassignBackpack(characterId: string, newBackpackId: string) {
    if (!unitSet) return
    patchBuildSetEntryData(unitSet.id, characterId, charactersById[characterId]?.name ?? characterId, {
      pairUpPartnerId: newBackpackId,
      partnerVariableParentId: '',
      partnerClassId: '',
    })
  }

  const mainIds = rosterIds.filter((id) => !isBackpackUnit(id))
  const backpackOnlyIds = rosterIds.filter((id) => isBackpackUnit(id))

  function renderRow(id: string) {
    const character = charactersById[id]
    const summary = summaries[id]
    const loadout = skillSet?.entries.find((e) => e.characterId === id)?.data.loadout
    const skillIds = Array.isArray(loadout) ? loadout : []
    const adjusted = adjustedStats(id)
    const growthRates = summary?.growthRates ?? character?.growthRates
    const overCap = isOverCap(id)
    const backpackId = getBackpackId(id) ?? ''
    return (
      <tr key={id} className="border-b border-neutral-800/60 align-top last:border-0">
        <td className="px-3 py-2 font-medium text-neutral-200">{character?.name ?? id}</td>
        <td className="px-3 py-2">
          {unitSet ? (
            <select
              value={backpackId}
              onChange={(e) => handleReassignBackpack(id, e.target.value)}
              className={`w-full max-w-[10rem] rounded-md border bg-neutral-800 px-2 py-1 text-xs text-neutral-200 ${
                overCap ? 'border-red-500' : 'border-neutral-700'
              }`}
            >
              <option value="">(none)</option>
              {characters.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          ) : (
            <span className="text-neutral-600">—</span>
          )}
          {overCap && <p className="mt-1 text-xs text-amber-400">Too many {character?.name ?? id}.</p>}
        </td>
        <td className="px-3 py-2 text-neutral-300">{summary?.className ?? '—'}</td>
        <td className="px-3 py-2 text-neutral-300">
          {summary?.weaponRanks?.length ? summary.weaponRanks.map((w) => `${w.type} ${w.rank}`).join(', ') : '—'}
        </td>
        <td className="px-3 py-2">
          {skillIds.length > 0 ? (
            <div className="flex max-w-[8rem] flex-wrap gap-1">
              {skillIds.map((skillId) => (
                <span
                  key={skillId}
                  className="flex items-center gap-1 rounded-md border border-neutral-700 bg-neutral-800 px-1 py-0.5 text-[11px] text-neutral-300"
                >
                  <AssetIcon type="skill" iconId={skillId} label={skillsById[skillId]?.name ?? skillId} size={12} />
                  {skillsById[skillId]?.name ?? skillId}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-neutral-600">—</span>
          )}
        </td>
        <td className="px-3 py-2 text-neutral-300">
          {growthRates ? (
            <div className="grid grid-cols-4 gap-x-2 gap-y-0.5 whitespace-nowrap text-xs">
              {STAT_KEYS.map((key) => (
                <span key={key}>
                  <span className="text-neutral-500">{STAT_LABELS[key]} </span>
                  {growthRates[key]}
                </span>
              ))}
            </div>
          ) : (
            '—'
          )}
        </td>
        <td className="px-3 py-2 text-neutral-300">
          {adjusted ? (
            <div className="grid grid-cols-4 gap-x-2 gap-y-0.5 whitespace-nowrap text-xs">
              {STAT_KEYS.map((key) => (
                <span key={key}>
                  <span className="text-neutral-500">{STAT_LABELS[key]} </span>
                  {adjusted.stats[key]}
                </span>
              ))}
              <span>
                <span className="text-neutral-500">Mov </span>
                {adjusted.movement}
              </span>
            </div>
          ) : (
            '—'
          )}
        </td>
      </tr>
    )
  }

  function renderTable(ids: string[], title?: string) {
    if (ids.length === 0) return null
    return (
      <div className="space-y-2">
        {title && <h4 className="text-sm font-semibold text-neutral-300">{title}</h4>}
        <div className="overflow-x-auto rounded-lg border border-neutral-800 bg-neutral-900">
          <table className="w-full min-w-[1000px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-800 text-left text-xs uppercase tracking-wide text-neutral-500">
                <th className="px-3 py-2">Unit</th>
                <th className="px-3 py-2">Backpack</th>
                <th className="px-3 py-2">Class</th>
                <th className="px-3 py-2">Weapons</th>
                <th className="px-3 py-2">Skills</th>
                <th className="px-3 py-2">Growth %</th>
                <th className="px-3 py-2">Max Stats</th>
              </tr>
            </thead>
            <tbody>{ids.map((id) => renderRow(id))}</tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
        <h3 className="text-base font-semibold text-neutral-100">Team Viewer</h3>
        <p className="text-xs text-neutral-500">
          Pick a saved Skill Set and a saved Unit Set (from the same route) to see the whole roster
          together — final class, weapons, skills, backpack, growth %, and max stats side by side.
          Check "Backpack unit" for a unit in Skill Planner to list them separately below.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs text-neutral-400">
            Skill Set
            <select
              value={skillSetId}
              onChange={(e) => setSkillSetId(e.target.value)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-200"
            >
              <option value="">Select a saved Skill Set…</option>
              {skillSets.map((b) => (
                <option key={b.id} value={b.id}>{b.name} ({b.route})</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-neutral-400">
            Unit Set
            <select
              value={unitSetId}
              onChange={(e) => setUnitSetId(e.target.value)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-200"
            >
              <option value="">Select a saved Unit Set…</option>
              {unitSets.map((b) => (
                <option key={b.id} value={b.id}>{b.name} ({b.route})</option>
              ))}
            </select>
          </label>
        </div>
        {routeMismatch && (
          <p className="text-sm text-red-400">
            "{skillSet?.name}" is {skillSet?.route} and "{unitSet?.name}" is {unitSet?.route} — pick two
            sets from the same route.
          </p>
        )}
      </div>

      {/* Headless batch rendering: one UnitDetail per roster member with a REAL Unit Set entry
          (selectedClassId present), computing off-screen and reporting back via onComputedSummary —
          nothing here duplicates its math. A backpack-only entry (no Unit Set entry, or one created
          just to carry a backpack pick) deliberately has no selectedClassId and skips this entirely —
          getOwnStats falls back to a static class-cap computed from Skill Planner's own class pick. */}
      {!routeMismatch &&
        unitSet?.entries
          .filter((entry) => typeof entry.data.selectedClassId === 'string')
          .map((entry) => {
            const character = charactersById[entry.characterId]
            if (!character) return null
            return (
              <UnitDetail
                key={entry.characterId}
                character={character}
                activeRoute={unitSet.route}
                corrinBuild={corrinBuild}
                pendingBuildData={entry.data}
                onConsumePendingBuildData={() => {}}
                onRequestLoadBuild={() => {}}
                onSwitchRoute={() => {}}
                headless
                onComputedSummary={(summary) => setSummaries((prev) => ({ ...prev, [entry.characterId]: summary }))}
              />
            )
          })}

      {!routeMismatch && renderTable(mainIds)}
      {!routeMismatch && renderTable(backpackOnlyIds, 'Backpack Only')}

      {!routeMismatch && (skillSetId || unitSetId) && rosterIds.length === 0 && (
        <p className="text-sm text-neutral-500">Neither set has any units yet.</p>
      )}
    </div>
  )
}

type BulkSubTab = 'team' | 'parent'

/** Two bulk-comparison modes sharing one route filter: Team Viewer (a whole saved roster at once)
 * and Parent Checker (one child against several freely-picked candidate parents). */
export function BulkViewer() {
  const [subTab, setSubTab] = useState<BulkSubTab>('team')

  return (
    <div className="space-y-6">
      <RouteFilter />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setSubTab('team')}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            subTab === 'team' ? 'bg-violet-600 text-white' : 'bg-neutral-800 text-neutral-300'
          }`}
        >
          Team Viewer
        </button>
        <button
          type="button"
          onClick={() => setSubTab('parent')}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            subTab === 'parent' ? 'bg-violet-600 text-white' : 'bg-neutral-800 text-neutral-300'
          }`}
        >
          Parent Checker
        </button>
      </div>

      {subTab === 'team' ? <TeamViewerPanel /> : <ParentChecker />}
    </div>
  )
}
