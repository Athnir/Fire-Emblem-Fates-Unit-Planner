import { useMemo, useState } from 'react'
import { characters, charactersById } from '../data/characters'
import { classesById } from '../data/classes'
import { skillsById } from '../data/skills'
import { STAT_KEYS, type PairUpBonus, type Route, type StatBlock } from '../data/types'
import { isRouteCompatible } from '../logic/eligibility'
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

/** Shared between the table (desktop/tablet) and stacked-card (phone) layouts below, so the two
 * never drift out of sync with each other. */
function SkillTags({ skillIds }: { skillIds: string[] }) {
  if (skillIds.length === 0) return <span className="text-neutral-600">—</span>
  return (
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
  )
}

function StatGrid({ values, movement }: { values: StatBlock; movement?: number }) {
  return (
    <div className="grid grid-cols-4 gap-x-2 gap-y-0.5 whitespace-nowrap text-xs">
      {STAT_KEYS.map((key) => (
        <span key={key}>
          <span className="text-neutral-500">{STAT_LABELS[key]} </span>
          {values[key]}
        </span>
      ))}
      {movement !== undefined && (
        <span>
          <span className="text-neutral-500">Mov </span>
          {movement}
        </span>
      )}
    </div>
  )
}

/** Module-scope (not defined inside TeamViewerPanel) is load-bearing here, not just style — a
 * component defined inside another component's render gets a brand-new identity every render,
 * which forces React to unmount/remount its <select> on every re-render (including the very
 * frequent ones from the headless UnitDetail summaries updating), interrupting a click mid-select
 * and making the dropdown feel broken/unresponsive. All the data it needs comes in as props instead
 * of closing over TeamViewerPanel's locals, for exactly that reason. */
