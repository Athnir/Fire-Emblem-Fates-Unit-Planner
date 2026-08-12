import { describe, expect, it } from 'vitest'
import { charactersById } from '../../data/characters'
import { classesByName } from '../../data/classes'
import { applyCorrinBuild } from '../corrinBuild'
import {
  classSkillsForGender,
  getClassLine,
  getOwnClassTree,
  getSealReclassClass,
  isCorrinWithoutTalent,
  weaponRankBonus,
} from '../classResolution'

describe('getSealReclassClass', () => {
  it("grants the other character's default class when it doesn't collide", () => {
    const laslow = charactersById['laslow'] // Mercenary/Ninja
    const corrinF = charactersById['corrin_f']
    expect(getSealReclassClass(corrinF, laslow)).toBe('Mercenary')
  })

  it("falls back to the other's secondary class when both share the same default", () => {
    const laslow = charactersById['laslow'] // Mercenary/Ninja
    const selena = charactersById['selena'] // Mercenary/Sky Knight
    expect(getSealReclassClass(laslow, selena)).toBe('Sky Knight')
  })

  it("borrows Corrin's second Class Set (chosen Talent) instead of the locked Nohr Prince(ss)", () => {
    const laslow = charactersById['laslow']
    const corrinM = applyCorrinBuild(charactersById['corrin_m'], { boon: null, bane: null, talentClass: 'Cavalier' })
    expect(getSealReclassClass(laslow, corrinM)).toBe('Cavalier')
  })

  it("borrows Azura's second Class Set (Sky Knight) instead of the locked Songstress", () => {
    const laslow = charactersById['laslow']
    const azura = charactersById['azura']
    expect(getSealReclassClass(laslow, azura)).toBe('Sky Knight')
  })

  it("borrows Mozu's second Class Set (Archer) instead of the locked Villager", () => {
    const laslow = charactersById['laslow']
    const mozu = charactersById['mozu']
    expect(getSealReclassClass(laslow, mozu)).toBe('Archer')
  })

  it("borrows Kaden's second Class Set (Diviner) instead of the locked Kitsune", () => {
    const laslow = charactersById['laslow']
    const kaden = charactersById['kaden']
    expect(getSealReclassClass(laslow, kaden)).toBe('Diviner')
  })

  it("borrows Keaton's second Class Set (Fighter) instead of the locked Wolfskin", () => {
    const laslow = charactersById['laslow']
    const keaton = charactersById['keaton']
    expect(getSealReclassClass(laslow, keaton)).toBe('Fighter')
  })

  it("falls back to the other's secondary when it collides with self's SECONDARY class, not just their default — corrected to self's own gender (Monk, not Shrine Maiden, for Corrin M)", () => {
    const corrinM = applyCorrinBuild(charactersById['corrin_m'], { boon: null, bane: null, talentClass: 'Samurai' })
    const hana = charactersById['hana'] // Samurai/Shrine Maiden
    expect(getSealReclassClass(corrinM, hana)).toBe('Monk')
  })

  it('resolves two different partners who share the same default independently, each to their own fallback, when both collide with a shared Talent', () => {
    const corrinM = applyCorrinBuild(charactersById['corrin_m'], { boon: null, bane: null, talentClass: 'Samurai' })
    const hinata = charactersById['hinata'] // Samurai/Oni Savage
    expect(getSealReclassClass(corrinM, hinata)).toBe('Oni Savage')
  })

  it('cascades to the parallel-class substitute when even the fallback is redundant with a locked partner (Corrin Talent = Sky Knight, Azura)', () => {
    const corrinM = applyCorrinBuild(charactersById['corrin_m'], { boon: null, bane: null, talentClass: 'Sky Knight' })
    const azura = charactersById['azura'] // Songstress[locked]/Sky Knight -> parallel: Troubadour
    expect(getSealReclassClass(corrinM, azura)).toBe('Troubadour')
  })

  it("corrects Monk/Shrine Maiden to the RECEIVING partner's own gender, not the giver's — not just Corrin, any Monk/Shrine Maiden holder", () => {
    const azama = charactersById['azama'] // Monk/Apothecary
    const felicia = charactersById['felicia'] // female, unrelated class set
    expect(getSealReclassClass(felicia, azama)).toBe('Shrine Maiden')

    const sakura = charactersById['sakura'] // Shrine Maiden/Sky Knight
    const silas = charactersById['silas'] // male, unrelated class set
    expect(getSealReclassClass(silas, sakura)).toBe('Monk')
  })

  it('grants nothing when marrying Corrin before a Talent has been picked, instead of falling back to the locked Nohr Prince(ss)', () => {
    const laslow = charactersById['laslow']
    const corrinF = charactersById['corrin_f'] // raw data, no Talent applied
    expect(getSealReclassClass(laslow, corrinF)).toBeUndefined()
  })
})

