import { beforeEach, describe, expect, it } from 'vitest'
import { isCharacterAssigned, usePlannerStore } from '../plannerStore'

function resetStore() {
  usePlannerStore.setState({
    activeRoute: 'all',
    pairings: [],
    editModeEnabled: false,
    plans: [],
    activePlanId: null,
  })
}

beforeEach(() => {
  resetStore()
})

describe('plannerStore pairings', () => {
  it('adds and removes pairings', () => {
    usePlannerStore.getState().addPairing({ characterAId: 'laslow', characterBId: 'corrin_f' })
    expect(usePlannerStore.getState().pairings).toHaveLength(1)
    usePlannerStore.getState().removePairing('laslow', 'corrin_f')
    expect(usePlannerStore.getState().pairings).toHaveLength(0)
  })

  it('isCharacterAssigned reflects current pairings', () => {
    usePlannerStore.getState().addPairing({ characterAId: 'laslow', characterBId: 'corrin_f' })
    expect(isCharacterAssigned(usePlannerStore.getState().pairings, 'corrin_f')).toBe(true)
    expect(isCharacterAssigned(usePlannerStore.getState().pairings, 'odin')).toBe(false)
  })
})

describe('plannerStore saved plans', () => {
  it('saves the current pairings as a new named plan', () => {
    usePlannerStore.getState().addPairing({ characterAId: 'laslow', characterBId: 'corrin_f' })
    usePlannerStore.getState().saveCurrentAsPlan('Conquest run #1')

    const { plans, activePlanId } = usePlannerStore.getState()
    expect(plans).toHaveLength(1)
    expect(plans[0].name).toBe('Conquest run #1')
    expect(plans[0].pairings).toHaveLength(1)
    expect(activePlanId).toBe(plans[0].id)
  })

  it('loading a plan replaces the working pairings/route', () => {
    usePlannerStore.getState().addPairing({ characterAId: 'laslow', characterBId: 'corrin_f' })
    usePlannerStore.getState().saveCurrentAsPlan('Plan A')
    usePlannerStore.getState().clearPairings()
    expect(usePlannerStore.getState().pairings).toHaveLength(0)

    const planId = usePlannerStore.getState().plans[0].id
    usePlannerStore.getState().loadPlan(planId)
    expect(usePlannerStore.getState().pairings).toHaveLength(1)
    expect(usePlannerStore.getState().activePlanId).toBe(planId)
  })

  it('deleting a plan removes it and clears activePlanId if it was active', () => {
    usePlannerStore.getState().addPairing({ characterAId: 'laslow', characterBId: 'corrin_f' })
    usePlannerStore.getState().saveCurrentAsPlan('Plan A')
    const planId = usePlannerStore.getState().plans[0].id

    usePlannerStore.getState().deletePlan(planId)
    expect(usePlannerStore.getState().plans).toHaveLength(0)
    expect(usePlannerStore.getState().activePlanId).toBeNull()
  })

  it('renaming a plan updates its name without touching its pairings', () => {
    usePlannerStore.getState().addPairing({ characterAId: 'laslow', characterBId: 'corrin_f' })
    usePlannerStore.getState().saveCurrentAsPlan('Plan A')
    const planId = usePlannerStore.getState().plans[0].id

    usePlannerStore.getState().renamePlan(planId, 'Renamed Plan')
    const plan = usePlannerStore.getState().plans.find((p) => p.id === planId)
    expect(plan?.name).toBe('Renamed Plan')
    expect(plan?.pairings).toHaveLength(1)
  })

  it('saving again under the same active plan name updates it in place rather than duplicating', () => {
    usePlannerStore.getState().addPairing({ characterAId: 'laslow', characterBId: 'corrin_f' })
    usePlannerStore.getState().saveCurrentAsPlan('Plan A')
    usePlannerStore.getState().addPairing({ characterAId: 'odin', characterBId: 'corrin_f' })
    usePlannerStore.getState().saveCurrentAsPlan('Plan A')

    const { plans } = usePlannerStore.getState()
    expect(plans).toHaveLength(1)
    expect(plans[0].pairings).toHaveLength(2)
  })
})
