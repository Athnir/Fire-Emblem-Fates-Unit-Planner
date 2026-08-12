export type Route = 'Birthright' | 'Conquest' | 'Revelation' | 'all'
export type Gender = 'M' | 'F' | 'both'

export interface StatBlock {
  hp: number
  str: number
  mag: number
  skl: number
  spd: number
  lck: number
  def: number
  res: number
}

export const STAT_KEYS: (keyof StatBlock)[] = [
  'hp',
  'str',
  'mag',
  'skl',
  'spd',
  'lck',
  'def',
  'res',
]

/**
 * Which characters can occupy each parent slot for this child. Most named children have exactly
 * one FIXED parent (e.g. Siegbert's father is always Xander) — that side lists a single id. The
 * other side is typically omitted/empty, meaning "any valid spouse of the fixed parent" (derive
 * eligible options from supports.ts at pairing time, not from a hardcoded list here).
 */
export interface PossibleParents {
  father?: string[]
  mother?: string[]
}

export interface Character {
  id: string
  name: string
  gender: Gender
  /** Routes this character is recruitable/available in; ['all'] means all three. */
  route: Route[]
  /** Default class in this character's Class Set — used by class-inheritance rules, may differ from joinClass. */
  startingClass: string
  /** Secondary/alternate class in this character's class set (used by class inheritance rules). */
  secondaryClass?: string
  /** Third class in this character's Class Set, for the rare characters with a 3-class Standard Set (currently only Fuga: Samurai/Oni Savage/Monk). */
  tertiaryClass?: string
  /** Personal battle class this character actually joins as, if different from startingClass (display/flavor only, e.g. Xander joins as a Paladin-tier unit despite his Class Set default being Cavalier). */
  joinClass?: string
  /** The level baseStats/growthRates are anchored to, for the roster level-projection tool — per route, since join level (and occasionally join class/tier) genuinely differs by route for many characters. Falls back to 1 when a route has no entry. Children only: the earliest chapter they can actually be recruited on each route (varies with their fixed parent's own recruitment/support timing, never before Ch8) — their level at that point (and any later chapter) is derived from the shared story level-curve (src/data/childLeveling.ts), not stored directly. */
  startingLevel?: Partial<Record<Route, number>>
  unlockChapter?: Partial<Record<Route, number>>
  baseStats: StatBlock
  growthRates: StatBlock
  statCaps: StatBlock
  /** Max-stat modifiers relative to class base caps (used in child max-stat formula). */
  maxStatModifiers: StatBlock
  personalSkill: string
  supportOptions: string[]
  canMarry: string[]
  isChild: boolean
  possibleParents?: PossibleParents
  /** A parent "has" dragon vein access if royal, or manually toggled on for First Blood use. */
  isRoyal?: boolean
  /** Manual per-character toggle for First Blood item use (grants dragon vein access even if non-royal). */
  hasFirstBlood?: boolean
}

export type WeaponRankLetter = 'E' | 'D' | 'C' | 'B' | 'A' | 'S'

export interface WeaponRank {
  type: string
  rank: WeaponRankLetter
}

/** Flat combat bonuses some promoted classes innately grant, verified against Serenes Forest's Class Bonus table. */
export interface ClassCombatBonus {
  hit?: number
  avoid?: number
  crit?: number
  dodge?: number
}

/** Stat/movement bonus this class grants to whoever it's paired up WITH (as the support partner), not itself. */
export type PairUpBonus = Omit<StatBlock, 'hp'> & { mov: number }

export interface ClassData {
  id: string
  name: string
  tier: 'base' | 'promoted'
  promotesFrom?: string[]
  promotesTo?: string[]
  /**
   * Overrides promotesTo per route, for classes whose promotion options depend on which route
   * you're playing (only Corrin's Nohr Prince(ss): Hoshido Noble requires Birthright/Revelation,
   * Nohr Noble requires Conquest/Revelation — only Revelation grants both).
   */
  routeLockedPromotions?: Partial<Record<Route, string[]>>
  weaponTypes: string[]
  classSkills: string[]
  statModifiers: StatBlock
  /** This class's own maximum stat table (Serenes Forest's maximum-stats pages) — add the character's personal maxStatModifiers on top to get their real cap in this class. */
  maxStats: StatBlock
  /** This class's growth-rate contribution (Serenes Forest's per-side Growth Rates pages) — add the character's own personal growthRates on top to get their real growth % in this class. */
  growthModifiers: StatBlock
  movementType: string
  /** Villager cannot be passed via Partner/Friendship Seal reclass despite being inheritable normally. */
  passableViaSeal?: boolean
  /** Numeric movement stat (doesn't grow with level — fixed by class, plus flat skill/item sources). */
  movement: number
  /** Every weapon type this class can wield, with its rank (E through S). */
  weaponRanks?: WeaponRank[]
  combatBonus?: ClassCombatBonus
  pairUpBonus: PairUpBonus
  /** True for the 4 Amiibo-exclusive classes (Lodestar, Vanguard, Great Lord, Grandmaster). */
  isAmiibo?: boolean
  /** True for the 4 DLC map-reward classes (Dread Fighter, Dark Falcon, Ballistician, Witch). */
  isDlcClass?: boolean
  /** Restricts this class to one gender, for the gender-locked DLC/Amiibo classes (e.g. Witch is female-only). */
  genderLock?: 'M' | 'F'
}

export interface Skill {
  id: string
  name: string
  description: string
  iconId: string
  isDlc?: boolean
  /** Amiibo-exclusive class skill (Lodestar/Vanguard/Great Lord/Grandmaster), unlocked via Amiibo scroll rather than a DLC map. */
  isAmiibo?: boolean
  /** Personal skills are permanently locked to one specific character in-game and can never be obtained by anyone else. */
  isPersonal?: boolean
  /** Obtained only via an item (an Amiibo-scan reward), never tied to any class — normally the "source" a skill's row shows is the class that teaches it; these have none. */
  isItem?: boolean
}

export interface Weapon {
  id: string
  name: string
  type: string
  iconId: string
}

export interface SupportPair {
  characterA: string
  characterB: string
  maxRank: 'S' | 'A' | 'friendship-only' | 'not-available'
  route: Route[]
}

/** Mother's default class -> parallel class substituted when both of the mother's classes are already in the child's set. */
export const PARALLEL_CLASS_TABLE: Record<string, string | null> = {
  Songstress: 'Troubadour',
  Cavalier: 'Ninja',
  Ninja: 'Cavalier',
  Knight: 'Spear Fighter',
  'Spear Fighter': 'Knight',
  Fighter: 'Oni Savage',
  'Oni Savage': 'Fighter',
  Mercenary: 'Samurai',
  Samurai: 'Mercenary',
  Outlaw: 'Archer',
  Archer: 'Outlaw',
  'Dark Mage': 'Diviner',
  Diviner: 'Dark Mage',
  'Wyvern Rider': 'Sky Knight',
  'Sky Knight': 'Wyvern Rider',
  Villager: 'Apothecary',
  Apothecary: null,
  Troubadour: null,
  Monk: null,
  'Shrine Maiden': null,
}
