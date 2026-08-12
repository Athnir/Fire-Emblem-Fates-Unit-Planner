import type { Route, SupportPair } from './types'

function pair(characterA: string, characterB: string, route: Route[]): SupportPair {
  return { characterA, characterB, maxRank: 'S', route }
}

/** Non-romantic support, caps at A/A+ rank — same-sex "Friendship Seal" pairs, or opposite-sex
 * sibling pairs (e.g. Xander x Camilla) that support but can never marry. */
function pairA(characterA: string, characterB: string, route: Route[]): SupportPair {
  return { characterA, characterB, maxRank: 'A', route }
}

const CR: Route[] = ['Conquest', 'Revelation']
const BR: Route[] = ['Birthright', 'Revelation']
const REV: Route[] = ['Revelation']
const ALL: Route[] = ['all']
const BC: Route[] = ['Birthright', 'Conquest']
const BR_ONLY: Route[] = ['Birthright']

/**
 * S-support (marriage) pairs for the current 21-character adult roster, verified against
 * Fire Emblem Wiki's per-character support pages (exact "S Support" section presence) and
 * cross-checked against Serenes Forest's route recruitment charts (build-plan Phase 1 research
 * pass). Only pairs where BOTH characters are in this roster are included — many characters have
 * additional real marriage options outside this initial roster (e.g. Rinkah, Selena, Nyx) that
 * aren't modeled yet.
 *
 * Note: corrin_m x niles and corrin_f x rhajat are the two same-sex marriages added post-launch
 * (fully valid S-support, unlocks Partner Seal bonuses) but produce no child unit in the actual
 * game — eligibility.ts's canProduceChild already returns false for both via the same-sex check,
 * so no special-casing was needed here.
 */
