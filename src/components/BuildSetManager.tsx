import { useState } from 'react'
import { charactersById } from '../data/characters'
import type { Route } from '../data/types'
import { useSavedBuildsStore, type BuildTab, type WorkingSetEntry } from '../state/savedBuildsStore'

/** Which field of each tab's own `data` blob holds its S-rank (Partner Seal) marriage pick — the
 * only relationship that's a real 1:1 exclusivity in-game. Friendship Seal/Pair-Up fields are
 * deliberately not checked here: Pair-Up specifically allows a single unit to be shared as a
 * support partner via skills like Replicate, so flagging that as a conflict would be wrong more
 * often than it'd be right. */
const SPOUSE_FIELD_BY_TAB: Record<BuildTab, string> = { skills: 'wifeId', unit: 'ownSpouseId' }

/** A stable reference for "this route's bucket hasn't been touched yet" — returning a fresh `[]`
 * from the zustand selector below on every call would give React a "new" value each render even
 * when nothing changed, which zustand's snapshot caching sees as a perpetual update and loops on. */
const EMPTY_ENTRIES: WorkingSetEntry[] = []

/**
 * Save/load section for a single tab's whole working set of units — same "add pieces, then save
 * the whole thing as one named entity" flow as Marriage Planner's PlanManager/pairings, rather
 * than each save being scoped to a single character. `data` is the CURRENTLY displayed unit's
 * live snapshot; `onLoadEntry` switches the tab's active unit + restores that entry's data (the
 * caller owns which unit is "selected" — see SkillPlanner/UnitPlanner's own load handlers).
 */
