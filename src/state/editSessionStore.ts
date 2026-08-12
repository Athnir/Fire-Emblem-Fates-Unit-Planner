import { create } from 'zustand'

/**
 * Tracks in-progress Edit Mode changes so EditModeToggle can ask "keep or discard?" when the user
 * turns Edit Mode off, instead of every icon/hair-reference save being silently permanent. Each
 * revert function restores ONE asset key back to whatever it was before this edit session started
 * — only the first change to a given key registers a revert fn, so repeated edits to the same icon
 * within one session still roll all the way back to the pre-session state on discard, not just the
 * most recent edit. Not persisted — a fresh page load has no "session" to speak of.
 */
interface EditSessionState {
  revertFns: Record<string, () => Promise<void> | void>
  /** Bumped after a discard so every AssetIcon/hair-palette reader re-fetches from storage. */
  assetEpoch: number
  recordChange: (key: string, revert: () => Promise<void> | void) => void
  discardAll: () => Promise<void>
  clearSession: () => void
}

export const useEditSessionStore = create<EditSessionState>((set, get) => ({
  revertFns: {},
  assetEpoch: 0,
  recordChange: (key, revert) =>
    set((state) => (key in state.revertFns ? state : { revertFns: { ...state.revertFns, [key]: revert } })),
  discardAll: async () => {
    const { revertFns } = get()
    for (const revert of Object.values(revertFns)) {
      await revert()
    }
    set((state) => ({ revertFns: {}, assetEpoch: state.assetEpoch + 1 }))
  },
  clearSession: () => set({ revertFns: {} }),
}))
