/**
 * The 30 hair colors selectable for Corrin (both sexes) in-game — row-major, 10 columns x 3 rows,
 * matching the picker's own grid layout. Pulled directly from the game's own data: a 30-entry
 * RGBA array (alpha always 0xFF, 4 bytes/entry) found at a fixed offset inside the decompressed
 * `GameData/MyUnitEdit.bin.lz` ("My Unit" = Corrin's character-creator screen). Confirmed genuine
 * two ways: the values land within a few RGB units of the previous screenshot-sampled palette
 * (itself checked against every adult's `adultHairHex` — Azura, Flora, Hana, Kaden, Kagero, Kaze,
 * Ryoma, and Shura are all clearly outside this set, confirming Corrin has a dedicated picker, not
 * a cast-wide palette), and an independently-sourced hex table turned up later with an identical
 * 30-color section.
 */
export const CORRIN_HAIR_PALETTE: string[] = [
  '#f6f4ef', '#c35855', '#d38969', '#eddbc5', '#abd1a1', '#7dbbc4', '#92add0', '#c8a2d6', '#fedada', '#c0aa9c',
  '#a5a6a6', '#9b4444', '#99634c', '#cfc3a1', '#6f845f', '#3c7986', '#4c5f78', '#82678c', '#eeb1b1', '#837267',
  '#5b5855', '#e85d64', '#f59d71', '#e8db98', '#8ed484', '#86e1dc', '#4d81b5', '#af81d5', '#f497af', '#6e4f3b',
]

/** Row 1, column 4 — just an arbitrary starting pick, not a confirmed in-game default: the arrow
 * seen in reference screenshots marks wherever the cursor/current selection happens to be, not a
 * documented default swatch. */
export const CORRIN_DEFAULT_HAIR_HEX = CORRIN_HAIR_PALETTE[3]
