import { useState } from 'react'

const DISMISSED_KEY = 'fates-planner-local-data-banner-dismissed'

/**
 * Every save this app makes (plans, builds, Corrin build/appearance, uploaded images) lives only in
 * this browser's own local storage — there's no server account behind any of it. Reinstalling the
 * app, clearing site data, or switching browsers/devices silently wipes it all, and that's easy to
 * not realize until it's already gone (see BackupControls for the actual safety net: Export/Import
 * Backup writes everything to one portable file).
 */
export function LocalDataWarningBanner() {
  const [dismissed, setDismissed] = useState(() => Boolean(window.localStorage.getItem(DISMISSED_KEY)))

  if (dismissed) return null

  function dismiss() {
    window.localStorage.setItem(DISMISSED_KEY, '1')
    setDismissed(true)
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b border-amber-800/60 bg-amber-950/40 px-4 py-2 text-sm text-amber-100">
      <p>
        Heads up: everything here (saved plans, builds, uploaded images) lives only in this browser —
        reinstalling the app, clearing site data, or switching devices erases it. Hit{' '}
        <span className="font-medium">Export Backup</span> above any time to keep a copy.
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 rounded px-2 py-1 text-amber-300 hover:bg-amber-900/60 hover:text-amber-100"
      >
        ✕
      </button>
    </div>
  )
}
