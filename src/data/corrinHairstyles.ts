export interface CorrinHairstyle {
  id: string
  name: string
}

/**
 * Corrin has 12 selectable hairstyles per body model in-game (unlike every other character, who
 * has exactly one) — ids match the `hair/style<N>.png` filename under each body model's folder
 * (see ART_ASSETS.md and scripts/batch_import_corrin.py, which extracted all 12 from the game's
 * own 髪0–髪11 hair textures). No official in-game names are exposed for these, so they're just
 * numbered.
 */
export const CORRIN_HAIRSTYLES: CorrinHairstyle[] = Array.from({ length: 12 }, (_, i) => ({
  id: `style${i + 1}`,
  name: `Hairstyle ${i + 1}`,
}))
