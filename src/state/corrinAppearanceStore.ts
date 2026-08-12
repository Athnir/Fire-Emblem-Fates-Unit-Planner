import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CORRIN_DEFAULT_HAIR_HEX } from '../data/corrinHairPalette'

export type CorrinHeight = 'short' | 'tall'

export interface CorrinAppearance {
  height: CorrinHeight
  hairstyle: string
  hairHex: string
}

/** The in-game picker's own default swatch (see corrinHairPalette.ts) — still just a starting
 * point, since it's entirely player-chosen at game start. Override freely per corrin_m/corrin_f. */
export const DEFAULT_CORRIN_APPEARANCE: CorrinAppearance = {
  height: 'tall',
  hairstyle: 'style1',
  hairHex: CORRIN_DEFAULT_HAIR_HEX,
}

interface CorrinAppearanceState {
  /** Keyed by corrin_m / corrin_f — each has its own independent look, since both list entries can
   * be previewed in Roster regardless of which gender the player actually picked in-game. */
  appearances: Record<string, CorrinAppearance>
  setHeight: (id: string, height: CorrinHeight) => void
  setHairstyle: (id: string, hairstyle: string) => void
  setHairHex: (id: string, hex: string) => void
}

function updateAppearance(
  appearances: Record<string, CorrinAppearance>,
  id: string,
  patch: Partial<CorrinAppearance>,
): Record<string, CorrinAppearance> {
  return { ...appearances, [id]: { ...DEFAULT_CORRIN_APPEARANCE, ...appearances[id], ...patch } }
}

export const useCorrinAppearanceStore = create<CorrinAppearanceState>()(
  persist(
    (set) => ({
      appearances: {},
      setHeight: (id, height) => set((state) => ({ appearances: updateAppearance(state.appearances, id, { height }) })),
      setHairstyle: (id, hairstyle) =>
        set((state) => ({ appearances: updateAppearance(state.appearances, id, { hairstyle }) })),
      setHairHex: (id, hairHex) => set((state) => ({ appearances: updateAppearance(state.appearances, id, { hairHex }) })),
    }),
    { name: 'fates-planner-corrin-appearance' },
  ),
)

export function getCorrinAppearance(appearances: Record<string, CorrinAppearance>, id: string): CorrinAppearance {
  return appearances[id] ?? DEFAULT_CORRIN_APPEARANCE
}
