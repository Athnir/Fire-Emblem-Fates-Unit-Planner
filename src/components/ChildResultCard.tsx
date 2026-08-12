import { adultHairHex } from '../data/adultHairHex'
import { charactersById } from '../data/characters'
import { classesByName } from '../data/classes'
import { CORRIN_HAIR_PALETTE } from '../data/corrinHairPalette'
import { STAT_KEYS, type Character } from '../data/types'
import type { ComputedChild } from '../logic/childCalculator'
import { classGrowthRate } from '../logic/levelProjection'
import { getCorrinAppearance, useCorrinAppearanceStore } from '../state/corrinAppearanceStore'
import { Portrait } from './Portrait'

const STAT_LABELS: Record<string, string> = {
  hp: 'HP', str: 'Str', mag: 'Mag', skl: 'Skl', spd: 'Spd', lck: 'Lck', def: 'Def', res: 'Res',
}

interface Props {
  child: Character
  result: ComputedChild
}

/** A quick growth/base-stat estimate for planning pairings, not a full multi-class breakdown (that
 * lives in Unit Planner) — just the child's own primary class with the variable parent's growth
 * contribution already folded in via `result.growthRates`. */
export function ChildResultCard({ child, result }: Props) {
  const hairSourceName = charactersById[result.hairSourceParentId]?.name ?? result.hairSourceParentId
  const isHairSourceCorrin = result.hairSourceParentId === 'corrin_m' || result.hairSourceParentId === 'corrin_f'
  const corrinAppearances = useCorrinAppearanceStore((state) => state.appearances)
  const setCorrinHairHex = useCorrinAppearanceStore((state) => state.setHairHex)
  const hairHex = isHairSourceCorrin
    ? getCorrinAppearance(corrinAppearances, result.hairSourceParentId).hairHex
    : adultHairHex[result.hairSourceParentId]

  const primaryClassData = classesByName[child.startingClass]
  const displayedGrowthRates = primaryClassData
    ? classGrowthRate(result.growthRates, primaryClassData)
    : result.growthRates

  return (
    <div className="space-y-3 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <div>
        <h4 className="text-base font-semibold text-neutral-100">{child.name}</h4>
        <p className="text-xs text-neutral-500">Variable parent: {result.variableParent}</p>
        <p className="text-xs text-neutral-500">Hair from {hairSourceName}</p>
        {isHairSourceCorrin && (
          <div className="mt-1.5 space-y-1">
            <span className="text-xs text-neutral-400">{hairSourceName}'s hair color</span>
            <div className="grid w-fit grid-cols-10 gap-1">
              {CORRIN_HAIR_PALETTE.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setCorrinHairHex(result.hairSourceParentId, hex)}
                  title={hex}
                  className={`h-5 w-5 rounded border ${
                    hairHex === hex ? 'border-2 border-violet-400' : 'border-neutral-700'
                  }`}
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="max-w-sm space-y-3">
          <div>
            <h5 className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Growth % ({child.startingClass})
            </h5>
            <div className="grid grid-cols-4 gap-x-3 gap-y-1 text-sm">
              {STAT_KEYS.map((key) => (
                <div key={key} className="flex justify-between gap-2">
                  <span className="text-neutral-500">{STAT_LABELS[key]}</span>
                  <span className="font-mono text-neutral-100">{Math.round(displayedGrowthRates[key])}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h5 className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Base Stats (estimate)
            </h5>
            <div className="grid grid-cols-4 gap-x-3 gap-y-1 text-sm">
              {STAT_KEYS.map((key) => (
                <div key={key} className="flex justify-between gap-2">
                  <span className="text-neutral-500">{STAT_LABELS[key]}</span>
                  <span className="font-mono text-neutral-100">
                    {Math.round(result.baseStats[key])}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="text-sm">
            <span className="text-neutral-500">Inherited classes: </span>
            <span className="text-neutral-200">{result.inheritedClasses.join(', ')}</span>
          </div>

          {result.hasDragonVeinAccess && <div className="text-sm text-violet-400">Has Dragon Vein access</div>}
        </div>

        <Portrait characterId={child.id} isChild hairHex={hairHex} size={256} />
      </div>
    </div>
  )
}
