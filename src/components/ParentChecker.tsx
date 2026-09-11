import { useState } from 'react'
import { characters, charactersById } from '../data/characters'
import { supports } from '../data/supports'
import { STAT_KEYS, type Character, type StatBlock } from '../data/types'
import { computeChild, resolveSecondGenParent } from '../logic/childCalculator'
import { getFixedParent } from '../logic/childLookup'
import { withCorrinBuild } from '../logic/corrinBuild'
import { canProduceChild, isRouteCompatible } from '../logic/eligibility'
import { useCorrinBuildStore } from '../state/corrinBuildStore'
import { usePlannerStore } from '../state/plannerStore'

const STAT_LABELS: Record<string, string> = {
  hp: 'HP', str: 'Str', mag: 'Mag', skl: 'Skl', spd: 'Spd', lck: 'Lck', def: 'Def', res: 'Res',
}

const childCandidates = characters.filter((c) => c.isChild)

interface CandidateResult {
  growthRates: StatBlock
  /** The candidate's own max-stat-modifier contribution (Corrin-corrected if applicable, and
   * recursively resolved from THEIR OWN parents if the candidate is itself a second-gen child — see
   * resolveSecondGenParent) — not blended with the fixed parent or converted into any class's actual
   * cap. Blending is just addition (father's modifiers + mother's modifiers + 1 — see
   * computeMaxStatModifiers), so this alone already shows exactly how switching candidates shifts
   * the child's real cap either way, without needing to fix a baseline or drag a specific class into
   * the comparison. */
  maxStatMods: StatBlock
}

// Spacing comes from each cell's own trailing padding, not the grid's gap-x/gap-y — html2canvas
// (used by "Save as image") doesn't reliably render CSS grid gap, which collapsed every label
// straight into the next value with no space between them in exported screenshots.
function DeltaGrid({ values }: { values: StatBlock }) {
  return (
    <div className="grid grid-cols-4 whitespace-nowrap text-xs">
      {STAT_KEYS.map((key) => {
        const value = values[key]
        const color = value > 0 ? 'text-sky-400' : value < 0 ? 'text-red-400' : 'text-neutral-400'
        return (
          <span key={key} className="pr-2 pb-0.5">
            <span className="text-neutral-500">{STAT_LABELS[key]} </span>
            <span className={color}>{value > 0 ? `+${value}` : value}</span>
          </span>
        )
      })}
    </div>
  )
}

function GrowthGrid({ values }: { values: StatBlock }) {
  return (
    <div className="grid grid-cols-4 whitespace-nowrap text-xs">
      {STAT_KEYS.map((key) => (
        <span key={key} className="pr-2 pb-0.5">
          <span className="text-neutral-500">{STAT_LABELS[key]} </span>
          {values[key]}
        </span>
      ))}
    </div>
  )
}

