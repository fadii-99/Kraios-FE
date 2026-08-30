import { useNavigate } from 'react-router-dom'
import { Info } from '@phosphor-icons/react'
import Modal from '@/components/ui/Modal'
import PrimaryButton from '@/components/ui/PrimaryButton'
import { useAuth } from '@/contexts/AuthContext'

/**
 * The answer for an address that matches no route in the application —
 * anywhere, dashboard-shaped or not. It is reached only through the router's
 * `*` route, so it can never stand in for a route that exists but is protected.
 *
 * Same Modal family as every other dialog, with the informational accent on the
 * icon frame and the status line. It renders from state already in memory and
 * fires NO request: a bad URL is not a reason to ask the backend anything.
 * Whoever arrives with a session already verified is offered the dashboard;
 * everyone else, including a cold load, is offered Home.
 */
export default function NotFoundModal({ open = true, onClose }) {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  const destination = isAuthenticated
    ? { to: '/dashboard', label: 'Go to Dashboard' }
    : { to: '/', label: 'Go to Home' }

  const handleGo = () => {
    if (onClose) onClose()
    navigate(destination.to)
  }

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      handleGo()
    }
  }

  const handleClose = () => {
    if (onClose) {
      onClose()
    } else {
      handleGo()
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="This Page Doesn't Exist">
      <p className="label-ui mt-3 text-[var(--color-brand-deep)]">Page Not Found</p>

      <div className="mt-7 flex items-start gap-5">
        <span
          aria-hidden="true"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm border border-[var(--color-brand-deep)] text-[var(--color-brand-deep)]"
        >
          <Info size={22} weight="light" />
        </span>

        <div>
          <p className="text-[1rem] font-medium leading-relaxed text-[var(--tone-ink)]">
            The address you entered does not match any page in KRAIOS.
          </p>
          <p className="mt-2 text-[0.875rem] leading-relaxed text-[var(--tone-muted)]">
            Check the link, or continue from a page that exists.
          </p>
        </div>
      </div>

      <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={handleGoBack}
          className="label-ui inline-flex min-h-13 cursor-pointer items-center justify-center rounded-sm border border-[var(--tone-line-strong)] px-7 py-4 text-[var(--tone-ink)] transition-colors duration-300 hover:border-[var(--tone-accent)] hover:text-[var(--tone-accent)]"
        >
          Go Back
        </button>

        <PrimaryButton type="button" onClick={handleGo} withArrow={false} align="center">
          {destination.label}
        </PrimaryButton>
      </div>
    </Modal>
  )
}
