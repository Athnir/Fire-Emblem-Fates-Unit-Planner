import { describe, expect, it } from 'vitest'
import { characters, charactersById } from '../characters'
import { classes, classesByName } from '../classes'
import { STAT_KEYS } from '../types'
import { supports } from '../supports'

describe('data integrity', () => {
  it('has no duplicate support pairs', () => {
    const seen = new Set<string>()
    const duplicates: string[] = []
    for (const p of supports) {
      const key = [p.characterA, p.characterB].sort().join('::')
      if (seen.has(key)) duplicates.push(key)
      seen.add(key)
    }
    expect(duplicates).toEqual([])
  })

  it('every support pair references characters that exist', () => {
    const missing: string[] = []
    for (const p of supports) {
      if (!charactersById[p.characterA]) missing.push(p.characterA)
      if (!charactersById[p.characterB]) missing.push(p.characterB)
    }
    expect(missing).toEqual([])
  })

  it('has no accidental same-sex MARRIAGE (S-rank) pair other than the two known exceptions (corrin_m x niles, corrin_f x rhajat)', () => {
    // Same-sex pairs at 'A' rank are expected and common (Friendship Seal / sibling supports) —
    // only an S-rank (marriage) same-sex pair outside the two canonical exceptions is a bug.
    const knownExceptions = new Set([
      ['corrin_m', 'niles'].sort().join('::'),
      ['corrin_f', 'rhajat'].sort().join('::'),
    ])
    const unexpected: string[] = []
    for (const p of supports) {
      if (p.maxRank !== 'S') continue
      const a = charactersById[p.characterA]
      const b = charactersById[p.characterB]
      if (!a || !b) continue
      if (a.gender === 'both' || b.gender === 'both') continue
      if (a.gender === b.gender) {
        const key = [p.characterA, p.characterB].sort().join('::')
        if (!knownExceptions.has(key)) unexpected.push(key)
      }
    }
    expect(unexpected).toEqual([])
  })

  it('every character id is unique', () => {
    const ids = characters.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('no two distinct characters share a personal skill (Corrin M/F and Kana M/F are the only legitimate shared names)', () => {
    const ALLOWED_SHARED = new Set(['Supportive', 'Draconic Heir'])
    const bySkill = new Map<string, string[]>()
    for (const c of characters) {
      if (!bySkill.has(c.personalSkill)) bySkill.set(c.personalSkill, [])
      bySkill.get(c.personalSkill)!.push(c.id)
    }
    const unexpectedDuplicates: string[] = []
    for (const [skillName, ids] of bySkill) {
      if (ids.length > 1 && !ALLOWED_SHARED.has(skillName)) {
        unexpectedDuplicates.push(`${skillName}: ${ids.join(', ')}`)
      }
    }
    expect(unexpectedDuplicates).toEqual([])
  })

  it('every startingClass/secondaryClass/tertiaryClass/joinClass references a real class name', () => {
    const missing: string[] = []
    for (const c of characters) {
      if (!classesByName[c.startingClass]) missing.push(`${c.id}: startingClass "${c.startingClass}"`)
      if (c.secondaryClass && !classesByName[c.secondaryClass]) {
        missing.push(`${c.id}: secondaryClass "${c.secondaryClass}"`)
      }
      if (c.tertiaryClass && !classesByName[c.tertiaryClass]) {
        missing.push(`${c.id}: tertiaryClass "${c.tertiaryClass}"`)
      }
      if (c.joinClass && !classesByName[c.joinClass]) {
        missing.push(`${c.id}: joinClass "${c.joinClass}"`)
      }
    }
    expect(missing).toEqual([])
  })

  it('every class has a complete growthModifiers block (no missing/NaN stat)', () => {
    const bad: string[] = []
    for (const c of classes) {
      for (const key of STAT_KEYS) {
        if (typeof c.growthModifiers?.[key] !== 'number' || Number.isNaN(c.growthModifiers[key])) {
          bad.push(`${c.id}: ${key}`)
        }
      }
    }
    expect(bad).toEqual([])
  })

  it('every character has a complete maxStatModifiers block (no missing/NaN stat)', () => {
    const bad: string[] = []
    for (const c of characters) {
      for (const key of STAT_KEYS) {
        if (typeof c.maxStatModifiers?.[key] !== 'number' || Number.isNaN(c.maxStatModifiers[key])) {
          bad.push(`${c.id}: ${key}`)
        }
      }
    }
    expect(bad).toEqual([])
  })

  it('every non-child, non-Corrin adult has a real (non-zero) personal maxStatModifiers', () => {
    const allZero: string[] = []
    for (const c of characters) {
      if (c.isChild || c.id === 'corrin_m' || c.id === 'corrin_f') continue
      if (STAT_KEYS.every((key) => c.maxStatModifiers[key] === 0)) allZero.push(c.id)
    }
    expect(allZero).toEqual([])
  })

  it('every child has an unlockChapter entry for each route they appear on', () => {
    const REAL_ROUTES = ['Birthright', 'Conquest', 'Revelation'] as const
    const missing: string[] = []
    for (const c of characters.filter((c) => c.isChild)) {
      const routes = c.route.includes('all') ? REAL_ROUTES : c.route
      for (const route of routes) {
        if (route === 'all') continue
        if (c.unlockChapter?.[route] === undefined) missing.push(`${c.id}: ${route}`)
      }
    }
    expect(missing).toEqual([])
  })

  it('every child possibleParents.father/mother id references a real character', () => {
    const missing: string[] = []
    for (const c of characters.filter((c) => c.isChild)) {
      for (const id of c.possibleParents?.father ?? []) {
        if (!charactersById[id]) missing.push(`${c.id}: father "${id}"`)
      }
      for (const id of c.possibleParents?.mother ?? []) {
        if (!charactersById[id]) missing.push(`${c.id}: mother "${id}"`)
      }
    }
    expect(missing).toEqual([])
  })
})
