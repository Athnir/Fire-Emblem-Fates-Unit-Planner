interface Props {
  changeCount: number
  onKeep: () => void
  onDiscard: () => void
  onContinueEditing: () => void
}

/** Shown when turning Edit Mode off after at least one icon/hair-reference change this session. */
export function EditSessionExitModal({ changeCount, onKeep, onDiscard, onContinueEditing }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm space-y-4 rounded-lg border border-neutral-700 bg-neutral-900 p-5">
        <h3 className="text-base font-semibold text-neutral-100">
          Leaving Edit Mode
        </h3>
        <p className="text-sm text-neutral-400">
          You changed {changeCount} image{changeCount === 1 ? '' : 's'} this session. Keep these changes?
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onContinueEditing}
            className="rounded-md px-3 py-1.5 text-sm text-neutral-400 hover:text-neutral-200"
          >
            Keep Editing
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="rounded-md border border-red-500 px-3 py-1.5 text-sm font-medium text-red-400 hover:bg-red-950/50"
          >
            Discard Changes
          </button>
          <button
            type="button"
            onClick={onKeep}
            className="rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-500"
          >
            Keep Changes
          </button>
        </div>
      </div>
    </div>
  )
}
