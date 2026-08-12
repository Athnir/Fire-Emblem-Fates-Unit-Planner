import type { ClassCombatBonus, ClassData, PairUpBonus, StatBlock, WeaponRank, WeaponRankLetter } from './types'

function s(hp: number, str: number, mag: number, skl: number, spd: number, lck: number, def: number, res: number): StatBlock {
  return { hp, str, mag, skl, spd, lck, def, res }
}

/** Pair-up bonus this class grants its partner: Str, Mag, Skl, Spd, Lck, Def, Res, Mov. */
function pu(str: number, mag: number, skl: number, spd: number, lck: number, def: number, res: number, mov: number): PairUpBonus {
  return { str, mag, skl, spd, lck, def, res, mov }
}

function wr(type: string, rank: WeaponRankLetter): WeaponRank {
  return { type, rank }
}

/**
 * Mainline Nohrian + Hoshidan classes (base + promoted), sourced from Serenes Forest.
 * NPC-only "other" classes (Lord, Faceless, dragon bosses, etc.) are intentionally omitted — not
 * reachable through normal marriage/inheritance play. DLC and Amiibo classes ARE included (see
 * bottom of this file) since they're real reclass options for the Skill Planner (and, via the Unit
 * Planner's own unlock toggle, Projected Stats too) even though they never appear as anyone's
 * starting/join class for the inheritance formula.
 *
 * statModifiers/movement/weaponRanks(full E-S)/combatBonus/pairUpBonus verified against Serenes
 * Forest's per-class Base Stats (Mov column), Weapon Rank, Class Bonus, and Pair Up Bonus tables.
 * growthModifiers verified against Serenes Forest's per-side Growth Rates pages (DLC/Amiibo
 * classes via Gamer Guides' class listings, since Serenes doesn't have a dedicated page for those)
 * — add the character's own personal growthRates on top to get their real growth % in a class.
 * Skill level-learned thresholds aren't stored per-class — they follow a fixed pattern by tier
 * (see skillLevelsFor in classResolution.ts): base classes learn at Lv1/Lv10, promoted classes at
 * Lv5/Lv15, and the 4-skill classes (Songstress, DLC, Amiibo) at Lv1/Lv10/Lv25/Lv35.
 */
