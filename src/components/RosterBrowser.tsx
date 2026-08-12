import { useEffect, useMemo, useRef, useState } from 'react'
import { adultHairHex } from '../data/adultHairHex'
import { characters, charactersById } from '../data/characters'
import { CORRIN_HAIR_PALETTE } from '../data/corrinHairPalette'
import { CORRIN_HAIRSTYLES } from '../data/corrinHairstyles'
import { skills, skillsById } from '../data/skills'
import { supports } from '../data/supports'
import type { Character, Route } from '../data/types'
import { getHairSourceInfo } from '../logic/childCalculator'
import { applyCorrinBuild } from '../logic/corrinBuild'
import { canProduceChild, isRouteCompatible } from '../logic/eligibility'
import { getStartingLevel } from '../logic/levelProjection'
import { getCorrinAppearance, useCorrinAppearanceStore, type CorrinHeight } from '../state/corrinAppearanceStore'
import { useChildHairParentStore } from '../state/childHairParentStore'
import { useCorrinBuildStore } from '../state/corrinBuildStore'
import { usePlannerStore } from '../state/plannerStore'
import { useScreenshotContextStore } from '../state/screenshotContextStore'
import { AssetIcon } from './AssetIcon'
import { Portrait } from './Portrait'
import { RouteFilter } from './RouteFilter'

/** Non-child candidates who could plausibly be the given fixed parent's spouse and thus supply a
 * dynamic-hair child's hair color. Corrin is included alongside the fixed-hex adults — their color
 * isn't a static adultHairHex entry (it's whatever the player picked in the Corrin Build panel), so
 * callers must resolve Corrin's hex via getCorrinAppearance instead of adultHairHex when the
 * selected candidate is corrin_m/corrin_f. */
function eligibleHairParents(fixedParentId: string, activeRoute: Route): Character[] {
  const fixedParent = charactersById[fixedParentId]
  if (!fixedParent) return []
  return characters.filter(
    (c) =>
      !c.isChild &&
      (c.id === 'corrin_m' || c.id === 'corrin_f' || c.id in adultHairHex) &&
      canProduceChild(supports, fixedParent, c, activeRoute),
  )
}

const skillIdByName: Record<string, string> = Object.fromEntries(skills.map((s) => [s.name, s.id]))

type ChildFilter = 'all' | 'adults' | 'children'
type GenderFilter = 'all' | 'M' | 'F'

/**
 * Identity-only view: who this character is, their fixed Class Set, personal skill, and a hair
 * reference (every character, since the child-hair preview can source from any adult parent, not
 * just Corrin). Everything interactive — stat projection, class-swap tools, mechanics, pair-up —
 * lives in the Unit Planner tab instead, to keep this tab a quick reference.
 */
