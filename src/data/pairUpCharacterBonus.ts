import type { StatBlock } from './types'

/**
 * Per-character Pair Up support-rank stat bonuses — separate from (and additive on top of) each
 * class's own pairUpBonus table in classes.ts. Sourced from Serenes Forest's Pair Up Stats page.
 * Each rank's value is what that rank ALONE contributes, not a running total — per Serenes' own
 * note, the bonuses are cumulative (an S-rank pairing gets C + B + A + S all added together), which
 * the caller is responsible for summing (see cumulativePairUpBonus below).
 *
 * Corrin isn't in this table — their version is keyed by Boon+Bane instead of a character id, since
 * it depends on the player's creation-time picks rather than being fixed. See
 * CORRIN_PAIR_UP_BY_BANE and corrinCumulativePairUpBonus below.
 */
export const PAIR_UP_CHARACTER_BONUS: Record<string, Record<'C' | 'B' | 'A' | 'S', Partial<StatBlock>>> = {
  // Shared characters
  felicia: { C: { spd: 1 }, B: { res: 1 }, A: { mag: 1 }, S: { spd: 1, res: 1 } },
  jakob: { C: { str: 1 }, B: { spd: 1 }, A: { skl: 1 }, S: { str: 1, skl: 1 } },
  kaze: { C: { spd: 1 }, B: { skl: 1 }, A: { res: 1 }, S: { skl: 1, spd: 1 } },
  azura: { C: { spd: 1 }, B: { skl: 1 }, A: { spd: 1 }, S: { spd: 1, lck: 1 } },
  silas: { C: { str: 1 }, B: { skl: 1 }, A: { spd: 1 }, S: { str: 1, def: 1 } },
  shura: { C: { spd: 1 }, B: { res: 1 }, A: { res: 1 }, S: { spd: 1, res: 1 } },
  izana: { C: { skl: 1 }, B: { mag: 1 }, A: { def: 1 }, S: { skl: 1, res: 1 } },
  mozu: { C: { skl: 1 }, B: { lck: 1 }, A: { spd: 1 }, S: { skl: 1, lck: 1 } },

  // Hoshidan exclusive
  rinkah: { C: { def: 1 }, B: { spd: 1 }, A: { str: 1 }, S: { spd: 1, def: 1 } },
  sakura: { C: { mag: 1 }, B: { spd: 1 }, A: { lck: 1 }, S: { spd: 1, res: 1 } },
  hana: { C: { spd: 1 }, B: { str: 1 }, A: { skl: 1 }, S: { str: 1, spd: 1 } },
  subaki: { C: { def: 1 }, B: { skl: 1 }, A: { def: 1 }, S: { skl: 1, res: 1 } },
  saizo: { C: { lck: 1 }, B: { spd: 1 }, A: { skl: 1 }, S: { str: 1, lck: 1 } },
  orochi: { C: { mag: 1 }, B: { skl: 1 }, A: { res: 1 }, S: { mag: 1, res: 1 } },
  hinoka: { C: { res: 1 }, B: { lck: 1 }, A: { str: 1 }, S: { spd: 1, res: 1 } },
  azama: { C: { str: 1 }, B: { spd: 1 }, A: { def: 1 }, S: { str: 1, lck: 1 } },
  setsuna: { C: { spd: 1 }, B: { spd: 1 }, A: { res: 1 }, S: { skl: 1, spd: 1 } },
  hayato: { C: { spd: 1 }, B: { lck: 1 }, A: { mag: 1 }, S: { spd: 1, lck: 1 } },
  oboro: { C: { str: 1 }, B: { def: 1 }, A: { spd: 1 }, S: { skl: 1, lck: 1 } },
  hinata: { C: { def: 1 }, B: { str: 1 }, A: { def: 1 }, S: { str: 1, lck: 1 } },
  takumi: { C: { skl: 1 }, B: { spd: 1 }, A: { str: 1 }, S: { skl: 1, def: 1 } },
  kagero: { C: { str: 1 }, B: { res: 1 }, A: { str: 1 }, S: { spd: 1, res: 1 } },
  reina: { C: { spd: 1 }, B: { str: 1 }, A: { spd: 1 }, S: { str: 1, spd: 1 } },
  kaden: { C: { spd: 1 }, B: { res: 1 }, A: { lck: 1 }, S: { spd: 1, res: 1 } },
  ryoma: { C: { spd: 1 }, B: { str: 1 }, A: { skl: 1 }, S: { spd: 2 } },
  scarlet: { C: { str: 1 }, B: { spd: 1 }, A: { def: 1 }, S: { str: 1, skl: 1 } },
  yukimura: { C: { skl: 1 }, B: { skl: 1 }, A: { str: 1 }, S: { skl: 1, spd: 1 } },

  // Nohrian exclusive
  gunter: { C: { def: 1 }, B: { str: 1 }, A: { skl: 1 }, S: { str: 1, def: 1 } },
  elise: { C: { mag: 1 }, B: { mag: 1 }, A: { lck: 1 }, S: { mag: 1, spd: 1 } },
  arthur: { C: { skl: 1 }, B: { str: 1 }, A: { str: 1 }, S: { skl: 2 } },
  effie: { C: { str: 1 }, B: { lck: 1 }, A: { spd: 1 }, S: { str: 2 } },
  odin: { C: { mag: 1 }, B: { str: 1 }, A: { lck: 1 }, S: { mag: 1, skl: 1 } },
  niles: { C: { spd: 1 }, B: { spd: 1 }, A: { res: 1 }, S: { mag: 1, res: 1 } },
  nyx: { C: { mag: 1 }, B: { spd: 1 }, A: { mag: 1 }, S: { mag: 1, spd: 1 } },
  camilla: { C: { spd: 1 }, B: { res: 1 }, A: { str: 1 }, S: { str: 1, def: 1 } },
  selena: { C: { spd: 1 }, B: { def: 1 }, A: { skl: 1 }, S: { str: 1, spd: 1 } },
  beruka: { C: { skl: 1 }, B: { def: 1 }, A: { skl: 1 }, S: { lck: 1, def: 1 } },
  laslow: { C: { skl: 1 }, B: { str: 1 }, A: { lck: 1 }, S: { str: 1, lck: 1 } },
  peri: { C: { str: 1 }, B: { spd: 1 }, A: { res: 1 }, S: { str: 1, spd: 1 } },
  benny: { C: { def: 1 }, B: { skl: 1 }, A: { str: 1 }, S: { str: 1, def: 1 } },
  charlotte: { C: { str: 1 }, B: { str: 1 }, A: { spd: 1 }, S: { str: 1, spd: 1 } },
  leo: { C: { mag: 1 }, B: { res: 1 }, A: { spd: 1 }, S: { mag: 1, lck: 1 } },
  keaton: { C: { str: 1 }, B: { str: 1 }, A: { def: 1 }, S: { str: 1, def: 1 } },
  xander: { C: { str: 1 }, B: { lck: 1 }, A: { def: 1 }, S: { str: 1, lck: 1 } },
  flora: { C: { skl: 1 }, B: { def: 1 }, A: { res: 1 }, S: { str: 1, lck: 1 } },

  // 3rd-route exclusive
  fuga: { C: { def: 1 }, B: { str: 1 }, A: { skl: 1 }, S: { str: 1, def: 1 } },

  // DLC exclusive
  anna: { C: { lck: 1 }, B: { mag: 1 }, A: { lck: 1 }, S: { lck: 1, res: 1 } },
}

