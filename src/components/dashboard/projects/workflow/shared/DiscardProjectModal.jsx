import { WarningCircle } from '@phosphor-icons/react'
import Modal from '@/components/ui/Modal'
import PrimaryButton from '@/components/ui/PrimaryButton'

/**
 * Confirmation dialog shown when navigating away from an active 4-step project
 * workspace.
 *
 * Same composition as the two other interruption dialogs — `NotFoundModal` and
 * `AuthRequiredModal`: shared Modal surface, a status eyebrow, the framed icon
 * beside a lead/detail body pair, and one hairline secondary next to one filled
 * primary. Those three answer the same kind of moment (the product stopping the
 * user mid-navigation), so they read as one dialog family rather than three.
 *
 * The accent is `--color-danger`, on the eyebrow and the icon frame only, which
 * is what makes it read as caution rather than alarm. The CTA is the component's
 * own `danger` variant rather than a red fill typed into `className` — `cn` is a
 * plain joiner, so an override would depend on stylesheet order beating
 * `--btn-bg`.
 */
export default function DiscardProjectModal({ open, onClose, onConfirm }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Discard This Project?"
      labelledBy="discard-project-title"
    >
      <p className="label-ui mt-3 text-[var(--color-danger)]">Active Workflow</p>

      <div className="mt-7 flex items-start gap-5">
        <span
          aria-hidden="true"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm border border-[var(--color-danger)] text-[var(--color-danger)]"
        >
          <WarningCircle size={22} weight="light" />
        </span>

        <div>
          <p className="text-[1rem] font-medium leading-relaxed text-[var(--tone-ink)]">
            You are currently inside an active project workflow.
          </p>
          <p className="mt-2 text-[0.875rem] leading-relaxed text-[var(--tone-muted)]">
            Any unsaved progress and stage configurations will be discarded if you leave now.
          </p>
        </div>
      </div>

      <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          className="label-ui inline-flex min-h-13 cursor-pointer items-center justify-center rounded-sm border border-[var(--tone-line-strong)] px-7 py-4 text-[var(--tone-ink)] transition-colors duration-300 hover:border-[var(--tone-accent)] hover:text-[var(--tone-accent)]"
        >
          Keep Editing
        </button>

        <PrimaryButton
          type="button"
          onClick={onConfirm}
          variant="danger"
          withArrow={false}
          align="center"
        >
          Discard &amp; Leave
        </PrimaryButton>
      </div>
    </Modal>
  )
}
