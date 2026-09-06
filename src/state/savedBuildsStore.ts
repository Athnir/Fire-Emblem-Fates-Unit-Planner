import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Route } from '../data/types'

export type BuildTab = 'skills' | 'unit'

export interface WorkingSetEntry {
  characterId: string
  /** Display-only — which character this entry was for, at add time. */
  characterName: string
  /** Arbitrary snapshot of whichever tab added it — SkillPlanner and UnitPlanner each define and
   * interpret their own shape (see the `data` object each builds/restores in its own component). */
  data: Record<string, unknown>
}

export interface BuildSet {
  id: string
  tab: BuildTab
  name: string
  route: Route
  entries: WorkingSetEntry[]
  updatedAt: number
}

type WorkingSetsByRoute = Partial<Record<Route, WorkingSetEntry[]>>

interface SavedBuildsState {
  /** One working set per tab PER ROUTE, not one shared across all of them — switching the active
   * route swaps in a different bucket instead of mixing them together, so a set can never end up
   * holding two units that could never coexist in one playthrough (e.g. a unit only reachable on
   * Birthright next to one only reachable on Conquest). Nothing is lost switching away and back:
   * each route's bucket keeps whatever was added to it and reappears exactly as left — up to 3
   * independent in-progress sets per tab, only one visible/editable at a time. Mirrors
   * plannerStore's `pairings`: built up one unit at a time via addToWorkingSet, then saved as a
   * single named BuildSet — the same "add pieces, then save the whole set" flow Marriage Planner
   * uses for Plans, rather than each save being scoped to one character. */
  workingSets: Record<BuildTab, WorkingSetsByRoute>
  buildSets: BuildSet[]
  activeBuildSetId: string | null
  /** Adds the given character as a new entry in that route's bucket, or overwrites its existing
   * entry there if already present (a unit can only occupy one slot in a bucket at a time — same
   * convention as isCharacterAssigned for pairings, just per-character instead of per-pairing). */
  addToWorkingSet: (
    tab: BuildTab,
    route: Route,
    characterId: string,
    characterName: string,
    data: Record<string, unknown>,
  ) => void
  removeFromWorkingSet: (tab: BuildTab, route: Route, characterId: string) => void
  /** Saves the given route's bucket as a new BuildSet, unless one with this exact tab+name is
   * already the active one (then updates it in place instead) — same "Save As / Update" convention
   * as plannerStore's plans. */
  saveWorkingSetAsBuildSet: (tab: BuildTab, route: Route, name: string) => void
  loadBuildSet: (id: string) => BuildSet | undefined
  deleteBuildSet: (id: string) => void
  renameBuildSet: (id: string, name: string) => void
}

