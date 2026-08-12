import { getAllAssetEntries, putAllAssetEntries } from '../data/assetStorage'

const LOCAL_STORAGE_PREFIX = 'fates-planner-'
const BACKUP_FORMAT_VERSION = 1

export interface BackupFile {
  formatVersion: number
  exportedAt: string
  /** Every localStorage key under the fates-planner- prefix (saved plans/builds, Corrin build and
   * appearance, hair-source picks, icon crop/palette settings) — a plain prefix scan rather than a
   * hand-maintained list, so a newly-added store is picked up automatically without editing this file. */
  localStorage: Record<string, string>
  /** Uploaded skill/weapon icons, portraits, and hair references from Edit Mode (IndexedDB-backed —
   * see src/data/assetStorage.ts). Can make the export sizeable if a lot of images were uploaded. */
  assets: Record<string, string>
}

function collectLocalStorage(): Record<string, string> {
  const entries: Record<string, string> = {}
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i)
    if (!key || !key.startsWith(LOCAL_STORAGE_PREFIX)) continue
    const value = window.localStorage.getItem(key)
    if (value !== null) entries[key] = value
  }
  return entries
}

export async function buildBackup(): Promise<BackupFile> {
  return {
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    localStorage: collectLocalStorage(),
    assets: await getAllAssetEntries(),
  }
}

function isBackupFile(value: unknown): value is BackupFile {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return typeof v.formatVersion === 'number' && typeof v.localStorage === 'object' && v.localStorage !== null
}

/** Throws with a user-readable message on invalid/unparseable files — callers show it directly rather than a generic failure. */
export async function restoreBackup(file: File): Promise<void> {
  const text = await file.text()
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('That file is not valid JSON — is it actually a backup exported from this app?')
  }
  if (!isBackupFile(parsed)) {
    throw new Error('That file doesn\'t look like a Fates Unit Planner backup.')
  }
  for (const [key, value] of Object.entries(parsed.localStorage)) {
    if (key.startsWith(LOCAL_STORAGE_PREFIX)) window.localStorage.setItem(key, value)
  }
  if (parsed.assets && Object.keys(parsed.assets).length > 0) {
    await putAllAssetEntries(parsed.assets)
  }
}
