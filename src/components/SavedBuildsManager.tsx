import { useState } from 'react'
import type { Route } from '../data/types'
import { useSavedBuildsStore, type BuildTab, type SavedBuild } from '../state/savedBuildsStore'

/**
 * Save/load section for a single tab's current configuration — same "Save As / Update" convention
 * as Marriage Planner's PlanManager, but scoped to `tab` (skills/unit) and storing an arbitrary
 * `data` snapshot the caller builds and restores itself, rather than a fixed pairings shape.
 */
export function SavedBuildsManager({
  tab,
  characterName,
  route,
  data,
  canSave,
  onLoad,
}: {
  tab: BuildTab
  characterName: string
  route: Route
  data: Record<string, unknown>
  canSave: boolean
  onLoad: (build: SavedBuild) => void
}) {
  const allBuilds = useSavedBuildsStore((state) => state.builds)
  const activeBuildId = useSavedBuildsStore((state) => state.activeBuildId)
  const saveBuild = useSavedBuildsStore((state) => state.saveBuild)
  const loadBuild = useSavedBuildsStore((state) => state.loadBuild)
  const deleteBuild = useSavedBuildsStore((state) => state.deleteBuild)
  const renameBuild = useSavedBuildsStore((state) => state.renameBuild)

  const [nameInput, setNameInput] = useState('')

  const builds = allBuilds.filter((b) => b.tab === tab)
  const activeBuild = builds.find((b) => b.id === activeBuildId)

  function handleSave() {
    const name = nameInput.trim() || activeBuild?.name
    if (!name) return
    saveBuild(tab, name, characterName, route, data)
    setNameInput('')
  }

  function handleLoad(id: string) {
    const build = loadBuild(id)
    if (build) onLoad(build)
  }

  return (
    <div className="space-y-3 rounded-lg border border-dashed border-neutral-800 bg-neutral-900/90 p-4">
      <h3 className="text-base font-semibold text-neutral-100">Saved Builds</h3>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          placeholder={activeBuild ? `Update "${activeBuild.name}"` : 'e.g. Silas Paladin route'}
          className="min-w-[200px] flex-1 rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-200"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className="rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {activeBuild ? 'Save As / Update' : 'Save Current Build'}
        </button>
      </div>

      {builds.length === 0 ? (
        <p className="text-sm text-neutral-500">No saved builds yet.</p>
      ) : (
        <ul className="space-y-2">
          {builds.map((build) => (
            <li
              key={build.id}
              className={`flex items-center justify-between gap-2 rounded-md border ${
                build.id === activeBuildId
                  ? 'border-violet-500 bg-violet-950/40'
                  : 'border-neutral-800 bg-neutral-950'
              }`}
            >
              <button
                type="button"
                onClick={() => handleLoad(build.id)}
                className="min-w-0 flex-1 px-3 py-2 text-left hover:bg-neutral-800/60"
                title="Tap to load this build"
              >
                <div className="truncate text-sm font-medium text-neutral-200">{build.name}</div>
                <div className="text-xs text-neutral-500">
                  {build.characterName} · {build.route === 'all' ? 'All Routes' : build.route}
                </div>
              </button>
              <div className="flex shrink-0 gap-2 px-3 py-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    const next = window.prompt('Rename build', build.name)
                    if (next && next.trim()) renameBuild(build.id, next.trim())
                  }}
                  className="text-neutral-400 hover:text-neutral-200"
                >
                  Rename
                </button>
                <button
                  type="button"
                  onClick={() => deleteBuild(build.id)}
                  className="text-neutral-400 hover:text-red-400"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
