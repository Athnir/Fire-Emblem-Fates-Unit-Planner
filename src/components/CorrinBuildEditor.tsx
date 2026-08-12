import { STAT_KEYS } from '../data/types'
import { CORRIN_TALENT_CLASSES } from '../logic/corrinBuild'
import { useCorrinBuildStore, type StatKey } from '../state/corrinBuildStore'

const STAT_LABELS: Record<string, string> = {
  hp: 'HP', str: 'Str', mag: 'Mag', skl: 'Skl', spd: 'Spd', lck: 'Lck', def: 'Def', res: 'Res',
}

interface Props {
  compact?: boolean
}

/**
 * Shared Boon/Bane/Talent editor — only one Corrin exists per playthrough, so male and female
 * Corrin share this single build (used in the Roster detail view and the always-visible
 * CorrinBuildPanel).
 */
export function CorrinBuildEditor({ compact = false }: Props) {
  const build = useCorrinBuildStore((state) => state.build)
  const setBoon = useCorrinBuildStore((state) => state.setBoon)
  const setBane = useCorrinBuildStore((state) => state.setBane)
  const setTalent = useCorrinBuildStore((state) => state.setTalent)

  return (
    <div className={compact ? 'space-y-2' : 'space-y-2 border-t border-neutral-800 pt-3'}>
      {!compact && (
        <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Boon / Bane / Talent
        </span>
      )}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs text-neutral-400">
          Boon
          <select
            value={build.boon ?? ''}
            onChange={(e) => setBoon((e.target.value || null) as StatKey | null)}
            className="rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-200"
          >
            <option value="">(none)</option>
            {STAT_KEYS.filter((k) => k !== build.bane).map((k) => (
              <option key={k} value={k}>{STAT_LABELS[k]}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-neutral-400">
          Bane
          <select
            value={build.bane ?? ''}
            onChange={(e) => setBane((e.target.value || null) as StatKey | null)}
            className="rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-200"
          >
            <option value="">(none)</option>
            {STAT_KEYS.filter((k) => k !== build.boon).map((k) => (
              <option key={k} value={k}>{STAT_LABELS[k]}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-neutral-400">
          Talent (secondary class)
          <select
            value={build.talentClass ?? ''}
            onChange={(e) => setTalent(e.target.value || null)}
            className="rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-200"
          >
            <option value="">(none)</option>
            {CORRIN_TALENT_CLASSES.map((cls) => (
              <option key={cls} value={cls}>{cls}</option>
            ))}
          </select>
        </label>
      </div>
    </div>
  )
}
