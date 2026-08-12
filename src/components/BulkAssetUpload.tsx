import { useState } from 'react'
import { characters } from '../data/characters'
import {
  matchAdultPortraitFiles,
  matchChildPortraitFiles,
  matchCorrinPortraitFiles,
  matchSkillFiles,
  storeMatchedFiles,
  type MatchResult,
} from '../logic/bulkAssetImport'
import { useEditSessionStore } from '../state/editSessionStore'

const CHILDREN = characters.filter((c) => c.isChild)
const CORRIN_BODY_VARIANTS: { gender: 'M' | 'F'; height: 'short' | 'tall'; label: string }[] = [
  { gender: 'M', height: 'short', label: 'Corrin M — short' },
  { gender: 'M', height: 'tall', label: 'Corrin M — tall' },
  { gender: 'F', height: 'short', label: 'Corrin F — short' },
  { gender: 'F', height: 'tall', label: 'Corrin F — tall' },
]

/**
 * One "pick files -> preview matches -> confirm" block, reused for all four asset groups below.
 * Deliberately NOT wired into Edit Mode's per-key revert-tracking (recordChange) the way single-icon
 * uploads are — this is a bulk "restore my backup" action, same philosophy as the Export/Import
 * Backup feature: it commits straight to storage rather than needing a session-level undo.
 */
function UploadSection({
  title,
  hint,
  match,
}: {
  title: string
  hint: string
  match: (files: File[]) => MatchResult
}) {
  const [result, setResult] = useState<MatchResult | null>(null)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done'>('idle')
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const bumpAssetEpoch = useEditSessionStore((state) => state.bumpAssetEpoch)

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0) return
    setResult(match(files))
    setStatus('idle')
  }

  async function handleUpload() {
    if (!result || result.matched.length === 0) return
    setStatus('uploading')
    await storeMatchedFiles(result.matched, (done, total) => setProgress({ done, total }))
    bumpAssetEpoch()
    setStatus('done')
    setResult(null)
  }

  return (
    <div className="space-y-2 rounded-md border border-neutral-800 bg-neutral-950 p-3">
      <h4 className="text-sm font-semibold text-neutral-200">{title}</h4>
      <p className="text-xs text-neutral-500">{hint}</p>
      <input
        type="file"
        accept="image/png"
        multiple
        onChange={handleFiles}
        className="block w-full text-sm text-neutral-300 file:mr-3 file:rounded-md file:border-0 file:bg-neutral-800 file:px-3 file:py-1.5 file:text-neutral-200"
      />
      {result && (
        <div className="space-y-2 text-xs">
          <p className="text-emerald-400">{result.matched.length} file{result.matched.length === 1 ? '' : 's'} matched.</p>
          {result.unmatched.length > 0 && (
            <p className="text-amber-400">
              {result.unmatched.length} file{result.unmatched.length === 1 ? '' : 's'} didn't match anything expected:{' '}
              {result.unmatched.map((f) => f.name).join(', ')}
            </p>
          )}
          {result.matched.length > 0 && status !== 'done' && (
            <button
              type="button"
              onClick={handleUpload}
              disabled={status === 'uploading'}
              className="rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {status === 'uploading' ? `Uploading ${progress.done}/${progress.total}…` : `Upload ${result.matched.length} image${result.matched.length === 1 ? '' : 's'}`}
            </button>
          )}
        </div>
      )}
      {status === 'done' && <p className="text-xs text-emerald-400">Done — already visible anywhere they're shown, no reload needed.</p>}
    </div>
  )
}

export function BulkAssetUpload({ onClose }: { onClose: () => void }) {
  const [childId, setChildId] = useState(CHILDREN[0]?.id ?? '')
  const [corrinVariantIndex, setCorrinVariantIndex] = useState(0)
  const corrinVariant = CORRIN_BODY_VARIANTS[corrinVariantIndex]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[85vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-lg border border-neutral-700 bg-neutral-900 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-neutral-100">Bulk Upload</h3>
          <button type="button" onClick={onClose} className="rounded px-2 py-1 text-neutral-400 hover:text-neutral-200">
            ✕
          </button>
        </div>
        <p className="text-xs text-neutral-500">
          Select multiple image files at once (e.g. everything in your <code>public/skills/</code> backup folder) —
          they're matched by filename and stored on this device only, same as Edit Mode's single-icon uploads.
        </p>

        <UploadSection
          title="Skill icons"
          hint='Select any number of files named like "aegis.png", matched against the 212 skill ids.'
          match={matchSkillFiles}
        />

        <UploadSection
          title="Adult portraits"
          hint='Select any number of files named like "xander.png", matched against adult character ids.'
          match={matchAdultPortraitFiles}
        />

        <div className="space-y-2 rounded-md border border-neutral-800 bg-neutral-950 p-3">
          <h4 className="text-sm font-semibold text-neutral-200">Child portraits</h4>
          <label className="block text-xs text-neutral-400">
            Child
            <select
              value={childId}
              onChange={(e) => setChildId(e.target.value)}
              className="mt-1 block w-full rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-200"
            >
              {CHILDREN.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <UploadSection
            title=""
            hint={`Select this child's "base.png" and/or "raw.png" together.`}
            match={(files) => matchChildPortraitFiles(childId, files)}
          />
        </div>

        <div className="space-y-2 rounded-md border border-neutral-800 bg-neutral-950 p-3">
          <h4 className="text-sm font-semibold text-neutral-200">Corrin portraits</h4>
          <label className="block text-xs text-neutral-400">
            Body variant
            <select
              value={corrinVariantIndex}
              onChange={(e) => setCorrinVariantIndex(Number(e.target.value))}
              className="mt-1 block w-full rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-200"
            >
              {CORRIN_BODY_VARIANTS.map((v, i) => (
                <option key={v.label} value={i}>
                  {v.label}
                </option>
              ))}
            </select>
          </label>
          <UploadSection
            title=""
            hint={`Select this variant's "base.png" and any of "style1.png" through "style12.png" together.`}
            match={(files) => matchCorrinPortraitFiles(corrinVariant.gender, corrinVariant.height, files)}
          />
        </div>
      </div>
    </div>
  )
}