describe('isCorrinWithoutTalent', () => {
  it('is true for raw Corrin data before a Talent is applied', () => {
    expect(isCorrinWithoutTalent(charactersById['corrin_m'])).toBe(true)
    expect(isCorrinWithoutTalent(charactersById['corrin_f'])).toBe(true)
  })

  it('is false once a Talent has been applied', () => {
    const corrinM = applyCorrinBuild(charactersById['corrin_m'], { boon: null, bane: null, talentClass: 'Cavalier' })
    expect(isCorrinWithoutTalent(corrinM)).toBe(false)
  })

  it('is false for a non-Corrin character', () => {
    expect(isCorrinWithoutTalent(charactersById['laslow'])).toBe(false)
  })
})

describe('getClassLine', () => {
  it('returns the base class followed by both its promotions', () => {
    const line = getClassLine('Cavalier')
    expect(line.map((c) => c.name)).toEqual(['Cavalier', 'Paladin', 'Great Knight'])
  })

  it('returns empty for an unregistered class name', () => {
    expect(getClassLine('Not A Real Class')).toEqual([])
  })

  it('returns empty for undefined', () => {
    expect(getClassLine(undefined)).toEqual([])
  })

  it("locks Corrin's Nohr Prince(ss) promotions to Hoshido Noble only on Birthright", () => {
    const line = getClassLine('Nohr Prince(ss)', 'Birthright')
    expect(line.map((c) => c.name)).toEqual(['Nohr Prince(ss)', 'Hoshido Noble'])
  })

  it("locks Corrin's Nohr Prince(ss) promotions to Nohr Noble only on Conquest", () => {
    const line = getClassLine('Nohr Prince(ss)', 'Conquest')
    expect(line.map((c) => c.name)).toEqual(['Nohr Prince(ss)', 'Nohr Noble'])
  })

  it('grants BOTH Nohr Prince(ss) promotions on Revelation', () => {
    const line = getClassLine('Nohr Prince(ss)', 'Revelation')
    expect(line.map((c) => c.name)).toEqual(['Nohr Prince(ss)', 'Nohr Noble', 'Hoshido Noble'])
  })

  it('grants both promotions when no route is specified (defaults to the full promotesTo list)', () => {
    const line = getClassLine('Nohr Prince(ss)')
    expect(line.map((c) => c.name)).toEqual(['Nohr Prince(ss)', 'Nohr Noble', 'Hoshido Noble'])
  })

  it('leaves an ordinary class (no route-locked promotions) unaffected by a route argument', () => {
    const line = getClassLine('Cavalier', 'Birthright')
    expect(line.map((c) => c.name)).toEqual(['Cavalier', 'Paladin', 'Great Knight'])
  })
})

describe('getOwnClassTree', () => {
  it("returns Laslow's base (Mercenary/Hero/Bow Knight) and secondary (Ninja/Master Ninja/Mechanist) lines", () => {
    const laslow = charactersById['laslow']
    const tree = getOwnClassTree(laslow)
    expect(tree.base.map((c) => c.name)).toEqual(['Mercenary', 'Hero', 'Bow Knight'])
    expect(tree.secondary.map((c) => c.name)).toEqual(['Ninja', 'Master Ninja', 'Mechanist'])
  })

  it("locks Corrin's own class tree promotions to the active route", () => {
    const corrinM = charactersById['corrin_m']
    const tree = getOwnClassTree(corrinM, 'Birthright')
    expect(tree.base.map((c) => c.name)).toEqual(['Nohr Prince(ss)', 'Hoshido Noble'])
  })
})

describe('weaponRankBonus', () => {
  it('returns the correct bonus text for a sword-category weapon at each rank', () => {
    expect(weaponRankBonus('Sword', 'C')).toBe('Atk +1')
    expect(weaponRankBonus('Sword', 'S')).toBe('Atk +4, Hit +5')
  })

  it('returns undefined for E/D rank (no bonus yet)', () => {
    expect(weaponRankBonus('Sword', 'E')).toBeUndefined()
    expect(weaponRankBonus('Sword', 'D')).toBeUndefined()
  })

  it('gives Songstress the correct Lance C-rank bonus', () => {
    expect(weaponRankBonus('Lance', 'C')).toBe('Atk +1')
  })
})

describe('classSkillsForGender', () => {
  it("shows only Gentilhomme (not Demoiselle) for a male unit's Troubadour line", () => {
    const troubadour = classesByName['Troubadour']
    expect(classSkillsForGender(troubadour, 'M')).toEqual(['resistance_2', 'gentilhomme'])
  })

  it("shows only Demoiselle (not Gentilhomme) for a female unit's Troubadour line", () => {
    const troubadour = classesByName['Troubadour']
    expect(classSkillsForGender(troubadour, 'F')).toEqual(['resistance_2', 'demoiselle'])
  })

  it('leaves an ordinary class (no gendered skill pair) unaffected', () => {
    const cavalier = classesByName['Cavalier']
    expect(classSkillsForGender(cavalier, 'M')).toEqual(cavalier.classSkills)
  })
})
