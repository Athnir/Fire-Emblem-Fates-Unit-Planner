import { classes, classesById, classesByName } from '../data/classes'
import { skillsById } from '../data/skills'
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
 * Each locked class's own skills, plus any promotion reachable ONLY through that locked class (so
 * equally unreachable by anyone but its holder) — per classes.ts: Nohr Noble/Hoshido Noble only
 * promote from Nohr Prince(ss); Nine-Tails only from Kitsune; Wolfssegner only from Wolfskin.
 * Villager's own promotions (Merchant, Master of Arms) are excluded here since both are also
 * reachable via Apothecary/Samurai/Oni Savage, so they're not actually locked. Keyed by the Gen 1
 * (non-child) character id(s) who still legitimately have these as their own Class Set — everyone
 * else in Gen 1 can never reach them: not via their own class, not via Partner/Friendship Seal (see
 * LOCKED_STARTING_CLASSES), and not via inheritance, since Gen 1 units have no parent to inherit
 * from. Children are untouched by this — a child's fixed parent can still contribute one of these
 * (e.g. Mozu's Villager to her own child) even though a Seal never can, and separately, the
 * recruit-time "inherit one skill from a parent" mechanic can hand a child any equipped skill of
 * theirs regardless of class (e.g. Shigure can still end up with a Songstress skill from Azura).
 */
const GEN1_LOCKED_CLASS_SKILLS: { holderIds: string[]; skillIds: string[] }[] = [
  { holderIds: ['corrin_m', 'corrin_f'], skillIds: ['nobility', 'dragon_fang', 'draconic_hex', 'nohrian_trust', 'dragon_ward', 'hoshidan_unity'] },
  { holderIds: ['azura'], skillIds: ['luck_4', 'inspiring_song', 'voice_of_peace', 'foreign_princess'] },
  { holderIds: ['mozu'], skillIds: ['aptitude', 'underdog'] },
  { holderIds: ['kaden', 'keaton'], skillIds: ['beastbane', 'grisly_wound'] },
  { holderIds: ['kaden'], skillIds: ['evenhanded', 'even_better'] },
  { holderIds: ['keaton'], skillIds: ['odd_shaped', 'better_odds'] },
]

/**
 * DLC/Amiibo skill id -> every gender that can actually reach it via a real class — the only
 * classes with a genderLock at all (Ballistician/Witch among DLC; Lodestar/Vanguard/Great
 * Lord/Grandmaster among Amiibo). A skill shared between an M-only and an F-only class (e.g.
 * Charm: Lodestar and Great Lord) ends up reachable by both, same as a skill with no genderLocked
 * source at all (e.g. anything from Dread Fighter/Dark Falcon).
 */
const DLC_AMIIBO_SKILL_GENDERS: Record<string, Set<Gender>> = (() => {
  const map: Record<string, Set<Gender>> = {}
  for (const cls of classes) {
    if (!cls.isDlcClass && !cls.isAmiibo) continue
    const reachableGenders: Gender[] = cls.genderLock ? [cls.genderLock] : ['M', 'F']
    for (const skillId of cls.classSkills) {
      const set = (map[skillId] ??= new Set())
      reachableGenders.forEach((g) => set.add(g))
    }
  }
  return map
})()

/**
 * True if `gender` can obtain this skill some way — a genuinely gender-agnostic Scroll item
 * (Skill.isItem, e.g. Aether — an Amiibo-scan reward same as the standalone Taker skills, despite
 * ALSO being Vanguard's class skill), a same-gender DLC/Amiibo class, or simply not being a
 * DLC/Amiibo skill at all (nothing here restricts it).
 */
function isReachableForGender(skillId: string, gender: Gender): boolean {
  if (skillsById[skillId]?.isItem) return true
  const genders = DLC_AMIIBO_SKILL_GENDERS[skillId]
  return !genders || genders.has(gender)
}

/**
 * Skill ids a Gen 1 (non-child) character can never actually obtain, for pruning out of the Skill
 * Planner's General Skill Pool. Three sources: locked-class skills nobody outside their holder(s)
 * can reach (see GEN1_LOCKED_CLASS_SKILLS); whichever half of Troubadour's gendered
 * Gentilhomme/Demoiselle skill pair doesn't match their own gender; and any DLC/Amiibo skill whose
 * every real-class source is gender-locked to the opposite gender AND has no gender-agnostic item
 * route either (e.g. Witch's Brew — Witch-only, F-locked, no Scroll-item route — stays unreachable
 * for a male unit, unlike Aether, which does have one). A child could still end up with any of
 * these via the recruit-time "inherit one skill from a parent" mechanic or an opposite-gender
 * Troubadour-access parent (see classSkillsForGender), but a Gen 1 unit has no parent to inherit
 * from, so their own Class Set and Partner/Friendship Seal (which always corrects to the
 * RECIPIENT's own gender, never the giver's) are the only paths — always landing on their own
 * gender. Corrin is exempt from BOTH gendered rules: this app models Corrin as two separate
 * character entries (corrin_m/corrin_f) sharing one build even though only one is ever real in a
 * given playthrough (same reasoning as CORRIN_TALENT_CLASSES offering both Monk and Shrine Maiden
 * regardless of which Corrin is active), so nothing gender-based gets pruned based on which entry
 * you happen to be viewing. Kana is NOT given this same exemption despite being a similar
 * split-by-gender pair — the in-game Logbook treats kana_m/kana_f as two distinct slots that can't
 * trade with each other the way Corrin's single shared slot can — but this needs no special
 * handling here anyway, since Kana is a child and already exempt via the isChild check above.
 */
export function gen1UnreachableSkillIds(character: Character): string[] {
  if (character.isChild) return []
  const lockedClassSkills = GEN1_LOCKED_CLASS_SKILLS.filter(
    (entry) => !entry.holderIds.includes(character.id),
  ).flatMap((entry) => entry.skillIds)
  const isCorrin = character.id === 'corrin_m' || character.id === 'corrin_f'
  if (isCorrin) return lockedClassSkills

  const wrongGenderTroubadourSkill =
    character.gender === 'M' ? 'demoiselle' : character.gender === 'F' ? 'gentilhomme' : undefined
  const wrongGenderDlcAmiiboSkills =
    character.gender === 'M' || character.gender === 'F'
      ? Object.keys(DLC_AMIIBO_SKILL_GENDERS).filter((id) => !isReachableForGender(id, character.gender))
      : []

  return [
    ...lockedClassSkills,
    ...(wrongGenderTroubadourSkill ? [wrongGenderTroubadourSkill] : []),
    ...wrongGenderDlcAmiiboSkills,
  ]
}

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
    // Both of `other`'s classes are now blocked. Prefer the locked default's own dedicated
    // substitute when it has one (Azura's Songstress always cascades to Troubadour specifically,
    // regardless of what her real secondary turned out to be — same fixed rule childCalculator.ts's
    // Azura branch uses). Kana's default (Nohr Prince(ss)) has no such fixed substitute, since her
    // secondary is Corrin's player-chosen Talent rather than fixed data — for her (and anyone else
    // without a fixed-default entry) fall back to mirroring whatever actually collided instead.
    return PARALLEL_CLASS_TABLE[other.startingClass] ?? PARALLEL_CLASS_TABLE[fallback] ?? fallback
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

/** True while Corrin's player-chosen Talent hasn't been picked yet in the Corrin Build panel — the only state where Corrin's own Class Set (or Kana's, which always mirrors it via withKanaTalent) has no second class at all. */
export function isCorrinWithoutTalent(character: Character): boolean {
  const isCorrinOrKana =
    character.id === 'corrin_m' ||
    character.id === 'corrin_f' ||
    character.id === 'kana_m' ||
    character.id === 'kana_f'
  return isCorrinOrKana && !character.secondaryClass
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
