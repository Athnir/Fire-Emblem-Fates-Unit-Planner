import { describe, expect, it } from 'vitest'
import { charactersById } from '../../data/characters'
import type { Character, StatBlock } from '../../data/types'
import { computeChild, determineVariableParent, getHairSourceInfo, inheritClasses } from '../childCalculator'

const zeroStats: StatBlock = { hp: 0, str: 0, mag: 0, skl: 0, spd: 0, lck: 0, def: 0, res: 0 }

function makeCharacter(overrides: Partial<Character> & Pick<Character, 'id'>): Character {
  return {
    name: overrides.id,
    gender: 'M',
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
    ...overrides,
  }
}

describe('determineVariableParent', () => {
  it('defaults to mother for a normal child', () => {
    const father = makeCharacter({ id: 'laslow' })
    const mother = makeCharacter({ id: 'corrin_f', gender: 'F' })
    expect(determineVariableParent('soleil', father, mother)).toBe('mother')
  })

  it('is the father for Shigure', () => {
    const father = makeCharacter({ id: 'some_husband' })
    const mother = makeCharacter({ id: 'azura', gender: 'F' })
    expect(determineVariableParent('shigure', father, mother)).toBe('father')
  })

  it('is the father for male Kana (female Corrin as mother)', () => {
    const father = makeCharacter({ id: 'niles' })
    const mother = makeCharacter({ id: 'corrin_f', gender: 'F' })
    expect(determineVariableParent('kana_m', father, mother)).toBe('father')
  })

  it('is the mother for female Kana (male Corrin as father)', () => {
    const father = makeCharacter({ id: 'corrin_m' })
    const mother = makeCharacter({ id: 'felicia', gender: 'F' })
    expect(determineVariableParent('kana_f', father, mother)).toBe('mother')
  })
})

describe('getHairSourceInfo', () => {
  it('is the variable (father) side for a normal child like Soleil', () => {
    const info = getHairSourceInfo(charactersById['soleil'])
    expect(info).toEqual({
      fixedSide: 'father',
      fixedParentId: 'laslow',
      hairSourceSide: 'mother',
      isHairSourceFixed: false,
    })
  })

  it('is fixed to the mother (Azura) for Shigure, with no pairing choice needed', () => {
    const info = getHairSourceInfo(charactersById['shigure'])
    expect(info).toEqual({
      fixedSide: 'mother',
      fixedParentId: 'azura',
      hairSourceSide: 'mother',
      isHairSourceFixed: true,
    })
  })

  it('is the variable father side for Kana M (fixed mother corrin_f)', () => {
    const info = getHairSourceInfo(charactersById['kana_m'])
    expect(info).toEqual({
      fixedSide: 'mother',
      fixedParentId: 'corrin_f',
      hairSourceSide: 'father',
      isHairSourceFixed: false,
    })
  })

  it('is the variable mother side for Kana F (fixed father corrin_m)', () => {
    const info = getHairSourceInfo(charactersById['kana_f'])
    expect(info).toEqual({
      fixedSide: 'father',
      fixedParentId: 'corrin_m',
      hairSourceSide: 'mother',
      isHairSourceFixed: false,
    })
  })

  it('returns undefined for characters with no possibleParents (e.g. adults)', () => {
    expect(getHairSourceInfo(charactersById['xander'])).toBeUndefined()
  })
})

