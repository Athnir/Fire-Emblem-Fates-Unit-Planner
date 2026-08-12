import { useState } from 'react'
import { CorrinBuildEditor } from './CorrinBuildEditor'

/**
 * Always-visible (collapsible) Corrin Boon/Bane/Talent panel, mounted at the App level so it's
 * reachable from any tab without navigating to the Roster's Corrin detail view. One build covers
 * both Corrin(M) and Corrin(F) since only one Corrin exists per playthrough.
 */
export function CorrinBuildPanel() {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="border-b border-neutral-800 bg-neutral-900/90 px-6 py-3 backdrop-blur-sm">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1.5 text-sm font-medium text-neutral-300 hover:text-neutral-100"
      >
        <span className={`transition-transform ${expanded ? 'rotate-90' : ''}`}>▸</span>
        Corrin Build
      </button>
      {expanded && (
        <div className="mt-3 max-w-md rounded-md border border-neutral-800 p-3">
          <CorrinBuildEditor compact />
        </div>
      )}
    </div>
  )
}
