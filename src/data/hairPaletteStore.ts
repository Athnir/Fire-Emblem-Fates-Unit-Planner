/** Confirmed hair palettes per character id — small hex-string arrays, so localStorage suffices. */

const STORAGE_KEY = 'fates-planner-hair-palettes'

function readAll(): Record<string, string[]> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function getHairPalette(characterId: string): string[] | undefined {
  return readAll()[characterId]
}

export function setHairPalette(characterId: string, palette: string[]): void {
  const all = readAll()
  all[characterId] = palette
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}

export function deleteHairPalette(characterId: string): void {
  const all = readAll()
  delete all[characterId]
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}