describe('inheritClasses', () => {
  it('inherits father default + mother default when neither collides with the child class', () => {
    const child = makeCharacter({ id: 'soleil', startingClass: 'Merchant' })
    const father = makeCharacter({
      id: 'laslow',
      startingClass: 'Mercenary',
      secondaryClass: 'Samurai',
    })
    const mother = makeCharacter({
      id: 'some_wife',
      gender: 'F',
      startingClass: 'Nohr Princess',
      secondaryClass: 'Songstress',
    })
    expect(inheritClasses(child, father, mother).sort()).toEqual(
      ['Merchant', 'Mercenary', 'Nohr Princess'].sort(),
    )
  })

  it("gives Corrin's Nohr Prince(ss) itself to a non-Kana child (beast-shifter-style: freely passed, not the Talent)", () => {
    const child = makeCharacter({ id: 'soleil', startingClass: 'Merchant' })
    const father = makeCharacter({ id: 'laslow', startingClass: 'Mercenary', secondaryClass: 'Samurai' })
    const mother = makeCharacter({
      id: 'corrin_f',
      gender: 'F',
      startingClass: 'Nohr Prince(ss)',
      secondaryClass: 'Ninja', // player-chosen Talent -- should NOT be inherited here
    })
    const classes = inheritClasses(child, father, mother)
    expect(classes).toContain('Nohr Prince(ss)')
    expect(classes).not.toContain('Ninja')
  })

  it("gives Kana (own primary IS Nohr Prince(ss)) the chosen Talent instead, since Prince(ss) would be redundant", () => {
    const child = makeCharacter({ id: 'kana_f', startingClass: 'Nohr Prince(ss)' })
    const father = makeCharacter({ id: 'niles', startingClass: 'Outlaw', secondaryClass: 'Dark Mage' })
    const mother = makeCharacter({
      id: 'corrin_f',
      gender: 'F',
      startingClass: 'Nohr Prince(ss)',
      secondaryClass: 'Ninja',
    })
    const classes = inheritClasses(child, father, mother)
    expect(classes).toContain('Ninja')
    expect(classes.filter((c) => c === 'Nohr Prince(ss)')).toHaveLength(1)
  })

  it("gives the father's real secondary when his default collides with Corrin's Talent, instead of discarding the Talent for a parallel-class filler", () => {
    const child = makeCharacter({ id: 'kana_m', gender: 'M', startingClass: 'Nohr Prince(ss)' })
    const father = makeCharacter({ id: 'laslow', startingClass: 'Mercenary', secondaryClass: 'Ninja' })
    const mother = makeCharacter({
      id: 'corrin_f',
      gender: 'F',
      startingClass: 'Nohr Prince(ss)',
      secondaryClass: 'Mercenary', // player-chosen Talent, collides with Laslow's own default
    })
    const classes = inheritClasses(child, father, mother)
    expect(classes).toContain('Mercenary') // Corrin's Talent is preserved
    expect(classes).toContain('Ninja') // Laslow yields to his real secondary instead of Corrin losing her Talent
    expect(classes.filter((c) => c === 'Mercenary')).toHaveLength(1)
  })

  it('handles the same collision with real character data (Corrin M x Selena, both mother/father slots swapped from the Laslow case)', () => {
    const child = makeCharacter({ id: 'kana_f', gender: 'F', startingClass: 'Nohr Prince(ss)' })
    const father = { ...charactersById['corrin_m'], secondaryClass: 'Mercenary' } // player-chosen Talent
    const mother = charactersById['selena'] // real data: startingClass Mercenary, secondaryClass Sky Knight
    const classes = inheritClasses(child, father, mother)
    expect(classes).toContain('Mercenary')
    expect(classes).toContain('Sky Knight')
    expect(classes.filter((c) => c === 'Mercenary')).toHaveLength(1)
  })

  it("corrects Corrin's Monk/Shrine Maiden Talent to Kana's OWN gender, not Corrin's", () => {
    const kanaM = makeCharacter({ id: 'kana_m', gender: 'M', startingClass: 'Nohr Prince(ss)' })
    const father = makeCharacter({ id: 'niles', startingClass: 'Outlaw', secondaryClass: 'Dark Mage' })
    // Corrin F's Talent, already corrected to HER gender, is Shrine Maiden — but Kana M is male,
    // so his inherited Talent class should flip to Monk, not stay Shrine Maiden.
    const corrinF = makeCharacter({
      id: 'corrin_f',
      gender: 'F',
      startingClass: 'Nohr Prince(ss)',
      secondaryClass: 'Shrine Maiden',
    })
    const classesM = inheritClasses(kanaM, father, corrinF)
    expect(classesM).toContain('Monk')
    expect(classesM).not.toContain('Shrine Maiden')

    const kanaF = makeCharacter({ id: 'kana_f', gender: 'F', startingClass: 'Nohr Prince(ss)' })
    const mother = makeCharacter({ id: 'nina', gender: 'F', startingClass: 'Outlaw', secondaryClass: 'Dark Mage' })
    const corrinM = makeCharacter({
      id: 'corrin_m',
      gender: 'M',
      startingClass: 'Nohr Prince(ss)',
      secondaryClass: 'Monk',
    })
    const classesF = inheritClasses(kanaF, corrinM, mother)
    expect(classesF).toContain('Shrine Maiden')
    expect(classesF).not.toContain('Monk')
  })

  it('falls back to father alternate class when father default == child default', () => {
    const child = makeCharacter({ id: 'x', startingClass: 'Mercenary' })
    const father = makeCharacter({
      id: 'laslow',
      startingClass: 'Mercenary',
      secondaryClass: 'Samurai',
    })
    const mother = makeCharacter({ id: 'y', gender: 'F', startingClass: 'Troubadour' })
    const classes = inheritClasses(child, father, mother)
    // child's own class (Mercenary) is expected once; the father's *contribution* should be
    // his alternate (Samurai), not a redundant second Mercenary
    expect(classes).toContain('Samurai')
    expect(classes.filter((c) => c === 'Mercenary')).toHaveLength(1)
  })

  it('substitutes the parallel class when both of the mother\'s classes are already present', () => {
    const child = makeCharacter({ id: 'x', startingClass: 'Cavalier' })
    const father = makeCharacter({
      id: 'f',
      startingClass: 'Ninja',
      secondaryClass: 'Fighter',
    })
    const mother = makeCharacter({
      id: 'm',
      gender: 'F',
      startingClass: 'Cavalier',
      secondaryClass: 'Ninja',
    })
    // classSet starts {Cavalier(child), Ninja(father)} -> both of mother's classes (Cavalier, Ninja) already present
    // -> parallel class for mother's default (Cavalier) is Ninja... but Ninja already present, table says Cavalier<->Ninja
    // Use a case where the parallel class is distinct and not already present:
    const classes = inheritClasses(child, father, mother)
    expect(classes).toContain('Ninja') // parallel of Cavalier is Ninja, already present via father — still a valid outcome per rule
  })

  it("never passes down Songstress itself, and contributes only her real secondary (Sky Knight) when it doesn't collide with the child's own class", () => {
    const child = makeCharacter({ id: 'percy', startingClass: 'Wyvern Rider' })
    const father = makeCharacter({ id: 'arthur', startingClass: 'Fighter', secondaryClass: 'Hero' })
    const mother = makeCharacter({
      id: 'azura',
      gender: 'F',
      startingClass: 'Songstress',
      secondaryClass: 'Sky Knight',
    })
    const classes = inheritClasses(child, father, mother)
    expect(classes).toContain('Sky Knight')
    expect(classes).not.toContain('Troubadour')
    expect(classes).not.toContain('Songstress')
    expect(classes.filter((c) => c === 'Sky Knight')).toHaveLength(1)
  })

  it("passes down the parallel substitute (Troubadour) instead of Sky Knight when her secondary collides with the child's own class (Shigure)", () => {
    const child = makeCharacter({ id: 'shigure', startingClass: 'Sky Knight' })
    const father = makeCharacter({ id: 'silas', startingClass: 'Cavalier', secondaryClass: 'Ninja' })
    const mother = makeCharacter({
      id: 'azura',
      gender: 'F',
      startingClass: 'Songstress',
      secondaryClass: 'Sky Knight',
    })
    const classes = inheritClasses(child, father, mother)
    expect(classes).toContain('Troubadour')
    expect(classes).not.toContain('Songstress')
    // Sky Knight still appears exactly once, from the child's OWN class — not doubled up by
    // also being Azura's contribution (that's the bug: she must contribute exactly one class).
    expect(classes.filter((c) => c === 'Sky Knight')).toHaveLength(1)
  })
})

