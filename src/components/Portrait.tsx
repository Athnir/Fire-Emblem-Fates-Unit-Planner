import { useEffect, useRef, useState } from 'react'
import { assetKeys, getAsset } from '../data/assetStorage'
import {
  adultPortraitUrl,
  childPortraitBaseUrl,
  childPortraitRawUrl,
  corrinBaseUrl,
  corrinBodyKey,
  corrinHairRawUrl,
} from '../data/portraitAssets'
import { colorizeRawHairTexture, loadImage } from '../logic/portraitColorize'
import { useEditSessionStore } from '../state/editSessionStore'

/** IndexedDB (Edit Mode / Bulk Upload) takes priority over the static public/art/ file, same
 * fallback order AssetIcon uses for skill/weapon icons — lets someone without the (git-ignored,
 * copyrighted) art folder built into their deployment supply portraits client-side instead. */
async function resolveUrl(key: string, staticUrl: string): Promise<string> {
  return (await getAsset(key)) ?? staticUrl
}

interface CorrinAppearanceProps {
  gender: 'M' | 'F'
  height: 'short' | 'tall'
  hairstyle: string
}

interface Props {
  characterId: string
  isChild: boolean
  /** The character's own reference hair color (first swatch of their hair-reference palette, if set). */
  hairHex?: string
  size?: number
  /** Set only for Corrin: renders their bald body model + selected hairstyle recolored to hairHex,
   * the same base+template composite technique as children, instead of the flat adult portrait. */
  corrin?: CorrinAppearanceProps
}

type Status = 'loading' | 'ok' | 'missing'

function Placeholder({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" className="text-neutral-700" width={size * 0.5} height={size * 0.5} fill="currentColor">
      <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.4 0-8 2.2-8 5v3h16v-3c0-2.8-3.6-5-8-5Z" />
    </svg>
  )
}

/**
 * A character's portrait. Plain adults are a single static image (their hair never changes).
 * Children AND Corrin (via the `corrin` prop) composite a "base" layer (face/armor/body, hair
 * region cut transparent) with a hair template recolored live from a hex color — see
 * ART_ASSETS.md and portraitColorize.ts. Any missing art (the common case — public/art/ is
 * optional and git-ignored) renders a placeholder instead of a broken image.
 */
export function Portrait({ characterId, isChild, hairHex, size = 96, corrin }: Props) {
  const [status, setStatus] = useState<Status>('loading')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [adultUrl] = useState(() => adultPortraitUrl(characterId))
  // The actual <img src> to render — separate from adultUrl (the static fallback) because the real
  // source might be an IndexedDB data: URL instead, resolved async in the effect below. Rendering
  // adultUrl directly here would always show the static file/placeholder, silently ignoring
  // anything uploaded via Edit Mode/Bulk Upload.
  const [resolvedAdultUrl, setResolvedAdultUrl] = useState(adultUrl)
  const isComposite = isChild || !!corrin
  // Bumped whenever Edit Mode discards a session's changes — same signal AssetIcon reacts to, so a
  // bulk-uploaded (or reverted) portrait is picked up without a full page reload.
  const assetEpoch = useEditSessionStore((state) => state.assetEpoch)

  useEffect(() => {
    let cancelled = false
    setStatus('loading')

    if (!isComposite) {
      resolveUrl(assetKeys.portrait(characterId), adultUrl)
        .then((url) => loadImage(url).then(() => url))
        .then((url) => {
          if (cancelled) return
          setResolvedAdultUrl(url)
          setStatus('ok')
        })
        .catch(() => !cancelled && setStatus('missing'))
      return () => {
        cancelled = true
      }
    }

    async function renderComposite() {
      const canvas = canvasRef.current
      if (!canvas) return
      // base.png is required; the hair layer is optional — some children (e.g. Shigure, whose hair
      // is always his fixed mother's regardless of pairing) only ever get a flat render since the
      // game itself never gives them a separately-tintable hair layer either.
      const baseKey = corrin ? assetKeys.corrinBase(corrinBodyKey(corrin.gender, corrin.height)) : assetKeys.childPortraitBase(characterId)
      const baseStaticUrl = corrin ? corrinBaseUrl(corrin.gender, corrin.height) : childPortraitBaseUrl(characterId)
      const baseImg = await resolveUrl(baseKey, baseStaticUrl).then((url) => loadImage(url))
      if (cancelled) return

      // Render the visible canvas's backing store at devicePixelRatio, not the art's native
      // resolution — otherwise a 256px source stretched to fill its CSS box on a high-DPI phone
      // (dpr ~3) upscales ~3x more than on a standard dpr-1 monitor, reading visibly blockier.
      const dpr = window.devicePixelRatio || 1
      canvas.width = baseImg.width * dpr
      canvas.height = baseImg.height * dpr
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(baseImg, 0, 0, canvas.width, canvas.height)

      // The raw, already-colored ROM hair texture + a straight normalize-then-multiply recolor
      // (see colorizeRawHairTexture) — verified against official reference charts to land within a
      // few RGB units with zero per-character tuning. Every child and every Corrin hairstyle now
      // has an identity-verified raw texture (confirmed via exact pixel-mask IoU against the
      // formerly-used HSL template before switching), so this is the only hair path left.
      const rawKey = corrin
        ? assetKeys.corrinHairRaw(corrinBodyKey(corrin.gender, corrin.height), corrin.hairstyle)
        : assetKeys.childPortraitRaw(characterId)
      const rawStaticUrl = corrin
        ? corrinHairRawUrl(corrin.gender, corrin.height, corrin.hairstyle)
        : childPortraitRawUrl(characterId)
      const rawImg = await resolveUrl(rawKey, rawStaticUrl)
        .then((url) => loadImage(url))
        .catch(() => undefined)
      if (cancelled || !rawImg) return

      const off = document.createElement('canvas')
      off.width = rawImg.width
      off.height = rawImg.height
      const offCtx = off.getContext('2d')
      if (!offCtx) return
      offCtx.drawImage(rawImg, 0, 0)
      const rawData = offCtx.getImageData(0, 0, off.width, off.height)
      // No hair-reference color chosen yet -> show the texture's own baked-in default color
      // rather than guessing a target hex.
      const colorized = hairHex ? colorizeRawHairTexture(rawData, hairHex) : rawData
      offCtx.putImageData(colorized, 0, 0)
      ctx.drawImage(off, 0, 0, off.width, off.height, 0, 0, canvas.width, canvas.height)
    }

    renderComposite()
      .then(() => !cancelled && setStatus('ok'))
      .catch(() => !cancelled && setStatus('missing'))

    return () => {
      cancelled = true
    }
  }, [characterId, isChild, adultUrl, hairHex, isComposite, corrin?.gender, corrin?.height, corrin?.hairstyle, assetEpoch])

  return (
    <div
      className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900"
      style={{ width: size, height: size }}
    >
      {status === 'missing' && <Placeholder size={size} />}
      {!isComposite ? (
        <img
          src={resolvedAdultUrl}
          alt=""
          className={`h-full w-full object-cover ${status === 'ok' ? '' : 'hidden'}`}
          style={{ display: status === 'ok' ? undefined : 'none' }}
        />
      ) : (
        <canvas
          ref={canvasRef}
          className="h-full w-full object-contain"
          style={{ display: status === 'ok' ? undefined : 'none' }}
        />
      )}
    </div>
  )
}
