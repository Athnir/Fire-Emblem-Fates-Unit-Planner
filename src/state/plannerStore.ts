import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Route } from '../data/types'

export interface Pairing {
  characterAId: string
  characterBId: string
}

export interface SavedPlan {
  id: string
  name: string
  route: Route
  pairings: Pairing[]
  updatedAt: number
}

interface PlannerState {
  activeRoute: Route
  pairings: Pairing[]
  editModeEnabled: boolean
  plans: SavedPlan[]
  activePlanId: string | null
  setActiveRoute: (route: Route) => void
  addPairing: (pairing: Pairing) => void
  removePairing: (characterAId: string, characterBId: string) => void
  toggleEditMode: () => void
  clearPairings: () => void
  saveCurrentAsPlan: (name: string) => void
  loadPlan: (id: string) => void
  deletePlan: (id: string) => void
  renamePlan: (id: string, name: string) => void
}

/** A character can only be assigned to one pairing slot at a time within a plan. */
export function isCharacterAssigned(pairings: Pairing[], characterId: string): boolean {
  return pairings.some((p) => p.characterAId === characterId || p.characterBId === characterId)
}

export const usePlannerStore = create<PlannerState>()(
  persist(
    (set, get) => ({
      activeRoute: 'Revelation',
      pairings: [],
      editModeEnabled: false,
      plans: [],
      activePlanId: null,
      // Switching route mid-build clears the in-progress (unsaved) pairings — Birthright and Conquest
      // pairings can never coexist in one playthrough, so anything staged for the old route is no
      // longer valid once the route changes. loadPlan (below) sets activeRoute directly in its own
      // atomic update instead of going through this action, so restoring a saved plan's own route
      // and pairings together is unaffected by this clear.
      setActiveRoute: (route) =>
        set((state) => (state.activeRoute === route ? state : { activeRoute: route, pairings: [], activePlanId: null })),
      addPairing: (pairing) => set((state) => ({ pairings: [...state.pairings, pairing] })),
      removePairing: (characterAId, characterBId) =>
        set((state) => ({
          pairings: state.pairings.filter(
            (p) => !(p.characterAId === characterAId && p.characterBId === characterBId),
          ),
        })),
      toggleEditMode: () => set((state) => ({ editModeEnabled: !state.editModeEnabled })),
      clearPairings: () => set({ pairings: [], activePlanId: null }),
      saveCurrentAsPlan: (name) => {
        const { activePlanId, plans, activeRoute, pairings } = get()
        const existing = activePlanId ? plans.find((p) => p.id === activePlanId) : undefined
        if (existing && existing.name === name) {
          set({
            plans: plans.map((p) =>
              p.id === existing.id ? { ...p, route: activeRoute, pairings, updatedAt: Date.now() } : p,
            ),
          })
          return
        }
        const newPlan: SavedPlan = {
          id: crypto.randomUUID(),
          name,
          route: activeRoute,
          pairings,
          updatedAt: Date.now(),
        }
        set({ plans: [...plans, newPlan], activePlanId: newPlan.id })
      },
      loadPlan: (id) => {
        const plan = get().plans.find((p) => p.id === id)
        if (!plan) return
        set({ activeRoute: plan.route, pairings: plan.pairings, activePlanId: plan.id })
      },
      deletePlan: (id) =>
        set((state) => ({
          plans: state.plans.filter((p) => p.id !== id),
          activePlanId: state.activePlanId === id ? null : state.activePlanId,
        })),
      renamePlan: (id, name) =>
        set((state) => ({
          plans: state.plans.map((p) => (p.id === id ? { ...p, name } : p)),
        })),
    }),
    { name: 'fates-planner-active-plan' },
  ),
)
