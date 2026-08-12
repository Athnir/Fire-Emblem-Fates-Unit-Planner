import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { StatBlock } from '../data/types'

export type StatKey = keyof StatBlock

export interface CorrinBuild {
  boon: StatKey | null
  bane: StatKey | null
  talentClass: string | null
}

export const DEFAULT_CORRIN_BUILD: CorrinBuild = { boon: null, bane: null, talentClass: null }

interface CorrinBuildState {
  /** Only one Corrin exists per playthrough, so male/female Corrin share a single build. */
  build: CorrinBuild
  setBoon: (stat: StatKey | null) => void
  setBane: (stat: StatKey | null) => void
  setTalent: (talentClass: string | null) => void
}

export const useCorrinBuildStore = create<CorrinBuildState>()(
  persist(
    (set) => ({
      build: DEFAULT_CORRIN_BUILD,
      setBoon: (stat) => set((state) => ({ build: { ...state.build, boon: stat } })),
      setBane: (stat) => set((state) => ({ build: { ...state.build, bane: stat } })),
      setTalent: (talentClass) => set((state) => ({ build: { ...state.build, talentClass } })),
    }),
    { name: 'fates-planner-corrin-build' },
  ),
)