export type Boon = 'hp' | 'str' | 'mag' | 'skl' | 'spd' | 'lck' | 'def' | 'res'
export type RankBonus = Record<'C' | 'B' | 'A' | 'S', Partial<StatBlock>>

/**
 * Corrin's Pair Up bonus, keyed by [bane][boon] (matching Serenes' own per-bane table layout, to
 * keep this a direct transcription rather than a hand-reorganized one that's easier to introduce a
 * transposition error into). Boon and bane can never be the same stat in-game (enforced at
 * character creation), so there's no [x][x] entry for any stat.
 */
export const CORRIN_PAIR_UP_BY_BANE: Record<Boon, Partial<Record<Boon, RankBonus>>> = {
  hp: {
    // Bane: Sickly (HP) — boon=hp is blocked (boon can't equal bane), so this outer "hp" key only
    // ever appears as a BANE value here, never nested under itself.
    str: { C: { str: 1 }, B: { str: 1 }, A: { spd: 1 }, S: { str: 1, skl: 1 } },
    mag: { C: { str: 1 }, B: { mag: 1 }, A: { spd: 1 }, S: { mag: 1, spd: 1 } },
    skl: { C: { str: 1 }, B: { skl: 1 }, A: { spd: 1 }, S: { skl: 1, def: 1 } },
    spd: { C: { str: 1 }, B: { spd: 1 }, A: { spd: 1 }, S: { spd: 1, lck: 1 } },
    lck: { C: { str: 1 }, B: { lck: 1 }, A: { spd: 1 }, S: { str: 1, lck: 1 } },
    def: { C: { str: 1 }, B: { def: 1 }, A: { spd: 1 }, S: { def: 1, res: 1 } },
    res: { C: { str: 1 }, B: { res: 1 }, A: { spd: 1 }, S: { mag: 1, res: 1 } },
  },
  str: {
    hp: { C: { def: 1 }, B: { lck: 1 }, A: { spd: 1 }, S: { def: 1, res: 1 } },
    mag: { C: { mag: 1 }, B: { res: 1 }, A: { spd: 1 }, S: { mag: 1, res: 1 } },
    skl: { C: { skl: 1 }, B: { str: 1 }, A: { spd: 1 }, S: { skl: 1, res: 1 } },
    spd: { C: { spd: 1 }, B: { skl: 1 }, A: { spd: 1 }, S: { spd: 1, res: 1 } },
    lck: { C: { lck: 1 }, B: { mag: 1 }, A: { spd: 1 }, S: { lck: 1, res: 1 } },
    def: { C: { def: 1 }, B: { lck: 1 }, A: { spd: 1 }, S: { def: 1, res: 1 } },
    res: { C: { res: 1 }, B: { spd: 1 }, A: { spd: 1 }, S: { res: 2 } },
  },
  mag: {
    hp: { C: { str: 1 }, B: { def: 1 }, A: { res: 1 }, S: { lck: 1, def: 1 } },
    str: { C: { str: 1 }, B: { def: 1 }, A: { skl: 1 }, S: { str: 1, def: 1 } },
    skl: { C: { str: 1 }, B: { def: 1 }, A: { def: 1 }, S: { str: 1, skl: 1 } },
    spd: { C: { str: 1 }, B: { def: 1 }, A: { lck: 1 }, S: { skl: 1, spd: 1 } },
    lck: { C: { str: 1 }, B: { def: 1 }, A: { str: 1 }, S: { mag: 1, lck: 1 } },
    def: { C: { str: 1 }, B: { def: 1 }, A: { res: 1 }, S: { lck: 1, def: 1 } },
    res: { C: { str: 1 }, B: { def: 1 }, A: { mag: 1 }, S: { spd: 1, res: 1 } },
  },
  skl: {
    hp: { C: { lck: 1 }, B: { res: 1 }, A: { spd: 1 }, S: { def: 1, res: 1 } },
    str: { C: { def: 1 }, B: { skl: 1 }, A: { spd: 1 }, S: { str: 1, res: 1 } },
    mag: { C: { res: 1 }, B: { spd: 1 }, A: { spd: 1 }, S: { mag: 1, res: 1 } },
    spd: { C: { skl: 1 }, B: { lck: 1 }, A: { spd: 1 }, S: { spd: 1, res: 1 } },
    lck: { C: { mag: 1 }, B: { str: 1 }, A: { spd: 1 }, S: { lck: 1, res: 1 } },
    def: { C: { lck: 1 }, B: { res: 1 }, A: { spd: 1 }, S: { def: 1, res: 1 } },
    res: { C: { spd: 1 }, B: { mag: 1 }, A: { spd: 1 }, S: { res: 2 } },
  },
  spd: {
    hp: { C: { str: 1 }, B: { def: 1 }, A: { def: 1 }, S: { def: 1, res: 1 } },
    str: { C: { str: 1 }, B: { def: 1 }, A: { str: 1 }, S: { str: 1, res: 1 } },
    mag: { C: { str: 1 }, B: { def: 1 }, A: { mag: 1 }, S: { mag: 1, res: 1 } },
    skl: { C: { str: 1 }, B: { def: 1 }, A: { skl: 1 }, S: { skl: 1, res: 1 } },
    lck: { C: { str: 1 }, B: { def: 1 }, A: { lck: 1 }, S: { lck: 1, res: 1 } },
    def: { C: { str: 1 }, B: { def: 1 }, A: { def: 1 }, S: { def: 1, res: 1 } },
    res: { C: { str: 1 }, B: { def: 1 }, A: { res: 1 }, S: { res: 2 } },
  },
  lck: {
    hp: { C: { res: 1 }, B: { def: 1 }, A: { spd: 1 }, S: { def: 1, res: 1 } },
    str: { C: { skl: 1 }, B: { def: 1 }, A: { spd: 1 }, S: { str: 1, res: 1 } },
    mag: { C: { spd: 1 }, B: { def: 1 }, A: { spd: 1 }, S: { mag: 1, res: 1 } },
    skl: { C: { def: 1 }, B: { def: 1 }, A: { spd: 1 }, S: { skl: 1, res: 1 } },
    spd: { C: { lck: 1 }, B: { def: 1 }, A: { spd: 1 }, S: { spd: 1, res: 1 } },
    def: { C: { res: 1 }, B: { def: 1 }, A: { spd: 1 }, S: { def: 1, res: 1 } },
    res: { C: { mag: 1 }, B: { def: 1 }, A: { spd: 1 }, S: { res: 2 } },
  },
  def: {
    hp: { C: { str: 1 }, B: { def: 1 }, A: { spd: 1 }, S: { def: 1, res: 1 } },
    str: { C: { str: 1 }, B: { str: 1 }, A: { spd: 1 }, S: { str: 1, skl: 1 } },
    mag: { C: { str: 1 }, B: { mag: 1 }, A: { spd: 1 }, S: { mag: 1, spd: 1 } },
    skl: { C: { str: 1 }, B: { skl: 1 }, A: { spd: 1 }, S: { skl: 1, def: 1 } },
    spd: { C: { str: 1 }, B: { spd: 1 }, A: { spd: 1 }, S: { spd: 1, lck: 1 } },
    lck: { C: { str: 1 }, B: { lck: 1 }, A: { spd: 1 }, S: { str: 1, lck: 1 } },
    res: { C: { str: 1 }, B: { res: 1 }, A: { spd: 1 }, S: { mag: 1, res: 1 } },
  },
  res: {
    hp: { C: { str: 1 }, B: { def: 1 }, A: { lck: 1 }, S: { def: 2 } },
    str: { C: { str: 1 }, B: { def: 1 }, A: { def: 1 }, S: { str: 2 } },
    mag: { C: { str: 1 }, B: { def: 1 }, A: { res: 1 }, S: { mag: 2 } },
    skl: { C: { str: 1 }, B: { def: 1 }, A: { str: 1 }, S: { skl: 2 } },
    spd: { C: { str: 1 }, B: { def: 1 }, A: { skl: 1 }, S: { spd: 2 } },
    lck: { C: { str: 1 }, B: { def: 1 }, A: { mag: 1 }, S: { lck: 2 } },
    def: { C: { str: 1 }, B: { def: 1 }, A: { lck: 1 }, S: { def: 2 } },
  },
}

