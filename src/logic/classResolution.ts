import { classesById, classesByName } from '../data/classes'
import { PARALLEL_CLASS_TABLE, type Character, type ClassData, type Gender, type Route } from '../data/types'

/**
 * Classes that are personal to one character (or character group) and can never be reclassed into
 * directly via Partner Seal or Friendship Seal. Verified against Serenes Forest's Class-Changing
 * page: there is no mechanical distinction between the two seals here — a partner/friend whose
 * Class Set default is one of these always lends their SECOND Class Set class instead, never the
 * locked class itself (e.g. a Friendship Seal on Keaton grants Fighter, his 2nd set, not Wolfskin).
 */
const LOCKED_STARTING_CLASSES = new Set(['Nohr Prince(ss)', 'Songstress', 'Villager', 'Kitsune', 'Wolfskin'])

/**
 * Monk (male) and Shrine Maiden (female) are mechanically identical, split only by a gendered
 * display name — every real character's own class data is already baked in correctly for their
 * own gender, so this only ever needs correcting for Corrin's Talent, which is shared between
 * corrin_m/corrin_f (one build covers either) and so isn't gender-locked at the source the way
 * everyone else's is. Applied at each point Corrin's Talent reaches a specific recipient: Corrin's
 * own display (corrinBuild.ts), Kana's Nohr-Prince(ss)-collision fallback (childCalculator.ts),
 * and Corrin's Partner Seal spouse (getSealReclassClass below).
 */
const GENDERED_CLASS_PAIR: Record<string, string> = {
  Monk: 'Shrine Maiden',
  'Shrine Maiden': 'Monk',
}

export function correctGenderedClass(className: string, gender: Gender): string {
  const partner = GENDERED_CLASS_PAIR[className]
  if (!partner || gender === 'both') return className
  const isFemaleClass = className === 'Shrine Maiden'
  return (gender === 'F') === isFemaleClass ? className : partner
}

/**
 * Troubadour's class skills list BOTH Gentilhomme (male) and Demoiselle (female) — the same
 * gendered-flavor-name oddity as Monk/Shrine Maiden, but at the SKILL level within one shared
 * class rather than a class-name split — since either is possible depending on who inherits the
 * class, not just whoever's own Class Set it natively belongs to. Only the gender-correct one is a
 * real skill slot for a specific unit; the other stays pickable from the general skill pool
 * instead (e.g. a unit who inherited Troubadour access from an opposite-gender source).
 */
/** A class's real skill-slot ids for a given unit's gender — identical to `cls.classSkills` except
 * for a class (currently only Troubadour) that lists both members of a gendered skill pair. */
export function classSkillsForGender(cls: ClassData, gender: Gender): string[] {
  const hasGenderedPair = cls.classSkills.includes('gentilhomme') && cls.classSkills.includes('demoiselle')
  if (!hasGenderedPair || gender === 'both') return cls.classSkills
  const wrongVariant = gender === 'M' ? 'demoiselle' : 'gentilhomme'
  return cls.classSkills.filter((id) => id !== wrongVariant)
}

/**
 * The class a character gains access to (via Partner Seal, once married, or Friendship Seal, at
 * A+ support) by pairing with `other`. Per Serenes Forest's Class-Changing page: you get `other`'s
 * default (first) Class Set class, UNLESS that default is personal/locked (see
 * LOCKED_STARTING_CLASSES) or already redundant with a class `self` already has — either way you
 * get their second Class Set class instead. Both conditions resolve identically for Partner Seal
 * and Friendship Seal.
 *
 * This mostly only bites in practice for Corrin (2-class units elsewhere rarely collide even once,
 * and this app's multi-class picker can offer Corrin dozens of Friendship Seal partners at once —
 * see friendshipClassSources in multiClass.ts). If even the SECOND Class Set class is redundant too
 * (only reachable when self's own second class happens to match a locked partner's own second
 * class, e.g. Corrin's Talent set to Sky Knight paired with Azura, whose own second class is also
 * Sky Knight) it cascades one step further into the same parallel-class substitute table normal
 * child-inheritance already falls back to for a fully-collided parent (PARALLEL_CLASS_TABLE /
 * normalParentContribution in childCalculator.ts) — e.g. Corrin ends up with Troubadour (Songstress's
 * parallel), the same substitute Shigure (Azura's own child) already gets from her unconditionally.
 * A normal (non-locked) partner's second class never needs this cascade in practice, since it would
 * require `self` to independently collide with BOTH of that partner's classes at once, and no
 * character in this roster has enough of their own classes for that to happen outside Corrin+a
 * locked partner.
 */
