import { Link, useNavigate } from 'react-router-dom'
import { WarningCircle } from '@phosphor-icons/react'
import Modal from '@/components/ui/Modal'
import PrimaryButton from '@/components/ui/PrimaryButton'

/**
 * The caution answer for a VALID dashboard route reached without a session.
 *
 * Same composition as the Signup confirmation dialog — shared Modal surface,
 * icon frame, body pair, one hairline secondary and one filled primary. The
 * surface, typography and buttons are unchanged; the only red is the status
 * line and the icon frame, which is what makes it read as caution rather than
 * as an alarm. The CTA stays the product button: an arbitrary red fill would
 * have to beat `--btn-bg` on stylesheet order, since `cn` is a plain joiner.
 *
 * `from` is the address the visitor actually asked for. It travels to Login in
 * router state, so signing in returns them there instead of the dashboard root.
 * `expired` swaps the copy for a session that ended mid-use; the caution modal
 * is the ONLY feedback for that event, so nothing toasts it as well.
 */
export default function AuthRequiredModal({ open = true, onClose, from, expired = false }) {
  const navigate = useNavigate()

  const copy = expired
    ? {
        eyebrow: 'Session Expired',
        title: 'Sign In Again',
        lead: 'Your session has expired.',
        detail: 'Sign in again to continue using the KRAIOS dashboard.',
      }
    : {
        eyebrow: 'Access Required',
        title: 'Sign In To Continue',
        lead: 'You need to sign in before accessing the KRAIOS dashboard and project workspace.',
        detail: 'This area is available to authenticated accounts only.',
      }

  const handleLogin = () => {
    if (onClose) onClose()
    navigate('/login', from ? { state: { from } } : undefined)
  }

  const handleClose = () => {
    if (onClose) {
      onClose()
    } else {
      handleLogin()
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title={copy.title}>
      <p className="label-ui mt-3 text-[var(--color-danger)]">{copy.eyebrow}</p>

      <div className="mt-7 flex items-start gap-5">
        <span
          aria-hidden="true"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm border border-[var(--color-danger)] text-[var(--color-danger)]"
        >
          <WarningCircle size={22} weight="light" />
        </span>

        <div>
          <p className="text-[1rem] font-medium leading-relaxed text-[var(--tone-ink)]">
            {copy.lead}
          </p>
          <p className="mt-2 text-[0.875rem] leading-relaxed text-[var(--tone-muted)]">
            {copy.detail}
          </p>
        </div>
      </div>

      <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Link
          to="/"
          className="label-ui inline-flex min-h-13 cursor-pointer items-center justify-center rounded-sm border border-[var(--tone-line-strong)] px-7 py-4 text-[var(--tone-ink)] transition-colors duration-300 hover:border-[var(--tone-accent)] hover:text-[var(--tone-accent)]"
        >
          Go to Home
        </Link>

        <PrimaryButton type="button" onClick={handleLogin} withArrow={false} align="center">
          Go to Login
        </PrimaryButton>
      </div>
    </Modal>
  )
}
