import { useState } from 'react'

const DISMISSED_KEY = 'fates-planner-ios-banner-dismissed'

function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

/** "Add to Home Screen" only works from actual Safari — Chrome/Firefox on iOS are Safari's engine
 * under a different shell and don't expose the install affordance, so there's no point nudging them. */
function isSafari(): boolean {
  const ua = navigator.userAgent
  return /safari/i.test(ua) && !/crios|fxios|edgios|chrome|android/i.test(ua)
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function shouldShow(): boolean {
  if (window.localStorage.getItem(DISMISSED_KEY)) return false
  return isIos() && isSafari() && !isStandalone()
}

/**
 * Prompts iOS Safari visitors to install via "Add to Home Screen" — iOS exempts installed home-screen
 * web apps from Safari's aggressive storage-eviction policy for regular browser tabs, so this is the
 * single biggest lever for making saved plans/builds stick around on an iPhone/iPad (see BackupControls
 * for the platform-independent belt-and-suspenders: an actual exportable backup file).
 */
export function IosInstallBanner() {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || !shouldShow()) return null

  function dismiss() {
    window.localStorage.setItem(DISMISSED_KEY, '1')
    setDismissed(true)
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b border-violet-800/60 bg-violet-950/80 px-4 py-2 text-sm text-violet-100">
      <p>
        Tip: tap <span className="font-medium">Share</span> below, then{' '}
        <span className="font-medium">"Add to Home Screen"</span> — installed this way, your saved
        plans are much less likely to get cleared by iOS than they are in a regular Safari tab.
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 rounded px-2 py-1 text-violet-300 hover:bg-violet-900/60 hover:text-violet-100"
      >
        ✕
      </button>
    </div>
  )
}