function CandidateHeader({
  id,
  candidate,
  nestedValue,
  nestedOptions,
  onRemove,
  onNestedChange,
}: {
  id: string
  candidate: Character | undefined
  nestedValue: string
  nestedOptions: Character[]
  onRemove: (id: string) => void
  onNestedChange: (id: string, value: string) => void
}) {
  return (
    <>
      {candidate?.name ?? id}
      <button type="button" onClick={() => onRemove(id)} className="ml-2 text-xs text-neutral-500 hover:text-red-400">
        Remove
      </button>
      {candidate?.isChild && (
        <label className="mt-1 flex flex-col gap-1 text-[11px] font-normal text-neutral-500">
          {candidate.name}'s own variable parent
          <select
            value={nestedValue}
            onChange={(e) => onNestedChange(id, e.target.value)}
            className="w-full max-w-[9rem] rounded-md border border-neutral-700 bg-neutral-800 px-1.5 py-1 text-xs text-neutral-200"
          >
            <option value="">(none selected)</option>
            {nestedOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
      )}
    </>
  )
}

/**
 * A child's numbers depend entirely on which two units end up as their parents — this lets you pick
 * one child and freely stack up several candidate variable parents (independent of any saved
 * Marriage plan/pairing) to see, side by side, how each one changes growth % and the child's max
 * stat modifiers. Only reachable for Kana: a candidate can itself be a second-gen child ("second-gen
 * marriage"), in which case their OWN contribution depends on THEIR OWN parents too — each such
 * candidate gets its own separate nested picker (not one shared field), since several different
 * second-gen candidates can be stacked up for comparison at once.
 */
export function ParentChecker() {
  const corrinBuild = useCorrinBuildStore((state) => state.build)
  const activeRoute = usePlannerStore((state) => state.activeRoute)

  const [childId, setChildId] = useState('')
  const [candidateIds, setCandidateIds] = useState<string[]>([])
  const [addCandidateId, setAddCandidateId] = useState('')
  // Per-candidate: which unit was picked as THAT candidate's own non-fixed parent, only relevant
  // when the candidate is itself a second-gen child (see resolveSecondGenParent).
  const [nestedVariableParentIds, setNestedVariableParentIds] = useState<Record<string, string>>({})

  function handleChildChange(id: string) {
    setChildId(id)
    setCandidateIds([])
    setAddCandidateId('')
    setNestedVariableParentIds({})
  }

  const child = childId ? charactersById[childId] : undefined
  const isKanaChild = child?.id === 'kana_m' || child?.id === 'kana_f'
  const fixedInfo = child ? getFixedParent(child) : undefined
  const fixedChar = fixedInfo ? withCorrinBuild(charactersById[fixedInfo.id], corrinBuild) : undefined

  const candidateOptions =
    child && fixedInfo && fixedChar
      ? characters.filter((c) => {
          // Children marrying children is a real mechanic, but Kana is the only child whose own
          // parent can be a second-gen child themselves — see childCalculator's own comment on this.
          if ((c.isChild && !isKanaChild) || c.id === fixedChar.id) return false
          if (!isRouteCompatible(c.route, activeRoute)) return false
          const father = fixedInfo.side === 'father' ? fixedChar : c
          const mother = fixedInfo.side === 'father' ? c : fixedChar
          return canProduceChild(supports, father, mother, activeRoute)
        })
      : []

  function handleAddCandidate() {
    if (!addCandidateId || candidateIds.includes(addCandidateId)) return
    setCandidateIds((prev) => [...prev, addCandidateId])
    setAddCandidateId('')
  }

  function handleRemoveCandidate(id: string) {
    setCandidateIds((prev) => prev.filter((c) => c !== id))
    setNestedVariableParentIds((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  /** For a candidate who's themselves a child: who they could have as their own non-fixed parent,
   * same eligibility check as the top-level candidate picker but anchored to THEIR fixed side. */
  function nestedOptionsFor(candidate: Character) {
    const nestedFixedInfo = getFixedParent(candidate)
    if (!nestedFixedInfo) return []
    const nestedFixedChar = charactersById[nestedFixedInfo.id]
    if (!nestedFixedChar) return []
    return characters.filter((c) => {
      if (c.isChild || c.id === nestedFixedChar.id) return false
      if (!isRouteCompatible(c.route, activeRoute)) return false
      const father = nestedFixedInfo.side === 'father' ? nestedFixedChar : c
      const mother = nestedFixedInfo.side === 'father' ? c : nestedFixedChar
      return canProduceChild(supports, father, mother, activeRoute)
    })
  }

  function handleNestedChange(id: string, value: string) {
    setNestedVariableParentIds((prev) => ({ ...prev, [id]: value }))
  }

  function computeForCandidate(candidateId: string): CandidateResult | undefined {
    if (!child || !fixedInfo || !fixedChar) return undefined
    const rawCandidate = charactersById[candidateId]
    if (!rawCandidate) return undefined
    const candidateChar = withCorrinBuild(rawCandidate, corrinBuild)
    const nestedVariableParentId = nestedVariableParentIds[candidateId]
    const nestedVariableChar = nestedVariableParentId
      ? withCorrinBuild(charactersById[nestedVariableParentId], corrinBuild)
      : undefined
    const variableChar = resolveSecondGenParent(candidateChar, getFixedParent(rawCandidate), nestedVariableChar)
    const father = fixedInfo.side === 'father' ? fixedChar : variableChar
    const mother = fixedInfo.side === 'father' ? variableChar : fixedChar
    const result = computeChild({
      child,
      father,
      mother,
      fatherCurrentStats: father.baseStats,
      motherCurrentStats: mother.baseStats,
      level: 20,
    })
    return { growthRates: result.growthRates, maxStatMods: variableChar.maxStatModifiers }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
        <h3 className="text-base font-semibold text-neutral-100">Parent Checker</h3>
        <p className="text-xs text-neutral-500">
          Pick a child and stack up candidate variable parents to compare growth % and max stat
          modifiers side by side.
        </p>
        <label className="flex flex-col gap-1 text-xs text-neutral-400">
          Child
          <select
            value={childId}
            onChange={(e) => handleChildChange(e.target.value)}
            className="w-full max-w-sm rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-200"
          >
            <option value="">Select a child…</option>
            {childCandidates
              .filter((c) => isRouteCompatible(c.route, activeRoute))
              .map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
          </select>
        </label>
        {child && (
          <label className="flex flex-col gap-1 text-xs text-neutral-400">
            Add a candidate variable parent
            <div className="flex gap-2">
              <select
                value={addCandidateId}
                onChange={(e) => setAddCandidateId(e.target.value)}
                className="w-full max-w-sm rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-200"
              >
                <option value="">Select a unit…</option>
                {candidateOptions
                  .filter((c) => !candidateIds.includes(c.id))
                  .map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
              </select>
              <button
                type="button"
                onClick={handleAddCandidate}
                disabled={!addCandidateId}
                className="rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Add
              </button>
            </div>
          </label>
        )}
      </div>

      {child && candidateIds.length > 0 && (
        <>
          {/* Table layout: comfortable at desktop/tablet widths, but a 3-column table with two
              stat grids packed in doesn't fit a phone screen without constant horizontal scrolling —
              see the stacked-card layout below, shown instead under the sm breakpoint. */}
          <div
            data-export-table
            className="hidden overflow-x-auto rounded-lg border border-neutral-800 bg-neutral-900 sm:block"
          >
            <table className="w-full min-w-[550px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-800 text-left text-xs uppercase tracking-wide text-neutral-500">
                  <th className="px-3 py-2">Variable Parent</th>
                  <th className="px-3 py-2">Growth %</th>
                  <th className="px-3 py-2">Max Stat Mods</th>
                </tr>
              </thead>
              <tbody>
                {candidateIds.map((id) => {
                  const candidate = charactersById[id]
                  const result = computeForCandidate(id)
                  return (
                    <tr key={id} className="border-b border-neutral-800/60 align-top last:border-0">
                      <td className="px-3 py-2 font-medium text-neutral-200">
                        <CandidateHeader
                          id={id}
                          candidate={candidate}
                          nestedValue={nestedVariableParentIds[id] ?? ''}
                          nestedOptions={candidate?.isChild ? nestedOptionsFor(candidate) : []}
                          onRemove={handleRemoveCandidate}
                          onNestedChange={handleNestedChange}
                        />
                      </td>
                      <td className="px-3 py-2 text-neutral-300">
                        {result ? <GrowthGrid values={result.growthRates} /> : '—'}
                      </td>
                      <td className="px-3 py-2 text-neutral-300">
                        {result ? <DeltaGrid values={result.maxStatMods} /> : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div data-export-cards className="space-y-3 sm:hidden">
            {candidateIds.map((id) => {
              const candidate = charactersById[id]
              const result = computeForCandidate(id)
              return (
                <div key={id} className="space-y-2 rounded-lg border border-neutral-800 bg-neutral-900 p-3">
                  <div className="font-medium text-neutral-200">
                    <CandidateHeader
                      id={id}
                      candidate={candidate}
                      nestedValue={nestedVariableParentIds[id] ?? ''}
                      nestedOptions={candidate?.isChild ? nestedOptionsFor(candidate) : []}
                      onRemove={handleRemoveCandidate}
                      onNestedChange={handleNestedChange}
                    />
                  </div>
                  <div>
                    <div className="mb-1 text-xs uppercase tracking-wide text-neutral-500">Growth %</div>
                    {result ? <GrowthGrid values={result.growthRates} /> : '—'}
                  </div>
                  <div>
                    <div className="mb-1 text-xs uppercase tracking-wide text-neutral-500">Max Stat Mods</div>
                    {result ? <DeltaGrid values={result.maxStatMods} /> : '—'}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {child && candidateIds.length === 0 && (
        <p className="text-sm text-neutral-500">Add at least one candidate variable parent to compare.</p>
      )}
    </div>
  )
}