export const supports: SupportPair[] = [
  // Corrin (M)
  pair('corrin_m', 'camilla', CR),
  pair('corrin_m', 'hinoka', BR),
  pair('corrin_m', 'elise', CR),
  pair('corrin_m', 'sakura', BR),
  pair('corrin_m', 'felicia', ALL),
  pair('corrin_m', 'azura', ALL),
  pair('corrin_m', 'niles', CR),
  pair('corrin_m', 'effie', CR),

  // Corrin (F)
  pair('corrin_f', 'xander', CR),
  pair('corrin_f', 'ryoma', BR),
  pair('corrin_f', 'leo', CR),
  pair('corrin_f', 'takumi', BR),
  pair('corrin_f', 'silas', ALL),
  pair('corrin_f', 'kaze', ALL),
  pair('corrin_f', 'jakob', ALL),
  pair('corrin_f', 'laslow', CR),
  pair('corrin_f', 'odin', CR),
  pair('corrin_f', 'niles', CR),
  pair('corrin_f', 'arthur', CR),
  pair('corrin_f', 'benny', CR),
  pair('corrin_f', 'rhajat', BR),

  // Azura (besides corrin_m above)
  pair('azura', 'xander', CR),
  pair('azura', 'ryoma', BR),
  pair('azura', 'leo', CR),
  pair('azura', 'takumi', BR),
  pair('azura', 'silas', ALL),
  pair('azura', 'kaze', ALL),
  pair('azura', 'jakob', ALL),
  pair('azura', 'laslow', CR),
  pair('azura', 'odin', CR),
  pair('azura', 'niles', CR),
  pair('azura', 'arthur', CR),
  pair('azura', 'benny', CR),

  // Nohr royal x Hoshido royal cross-marriages (Revelation-only intersection)
  pair('xander', 'hinoka', REV),
  pair('xander', 'sakura', REV),
  pair('ryoma', 'camilla', REV),
  pair('ryoma', 'elise', REV),
  pair('camilla', 'takumi', REV),
  pair('hinoka', 'leo', REV),
  pair('leo', 'sakura', REV),
  pair('takumi', 'elise', REV),

  // Xander (remaining)
  pair('xander', 'felicia', CR),
  pair('xander', 'effie', CR),

  // Ryoma (remaining)
  pair('ryoma', 'felicia', BR),

  // Camilla (remaining)
  pair('camilla', 'jakob', CR),
  pair('camilla', 'kaze', CR),
  pair('camilla', 'silas', CR),
  pair('camilla', 'arthur', CR),
  pair('camilla', 'odin', CR),
  pair('camilla', 'niles', CR),
  pair('camilla', 'laslow', CR),
  pair('camilla', 'benny', CR),

  // Hinoka (remaining)
  pair('hinoka', 'jakob', BR),
  pair('hinoka', 'kaze', BR),
  pair('hinoka', 'silas', BR),

  // Leo (remaining)
  pair('leo', 'felicia', CR),
  pair('leo', 'effie', CR),

  // Takumi (remaining)
  pair('takumi', 'felicia', BR),

  // Elise (remaining)
  pair('elise', 'jakob', CR),
  pair('elise', 'kaze', CR),
  pair('elise', 'silas', CR),
  pair('elise', 'arthur', CR),
  pair('elise', 'odin', CR),
  pair('elise', 'niles', CR),
  pair('elise', 'laslow', CR),
  pair('elise', 'benny', CR),

  // Sakura (remaining)
  pair('sakura', 'jakob', BR),
  pair('sakura', 'kaze', BR),
  pair('sakura', 'silas', BR),

  // Silas / Kaze / Jakob (remaining, each x Felicia + Effie)
  pair('silas', 'felicia', ALL),
  pair('silas', 'effie', CR),
  pair('kaze', 'felicia', ALL),
  pair('kaze', 'effie', CR),
  pair('jakob', 'felicia', ALL),
  pair('jakob', 'effie', CR),

  // Felicia (remaining)
  pair('felicia', 'arthur', CR),
  pair('felicia', 'odin', CR),
  pair('felicia', 'niles', CR),
  pair('felicia', 'laslow', CR),
  pair('felicia', 'benny', CR),

  // Retainers x Effie (remaining)
  pair('laslow', 'effie', CR),
  pair('odin', 'effie', CR),
  pair('niles', 'effie', CR),
  pair('arthur', 'effie', CR),
  pair('benny', 'effie', CR),

  // ================= EXPANDED ROSTER (26 additional adults) =================
  // Sourced from Fire Emblem Wiki's full support matrix + per-route playable-character lists
  // (route = intersection of both characters' own route availability).

  // Corrin (M) x new Hoshido/Nohr retainers
  pair('corrin_m', 'rinkah', BR),
  pair('corrin_m', 'hana', BR),
  pair('corrin_m', 'orochi', BR),
  pair('corrin_m', 'setsuna', BR),
  pair('corrin_m', 'oboro', BR),
  pair('corrin_m', 'kagero', BR),
  pair('corrin_m', 'reina', BR),
  pair('corrin_m', 'scarlet', BR),
  pair('corrin_m', 'nyx', CR),
  pair('corrin_m', 'selena', CR),
  pair('corrin_m', 'beruka', CR),
  pair('corrin_m', 'peri', CR),
  pair('corrin_m', 'charlotte', CR),
  pair('corrin_m', 'flora', CR),
  pair('corrin_m', 'mozu', ALL),

  // Corrin (F) x new retainers
  pair('corrin_f', 'gunter', CR),
  pair('corrin_f', 'subaki', BR),
  pair('corrin_f', 'saizo', BR),
  pair('corrin_f', 'azama', BR),
  pair('corrin_f', 'hayato', BR),
  pair('corrin_f', 'hinata', BR),
  pair('corrin_f', 'kaden', BR),
  pair('corrin_f', 'keaton', CR),
  pair('corrin_f', 'shura', ALL),
  pair('corrin_f', 'izana', BC),
  pair('corrin_f', 'yukimura', BR_ONLY),
  pair('corrin_f', 'fuga', REV),

  // Azura x new retainers
  pair('azura', 'subaki', BR),
  pair('azura', 'saizo', BR),
  pair('azura', 'azama', BR),
  pair('azura', 'hayato', BR),
  pair('azura', 'hinata', BR),
  pair('azura', 'kaden', BR),
  pair('azura', 'keaton', CR),

  // Felicia x new retainers
  pair('felicia', 'subaki', BR),
  pair('felicia', 'saizo', BR),
  pair('felicia', 'azama', BR),
  pair('felicia', 'hayato', BR),
  pair('felicia', 'hinata', BR),
  pair('felicia', 'kaden', BR),
  pair('felicia', 'keaton', CR),

  // Jakob x new retainers
  pair('jakob', 'rinkah', BR),
  pair('jakob', 'hana', BR),
  pair('jakob', 'orochi', BR),
  pair('jakob', 'setsuna', BR),
  pair('jakob', 'oboro', BR),
  pair('jakob', 'kagero', BR),
  pair('jakob', 'nyx', CR),
  pair('jakob', 'selena', CR),
  pair('jakob', 'beruka', CR),
  pair('jakob', 'peri', CR),
  pair('jakob', 'charlotte', CR),
  pair('jakob', 'mozu', ALL),

  // Kaze x new retainers
  pair('kaze', 'hana', BR),
  pair('kaze', 'orochi', BR),
  pair('kaze', 'setsuna', BR),
  pair('kaze', 'oboro', BR),
  pair('kaze', 'kagero', BR),
  pair('kaze', 'nyx', CR),
  pair('kaze', 'selena', CR),
  pair('kaze', 'beruka', CR),
  pair('kaze', 'peri', CR),
  pair('kaze', 'charlotte', CR),
  pair('kaze', 'mozu', ALL),

  // Silas x new retainers
  pair('silas', 'hana', BR),
  pair('silas', 'orochi', BR),
  pair('silas', 'setsuna', BR),
  pair('silas', 'oboro', BR),
  pair('silas', 'kagero', BR),
  pair('silas', 'nyx', CR),
  pair('silas', 'selena', CR),
  pair('silas', 'beruka', CR),
  pair('silas', 'peri', CR),
  pair('silas', 'charlotte', CR),
  pair('silas', 'mozu', ALL),

  // Benny x the five universal-partner retainers (Nyx/Selena/Beruka/Peri/Charlotte) — missing from
  // the initial roster pass despite being modeled for every other eligible male (corrin_m, jakob,
  // kaze, silas, etc. above); added after Ignatius's real reference chart showed all 13 mothers
  // (these 5 plus the 8 already present) as valid, confirming the gap rather than the app's list.
  pair('benny', 'nyx', CR),
  pair('benny', 'selena', CR),
  pair('benny', 'beruka', CR),
  pair('benny', 'peri', CR),
  pair('benny', 'charlotte', CR),

  // Arthur x the same five — same gap, found via Percy's reference chart (13 valid mothers vs.
  // the app's 8 before this fix).
  pair('arthur', 'nyx', CR),
  pair('arthur', 'selena', CR),
  pair('arthur', 'beruka', CR),
  pair('arthur', 'peri', CR),
  pair('arthur', 'charlotte', CR),

  // Odin x the same five — found via Ophelia's reference chart, same gap a third time.
  pair('odin', 'nyx', CR),
  pair('odin', 'selena', CR),
  pair('odin', 'beruka', CR),
  pair('odin', 'peri', CR),
  pair('odin', 'charlotte', CR),

  // Laslow and Niles x the same five — not caught by a specific reference-chart check, but the
  // same "male Nohr retainer" archetype as Benny/Arthur/Odin above (all missing this same block
  // before their fixes), so fixed proactively rather than waiting to find it the same way a
  // fourth and fifth time.
  pair('laslow', 'nyx', CR),
  pair('laslow', 'selena', CR),
  pair('laslow', 'beruka', CR),
  pair('laslow', 'peri', CR),
  pair('laslow', 'charlotte', CR),
  pair('niles', 'nyx', CR),
  pair('niles', 'selena', CR),
  pair('niles', 'beruka', CR),
  pair('niles', 'peri', CR),
  pair('niles', 'charlotte', CR),

  // Rinkah (remaining)
  pair('rinkah', 'kaze', BR),
  pair('rinkah', 'subaki', BR),
  pair('rinkah', 'silas', BR),
  pair('rinkah', 'saizo', BR),
  pair('rinkah', 'azama', BR),
  pair('rinkah', 'hayato', BR),
  pair('rinkah', 'hinata', BR),
  pair('rinkah', 'takumi', BR),
  pair('rinkah', 'kaden', BR),
  pair('rinkah', 'ryoma', BR),
  pair('rinkah', 'benny', REV),
  pair('rinkah', 'keaton', REV),

  // Sakura (remaining)
  pair('sakura', 'subaki', BR),
  pair('sakura', 'saizo', BR),
  pair('sakura', 'azama', BR),
  pair('sakura', 'hayato', BR),
  pair('sakura', 'hinata', BR),
  pair('sakura', 'kaden', BR),

  // Hana (remaining)
  pair('hana', 'subaki', BR),
  pair('hana', 'saizo', BR),
  pair('hana', 'azama', BR),
  pair('hana', 'hayato', BR),
  pair('hana', 'hinata', BR),
  pair('hana', 'takumi', BR),
  pair('hana', 'kaden', BR),
  pair('hana', 'ryoma', BR),
  pair('hana', 'laslow', REV),
  pair('hana', 'keaton', REV),

  // Subaki (remaining)
  pair('subaki', 'orochi', BR),
  pair('subaki', 'hinoka', BR),
  pair('subaki', 'setsuna', BR),
  pair('subaki', 'oboro', BR),
  pair('subaki', 'kagero', BR),
  pair('subaki', 'nyx', REV),
  pair('subaki', 'selena', REV),
  pair('subaki', 'mozu', BR),

  // Saizo (remaining)
  pair('saizo', 'orochi', BR),
  pair('saizo', 'hinoka', BR),
  pair('saizo', 'setsuna', BR),
  pair('saizo', 'oboro', BR),
  pair('saizo', 'kagero', BR),
  pair('saizo', 'beruka', REV),
  pair('saizo', 'charlotte', REV),
  pair('saizo', 'mozu', BR),

  // Orochi (remaining)
  pair('orochi', 'azama', BR),
  pair('orochi', 'hayato', BR),
  pair('orochi', 'hinata', BR),
  pair('orochi', 'takumi', BR),
  pair('orochi', 'kaden', BR),
  pair('orochi', 'ryoma', BR),
  pair('orochi', 'odin', REV),
  pair('orochi', 'laslow', REV),

  // Hinoka (remaining)
  pair('hinoka', 'azama', BR),
  pair('hinoka', 'hayato', BR),
  pair('hinoka', 'hinata', BR),
  pair('hinoka', 'kaden', BR),

  // Azama (remaining)
  pair('azama', 'setsuna', BR),
  pair('azama', 'oboro', BR),
  pair('azama', 'kagero', BR),
  pair('azama', 'effie', REV),
  pair('azama', 'beruka', REV),
  pair('azama', 'mozu', BR),

  // Setsuna (remaining)
  pair('setsuna', 'hayato', BR),
  pair('setsuna', 'hinata', BR),
  pair('setsuna', 'takumi', BR),
  pair('setsuna', 'kaden', BR),
  pair('setsuna', 'ryoma', BR),
  pair('setsuna', 'arthur', REV),
  pair('setsuna', 'niles', REV),

  // Hayato (remaining)
  pair('hayato', 'oboro', BR),
  pair('hayato', 'kagero', BR),
  pair('hayato', 'effie', REV),
  pair('hayato', 'nyx', REV),
  pair('hayato', 'mozu', BR),

  // Oboro (remaining)
  pair('oboro', 'hinata', BR),
  pair('oboro', 'takumi', BR),
  pair('oboro', 'kaden', BR),
  pair('oboro', 'ryoma', BR),
  pair('oboro', 'niles', REV),
  pair('oboro', 'benny', REV),

  // Hinata (remaining)
  pair('hinata', 'kagero', BR),
  pair('hinata', 'selena', REV),
  pair('hinata', 'peri', REV),
  pair('hinata', 'mozu', BR),

  // Takumi (remaining)
  pair('takumi', 'kagero', BR),
  pair('takumi', 'mozu', BR),

  // Kagero (remaining)
  pair('kagero', 'kaden', BR),
  pair('kagero', 'ryoma', BR),
  pair('kagero', 'arthur', REV),
  pair('kagero', 'odin', REV),

  // Kaden (remaining)
  pair('kaden', 'peri', REV),
  pair('kaden', 'charlotte', REV),
  pair('kaden', 'mozu', BR),

  // Ryoma (remaining)
  pair('ryoma', 'mozu', BR),

  // Elise / Arthur / Effie / Odin / Niles / Camilla x Keaton, Nyx, Mozu (remaining)
  pair('elise', 'keaton', CR),
  pair('effie', 'keaton', CR),
  pair('arthur', 'mozu', CR),
  pair('odin', 'mozu', CR),
  pair('niles', 'mozu', CR),
  pair('camilla', 'keaton', CR),
  pair('benny', 'mozu', CR),
  pair('leo', 'mozu', CR),
  pair('xander', 'mozu', CR),
  pair('laslow', 'mozu', CR),
  pair('keaton', 'mozu', CR),

  // Nyx (remaining)
  pair('nyx', 'leo', CR),
  pair('nyx', 'keaton', CR),
  pair('nyx', 'xander', CR),

  // Selena (remaining)
  pair('selena', 'leo', CR),
  pair('selena', 'keaton', CR),
  pair('selena', 'xander', CR),

  // Beruka (remaining)
  pair('beruka', 'leo', CR),
  pair('beruka', 'keaton', CR),
  pair('beruka', 'xander', CR),

  // Peri (remaining)
  pair('peri', 'leo', CR),
  pair('peri', 'keaton', CR),
  pair('peri', 'xander', CR),

  // Charlotte (remaining)
  pair('charlotte', 'leo', CR),
  pair('charlotte', 'keaton', CR),
  pair('charlotte', 'xander', CR),

  // Anna (DLC) -- her only S-support in the base game is male Corrin (opposite-sex only;
  // female Corrin's canonical same-sex option is Rhajat, not Anna).
  pair('anna', 'corrin_m', ALL),

  // Corrin x second-generation children (verified against Fire Emblem Wiki's master supports
  // list): Corrin CAN marry many children, not just adults. Route = the child's own route (Corrin
  // is available on 'all'). If Corrin later becomes that SPECIFIC child's actual parent via a
  // separate pairing in the same plan, childLookup.ts's isFamilyBlocked catches the conflict at
  // pairing time — these entries only describe the S-support existing at all.
  pair('corrin_m', 'sophie', ALL),
  pair('corrin_m', 'midori', ALL),
  pair('corrin_m', 'selkie', BR),
  pair('corrin_m', 'mitama', BR),
  pair('corrin_m', 'caeldori', BR),
  pair('corrin_m', 'rhajat', BR),
  pair('corrin_m', 'velouria', CR),
  pair('corrin_m', 'ophelia', CR),
  pair('corrin_m', 'soleil', CR),
  pair('corrin_m', 'nina', CR),

  pair('corrin_f', 'shigure', ALL),
  pair('corrin_f', 'dwyer', ALL),
  pair('corrin_f', 'shiro', BR),
  pair('corrin_f', 'kiragi', BR),
  pair('corrin_f', 'asugi', BR),
  pair('corrin_f', 'hisame', BR),
  pair('corrin_f', 'siegbert', CR),
  pair('corrin_f', 'forrest', CR),
  pair('corrin_f', 'ignatius', CR),
  pair('corrin_f', 'percy', CR),

  // Kana M's marriage roster mirrors Corrin(M)'s exactly (both confirmed via Fire Emblem Wiki's
  // Kana(male) Endings/Supports pages) — this was missing entirely before this verification pass.
  pair('kana_m', 'sophie', ALL),
  pair('kana_m', 'midori', ALL),
  pair('kana_m', 'selkie', BR),
  pair('kana_m', 'mitama', BR),
  pair('kana_m', 'caeldori', BR),
  pair('kana_m', 'rhajat', BR),
  pair('kana_m', 'velouria', CR),
  pair('kana_m', 'ophelia', CR),
  pair('kana_m', 'soleil', CR),
  pair('kana_m', 'nina', CR),

  // Child x child (second-generation) S-supports (verified against Fire Emblem Wiki's master
  // supports list). Route = intersection of both children's own routes. Not every opposite-gender
  // pair exists — each character has a small curated roster, same as the adults.
  pair('forrest', 'sophie', CR),
  pair('forrest', 'midori', CR),
  pair('forrest', 'selkie', REV),
  pair('forrest', 'rhajat', REV),
  pair('forrest', 'velouria', CR),
  pair('forrest', 'ophelia', CR),
  pair('forrest', 'soleil', CR),
  pair('forrest', 'nina', CR),
  pair('forrest', 'kana_f', CR),

  pair('ignatius', 'sophie', CR),
  pair('ignatius', 'midori', CR),
  pair('ignatius', 'selkie', REV),
  pair('ignatius', 'caeldori', REV),
  pair('ignatius', 'velouria', CR),
  pair('ignatius', 'ophelia', CR),
  pair('ignatius', 'soleil', CR),
  pair('ignatius', 'nina', CR),
  pair('ignatius', 'kana_f', CR),

  pair('percy', 'sophie', CR),
  pair('percy', 'midori', CR),
  pair('percy', 'mitama', REV),
  pair('percy', 'rhajat', REV),
  pair('percy', 'velouria', CR),
  pair('percy', 'ophelia', CR),
  pair('percy', 'soleil', CR),
  pair('percy', 'nina', CR),
  pair('percy', 'kana_f', CR),

  pair('siegbert', 'sophie', CR),
  pair('siegbert', 'midori', CR),
  pair('siegbert', 'mitama', REV),
  pair('siegbert', 'caeldori', REV),
  pair('siegbert', 'velouria', CR),
  pair('siegbert', 'ophelia', CR),
  pair('siegbert', 'soleil', CR),
  pair('siegbert', 'nina', CR),
  pair('siegbert', 'kana_f', CR),

  pair('kiragi', 'sophie', BR),
  pair('kiragi', 'midori', BR),
  pair('kiragi', 'selkie', BR),
  pair('kiragi', 'mitama', BR),
  pair('kiragi', 'caeldori', BR),
  pair('kiragi', 'rhajat', BR),
  pair('kiragi', 'velouria', REV),
  pair('kiragi', 'soleil', REV),
  pair('kiragi', 'kana_f', BR),

  pair('shiro', 'sophie', BR),
  pair('shiro', 'midori', BR),
  pair('shiro', 'selkie', BR),
  pair('shiro', 'mitama', BR),
  pair('shiro', 'caeldori', BR),
  pair('shiro', 'rhajat', BR),
  pair('shiro', 'ophelia', REV),
  pair('shiro', 'nina', REV),
  pair('shiro', 'kana_f', BR),

  pair('asugi', 'sophie', BR),
  pair('asugi', 'midori', BR),
  pair('asugi', 'selkie', BR),
  pair('asugi', 'mitama', BR),
  pair('asugi', 'caeldori', BR),
  pair('asugi', 'rhajat', BR),
  pair('asugi', 'soleil', REV),
  pair('asugi', 'nina', REV),
  pair('asugi', 'kana_f', BR),

  pair('hisame', 'sophie', BR),
  pair('hisame', 'midori', BR),
  pair('hisame', 'selkie', BR),
  pair('hisame', 'mitama', BR),
  pair('hisame', 'caeldori', BR),
  pair('hisame', 'rhajat', BR),
  pair('hisame', 'velouria', REV),
  pair('hisame', 'ophelia', REV),
  pair('hisame', 'kana_f', BR),

  // Shigure (variable father means his own route is 'all', same as Dwyer — full set of 10 + Kana).
  pair('shigure', 'sophie', ALL),
  pair('shigure', 'midori', ALL),
  pair('shigure', 'selkie', BR),
  pair('shigure', 'mitama', BR),
  pair('shigure', 'caeldori', BR),
  pair('shigure', 'rhajat', BR),
  pair('shigure', 'velouria', CR),
  pair('shigure', 'ophelia', CR),
  pair('shigure', 'soleil', CR),
  pair('shigure', 'nina', CR),
  pair('shigure', 'kana_f', ALL),

  pair('dwyer', 'sophie', ALL),
  pair('dwyer', 'midori', ALL),
  pair('dwyer', 'selkie', BR),
  pair('dwyer', 'mitama', BR),
  pair('dwyer', 'caeldori', BR),
  pair('dwyer', 'rhajat', BR),
  pair('dwyer', 'velouria', CR),
  pair('dwyer', 'ophelia', CR),
  pair('dwyer', 'soleil', CR),
  pair('dwyer', 'nina', CR),
  pair('dwyer', 'kana_f', ALL),

  // Non-romantic A/A+ supports (verified against Fire Emblem Wiki's "List of supports" page,
  // Non-romantic supports table): same-sex pairs unlock Friendship Seal reclassing; opposite-sex
  // sibling pairs (Nohr/Hoshido royal families) support but can never marry. The two same-sex
  // marriage exceptions (corrin_m x niles, corrin_f x rhajat) are S-rank above, not here.
  pairA('arthur', 'azama', REV),
  pairA('arthur', 'benny', CR),
  pairA('arthur', 'keaton', CR),
  pairA('asugi', 'hisame', BR),
  pairA('asugi', 'ignatius', REV),
  pairA('azama', 'hayato', BR),
  pairA('azama', 'kaden', BR),
  pairA('azura', 'elise', CR),
  pairA('azura', 'hinoka', BR),
  pairA('azura', 'sakura', BR),
  pairA('benny', 'hayato', REV),
  pairA('benny', 'keaton', CR),
  pairA('beruka', 'charlotte', CR),
  pairA('beruka', 'oboro', REV),
  pairA('caeldori', 'nina', REV),
  pairA('caeldori', 'rhajat', BR),
  pairA('camilla', 'beruka', CR),
  pairA('camilla', 'elise', CR),
  pairA('camilla', 'hinoka', REV),
  pairA('camilla', 'leo', CR),
  pairA('camilla', 'selena', CR),
  pairA('charlotte', 'rinkah', REV),
  pairA('corrin_f', 'anna', ALL),
  pairA('corrin_f', 'azura', ALL),
  pairA('corrin_f', 'beruka', CR),
  pairA('corrin_f', 'caeldori', BR),
  pairA('corrin_f', 'camilla', CR),
  pairA('corrin_f', 'charlotte', CR),
  pairA('corrin_f', 'effie', CR),
  pairA('corrin_f', 'elise', CR),
  pairA('corrin_f', 'felicia', ALL),
  pairA('corrin_f', 'flora', CR),
  pairA('corrin_f', 'hana', BR),
  pairA('corrin_f', 'hinoka', BR),
  pairA('corrin_f', 'kagero', BR),
  pairA('corrin_f', 'midori', ALL),
  pairA('corrin_f', 'mitama', BR),
  pairA('corrin_f', 'mozu', ALL),
  pairA('corrin_f', 'nina', CR),
  pairA('corrin_f', 'nyx', CR),
  pairA('corrin_f', 'oboro', BR),
  pairA('corrin_f', 'ophelia', CR),
  pairA('corrin_f', 'orochi', BR),
  pairA('corrin_f', 'peri', CR),
  pairA('corrin_f', 'reina', BR),
  pairA('corrin_f', 'rinkah', BR),
  pairA('corrin_f', 'sakura', BR),
  pairA('corrin_f', 'scarlet', BR),
  pairA('corrin_f', 'selena', CR),
  pairA('corrin_f', 'selkie', BR),
  pairA('corrin_f', 'setsuna', BR),
  pairA('corrin_f', 'soleil', CR),
  pairA('corrin_f', 'sophie', ALL),
  pairA('corrin_f', 'velouria', CR),
  pairA('corrin_m', 'arthur', CR),
  pairA('corrin_m', 'asugi', BR),
  pairA('corrin_m', 'azama', BR),
  pairA('corrin_m', 'benny', CR),
  pairA('corrin_m', 'dwyer', ALL),
  pairA('corrin_m', 'forrest', CR),
  pairA('corrin_m', 'gunter', CR),
  pairA('corrin_m', 'hayato', BR),
  pairA('corrin_m', 'hinata', BR),
  pairA('corrin_m', 'hisame', BR),
  pairA('corrin_m', 'ignatius', CR),
  pairA('corrin_m', 'izana', BC),
  pairA('corrin_m', 'jakob', ALL),
  pairA('corrin_m', 'kaden', BR),
  pairA('corrin_m', 'kaze', ALL),
  pairA('corrin_m', 'keaton', CR),
  pairA('corrin_m', 'kiragi', BR),
  pairA('corrin_m', 'laslow', CR),
  pairA('corrin_m', 'leo', CR),
  pairA('corrin_m', 'odin', CR),
  pairA('corrin_m', 'percy', CR),
  pairA('corrin_m', 'ryoma', BR),
  pairA('corrin_m', 'saizo', BR),
  pairA('corrin_m', 'shigure', ALL),
  pairA('corrin_m', 'shiro', BR),
  pairA('corrin_m', 'shura', ALL),
  pairA('corrin_m', 'siegbert', CR),
  pairA('corrin_m', 'silas', ALL),
  pairA('corrin_m', 'subaki', BR),
  pairA('corrin_m', 'takumi', BR),
  pairA('corrin_m', 'xander', CR),
  pairA('corrin_m', 'yukimura', BR_ONLY),
  pairA('dwyer', 'asugi', BR),
  pairA('dwyer', 'kiragi', BR),
  pairA('dwyer', 'percy', CR),
  pairA('effie', 'hana', REV),
  pairA('effie', 'mozu', CR),
  pairA('effie', 'nyx', CR),
  pairA('elise', 'effie', CR),
  pairA('elise', 'sakura', REV),
  pairA('felicia', 'flora', CR),
  pairA('felicia', 'hana', BR),
  pairA('felicia', 'peri', CR),
  pairA('forrest', 'ignatius', CR),
  pairA('hana', 'setsuna', BR),
  pairA('hayato', 'kaden', BR),
  pairA('fuga', 'hayato', REV),
  pairA('hinata', 'kaden', BR),
  pairA('hinoka', 'sakura', BR),
  pairA('hinoka', 'setsuna', BR),
  pairA('hinoka', 'takumi', BR),
  pairA('hisame', 'percy', REV),
  pairA('ignatius', 'percy', CR),
  pairA('jakob', 'gunter', CR),
  // Kana(M) same-sex friendship (as opposed to Kana(F)'s opposite-sex marriage with the same boys, above).
  pairA('kana_m', 'shiro', BR),
  pairA('kana_m', 'siegbert', CR),
  pairA('kana_m', 'percy', CR),
  pairA('kana_f', 'midori', ALL),
  pairA('kana_f', 'mitama', BR),
  pairA('kana_f', 'selkie', BR),
  pairA('kana_f', 'velouria', CR),
  pairA('kaze', 'saizo', BR),
  pairA('keaton', 'kaden', REV),
  pairA('kiragi', 'forrest', REV),
  pairA('kiragi', 'hisame', BR),
  pairA('laslow', 'keaton', CR),
  pairA('laslow', 'odin', CR),
  pairA('laslow', 'saizo', REV),
  pairA('leo', 'elise', CR),
  pairA('leo', 'niles', CR),
  pairA('leo', 'odin', CR),
  pairA('leo', 'takumi', REV),
  pairA('midori', 'ophelia', CR),
  pairA('midori', 'selkie', BR),
  pairA('mitama', 'caeldori', BR),
  pairA('mitama', 'rhajat', BR),
  pairA('mitama', 'soleil', REV),
  pairA('niles', 'arthur', CR),
  pairA('niles', 'subaki', REV),
  pairA('nyx', 'charlotte', CR),
  pairA('nyx', 'mozu', CR),
  pairA('nyx', 'orochi', REV),
  pairA('oboro', 'mozu', BR),
  pairA('odin', 'hinata', REV),
  pairA('odin', 'niles', CR),
  pairA('ophelia', 'soleil', CR),
  pairA('orochi', 'kagero', BR),
  pairA('orochi', 'oboro', BR),
  pairA('peri', 'charlotte', CR),
  pairA('peri', 'kagero', REV),
  pairA('rhajat', 'ophelia', REV),
  pairA('rinkah', 'kagero', BR),
  pairA('rinkah', 'oboro', BR),
  pairA('rinkah', 'orochi', BR),
  pairA('ryoma', 'hinoka', BR),
  pairA('ryoma', 'saizo', BR),
  pairA('ryoma', 'sakura', BR),
  pairA('ryoma', 'silas', BR),
  pairA('ryoma', 'takumi', BR),
  pairA('sakura', 'hana', BR),
  pairA('selena', 'beruka', CR),
  pairA('selena', 'peri', CR),
  pairA('selena', 'setsuna', REV),
  pairA('selkie', 'rhajat', BR),
  pairA('selkie', 'velouria', REV),
  pairA('setsuna', 'kagero', BR),
  pairA('shigure', 'forrest', CR),
  pairA('shigure', 'hisame', BR),
  pairA('shiro', 'asugi', BR),
  pairA('shiro', 'kiragi', BR),
  pairA('shiro', 'siegbert', REV),
  pairA('siegbert', 'forrest', CR),
  pairA('siegbert', 'ignatius', CR),
  pairA('silas', 'jakob', ALL),
  pairA('silas', 'kaze', ALL),
  pairA('soleil', 'nina', CR),
  pairA('sophie', 'caeldori', BR),
  pairA('sophie', 'soleil', CR),
  pairA('sophie', 'velouria', CR),
  pairA('subaki', 'azama', BR),
  pairA('subaki', 'hinata', BR),
  pairA('subaki', 'saizo', BR),
  pairA('takumi', 'hinata', BR),
  pairA('takumi', 'jakob', BR),
  pairA('takumi', 'sakura', BR),
  pairA('velouria', 'nina', CR),
  pairA('xander', 'camilla', CR),
  pairA('xander', 'elise', CR),
  pairA('xander', 'kaze', CR),
  pairA('xander', 'laslow', CR),
  pairA('xander', 'leo', CR),
  pairA('xander', 'ryoma', REV),
]

/** Every character this one can reach an S-support (marriage) with, in at least one route. */
export function getMarriagePartnerIds(characterId: string): string[] {
  return supports
    .filter((p) => p.maxRank === 'S' && (p.characterA === characterId || p.characterB === characterId))
    .map((p) => (p.characterA === characterId ? p.characterB : p.characterA))
}