const EMPTY: Partial<StatBlock> = {}

function addInto(target: Partial<StatBlock>, source: Partial<StatBlock> | undefined) {
  if (!source) return
  for (const [key, value] of Object.entries(source)) {
    const k = key as keyof StatBlock
    target[k] = (target[k] ?? 0) + (value ?? 0)
  }
}

/**
 * Looks up a non-child character's own C/B/A/S entry — a Corrin id resolves through their boon/bane
 * table (CORRIN_PAIR_UP_BY_BANE), everyone else through PAIR_UP_CHARACTER_BONUS directly. Returns
 * undefined both for "not enough data yet" (Corrin missing boon/bane) and "no data at all" (id not
 * in either table, e.g. a child id — see resolveChildEntry in UnitPlanner.tsx for those) — the
 * caller doesn't need to distinguish the two, both mean "can't show a real number yet."
 */
export function resolveAdultOrCorrinEntry(id: string, corrinBoon: Boon | null, corrinBane: Boon | null): RankBonus | undefined {
  if (id === 'corrin_m' || id === 'corrin_f') {
    if (!corrinBoon || !corrinBane || corrinBoon === corrinBane) return undefined
    return CORRIN_PAIR_UP_BY_BANE[corrinBane]?.[corrinBoon]
  }
  return PAIR_UP_CHARACTER_BONUS[id]
}

