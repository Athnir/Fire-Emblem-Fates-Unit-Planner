import type { Character, StatBlock } from './types'
import { getMarriagePartnerIds } from './supports'

function s(hp: number, str: number, mag: number, skl: number, spd: number, lck: number, def: number, res: number): StatBlock {
  return { hp, str, mag, skl, spd, lck, def, res }
}

const ZERO_MOD = s(0, 0, 0, 0, 0, 0, 0, 0)

/**
 * Data sourced/verified against Serenes Forest base-stats, growth-rates, maximum-stats, and
 * class-sets pages (see build-plan Phase 1 notes). `startingClass`/`secondaryClass` reflect each
 * character's *Class Set* (used by the class-inheritance formula), which for royals/retainer-
 * servants can differ from the personal battle class they actually join in (captured in `joinClass`
 * for flavor/display only — e.g. Xander's class set is Cavalier/Wyvern Rider even though he joins
 * in battle as a Paladin-tier unit rather than the base "Cavalier" class-set label; there is no
 * class literally called "Crown Prince" in Fates). baseStats/growthRates/statCaps reflect the
 * character's actual join battle class tier. `canMarry`/`supportOptions` are derived from
 * supports.ts below, not hand-entered.
 *
 * maxStatModifiers is each adult's personal contribution to their stat caps (added on top of
 * whatever class they're in — see classStatCap in levelProjection.ts), verified against Serenes
 * Forest's per-character Maximum Stats pages. Corrin stays at ZERO_MOD here since their personal
 * cap variation comes entirely from the Boon/Bane build (applied separately in corrinBuild.ts), and
 * children stay at ZERO_MOD too since theirs is entirely derived from blending both parents'
 * modifiers (computeMaxStatModifiers in statCalculator.ts) rather than being an independent value —
 * this raw field is only their pre-parent-blend placeholder.
 */