export const classes: ClassData[] = [
  // ---- Nohr base ----
  {
    id: 'nohr_prince_princess', name: 'Nohr Prince(ss)', tier: 'base',
    promotesTo: ['nohr_noble', 'hoshido_noble'],
    // Corrin only has access to BOTH noble promotions on Revelation — Birthright locks them to
    // Hoshido Noble only, Conquest to Nohr Noble only (verified against Serenes Forest's Corrin
    // class-change/promotion notes).
    routeLockedPromotions: {
      Birthright: ['hoshido_noble'],
      Conquest: ['nohr_noble'],
      Revelation: ['nohr_noble', 'hoshido_noble'],
      all: ['nohr_noble', 'hoshido_noble'],
    },
    weaponTypes: ['Sword', 'Dragonstone'],
    classSkills: ['nobility', 'dragon_fang'], statModifiers: s(17, 7, 3, 4, 5, 2, 5, 2), maxStats: s(40, 23, 17, 19, 21, 22, 21, 19),
    growthModifiers: s(15, 15, 10, 10, 10, 10, 10, 5), movementType: 'infantry',
    movement: 5, weaponRanks: [wr('Sword', 'B'), wr('Dragonstone', 'B')], pairUpBonus: pu(2, 0, 1, 1, 2, 0, 0, 0),
  },
  {
    id: 'cavalier', name: 'Cavalier', tier: 'base',
    promotesTo: ['paladin', 'great_knight'], weaponTypes: ['Sword', 'Lance'],
    classSkills: ['elbow_room', 'shelter'], statModifiers: s(17, 6, 0, 5, 5, 3, 5, 3), maxStats: s(40, 22, 15, 21, 20, 24, 22, 21),
    growthModifiers: s(10, 15, 0, 10, 10, 15, 10, 5), movementType: 'cavalry',
    movement: 7, weaponRanks: [wr('Sword', 'B'), wr('Lance', 'B')], pairUpBonus: pu(2, 0, 0, 0, 0, 2, 2, 0),
  },
  {
    id: 'knight', name: 'Knight', tier: 'base',
    promotesTo: ['general', 'great_knight'], weaponTypes: ['Lance'],
    classSkills: ['defence_2', 'natural_cover'], statModifiers: s(19, 8, 0, 5, 3, 3, 8, 1), maxStats: s(45, 24, 15, 22, 17, 22, 26, 18),
    growthModifiers: s(20, 20, 0, 15, 5, 10, 20, 0), movementType: 'armored',
    movement: 4, weaponRanks: [wr('Lance', 'A')], pairUpBonus: pu(2, 0, 0, 0, 0, 4, 0, 0),
  },
  {
    id: 'fighter', name: 'Fighter', tier: 'base',
    promotesTo: ['berserker', 'hero'], weaponTypes: ['Axe'],
    classSkills: ['hp_5', 'gamble'], statModifiers: s(19, 7, 0, 6, 6, 2, 4, 1), maxStats: s(45, 25, 15, 23, 22, 21, 19, 18),
    growthModifiers: s(20, 20, 0, 15, 15, 5, 5, 0), movementType: 'infantry',
    movement: 5, weaponRanks: [wr('Axe', 'B')], pairUpBonus: pu(4, 0, 0, 2, 0, 0, 0, 0),
  },
  {
    id: 'mercenary', name: 'Mercenary', tier: 'base',
    promotesTo: ['hero', 'bow_knight'], weaponTypes: ['Sword'],
    classSkills: ['good_fortune', 'strong_riposte'], statModifiers: s(17, 5, 0, 7, 6, 2, 5, 2), maxStats: s(40, 22, 15, 24, 22, 20, 21, 19),
    growthModifiers: s(10, 15, 0, 20, 15, 5, 10, 5), movementType: 'infantry',
    movement: 5, weaponRanks: [wr('Sword', 'B')], pairUpBonus: pu(0, 0, 2, 3, 0, 1, 0, 0),
  },
  {
    id: 'outlaw', name: 'Outlaw', tier: 'base',
    promotesTo: ['bow_knight', 'adventurer'], weaponTypes: ['Bow'],
    classSkills: ['locktouch', 'movement_1'], statModifiers: s(16, 3, 1, 4, 8, 1, 2, 4), maxStats: s(35, 19, 18, 20, 24, 18, 17, 22),
    growthModifiers: s(0, 10, 5, 10, 20, 0, 0, 20), movementType: 'infantry',
    movement: 5, weaponRanks: [wr('Bow', 'B')], pairUpBonus: pu(0, 0, 0, 2, 0, 0, 2, 1),
  },
  {
    id: 'wyvern_rider', name: 'Wyvern Rider', tier: 'base',
    promotesTo: ['wyvern_lord', 'malig_knight'], weaponTypes: ['Axe'],
    classSkills: ['strength_2', 'lunge'], statModifiers: s(17, 6, 0, 5, 4, 2, 7, 0), maxStats: s(40, 22, 17, 21, 20, 19, 24, 15),
    growthModifiers: s(10, 15, 5, 10, 10, 5, 20, 0), movementType: 'flying',
    movement: 7, weaponRanks: [wr('Axe', 'B')], pairUpBonus: pu(3, 0, 0, 0, 0, 3, 0, 0),
  },
  {
    id: 'dark_mage', name: 'Dark Mage', tier: 'base',
    promotesTo: ['sorcerer', 'dark_knight'], weaponTypes: ['Tome'],
    classSkills: ['heartseeker', 'malefic_aura'], statModifiers: s(16, 0, 6, 3, 3, 1, 3, 5), maxStats: s(35, 19, 24, 16, 19, 18, 19, 22),
    growthModifiers: s(0, 10, 20, 0, 10, 0, 5, 10), movementType: 'infantry',
    movement: 5, weaponRanks: [wr('Tome', 'B')], pairUpBonus: pu(0, 3, 0, 0, 0, 0, 3, 0),
  },
  {
    id: 'troubadour', name: 'Troubadour', tier: 'base',
    promotesTo: ['strategist', 'butler_maid'], weaponTypes: ['Staff'],
    // Both listed (not the old combined gentilhomme_demoiselle placeholder) — which one a unit
    // actually learns natively is gender-locked in-game, but inheritance can hand a unit the
    // other one too, so the planner shouldn't stop someone from selecting both.
    classSkills: ['resistance_2', 'gentilhomme', 'demoiselle'], statModifiers: s(15, 0, 3, 7, 5, 4, 1, 4), maxStats: s(35, 16, 19, 24, 20, 23, 16, 21),
    growthModifiers: s(0, 0, 10, 20, 10, 15, 0, 15), movementType: 'cavalry',
    movement: 7, weaponRanks: [wr('Staff', 'B')], pairUpBonus: pu(0, 2, 0, 0, 2, 0, 2, 0),
  },
  {
    id: 'wolfskin', name: 'Wolfskin', tier: 'base',
    promotesTo: ['wolfssegner'], weaponTypes: ['Beaststone'],
    classSkills: ['odd_shaped', 'beastbane'], statModifiers: s(19, 8, 0, 4, 6, 0, 4, 0), maxStats: s(45, 24, 15, 18, 22, 17, 21, 15),
    growthModifiers: s(20, 20, 0, 5, 15, 5, 10, 0), movementType: 'beast',
    movement: 5, weaponRanks: [wr('Beaststone', 'B')], pairUpBonus: pu(3, 0, 0, 3, 0, 0, 0, 0),
  },

  // ---- Nohr promoted ----
  {
    id: 'nohr_noble', name: 'Nohr Noble', tier: 'promoted', promotesFrom: ['nohr_prince_princess'],
    weaponTypes: ['Sword', 'Tome', 'Dragonstone'], classSkills: ['draconic_hex', 'nohrian_trust'],
    statModifiers: s(18, 8, 6, 4, 7, 2, 6, 6), maxStats: s(60, 32, 31, 28, 32, 27, 29, 32),
    growthModifiers: s(15, 10, 15, 5, 15, 5, 5, 15), movementType: 'infantry',
    movement: 6, weaponRanks: [wr('Sword', 'A'), wr('Tome', 'B'), wr('Dragonstone', 'A')], pairUpBonus: pu(2, 2, 1, 1, 0, 0, 2, 0),
  },
  {
    id: 'paladin', name: 'Paladin', tier: 'promoted', promotesFrom: ['cavalier'],
    weaponTypes: ['Sword', 'Lance'], classSkills: ['defender', 'aegis'],
    statModifiers: s(19, 8, 1, 7, 7, 4, 7, 6), maxStats: s(60, 31, 26, 30, 30, 32, 32, 32),
    growthModifiers: s(10, 15, 0, 10, 10, 15, 10, 10), movementType: 'cavalry',
    movement: 8, weaponRanks: [wr('Sword', 'A'), wr('Lance', 'A')], pairUpBonus: pu(2, 0, 0, 0, 0, 2, 2, 1),
  },
  {
    id: 'great_knight', name: 'Great Knight', tier: 'promoted', promotesFrom: ['cavalier', 'knight'],
    weaponTypes: ['Sword', 'Lance', 'Axe'], classSkills: ['luna', 'armored_blow'],
    statModifiers: s(21, 10, 0, 6, 6, 3, 10, 2), maxStats: s(65, 35, 25, 29, 27, 28, 37, 28),
    growthModifiers: s(20, 20, 0, 10, 5, 5, 20, 0), movementType: 'armored',
    movement: 7, weaponRanks: [wr('Sword', 'B'), wr('Lance', 'A'), wr('Axe', 'B')], pairUpBonus: pu(2, 0, 0, 0, 0, 4, 0, 1),
  },
  {
    id: 'general', name: 'General', tier: 'promoted', promotesFrom: ['knight'],
    weaponTypes: ['Lance', 'Axe'], classSkills: ['wary_fighter', 'pavise'],
    statModifiers: s(22, 11, 0, 7, 3, 4, 12, 3), maxStats: s(70, 38, 25, 32, 25, 32, 40, 30),
    growthModifiers: s(25, 20, 0, 15, 0, 10, 20, 5), movementType: 'armored',
    movement: 5, weaponRanks: [wr('Lance', 'A'), wr('Axe', 'B')], pairUpBonus: pu(3, 0, 0, 0, 0, 5, 0, 0),
  },
  {
    id: 'berserker', name: 'Berserker', tier: 'promoted', promotesFrom: ['fighter'],
    weaponTypes: ['Axe'], classSkills: ['rally_strength', 'axefaire'],
    statModifiers: s(24, 12, 0, 8, 9, 0, 5, 0), maxStats: s(70, 40, 25, 32, 33, 25, 27, 25),
    growthModifiers: s(30, 25, 0, 15, 15, 0, 0, 0), movementType: 'infantry',
    movement: 6, weaponRanks: [wr('Axe', 'S')], combatBonus: { crit: 20, dodge: -5 }, pairUpBonus: pu(5, 0, 0, 3, 0, 0, 0, 0),
  },
  {
    id: 'hero', name: 'Hero', tier: 'promoted', promotesFrom: ['fighter', 'mercenary'],
    weaponTypes: ['Sword', 'Axe'], classSkills: ['sol', 'axebreaker'],
    statModifiers: s(20, 8, 0, 10, 8, 3, 7, 2), maxStats: s(60, 32, 25, 35, 32, 31, 30, 27),
    growthModifiers: s(20, 15, 0, 20, 15, 5, 10, 0), movementType: 'infantry',
    movement: 6, weaponRanks: [wr('Sword', 'A'), wr('Axe', 'B')], pairUpBonus: pu(0, 0, 3, 3, 0, 2, 0, 0),
  },
  {
    id: 'bow_knight', name: 'Bow Knight', tier: 'promoted', promotesFrom: ['mercenary', 'outlaw'],
    weaponTypes: ['Sword', 'Bow'], classSkills: ['rally_skill', 'shurikenbreaker'],
    statModifiers: s(18, 6, 0, 8, 9, 3, 5, 6), maxStats: s(55, 29, 25, 32, 33, 30, 27, 32),
    growthModifiers: s(10, 10, 0, 15, 15, 10, 0, 10), movementType: 'cavalry',
    movement: 8, weaponRanks: [wr('Sword', 'B'), wr('Bow', 'A')], pairUpBonus: pu(0, 0, 3, 3, 0, 0, 0, 1),
  },
  {
    id: 'adventurer', name: 'Adventurer', tier: 'promoted', promotesFrom: ['outlaw'],
    weaponTypes: ['Bow', 'Staff'], classSkills: ['lucky_seven', 'pass'],
    statModifiers: s(17, 4, 6, 6, 10, 2, 3, 8), maxStats: s(50, 27, 31, 27, 34, 27, 25, 34),
    growthModifiers: s(0, 5, 15, 5, 20, 0, 0, 20), movementType: 'infantry',
    movement: 6, weaponRanks: [wr('Bow', 'A'), wr('Tome', 'B')], pairUpBonus: pu(0, 0, 0, 4, 0, 0, 2, 1),
  },
  {
    id: 'wyvern_lord', name: 'Wyvern Lord', tier: 'promoted', promotesFrom: ['wyvern_rider'],
    weaponTypes: ['Lance', 'Axe'], classSkills: ['rally_defence', 'swordbreaker'],
    statModifiers: s(19, 8, 0, 9, 6, 3, 10, 1), maxStats: s(60, 33, 25, 33, 29, 28, 35, 26),
    growthModifiers: s(10, 15, 0, 15, 10, 5, 20, 0), movementType: 'flying',
    movement: 8, weaponRanks: [wr('Sword', 'B'), wr('Axe', 'A')], pairUpBonus: pu(3, 0, 0, 0, 0, 3, 0, 1),
  },
  {
    id: 'malig_knight', name: 'Malig Knight', tier: 'promoted', promotesFrom: ['wyvern_rider'],
    weaponTypes: ['Axe', 'Tome'], classSkills: ['savage_blow', 'trample'],
    statModifiers: s(18, 7, 6, 6, 5, 0, 8, 6), maxStats: s(55, 31, 30, 28, 27, 25, 31, 31),
    growthModifiers: s(0, 15, 15, 10, 5, 0, 10, 15), movementType: 'flying',
    movement: 8, weaponRanks: [wr('Axe', 'A'), wr('Tome', 'B')], pairUpBonus: pu(0, 2, 0, 0, 0, 2, 2, 1),
  },
  {
    id: 'sorcerer', name: 'Sorcerer', tier: 'promoted', promotesFrom: ['dark_mage'],
    weaponTypes: ['Tome'], classSkills: ['vengeance', 'bowbreaker'],
    statModifiers: s(17, 0, 9, 4, 6, 1, 5, 8), maxStats: s(50, 25, 35, 26, 29, 26, 29, 33),
    growthModifiers: s(0, 0, 25, 0, 10, 0, 5, 15), movementType: 'infantry',
    movement: 6, weaponRanks: [wr('Tome', 'S')], combatBonus: { hit: 5, crit: 10, dodge: 5 }, pairUpBonus: pu(0, 5, 0, 0, 0, 0, 3, 0),
  },
  {
    id: 'dark_knight', name: 'Dark Knight', tier: 'promoted', promotesFrom: ['dark_mage'],
    weaponTypes: ['Sword', 'Tome'], classSkills: ['seal_magic', 'lifetaker'],
    statModifiers: s(19, 8, 6, 6, 5, 3, 8, 6), maxStats: s(55, 32, 31, 28, 27, 31, 34, 30),
    growthModifiers: s(15, 20, 10, 5, 5, 5, 15, 5), movementType: 'cavalry',
    movement: 8, weaponRanks: [wr('Sword', 'B'), wr('Tome', 'A')], pairUpBonus: pu(0, 3, 0, 0, 0, 3, 0, 1),
  },
  {
    id: 'strategist', name: 'Strategist', tier: 'promoted', promotesFrom: ['troubadour'],
    weaponTypes: ['Tome', 'Staff'], classSkills: ['rally_resistance', 'inspiration'],
    statModifiers: s(16, 0, 7, 6, 7, 5, 2, 7), maxStats: s(45, 25, 33, 28, 31, 33, 25, 32),
    growthModifiers: s(0, 0, 15, 5, 10, 20, 0, 15), movementType: 'cavalry',
    movement: 8, weaponRanks: [wr('Tome', 'B'), wr('Staff', 'A')], pairUpBonus: pu(0, 2, 0, 0, 2, 0, 2, 1),
  },
  {
    id: 'butler_maid', name: 'Butler/Maid', tier: 'promoted', promotesFrom: ['troubadour'],
    weaponTypes: ['Dagger', 'Staff'], classSkills: ['live_to_serve', 'tomebreaker'],
    statModifiers: s(18, 4, 5, 9, 8, 4, 5, 4), maxStats: s(50, 28, 31, 33, 33, 32, 29, 29),
    growthModifiers: s(0, 10, 10, 15, 15, 10, 5, 10), movementType: 'infantry',
    movement: 6, weaponRanks: [wr('Dagger', 'B'), wr('Staff', 'S')], pairUpBonus: pu(0, 2, 0, 3, 3, 0, 0, 0),
  },
  {
    id: 'wolfssegner', name: 'Wolfssegner', tier: 'promoted', promotesFrom: ['wolfskin'],
    weaponTypes: ['Beaststone'], classSkills: ['better_odds', 'grisly_wound'],
    statModifiers: s(22, 11, 0, 6, 7, 1, 7, 1), maxStats: s(65, 36, 25, 29, 31, 26, 32, 26),
    growthModifiers: s(20, 20, 0, 5, 15, 5, 10, 0), movementType: 'beast',
    movement: 6, weaponRanks: [wr('Beaststone', 'S')], combatBonus: { hit: 10, crit: 5, dodge: 10 }, pairUpBonus: pu(4, 0, 0, 4, 0, 0, 0, 0),
  },

  // ---- Hoshido base ----
  {
    id: 'samurai', name: 'Samurai', tier: 'base',
    promotesTo: ['swordmaster', 'master_of_arms'], weaponTypes: ['Sword'],
    classSkills: ['duelists_blow', 'vantage'], statModifiers: s(17, 4, 0, 5, 8, 3, 3, 3), maxStats: s(40, 20, 16, 23, 25, 24, 18, 20),
    growthModifiers: s(10, 10, 0, 15, 20, 15, 0, 10), movementType: 'infantry',
    movement: 5, weaponRanks: [wr('Sword', 'B')], pairUpBonus: pu(0, 0, 0, 4, 2, 0, 0, 0),
  },
  {
    id: 'villager', name: 'Villager', tier: 'base',
    promotesTo: ['merchant', 'master_of_arms'], weaponTypes: ['Lance'],
    classSkills: ['aptitude', 'underdog'], statModifiers: s(17, 5, 0, 4, 5, 3, 4, 0), maxStats: s(35, 19, 15, 19, 19, 22, 18, 15),
    growthModifiers: s(10, 10, 0, 10, 10, 20, 10, 0),
    passableViaSeal: false,
    movement: 5, weaponRanks: [wr('Lance', 'C')], pairUpBonus: pu(0, 0, 3, 0, 3, 0, 0, 0), movementType: 'infantry',
  },
  {
    id: 'apothecary', name: 'Apothecary', tier: 'base',
    promotesTo: ['merchant', 'mechanist'], weaponTypes: ['Bow'],
    classSkills: ['potent_potion', 'quick_salve'], statModifiers: s(18, 6, 0, 4, 4, 2, 6, 2), maxStats: s(45, 24, 15, 19, 19, 21, 23, 20),
    growthModifiers: s(20, 20, 0, 10, 10, 5, 10, 5), movementType: 'infantry',
    movement: 5, weaponRanks: [wr('Bow', 'B')], pairUpBonus: pu(3, 0, 0, 0, 0, 2, 1, 0),
  },
  {
    id: 'ninja', name: 'Ninja', tier: 'base',
    promotesTo: ['master_ninja', 'mechanist'], weaponTypes: ['Dagger'],
    classSkills: ['locktouch', 'poison_strike'], statModifiers: s(16, 3, 0, 8, 8, 1, 3, 3), maxStats: s(35, 17, 15, 25, 25, 18, 19, 20),
    growthModifiers: s(5, 5, 0, 20, 20, 0, 5, 15), movementType: 'infantry',
    movement: 5, weaponRanks: [wr('Dagger', 'B')], pairUpBonus: pu(0, 0, 1, 3, 0, 0, 0, 1),
  },
  {
    id: 'oni_savage', name: 'Oni Savage', tier: 'base',
    promotesTo: ['oni_chieftain', 'blacksmith', 'master_of_arms'], weaponTypes: ['Axe'],
    classSkills: ['seal_resistance', 'shove'], statModifiers: s(18, 6, 1, 2, 5, 0, 7, 1), maxStats: s(45, 24, 19, 16, 20, 17, 23, 18),
    growthModifiers: s(20, 20, 10, 0, 10, 0, 20, 0), movementType: 'infantry',
    movement: 5, weaponRanks: [wr('Axe', 'B')], pairUpBonus: pu(4, 0, 0, 0, 0, 2, 0, 0),
  },
  {
    id: 'spear_fighter', name: 'Spear Fighter', tier: 'base',
    promotesTo: ['spear_master', 'basara'], weaponTypes: ['Lance'],
    classSkills: ['seal_defence', 'swap'], statModifiers: s(17, 6, 0, 6, 6, 2, 5, 2), maxStats: s(40, 22, 15, 23, 22, 21, 22, 21),
    growthModifiers: s(15, 15, 0, 15, 15, 5, 10, 5), movementType: 'infantry',
    movement: 5, weaponRanks: [wr('Lance', 'B')], pairUpBonus: pu(2, 0, 2, 2, 0, 0, 0, 0),
  },
  {
    id: 'diviner', name: 'Diviner', tier: 'base',
    promotesTo: ['onmyoji', 'basara'], weaponTypes: ['Tome'],
    classSkills: ['magic_2', 'future_sight'], statModifiers: s(15, 0, 4, 5, 6, 1, 1, 3), maxStats: s(35, 17, 22, 20, 23, 19, 16, 20),
    growthModifiers: s(0, 5, 15, 10, 15, 5, 0, 10), movementType: 'infantry',
    movement: 5, weaponRanks: [wr('Tome', 'B')], pairUpBonus: pu(0, 3, 0, 3, 0, 0, 0, 0),
  },
  {
    id: 'monk', name: 'Monk', tier: 'base',
    promotesTo: ['great_master', 'onmyoji'], weaponTypes: ['Staff'],
    classSkills: ['miracle', 'rally_luck'], statModifiers: s(16, 0, 3, 5, 5, 4, 2, 5), maxStats: s(35, 18, 21, 20, 22, 23, 17, 24),
    growthModifiers: s(0, 5, 10, 10, 15, 15, 0, 20), movementType: 'infantry',
    movement: 5, weaponRanks: [wr('Staff', 'B')], combatBonus: { dodge: 10 }, pairUpBonus: pu(0, 2, 0, 0, 2, 0, 2, 0),
  },
  {
    id: 'shrine_maiden', name: 'Shrine Maiden', tier: 'base',
    promotesTo: ['priestess', 'onmyoji'], weaponTypes: ['Staff'],
    classSkills: ['miracle', 'rally_luck'], statModifiers: s(16, 0, 3, 5, 5, 4, 2, 5), maxStats: s(35, 18, 21, 20, 22, 23, 17, 24),
    growthModifiers: s(0, 5, 10, 10, 15, 15, 0, 20), movementType: 'infantry',
    movement: 5, weaponRanks: [wr('Staff', 'B')], combatBonus: { dodge: 10 }, pairUpBonus: pu(0, 2, 0, 0, 2, 0, 2, 0),
  },
  {
    id: 'sky_knight', name: 'Sky Knight', tier: 'base',
    promotesTo: ['falcon_knight', 'kinshi_knight'], weaponTypes: ['Lance'],
    classSkills: ['darting_blow', 'camaraderie'], statModifiers: s(16, 3, 0, 5, 7, 4, 2, 6), maxStats: s(35, 19, 16, 21, 23, 25, 18, 25),
    growthModifiers: s(0, 10, 0, 10, 15, 20, 0, 20), movementType: 'flying',
    movement: 7, weaponRanks: [wr('Lance', 'B')], pairUpBonus: pu(0, 0, 0, 3, 0, 0, 3, 0),
  },
  {
    id: 'archer', name: 'Archer', tier: 'base',
    promotesTo: ['sniper', 'kinshi_knight'], weaponTypes: ['Bow'],
    classSkills: ['skill_2', 'quick_draw'], statModifiers: s(17, 5, 0, 7, 5, 2, 4, 1), maxStats: s(40, 21, 15, 23, 21, 20, 20, 17),
    growthModifiers: s(10, 15, 0, 15, 15, 5, 10, 0), movementType: 'infantry',
    movement: 5, weaponRanks: [wr('Bow', 'B')], pairUpBonus: pu(2, 0, 2, 2, 0, 0, 0, 0),
  },
  {
    id: 'kitsune', name: 'Kitsune', tier: 'base',
    promotesTo: ['nine_tails'], weaponTypes: ['Beaststone'],
    classSkills: ['evenhanded', 'beastbane'], statModifiers: s(16, 5, 1, 6, 8, 4, 1, 4), maxStats: s(40, 20, 18, 23, 24, 24, 18, 23),
    growthModifiers: s(10, 10, 0, 15, 20, 10, 0, 20), movementType: 'beast',
    movement: 5, weaponRanks: [wr('Beaststone', 'B')], pairUpBonus: pu(0, 0, 0, 4, 2, 0, 0, 0),
  },
  {
    id: 'songstress', name: 'Songstress', tier: 'base',
    weaponTypes: ['Lance'], classSkills: ['luck_4', 'inspiring_song', 'voice_of_peace', 'foreign_princess'],
    statModifiers: s(16, 3, 0, 6, 5, 3, 2, 3), maxStats: s(45, 28, 27, 31, 31, 35, 27, 28),
    growthModifiers: s(0, 10, 0, 20, 20, 20, 0, 0), movementType: 'infantry',
    movement: 5, weaponRanks: [wr('Lance', 'C')], pairUpBonus: pu(0, 0, 2, 2, 4, 0, 0, 0),
  },

  // ---- Hoshido promoted ----
  {
    id: 'hoshido_noble', name: 'Hoshido Noble', tier: 'promoted', promotesFrom: ['nohr_prince_princess'],
    weaponTypes: ['Sword', 'Staff', 'Dragonstone'], classSkills: ['dragon_ward', 'hoshidan_unity'],
    statModifiers: s(19, 10, 4, 5, 6, 4, 7, 3), maxStats: s(60, 34, 28, 29, 30, 33, 31, 28),
    growthModifiers: s(15, 15, 10, 10, 10, 10, 15, 0), movementType: 'infantry',
    movement: 6, weaponRanks: [wr('Sword', 'A'), wr('Staff', 'B'), wr('Dragonstone', 'A')], pairUpBonus: pu(2, 0, 1, 1, 2, 2, 0, 0),
  },
  {
    id: 'swordmaster', name: 'Swordmaster', tier: 'promoted', promotesFrom: ['samurai'],
    weaponTypes: ['Sword'], classSkills: ['astra', 'swordfaire'],
    statModifiers: s(18, 6, 2, 7, 11, 4, 5, 5), maxStats: s(55, 30, 28, 32, 35, 33, 27, 31),
    growthModifiers: s(10, 10, 5, 15, 20, 15, 0, 10), movementType: 'infantry',
    movement: 6, weaponRanks: [wr('Sword', 'S')], combatBonus: { avoid: 10, crit: 10 }, pairUpBonus: pu(0, 0, 0, 5, 3, 0, 0, 0),
  },
  {
    id: 'master_of_arms', name: 'Master of Arms', tier: 'promoted', promotesFrom: ['samurai', 'oni_savage', 'villager'],
    weaponTypes: ['Sword', 'Lance', 'Axe'], classSkills: ['seal_strength', 'life_and_death'],
    statModifiers: s(20, 8, 0, 6, 9, 3, 7, 3), maxStats: s(65, 33, 25, 30, 30, 31, 31, 28),
    growthModifiers: s(20, 15, 0, 10, 10, 10, 10, 0), movementType: 'infantry',
    movement: 6, weaponRanks: [wr('Sword', 'A'), wr('Lance', 'B'), wr('Axe', 'B')], pairUpBonus: pu(2, 0, 2, 2, 0, 2, 0, 0),
  },
  {
    id: 'merchant', name: 'Merchant', tier: 'promoted', promotesFrom: ['villager', 'apothecary'],
    weaponTypes: ['Lance', 'Bow'], classSkills: ['profiteer', 'spendthrift'],
    statModifiers: s(20, 8, 0, 6, 5, 4, 8, 5), maxStats: s(65, 33, 25, 29, 28, 32, 33, 30),
    growthModifiers: s(20, 20, 0, 10, 5, 15, 10, 5), movementType: 'infantry',
    movement: 6, weaponRanks: [wr('Lance', 'B'), wr('Bow', 'A')], pairUpBonus: pu(3, 0, 0, 0, 0, 3, 2, 0),
  },
  {
    id: 'mechanist', name: 'Mechanist', tier: 'promoted', promotesFrom: ['ninja', 'apothecary'],
    weaponTypes: ['Dagger', 'Bow'], classSkills: ['golembane', 'replicate'],
    statModifiers: s(18, 7, 0, 9, 7, 2, 6, 6), maxStats: s(60, 30, 25, 33, 30, 30, 31, 31),
    growthModifiers: s(10, 10, 0, 15, 10, 5, 5, 15), movementType: 'infantry',
    movement: 7, weaponRanks: [wr('Dagger', 'A'), wr('Bow', 'B')], pairUpBonus: pu(2, 0, 2, 0, 0, 2, 2, 0),
  },
  {
    id: 'master_ninja', name: 'Master Ninja', tier: 'promoted', promotesFrom: ['ninja'],
    weaponTypes: ['Sword', 'Dagger'], classSkills: ['lethality', 'shurikenfaire'],
    statModifiers: s(17, 5, 0, 10, 11, 2, 4, 8), maxStats: s(55, 27, 25, 35, 35, 28, 26, 34),
    growthModifiers: s(5, 5, 0, 20, 20, 0, 5, 20), movementType: 'infantry',
    movement: 6, weaponRanks: [wr('Sword', 'B'), wr('Dagger', 'S')], combatBonus: { hit: 5, avoid: 5, crit: 5, dodge: 5 }, pairUpBonus: pu(0, 0, 2, 4, 0, 0, 0, 1),
  },
  {
    id: 'oni_chieftain', name: 'Oni Chieftain', tier: 'promoted', promotesFrom: ['oni_savage'],
    weaponTypes: ['Axe', 'Tome'], classSkills: ['death_blow', 'counter'],
    statModifiers: s(19, 9, 5, 2, 7, 0, 10, 5), maxStats: s(60, 34, 28, 25, 30, 25, 36, 31),
    growthModifiers: s(10, 20, 15, 0, 10, 0, 20, 5), movementType: 'infantry',
    movement: 6, weaponRanks: [wr('Axe', 'A'), wr('Bow', 'B')], pairUpBonus: pu(4, 0, 0, 0, 0, 4, 0, 0),
  },
  {
    id: 'blacksmith', name: 'Blacksmith', tier: 'promoted', promotesFrom: ['oni_savage'],
    weaponTypes: ['Sword', 'Axe'], classSkills: ['salvage_blow', 'lancebreaker'],
    statModifiers: s(21, 8, 0, 9, 8, 3, 8, 2), maxStats: s(65, 33, 25, 32, 31, 30, 32, 27),
    growthModifiers: s(20, 15, 0, 15, 10, 5, 15, 0), movementType: 'infantry',
    movement: 6, weaponRanks: [wr('Sword', 'B'), wr('Axe', 'A')], pairUpBonus: pu(3, 0, 2, 0, 0, 3, 0, 0),
  },
  {
    id: 'spear_master', name: 'Spear Master', tier: 'promoted', promotesFrom: ['spear_fighter'],
    weaponTypes: ['Lance'], classSkills: ['seal_speed', 'lancefaire'],
    statModifiers: s(18, 9, 0, 8, 8, 3, 7, 3), maxStats: s(60, 34, 25, 33, 32, 29, 30, 29),
    growthModifiers: s(15, 15, 0, 15, 15, 5, 10, 5), movementType: 'infantry',
    movement: 6, weaponRanks: [wr('Lance', 'S')], combatBonus: { crit: 10, dodge: 10 }, pairUpBonus: pu(3, 0, 3, 2, 0, 0, 0, 0),
  },
  {
    id: 'basara', name: 'Basara', tier: 'promoted', promotesFrom: ['spear_fighter', 'diviner'],
    weaponTypes: ['Lance', 'Tome'], classSkills: ['rend_heaven', 'quixotic'],
    statModifiers: s(20, 7, 5, 7, 7, 5, 7, 6), maxStats: s(65, 31, 30, 30, 31, 35, 30, 32),
    growthModifiers: s(20, 10, 10, 10, 10, 15, 5, 10), movementType: 'infantry',
    movement: 6, weaponRanks: [wr('Lance', 'A'), wr('Tome', 'B')], pairUpBonus: pu(0, 0, 0, 0, 5, 0, 3, 0),
  },
  {
    id: 'onmyoji', name: 'Onmyoji', tier: 'promoted', promotesFrom: ['diviner', 'monk', 'shrine_maiden'],
    weaponTypes: ['Tome', 'Staff'], classSkills: ['rally_magic', 'tomefaire'],
    statModifiers: s(16, 0, 7, 6, 7, 2, 3, 6), maxStats: s(45, 25, 33, 31, 32, 27, 25, 31),
    growthModifiers: s(0, 0, 20, 10, 15, 0, 0, 15), movementType: 'infantry',
    movement: 6, weaponRanks: [wr('Tome', 'A'), wr('Staff', 'B')], pairUpBonus: pu(0, 4, 0, 4, 0, 0, 0, 0),
  },
  {
    id: 'great_master', name: 'Great Master', tier: 'promoted', promotesFrom: ['monk'],
    weaponTypes: ['Lance', 'Staff'], classSkills: ['renewal', 'countermagic'],
    statModifiers: s(19, 8, 6, 6, 8, 5, 6, 7), maxStats: s(55, 32, 30, 31, 33, 32, 28, 32),
    growthModifiers: s(10, 15, 5, 5, 15, 15, 10, 10), movementType: 'infantry',
    movement: 6, weaponRanks: [wr('Bow', 'B'), wr('Staff', 'A')], pairUpBonus: pu(0, 3, 0, 0, 2, 0, 3, 0),
  },
  {
    id: 'priestess', name: 'Priestess', tier: 'promoted', promotesFrom: ['shrine_maiden'],
    weaponTypes: ['Bow', 'Staff'], classSkills: ['renewal', 'countermagic'],
    statModifiers: s(19, 6, 7, 6, 9, 5, 5, 8), maxStats: s(50, 29, 32, 30, 33, 34, 26, 34),
    growthModifiers: s(10, 10, 10, 5, 15, 15, 0, 20), movementType: 'infantry',
    movement: 6, weaponRanks: [wr('Bow', 'B'), wr('Staff', 'A')], pairUpBonus: pu(0, 3, 0, 0, 2, 0, 3, 0),
  },
  {
    id: 'falcon_knight', name: 'Falcon Knight', tier: 'promoted', promotesFrom: ['sky_knight'],
    weaponTypes: ['Lance', 'Staff'], classSkills: ['rally_speed', 'warding_blow'],
    statModifiers: s(18, 5, 4, 6, 10, 5, 5, 9), maxStats: s(55, 28, 27, 30, 34, 35, 27, 35),
    growthModifiers: s(0, 10, 10, 10, 15, 20, 0, 20), movementType: 'flying',
    movement: 8, weaponRanks: [wr('Lance', 'A'), wr('Staff', 'B')], pairUpBonus: pu(0, 0, 0, 3, 0, 0, 3, 1),
  },
  {
    id: 'kinshi_knight', name: 'Kinshi Knight', tier: 'promoted', promotesFrom: ['sky_knight', 'archer'],
    weaponTypes: ['Lance', 'Bow'], classSkills: ['air_superiority', 'amaterasu'],
    statModifiers: s(17, 4, 1, 9, 8, 5, 4, 7), maxStats: s(50, 27, 26, 33, 31, 34, 25, 31),
    growthModifiers: s(0, 5, 0, 15, 15, 15, 0, 15), movementType: 'flying',
    movement: 8, weaponRanks: [wr('Lance', 'B'), wr('Bow', 'A')], pairUpBonus: pu(0, 0, 2, 2, 2, 0, 0, 1),
  },
  {
    id: 'sniper', name: 'Sniper', tier: 'promoted', promotesFrom: ['archer'],
    weaponTypes: ['Bow'], classSkills: ['certain_blow', 'bowfaire'],
    statModifiers: s(19, 7, 0, 10, 9, 3, 6, 2), maxStats: s(55, 31, 25, 35, 33, 30, 31, 28),
    growthModifiers: s(10, 15, 0, 20, 15, 5, 10, 0), movementType: 'infantry',
    movement: 6, weaponRanks: [wr('Bow', 'S')], combatBonus: { hit: 10, crit: 10 }, pairUpBonus: pu(2, 0, 3, 3, 0, 0, 0, 0),
  },
  {
    id: 'nine_tails', name: 'Nine-Tails', tier: 'promoted', promotesFrom: ['kitsune'],
    weaponTypes: ['Beaststone'], classSkills: ['even_better', 'grisly_wound'],
    statModifiers: s(19, 6, 2, 9, 10, 5, 2, 8), maxStats: s(55, 29, 29, 33, 34, 33, 27, 34),
    growthModifiers: s(10, 10, 0, 15, 20, 10, 0, 20), movementType: 'beast',
    movement: 6, weaponRanks: [wr('Beaststone', 'S')], combatBonus: { avoid: 10, crit: 5, dodge: 10 }, pairUpBonus: pu(0, 0, 0, 5, 3, 0, 0, 0),
  },

  // ---- DLC classes (map-reward, unlocked via Scroll item; Witch/Ballistician are gender-locked) ----
  {
    id: 'dread_fighter', name: 'Dread Fighter', tier: 'promoted', weaponTypes: ['Sword', 'Dagger'],
    classSkills: ['even_keel', 'iron_will', 'clarity', 'aggressor'], statModifiers: s(19, 8, 3, 6, 8, 1, 6, 9), maxStats: s(55, 32, 28, 29, 31, 26, 29, 34),
    growthModifiers: s(15, 15, 5, 5, 15, 0, 5, 20),
    movementType: 'infantry', movement: 6, weaponRanks: [wr('Sword', 'A'), wr('Dagger', 'B')], isDlcClass: true,
    pairUpBonus: pu(2, 0, 0, 2, 0, 0, 4, 0),
  },
  {
    id: 'dark_falcon', name: 'Dark Falcon', tier: 'promoted', weaponTypes: ['Lance', 'Tome'],
    classSkills: ['speed_2', 'relief', 'rally_movement', 'galeforce'], statModifiers: s(17, 4, 7, 5, 9, 4, 3, 9), maxStats: s(45, 27, 32, 28, 33, 32, 26, 34),
    growthModifiers: s(0, 10, 15, 5, 15, 15, 0, 20),
    movementType: 'flying', movement: 8, weaponRanks: [wr('Lance', 'B'), wr('Tome', 'A')], isDlcClass: true,
    pairUpBonus: pu(0, 3, 0, 3, 0, 0, 0, 1),
  },
  {
    id: 'ballistician', name: 'Ballistician', tier: 'promoted', weaponTypes: ['Bow'],
    classSkills: ['survey', 'opportunity_shot', 'rifled_barrel', 'surefooted'], statModifiers: s(18, 10, 0, 7, 2, 4, 3, 1), maxStats: s(50, 39, 25, 31, 25, 32, 27, 26),
    growthModifiers: s(5, 25, 0, 15, 0, 10, 5, 5),
    movementType: 'armored', movement: 4, weaponRanks: [wr('Bow', 'B')], isDlcClass: true, genderLock: 'M',
    pairUpBonus: pu(3, 0, 1, 0, 2, 1, 1, 0),
  },
  {
    id: 'witch', name: 'Witch', tier: 'promoted', weaponTypes: ['Tome'],
    classSkills: ['shadowgift', 'witchs_brew', 'warp', 'toxic_brew'], statModifiers: s(17, 0, 10, 5, 9, 3, 4, 5), maxStats: s(50, 25, 36, 27, 34, 28, 26, 29),
    growthModifiers: s(5, 0, 25, 5, 20, 5, 0, 10),
    movementType: 'infantry', movement: 6, weaponRanks: [wr('Tome', 'S')], combatBonus: { avoid: 10, crit: 10 },
    isDlcClass: true, genderLock: 'F', pairUpBonus: pu(0, 5, 0, 3, 0, 0, 0, 0),
  },

  // ---- Amiibo classes (unlocked via Amiibo scroll; all 4 are gender-locked) ----
  {
    id: 'lodestar', name: 'Lodestar', tier: 'promoted', weaponTypes: ['Sword'],
    classSkills: ['dancing_blade', 'charm', 'dual_guarder', 'speedtaker'], statModifiers: s(19, 7, 0, 10, 9, 7, 7, 2), maxStats: s(60, 29, 26, 35, 33, 40, 30, 29),
    growthModifiers: s(15, 10, 0, 20, 10, 25, 5, 5),
    movementType: 'infantry', movement: 6, weaponRanks: [wr('Sword', 'S')], combatBonus: { hit: 10, avoid: 10, crit: 5 },
    isAmiibo: true, genderLock: 'M', pairUpBonus: pu(2, 0, 0, 3, 3, 0, 0, 0),
  },
  {
    id: 'vanguard', name: 'Vanguard', tier: 'promoted', weaponTypes: ['Sword', 'Axe'],
    classSkills: ['heavy_blade', 'veteran_intuition', 'aether', 'strengthtaker'], statModifiers: s(21, 10, 0, 6, 7, 3, 9, 1), maxStats: s(65, 36, 25, 29, 30, 30, 32, 27),
    growthModifiers: s(20, 20, 0, 5, 5, 10, 15, 0),
    movementType: 'infantry', movement: 6, weaponRanks: [wr('Sword', 'A'), wr('Axe', 'B')], isAmiibo: true, genderLock: 'M',
    pairUpBonus: pu(5, 0, 0, 0, 0, 3, 0, 0),
  },
  {
    id: 'great_lord', name: 'Great Lord', tier: 'promoted', weaponTypes: ['Sword', 'Lance'],
    classSkills: ['dual_striker', 'charm', 'aether', 'awakening'], statModifiers: s(18, 8, 1, 8, 9, 5, 7, 3), maxStats: s(60, 30, 25, 32, 34, 35, 29, 31),
    growthModifiers: s(15, 15, 0, 10, 10, 15, 10, 5),
    movementType: 'infantry', movement: 6, weaponRanks: [wr('Sword', 'A'), wr('Lance', 'B')], isAmiibo: true, genderLock: 'F',
    pairUpBonus: pu(0, 0, 0, 4, 4, 0, 0, 0),
  },
  {
    id: 'grandmaster_amiibo', name: 'Grandmaster', tier: 'promoted', weaponTypes: ['Sword', 'Tome'],
    classSkills: ['tactical_advice', 'solidarity', 'ignis', 'rally_spectrum'], statModifiers: s(18, 7, 6, 8, 7, 2, 6, 8), maxStats: s(55, 31, 33, 33, 29, 26, 28, 33),
    growthModifiers: s(10, 15, 15, 15, 5, 0, 5, 15),
    movementType: 'infantry', movement: 6, weaponRanks: [wr('Sword', 'B'), wr('Tome', 'A')], isAmiibo: true, genderLock: 'M',
    pairUpBonus: pu(2, 2, 2, 2, 0, 0, 0, 0),
  },
]

export const classesById: Record<string, ClassData> = Object.fromEntries(
  classes.map((c) => [c.id, c]),
)

/** Look up a class by its display name (used since Character.startingClass stores names, not ids). */
export const classesByName: Record<string, ClassData> = Object.fromEntries(
  classes.map((c) => [c.name, c]),
)

// Butler/Maid is one gender-split class with two flavor names; alias both so joinClass lookups
// (e.g. Jakob's joinClass "Butler", Flora's "Maid") resolve to the same underlying class data.
const butlerMaid = classesById['butler_maid']
if (butlerMaid) {
  classesByName['Butler'] = butlerMaid
  classesByName['Maid'] = butlerMaid
}

export type { ClassCombatBonus, PairUpBonus, WeaponRank }
