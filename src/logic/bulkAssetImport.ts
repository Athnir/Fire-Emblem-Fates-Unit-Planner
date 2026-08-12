import { characters } from '../data/characters'
import { corrinBodyKey } from '../data/portraitAssets'
import { CORRIN_HAIRSTYLES } from '../data/corrinHairstyles'
import { skills } from '../data/skills'
import { assetKeys, fileToDataUrl, setAsset } from '../data/assetStorage'

export interface MatchedFile {
  file: File
  key: string
  /** Human-readable label for the review list, e.g. "Aegis" or "Xander" or "f_tall — base". */
  label: string
}

export interface MatchResult {
  matched: MatchedFile[]
  /** Files that didn't match anything expected — surfaced so a typo'd or wrong-folder file doesn't silently vanish. */
  unmatched: File[]
}

/** Strips a file's extension and lowercases it, for matching against id-style names (skill ids,
 * character ids) that are already lowercase/underscored the same way the real filenames are. */
function stem(file: File): string {
  return file.name.replace(/\.[^.]+$/, '').toLowerCase()
}

function matchByStem(files: File[], entries: { id: string; label: string }[], keyFor: (id: string) => string): MatchResult {
  const byStem = new Map(entries.map((e) => [e.id.toLowerCase(), e]))
  const matched: MatchedFile[] = []
  const unmatched: File[] = []
  for (const file of files) {
    const entry = byStem.get(stem(file))
    if (entry) matched.push({ file, key: keyFor(entry.id), label: entry.label })
    else unmatched.push(file)
  }
  return { matched, unmatched }
}

/** All 212 skill icons — matches a file named e.g. "aegis.png" against skill id "aegis". */
export function matchSkillFiles(files: File[]): MatchResult {
  const entries = skills.map((s) => ({ id: s.id, label: s.name }))
  return matchByStem(files, entries, assetKeys.skillIcon)
}

/** Plain adult portraits (not children, not Corrin — Corrin has its own multi-body-variant flow below). */
export function matchAdultPortraitFiles(files: File[]): MatchResult {
  const entries = characters
    .filter((c) => !c.isChild && c.id !== 'corrin_m' && c.id !== 'corrin_f')
    .map((c) => ({ id: c.id, label: c.name }))
  return matchByStem(files, entries, assetKeys.portrait)
}

/** One child's base.png + raw.png — the child is picked explicitly (via a dropdown in the UI)
 * rather than inferred from the filename, since "base.png"/"raw.png" repeat across every child. */
export function matchChildPortraitFiles(childId: string, files: File[]): MatchResult {
  const entries = [
    { id: 'base', label: `${childId} — base` },
    { id: 'raw', label: `${childId} — raw` },
  ]
  const keyFor = (id: string) => (id === 'base' ? assetKeys.childPortraitBase(childId) : assetKeys.childPortraitRaw(childId))
  return matchByStem(files, entries, keyFor)
}

/** One Corrin body variant's base.png + up to 12 hair_raw/style<N>.png — same "pick the variant
 * explicitly first" reasoning as matchChildPortraitFiles, since these filenames repeat across variants too. */
export function matchCorrinPortraitFiles(gender: 'M' | 'F', height: 'short' | 'tall', files: File[]): MatchResult {
  const bodyKey = corrinBodyKey(gender, height)
  const entries = [
    { id: 'base', label: `${bodyKey} — base` },
    ...CORRIN_HAIRSTYLES.map((h) => ({ id: h.id, label: `${bodyKey} — ${h.id}` })),
  ]
  const keyFor = (id: string) => (id === 'base' ? assetKeys.corrinBase(bodyKey) : assetKeys.corrinHairRaw(bodyKey, id))
  return matchByStem(files, entries, keyFor)
}

/** Writes every matched file to IndexedDB, calling onProgress after each one (bulk sets can be 200+
 * files — a progress callback lets the UI show something better than a frozen "please wait"). */
export async function storeMatchedFiles(matched: MatchedFile[], onProgress?: (done: number, total: number) => void): Promise<void> {
  for (let i = 0; i < matched.length; i++) {
    const { file, key } = matched[i]
    const dataUrl = await fileToDataUrl(file)
    await setAsset(key, dataUrl)
    onProgress?.(i + 1, matched.length)
  }
}