export function getSealReclassClass(self: Character, other: Character): string | undefined {
  const ownClasses = [self.startingClass, self.secondaryClass, self.tertiaryClass].filter(
    (n): n is string => Boolean(n),
  )
  const locked = LOCKED_STARTING_CLASSES.has(other.startingClass)
  const redundantWithDefault = ownClasses.includes(other.startingClass)
  const result = (() => {
    if (!locked && !redundantWithDefault) return other.startingClass
    // Locked/redundant defaults fall back to the second Class Set class instead — but that
    // fallback doesn't exist for Corrin until a Talent is picked (their Class Set has no second
    // class yet), so there's nothing to grant at all. Without this check the `?? other.startingClass`
    // that used to sit here would silently hand back the locked Nohr Prince(ss) itself.
    if (!other.secondaryClass) return undefined
    const fallback = other.secondaryClass
    if (!ownClasses.includes(fallback)) return fallback
    return PARALLEL_CLASS_TABLE[other.startingClass] ?? fallback
  })()
  if (!result) return undefined

  // Whoever actually receives a class via Partner/Friendship Seal needs Monk/Shrine Maiden
  // corrected to THEIR own gender, not the giver's — matters most for Corrin (whose Talent is
  // shared between corrin_m/corrin_f, so it isn't gender-locked at the source the way everyone
  // else's own class data already is), but applies just as well any time a Monk (Azama, etc.) or
  // Shrine Maiden (Sakura, etc.) holder passes it to an opposite-gender partner. This also
  // transparently handles the game's two same-sex exceptions (Corrin M x Niles, Corrin F x
  // Rhajat): since the correction always targets the recipient's real gender rather than assuming
  // the opposite of the giver's, those cases just don't need a flip at all.
  return correctGenderedClass(result, self.gender)
}

/** True while Corrin's player-chosen Talent (their Class Set's second class) hasn't been picked yet in the Corrin Build panel — the only state where Corrin's own Class Set has no second class at all. */
export function isCorrinWithoutTalent(character: Character): boolean {
  return (character.id === 'corrin_m' || character.id === 'corrin_f') && !character.secondaryClass
}

/**
 * A class plus its full promotion line (own skills first, then each promotion in turn). If a
 * route is given and the class has route-locked promotions (only Corrin's Nohr Prince(ss)), only
 * the promotions available on that route are included — e.g. Birthright excludes Nohr Noble.
 */
export function getClassLine(className: string | undefined, route?: Route): ClassData[] {
  if (!className) return []
  const base = classesByName[className]
  if (!base) return []
  const allowedIds = route ? base.routeLockedPromotions?.[route] : undefined
  const promotionIds = allowedIds ?? base.promotesTo ?? []
  const promotions = promotionIds
    .map((id) => classesById[id])
    .filter((c): c is ClassData => Boolean(c))
  return [base, ...promotions]
}

/** Every class reachable through a character's own class set — their default + secondary (+ tertiary, for the rare 3-class Standard Set), each with their promotions. */
export function getOwnClassTree(
  character: Character,
  route?: Route,
): { base: ClassData[]; secondary: ClassData[]; tertiary: ClassData[] } {
  return {
    base: getClassLine(character.startingClass, route),
    secondary: getClassLine(character.secondaryClass, route),
    tertiary: getClassLine(character.tertiaryClass, route),
  }
}

/**
 * The level at which each of a class's skills unlocks, in classSkills order. Not stored per-class
 * since it follows a fixed pattern by class shape, verified against Serenes Forest's per-class
 * skill-learned tables: base classes learn their 2 skills at Lv1/Lv10; promoted classes at
 * Lv5/Lv15; the 4-skill classes (Songstress, and all DLC/Amiibo classes) at Lv1/Lv10/Lv25/Lv35.
 */
export function skillLevelsFor(cls: ClassData): number[] {
  if (cls.classSkills.length === 4) return [1, 10, 25, 35]
  return cls.tier === 'base' ? [1, 10] : [5, 15]
}

/** Which of the 4 weapon-rank bonus tables a weapon type falls into, from Serenes Forest's Weapon Rank Bonus page. */
const WEAPON_RANK_CATEGORY: Record<string, 'sword' | 'lance-like' | 'axe' | 'staff'> = {
  Sword: 'sword', Katana: 'sword', Dagger: 'sword', Shuriken: 'sword',
  Lance: 'lance-like', Naginata: 'lance-like', Bow: 'lance-like', Yumi: 'lance-like', Tome: 'lance-like',
  Scroll: 'lance-like', Dragonstone: 'lance-like', Beaststone: 'lance-like',
  Axe: 'axe', Club: 'axe',
  Staff: 'staff', Rod: 'staff',
}

/** Rank-bonus text per weapon category, from Serenes Forest's Weapon Rank Bonus table (E/D grant nothing). */
const RANK_BONUS_TABLE: Record<'sword' | 'lance-like' | 'axe' | 'staff', Partial<Record<'C' | 'B' | 'A' | 'S', string>>> = {
  sword: { C: 'Atk +1', B: 'Atk +2', A: 'Atk +3', S: 'Atk +4, Hit +5' },
  'lance-like': { C: 'Atk +1', B: 'Atk +1, Hit +5', A: 'Atk +2, Hit +5', S: 'Atk +3, Hit +10' },
  axe: { C: 'Hit +5', B: 'Hit +10', A: 'Atk +1, Hit +10', S: 'Atk +2, Hit +15' },
  staff: { C: 'Recovery +1', B: 'Recovery +1, Hit +5', A: 'Recovery +2, Hit +5', S: 'Recovery +3, Hit +10' },
}

/** The stat bonus text a weapon rank grants, or undefined for E/D rank (no bonus) or an unrecognized weapon type. */
export function weaponRankBonus(weaponType: string, rank: string): string | undefined {
  const category = WEAPON_RANK_CATEGORY[weaponType]
  if (!category) return undefined
  return RANK_BONUS_TABLE[category][rank as 'C' | 'B' | 'A' | 'S']
}
