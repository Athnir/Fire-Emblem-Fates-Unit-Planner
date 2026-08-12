import { useState } from 'react'
import { usePlannerStore } from '../state/plannerStore'

export function PlanManager() {
  const plans = usePlannerStore((state) => state.plans)
  const activePlanId = usePlannerStore((state) => state.activePlanId)
  const pairings = usePlannerStore((state) => state.pairings)
  const saveCurrentAsPlan = usePlannerStore((state) => state.saveCurrentAsPlan)
  const loadPlan = usePlannerStore((state) => state.loadPlan)
  const deletePlan = usePlannerStore((state) => state.deletePlan)
  const renamePlan = usePlannerStore((state) => state.renamePlan)

  const [nameInput, setNameInput] = useState('')

  const activePlan = plans.find((p) => p.id === activePlanId)

  function handleSave() {
    const name = nameInput.trim() || activePlan?.name
    if (!name) return
    saveCurrentAsPlan(name)
    setNameInput('')
  }

  return (
    <div className="space-y-3 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <h3 className="text-base font-semibold text-neutral-100">Saved Plans</h3>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          placeholder={activePlan ? `Update "${activePlan.name}"` : 'e.g. Conquest run #1'}
          className="min-w-[200px] flex-1 rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-200"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={pairings.length === 0}
          title={pairings.length === 0 ? 'Add at least one pairing to the plan below before saving' : undefined}
          className="rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {activePlan ? 'Save As / Update' : 'Save Current Plan'}
        </button>
      </div>
      {pairings.length === 0 && (
        <p className="text-xs text-neutral-500">Add at least one pairing to the plan below before saving.</p>
      )}

      {plans.length === 0 ? (
        <p className="text-sm text-neutral-500">No saved plans yet.</p>
      ) : (
        <ul className="space-y-2">
          {plans.map((plan) => (
            <li
              key={plan.id}
              className={`flex items-center justify-between gap-2 rounded-md border ${
                plan.id === activePlanId
                  ? 'border-violet-500 bg-violet-950/40'
                  : 'border-neutral-800 bg-neutral-950'
              }`}
            >
              <button
                type="button"
                onClick={() => loadPlan(plan.id)}
                className="min-w-0 flex-1 px-3 py-2 text-left hover:bg-neutral-800/60"
                title="Tap to load this plan"
              >
                <div className="truncate text-sm font-medium text-neutral-200">{plan.name}</div>
                <div className="text-xs text-neutral-500">
                  {plan.pairings.length} pairing{plan.pairings.length === 1 ? '' : 's'} ·{' '}
                  {plan.route === 'all' ? 'All Routes' : plan.route}
                </div>
              </button>
              <div className="flex shrink-0 gap-2 px-3 py-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    const next = window.prompt('Rename plan', plan.name)
                    if (next && next.trim()) renamePlan(plan.id, next.trim())
                  }}
                  className="text-neutral-400 hover:text-neutral-200"
                >
                  Rename
                </button>
                <button
                  type="button"
                  onClick={() => deletePlan(plan.id)}
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
