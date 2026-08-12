/**
 * Recolors a raw, already-colored hair texture extracted directly from the game's own ROM data —
 * see ART_ASSETS.md and childPortraitRawUrl/corrinHairRawUrl. Replaces an earlier HSL-template +
 * hand-tuned shadow/highlight-tint system (colorizeHairTemplate/colorizeHairTemplateLayered, since
 * removed) that needed weeks of per-character tuning against reference art; this formula was
 * reverse-engineered from the game's real recolor behavior instead and needs none.
 */

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}

function hexToRgb01(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  return [
    parseInt(clean.slice(0, 2), 16) / 255,
    parseInt(clean.slice(2, 4), 16) / 255,
    parseInt(clean.slice(4, 6), 16) / 255,
  ]
}

// Percentile of the 90th-percentile brightness level to stretch to before multiplying — see
// colorizeRawHairTexture's comment for why this exists at all.
const RAW_STRETCH_PERCENTILE = 90
const RAW_STRETCH_TARGET = 230

function percentileFlat(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b)
  const idx = clamp(Math.floor((sorted.length * p) / 100), 0, sorted.length - 1)
  return sorted[idx]
}

/**
 * Recolors a *raw, already-colored* hair texture (extracted directly from the game's own ROM
 * data, not an HSL-decomposed template) by normalizing its brightness and multiplying by a target
 * hex — reverse-engineered from the actual game asset rather than approximated: the raw texture
 * isn't neutral grey, it's a muted, low-saturation default color, which only produces
 * correct-looking results once its highlights are stretched back up before the multiply (skipping
 * the stretch multiplies two already-dark values together and crushes everything too dark —
 * confirmed against real reference charts).
 *
 * Verified against official reference charts across every child's full mother list plus all 30
 * Corrin colors, and against Corrin's own 30-color palette on all 48 hairstyle/body-variant raw
 * textures (mean RGB error ~22 on Caeldori, i.e. visually indistinguishable) — see the hair-recolor
 * ROM investigation for the methodology.
 */
export function colorizeRawHairTexture(texture: ImageData, targetHex: string): ImageData {
  const data = texture.data
  const out = new ImageData(new Uint8ClampedArray(data), texture.width, texture.height)

  const channelValues: number[] = []
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue
    channelValues.push(data[i], data[i + 1], data[i + 2])
  }
  if (channelValues.length === 0) return out

  const stretchScale = RAW_STRETCH_TARGET / percentileFlat(channelValues, RAW_STRETCH_PERCENTILE)
  const [tr, tg, tb] = hexToRgb01(targetHex)

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3]
    if (alpha === 0) {
      out.data[i + 3] = 0
      continue
    }
    const normR = clamp(data[i] * stretchScale, 0, 255)
    const normG = clamp(data[i + 1] * stretchScale, 0, 255)
    const normB = clamp(data[i + 2] * stretchScale, 0, 255)
    out.data[i] = Math.round(clamp(normR * tr, 0, 255))
    out.data[i + 1] = Math.round(clamp(normG * tg, 0, 255))
    out.data[i + 2] = Math.round(clamp(normB * tb, 0, 255))
    out.data[i + 3] = alpha
  }
  return out
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load ${url}`))
    img.src = url
  })
}
