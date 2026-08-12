import type { Route } from '../data/types'
import { usePlannerStore } from '../state/plannerStore'

const ROUTES: { value: Route; label: string }[] = [
  { value: 'Birthright', label: 'Birthright' },
  { value: 'Conquest', label: 'Conquest' },
  { value: 'Revelation', label: 'Revelation' },
]

export function RouteFilter() {
  const activeRoute = usePlannerStore((state) => state.activeRoute)
  const setActiveRoute = usePlannerStore((state) => state.setActiveRoute)

  return (
    <div className="flex flex-wrap gap-2">
      {ROUTES.map((route) => (
        <button
          key={route.value}
          type="button"
          onClick={() => setActiveRoute(route.value)}
          className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
            activeRoute === route.value
              ? 'bg-violet-600 text-white'
              : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
          }`}
        >
          {route.label}
        </button>
      ))}
    </div>
  )
}
