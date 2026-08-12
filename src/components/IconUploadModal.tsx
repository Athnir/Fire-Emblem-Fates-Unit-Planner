import { useEffect, useState } from 'react'
import type { AssetIconType } from './AssetIcon'
import { assetKeys, deleteAsset, fileToDataUrl, getAsset, setAsset } from '../data/assetStorage'
import { deleteIconCrop, getIconCrop, setIconCrop, type IconCrop } from '../data/iconCropStore'
import { useEditSessionStore } from '../state/editSessionStore'

interface Props {
  type: AssetIconType
  iconId: string
  label?: string
  onClose: () => void
  onSaved: () => void
}

function keyFor(type: AssetIconType, iconId: string): string {
  return type === 'skill' ? assetKeys.skillIcon(iconId) : assetKeys.weaponIcon(iconId)
}

/**
 * Reposition/zoom step before an upload is saved (per icon-asset-slotting spec section 5.3) —
 * nothing is written to storage until the user explicitly confirms, so a stray tap can't
 * overwrite an existing icon on its own. Uses sliders rather than freeform drag for the crop
 * position: same functional outcome (setting x/y/zoom), simpler and equally mouse/touch-friendly.
 */
export function IconUploadModal({ type, iconId, label, onClose, onSaved }: Props) {
  const key = keyFor(type, iconId)
  const recordChange = useEditSessionStore((state) => state.recordChange)
  const [preview, setPreview] = useState<string | undefined>(undefined)
  const [crop, setCrop] = useState<IconCrop>(getIconCrop(key))
  const [existingDataUrl, setExistingDataUrl] = useState<string | undefined>(undefined)
  const shapeClass = type === 'skill' ? 'rounded-full' : 'rounded-md'

  // Snapshot whatever's already saved for this key, once, so Clear/Save can offer an accurate
  // "revert to this" target if the user discards their whole Edit Mode session later.
  useEffect(() => {
    let cancelled = false
    getAsset(key).then((url) => {
      if (!cancelled) setExistingDataUrl(url)
    })
    return () => {
      cancelled = true
    }
  }, [key])

  function revertToPreEditState() {
    const prevDataUrl = existingDataUrl
    const prevCrop = getIconCrop(key)
    return async () => {
      if (prevDataUrl) {
        await setAsset(key, prevDataUrl)
        setIconCrop(key, prevCrop)
      } else {
        await deleteAsset(key)
        deleteIconCrop(key)
      }
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const dataUrl = await fileToDataUrl(file)
    setPreview(dataUrl)
    setCrop({ x: 50, y: 50, zoom: 1 })
  }

  async function handleConfirm() {
    if (!preview) return
    recordChange(key, revertToPreEditState())
    await setAsset(key, preview)
    setIconCrop(key, crop)
    onSaved()
  }

  async function handleClear() {
    recordChange(key, revertToPreEditState())
    await deleteAsset(key)
    deleteIconCrop(key)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm space-y-4 rounded-lg border border-neutral-700 bg-neutral-900 p-5">
        <h3 className="text-base font-semibold text-neutral-100">
          {label ?? iconId} — {type === 'skill' ? 'skill' : 'weapon'} icon
        </h3>

        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="block w-full text-sm text-neutral-300 file:mr-3 file:rounded-md file:border-0 file:bg-neutral-800 file:px-3 file:py-1.5 file:text-neutral-200"
        />

        {preview && (
          <>
            <div className="flex justify-center">
              <div
                className={`h-32 w-32 overflow-hidden border border-neutral-700 ${shapeClass}`}
              >
                <img
                  src={preview}
                  alt="preview"
                  className="h-full w-full object-cover"
                  style={{ objectPosition: `${crop.x}% ${crop.y}%`, transform: `scale(${crop.zoom})` }}
                />
              </div>
            </div>

            <label className="block text-xs text-neutral-400">
              Horizontal position
              <input
                type="range"
                min={0}
                max={100}
                value={crop.x}
                onChange={(e) => setCrop({ ...crop, x: Number(e.target.value) })}
                className="w-full"
              />
            </label>
            <label className="block text-xs text-neutral-400">
              Vertical position
              <input
                type="range"
                min={0}
                max={100}
                value={crop.y}
                onChange={(e) => setCrop({ ...crop, y: Number(e.target.value) })}
                className="w-full"
              />
            </label>
            <label className="block text-xs text-neutral-400">
              Zoom
              <input
                type="range"
                min={100}
                max={250}
                value={crop.zoom * 100}
                onChange={(e) => setCrop({ ...crop, zoom: Number(e.target.value) / 100 })}
                className="w-full"
              />
            </label>
          </>
        )}

        <div className="flex items-center justify-between gap-2">
          {existingDataUrl ? (
            <button
              type="button"
              onClick={handleClear}
              className="rounded-md px-3 py-1.5 text-sm text-red-400 hover:text-red-300"
            >
              Clear image
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-3 py-1.5 text-sm text-neutral-400 hover:text-neutral-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!preview}
              className="rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