function BackpackPicker({
  id,
  backpackId,
  overCap,
  route,
  onChange,
}: {
  id: string
  backpackId: string
  overCap: boolean
  route: Route | undefined
  onChange: (characterId: string, newBackpackId: string) => void
}) {
  if (!route) return <span className="text-neutral-600">—</span>
  return (
    <>
      <select
        value={backpackId}
        onChange={(e) => onChange(id, e.target.value)}
        className={`w-full max-w-[10rem] rounded-md border bg-neutral-800 px-2 py-1 text-xs text-neutral-200 ${
          overCap ? 'border-red-500' : 'border-neutral-700'
        }`}
      >
        <option value="">(none)</option>
        {characters
          .filter((c) => isRouteCompatible(c.route, route))
          .map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
      </select>
      {overCap && <p className="mt-1 text-xs text-amber-400">Too many {charactersById[id]?.name ?? id}.</p>}
    </>
  )
}

/** Same reasoning as BackpackPicker above — module scope, not nested, to keep the <select> stable
 * across TeamViewerPanel's re-renders. */
function BackpackClassPicker({
  id,
  options,
  pickedClassId,
  onChange,
}: {
  id: string
  options: { id: string; name: string }[]
  pickedClassId: string
  onChange: (characterId: string, classId: string) => void
}) {
  if (options.length === 0) return <span className="text-neutral-600">—</span>
  return (
    <select
      value={pickedClassId}
      onChange={(e) => onChange(id, e.target.value)}
      className="w-full max-w-[10rem] rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-xs text-neutral-200"
    >
      <option value="">(pick a class)</option>
      {options.map((c) => (
        <option key={c.id} value={c.id}>{c.name}</option>
      ))}
    </select>
  )
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

  // Replicate ("Creates a replica of the user once per map") is the ONLY thing that legally doubles
  // a unit's slot cap — "Backpack unit" (isBackpackUnit) is a completely separate, deployment-status
  // flag (this unit is never deployed as a front unit at all, e.g. no room for them in the roster
  // this run) and says nothing about whether a second copy of them actually exists. A backpack-only
  // unit WITHOUT Replicate is still just one real copy — usable as exactly one front unit's backpack,
  // same cap of 1 as anyone else, not 2 — while a normal front-deployed unit like Corrin F, once she
  // actually has Replicate equipped, can legally ALSO back someone else without needing the flag.
  const hasReplicate = (characterId: string): boolean => {
    const loadout = skillSet?.entries.find((e) => e.characterId === characterId)?.data.loadout
    return Array.isArray(loadout) && loadout.includes('replicate')
  }

  // How many "slots" (own front row, if it counts + times named as someone else's backpack) each
  // roster member fills — normally capped at 1 (a unit is either deployed as themselves or riding as
  // a backpack, never both), raised to 2 only for a unit actually carrying Replicate (a real clone
  // exists, so both at once is legal). Purely informational: nothing here is blocked, just flagged.
  const backpackCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const id of rosterIds) {
      const backpackId = getBackpackId(id)
      if (backpackId) counts.set(backpackId, (counts.get(backpackId) ?? 0) + 1)
    }
    return counts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rosterIds, summaries, unitSet])
  const slotCap = (id: string) => (hasReplicate(id) ? 2 : 1)
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
      const classId = getBackpackClassId(backpackId) ?? summaries[backpackId]?.classId
      return classId ? classesById[classId]?.pairUpBonus : undefined
    }
    return summaries[leadId]?.pairUpBonus
  }

  function handleBackpackClassChange(characterId: string, classId: string) {
    // backpackClassId is a Skill-Planner-owned field (see isBackpackUnit/getBackpackClassId above) —
    // patching the Unit Set here would silently do nothing, since nothing ever reads it back from there.
    if (!skillSet) return
    patchBuildSetEntryData(skillSet.id, characterId, charactersById[characterId]?.name ?? characterId, {
      backpackClassId: classId,
    })
  }

  // A backpack-only unit never levels as a front-line unit, so their OWN stat progression is beside
  // the point — what matters for whoever they're backing is just which class they're set to
  // contribute as (backpackClassId, picked from their real unlocked pool below — falls back to
  // their headless-resolved default class if nothing's been explicitly picked yet). A normal
  // (non-backpack) unit's stats still come from Unit Planner's own headless computation as before.
  const getOwnStats = (id: string): { stats: StatBlock; movement: number } | undefined => {
    if (isBackpackUnit(id)) {
      const classId = getBackpackClassId(id) ?? summaries[id]?.classId
      const character = charactersById[id]
      const cls = classId ? classesById[classId] : undefined
      if (character && cls) return { stats: classStatCap(cls, character.maxStatModifiers), movement: cls.movement }
      return undefined
    }
    const summary = summaries[id]
    if (summary?.maxStats && summary.movement !== undefined) {
      return { stats: summary.maxStats, movement: summary.movement }
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

  /** Every field a main-table row/card needs, computed once and shared between both layouts below. */
  function getMainRowData(id: string) {
    const character = charactersById[id]
    const summary = summaries[id]
    const loadout = skillSet?.entries.find((e) => e.characterId === id)?.data.loadout
    const skillIds = Array.isArray(loadout) ? loadout : []
    const adjusted = adjustedStats(id)
    const growthRates = summary?.growthRates ?? character?.growthRates
    const overCap = isOverCap(id)
    const backpackId = getBackpackId(id) ?? ''
    return { character, summary, skillIds, adjusted, growthRates, overCap, backpackId }
  }

  function renderRow(id: string) {
    const { character, summary, skillIds, adjusted, growthRates, overCap, backpackId } = getMainRowData(id)
    return (
      <tr key={id} className="border-b border-neutral-800/60 align-top last:border-0">
        <td className="px-3 py-2 font-medium text-neutral-200">{character?.name ?? id}</td>
        <td className="px-3 py-2">
          <BackpackPicker
            id={id}
            backpackId={backpackId}
            overCap={overCap}
            route={unitSet?.route}
            onChange={handleReassignBackpack}
          />
        </td>
        <td className="px-3 py-2 text-neutral-300">{summary?.className ?? '—'}</td>
        <td className="px-3 py-2 text-neutral-300">
          {summary?.weaponRanks?.length ? summary.weaponRanks.map((w) => `${w.type} ${w.rank}`).join(', ') : '—'}
        </td>
        <td className="px-3 py-2"><SkillTags skillIds={skillIds} /></td>
        <td className="px-3 py-2 text-neutral-300">{growthRates ? <StatGrid values={growthRates} /> : '—'}</td>
        <td className="px-3 py-2 text-neutral-300">
          {adjusted ? <StatGrid values={adjusted.stats} movement={adjusted.movement} /> : '—'}
        </td>
      </tr>
    )
  }

  function renderMainCard(id: string) {
    const { character, summary, skillIds, adjusted, growthRates, overCap, backpackId } = getMainRowData(id)
    return (
      <div key={id} className="space-y-2 rounded-lg border border-neutral-800 bg-neutral-900 p-3">
        <div className="font-medium text-neutral-200">{character?.name ?? id}</div>
        <div>
          <div className="mb-1 text-xs uppercase tracking-wide text-neutral-500">Backpack</div>
          <BackpackPicker
            id={id}
            backpackId={backpackId}
            overCap={overCap}
            route={unitSet?.route}
            onChange={handleReassignBackpack}
          />
        </div>
        <div className="text-sm text-neutral-300">
          <span className="text-neutral-500">Class: </span>{summary?.className ?? '—'}
        </div>
        <div className="text-sm text-neutral-300">
          <span className="text-neutral-500">Weapons: </span>
          {summary?.weaponRanks?.length ? summary.weaponRanks.map((w) => `${w.type} ${w.rank}`).join(', ') : '—'}
        </div>
        <div>
          <div className="mb-1 text-xs uppercase tracking-wide text-neutral-500">Skills</div>
          <SkillTags skillIds={skillIds} />
        </div>
        <div>
          <div className="mb-1 text-xs uppercase tracking-wide text-neutral-500">Growth %</div>
          {growthRates ? <StatGrid values={growthRates} /> : '—'}
        </div>
        <div>
          <div className="mb-1 text-xs uppercase tracking-wide text-neutral-500">Max Stats</div>
          {adjusted ? <StatGrid values={adjusted.stats} movement={adjusted.movement} /> : '—'}
        </div>
      </div>
    )
  }

  function renderTable(ids: string[]) {
    if (ids.length === 0) return null
    return (
      <div className="space-y-2">
        {/* Table layout: comfortable at desktop/tablet widths, but 7 columns (two of them stat
            grids) don't fit a phone screen without constant horizontal scrolling — see the
            stacked-card layout below, shown instead under the sm breakpoint. */}
        <div className="hidden overflow-x-auto rounded-lg border border-neutral-800 bg-neutral-900 sm:block">
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
        <div className="space-y-3 sm:hidden">{ids.map((id) => renderMainCard(id))}</div>
      </div>
    )
  }

  /**
   * A backpack-only unit is never actually deployed as a front-line unit — they have no stat
   * progression worth showing (Growth %/Max Stats), and asking "who is THEIR backpack" makes no
   * sense (only front units carry a backpack). What DOES matter is which class they're contributing
   * as, since that's what determines the flat class-based Pair-Up bonus they hand off — the picker
   * below is fed by their real unlocked pool (Class Set + whatever spouse/friend was set for them in
   * Unit Planner, reported via availableClasses), not a hardcoded guess, so e.g. Laslow's Xander
   * friendship correctly offers his Cavalier-line reclass options here too.
   */
  function getBackpackRowData(id: string) {
    const character = charactersById[id]
    const summary = summaries[id]
    const loadout = skillSet?.entries.find((e) => e.characterId === id)?.data.loadout
    const skillIds = Array.isArray(loadout) ? loadout : []
    const options = summary?.availableClasses ?? []
    const pickedClassId = getBackpackClassId(id) || summary?.classId || ''
    const pickedClass = pickedClassId ? classesById[pickedClassId] : undefined
    const overCap = isOverCap(id)
    return { character, skillIds, options, pickedClassId, pickedClass, overCap }
  }

  function renderBackpackRow(id: string) {
    const { character, skillIds, options, pickedClassId, pickedClass, overCap } = getBackpackRowData(id)
    return (
      <tr key={id} className="border-b border-neutral-800/60 align-top last:border-0">
        <td className="px-3 py-2 font-medium text-neutral-200">
          {character?.name ?? id}
          {overCap && <p className="mt-1 text-xs text-amber-400">Used as backpack too many times.</p>}
        </td>
        <td className="px-3 py-2">
          <BackpackClassPicker
            id={id}
            options={options}
            pickedClassId={pickedClassId}
            onChange={handleBackpackClassChange}
          />
        </td>
        <td className="px-3 py-2 text-neutral-300">
          {pickedClass?.weaponRanks?.length ? pickedClass.weaponRanks.map((w) => `${w.type} ${w.rank}`).join(', ') : '—'}
        </td>
        <td className="px-3 py-2"><SkillTags skillIds={skillIds} /></td>
      </tr>
    )
  }

  function renderBackpackCard(id: string) {
    const { character, skillIds, options, pickedClassId, pickedClass, overCap } = getBackpackRowData(id)
    return (
      <div key={id} className="space-y-2 rounded-lg border border-neutral-800 bg-neutral-900 p-3">
        <div className="font-medium text-neutral-200">
          {character?.name ?? id}
          {overCap && <p className="mt-1 text-xs text-amber-400">Used as backpack too many times.</p>}
        </div>
        <div>
          <div className="mb-1 text-xs uppercase tracking-wide text-neutral-500">Class</div>
          <BackpackClassPicker
            id={id}
            options={options}
            pickedClassId={pickedClassId}
            onChange={handleBackpackClassChange}
          />
        </div>
        <div className="text-sm text-neutral-300">
          <span className="text-neutral-500">Weapons: </span>
          {pickedClass?.weaponRanks?.length ? pickedClass.weaponRanks.map((w) => `${w.type} ${w.rank}`).join(', ') : '—'}
        </div>
        <div>
          <div className="mb-1 text-xs uppercase tracking-wide text-neutral-500">Skills</div>
          <SkillTags skillIds={skillIds} />
        </div>
      </div>
    )
  }

  function renderBackpackTable(ids: string[]) {
    if (ids.length === 0) return null
    return (
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-neutral-300">Backpack Only</h4>
        <div className="hidden overflow-x-auto rounded-lg border border-neutral-800 bg-neutral-900 sm:block">
          <table className="w-full min-w-[550px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-800 text-left text-xs uppercase tracking-wide text-neutral-500">
                <th className="px-3 py-2">Unit</th>
                <th className="px-3 py-2">Class</th>
                <th className="px-3 py-2">Weapons</th>
                <th className="px-3 py-2">Skills</th>
              </tr>
            </thead>
            <tbody>{ids.map((id) => renderBackpackRow(id))}</tbody>
          </table>
        </div>
        <div className="space-y-3 sm:hidden">{ids.map((id) => renderBackpackCard(id))}</div>
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

      {/* Headless batch rendering: one UnitDetail per roster member, computing off-screen and
          reporting back via onComputedSummary — nothing here duplicates its math. Every roster
          member gets mounted now (not just ones with a real selectedClassId): a backpack-only entry
          still needs its own availableClasses/classId reported (fed by whatever spouse/friend was
          set for them, or just their bare Class Set if they've never been touched in Unit Planner at
          all) so the Backpack Only table's class picker below has real options, not a guess. Passing
          `{}` when there's no saved entry data at all still resolves a sensible bare-identity default. */}
      {!routeMismatch &&
        unitSet &&
        rosterIds.map((id) => {
          const character = charactersById[id]
          if (!character) return null
          const entryData = unitSet.entries.find((e) => e.characterId === id)?.data ?? {}
          return (
            <UnitDetail
              key={id}
              character={character}
              activeRoute={unitSet.route}
              corrinBuild={corrinBuild}
              pendingBuildData={entryData}
              onConsumePendingBuildData={() => {}}
              onRequestLoadBuild={() => {}}
              onSwitchRoute={() => {}}
              headless
              onComputedSummary={(summary) => setSummaries((prev) => ({ ...prev, [id]: summary }))}
            />
          )
        })}

      {!routeMismatch && renderTable(mainIds)}
      {!routeMismatch && renderBackpackTable(backpackOnlyIds)}

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