export const characters: Character[] = [
  // ================= ADULTS =================
  {
    id: 'corrin_m', name: 'Corrin M', gender: 'M', route: ['all'], startingLevel: {Birthright: 1, Conquest: 1, Revelation: 1},
    startingClass: 'Nohr Prince(ss)', // secondaryClass is the player-chosen Talent — unset until picked in the Corrin Build panel
    baseStats: s(19, 7, 4, 7, 6, 5, 6, 2), growthRates: s(45, 45, 30, 40, 45, 45, 35, 25),
    statCaps: s(40, 23, 17, 19, 21, 22, 21, 19), maxStatModifiers: ZERO_MOD,
    personalSkill: 'Supportive', supportOptions: [], canMarry: [], isChild: false, isRoyal: true,
  },
  {
    id: 'corrin_f', name: 'Corrin F', gender: 'F', route: ['all'], startingLevel: {Birthright: 1, Conquest: 1, Revelation: 1},
    startingClass: 'Nohr Prince(ss)',
    baseStats: s(19, 7, 4, 7, 6, 5, 6, 2), growthRates: s(45, 45, 30, 40, 45, 45, 35, 25),
    statCaps: s(40, 23, 17, 19, 21, 22, 21, 19), maxStatModifiers: ZERO_MOD,
    personalSkill: 'Supportive', supportOptions: [], canMarry: [], isChild: false, isRoyal: true,
  },
  {
    id: 'azura', name: 'Azura', gender: 'F', route: ['all'], startingLevel: {Birthright: 1, Conquest: 1, Revelation: 1},
    startingClass: 'Songstress', secondaryClass: 'Sky Knight', joinClass: 'Songstress',
    baseStats: s(16, 5, 2, 8, 8, 6, 4, 7), growthRates: s(25, 50, 25, 60, 60, 40, 15, 35),
    statCaps: s(45, 28, 27, 31, 31, 35, 27, 28), maxStatModifiers: s(0, 0, 1, 3, 0, -3, 0, 0),
    personalSkill: 'Healing Descant', supportOptions: [], canMarry: [], isChild: false, isRoyal: true,
  },
  {
    id: 'xander', name: 'Xander', gender: 'M', route: ['Conquest', 'Revelation'], startingLevel: {Conquest: 4, Revelation: 4},
    startingClass: 'Cavalier', secondaryClass: 'Wyvern Rider', joinClass: 'Paladin',
    baseStats: s(38, 23, 4, 18, 15, 20, 23, 11), growthRates: s(45, 50, 5, 40, 35, 60, 40, 15),
    statCaps: s(60, 31, 26, 30, 30, 32, 32, 32), maxStatModifiers: s(0, 2, -1, -1, -1, 2, 1, -2),
    personalSkill: 'Chivalry', supportOptions: [], canMarry: [], isChild: false, isRoyal: true,
  },
  {
    id: 'ryoma', name: 'Ryoma', gender: 'M', route: ['Birthright', 'Revelation'], startingLevel: {Birthright: 4, Revelation: 4},
    startingClass: 'Samurai', secondaryClass: 'Sky Knight', joinClass: 'Swordmaster',
    baseStats: s(36, 20, 2, 18, 24, 20, 16, 13), growthRates: s(50, 45, 0, 50, 45, 40, 35, 25),
    statCaps: s(55, 30, 28, 32, 35, 33, 27, 31), maxStatModifiers: s(0, 1, 2, 1, 1, -2, -2, 0),
    personalSkill: 'Bushido', supportOptions: [], canMarry: [], isChild: false, isRoyal: true,
  },
  {
    id: 'camilla', name: 'Camilla', gender: 'F', route: ['Conquest', 'Revelation'], startingLevel: {Conquest: 1, Revelation: 1},
    startingClass: 'Wyvern Rider', secondaryClass: 'Dark Mage', joinClass: 'Malig Knight',
    baseStats: s(30, 19, 11, 15, 19, 12, 18, 15), growthRates: s(40, 50, 25, 50, 55, 25, 35, 45),
    statCaps: s(55, 31, 30, 28, 27, 25, 31, 31), maxStatModifiers: s(0, 0, 1, -1, 1, 1, -2, 1),
    personalSkill: 'Rose’s Thorns', supportOptions: [], canMarry: [], isChild: false, isRoyal: true,
  },
  {
    id: 'hinoka', name: 'Hinoka', gender: 'F', route: ['Birthright', 'Revelation'], startingLevel: {Birthright: 8, Revelation: 17},
    startingClass: 'Sky Knight', secondaryClass: 'Spear Fighter',
    baseStats: s(23, 9, 4, 13, 16, 12, 9, 15), growthRates: s(45, 45, 15, 40, 45, 40, 35, 40),
    statCaps: s(35, 19, 16, 21, 23, 25, 18, 25), maxStatModifiers: s(0, 1, -1, -1, 1, -1, 2, 0),
    personalSkill: 'Rallying Cry', supportOptions: [], canMarry: [], isChild: false, isRoyal: true,
  },
  {
    id: 'leo', name: 'Leo', gender: 'M', route: ['Conquest', 'Revelation'], startingLevel: {Conquest: 2, Revelation: 2},
    startingClass: 'Dark Mage', secondaryClass: 'Troubadour', joinClass: 'Dark Knight',
    baseStats: s(34, 14, 20, 14, 15, 15, 16, 20), growthRates: s(45, 25, 55, 35, 45, 45, 30, 45),
    statCaps: s(55, 32, 31, 28, 27, 31, 34, 30), maxStatModifiers: s(0, 0, -2, 2, -2, 2, 0, 0),
    personalSkill: 'Pragmatic', supportOptions: [], canMarry: [], isChild: false, isRoyal: true,
  },
  {
    id: 'takumi', name: 'Takumi', gender: 'M', route: ['Birthright', 'Revelation'], startingLevel: {Birthright: 11, Revelation: 11},
    startingClass: 'Archer', secondaryClass: 'Spear Fighter',
    baseStats: s(26, 13, 0, 17, 11, 13, 10, 4), growthRates: s(50, 35, 0, 60, 40, 45, 35, 20),
    statCaps: s(40, 21, 15, 23, 21, 20, 20, 17), maxStatModifiers: s(0, 1, 3, -2, 1, -2, 0, 0),
    personalSkill: 'Competitive', supportOptions: [], canMarry: [], isChild: false, isRoyal: true,
  },
  {
    id: 'elise', name: 'Elise', gender: 'F', route: ['Conquest', 'Revelation'], startingLevel: {Conquest: 5, Revelation: 7},
    startingClass: 'Troubadour', secondaryClass: 'Wyvern Rider',
    baseStats: s(19, 2, 11, 5, 10, 14, 4, 11), growthRates: s(30, 5, 65, 25, 55, 70, 15, 40),
    statCaps: s(35, 16, 19, 24, 20, 23, 16, 21), maxStatModifiers: s(0, -1, 3, 0, -2, 1, 1, -3),
    personalSkill: 'Lily’s Poise', supportOptions: [], canMarry: [], isChild: false, isRoyal: true,
  },
  {
    id: 'sakura', name: 'Sakura', gender: 'F', route: ['Birthright', 'Revelation'], startingLevel: {Birthright: 1, Revelation: 4},
    startingClass: 'Shrine Maiden', secondaryClass: 'Sky Knight',
    baseStats: s(16, 3, 6, 5, 7, 9, 5, 7), growthRates: s(45, 30, 50, 40, 40, 55, 30, 20),
    statCaps: s(35, 18, 21, 20, 22, 23, 17, 24), maxStatModifiers: s(0, 2, -1, 1, -1, 0, 0, 0),
    personalSkill: 'Quiet Strength', supportOptions: [], canMarry: [], isChild: false, isRoyal: true,
  },
  {
    id: 'silas', name: 'Silas', gender: 'M', route: ['all'], startingLevel: {Birthright: 6, Conquest: 6, Revelation: 18},
    startingClass: 'Cavalier', secondaryClass: 'Mercenary',
    baseStats: s(22, 11, 0, 9, 8, 7, 10, 5), growthRates: s(40, 45, 5, 50, 40, 40, 40, 25),
    statCaps: s(40, 22, 15, 21, 20, 24, 22, 21), maxStatModifiers: s(0, 0, 1, 2, -1, -1, 0, 0),
    personalSkill: 'Vow of Friendship', supportOptions: [], canMarry: [], isChild: false,
  },
  {
    id: 'kaze', name: 'Kaze', gender: 'M', route: ['all'], startingLevel: {Birthright: 3, Conquest: 3, Revelation: 3},
    startingClass: 'Ninja', secondaryClass: 'Samurai',
    baseStats: s(19, 7, 0, 9, 12, 4, 5, 10), growthRates: s(55, 40, 0, 45, 65, 20, 20, 35),
    statCaps: s(35, 17, 15, 25, 25, 18, 19, 20), maxStatModifiers: s(0, -2, 2, 3, 0, -2, -1, 1),
    personalSkill: 'Miraculous Save', supportOptions: [], canMarry: [], isChild: false,
  },
  {
    id: 'jakob', name: 'Jakob', gender: 'M', route: ['all'], startingLevel: {Birthright: 1, Conquest: 1, Revelation: 1},
    startingClass: 'Troubadour', secondaryClass: 'Cavalier', joinClass: 'Butler',
    baseStats: s(21, 8, 6, 12, 9, 10, 7, 6), growthRates: s(50, 30, 15, 40, 35, 45, 25, 25),
    statCaps: s(50, 28, 31, 33, 33, 32, 29, 29), maxStatModifiers: s(0, 2, -2, 2, -1, -1, 0, 0),
    personalSkill: 'Evasive Partner', supportOptions: [], canMarry: [], isChild: false,
  },
  {
    id: 'felicia', name: 'Felicia', gender: 'F', route: ['all'], startingLevel: {Birthright: 1, Conquest: 1, Revelation: 1},
    startingClass: 'Troubadour', secondaryClass: 'Mercenary', joinClass: 'Maid',
    baseStats: s(19, 5, 9, 10, 10, 12, 5, 9), growthRates: s(40, 10, 35, 30, 40, 55, 15, 35),
    statCaps: s(50, 28, 31, 33, 33, 32, 29, 29), maxStatModifiers: s(0, -2, 2, 1, 0, -1, 1, 0),
    personalSkill: 'Devoted Partner', supportOptions: [], canMarry: [], isChild: false,
  },
  {
    id: 'laslow', name: 'Laslow', gender: 'M', route: ['Conquest', 'Revelation'], startingLevel: {Conquest: 12, Revelation: 16},
    startingClass: 'Mercenary', secondaryClass: 'Ninja',
    baseStats: s(28, 15, 0, 16, 13, 14, 10, 7), growthRates: s(50, 45, 0, 45, 30, 55, 35, 25),
    statCaps: s(40, 22, 15, 24, 22, 20, 21, 19), maxStatModifiers: s(0, 0, 1, 2, -1, 1, -1, 0),
    personalSkill: 'Fancy Footwork', supportOptions: [], canMarry: [], isChild: false,
  },
  {
    id: 'odin', name: 'Odin', gender: 'M', route: ['Conquest', 'Revelation'], startingLevel: {Conquest: 5, Revelation: 12},
    startingClass: 'Dark Mage', secondaryClass: 'Samurai',
    baseStats: s(21, 5, 8, 10, 7, 9, 6, 7), growthRates: s(55, 35, 30, 55, 35, 60, 40, 20),
    statCaps: s(35, 19, 24, 16, 19, 18, 19, 22), maxStatModifiers: s(0, 0, 1, 1, -1, 1, -1, 0),
    personalSkill: 'Aching Blood', supportOptions: [], canMarry: [], isChild: false,
  },
  {
    id: 'niles', name: 'Niles', gender: 'M', route: ['Conquest', 'Revelation'], startingLevel: {Conquest: 8, Revelation: 14},
    startingClass: 'Outlaw', secondaryClass: 'Dark Mage',
    baseStats: s(22, 9, 5, 9, 15, 6, 7, 12), growthRates: s(40, 35, 20, 40, 50, 30, 30, 40),
    statCaps: s(35, 19, 18, 20, 24, 18, 17, 22), maxStatModifiers: s(0, -2, -1, 3, 0, 1, 0, 0),
    personalSkill: 'Kidnap', supportOptions: [], canMarry: [], isChild: false,
  },
  {
    id: 'arthur', name: 'Arthur', gender: 'M', route: ['Conquest', 'Revelation'], startingLevel: {Conquest: 7, Revelation: 9},
    startingClass: 'Fighter', secondaryClass: 'Cavalier',
    baseStats: s(24, 12, 0, 9, 8, 1, 9, 4), growthRates: s(50, 45, 0, 55, 35, 5, 45, 20),
    statCaps: s(45, 25, 15, 23, 22, 21, 19, 18), maxStatModifiers: s(0, 0, 1, 3, -3, 1, -1, 0),
    personalSkill: 'Misfortunate', supportOptions: [], canMarry: [], isChild: false,
  },
  {
    id: 'benny', name: 'Benny', gender: 'M', route: ['Conquest', 'Revelation'], startingLevel: {Conquest: 15, Revelation: 15},
    startingClass: 'Knight', secondaryClass: 'Fighter',
    baseStats: s(31, 15, 0, 15, 6, 12, 19, 10), growthRates: s(50, 40, 0, 50, 10, 35, 55, 45),
    statCaps: s(45, 24, 15, 22, 17, 22, 26, 18), maxStatModifiers: s(0, -3, 0, 3, 1, 0, 0, 0),
    personalSkill: 'Fierce Mien', supportOptions: [], canMarry: [], isChild: false,
  },
  {
    id: 'effie', name: 'Effie', gender: 'F', route: ['Conquest', 'Revelation'], startingLevel: {Conquest: 6, Revelation: 8},
    startingClass: 'Knight', secondaryClass: 'Troubadour',
    baseStats: s(23, 13, 0, 8, 5, 10, 12, 4), growthRates: s(35, 60, 0, 35, 50, 50, 35, 30),
    statCaps: s(45, 24, 15, 22, 17, 22, 26, 18), maxStatModifiers: s(0, 3, -1, 0, 1, -1, -1, 0),
    personalSkill: 'Puissance', supportOptions: [], canMarry: [], isChild: false,
  },
  {
    id: 'gunter', name: 'Gunter', gender: 'M', route: ['Conquest', 'Revelation'], startingLevel: {Conquest: 10},
    startingClass: 'Cavalier', secondaryClass: 'Mercenary', joinClass: 'Great Knight',
    baseStats: s(34, 17, 0, 24, 10, 13, 20, 6), growthRates: s(15, 5, 0, 5, 0, 15, 5, 5),
    statCaps: s(65, 35, 25, 29, 27, 28, 37, 28), maxStatModifiers: s(0, 2, 0, 1, -2, 2, -2, 0),
    personalSkill: 'Forceful Partner', supportOptions: [], canMarry: [], isChild: false,
  },
  {
    id: 'nyx', name: 'Nyx', gender: 'F', route: ['Conquest', 'Revelation'], startingLevel: {Conquest: 9, Revelation: 9},
    startingClass: 'Dark Mage', secondaryClass: 'Outlaw',
    baseStats: s(20, 1, 12, 5, 11, 3, 4, 8), growthRates: s(30, 5, 50, 35, 50, 20, 15, 30),
    statCaps: s(35, 19, 24, 16, 19, 18, 19, 22), maxStatModifiers: s(0, 0, 3, -2, 2, -1, -2, 1),
    personalSkill: 'Countercurse', supportOptions: [], canMarry: [], isChild: false,
  },
  {
    id: 'selena', name: 'Selena', gender: 'F', route: ['Conquest', 'Revelation'], startingLevel: {Conquest: 10, Revelation: 10},
    startingClass: 'Mercenary', secondaryClass: 'Sky Knight',
    baseStats: s(24, 12, 3, 12, 15, 9, 11, 8), growthRates: s(40, 30, 5, 25, 45, 30, 45, 30),
    statCaps: s(40, 22, 15, 24, 22, 20, 21, 19), maxStatModifiers: s(0, -1, -1, 2, 0, 1, 0, 0),
    personalSkill: 'Fierce Rival', supportOptions: [], canMarry: [], isChild: false,
  },
  {
    id: 'beruka', name: 'Beruka', gender: 'F', route: ['Conquest', 'Revelation'], startingLevel: {Conquest: 9, Revelation: 9},
    startingClass: 'Wyvern Rider', secondaryClass: 'Fighter',
    baseStats: s(23, 13, 0, 14, 9, 10, 14, 7), growthRates: s(45, 30, 10, 55, 30, 45, 40, 25),
    statCaps: s(40, 22, 17, 21, 20, 19, 24, 15), maxStatModifiers: s(0, -1, 0, 2, -2, 2, -1, 0),
    personalSkill: 'Opportunist', supportOptions: [], canMarry: [], isChild: false,
  },
  {
    id: 'peri', name: 'Peri', gender: 'F', route: ['Conquest', 'Revelation'], startingLevel: {Conquest: 10, Revelation: 16},
    startingClass: 'Cavalier', secondaryClass: 'Dark Mage',
    baseStats: s(25, 13, 0, 9, 13, 9, 10, 10), growthRates: s(30, 50, 5, 30, 50, 35, 25, 45),
    statCaps: s(40, 22, 15, 21, 20, 24, 22, 21), maxStatModifiers: s(0, 0, 1, -1, 1, -2, 2, 0),
    personalSkill: 'Bloodthirst', supportOptions: [], canMarry: [], isChild: false,
  },
  {
    id: 'charlotte', name: 'Charlotte', gender: 'F', route: ['Conquest', 'Revelation'], startingLevel: {Conquest: 10, Revelation: 10},
    startingClass: 'Fighter', secondaryClass: 'Troubadour',
    baseStats: s(28, 15, 0, 10, 13, 9, 8, 2), growthRates: s(65, 55, 0, 35, 50, 45, 20, 5),
    statCaps: s(45, 25, 15, 23, 22, 21, 19, 18), maxStatModifiers: s(0, 0, 3, 0, 2, -2, -2, 0),
    personalSkill: 'Unmask', supportOptions: [], canMarry: [], isChild: false,
  },
  {
    id: 'keaton', name: 'Keaton', gender: 'M', route: ['Conquest', 'Revelation'], startingLevel: {Conquest: 15, Revelation: 15},
    startingClass: 'Wolfskin', secondaryClass: 'Fighter',
    baseStats: s(35, 19, 0, 10, 13, 9, 16, 7), growthRates: s(60, 60, 0, 20, 35, 30, 50, 25),
    statCaps: s(45, 24, 15, 18, 22, 17, 21, 15), maxStatModifiers: s(0, 0, 3, -2, -1, 2, -1, 0),
    personalSkill: 'Collector', supportOptions: [], canMarry: [], isChild: false,
  },
  {
    id: 'flora', name: 'Flora', gender: 'F', route: ['Conquest', 'Revelation'], startingLevel: {Conquest: 5, Revelation: 5},
    startingClass: 'Troubadour', secondaryClass: 'Dark Mage', joinClass: 'Maid',
    baseStats: s(29, 18, 16, 25, 15, 11, 14, 23), growthRates: s(35, 40, 20, 45, 30, 35, 30, 30),
    statCaps: s(50, 28, 31, 33, 33, 32, 29, 29), maxStatModifiers: s(0, 0, 1, -1, 2, -1, 1, -1),
    personalSkill: 'Icy Blood', supportOptions: [], canMarry: [], isChild: false,
  },
  {
    id: 'rinkah', name: 'Rinkah', gender: 'F', route: ['Birthright', 'Revelation'], startingLevel: {Birthright: 4, Revelation: 4},
    startingClass: 'Oni Savage', secondaryClass: 'Ninja',
    baseStats: s(20, 8, 2, 6, 8, 5, 10, 3), growthRates: s(20, 25, 15, 50, 45, 35, 45, 20),
    statCaps: s(45, 24, 19, 16, 20, 17, 23, 18), maxStatModifiers: s(0, -1, -2, 1, 2, 0, 0, 0),
    personalSkill: 'Fiery Blood', supportOptions: [], canMarry: [], isChild: false,
  },
  {
    id: 'hana', name: 'Hana', gender: 'F', route: ['Birthright', 'Revelation'], startingLevel: {Birthright: 4, Revelation: 4},
    startingClass: 'Samurai', secondaryClass: 'Shrine Maiden',
    baseStats: s(20, 9, 0, 11, 11, 5, 6, 9), growthRates: s(25, 55, 10, 45, 55, 25, 20, 30),
    statCaps: s(40, 20, 16, 23, 25, 24, 18, 20), maxStatModifiers: s(0, 1, 1, 2, -1, -3, 1, 0),
    personalSkill: 'Fearsome Blow', supportOptions: [], canMarry: [], isChild: false,
  },
  {
    id: 'subaki', name: 'Subaki', gender: 'M', route: ['Birthright', 'Revelation'], startingLevel: {Birthright: 5, Revelation: 5},
    startingClass: 'Sky Knight', secondaryClass: 'Samurai',
    baseStats: s(22, 8, 0, 13, 10, 7, 9, 10), growthRates: s(55, 30, 20, 50, 20, 25, 45, 5),
    statCaps: s(35, 19, 16, 21, 23, 25, 18, 25), maxStatModifiers: s(0, -1, 2, -2, -1, 3, -1, 0),
    personalSkill: 'Perfectionist', supportOptions: [], canMarry: [], isChild: false,
  },
  {
    id: 'saizo', name: 'Saizo', gender: 'M', route: ['Birthright', 'Revelation'], startingLevel: {Birthright: 7, Revelation: 9},
    startingClass: 'Ninja', secondaryClass: 'Samurai',
    baseStats: s(23, 11, 3, 14, 11, 9, 9, 7), growthRates: s(40, 50, 45, 60, 30, 55, 45, 10),
    statCaps: s(35, 17, 15, 25, 25, 18, 19, 20), maxStatModifiers: s(0, 1, 3, -2, 1, -2, 0, 0),
    personalSkill: 'Pyrotechnics', supportOptions: [], canMarry: [], isChild: false,
  },
  {
    id: 'orochi', name: 'Orochi', gender: 'F', route: ['Birthright', 'Revelation'], startingLevel: {Birthright: 5, Revelation: 7},
    startingClass: 'Diviner', secondaryClass: 'Apothecary',
    baseStats: s(20, 0, 9, 11, 7, 6, 5, 10), growthRates: s(35, 5, 65, 50, 15, 35, 25, 45),
    statCaps: s(35, 17, 22, 20, 23, 19, 16, 20), maxStatModifiers: s(0, 3, 2, -2, -1, -2, 1, 0),
    personalSkill: 'Capture', supportOptions: [], canMarry: [], isChild: false,
  },
  {
    id: 'azama', name: 'Azama', gender: 'M', route: ['Birthright', 'Revelation'], startingLevel: {Birthright: 7, Revelation: 13},
    startingClass: 'Monk', secondaryClass: 'Apothecary',
    baseStats: s(24, 9, 7, 9, 10, 12, 10, 8), growthRates: s(55, 50, 20, 40, 45, 40, 40, 20),
    statCaps: s(35, 18, 21, 20, 22, 23, 17, 24), maxStatModifiers: s(0, 2, -3, 1, 1, 0, 0, 0),
    personalSkill: 'Divine Retribution', supportOptions: [], canMarry: [], isChild: false,
  },
  {
    id: 'setsuna', name: 'Setsuna', gender: 'F', route: ['Birthright', 'Revelation'], startingLevel: {Birthright: 3, Revelation: 11},
    startingClass: 'Archer', secondaryClass: 'Ninja',
    baseStats: s(19, 8, 0, 9, 10, 6, 5, 3), growthRates: s(30, 20, 0, 30, 60, 30, 15, 40),
    statCaps: s(40, 21, 15, 23, 21, 20, 20, 17), maxStatModifiers: s(0, 1, 3, -1, -1, -1, 0, 0),
    personalSkill: 'Optimistic', supportOptions: [], canMarry: [], isChild: false,
  },
  {
    id: 'hayato', name: 'Hayato', gender: 'M', route: ['Birthright', 'Revelation'], startingLevel: {Birthright: 1, Revelation: 9},
    startingClass: 'Diviner', secondaryClass: 'Oni Savage',
    baseStats: s(16, 1, 4, 5, 7, 8, 4, 5), growthRates: s(50, 30, 40, 30, 45, 60, 40, 20),
    statCaps: s(35, 17, 22, 20, 23, 19, 16, 20), maxStatModifiers: s(0, 1, -1, 2, 1, -1, -1, 0),
    personalSkill: 'Pride', supportOptions: [], canMarry: [], isChild: false,
  },
  {
    id: 'oboro', name: 'Oboro', gender: 'F', route: ['Birthright', 'Revelation'], startingLevel: {Birthright: 10, Revelation: 10},
    startingClass: 'Spear Fighter', secondaryClass: 'Apothecary',
    baseStats: s(25, 13, 0, 11, 12, 11, 13, 8), growthRates: s(30, 40, 20, 40, 40, 40, 40, 30),
    statCaps: s(40, 22, 15, 23, 22, 21, 22, 21), maxStatModifiers: s(0, 1, -1, 1, 1, -1, 1, -1),
    personalSkill: 'Nohr Enmity', supportOptions: [], canMarry: [], isChild: false,
  },
  {
    id: 'hinata', name: 'Hinata', gender: 'M', route: ['Birthright', 'Revelation'], startingLevel: {Birthright: 10, Revelation: 10},
    startingClass: 'Samurai', secondaryClass: 'Oni Savage',
    baseStats: s(26, 11, 0, 9, 14, 10, 12, 4), growthRates: s(55, 35, 0, 25, 15, 45, 45, 15),
    statCaps: s(40, 20, 16, 23, 25, 24, 18, 20), maxStatModifiers: s(0, 1, -1, -2, 2, 0, 0, 0),
    personalSkill: 'Triple Threat', supportOptions: [], canMarry: [], isChild: false,
  },
  {
    id: 'kagero', name: 'Kagero', gender: 'F', route: ['Birthright', 'Revelation'], startingLevel: {Birthright: 10, Revelation: 10},
    startingClass: 'Ninja', secondaryClass: 'Diviner',
    baseStats: s(22, 15, 0, 10, 12, 7, 9, 10), growthRates: s(30, 65, 0, 20, 50, 30, 25, 40),
    statCaps: s(35, 17, 15, 25, 25, 18, 19, 20), maxStatModifiers: s(0, 3, -1, -1, -1, 1, 0, 0),
    personalSkill: 'Shuriken Mastery', supportOptions: [], canMarry: [], isChild: false,
  },
  {
    id: 'reina', name: 'Reina', gender: 'F', route: ['Birthright', 'Revelation'], startingLevel: {Birthright: 1, Revelation: 1},
    startingClass: 'Sky Knight', secondaryClass: 'Diviner', joinClass: 'Kinshi Knight',
    baseStats: s(28, 17, 5, 14, 20, 14, 10, 13), growthRates: s(40, 45, 5, 20, 45, 10, 20, 10),
    statCaps: s(50, 27, 26, 33, 31, 34, 25, 31), maxStatModifiers: s(0, 2, 2, -1, -2, -1, 0, 0),
    personalSkill: 'Morbid Celebration', supportOptions: [], canMarry: [], isChild: false,
  },
  {
    id: 'kaden', name: 'Kaden', gender: 'M', route: ['Birthright', 'Revelation'], startingLevel: {Birthright: 14, Revelation: 14},
    startingClass: 'Kitsune', secondaryClass: 'Diviner',
    baseStats: s(30, 15, 1, 12, 19, 14, 9, 14), growthRates: s(45, 40, 10, 25, 45, 50, 35, 40),
    statCaps: s(40, 20, 18, 23, 24, 24, 18, 23), maxStatModifiers: s(0, 1, -3, 2, 1, -2, 2, 0),
    personalSkill: 'Reciprocity', supportOptions: [], canMarry: [], isChild: false,
  },
  {
    id: 'scarlet', name: 'Scarlet', gender: 'F', route: ['Birthright'], startingLevel: {Birthright: 1},
    startingClass: 'Wyvern Rider', secondaryClass: 'Outlaw', joinClass: 'Wyvern Lord',
    baseStats: s(30, 23, 4, 17, 19, 14, 22, 6), growthRates: s(30, 45, 20, 40, 50, 40, 25, 20),
    statCaps: s(60, 33, 25, 33, 29, 28, 35, 26), maxStatModifiers: s(0, 2, 1, -1, 1, -2, 0, 0),
    personalSkill: 'In Extremis', supportOptions: [], canMarry: [], isChild: false,
  },
  {
    id: 'yukimura', name: 'Yukimura', gender: 'M', route: ['Birthright'], startingLevel: {Birthright: 10},
    startingClass: 'Apothecary', secondaryClass: 'Samurai', joinClass: 'Mechanist',
    baseStats: s(38, 25, 3, 29, 23, 18, 21, 22), growthRates: s(25, 25, 5, 40, 15, 30, 25, 30),
    statCaps: s(60, 30, 25, 33, 30, 30, 31, 31), maxStatModifiers: s(0, -1, 3, -1, -1, 0, 0, 0),
    personalSkill: 'Perspicacious', supportOptions: [], canMarry: [], isChild: false,
  },
  {
    id: 'shura', name: 'Shura', gender: 'M', route: ['all'], startingLevel: {Birthright: 10, Conquest: 2, Revelation: 10},
    startingClass: 'Outlaw', secondaryClass: 'Ninja', joinClass: 'Adventurer',
    baseStats: s(34, 20, 11, 23, 27, 15, 14, 24), growthRates: s(30, 25, 10, 20, 35, 30, 15, 35),
    statCaps: s(50, 27, 31, 27, 34, 27, 25, 34), maxStatModifiers: s(0, -1, -1, 3, 0, -1, -2, 2),
    personalSkill: 'Highwayman', supportOptions: [], canMarry: [], isChild: false,
  },
  {
    id: 'izana', name: 'Izana', gender: 'M', route: ['Birthright', 'Conquest'], startingLevel: {Birthright: 5, Conquest: 5},
    startingClass: 'Monk', secondaryClass: 'Samurai', joinClass: 'Onmyoji',
    baseStats: s(31, 8, 23, 25, 18, 17, 14, 24), growthRates: s(45, 15, 35, 55, 30, 45, 35, 35),
    statCaps: s(45, 25, 33, 31, 32, 27, 25, 31), maxStatModifiers: s(0, 0, 1, 1, 0, -2, 1, 0),
    personalSkill: 'Peacebringer', supportOptions: [], canMarry: [], isChild: false,
  },
  {
    // Revelation-exclusive; replaces Izana in that route (Izana dies in Revelation's story).
    // Recruited by building the Hot Spring to Lv3 (same unlock as Izana elsewhere), joining
    // already promoted. Class Set is the Samurai/Oni Savage/Monk Standard Set (confirmed via
    // Serenes Forest's Standard Sets chart), promoting to Swordmaster/Master of Arms, Oni
    // Chieftain/Blacksmith, and Great Master/Onmyoji respectively. Since he joins already
    // promoted, joinsPromoted logic (UnitPlanner.tsx) restricts him to those 6 promoted options.
    id: 'fuga', name: 'Fuga', gender: 'M', route: ['Revelation'], startingLevel: {Revelation: 10},
    startingClass: 'Samurai', secondaryClass: 'Oni Savage', tertiaryClass: 'Monk', joinClass: 'Master of Arms',
    baseStats: s(41, 29, 0, 27, 25, 18, 29, 15), growthRates: s(20, 20, 0, 15, 5, 20, 10, 10),
    statCaps: s(65, 35, 24, 31, 30, 30, 33, 26), maxStatModifiers: s(0, 2, -1, 1, 0, -1, 2, -2),
    personalSkill: 'Wind Disciple', supportOptions: [], canMarry: [], isChild: false,
  },
  {
    id: 'mozu', name: 'Mozu', gender: 'F', route: ['all'], startingLevel: {Birthright: 1, Conquest: 1, Revelation: 1},
    startingClass: 'Villager', secondaryClass: 'Archer',
    baseStats: s(16, 6, 0, 5, 7, 3, 4, 1), growthRates: s(30, 40, 5, 50, 55, 45, 35, 30),
    statCaps: s(35, 19, 15, 19, 19, 22, 18, 15), maxStatModifiers: s(0, 0, 1, 1, 1, -2, 0, 0),
    personalSkill: 'Forager', supportOptions: [], canMarry: [], isChild: false,
  },
  {
    // DLC-exclusive (Anna on the Run); available in all three routes once unlocked.
    id: 'anna', name: 'Anna', gender: 'F', route: ['all'],
    startingClass: 'Outlaw', secondaryClass: 'Troubadour',
    baseStats: s(23, 9, 11, 10, 14, 15, 6, 5), growthRates: s(35, 30, 55, 30, 40, 70, 20, 45),
    statCaps: s(35, 18, 19, 20, 23, 20, 15, 24), maxStatModifiers: s(0, -1, 1, 0, -1, 2, -2, 2),
    personalSkill: 'Make a Killing', supportOptions: [], canMarry: [], isChild: false,
  },

  // ================= CHILDREN =================
  // Kana is two separate character entries in the game's own data (like Corrin), one per gender —
  // NOT a free customization choice independent of Corrin's gender: male Kana is only ever born to
  // Corrin(F) (father variable, whoever she marries), and female Kana only to Corrin(M) (mother
  // variable). Male Kana also has no marriage (S-support) options of his own — only Friendship
  // Seal (A-rank) partners, per supports.ts.
  {
    id: 'kana_m', name: 'Kana M', gender: 'M', route: ['all'], unlockChapter: {Birthright: 8, Conquest: 8, Revelation: 8},
    startingClass: 'Nohr Prince(ss)', secondaryClass: 'Cavalier',
    baseStats: s(7, 3, 6, 8, 8, 9, 5, 5), growthRates: s(30, 35, 30, 40, 45, 45, 25, 25),
    statCaps: s(40, 23, 17, 19, 21, 22, 21, 19), maxStatModifiers: ZERO_MOD,
    personalSkill: 'Draconic Heir', supportOptions: [], canMarry: [], isChild: true,
    possibleParents: { father: [], mother: ['corrin_f'] },
  },
  {
    id: 'kana_f', name: 'Kana F', gender: 'F', route: ['all'], unlockChapter: {Birthright: 8, Conquest: 8, Revelation: 8},
    startingClass: 'Nohr Prince(ss)', secondaryClass: 'Cavalier',
    baseStats: s(7, 3, 6, 8, 8, 9, 5, 5), growthRates: s(30, 35, 30, 40, 45, 45, 25, 25),
    statCaps: s(40, 23, 17, 19, 21, 22, 21, 19), maxStatModifiers: ZERO_MOD,
    personalSkill: 'Draconic Heir', supportOptions: [], canMarry: [], isChild: true,
    possibleParents: { father: ['corrin_m'], mother: [] },
  },
  {
    id: 'shigure', name: 'Shigure', gender: 'M', route: ['all'], unlockChapter: {Birthright: 8, Conquest: 10, Revelation: 8},
    startingClass: 'Sky Knight', secondaryClass: 'Troubadour',
    baseStats: s(9, 6, 1, 7, 7, 5, 8, 7), growthRates: s(35, 45, 5, 45, 35, 25, 35, 25),
    statCaps: s(35, 19, 16, 21, 23, 25, 18, 25), maxStatModifiers: ZERO_MOD,
    personalSkill: 'Perfect Pitch', supportOptions: [], canMarry: [], isChild: true,
    possibleParents: { father: [], mother: ['azura'] },
  },
  {
    id: 'siegbert', name: 'Siegbert', gender: 'M', route: ['Conquest', 'Revelation'], unlockChapter: {Conquest: 17, Revelation: 18},
    startingClass: 'Cavalier', secondaryClass: 'Wyvern Rider',
    baseStats: s(7, 5, 2, 7, 6, 7, 6, 3), growthRates: s(40, 45, 5, 45, 45, 45, 35, 20),
    statCaps: s(40, 22, 15, 21, 20, 24, 22, 21), maxStatModifiers: ZERO_MOD,
    personalSkill: 'Gallant', supportOptions: [], canMarry: [], isChild: true,
    possibleParents: { father: ['xander'], mother: [] },
  },
  {
    id: 'shiro', name: 'Shiro', gender: 'M', route: ['Birthright', 'Revelation'], unlockChapter: {Birthright: 14, Revelation: 18},
    startingClass: 'Spear Fighter', secondaryClass: 'Samurai',
    baseStats: s(8, 7, 0, 5, 3, 6, 8, 5), growthRates: s(50, 50, 0, 40, 35, 35, 45, 30),
    statCaps: s(40, 22, 15, 23, 22, 21, 22, 21), maxStatModifiers: ZERO_MOD,
    personalSkill: 'Noble Cause', supportOptions: [], canMarry: [], isChild: true,
    possibleParents: { father: ['ryoma'], mother: [] },
  },
  {
    id: 'soleil', name: 'Soleil', gender: 'F', route: ['Conquest', 'Revelation'], unlockChapter: {Conquest: 13, Revelation: 18},
    startingClass: 'Mercenary', secondaryClass: 'Ninja',
    baseStats: s(6, 7, 1, 3, 6, 7, 5, 6), growthRates: s(25, 60, 0, 35, 35, 45, 35, 40),
    statCaps: s(40, 22, 15, 24, 22, 20, 21, 19), maxStatModifiers: ZERO_MOD,
    personalSkill: 'Sisterhood', supportOptions: [], canMarry: [], isChild: true,
    possibleParents: { father: ['laslow'], mother: [] },
  },
  {
    id: 'ophelia', name: 'Ophelia', gender: 'F', route: ['Conquest', 'Revelation'], unlockChapter: {Conquest: 9, Revelation: 18},
    startingClass: 'Dark Mage', secondaryClass: 'Samurai',
    baseStats: s(7, 3, 6, 6, 7, 12, 2, 5), growthRates: s(45, 15, 45, 40, 45, 65, 20, 30),
    statCaps: s(35, 19, 24, 16, 19, 18, 19, 22), maxStatModifiers: ZERO_MOD,
    personalSkill: 'Bibliophile', supportOptions: [], canMarry: [], isChild: true,
    possibleParents: { father: ['odin'], mother: [] },
  },
  {
    id: 'nina', name: 'Nina', gender: 'F', route: ['Conquest', 'Revelation'], unlockChapter: {Conquest: 9, Revelation: 18},
    startingClass: 'Outlaw', secondaryClass: 'Dark Mage',
    baseStats: s(5, 8, 5, 5, 5, 11, 3, 10), growthRates: s(30, 45, 30, 35, 40, 50, 25, 45),
    statCaps: s(35, 19, 18, 20, 24, 18, 17, 22), maxStatModifiers: ZERO_MOD,
    personalSkill: 'Daydream', supportOptions: [], canMarry: [], isChild: true,
    possibleParents: { father: ['niles'], mother: [] },
  },
  {
    id: 'percy', name: 'Percy', gender: 'M', route: ['Conquest', 'Revelation'], unlockChapter: {Conquest: 8, Revelation: 15},
    startingClass: 'Wyvern Rider', secondaryClass: 'Fighter',
    baseStats: s(6, 4, 0, 6, 6, 15, 8, 4), growthRates: s(30, 30, 5, 45, 40, 75, 55, 15),
    statCaps: s(40, 22, 17, 21, 20, 19, 24, 15), maxStatModifiers: ZERO_MOD,
    personalSkill: 'Fortunate Son', supportOptions: [], canMarry: [], isChild: true,
    possibleParents: { father: ['arthur'], mother: [] },
  },
  {
    id: 'ignatius', name: 'Ignatius', gender: 'M', route: ['Conquest', 'Revelation'], unlockChapter: {Conquest: 14, Revelation: 15},
    startingClass: 'Knight', secondaryClass: 'Fighter',
    baseStats: s(8, 7, 0, 6, 4, 7, 6, 7), growthRates: s(40, 50, 0, 40, 30, 55, 45, 35),
    statCaps: s(45, 24, 15, 22, 17, 22, 26, 18), maxStatModifiers: ZERO_MOD,
    personalSkill: 'Guarded Bravery', supportOptions: [], canMarry: [], isChild: true,
    possibleParents: { father: ['benny'], mother: [] },
  },
  {
    id: 'sophie', name: 'Sophie', gender: 'F', route: ['all'], unlockChapter: {Birthright: 8, Conquest: 8, Revelation: 15},
    startingClass: 'Cavalier', secondaryClass: 'Mercenary',
    baseStats: s(8, 6, 2, 7, 6, 7, 4, 6), growthRates: s(35, 35, 10, 55, 50, 35, 25, 35),
    statCaps: s(40, 22, 15, 21, 20, 24, 22, 21), maxStatModifiers: ZERO_MOD,
    personalSkill: 'Mischievous', supportOptions: [], canMarry: [], isChild: true,
    possibleParents: { father: ['silas'], mother: [] },
  },
  {
    id: 'midori', name: 'Midori', gender: 'F', route: ['all'], unlockChapter: {Birthright: 16, Conquest: 12, Revelation: 9},
    startingClass: 'Apothecary', secondaryClass: 'Ninja',
    baseStats: s(8, 6, 2, 10, 4, 10, 4, 2), growthRates: s(45, 35, 5, 55, 35, 50, 30, 20),
    statCaps: s(45, 24, 15, 19, 19, 21, 23, 20), maxStatModifiers: ZERO_MOD,
    personalSkill: 'Lucky Charm', supportOptions: [], canMarry: [], isChild: true,
    possibleParents: { father: ['kaze'], mother: [] },
  },
  {
    // Jakob (Dwyer's fixed father) joins Ch1 if Corrin is female, or Ch16/17 if Corrin is male —
    // the app has no "which Corrin gender are you playing" setting to key off of, so this uses the
    // later (male-Corrin) unlock chapter uniformly, to avoid ever falsely flagging Dwyer as
    // available too early. Female-Corrin players can safely ignore the extra wait shown here.
    id: 'dwyer', name: 'Dwyer', gender: 'M', route: ['all'], unlockChapter: {Birthright: 16, Conquest: 17, Revelation: 16},
    startingClass: 'Troubadour', secondaryClass: 'Cavalier',
    baseStats: s(8, 7, 7, 2, 6, 4, 6, 7), growthRates: s(45, 45, 30, 20, 30, 30, 30, 35),
    statCaps: s(35, 16, 19, 24, 20, 23, 16, 21), maxStatModifiers: ZERO_MOD,
    personalSkill: 'Born Steward', supportOptions: [], canMarry: [], isChild: true,
    possibleParents: { father: ['jakob'], mother: [] },
  },
  {
    id: 'forrest', name: 'Forrest', gender: 'M', route: ['Conquest', 'Revelation'], unlockChapter: {Conquest: 15, Revelation: 18},
    startingClass: 'Troubadour', secondaryClass: 'Dark Mage',
    baseStats: s(8, 5, 9, 1, 4, 5, 6, 13), growthRates: s(55, 15, 65, 20, 35, 25, 25, 55),
    statCaps: s(35, 16, 19, 24, 20, 23, 16, 21), maxStatModifiers: ZERO_MOD,
    personalSkill: 'Fierce Counter', supportOptions: [], canMarry: [], isChild: true,
    possibleParents: { father: ['leo'], mother: [] },
  },
  {
    id: 'kiragi', name: 'Kiragi', gender: 'M', route: ['Birthright', 'Revelation'], unlockChapter: {Birthright: 11, Revelation: 11},
    startingClass: 'Archer', secondaryClass: 'Spear Fighter',
    baseStats: s(7, 6, 0, 5, 6, 8, 4, 1), growthRates: s(45, 40, 0, 45, 50, 45, 40, 15),
    statCaps: s(40, 21, 15, 23, 21, 20, 20, 17), maxStatModifiers: ZERO_MOD,
    personalSkill: 'Optimist', supportOptions: [], canMarry: [], isChild: true,
    possibleParents: { father: ['takumi'], mother: [] },
  },
  {
    id: 'asugi', name: 'Asugi', gender: 'M', route: ['Birthright', 'Revelation'], unlockChapter: {Birthright: 8, Revelation: 12},
    startingClass: 'Ninja', secondaryClass: 'Samurai',
    baseStats: s(6, 7, 4, 7, 6, 9, 4, 9), growthRates: s(40, 45, 50, 55, 45, 50, 30, 20),
    statCaps: s(35, 17, 15, 25, 25, 18, 19, 20), maxStatModifiers: ZERO_MOD,
    personalSkill: 'Sweet Tooth', supportOptions: [], canMarry: [], isChild: true,
    possibleParents: { father: ['saizo'], mother: [] },
  },
  {
    id: 'selkie', name: 'Selkie', gender: 'F', route: ['Birthright', 'Revelation'], unlockChapter: {Birthright: 13, Revelation: 14},
    startingClass: 'Kitsune', secondaryClass: 'Diviner',
    baseStats: s(7, 4, 3, 6, 7, 10, 6, 11), growthRates: s(35, 30, 15, 35, 55, 60, 30, 50),
    statCaps: s(40, 20, 18, 23, 24, 24, 18, 23), maxStatModifiers: ZERO_MOD,
    personalSkill: 'Playthings', supportOptions: [], canMarry: [], isChild: true,
    possibleParents: { father: ['kaden'], mother: [] },
  },
  {
    id: 'hisame', name: 'Hisame', gender: 'M', route: ['Birthright', 'Revelation'], unlockChapter: {Birthright: 10, Revelation: 11},
    startingClass: 'Samurai', secondaryClass: 'Oni Savage',
    baseStats: s(6, 6, 1, 7, 5, 4, 5, 4), growthRates: s(50, 40, 0, 40, 40, 25, 30, 20),
    statCaps: s(40, 20, 16, 23, 25, 24, 18, 20), maxStatModifiers: ZERO_MOD,
    personalSkill: 'Calm', supportOptions: [], canMarry: [], isChild: true,
    possibleParents: { father: ['hinata'], mother: [] },
  },
  {
    id: 'mitama', name: 'Mitama', gender: 'F', route: ['Birthright', 'Revelation'], unlockChapter: {Birthright: 9, Revelation: 18},
    startingClass: 'Shrine Maiden', secondaryClass: 'Apothecary',
    baseStats: s(6, 7, 6, 6, 8, 10, 3, 5), growthRates: s(45, 40, 35, 45, 50, 50, 30, 20),
    statCaps: s(35, 18, 21, 20, 22, 23, 17, 24), maxStatModifiers: ZERO_MOD,
    personalSkill: 'Haiku', supportOptions: [], canMarry: [], isChild: true,
    possibleParents: { father: ['azama'], mother: [] },
  },
  {
    id: 'caeldori', name: 'Caeldori', gender: 'F', route: ['Birthright', 'Revelation'], unlockChapter: {Birthright: 8, Revelation: 9},
    startingClass: 'Sky Knight', secondaryClass: 'Samurai',
    baseStats: s(8, 8, 3, 5, 6, 9, 5, 6), growthRates: s(55, 35, 15, 40, 40, 45, 35, 20),
    statCaps: s(35, 19, 16, 21, 23, 25, 18, 25), maxStatModifiers: ZERO_MOD,
    personalSkill: 'Prodigy', supportOptions: [], canMarry: [], isChild: true,
    possibleParents: { father: ['subaki'], mother: [] },
  },
  {
    id: 'rhajat', name: 'Rhajat', gender: 'F', route: ['Birthright', 'Revelation'], unlockChapter: {Birthright: 9, Revelation: 10},
    startingClass: 'Diviner', secondaryClass: 'Oni Savage',
    baseStats: s(8, 1, 10, 0, 7, 6, 5, 12), growthRates: s(40, 15, 60, 10, 50, 30, 25, 35),
    statCaps: s(35, 17, 22, 20, 23, 19, 16, 20), maxStatModifiers: ZERO_MOD,
    personalSkill: 'Vendetta', supportOptions: [], canMarry: [], isChild: true,
    possibleParents: { father: ['hayato'], mother: [] },
  },
  {
    id: 'velouria', name: 'Velouria', gender: 'F', route: ['Conquest', 'Revelation'], unlockChapter: {Conquest: 15, Revelation: 14},
    startingClass: 'Wolfskin', secondaryClass: 'Fighter',
    baseStats: s(7, 6, 0, 6, 6, 11, 9, 8), growthRates: s(50, 50, 0, 40, 40, 35, 45, 30),
    statCaps: s(45, 24, 15, 18, 22, 17, 21, 15), maxStatModifiers: ZERO_MOD,
    personalSkill: 'Goody Basket', supportOptions: [], canMarry: [], isChild: true,
    possibleParents: { father: ['keaton'], mother: [] },
  },
]

// canMarry/supportOptions are derived from supports.ts (the route-aware source of truth) rather
// than hand-duplicated per character, to avoid the two data sets drifting out of sync.
for (const character of characters) {
  const partners = getMarriagePartnerIds(character.id)
  character.canMarry = partners
  character.supportOptions = partners
}

export const charactersById: Record<string, Character> = Object.fromEntries(
  characters.map((c) => [c.id, c]),
)
