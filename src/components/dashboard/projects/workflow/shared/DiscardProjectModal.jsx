import Modal from '@/components/ui/Modal'
import PrimaryButton from '@/components/ui/PrimaryButton'

/**
 * Confirmation dialog shown when navigating away from an active 4-step project workspace.
 * Uses the exact Kraios light-theme modal system and typography.
 */
export default function DiscardProjectModal({ open, onClose, onConfirm }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="DISCARD PROJECT?"
      labelledBy="discard-project-title"
    >
      <p className="mt-4.5 sm:mt-5 mb-7 sm:mb-8 text-[0.9375rem] leading-[1.65] text-[var(--tone-muted-dark)]">
        You are currently inside an active project workflow. Are you sure you want to leave? Any unsaved progress and stage configurations will be discarded.
      </p>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-3">

        <button
          type="button"
          onClick={onClose}
          className="label-ui min-h-11 cursor-pointer px-4 text-[var(--tone-muted-dark)] transition-colors duration-150 hover:text-[var(--tone-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-deep)]"
        >
          Keep Editing
        </button>

        <PrimaryButton
          type="button"
          onClick={onConfirm}
          withArrow={false}
          align="center"
          className="w-full bg-[var(--color-danger)] hover:bg-red-700 sm:w-auto text-white shadow-xs"
        >
          Discard & Leave
        </PrimaryButton>
      </div>
    </Modal>
  )
}