export const useSavedBuildsStore = create<SavedBuildsState>()(
  persist(
    (set, get) => ({
      workingSets: { skills: {}, unit: {} },
      buildSets: [],
      activeBuildSetId: null,
      addToWorkingSet: (tab, route, characterId, characterName, data) =>
        set((state) => {
          const current = state.workingSets[tab][route] ?? []
          const idx = current.findIndex((e) => e.characterId === characterId)
          const entry: WorkingSetEntry = { characterId, characterName, data }
          const next = idx >= 0 ? current.map((e, i) => (i === idx ? entry : e)) : [...current, entry]
          return { workingSets: { ...state.workingSets, [tab]: { ...state.workingSets[tab], [route]: next } } }
        }),
      removeFromWorkingSet: (tab, route, characterId) =>
        set((state) => ({
          workingSets: {
            ...state.workingSets,
            [tab]: {
              ...state.workingSets[tab],
              [route]: (state.workingSets[tab][route] ?? []).filter((e) => e.characterId !== characterId),
            },
          },
        })),
      saveWorkingSetAsBuildSet: (tab, route, name) => {
        const { activeBuildSetId, buildSets, workingSets } = get()
        const entries = workingSets[tab][route] ?? []
        const existing = activeBuildSetId ? buildSets.find((b) => b.id === activeBuildSetId) : undefined
        // Saving always empties this route's bucket back out afterward — the snapshot just taken is
        // safe in `entries` above either way, and a clean bucket means the NEXT thing you build here
        // starts fresh instead of silently piling onto (or, worse, overwriting) what was just saved.
        // activeBuildSetId resets too, so an immediate re-save with a blank name starts a new set
        // rather than re-targeting the one you just finished with. Bringing a saved set back to edit
        // is still just a click away in the Saved Sets list (loadBuildSet re-populates the bucket and
        // sets activeBuildSetId again).
        const clearedWorkingSets = { ...workingSets, [tab]: { ...workingSets[tab], [route]: [] } }
        if (existing && existing.tab === tab && existing.name === name) {
          set({
            buildSets: buildSets.map((b) =>
              b.id === existing.id ? { ...b, route, entries, updatedAt: Date.now() } : b,
            ),
            workingSets: clearedWorkingSets,
            activeBuildSetId: null,
          })
          return
        }
        const newSet: BuildSet = {
          id: crypto.randomUUID(),
          tab,
          name,
          route,
          entries,
          updatedAt: Date.now(),
        }
        set({ buildSets: [...buildSets, newSet], workingSets: clearedWorkingSets, activeBuildSetId: null })
      },
      loadBuildSet: (id) => {
        const buildSet = get().buildSets.find((b) => b.id === id)
        if (!buildSet) return undefined
        set((state) => ({
          workingSets: {
            ...state.workingSets,
            [buildSet.tab]: { ...state.workingSets[buildSet.tab], [buildSet.route]: buildSet.entries },
          },
          activeBuildSetId: buildSet.id,
        }))
        return buildSet
      },
      deleteBuildSet: (id) =>
        set((state) => ({
          buildSets: state.buildSets.filter((b) => b.id !== id),
          activeBuildSetId: state.activeBuildSetId === id ? null : state.activeBuildSetId,
        })),
      renameBuildSet: (id, name) =>
        set((state) => ({
          buildSets: state.buildSets.map((b) => (b.id === id ? { ...b, name } : b)),
        })),
    }),
    {
      name: 'fates-planner-build-sets',
      version: 1,
      // v0 kept one flat entry array per tab (no per-route split) — some entries from partway
      // through v1's development even carry a leftover `route` field of their own. Bucket each
      // legacy entry under whatever route it already remembers; anything with no route recorded
      // falls back to whatever route was actually active last (read straight from plannerStore's
      // own persisted state, since this store has no access to that one at migration time), so nothing
      // that was already there just vanishes.
      migrate: (persistedState, version) => {
        if (version >= 1) return persistedState as SavedBuildsState
        const old = persistedState as {
          workingSets?: Record<string, (WorkingSetEntry & { route?: Route })[]>
          buildSets?: BuildSet[]
          activeBuildSetId?: string | null
        }
        let fallbackRoute: Route = 'Revelation'
        try {
          const rawPlanner = localStorage.getItem('fates-planner-active-plan')
          const parsedRoute = rawPlanner ? JSON.parse(rawPlanner)?.state?.activeRoute : undefined
          if (typeof parsedRoute === 'string') fallbackRoute = parsedRoute as Route
        } catch {
          // Malformed/missing planner storage — keep the default fallback above.
        }
        const migratedWorkingSets: Record<BuildTab, WorkingSetsByRoute> = { skills: {}, unit: {} }
        for (const tab of ['skills', 'unit'] as BuildTab[]) {
          const legacyEntries = old.workingSets?.[tab]
          if (!Array.isArray(legacyEntries)) continue
          for (const legacyEntry of legacyEntries) {
            const route = legacyEntry.route ?? fallbackRoute
            const bucket = migratedWorkingSets[tab][route] ?? []
            bucket.push({
              characterId: legacyEntry.characterId,
              characterName: legacyEntry.characterName,
              data: legacyEntry.data,
            })
            migratedWorkingSets[tab][route] = bucket
          }
        }
        return {
          workingSets: migratedWorkingSets,
          buildSets: old.buildSets ?? [],
          activeBuildSetId: old.activeBuildSetId ?? null,
        }
      },
    },
  ),
)
