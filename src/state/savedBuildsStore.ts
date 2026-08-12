import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Route } from '../data/types'

export type BuildTab = 'skills' | 'unit'

export interface SavedBuild {
  id: string
  tab: BuildTab
  name: string
  /** Display-only — which character this build was for, at save time. */
  characterName: string
  route: Route
  /** Arbitrary snapshot of whichever tab saved it — SkillPlanner and UnitPlanner each define and
   * interpret their own shape (see the `data` object each builds/restores in its own component). */
  data: Record<string, unknown>
  updatedAt: number
}

interface SavedBuildsState {
  builds: SavedBuild[]
  activeBuildId: string | null
  /** Saves as a new build, unless a build with this exact tab+name is already the active one (then
   * updates it in place instead) — same "Save As / Update" convention as plannerStore's plans. */
  saveBuild: (tab: BuildTab, name: string, characterName: string, route: Route, data: Record<string, unknown>) => void
  loadBuild: (id: string) => SavedBuild | undefined
  deleteBuild: (id: string) => void
  renameBuild: (id: string, name: string) => void
  clearActiveBuild: () => void
}

export const useSavedBuildsStore = create<SavedBuildsState>()(
  persist(
    (set, get) => ({
      builds: [],
      activeBuildId: null,
      saveBuild: (tab, name, characterName, route, data) => {
        const { activeBuildId, builds } = get()
        const existing = activeBuildId ? builds.find((b) => b.id === activeBuildId) : undefined
        if (existing && existing.tab === tab && existing.name === name) {
          set({
            builds: builds.map((b) =>
              b.id === existing.id ? { ...b, characterName, route, data, updatedAt: Date.now() } : b,
            ),
          })
          return
        }
        const newBuild: SavedBuild = {
          id: crypto.randomUUID(),
          tab,
          name,
          characterName,
          route,
          data,
          updatedAt: Date.now(),
        }
        set({ builds: [...builds, newBuild], activeBuildId: newBuild.id })
      },
      loadBuild: (id) => {
        const build = get().builds.find((b) => b.id === id)
        if (!build) return undefined
        set({ activeBuildId: build.id })
        return build
      },
      deleteBuild: (id) =>
        set((state) => ({
          builds: state.builds.filter((b) => b.id !== id),
          activeBuildId: state.activeBuildId === id ? null : state.activeBuildId,
        })),
      renameBuild: (id, name) =>
        set((state) => ({
          builds: state.builds.map((b) => (b.id === id ? { ...b, name } : b)),
        })),
      clearActiveBuild: () => set({ activeBuildId: null }),
    }),
    { name: 'fates-planner-saved-builds' },
  ),
)
