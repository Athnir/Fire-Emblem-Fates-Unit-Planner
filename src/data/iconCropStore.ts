/** Crop/zoom metadata for uploaded icons — tiny JSON, so localStorage is enough (no IndexedDB round-trip). */

export interface IconCrop {
  /** Percentage-based position, e.g. {x:50,y:30} — maps directly to CSS object-position. */
  x: number
  y: number
  /** 1.0 = fit, >1 = zoomed in. */
  zoom: number
}

const STORAGE_KEY = 'fates-planner-icon-crops'

function readAll(): Record<string, IconCrop> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function getIconCrop(key: string): IconCrop {
  return readAll()[key] ?? { x: 50, y: 50, zoom: 1 }
}

export function setIconCrop(key: string, crop: IconCrop): void {
  const all = readAll()
  all[key] = crop
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}

export function deleteIconCrop(key: string): void {
  const all = readAll()
  delete all[key]
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}
