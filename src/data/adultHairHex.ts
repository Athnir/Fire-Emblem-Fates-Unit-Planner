/**
 * Canonical hair hex per adult, sourced from a real hex table extracted from the game's own data
 * (verified: its 30-entry Corrin section matches byte-for-byte what we independently pulled from
 * MyUnitEdit.bin in the ROM) — replacing the previous screenshot-sampled values entirely. Confirms
 * two long-suspected errors: Keaton and Shura were sampled as dark grey (`#414141`/`#343434`) from
 * shadow-shading meant to depict streaked/mixed hair, when their actual base hair is near-white.
 * `laslow` has no entry in the source table, so it's kept at its old screenshot-sampled value.
 * Only present for characters with extracted game art (public/art/, git-ignored);
 * Corrin is intentionally excluded (their hair is player-chosen, not fixed game data).
 */
export const adultHairHex: Record<string, string> = {
  anna: '#bf5854',
  arthur: '#feeab7',
  azama: '#785f60',
  azura: '#bae1e1',
  benny: '#f2e3b5',
  beruka: '#a2c0c8',
  camilla: '#bfb7df',
  charlotte: '#ebd9a6',
  effie: '#dcd9d3',
  elise: '#f2e4d1',
  felicia: '#e6c8b4',
  flora: '#c0e0e7',
  fuga: '#603020',
  gunter: '#c8bcc8',
  hana: '#a58d7b',
  hayato: '#8b5a5c',
  hinata: '#6f554b',
  hinoka: '#b42d2d',
  izana: '#f7f5ef',
  jakob: '#d2d2c3',
  kaden: '#d39146',
  kagero: '#4b3935',
  kaze: '#7d9682',
  keaton: '#f5f3f0',
  laslow: '#968e8d',
  leo: '#d2c3aa',
  mozu: '#463e39',
  niles: '#f5f3f0',
  nyx: '#6a6170',
  oboro: '#64708c',
  odin: '#dad3bd',
  orochi: '#8c7b8c',
  peri: '#87bfd8',
  reina: '#5b7396',
  rinkah: '#f5eddc',
  ryoma: '#58332d',
  saizo: '#914343',
  sakura: '#cf786e',
  scarlet: '#efe0b8',
  selena: '#af5454',
  setsuna: '#648a91',
  shura: '#eee8df',
  silas: '#aab4b4',
  subaki: '#8a4144',
  takumi: '#c1b2ac',
  xander: '#d0c29f',
  yukimura: '#6e868e',
}
