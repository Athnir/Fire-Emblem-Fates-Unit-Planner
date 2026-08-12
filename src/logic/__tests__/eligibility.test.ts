import { describe, expect, it } from 'vitest'
import type { Character, SupportPair } from '../../data/types'
import { canFriendshipSeal, canMarry, canProduceChild, canSupport, isSameSexPairing } from '../eligibility'

function makeCharacter(id: string, gender: Character['gender']): Character {
  const zeroStats = { hp: 0, str: 0, mag: 0, skl: 0, spd: 0, lck: 0, def: 0, res: 0 }
  return {
    id,
    name: id,
    gender,
    route: ['all'],
    startingClass: 'Cavalier',
    baseStats: zeroStats,
    growthRates: zeroStats,
    statCaps: zeroStats,
    maxStatModifiers: zeroStats,
    personalSkill: 'None',
    supportOptions: [],
    canMarry: [],
    isChild: false,
  }
}

describe('eligibility', () => {
  const laslow = makeCharacter('laslow', 'M')
  const corrinF = makeCharacter('corrin_f', 'F')
  const odin = makeCharacter('odin', 'M')

  const supports: SupportPair[] = [
    { characterA: 'laslow', characterB: 'corrin_f', maxRank: 'S', route: ['all'] },
    { characterA: 'laslow', characterB: 'odin', maxRank: 'A', route: ['all'] },
    { characterA: 'odin', characterB: 'corrin_f', maxRank: 'S', route: ['Conquest'] },
  ]

  it('finds a support pair regardless of argument order', () => {
    expect(canSupport(supports, corrinF, laslow, 'all')).toBe(true)
  })

  it('allows marriage only for S-rank pairs', () => {
    expect(canMarry(supports, laslow, corrinF, 'all')).toBe(true)
    expect(canMarry(supports, laslow, odin, 'all')).toBe(false)
  })

  it('respects route restrictions', () => {
    expect(canMarry(supports, odin, corrinF, 'Conquest')).toBe(true)
    expect(canMarry(supports, odin, corrinF, 'Birthright')).toBe(false)
  })

  it('blocks children for same-sex pairings even at A-rank/friendship', () => {
    expect(isSameSexPairing(laslow, odin)).toBe(true)
    expect(canProduceChild(supports, laslow, odin, 'all')).toBe(false)
  })

  it('treats Corrin (gender "both") as never same-sex-blocked by default', () => {
    const corrinBoth = makeCharacter('corrin', 'both')
    expect(isSameSexPairing(corrinBoth, laslow)).toBe(false)
  })

  it('allows children for eligible opposite-sex S-support pairs', () => {
    expect(canProduceChild(supports, laslow, corrinF, 'all')).toBe(true)
  })

  it('allows Friendship Seal for a same-sex A-rank pair', () => {
    expect(canFriendshipSeal(supports, laslow, odin, 'all')).toBe(true)
  })

  it('blocks Friendship Seal for an opposite-sex pair even if a support entry exists', () => {
    expect(canFriendshipSeal(supports, laslow, corrinF, 'all')).toBe(false)
  })

  it('exempts gender "both" (Kana) from the same-sex requirement', () => {
    const kana = makeCharacter('kana', 'both')
    const kanaSupports: SupportPair[] = [{ characterA: 'kana', characterB: 'odin', maxRank: 'A', route: ['all'] }]
    expect(canFriendshipSeal(kanaSupports, kana, odin, 'all')).toBe(true)
  })
})
