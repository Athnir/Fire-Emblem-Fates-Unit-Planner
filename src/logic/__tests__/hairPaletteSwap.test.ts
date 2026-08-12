import { describe, expect, it } from 'vitest'
import {
  colorDistance,
  extractRgbPixels,
  hexToRgb,
  isLikelyBackgroundOrLineArt,
  kMeansCluster,
  rgbToHex,
} from '../hairPaletteSwap'

describe('hex/rgb conversion', () => {
  it('round-trips rgb -> hex -> rgb', () => {
    const rgb = { r: 128, g: 64, b: 200 }
    const hex = rgbToHex(rgb)
    expect(hex).toBe('#8040c8')
    expect(hexToRgb(hex)).toEqual(rgb)
  })

  it('clamps out-of-range values', () => {
    expect(rgbToHex({ r: 300, g: -10, b: 128 })).toBe('#ff0080')
  })
})

describe('colorDistance', () => {
  it('is zero for identical colors', () => {
    expect(colorDistance({ r: 10, g: 20, b: 30 }, { r: 10, g: 20, b: 30 })).toBe(0)
  })

  it('increases with color difference', () => {
    const base = { r: 0, g: 0, b: 0 }
    const near = { r: 10, g: 0, b: 0 }
    const far = { r: 255, g: 255, b: 255 }
    expect(colorDistance(base, near)).toBeLessThan(colorDistance(base, far))
  })
})

describe('isLikelyBackgroundOrLineArt', () => {
  it('flags near-white, near-black, and transparent pixels', () => {
    expect(isLikelyBackgroundOrLineArt({ r: 250, g: 250, b: 250 })).toBe(true)
    expect(isLikelyBackgroundOrLineArt({ r: 5, g: 5, b: 5 })).toBe(true)
    expect(isLikelyBackgroundOrLineArt({ r: 100, g: 100, b: 100 }, 5)).toBe(true)
  })

  it('does not flag a mid-tone opaque hair color', () => {
    expect(isLikelyBackgroundOrLineArt({ r: 170, g: 80, b: 40 }, 255)).toBe(false)
  })
})

describe('kMeansCluster', () => {
  it('separates two well-separated color groups into two clusters', () => {
    const reds = Array.from({ length: 20 }, () => ({ r: 200, g: 10, b: 10 }))
    const blues = Array.from({ length: 10 }, () => ({ r: 10, g: 10, b: 200 }))
    const clusters = kMeansCluster([...reds, ...blues], 2)

    expect(clusters).toHaveLength(2)
    const sorted = clusters.sort((a, b) => b.pixelCount - a.pixelCount)
    expect(sorted[0].pixelCount).toBe(20)
    expect(sorted[0].centroid.r).toBeGreaterThan(150)
    expect(sorted[1].pixelCount).toBe(10)
    expect(sorted[1].centroid.b).toBeGreaterThan(150)
  })

  it('handles fewer pixels than requested clusters without crashing', () => {
    const clusters = kMeansCluster([{ r: 1, g: 2, b: 3 }], 4)
    expect(clusters.length).toBeGreaterThan(0)
  })

  it('returns empty for no pixels', () => {
    expect(kMeansCluster([], 4)).toEqual([])
  })
})

describe('extractRgbPixels', () => {
  it('reads RGBA data into parallel pixel/alpha arrays', () => {
    // duck-typed ImageData-like object -- real ImageData requires a DOM, not available under Node
    const fakeImageData = {
      data: new Uint8ClampedArray([10, 20, 30, 255, 40, 50, 60, 128]),
    } as ImageData

    const { pixels, alphas } = extractRgbPixels(fakeImageData)
    expect(pixels).toEqual([
      { r: 10, g: 20, b: 30 },
      { r: 40, g: 50, b: 60 },
    ])
    expect(alphas).toEqual([255, 128])
  })
})
