import { describe, expect, it } from 'vitest'
import { charactersById } from '../../data/characters'
import { supports } from '../../data/supports'
import { canMarry, canProduceChild } from '../eligibility'

describe('real support data', () => {
  it('allows corrin_m x niles to marry, but produces no child (same-sex)', () => {
    const corrinM = charactersById['corrin_m']
    const niles = charactersById['niles']
    expect(canMarry(supports, corrinM, niles, 'Conquest')).toBe(true)
    expect(canProduceChild(supports, corrinM, niles, 'Conquest')).toBe(false)
  })

  it('allows corrin_f x niles to marry and produce a child (opposite-sex)', () => {
    const corrinF = charactersById['corrin_f']
    const niles = charactersById['niles']
    expect(canProduceChild(supports, corrinF, niles, 'Conquest')).toBe(true)
  })

  it('gates the Nohr/Hoshido royal cross-marriage to Revelation only', () => {
    const xander = charactersById['xander']
    const hinoka = charactersById['hinoka']
    expect(canMarry(supports, xander, hinoka, 'Revelation')).toBe(true)
    expect(canMarry(supports, xander, hinoka, 'Conquest')).toBe(false)
    expect(canMarry(supports, xander, hinoka, 'Birthright')).toBe(false)
  })

  it('allows Azura to marry across all routes with an all-route retainer', () => {
    const azura = charactersById['azura']
    const kaze = charactersById['kaze']
    expect(canMarry(supports, azura, kaze, 'Birthright')).toBe(true)
    expect(canMarry(supports, azura, kaze, 'Conquest')).toBe(true)
    expect(canMarry(supports, azura, kaze, 'Revelation')).toBe(true)
  })

  it('has no support pair at all between two characters who never interact', () => {
    const hinoka = charactersById['hinoka']
    const effie = charactersById['effie']
    expect(canMarry(supports, hinoka, effie, 'Revelation')).toBe(false)
  })
})
