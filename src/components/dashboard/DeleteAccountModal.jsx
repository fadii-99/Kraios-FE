import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, EyeSlash, ShieldWarning, Trash, WarningCircle } from '@phosphor-icons/react'
import Modal from '@/components/ui/Modal'
import PrimaryButton from '@/components/ui/PrimaryButton'
import { useAuth } from '@/contexts/AuthContext'
import {
  VERIFICATION_KEYS,
  clearVerificationId,
  confirmAccountDeletion,
  readVerificationId,
  requestAccountDeletion,
} from '@/lib/api'
import { showErrorToast, showInfoToast, showSuccessToast } from '@/lib/toast'
import { cn } from '@/lib/cn'

/**
 * DeleteAccountModal — Architectural Danger Confirmation Dialog for Account Deletion.
 *
 * Two screens, matching the backend contract:
 *   A. confirm — type DELETE and supply the current password;
 *      POST /profile/delete-account/request/ answers 202 and mails a six-digit OTP
 *   B. verify  — the OTP; POST /profile/delete-account/confirm/ answers 204
 *
 * The confirm step responds 204 No Content: the backend permanently deletes the
 * user, their owned projects, database records and stored project files, then
 * clears the authentication cookies. The client session is dropped and the user
 * lands back on the public site.
 */