function CharacterDetail({ character: rawCharacter, activeRoute }: { character: Character; activeRoute: Route }) {
  const build = useCorrinBuildStore((state) => state.build)
  const isCorrin = rawCharacter.id === 'corrin_m' || rawCharacter.id === 'corrin_f'
  const character = isCorrin ? applyCorrinBuild(rawCharacter, build) : rawCharacter

  const appearances = useCorrinAppearanceStore((state) => state.appearances)
  const setHeight = useCorrinAppearanceStore((state) => state.setHeight)
  const setHairstyle = useCorrinAppearanceStore((state) => state.setHairstyle)
  const setCorrinHairHex = useCorrinAppearanceStore((state) => state.setHairHex)
  const appearance = getCorrinAppearance(appearances, character.id)

  const hairSourceInfo = character.isChild ? getHairSourceInfo(character) : undefined
  const selectedParentId = useChildHairParentStore((state) => state.selections[character.id])
  const setHairParent = useChildHairParentStore((state) => state.setParent)
  const candidateParents = useMemo(
    () =>
      hairSourceInfo && !hairSourceInfo.isHairSourceFixed
        ? eligibleHairParents(hairSourceInfo.fixedParentId, activeRoute)
        : [],
    [hairSourceInfo, activeRoute],
  )

  const selectedParentIsCorrin = selectedParentId === 'corrin_m' || selectedParentId === 'corrin_f'
  const resolvedHairHex = isCorrin
    ? appearance.hairHex
    : hairSourceInfo
      ? hairSourceInfo.isHairSourceFixed
        ? adultHairHex[hairSourceInfo.fixedParentId]
        : selectedParentId
          ? selectedParentIsCorrin
            ? getCorrinAppearance(appearances, selectedParentId).hairHex
            : adultHairHex[selectedParentId]
          : undefined
      : undefined

  return (
    <div className="space-y-4 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
      <div className="flex flex-col items-start gap-4 sm:flex-row">
        <Portrait
          characterId={character.id}
          isChild={character.isChild}
          hairHex={resolvedHairHex}
          size={256}
          corrin={
            isCorrin
              ? { gender: rawCharacter.gender as 'M' | 'F', height: appearance.height, hairstyle: appearance.hairstyle }
              : undefined
          }
        />
        <div>
          <h3 className="text-lg font-semibold text-neutral-100">{character.name}</h3>
          <p className="text-sm text-neutral-400">
            {character.gender === 'both' ? 'M/F' : character.gender} ·{' '}
            {character.route.includes('all') ? 'All Routes' : character.route.join(' / ')}
          </p>
        </div>
      </div>

      <div className="text-sm text-neutral-300">
        <div>
          <span className="text-neutral-500">Class set: </span>
          {character.startingClass}
          {character.secondaryClass ? ` / ${character.secondaryClass}` : ''}
          {character.tertiaryClass ? ` / ${character.tertiaryClass}` : ''}
        </div>
        {character.joinClass && character.joinClass !== character.startingClass && (
          <div>
            <span className="text-neutral-500">Joins as: </span>
            {character.joinClass}
          </div>
        )}
        <div>
          <span className="text-neutral-500">Recruited level: </span>
          {character.isChild ? 'Variable, Min Lvl 10' : getStartingLevel(character.startingLevel, activeRoute)}
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-neutral-500">Personal skill: </span>
            {skillIdByName[character.personalSkill] && (
              <AssetIcon type="skill" iconId={skillIdByName[character.personalSkill]} label={character.personalSkill} size={20} />
            )}
            {character.personalSkill}
          </div>
          {skillsById[skillIdByName[character.personalSkill]]?.description && (
            <div className="mt-0.5 text-xs text-neutral-500">
              {skillsById[skillIdByName[character.personalSkill]].description}
            </div>
          )}
        </div>
        {character.isRoyal && <div className="text-violet-400">Royal (dragon vein access)</div>}
      </div>

      {isCorrin && (
        <div className="space-y-3 border-t border-neutral-800 pt-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Appearance</span>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs text-neutral-400">
              Height
              <select
                value={appearance.height}
                onChange={(e) => setHeight(character.id, e.target.value as CorrinHeight)}
                className="rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-200"
              >
                <option value="short">Short</option>
                <option value="tall">Tall</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-neutral-400">
              Hairstyle
              <select
                value={appearance.hairstyle}
                onChange={(e) => setHairstyle(character.id, e.target.value)}
                className="rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-200"
              >
                {CORRIN_HAIRSTYLES.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-neutral-400">Hair color</span>
            <div className="grid w-fit grid-cols-10 gap-1">
              {CORRIN_HAIR_PALETTE.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setCorrinHairHex(character.id, hex)}
                  title={hex}
                  className={`h-6 w-6 rounded border ${
                    appearance.hairHex === hex ? 'border-2 border-violet-400' : 'border-neutral-700'
                  }`}
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
          </div>
          <p className="text-xs text-neutral-600">
            These are the exact 30 hair colors selectable for Corrin in-game — set this to whatever this
            playthrough's Corrin actually picked. Defaults to Tall / Hairstyle 1 / the picker's own default color
            until changed here.
          </p>
        </div>
      )}

      {hairSourceInfo && !hairSourceInfo.isHairSourceFixed && (
        <div className="space-y-2 border-t border-neutral-800 pt-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Hair source ({hairSourceInfo.hairSourceSide === 'mother' ? 'Mom' : 'Dad'})
          </span>
          <select
            value={selectedParentId ?? ''}
            onChange={(e) => setHairParent(character.id, e.target.value)}
            className="block w-full max-w-xs rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-200"
          >
            <option value="">(none selected)</option>
            {candidateParents.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {candidateParents.length === 0 && (
            <p className="text-xs text-neutral-600">
              No eligible parent has extracted portrait data yet.
            </p>
          )}
          {selectedParentIsCorrin && (
            <div className="space-y-1 pt-1">
              <span className="text-xs text-neutral-400">
                Corrin's hair color (whatever this playthrough's Corrin actually picked)
              </span>
              <div className="grid w-fit grid-cols-10 gap-1">
                {CORRIN_HAIR_PALETTE.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => setCorrinHairHex(selectedParentId!, hex)}
                    title={hex}
                    className={`h-6 w-6 rounded border ${
                      getCorrinAppearance(appearances, selectedParentId!).hairHex === hex
                        ? 'border-2 border-violet-400'
                        : 'border-neutral-700'
                    }`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {hairSourceInfo?.isHairSourceFixed && (
        <div className="border-t border-neutral-800 pt-3 text-xs text-neutral-500">
          Hair source: {charactersById[hairSourceInfo.fixedParentId]?.name ?? hairSourceInfo.fixedParentId} (fixed —
          no pairing choice affects it)
        </div>
      )}

    </div>
  )
}

export function RosterBrowser() {
  const activeRoute = usePlannerStore((state) => state.activeRoute)
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all')
  const [childFilter, setChildFilter] = useState<ChildFilter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const detailRef = useRef<HTMLDivElement>(null)

  // Below the `lg` breakpoint the list/detail grid collapses to a single column (see the
  // container's className below), so the detail panel renders below the *entire* character list —
  // on mobile that's dozens of rows of scrolling below whatever was tapped, with no visual link
  // between the tap and the portrait appearing far below. Scroll it into view on selection so it's
  // not effectively invisible; `lg:` container queries aren't available here, so the breakpoint is
  // duplicated as a plain width check against Tailwind's default `lg` (1024px).
  useEffect(() => {
    if (!selectedId) return
    if (window.innerWidth >= 1024) return
    detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [selectedId])

  const filtered = useMemo(() => {
    return characters.filter((c) => {
      if (!isRouteCompatible(c.route, activeRoute)) return false
      if (genderFilter !== 'all' && c.gender !== genderFilter && c.gender !== 'both') return false
      if (childFilter === 'adults' && c.isChild) return false
      if (childFilter === 'children' && !c.isChild) return false
      return true
    })
  }, [activeRoute, genderFilter, childFilter])

  const selected = selectedId ? charactersById[selectedId] : undefined

  const setUnitLabel = useScreenshotContextStore((state) => state.setUnitLabel)
  useEffect(() => {
    setUnitLabel(selected?.name ?? '')
    return () => setUnitLabel('')
  }, [selected, setUnitLabel])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <RouteFilter />
        <select
          value={genderFilter}
          onChange={(e) => setGenderFilter(e.target.value as GenderFilter)}
          className="rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-200"
        >
          <option value="all">Both</option>
          <option value="M">Male</option>
          <option value="F">Female</option>
        </select>
        <select
          value={childFilter}
          onChange={(e) => setChildFilter(e.target.value as ChildFilter)}
          className="rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-200"
        >
          <option value="all">Adults + Children</option>
          <option value="adults">Adults Only</option>
          <option value="children">Children Only</option>
        </select>
        <span className="text-sm text-neutral-500">{filtered.length} characters</span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {filtered.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setSelectedId(c.id)}
                className={`w-full rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                  selectedId === c.id
                    ? 'border-violet-500 bg-violet-950/50 text-violet-200'
                    : 'border-neutral-800 bg-neutral-900 text-neutral-200 hover:border-neutral-700'
                }`}
              >
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-neutral-500">{c.joinClass ?? c.startingClass}</div>
              </button>
            </li>
          ))}
        </ul>

        <div ref={detailRef}>
          {selected ? (
            <CharacterDetail key={selected.id} character={selected} activeRoute={activeRoute} />
          ) : (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-neutral-800 p-8 text-sm text-neutral-500">
              Select a character to see details
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
