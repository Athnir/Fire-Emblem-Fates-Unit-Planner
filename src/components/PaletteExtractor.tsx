import { useRef, useState } from 'react'
import { extractHairPalette } from '../logic/hairPaletteSwap'
import { deleteHairPalette, getHairPalette, setHairPalette } from '../data/hairPaletteStore'
import { useEditSessionStore } from '../state/editSessionStore'

interface Props {
  characterId: string
  characterName: string
  onClose: () => void
  onSaved: () => void
}

/**
 * Upload a hair reference image -> auto-extract a palette via k-means clustering -> confirm/adjust
 * each swatch -> save against the character's id. The confirm/adjust step matters because
 * auto-detection won't be 100% reliable on every image (background/skin tones can get picked up
 * as false positives), per the build spec.
 */
export function PaletteExtractor({ characterId, characterName, onClose, onSaved }: Props) {
  const recordChange = useEditSessionStore((state) => state.recordChange)
  const sessionKey = `hairPalette:${characterId}`
  // Captured once per modal-open — the true pre-edit value, used both for the revert-on-discard
  // snapshot and to decide whether "Clear" should even show.
  const [originalPalette] = useState<string[] | undefined>(() => getHairPalette(characterId))
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | undefined>(undefined)
  const [palette, setPalette] = useState<string[]>(originalPalette ?? [])
  const [error, setError] = useState<string | undefined>(undefined)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  function revertToPreEditState() {
    return () => {
      if (originalPalette) setHairPalette(characterId, originalPalette)
      else deleteHairPalette(characterId)
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(undefined)

    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(img, 0, 0)
      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const extracted = extractHairPalette(imageData, 4)
        setPalette(extracted)
        setImagePreviewUrl(url)
      } catch {
        setError('Could not read this image (it may be from a different origin).')
      }
    }
    img.src = url
  }

  function updateSwatch(index: number, hex: string) {
    setPalette((prev) => prev.map((c, i) => (i === index ? hex : c)))
  }

  function handleSave() {
    if (palette.length === 0) return
    recordChange(sessionKey, revertToPreEditState())
    setHairPalette(characterId, palette)
    onSaved()
  }

  function handleClear() {
    recordChange(sessionKey, revertToPreEditState())
    deleteHairPalette(characterId)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm space-y-4 rounded-lg border border-neutral-700 bg-neutral-900 p-5">
        <h3 className="text-base font-semibold text-neutral-100">Hair reference — {characterName}</h3>
        <p className="text-xs text-neutral-500">
          Upload a portrait or a crop of just the hair. We'll detect the dominant shades
          automatically — tweak any swatch that looks wrong before saving.
        </p>

        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="block w-full text-sm text-neutral-300 file:mr-3 file:rounded-md file:border-0 file:bg-neutral-800 file:px-3 file:py-1.5 file:text-neutral-200"
        />
        <canvas ref={canvasRef} className="hidden" />

        {error && <p className="text-sm text-red-400">{error}</p>}

        {imagePreviewUrl && (
          <img src={imagePreviewUrl} alt="reference" className="mx-auto h-24 w-24 rounded-md object-cover" />
        )}

        {palette.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Detected shades (base → shadow → highlight)
            </p>
            <div className="flex gap-2">
              {palette.map((hex, i) => (
                <label key={i} className="flex flex-col items-center gap-1">
                  <input
                    type="color"
                    value={hex}
                    onChange={(e) => updateSwatch(i, e.target.value)}
                    className="h-10 w-10 cursor-pointer rounded border border-neutral-700 bg-transparent"
                  />
                  <span className="font-mono text-[10px] text-neutral-500">{hex}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          {originalPalette ? (
            <button
              type="button"
              onClick={handleClear}
              className="rounded-md px-3 py-1.5 text-sm text-red-400 hover:text-red-300"
            >
              Clear reference
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
              onClick={handleSave}
              disabled={palette.length === 0}
              className="rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Save Palette
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
