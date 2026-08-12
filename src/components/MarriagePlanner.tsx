import { useEffect, useMemo, useState } from 'react'
import { characters, charactersById } from '../data/characters'
import { supports } from '../data/supports'
import { canMarry, canProduceChild, isRouteCompatible, isSameSexPairing } from '../logic/eligibility'
import { assignParentRoles, findChildrenForPair, isFamilyBlocked } from '../logic/childLookup'
import { computeChild } from '../logic/childCalculator'
import { earliestChildLevel } from '../data/childLeveling'
import { withCorrinBuild } from '../logic/corrinBuild'
import { useCorrinBuildStore } from '../state/corrinBuildStore'
import { isCharacterAssigned, usePlannerStore } from '../state/plannerStore'
import { useScreenshotContextStore } from '../state/screenshotContextStore'
import { ChildResultCard } from './ChildResultCard'
import { PlanManager } from './PlanManager'
import { RouteFilter } from './RouteFilter'

const childCandidates = characters.filter((c) => c.isChild)

export function MarriagePlanner() {
  const activeRoute = usePlannerStore((state) => state.activeRoute)
  const pairings = usePlannerStore((state) => state.pairings)
  const addPairing = usePlannerStore((state) => state.addPairing)
  const removePairing = usePlannerStore((state) => state.removePairing)
  const corrinBuild = useCorrinBuildStore((state) => state.build)

  const [primaryId, setPrimaryId] = useState('')
  const [spouseId, setSpouseId] = useState('')

  // Children are selectable too — Corrin can marry some of them, and children can marry each
  // other (barring siblings) — canMarry below still gates it on real S-support data either way.
  const participants = useMemo(
    () => characters.filter((c) => isRouteCompatible(c.route, activeRoute)),
    [activeRoute],
  )

  const primary = primaryId ? withCorrinBuild(charactersById[primaryId], corrinBuild) : undefined
  const spouse = spouseId ? withCorrinBuild(charactersById[spouseId], corrinBuild) : undefined

  const setUnitLabel = useScreenshotContextStore((state) => state.setUnitLabel)
  useEffect(() => {
    const label = primary ? (spouse ? `${primary.name} x ${spouse.name}` : primary.name) : ''
    setUnitLabel(label)
    return () => setUnitLabel('')
  }, [primary, spouse, setUnitLabel])

  // Primary is always the full roster — it's the starting point, so there's nothing to narrow it
  // by yet. Spouse is entirely dependent on Primary: blank until Primary is picked, then narrowed
  // to only who Primary can actually marry (excluding anyone the plan already reveals to be a
  // parent/sibling of Primary).
  const optionsForPrimary = participants
  const optionsForSpouse = primary
    ? participants.filter(
        (c) => c.id !== primary.id && canMarry(supports, primary, c, activeRoute) && !isFamilyBlocked(primary, c, pairings),
      )
    : []

  function handlePrimaryChange(id: string) {
    setPrimaryId(id)
    // The old spouse pick may no longer be valid for a new Primary — clear it rather than leave a
    // stale, possibly-ineligible selection sitting in state while the dropdown itself goes blank.
    setSpouseId('')
  }

  const familyBlocked = primary && spouse ? isFamilyBlocked(primary, spouse, pairings) : false
  const eligible = primary && spouse ? canMarry(supports, primary, spouse, activeRoute) && !familyBlocked : false
  const sameSex = primary && spouse ? isSameSexPairing(primary, spouse) : false
  const canChild = primary && spouse ? canProduceChild(supports, primary, spouse, activeRoute) : false

  const roles = primary && spouse ? assignParentRoles(primary, spouse) : undefined
  const resultingChildren = roles ? findChildrenForPair(roles.father.id, roles.mother.id, childCandidates) : []

  const alreadyAssignedPrimary = primaryId ? isCharacterAssigned(pairings, primaryId) : false
  const alreadyAssignedSpouse = spouseId ? isCharacterAssigned(pairings, spouseId) : false

  function handleClear() {
    setPrimaryId('')
    setSpouseId('')
  }

  function handleAddToPlan() {
    if (!primaryId || !spouseId) return
    addPairing({ characterAId: primaryId, characterBId: spouseId })
    handleClear()
  }

  return (
    <div className="space-y-6">
      <RouteFilter />

      <div className="space-y-4 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
        <h3 className="text-base font-semibold text-neutral-100">New Pairing</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <select
            value={primaryId}
            onChange={(e) => handlePrimaryChange(e.target.value)}
            className="rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-200"
          >
            <option value="">Select Primary…</option>
            {optionsForPrimary.map((c) => (
              <option key={c.id} value={c.id} disabled={c.id === spouseId}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={spouseId}
            onChange={(e) => setSpouseId(e.target.value)}
            disabled={!primary}
            className="rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-200 disabled:opacity-50"
          >
            <option value="">{primary ? 'Select Spouse…' : 'Select a Primary first…'}</option>
            {optionsForSpouse.map((c) => (
              <option key={c.id} value={c.id} disabled={c.id === primaryId}>
                {c.name}
              </option>
            ))}
          </select>
          {primary && !spouse && (
            <p className="text-xs text-neutral-500 sm:col-span-2">
              Showing only characters {primary.name} can marry on the current route.
            </p>
          )}
        </div>

        {primary && spouse && (
          <div className="space-y-3">
            {familyBlocked && (
              <p className="text-sm text-red-400">
                {primary.name} and {spouse.name} are related given this plan's pairings (parent/child
                or siblings) — marriage is blocked, though they can still reach A-rank/friendship support.
              </p>
            )}
            {!familyBlocked && !eligible && (
              <p className="text-sm text-red-400">
                No S-support (marriage) exists between {primary.name} and {spouse.name} on the{' '}
                {activeRoute === 'all' ? 'selected' : activeRoute} route.
              </p>
            )}
            {eligible && sameSex && (
              <p className="text-sm text-amber-400">
                {primary.name} and {spouse.name} can marry, but same-sex pairings produce no child.
              </p>
            )}
            {(alreadyAssignedPrimary || alreadyAssignedSpouse) && (
              <p className="text-sm text-amber-400">
                {alreadyAssignedPrimary ? primary.name : spouse.name} is already assigned to another pairing
                in this plan — adding this one will double-book them.
              </p>
            )}

            {eligible && canChild && roles && (
              <>
                {resultingChildren.length === 0 && (
                  <p className="text-sm text-amber-400">
                    {primary.name} and {spouse.name} do not have a child.
                  </p>
                )}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {resultingChildren.map((child) => {
                    const result = computeChild({
                      child,
                      father: roles.father,
                      mother: roles.mother,
                      fatherCurrentStats: roles.father.baseStats,
                      motherCurrentStats: roles.mother.baseStats,
                      level: earliestChildLevel(child.unlockChapter, activeRoute),
                    })
                    return <ChildResultCard key={child.id} child={child} result={result} />
                  })}
                </div>
              </>
            )}

            <div className="flex gap-2">
              {eligible && (
                <button
                  type="button"
                  onClick={handleAddToPlan}
                  className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
                >
                  Add to Plan
                </button>
              )}
              <button
                type="button"
                onClick={handleClear}
                className="rounded-md bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 hover:bg-neutral-700"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}
        {!(primary && spouse) && (primaryId || spouseId) && (
          <button
            type="button"
            onClick={handleClear}
            className="rounded-md bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-300 hover:bg-neutral-700"
          >
            Clear Selection
          </button>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-base font-semibold text-neutral-100">Current Plan ({pairings.length})</h3>
        {pairings.length === 0 && (
          <p className="text-sm text-neutral-500">No pairings added yet.</p>
        )}
        <div className="space-y-3">
          {pairings.map((p) => {
            const a = charactersById[p.characterAId]
            const b = charactersById[p.characterBId]
            if (!a || !b) return null
            const roles = assignParentRoles(a, b)
            const resultChildren = roles ? findChildrenForPair(roles.father.id, roles.mother.id, childCandidates) : []
            return (
              <div key={`${p.characterAId}-${p.characterBId}`} className="rounded-lg border border-neutral-800 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-neutral-200">
                    {a.name} × {b.name}
                    {resultChildren.length > 0 && (
                      <span className="ml-2 text-neutral-500">
                        → {resultChildren.map((c) => c.name).join(' & ')}
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => removePairing(p.characterAId, p.characterBId)}
                    className="text-xs text-neutral-500 hover:text-red-400"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <PlanManager />
    </div>
  )
}
