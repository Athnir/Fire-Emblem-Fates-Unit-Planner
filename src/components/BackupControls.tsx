import { useRef, useState } from 'react'
import { buildBackup, restoreBackup } from '../logic/backup'

function formatTimestamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`
}

/**
 * Export/Import buttons for all locally-saved data (saved plans/builds, Corrin build and appearance,
 * uploaded icons) as a single downloadable JSON file — a platform-independent way to not lose data to
 * browser storage eviction (notably on iOS, which is less generous than Android about keeping PWA
 * storage around indefinitely) or a browser reset, and a way to move a setup to a different device.
 */
export function BackupControls() {
  const [exportStatus, setExportStatus] = useState<'idle' | 'working' | 'done' | 'failed'>('idle')
  const [importStatus, setImportStatus] = useState<'idle' | 'working' | 'done' | 'failed'>('idle')
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleExport() {
    setExportStatus('working')
    try {
      const backup = await buildBackup()
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.download = `Fates Unit Planner Backup ${formatTimestamp(new Date())}.json`
      link.href = url
      link.click()
      URL.revokeObjectURL(url)
      setExportStatus('done')
    } catch {
      setExportStatus('failed')
    } finally {
      setTimeout(() => setExportStatus('idle'), 2000)
    }
  }

  function handleImportClick() {
    setImportError(null)
    fileInputRef.current?.click()
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file later
    if (!file) return
    if (
      !window.confirm(
        'Importing a backup overwrites your current saved plans, builds, and uploaded images with what\'s in the file. Continue?',
      )
    ) {
      return
    }
    setImportStatus('working')
    setImportError(null)
    try {
      await restoreBackup(file)
      setImportStatus('done')
      // Zustand's persist middleware only reads localStorage once, at store creation — a full
      // reload is the simplest way to guarantee every store (and any IndexedDB-backed image) picks
      // up the freshly-imported data instead of trying to reactively patch each store by hand.
      window.location.reload()
    } catch (err) {
      setImportStatus('failed')
      setImportError(err instanceof Error ? err.message : 'Import failed.')
      setTimeout(() => setImportStatus('idle'), 2000)
    }
  }

  const exportLabel = exportStatus === 'working' ? 'Exporting…' : exportStatus === 'done' ? 'Saved ✓' : exportStatus === 'failed' ? 'Failed' : 'Export Backup'
  const importLabel = importStatus === 'working' ? 'Importing…' : importStatus === 'failed' ? 'Failed' : 'Import Backup'

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleExport}
        disabled={exportStatus === 'working'}
        title="Download all saved plans, builds, and settings as a JSON file"
        className="rounded-md bg-neutral-800 px-3 py-1.5 text-sm font-medium text-neutral-300 hover:bg-neutral-700 disabled:opacity-60"
      >
        {exportLabel}
      </button>
      <button
        type="button"
        onClick={handleImportClick}
        disabled={importStatus === 'working'}
        title="Restore saved plans, builds, and settings from a previously exported backup file"
        className="rounded-md bg-neutral-800 px-3 py-1.5 text-sm font-medium text-neutral-300 hover:bg-neutral-700 disabled:opacity-60"
      >
        {importLabel}
      </button>
      <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleFileSelected} />
      {importError && <p className="text-xs text-red-400">{importError}</p>}
    </div>
  )
}
