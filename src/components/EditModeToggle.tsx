import { useState } from 'react'
import { useEditSessionStore } from '../state/editSessionStore'
import { usePlannerStore } from '../state/plannerStore'
import { EditSessionExitModal } from './EditSessionExitModal'

/**
 * Global toggle gating whether icons are click-to-edit. Off by default so normal browsing never
 * risks an accidental upload dialog (icon-asset-slotting spec section 7). Turning it off after
 * any icon/hair-reference change this session prompts to keep or discard, rather than every
 * individual save being silently permanent with no session-level way back out.
 */
export function EditModeToggle() {
  const editModeEnabled = usePlannerStore((state) => state.editModeEnabled)
  const toggleEditMode = usePlannerStore((state) => state.toggleEditMode)
  const revertFns = useEditSessionStore((state) => state.revertFns)
  const discardAll = useEditSessionStore((state) => state.discardAll)
  const clearSession = useEditSessionStore((state) => state.clearSession)
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false)

  const changeCount = Object.keys(revertFns).length

  function handleClick() {
    if (editModeEnabled && changeCount > 0) {
      setExitConfirmOpen(true)
      return
    }
    toggleEditMode()
  }

  function handleKeep() {
    clearSession()
    setExitConfirmOpen(false)
    toggleEditMode()
  }

  async function handleDiscard() {
    await discardAll()
    setExitConfirmOpen(false)
    toggleEditMode()
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
          editModeEnabled
            ? 'bg-amber-600 text-white'
            : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
        }`}
        title="Toggle Edit Mode to upload your own skill/weapon icons"
      >
        {editModeEnabled ? '✏️ Edit Mode: ON' : 'Edit Mode: OFF'}
      </button>
      {exitConfirmOpen && (
        <EditSessionExitModal
          changeCount={changeCount}
          onKeep={handleKeep}
          onDiscard={handleDiscard}
          onContinueEditing={() => setExitConfirmOpen(false)}
        />
      )}
    </>
  )
}