/**
 * A child's own Pair Up entry isn't looked up anywhere — it's assembled from their parents' own
 * entries: father supplies C and A, mother supplies B and S (per Serenes' Children table — this
 * rule is the same for every child, not character-specific). "Father"/"mother" here mean whichever
 * parent is in that role for this specific child (e.g. Kana M and Shigure have a fixed *mother* and
 * variable father, unlike every other child), not a fixed identity.
 *
 * All-or-nothing: if either side's own entry is undefined (unresolved, or itself another child whose
 * entry couldn't be assembled — see the recursive resolveChildEntry in UnitPlanner.tsx, needed only
 * for Kana marrying another second-gen child), this returns undefined too rather than a partial
 * total from just one side — a half-computed number reads as more confident than it is.
 */
export function combineChildEntry(fatherEntry: RankBonus | undefined, motherEntry: RankBonus | undefined): RankBonus | undefined {
  if (!fatherEntry || !motherEntry) return undefined
  return { C: fatherEntry.C, B: motherEntry.B, A: fatherEntry.A, S: motherEntry.S }
}

/**
 * Sums an entry's per-rank table up through the given rank ('A' = C+B+A, 'S' = C+B+A+S), per
 * Serenes' "cumulative" note. An undefined entry (not enough data to resolve one yet) stays
 * undefined rather than collapsing to zero — the caller uses that to show "–" instead of a real
 * number that would otherwise look like a confirmed (if unimpressive) total. 'none' rank always
 * gives real zeros on a resolved entry, though — "not paired up" is a legitimate value, not missing
 * data, so it's shown as 0 rather than "–".
 */
export function cumulativePairUpBonus(entry: RankBonus | undefined, rank: 'none' | 'A' | 'S'): Partial<StatBlock> | undefined {
  if (!entry) return undefined
  if (rank === 'none') return EMPTY
  const result: Partial<StatBlock> = {}
  addInto(result, entry.C)
  addInto(result, entry.B)
  addInto(result, entry.A)
  if (rank === 'S') addInto(result, entry.S)
  return result
}
