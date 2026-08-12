import { useEffect, useState } from 'react'
import { assetKeys, getAsset } from '../data/assetStorage'
import { getIconCrop } from '../data/iconCropStore'
import { useEditSessionStore } from '../state/editSessionStore'
import { usePlannerStore } from '../state/plannerStore'
import { IconUploadModal } from './IconUploadModal'

export type AssetIconType = 'skill' | 'weapon'

interface Props {
  type: AssetIconType
  iconId: string
  label?: string
  size?: number
}

function keyFor(type: AssetIconType, iconId: string): string {
  return type === 'skill' ? assetKeys.skillIcon(iconId) : assetKeys.weaponIcon(iconId)
}

// Pre-extracted-from-the-game icons live as static files under public/skills/ (see
// scripts/import_skill_icons.py) — git-ignored, same as public/art/, since they're copyrighted
// game assets. Only skills have a batch pipeline so far; weapons still rely entirely on manual
// Edit Mode uploads.
function staticUrlFor(type: AssetIconType, iconId: string): string | undefined {
  return type === 'skill' ? `/skills/${iconId}.png` : undefined
}

/**
 * Shared "dumb" asset lookup by id — displays a manually-uploaded override if one exists in
 * IndexedDB (Edit Mode's upload system), otherwise falls back to a static, pre-extracted icon if
 * the batch import pipeline produced one for this id, otherwise a placeholder. Manual uploads
 * winning lets someone override a specific pre-extracted icon without touching the pipeline.
 * Shape is per-category: circle for skills, rounded-square for weapons, matching in-game styling.
 */
export function AssetIcon({ type, iconId, label, size = 32 }: Props) {
  const editModeEnabled = usePlannerStore((state) => state.editModeEnabled)
  const assetEpoch = useEditSessionStore((state) => state.assetEpoch)
  const [dataUrl, setDataUrl] = useState<string | undefined>(undefined)
  const [loaded, setLoaded] = useState(false)
  const [staticFailed, setStaticFailed] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [version, setVersion] = useState(0)

  const key = keyFor(type, iconId)
  const staticUrl = staticUrlFor(type, iconId)

  useEffect(() => {
    let cancelled = false
    setLoaded(false)
    setStaticFailed(false)
    getAsset(key).then((url) => {
      if (!cancelled) {
        setDataUrl(url)
        setLoaded(true)
      }
    })
    return () => {
      cancelled = true
    }
    // assetEpoch bumps after an Edit Mode "discard changes" reverts storage out from under us —
    // re-fetch even though key/version didn't change.
  }, [key, version, assetEpoch])

  const crop = getIconCrop(key)
  const shapeClass = type === 'skill' ? 'rounded-full' : 'rounded-md'
  const effectiveUrl = dataUrl ?? (!staticFailed ? staticUrl : undefined)

  const content = (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden border border-neutral-700 bg-neutral-800 ${shapeClass}`}
      style={{ width: size, height: size }}
      title={label ?? iconId}
    >
      {loaded && effectiveUrl ? (
        <img
          src={effectiveUrl}
          alt={label ?? iconId}
          className="h-full w-full object-cover"
          style={
            dataUrl
              ? { objectPosition: `${crop.x}% ${crop.y}%`, transform: `scale(${crop.zoom})` }
              : undefined
          }
          // Only the manually-uploaded path (dataUrl) has a crop applied — the static pipeline
          // output is already a tightly-cropped single icon, no user-set crop to honor.
          onError={() => setStaticFailed(true)}
        />
      ) : (
        <svg viewBox="0 0 24 24" className="h-3/5 w-3/5 text-neutral-600" fill="currentColor">
          <path d="M12 2 3 6v6c0 5 3.8 9.4 9 10 5.2-.6 9-5 9-10V6l-9-4Z" />
        </svg>
      )}
      {editModeEnabled && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity hover:opacity-100">
          <svg viewBox="0 0 24 24" className="h-1/2 w-1/2 text-white" fill="currentColor">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25ZM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z" />
          </svg>
        </div>
      )}
    </div>
  )

  if (!editModeEnabled) return content

  return (
    <>
      <button type="button" onClick={() => setUploadOpen(true)} className="block">
        {content}
      </button>
      {uploadOpen && (
        <IconUploadModal
          type={type}
          iconId={iconId}
          label={label}
          onClose={() => setUploadOpen(false)}
          onSaved={() => {
            setUploadOpen(false)
            setVersion((v) => v + 1)
          }}
        />
      )}
    </>
  )
}
