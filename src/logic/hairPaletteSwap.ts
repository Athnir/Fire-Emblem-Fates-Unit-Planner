export interface RGB {
  r: number
  g: number
  b: number
}

export function rgbToHex({ r, g, b }: RGB): string {
  const toHex = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export function hexToRgb(hex: string): RGB {
  const clean = hex.replace('#', '')
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  }
}

/** Simple Euclidean distance in RGB space (per spec section 4 — LAB conversion noted as an optional upgrade if edges look rough). */
export function colorDistance(a: RGB, b: RGB): number {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2)
}

/** Skips near-white/near-black/transparent pixels, which are almost always background or line art rather than hair. */
export function isLikelyBackgroundOrLineArt(p: RGB, alpha = 255): boolean {
  if (alpha < 16) return true
  const isNearWhite = p.r > 235 && p.g > 235 && p.b > 235
  const isNearBlack = p.r < 20 && p.g < 20 && p.b < 20
  return isNearWhite || isNearBlack
}

export function extractRgbPixels(imageData: ImageData): { pixels: RGB[]; alphas: number[] } {
  const pixels: RGB[] = []
  const alphas: number[] = []
  const { data } = imageData
  for (let i = 0; i < data.length; i += 4) {
    pixels.push({ r: data[i], g: data[i + 1], b: data[i + 2] })
    alphas.push(data[i + 3])
  }
  return { pixels, alphas }
}

interface Cluster {
  centroid: RGB
  pixelCount: number
}

/** Small hand-rolled k-means — the pixel sets here (a cropped hair region) are small enough that a library isn't worth the dependency. */
export function kMeansCluster(pixels: RGB[], k: number, iterations = 10): Cluster[] {
  if (pixels.length === 0) return []
  const clampedK = Math.min(k, pixels.length)

  // Deterministic farthest-point seeding: start from the first pixel, then repeatedly pick
  // whichever remaining pixel is farthest from all seeds picked so far. Evenly-spaced index
  // sampling can accidentally pick near-duplicate seeds when the array has a blocky structure
  // (e.g. all of one color followed by all of another), which stalls k-means entirely.
  let centroids: RGB[] = [pixels[0]]
  while (centroids.length < clampedK) {
    let farthestPixel = pixels[0]
    let farthestDist = -1
    for (const pixel of pixels) {
      const nearestCentroidDist = Math.min(...centroids.map((c) => colorDistance(pixel, c)))
      if (nearestCentroidDist > farthestDist) {
        farthestDist = nearestCentroidDist
        farthestPixel = pixel
      }
    }
    centroids.push(farthestPixel)
  }

  let assignments = new Array(pixels.length).fill(0)

  for (let iter = 0; iter < iterations; iter++) {
    let changed = false
    for (let p = 0; p < pixels.length; p++) {
      let bestIdx = 0
      let bestDist = Infinity
      for (let c = 0; c < centroids.length; c++) {
        const d = colorDistance(pixels[p], centroids[c])
        if (d < bestDist) {
          bestDist = d
          bestIdx = c
        }
      }
      if (assignments[p] !== bestIdx) changed = true
      assignments[p] = bestIdx
    }

    const sums = centroids.map(() => ({ r: 0, g: 0, b: 0, count: 0 }))
    for (let p = 0; p < pixels.length; p++) {
      const cluster = sums[assignments[p]]
      cluster.r += pixels[p].r
      cluster.g += pixels[p].g
      cluster.b += pixels[p].b
      cluster.count += 1
    }
    centroids = sums.map((s, i) => (s.count > 0 ? { r: s.r / s.count, g: s.g / s.count, b: s.b / s.count } : centroids[i]))

    if (!changed) break
  }

  const counts = new Array(centroids.length).fill(0)
  for (const a of assignments) counts[a] += 1

  return centroids.map((centroid, i) => ({ centroid, pixelCount: counts[i] }))
}

/**
 * Extracts a hair palette from a reference image, sorted base -> shadow -> highlight by pixel
 * count (largest cluster = most likely "base" hair color, per the build spec).
 */
export function extractHairPalette(imageData: ImageData, clusterCount = 4): string[] {
  const { pixels, alphas } = extractRgbPixels(imageData)
  const filtered = pixels.filter((p, i) => !isLikelyBackgroundOrLineArt(p, alphas[i]))
  const clusters = kMeansCluster(filtered.length > 0 ? filtered : pixels, clusterCount)
  return clusters
    .sort((a, b) => b.pixelCount - a.pixelCount)
    .map((c) => rgbToHex(c.centroid))
}

/**
 * Recolors a child's portrait by matching each pixel to the nearest source-palette shade (within
 * tolerance) and swapping it for the corresponding target shade at the SAME tier index — matching
 * shade tier to shade tier (not nearest-color-overall) preserves shading/depth rather than
 * flattening it, per the build spec.
 */
export function applyHairSwap(
  childImageData: ImageData,
  sourcePalette: string[],
  targetPalette: string[],
  tolerance = 20,
): ImageData {
  const source = sourcePalette.map(hexToRgb)
  const target = targetPalette.map(hexToRgb)
  const out = new ImageData(
    new Uint8ClampedArray(childImageData.data),
    childImageData.width,
    childImageData.height,
  )

  for (let i = 0; i < out.data.length; i += 4) {
    const pixel: RGB = { r: out.data[i], g: out.data[i + 1], b: out.data[i + 2] }
    for (let tier = 0; tier < source.length; tier++) {
      if (colorDistance(pixel, source[tier]) < tolerance) {
        const replacement = target[tier] ?? target[target.length - 1]
        if (replacement) {
          out.data[i] = replacement.r
          out.data[i + 1] = replacement.g
          out.data[i + 2] = replacement.b
        }
        break
      }
    }
  }

  return out
}