export default function DeleteAccountModal({ open, onClose }) {
  const formRef = useRef(null)
  const navigate = useNavigate()
  const { clearSession } = useAuth()

  // 'confirm' -> 'verify'
  const [step, setStep] = useState('confirm')

  const [confirmText, setConfirmText] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [otp, setOtp] = useState('')

  const [errors, setErrors] = useState({})
  const [isDeleting, setIsDeleting] = useState(false)
  // Set on HTTP 429 — OTP requests are capped at five per hour per user.
  const [isRateLimited, setIsRateLimited] = useState(false)
  const [verificationId, setVerificationId] = useState('')

  const isConfirmed = confirmText.trim().toUpperCase() === 'DELETE'
  const isVerifyStep = step === 'verify'

  const resetLocalState = () => {
    setConfirmText('')
    setCurrentPassword('')
    setOtp('')
    setErrors({})
    setVerificationId('')
    setStep('confirm')
  }

  const handleClose = () => {
    if (isDeleting) return
    clearVerificationId(VERIFICATION_KEYS.deleteAccount)
    resetLocalState()
    onClose()
  }

  /** Screen A — verify the password and request the deletion OTP. */
  const handleRequest = async (e) => {
    e.preventDefault()
    if (isDeleting) return

    if (!isConfirmed) {
      showErrorToast('Please type DELETE to confirm account deletion.', {
        id: 'delete-confirm-error',
      })
      formRef.current?.querySelector('#delete-confirm-input')?.focus()
      return
    }

    if (!currentPassword.trim()) {
      setErrors({ currentPassword: 'Enter your current password.' })
      formRef.current?.querySelector('#delete-current-password')?.focus()
      showErrorToast('Enter your current password.', { id: 'delete-password-error' })
      return
    }

    setErrors({})
    setIsDeleting(true)

    try {
      const result = await requestAccountDeletion({ currentPassword })

      setVerificationId(
        result?.verification_id ||
          readVerificationId(VERIFICATION_KEYS.deleteAccount) ||
          '',
      )

      // The password is not kept once the request has succeeded.
      setCurrentPassword('')
      setStep('verify')

      showInfoToast(
        result?.detail || 'A verification code has been sent to your email.',
        { id: 'delete-account-otp-sent' },
      )
    } catch (err) {
      // A 401 is answered by the dashboard boundary's caution modal.
      if (err.status === 401) return
      if (err.status === 429) setIsRateLimited(true)
      showErrorToast(err.message, { id: 'delete-account-error' })
    } finally {
      setIsDeleting(false)
    }
  }

  /** Screen B — confirm the OTP and permanently delete the account. */
  const handleVerify = async (e) => {
    e.preventDefault()
    if (isDeleting) return

    const code = otp.trim()
    if (!/^\d{6}$/.test(code)) {
      setErrors({ otp: 'Enter the six-digit code sent to your email.' })
      formRef.current?.querySelector('#delete-account-otp')?.focus()
      showErrorToast('Enter the six-digit code sent to your email.', {
        id: 'delete-account-otp-validation',
      })
      return
    }

    setErrors({})
    setIsDeleting(true)

    try {
      await confirmAccountDeletion({ otp: code, verificationId })

      showSuccessToast('Your account has been permanently deleted.', {
        id: 'delete-account-success',
      })

      resetLocalState()
      onClose()

      // The backend already cleared the cookies; drop the client session
      // without another network call and return to the public site.
      clearSession()
      navigate('/', { replace: true })
    } catch (err) {
      if (err.status === 401) return
      // 400 — invalid, expired or wrong OTP. The verify screen stays open.
      setErrors({ otp: err.message })
      showErrorToast(err.message, { id: 'delete-account-otp-error' })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="DELETE ACCOUNT"
      labelledBy="delete-account-modal-title"
    >
      {/* Danger Eyebrow */}
      <p className="label-ui mt-3 text-[var(--color-danger)]">
        Permanent Action
      </p>

      {/* Warning Box */}
      <div className="mt-5 flex items-start gap-4 rounded-md border border-red-200 bg-red-50/60 p-4 sm:p-5">
        <span
          aria-hidden="true"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm bg-red-100 text-[var(--color-danger)]"
        >
          {isVerifyStep ? (
            <ShieldWarning size={24} weight="fill" />
          ) : (
            <WarningCircle size={24} weight="fill" />
          )}
        </span>

        <div>
          <h3 className="text-[0.9375rem] font-bold text-[var(--color-danger)]">
            This action is permanent and cannot be undone.
          </h3>
          <p className="mt-1 text-[0.8125rem] leading-relaxed text-slate-700">
            {isVerifyStep
              ? 'Entering the verification code will immediately and permanently delete your account, projects, uploaded files, generation history and profile data.'
              : 'Deleting your account will permanently wipe your workspace, all uploaded blueprints, generated 3D architectural renders, BoQ cost estimates, and profile information.'}
          </p>
        </div>
      </div>

      <form
        ref={formRef}
        onSubmit={isVerifyStep ? handleVerify : handleRequest}
        noValidate
        className="mt-6 space-y-4"
      >
        {!isVerifyStep && (
          <>
            <div>
              <label
                htmlFor="delete-confirm-input"
                className="block text-[0.8125rem] font-medium text-[var(--tone-muted-dark)]"
              >
                To confirm deletion, type <span className="font-bold text-[var(--color-danger)] select-none">DELETE</span> below:
              </label>
              <input
                id="delete-confirm-input"
                type="text"
                placeholder="Type DELETE"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                autoComplete="off"
                className="mt-2.5 block min-h-11 w-full rounded-sm border border-[var(--tone-line-strong)] bg-[var(--field-bg)] px-3.5 py-2.5 text-[0.9375rem] text-[var(--tone-ink)] outline-none transition-colors focus:border-[var(--color-danger)] focus:shadow-[0_0_0_3px_rgba(180,35,24,0.15)]"
              />
            </div>

            {/* The backend requires the account password before it will issue a
                deletion code. */}
            <div>
              <label
                htmlFor="delete-current-password"
                className="block text-[0.8125rem] font-medium text-[var(--tone-muted-dark)]"
              >
                Confirm your current password:
              </label>
              <div className="relative mt-2.5">
                <input
                  id="delete-current-password"
                  name="currentPassword"
                  type={showCurrentPassword ? 'text' : 'password'}
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value)
                    if (errors.currentPassword) {
                      setErrors((prev) => ({ ...prev, currentPassword: undefined }))
                    }
                  }}
                  autoComplete="current-password"
                  aria-invalid={errors.currentPassword ? 'true' : undefined}
                  aria-describedby={
                    errors.currentPassword ? 'delete-current-password-error' : undefined
                  }
                  className={cn(
                    'block min-h-11 w-full rounded-sm border bg-[var(--field-bg)] px-3.5 py-2.5 pr-11 text-[0.9375rem] text-[var(--tone-ink)] outline-none transition-colors',
                    errors.currentPassword
                      ? 'border-[var(--color-danger)]'
                      : 'border-[var(--tone-line-strong)]',
                    'focus:border-[var(--color-danger)] focus:shadow-[0_0_0_3px_rgba(180,35,24,0.15)]',
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword((prev) => !prev)}
                  tabIndex={-1}
                  aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex h-8 w-8 cursor-pointer items-center justify-center text-[var(--tone-muted-dark)] opacity-40 transition-all duration-200 hover:opacity-100 hover:text-[var(--tone-ink)]"
                >
                  {showCurrentPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.currentPassword && (
                <p id="delete-current-password-error" className="sr-only">
                  Error — {errors.currentPassword}
                </p>
              )}
            </div>
          </>
        )}

        {isVerifyStep && (
          <div>
            <label
              htmlFor="delete-account-otp"
              className="block text-[0.8125rem] font-medium text-[var(--tone-muted-dark)]"
            >
              Enter the six-digit verification code sent to your email:
            </label>
            <input
              id="delete-account-otp"
              name="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              value={otp}
              onChange={(e) => {
                setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))
                if (errors.otp) {
                  setErrors((prev) => ({ ...prev, otp: undefined }))
                }
              }}
              aria-invalid={errors.otp ? 'true' : undefined}
              aria-describedby={errors.otp ? 'delete-account-otp-error' : undefined}
              className={cn(
                'mt-2.5 block min-h-11 w-full rounded-sm border bg-[var(--field-bg)] px-3.5 py-2.5 text-center font-mono text-[1.25rem] font-bold tracking-[0.4em] text-[var(--tone-ink)] outline-none transition-colors',
                errors.otp ? 'border-[var(--color-danger)]' : 'border-[var(--tone-line-strong)]',
                'focus:border-[var(--color-danger)] focus:shadow-[0_0_0_3px_rgba(180,35,24,0.15)]',
              )}
            />
            {errors.otp && (
              <p id="delete-account-otp-error" className="sr-only">
                Error — {errors.otp}
              </p>
            )}

            <p className="mt-2.5 text-[0.75rem] leading-relaxed text-[var(--tone-muted)]">
              The code expires in 10 minutes. After five incorrect attempts you will
              need to start again.
            </p>

            <button
              type="button"
              onClick={() => {
                if (isDeleting) return
                clearVerificationId(VERIFICATION_KEYS.deleteAccount)
                resetLocalState()
              }}
              disabled={isDeleting}
              className="mt-3 inline-flex cursor-pointer items-center gap-1.5 text-[0.8125rem] font-semibold text-[var(--tone-muted-dark)] transition-opacity duration-150 hover:opacity-75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tone-accent)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ArrowLeft size={14} weight="bold" />
              <span>Start over with a new code</span>
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-[var(--tone-line)] pt-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <button
            type="button"
            onClick={handleClose}
            disabled={isDeleting}
            className="label-ui min-h-11 cursor-pointer px-1 text-[var(--tone-muted)] transition-colors duration-150 hover:text-[var(--tone-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tone-accent)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>

          <PrimaryButton
            type="submit"
            variant="danger"
            size="default"
            align="center"
            loading={isDeleting}
            loadingLabel={isVerifyStep ? 'Deleting Account...' : 'Sending Code...'}
            disabled={isVerifyStep ? false : !isConfirmed || isRateLimited}
            withArrow={false}
            className="w-full sm:w-auto min-w-48"
          >
            <span className="flex items-center justify-center gap-2">
              <Trash size={17} weight="bold" />
              <span>{isVerifyStep ? 'Confirm Deletion' : 'Delete Account'}</span>
            </span>
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  )
}
