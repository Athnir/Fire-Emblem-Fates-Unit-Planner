import { useEffect, useRef, useState } from 'react'
import { BackupControls } from './components/BackupControls'
import { BulkAssetUpload } from './components/BulkAssetUpload'
import { CorrinBuildPanel } from './components/CorrinBuildPanel'
import { EditModeToggle } from './components/EditModeToggle'
import { ExportImageButton } from './components/ExportImageButton'
import { IosInstallBanner } from './components/IosInstallBanner'
import { MarriagePlanner } from './components/MarriagePlanner'
import { RosterBrowser } from './components/RosterBrowser'
import { RouteBackground } from './components/RouteBackground'
import { SkillPlanner } from './components/SkillPlanner'
import { UnitPlanner } from './components/UnitPlanner'
import { usePlannerStore } from './state/plannerStore'

export type Tab = 'roster' | 'unit' | 'planner' | 'skills'

function App() {
  const [tab, setTab] = useState<Tab>('roster')
  const editModeEnabled = usePlannerStore((state) => state.editModeEnabled)
  const activeRoute = usePlannerStore((state) => state.activeRoute)
  const mainRef = useRef<HTMLElement>(null)
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false)

  useEffect(() => {
    // Best-effort request not to have this site's storage evicted under disk pressure — Chrome
    // honors this fairly reliably for an installed PWA, Safari's support is weaker/inconsistent,
    // but it's a no-op cost either way (see BackupControls for the platform-independent fallback).
    if (navigator.storage?.persist) void navigator.storage.persist()
  }, [])

  return (
    <div
      className={`isolate min-h-screen text-neutral-100 ${
        editModeEnabled ? 'ring-4 ring-inset ring-amber-500' : ''
      }`}
    >
      <RouteBackground route={activeRoute} />
      <IosInstallBanner />
      <header className="border-b border-neutral-800/80 bg-neutral-950/90 px-6 py-4 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Fates Unit Planner</h1>
          <div className="flex flex-wrap items-center gap-2">
            <ExportImageButton targetRef={mainRef} tab={tab} />
            <BackupControls />
            <EditModeToggle />
            {editModeEnabled && (
              <button
                type="button"
                onClick={() => setBulkUploadOpen(true)}
                className="rounded-md bg-neutral-800 px-3 py-1.5 text-sm font-medium text-neutral-300 hover:bg-neutral-700"
              >
                Bulk Upload
              </button>
            )}
          </div>
        </div>
        <nav className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setTab('roster')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              tab === 'roster' ? 'bg-violet-600 text-white' : 'bg-neutral-800 text-neutral-300'
            }`}
          >
            Roster
          </button>
          <button
            type="button"
            onClick={() => setTab('unit')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              tab === 'unit' ? 'bg-violet-600 text-white' : 'bg-neutral-800 text-neutral-300'
            }`}
          >
            Unit Planner
          </button>
          <button
            type="button"
            onClick={() => setTab('planner')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              tab === 'planner' ? 'bg-violet-600 text-white' : 'bg-neutral-800 text-neutral-300'
            }`}
          >
            Marriage Planner
          </button>
          <button
            type="button"
            onClick={() => setTab('skills')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              tab === 'skills' ? 'bg-violet-600 text-white' : 'bg-neutral-800 text-neutral-300'
            }`}
          >
            Skill Planner
          </button>
        </nav>
        {editModeEnabled && (
          <p className="mt-2 text-xs text-amber-400">
            Edit Mode is on — click any skill icon to upload your own image.
          </p>
        )}
      </header>

      <CorrinBuildPanel />

      {bulkUploadOpen && <BulkAssetUpload onClose={() => setBulkUploadOpen(false)} />}

      <main ref={mainRef} className="p-6">
        {tab === 'roster' && <RosterBrowser />}
        {tab === 'unit' && <UnitPlanner />}
        {tab === 'planner' && <MarriagePlanner />}
        {tab === 'skills' && <SkillPlanner />}
      </main>
    </div>
  )
}

export default App
