/**
 * Shared IndexedDB-backed store for user-uploaded images (skill/weapon icons, hair reference
 * photos, character portraits). Everything stays local — no upload to any server, per the
 * "no backend" approach in the main build plan. Small metadata (palettes, crop settings) lives in
 * localStorage instead since it's tiny JSON, not worth the async IndexedDB round-trip.
 */

const DB_NAME = 'fates-planner-assets'
const STORE_NAME = 'assets'
const DB_VERSION = 1

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function getAsset(key: string): Promise<string | undefined> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const request = tx.objectStore(STORE_NAME).get(key)
    request.onsuccess = () => resolve(request.result as string | undefined)
    request.onerror = () => reject(request.error)
  })
}

export async function setAsset(key: string, dataUrl: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(dataUrl, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function deleteAsset(key: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/** Every stored asset as {key: dataUrl} — used by the backup export/import feature (src/logic/backup.ts) to round-trip uploaded images alongside the plain localStorage data. */
export async function getAllAssetEntries(): Promise<Record<string, string>> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const keysRequest = store.getAllKeys()
    const valuesRequest = store.getAll()
    tx.oncomplete = () => {
      const keys = keysRequest.result as string[]
      const values = valuesRequest.result as string[]
      const entries: Record<string, string> = {}
      keys.forEach((key, i) => { entries[key] = values[i] })
      resolve(entries)
    }
    tx.onerror = () => reject(tx.error)
  })
}

/** Restores a set of {key: dataUrl} entries in one transaction — the import half of getAllAssetEntries. */
export async function putAllAssetEntries(entries: Record<string, string>): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    for (const [key, value] of Object.entries(entries)) store.put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export const assetKeys = {
  skillIcon: (skillId: string) => `icon:skill:${skillId}`,
  weaponIcon: (weaponId: string) => `icon:weapon:${weaponId}`,
  portrait: (characterId: string) => `portrait:${characterId}`,
  hairReference: (characterId: string) => `hair-reference:${characterId}`,
}
