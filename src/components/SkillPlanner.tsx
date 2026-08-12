import { useEffect, useMemo, useState } from 'react'
import { characters, charactersById } from '../data/characters'
import { classes as allClasses } from '../data/classes'
import { skills, skillsById } from '../data/skills'
import { supports } from '../data/supports'
import type { ClassData, Gender } from '../data/types'
import {
  classSkillsForGender,
  getClassLine,
  getOwnClassTree,
  getSealReclassClass,
  isCorrinWithoutTalent,
  skillLevelsFor,
  weaponRankBonus,
} from '../logic/classResolution'
import { computeChild, fixedParentContribution } from '../logic/childCalculator'
import { getFixedParent, isFamilyBlocked } from '../logic/childLookup'
import { withCorrinBuild } from '../logic/corrinBuild'
import { canFriendshipSeal, canMarry, canProduceChild, isRouteCompatible } from '../logic/eligibility'
import { useCorrinBuildStore } from '../state/corrinBuildStore'
import { usePlannerStore } from '../state/plannerStore'
import type { SavedBuild } from '../state/savedBuildsStore'
import { useScreenshotContextStore } from '../state/screenshotContextStore'
import { AssetIcon } from './AssetIcon'
import { RouteFilter } from './RouteFilter'
import { SavedBuildsManager } from './SavedBuildsManager'

const MAX_LOADOUT = 5

const skillIdByName: Record<string, string> = Object.fromEntries(skills.map((s) => [s.name, s.id]))

/** DLC (Scroll item) and Amiibo classes, in that order — not tied to any character's normal class set. */
const ITEM_CLASSES = allClasses.filter((c) => c.isDlcClass || c.isAmiibo)

const COMBAT_BONUS_LABELS: Record<string, string> = { hit: 'Hit', avoid: 'Avoid', crit: 'Crit', dodge: 'Dodge' }

/** One line per field: Mov, then each weapon rank (skipping slots the class doesn't have), then
 * the class's innate combat bonus (parenthesized, omitted entirely when the class has none). */
function classMetaLines(cls: ClassData): string[] {
  const lines: string[] = [`Mov ${cls.movement}`]
  cls.weaponRanks?.forEach((w) => {
    const bonus = weaponRankBonus(w.type, w.rank)
    lines.push(`${w.type} ${w.rank}${bonus ? ` (${bonus})` : ''}`)
  })
  if (cls.combatBonus) {
    const bonusParts = Object.entries(cls.combatBonus).map(
      ([k, v]) => `${COMBAT_BONUS_LABELS[k] ?? k} ${v > 0 ? '+' : ''}${v}`,
    )
    if (bonusParts.length) lines.push(`(${bonusParts.join(', ')})`)
  }
  return lines
}

