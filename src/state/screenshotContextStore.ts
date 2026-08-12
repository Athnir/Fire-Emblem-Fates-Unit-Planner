import { create } from 'zustand'

/**
 * Whichever character is "the unit" for screenshot-naming purposes on the currently active tab —
 * each tab component syncs its own selected-character state in here via a useEffect, since that
 * selection lives as local state private to each tab and ExportImageButton (in the shared header)
 * has no other way to see it. Not persisted — it's only ever read within the same session.
 */
interface ScreenshotContextState {
  unitLabel: string
  setUnitLabel: (label: string) => void
}

export const useScreenshotContextStore = create<ScreenshotContextState>((set) => ({
  unitLabel: '',
  setUnitLabel: (label) => set({ unitLabel: label }),
}))