export function BuildSetManager({
  tab,
  route,
  character,
  data,
  onLoadEntry,
  onSwitchRoute,
}: {
  tab: BuildTab
  route: Route
  character: { id: string; name: string } | undefined
  data: Record<string, unknown>
  onLoadEntry: (entry: WorkingSetEntry) => void
  /** Saved sets remember which route they were saved under — loading one for a route other than
   * the one currently showing needs to switch the app over to it first, or the set you just loaded
   * would land in a different route's bucket than the one you're looking at. */
  onSwitchRoute: (route: Route) => void
}) {
  // Only this route's own bucket — the working set for every OTHER route still exists underneath
  // (see the store's own comment), it's just not what's shown or editable right now.
  const workingSet = useSavedBuildsStore((state) => state.workingSets[tab][route] ?? EMPTY_ENTRIES)
  const addToWorkingSet = useSavedBuildsStore((state) => state.addToWorkingSet)
  const removeFromWorkingSet = useSavedBuildsStore((state) => state.removeFromWorkingSet)
  const allBuildSets = useSavedBuildsStore((state) => state.buildSets)
  const activeBuildSetId = useSavedBuildsStore((state) => state.activeBuildSetId)
  const saveWorkingSetAsBuildSet = useSavedBuildsStore((state) => state.saveWorkingSetAsBuildSet)
  const loadBuildSet = useSavedBuildsStore((state) => state.loadBuildSet)
  const deleteBuildSet = useSavedBuildsStore((state) => state.deleteBuildSet)
  const renameBuildSet = useSavedBuildsStore((state) => state.renameBuildSet)

  const [nameInput, setNameInput] = useState('')

  const buildSets = allBuildSets.filter((b) => b.tab === tab)
  const activeBuildSet = buildSets.find((b) => b.id === activeBuildSetId)
  const alreadyInSet = character ? workingSet.some((e) => e.characterId === character.id) : false

  // Checked against the CURRENT live data too (substituted in for that character's own stored
  // entry, if any), not just what's already been added — so the warning shows up immediately
  // while picking a spouse above, the same way Marriage Planner warns before you even click "Add
  // to plan", rather than only after a conflicting pick has already been saved into the set. Only
  // ever compared within this one route's bucket — a unit from another route's bucket couldn't
  // really be sharing a spouse anyway, since they're never in the same playthrough together.
  const spouseField = SPOUSE_FIELD_BY_TAB[tab]
  const entriesForConflictCheck: WorkingSetEntry[] = character
    ? [
        ...workingSet.filter((e) => e.characterId !== character.id),
        { characterId: character.id, characterName: character.name, data },
      ]
    : workingSet
  const spouseConflictsById = new Map<string, WorkingSetEntry[]>()
  for (const entry of entriesForConflictCheck) {
    const spouseId = entry.data[spouseField]
    if (typeof spouseId !== 'string' || !spouseId) continue
    const list = spouseConflictsById.get(spouseId) ?? []
    list.push(entry)
    spouseConflictsById.set(spouseId, list)
  }
  const spouseConflicts = Array.from(spouseConflictsById.entries()).filter(([, entries]) => entries.length > 1)

  function handleAddCurrent() {
    if (!character) return
    addToWorkingSet(tab, route, character.id, character.name, data)
  }

  function handleSaveSet() {
    const name = nameInput.trim() || activeBuildSet?.name
    if (!name) return
    saveWorkingSetAsBuildSet(tab, route, name)
    setNameInput('')
  }

  function handleLoadSet(id: string) {
    const buildSet = loadBuildSet(id)
    if (!buildSet) return
    if (buildSet.route !== route) onSwitchRoute(buildSet.route)
    // Jump straight to viewing the first unit in the set — otherwise nothing visibly changes in
    // the main panel above until the user separately taps one of the entries below.
    if (buildSet.entries.length > 0) onLoadEntry(buildSet.entries[0])
  }

  return (
    <div className="space-y-4 rounded-lg border border-dashed border-neutral-800 bg-neutral-900/90 p-4">
      <div>
        <h3 className="text-base font-semibold text-neutral-100">Build Set</h3>
        <p className="text-xs text-neutral-500">
          Add each unit you want to plan into the set below, then save the whole set at once. Each
          route keeps its own set — switching routes above shows a different one.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleAddCurrent}
          disabled={!character}
          className="rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {alreadyInSet ? `Update ${character?.name} in set` : `Add ${character?.name ?? 'current unit'} to set`}
        </button>
      </div>

      {spouseConflicts.length > 0 && (
        <div className="space-y-1">
          {spouseConflicts.map(([spouseId, entries]) => {
            const names = entries.map((e) => e.characterName)
            const namesText =
              names.length === 2
                ? `both ${names[0]} and ${names[1]}`
                : `multiple units in this set: ${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`
            return (
              <p key={spouseId} className="text-sm text-amber-400">
                {charactersById[spouseId]?.name ?? spouseId} is set as the S-rank spouse for {namesText}.
              </p>
            )
          })}
        </div>
      )}

      {workingSet.length === 0 ? (
        <p className="text-sm text-neutral-500">No units in this set yet.</p>
      ) : (
        <ul className="space-y-2">
          {workingSet.map((entry) => (
            <li
              key={entry.characterId}
              className={`flex items-center justify-between gap-2 rounded-md border ${
                entry.characterId === character?.id
                  ? 'border-violet-500 bg-violet-950/40'
                  : 'border-neutral-800 bg-neutral-950'
              }`}
            >
              <button
                type="button"
                onClick={() => onLoadEntry(entry)}
                className="min-w-0 flex-1 px-3 py-2 text-left hover:bg-neutral-800/60"
                title="Tap to view/edit this unit"
              >
                <div className="truncate text-sm font-medium text-neutral-200">{entry.characterName}</div>
              </button>
              <button
                type="button"
                onClick={() => removeFromWorkingSet(tab, route, entry.characterId)}
                className="shrink-0 px-3 py-2 text-xs text-neutral-400 hover:text-red-400"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-3 border-t border-neutral-800 pt-3">
        <h4 className="text-sm font-semibold text-neutral-200">Saved Sets</h4>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder={activeBuildSet ? `Update "${activeBuildSet.name}"` : 'e.g. Birthright kids'}
            className="min-w-[200px] flex-1 rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-200"
          />
          <button
            type="button"
            onClick={handleSaveSet}
            disabled={workingSet.length === 0}
            title={workingSet.length === 0 ? 'Add at least one unit to the set above before saving' : undefined}
            className="rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {activeBuildSet ? 'Save As / Update' : 'Save Current Set'}
          </button>
        </div>

        {buildSets.length === 0 ? (
          <p className="text-sm text-neutral-500">No saved sets yet.</p>
        ) : (
          <ul className="space-y-2">
            {buildSets.map((buildSet) => (
              <li
                key={buildSet.id}
                className={`flex items-center justify-between gap-2 rounded-md border ${
                  buildSet.id === activeBuildSetId
                    ? 'border-violet-500 bg-violet-950/40'
                    : 'border-neutral-800 bg-neutral-950'
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleLoadSet(buildSet.id)}
                  className="min-w-0 flex-1 px-3 py-2 text-left hover:bg-neutral-800/60"
                  title="Tap to load this set"
                >
                  <div className="truncate text-sm font-medium text-neutral-200">{buildSet.name}</div>
                  <div className="text-xs text-neutral-500">
                    {buildSet.entries.length} unit{buildSet.entries.length === 1 ? '' : 's'} ·{' '}
                    {buildSet.route === 'all' ? 'All Routes' : buildSet.route}
                  </div>
                </button>
                <div className="flex shrink-0 gap-2 px-3 py-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      const next = window.prompt('Rename set', buildSet.name)
                      if (next && next.trim()) renameBuildSet(buildSet.id, next.trim())
                    }}
                    className="text-neutral-400 hover:text-neutral-200"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteBuildSet(buildSet.id)}
                    className="text-neutral-400 hover:text-red-400"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