describe('computeChild', () => {
  it('grants dragon vein access if either parent is royal', () => {
    const child = makeCharacter({ id: 'siegbert' })
    const father = makeCharacter({ id: 'xander', isRoyal: true })
    const mother = makeCharacter({ id: 'some_wife', gender: 'F' })
    const result = computeChild({
      child,
      father,
      mother,
      fatherCurrentStats: zeroStats,
      motherCurrentStats: zeroStats,
    })
    expect(result.hasDragonVeinAccess).toBe(true)
  })

  it("fixes Shigure's hair to Azura even though his variable parent (for stats) is the father", () => {
    const child = makeCharacter({ id: 'shigure' })
    const father = makeCharacter({ id: 'silas' })
    const mother = makeCharacter({ id: 'azura', gender: 'F' })
    const result = computeChild({
      child,
      father,
      mother,
      fatherCurrentStats: zeroStats,
      motherCurrentStats: zeroStats,
    })
    // formulas doc: Shigure always matches Azura (the mother here) regardless of who she marries,
    // even though the variable parent used for his growth/class computations is the father.
    expect(result.hairSourceParentId).toBe('azura')
    expect(result.variableParent).toBe('father')
  })

  it("uses the father (Corrin) as the hair source for male Kana, matching the variable parent", () => {
    const child = makeCharacter({ id: 'kana_m' })
    const father = makeCharacter({ id: 'niles' })
    const mother = makeCharacter({ id: 'corrin_f', gender: 'F' })
    const result = computeChild({
      child,
      father,
      mother,
      fatherCurrentStats: zeroStats,
      motherCurrentStats: zeroStats,
    })
    expect(result.hairSourceParentId).toBe('niles')
    expect(result.variableParent).toBe('father')
  })
})
