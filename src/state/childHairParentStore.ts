import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Which real parent the player has picked as a given dynamic-hair child's hair source, for the
 * Roster tab's portrait (a quick-reference choice, independent of any actual pairing set up in the
 * Marriage/Unit Planner — this is just "what does this child's hair look like", not a real pairing
 * commitment). Keyed by childId -> characterId of the chosen parent.
 */
interface ChildHairParentState {
  selections: Record<string, string>
  setParent: (childId: string, parentId: string) => void
  clearParent: (childId: string) => void
}

export const useChildHairParentStore = create<ChildHairParentState>()(
  persist(
    (set) => ({
      selections: {},
      setParent: (childId, parentId) =>
        set((state) => ({ selections: { ...state.selections, [childId]: parentId } })),
      clearParent: (childId) =>
        set((state) => {
          const next = { ...state.selections }
          delete next[childId]
          return { selections: next }
        }),
    }),
    { name: 'fates-planner-child-hair-parent' },
  ),
)
