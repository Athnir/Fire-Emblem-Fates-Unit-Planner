import { useState } from 'react'
import { usePlannerStore } from '../state/plannerStore'
import { useScreenshotContextStore } from '../state/screenshotContextStore'
import type { Tab } from '../App'

const TAB_LABELS: Record<Tab, string> = {
  roster: 'Roster',
  unit: 'Unit Planner',
  planner: 'Marriage Planner',
  skills: 'Skill Planner',
}

/** Windows/macOS/Linux all forbid these in filenames — strip rather than fail the download. */
function sanitizeFilenamePart(part: string): string {
  return part.replace(/[<>:"/\\|?*]/g, '').trim()
}

function formatTimestamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`
}

/**
 * Auto-generated name: (saved plan, if one's active) (unit) (tab) (route) (timestamp) — e.g.
 * "Conquest run #1 Hana Skill Planner Conquest 2026-08-06_14-30-22.png". The saved-plan and unit
 * pieces are omitted when there's nothing to show (no plan loaded, no unit selected) rather than
 * left as empty tokens. Route is always included, independent of whether a plan is active, so a
 * screenshot's route is identifiable either way (see plannerStore's activeRoute).
 */
function buildFilename(majorGroup: string, unitLabel: string, tab: Tab, route: string): string {
  const routeLabel = route === 'all' ? 'All Routes' : route
  const parts = [majorGroup, unitLabel, TAB_LABELS[tab], routeLabel]
    .map(sanitizeFilenamePart)
    .filter(Boolean)
  return `${parts.join(' ')} ${formatTimestamp(new Date())}.png`
}

/** Captures the given element as a PNG and triggers a download, matching the prototype's "Save full page as image" feature. */
export function ExportImageButton({ targetRef, tab }: { targetRef: React.RefObject<HTMLElement | null>; tab: Tab }) {
  const [status, setStatus] = useState<'idle' | 'capturing' | 'done' | 'failed'>('idle')
  const activeRoute = usePlannerStore((state) => state.activeRoute)
  const activePlanId = usePlannerStore((state) => state.activePlanId)
  const plans = usePlannerStore((state) => state.plans)
  const unitLabel = useScreenshotContextStore((state) => state.unitLabel)

  async function handleClick() {
    const target = targetRef.current
    if (!target) return
    setStatus('capturing')
    // Sections opted out via data-export-hide (e.g. the Skill Planner's full skill-pool browser)
    // are bulky and not worth including in the exported image — hide them just for the capture.
    const hiddenEls = Array.from(target.querySelectorAll<HTMLElement>('[data-export-hide]'))
    const previousDisplay = hiddenEls.map((el) => el.style.display)
    hiddenEls.forEach((el) => { el.style.display = 'none' })
    try {
      const html2canvas = (await import('html2canvas-pro')).default
      const canvas = await html2canvas(target, { backgroundColor: '#0a0a0a', useCORS: true, scale: 2 })
      const activePlanName = activePlanId ? plans.find((p) => p.id === activePlanId)?.name : undefined
      const filename = buildFilename(activePlanName ?? '', unitLabel, tab, activeRoute)
      const link = document.createElement('a')
      // Forward slashes in `download` create subfolders inside the browser's downloads directory
      // (Chromium/Electron honor this) — keeps every tab's screenshots sorted into their own folder
      // instead of piling up loose in one place.
      link.download = `Fates Unit Planner Screenshots/${TAB_LABELS[tab]}/${filename}`
      link.href = canvas.toDataURL('image/png')
      link.click()
      setStatus('done')
    } catch {
      setStatus('failed')
    } finally {
      hiddenEls.forEach((el, i) => { el.style.display = previousDisplay[i] })
      setTimeout(() => setStatus('idle'), 2000)
    }
  }

  const label = status === 'capturing' ? 'Capturing…' : status === 'done' ? 'Saved ✓' : status === 'failed' ? 'Failed' : 'Save as image'

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={status === 'capturing'}
      title="Give the page a couple seconds to finish loading before saving — screenshots taken right on load can look unstyled."
      className="rounded-md bg-neutral-800 px-3 py-1.5 text-sm font-medium text-neutral-300 hover:bg-neutral-700 disabled:opacity-60"
    >
      {label}
    </button>
  )
}