function ClassSkillRow({
  cls,
  gender,
  loadout,
  onToggle,
}: {
  cls: ClassData
  /** Whose class-tree row this is — decides which member of a gendered skill pair (currently only
   * Troubadour's Gentilhomme/Demoiselle) is this unit's real skill slot; the other stays pickable
   * from the general skill pool below instead of being shown twice here. */
  gender: Gender
  loadout: string[]
  onToggle: (skillId: string) => void
}) {
  const levels = skillLevelsFor(cls)
  const displaySkillIds = classSkillsForGender(cls, gender)
  return (
    <div className="flex flex-col gap-2 rounded-md border border-neutral-800 px-3 py-2 sm:flex-row sm:items-start sm:gap-3">
      <div className="shrink-0 sm:w-36">
        <div className="text-sm text-neutral-300">{cls.name}</div>
        <div className="text-[10px] leading-tight text-neutral-500">
          {classMetaLines(cls).map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-wrap gap-2">
        {displaySkillIds.map((id, i) => {
          const skill = skillsById[id]
          const selected = loadout.includes(id)
          return (
            <button
              key={id}
              type="button"
              onClick={() => onToggle(id)}
              className={`flex min-w-[10rem] max-w-xs flex-col gap-0.5 rounded-md border px-2 py-1 text-left text-xs transition-colors ${
                selected
                  ? 'border-violet-500 bg-violet-950/50 text-violet-200'
                  : 'border-neutral-700 bg-neutral-800 text-neutral-300 hover:border-neutral-600'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <AssetIcon type="skill" iconId={id} label={skill?.name ?? id} size={18} />
                <span className="min-w-0 break-words">{skill?.name ?? id}</span>
                <span className="ml-auto shrink-0 text-neutral-500">Lv{levels[i]}</span>
              </span>
              {skill?.description && (
                <span className="text-[10px] leading-tight text-neutral-400">{skill.description}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function SkillPlanner() {
  const activeRoute = usePlannerStore((state) => state.activeRoute)
  const pairings = usePlannerStore((state) => state.pairings)
  const corrinBuild = useCorrinBuildStore((state) => state.build)
  const [characterId, setCharacterId] = useState('')
  const [wifeId, setWifeId] = useState('')
  const [friendId, setFriendId] = useState('')
  const [loadout, setLoadout] = useState<string[]>([])
  const [poolSearch, setPoolSearch] = useState('')
  const [unlockedItemClassIds, setUnlockedItemClassIds] = useState<string[]>([])
  const [variableParentId, setVariableParentId] = useState('')

  // Children are selectable too — Corrin can marry some of them, and children can marry each
  // other (barring siblings) — canMarry below still gates it on real S-support data either way.
  const participants = useMemo(
    () => characters.filter((c) => isRouteCompatible(c.route, activeRoute)),
    [activeRoute],
  )

  const character = characterId ? withCorrinBuild(charactersById[characterId], corrinBuild) : undefined

  const setUnitLabel = useScreenshotContextStore((state) => state.setUnitLabel)
  useEffect(() => {
    setUnitLabel(character?.name ?? '')
    return () => setUnitLabel('')
  }, [character, setUnitLabel])

  // Partner Seal is a real marriage, so family-blocked candidates (per the current plan) are
  // excluded here — but NOT from Friend/Friendship Seal below, since siblings can still support.
  const wifeOptions = useMemo(() => {
    if (!character) return []
    return participants.filter(
      (c) =>
        c.id !== character.id &&
        canMarry(supports, character, c, activeRoute) &&
        !isFamilyBlocked(character, c, pairings),
    )
  }, [character, participants, activeRoute, pairings])

  // Family-blocked candidates (siblings/parent-child per the current plan) are NOT excluded here —
  // Friendship Seal is a same-sex A+ support, which siblings can still reach even when marriage
  // (Partner Seal, above) is blocked. Corrin IS excluded — nobody can actually reach A+ with Corrin
  // (that's the trigger Friendship Seal needs), so Corrin never has a friendship class to give, same
  // as the Unit Planner's ownFriendEligible.
  const friendOptions = useMemo(() => {
    if (!character) return []
    return participants.filter(
      (c) =>
        c.id !== character.id &&
        c.id !== wifeId &&
        c.id !== 'corrin_m' &&
        c.id !== 'corrin_f' &&
        canFriendshipSeal(supports, character, c, activeRoute),
    )
  }, [participants, character, wifeId, activeRoute])

  const wife = wifeId ? withCorrinBuild(charactersById[wifeId], corrinBuild) : undefined
  const friend = friendId ? withCorrinBuild(charactersById[friendId], corrinBuild) : undefined

  /** Labeled by the actual partner's gender once picked (not assumed opposite-sex) — covers the
   * game's two same-sex S-supports (Corrin M x Niles, Corrin F x Rhajat), where the partner shares
   * the selected unit's gender instead of the usual opposite. Before a partner is picked, falls
   * back to the expected opposite-sex guess based on the selected unit's own gender. */
  function spouseLabelFor(gender: string | undefined): 'Wife' | 'Husband' | 'Spouse' {
    if (gender === 'F') return 'Wife'
    if (gender === 'M') return 'Husband'
    return 'Spouse'
  }
  const spouseLabel = wife
    ? spouseLabelFor(wife.gender)
    : character?.gender === 'M'
      ? 'Wife'
      : character?.gender === 'F'
        ? 'Husband'
        : 'Spouse'

  const classTree = character ? getOwnClassTree(character, activeRoute) : undefined
  const marriageClassName = character && wife ? getSealReclassClass(character, wife) : undefined
  const marriageClassLine = marriageClassName ? getClassLine(marriageClassName, activeRoute) : []
  const friendClassName = character && friend ? getSealReclassClass(character, friend) : undefined
  const friendClassLine = friendClassName ? getClassLine(friendClassName, activeRoute) : []

  // Children's class tree isn't their own Class Set at all — it's their own primary line plus
  // whatever their fixed parent (father, for most; mother for a few, e.g. Midori) and variable
  // parent (whoever the fixed parent marries) each contribute, per the same inheritance rules the
  // Unit Planner tab already uses (see childCalculator.ts's fixedParentContribution/inheritClasses).
  const fixedInfo = useMemo(() => (character?.isChild ? getFixedParent(character) : undefined), [character])
  const variableCandidates = useMemo(() => {
    if (!fixedInfo) return []
    const fixedC = charactersById[fixedInfo.id]
    if (!fixedC) return []
    const isKana = character?.id === 'kana_m' || character?.id === 'kana_f'
    return characters.filter((c) => {
      if ((c.isChild && !isKana) || c.id === fixedC.id) return false
      const father = fixedInfo.side === 'father' ? fixedC : c
      const mother = fixedInfo.side === 'father' ? c : fixedC
      return canProduceChild(supports, father, mother, activeRoute)
    })
  }, [fixedInfo, character, activeRoute])
  const fixedChar = fixedInfo ? withCorrinBuild(charactersById[fixedInfo.id], corrinBuild) : undefined
  const variableChar = variableParentId ? withCorrinBuild(charactersById[variableParentId], corrinBuild) : undefined

  const primaryClassLine = character ? getClassLine(character.startingClass, activeRoute) : []
  const fixedParentClassNames =
    character?.isChild && fixedChar ? fixedParentContribution(character, fixedChar) : []
  const fixedParentClassLines = fixedParentClassNames.flatMap((name) => getClassLine(name, activeRoute))

  const childComputeResult =
    character?.isChild && fixedInfo && fixedChar && variableChar
      ? computeChild({
          child: character,
          father: fixedInfo.side === 'father' ? fixedChar : variableChar,
          mother: fixedInfo.side === 'father' ? variableChar : fixedChar,
          fatherCurrentStats: (fixedInfo.side === 'father' ? fixedChar : variableChar).baseStats,
          motherCurrentStats: (fixedInfo.side === 'father' ? variableChar : fixedChar).baseStats,
        })
      : undefined
  const guaranteedChildClassNames = new Set([character?.startingClass, ...fixedParentClassNames])
  const variableParentClassNames =
    childComputeResult?.inheritedClasses.filter((name) => !guaranteedChildClassNames.has(name)) ?? []
  const variableParentClassLines = variableParentClassNames.flatMap((name) => getClassLine(name, activeRoute))

  // DLC classes are open to anyone; Amiibo classes are gender-locked (e.g. Witch/Great Lord are
  // female-only, the other three male-only) — only offer classes this unit could actually reclass into.
  const availableItemClasses = useMemo(
    () => (character ? ITEM_CLASSES.filter((c) => !c.genderLock || c.genderLock === character.gender) : []),
    [character],
  )
  const unlockedItemClasses = availableItemClasses.filter((c) => unlockedItemClassIds.includes(c.id))

  // Each source contributes only its gender-correct skill (via classSkillsForGender) — matching
  // what ClassSkillRow actually displays for it — so a gendered pair's "wrong" half (e.g.
  // Demoiselle for a male unit's Troubadour line) stays excluded from THIS set and thus still
  // visible down in the general pool, rather than looking unavailable everywhere.
  const availablePoolIds = (() => {
    if (!character) return []
    const ids = new Set<string>()
    const addAll = (classes: ClassData[], gender: Gender) =>
      classes.forEach((cls) => classSkillsForGender(cls, gender).forEach((id) => ids.add(id)))

    const personalId = skillIdByName[character.personalSkill]
    if (personalId) ids.add(personalId)
    if (character.isChild) {
      addAll(primaryClassLine, character.gender)
      if (fixedChar) addAll(fixedParentClassLines, fixedChar.gender)
      if (variableChar) addAll(variableParentClassLines, variableChar.gender)
    } else {
      addAll([...(classTree?.base ?? []), ...(classTree?.secondary ?? []), ...(classTree?.tertiary ?? [])], character.gender)
    }
    if (wife) addAll(marriageClassLine, wife.gender)
    if (friend) addAll(friendClassLine, friend.gender)
    addAll(unlockedItemClasses, character.gender)
    return Array.from(ids)
  })()

  function toggleLoadout(skillId: string) {
    setLoadout((prev) => {
      if (prev.includes(skillId)) return prev.filter((id) => id !== skillId)
      if (prev.length >= MAX_LOADOUT) return prev
      return [...prev, skillId]
    })
  }

  function toggleItemClass(classId: string) {
    setUnlockedItemClassIds((prev) =>
      prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId],
    )
  }

  function handleCharacterChange(id: string) {
    setCharacterId(id)
    setWifeId('')
    setFriendId('')
    setUnlockedItemClassIds([])
    setLoadout([])
    setVariableParentId('')
  }

  const currentBuildData = {
    characterId,
    wifeId,
    friendId,
    loadout,
    unlockedItemClassIds,
    variableParentId,
  }

  function handleLoadBuild(build: SavedBuild) {
    const data = build.data as Partial<typeof currentBuildData>
    setCharacterId(typeof data.characterId === 'string' ? data.characterId : '')
    setWifeId(typeof data.wifeId === 'string' ? data.wifeId : '')
    setFriendId(typeof data.friendId === 'string' ? data.friendId : '')
    setLoadout(Array.isArray(data.loadout) ? data.loadout : [])
    setUnlockedItemClassIds(Array.isArray(data.unlockedItemClassIds) ? data.unlockedItemClassIds : [])
    setVariableParentId(typeof data.variableParentId === 'string' ? data.variableParentId : '')
  }

  return (
    <div className="space-y-6">
      <RouteFilter />

      <div className="space-y-4 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
        <h3 className="text-base font-semibold text-neutral-100">Skill Planner</h3>
        <select
          value={characterId}
          onChange={(e) => handleCharacterChange(e.target.value)}
          className="w-full max-w-sm rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-200"
        >
          <option value="">Select a unit…</option>
          {participants.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {character && character.isChild && fixedInfo && (
          <label className="flex flex-col gap-1 text-xs text-neutral-400">
            Variable parent ({charactersById[fixedInfo.id]?.name ?? fixedInfo.id}'s spouse)
            <select
              value={variableParentId}
              onChange={(e) => setVariableParentId(e.target.value)}
              className="w-full max-w-sm rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-200"
            >
              <option value="">(none selected)</option>
              {variableCandidates.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
        )}
        {character && character.isChild && fixedInfo && !variableChar && (
          <p className="text-xs text-neutral-500">
            Select the variable parent above to also see their inherited class below.
          </p>
        )}

        {character && (
          <>
            <div className="text-sm text-neutral-300">
              <span className="text-neutral-500">Personal skill: </span>
              {skillIdByName[character.personalSkill] && (
                <AssetIcon type="skill" iconId={skillIdByName[character.personalSkill]} label={character.personalSkill} size={18} />
              )}{' '}
              {character.personalSkill}
              {skillsById[skillIdByName[character.personalSkill]]?.description && (
                <div className="mt-0.5 text-xs text-neutral-500">
                  {skillsById[skillIdByName[character.personalSkill]].description}
                </div>
              )}
            </div>

            {!character.isChild && (
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  Base Class Tree ({character.startingClass})
                </h4>
                <div className="space-y-2">
                  {classTree?.base.map((cls) => (
                    <ClassSkillRow key={cls.id} cls={cls} gender={character.gender} loadout={loadout} onToggle={toggleLoadout} />
                  ))}
                </div>
              </div>
            )}

            {classTree && classTree.secondary.length > 0 && !character.isChild && (
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  Secondary Class Tree ({character.secondaryClass})
                </h4>
                <div className="space-y-2">
                  {classTree.secondary.map((cls) => (
                    <ClassSkillRow key={cls.id} cls={cls} gender={character.gender} loadout={loadout} onToggle={toggleLoadout} />
                  ))}
                </div>
              </div>
            )}

            {classTree && classTree.tertiary.length > 0 && !character.isChild && (
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  Tertiary Class Tree ({character.tertiaryClass})
                </h4>
                <div className="space-y-2">
                  {classTree.tertiary.map((cls) => (
                    <ClassSkillRow key={cls.id} cls={cls} gender={character.gender} loadout={loadout} onToggle={toggleLoadout} />
                  ))}
                </div>
              </div>
            )}

            {character.isChild && (
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  Primary Class Tree ({character.startingClass})
                </h4>
                <div className="space-y-2">
                  {primaryClassLine.map((cls) => (
                    <ClassSkillRow key={cls.id} cls={cls} gender={character.gender} loadout={loadout} onToggle={toggleLoadout} />
                  ))}
                </div>
              </div>
            )}

            {character.isChild && fixedChar && fixedParentClassLines.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  {fixedChar.name}'s Class Tree ({fixedInfo?.side === 'father' ? 'Father' : 'Mother'}) — {fixedParentClassNames.join(', ')}
                </h4>
                <div className="space-y-2">
                  {fixedParentClassLines.map((cls) => (
                    <ClassSkillRow key={cls.id} cls={cls} gender={fixedChar.gender} loadout={loadout} onToggle={toggleLoadout} />
                  ))}
                </div>
              </div>
            )}

            {character.isChild && variableChar && variableParentClassLines.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  {variableChar.name}'s Class Tree ({fixedInfo?.side === 'father' ? 'Mother' : 'Father'}) — {variableParentClassNames.join(', ')}
                </h4>
                <div className="space-y-2">
                  {variableParentClassLines.map((cls) => (
                    <ClassSkillRow key={cls.id} cls={cls} gender={variableChar.gender} loadout={loadout} onToggle={toggleLoadout} />
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs text-neutral-400">
                {spouseLabel} (Partner Seal)
                <select
                  value={wifeId}
                  onChange={(e) => setWifeId(e.target.value)}
                  className="rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-200"
                >
                  <option value="">(none)</option>
                  {wifeOptions.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-neutral-400">
                A+ Friend (Friendship Seal)
                <select
                  value={friendId}
                  onChange={(e) => setFriendId(e.target.value)}
                  className="rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-200"
                >
                  <option value="">(none)</option>
                  {friendOptions.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>
            </div>

            {wife && marriageClassLine.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  Marriage Class ({marriageClassName}, via {wife.name})
                </h4>
                <div className="space-y-2">
                  {marriageClassLine.map((cls) => (
                    <ClassSkillRow key={cls.id} cls={cls} gender={wife.gender} loadout={loadout} onToggle={toggleLoadout} />
                  ))}
                </div>
              </div>
            )}
            {wife && isCorrinWithoutTalent(wife) && (
              <p className="text-xs text-neutral-500">
                Select {wife.name}'s Talent in the Corrin Build panel to see the class gained through this marriage.
              </p>
            )}

            {friend && friendClassLine.length > 0 && (
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  Friendship Class ({friendClassName}, via {friend.name})
                </h4>
                <div className="space-y-2">
                  {friendClassLine.map((cls) => (
                    <ClassSkillRow key={cls.id} cls={cls} gender={friend.gender} loadout={loadout} onToggle={toggleLoadout} />
                  ))}
                </div>
              </div>
            )}
            {friend && isCorrinWithoutTalent(friend) && (
              <p className="text-xs text-neutral-500">
                Select {friend.name}'s Talent in the Corrin Build panel to see the class gained through this friendship.
              </p>
            )}

            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                DLC / Amiibo classes unlocked for {character.name}
              </h4>
              <div className="flex flex-wrap gap-2">
                {availableItemClasses.map((c) => {
                  const on = unlockedItemClassIds.includes(c.id)
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleItemClass(c.id)}
                      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                        on
                          ? 'border-violet-500 bg-violet-950/50 text-violet-200'
                          : 'border-neutral-700 bg-neutral-800 text-neutral-400 hover:border-neutral-600'
                      }`}
                    >
                      {c.name} {c.isAmiibo ? '(Amiibo)' : '(DLC)'}
                    </button>
                  )
                })}
              </div>
              {unlockedItemClasses.length > 0 && (
                <div className="mt-2 space-y-2">
                  {unlockedItemClasses.map((cls) => (
                    <ClassSkillRow key={cls.id} cls={cls} gender={character.gender} loadout={loadout} onToggle={toggleLoadout} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {character && (
        <>
          <div className="space-y-3 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
            <h3 className="text-base font-semibold text-neutral-100">
              Loadout ({loadout.length}/{MAX_LOADOUT})
            </h3>
            {loadout.length === 0 ? (
              <p className="text-sm text-neutral-500">No skills selected yet — click any skill above to add it.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {loadout.map((id) => (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => toggleLoadout(id)}
                      className="flex min-w-[10rem] max-w-xs flex-col gap-0.5 rounded-md border border-violet-500 bg-violet-950/50 px-2 py-1 text-left text-xs text-violet-200 hover:border-red-400 hover:text-red-300"
                    >
                      <span className="flex items-center gap-1.5">
                        <AssetIcon type="skill" iconId={id} label={skillsById[id]?.name ?? id} size={18} />
                        <span className="min-w-0 break-words">{skillsById[id]?.name ?? id}</span>
                        <span className="ml-auto shrink-0">×</span>
                      </span>
                      {skillsById[id]?.description && (
                        <span className="text-[10px] leading-tight text-violet-300/80">{skillsById[id].description}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div data-export-hide>
            <SavedBuildsManager
              tab="skills"
              characterName={character.name}
              route={activeRoute}
              data={currentBuildData}
              canSave={Boolean(character)}
              onLoad={handleLoadBuild}
            />
          </div>

          <div data-export-hide className="space-y-3 rounded-lg border border-dashed border-neutral-800 bg-neutral-900/90 p-4">
            <h3 className="text-base font-semibold text-neutral-100">General Skill Pool (all skills)</h3>
            <p className="text-xs text-neutral-500">
              Every class and DLC skill in the game, in case you need to add something the sections
              above don't cover — e.g. a cross-route pairing, or a skill from another support
              partner/friend. Personal skills are excluded — those are permanently locked to their
              one character in-game and can't be equipped by anyone else.
            </p>
            <input
              type="text"
              value={poolSearch}
              onChange={(e) => setPoolSearch(e.target.value)}
              placeholder="Search skills…"
              className="w-full max-w-sm rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-200 placeholder:text-neutral-500"
            />
            <div className="flex flex-wrap gap-2">
              {skills
                .filter((s) => !s.isPersonal && !availablePoolIds.includes(s.id))
                .filter((s) => s.name.toLowerCase().includes(poolSearch.trim().toLowerCase()))
                .map((s) => {
                  const selected = loadout.includes(s.id)
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleLoadout(s.id)}
                      className={`flex min-w-[10rem] max-w-xs flex-col gap-0.5 rounded-md border px-2 py-1 text-left text-xs transition-colors ${
                        selected
                          ? 'border-violet-500 bg-violet-950/50 text-violet-200'
                          : 'border-neutral-700 bg-neutral-800 text-neutral-400 hover:border-neutral-600'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <AssetIcon type="skill" iconId={s.id} label={s.name} size={18} />
                        <span className="min-w-0 break-words">
                          {s.name}
                          {s.isDlc ? ' (DLC)' : ''}
                          {s.isAmiibo ? ' (Amiibo)' : ''}
                          {s.isItem ? ' (Item)' : ''}
                        </span>
                      </span>
                      {s.description && <span className="text-[10px] leading-tight text-neutral-500">{s.description}</span>}
                    </button>
                  )
                })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
