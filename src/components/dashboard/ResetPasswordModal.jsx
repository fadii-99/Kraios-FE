import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, EyeSlash, Key, ShieldCheck } from '@phosphor-icons/react'
import Modal from '@/components/ui/Modal'
import PrimaryButton from '@/components/ui/PrimaryButton'
import { useAuth } from '@/contexts/AuthContext'
import {
  VERIFICATION_KEYS,
  clearVerificationId,
  confirmPasswordChange,
  readVerificationId,
  requestPasswordChange,
} from '@/lib/api'
import { showErrorToast, showInfoToast, showSuccessToast } from '@/lib/toast'
import { cn } from '@/lib/cn'

/**
 * ResetPasswordModal — the authenticated CHANGE PASSWORD flow.
 *
 * Two screens inside one dialog, matching the backend contract:
 *   A. credentials — current + new password;
 *      POST /profile/password-change/request/ answers 202 with a
 *      verification_id and mails a six-digit OTP
 *   B. verify      — the OTP; POST /profile/password-change/confirm/
 *
 * This is NOT the public "forgot password" flow: the current password is
 * required. Once screen A succeeds neither password is kept anywhere — only the
 * verification id travels to screen B, and it expires in 10 minutes.
 *
 * On success the backend revokes the session and clears the cookies, so the
 * client session is dropped and the user is returned to /login.
 */
export default function ResetPasswordModal({ open, onClose }) {
  const formRef = useRef(null)
  const navigate = useNavigate()
  const { clearSession } = useAuth()

  // 'credentials' -> 'verify'
  const [step, setStep] = useState('credentials')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [otp, setOtp] = useState('')

  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  // Set on HTTP 429. OTP requests are capped at five per hour per user, so the
  // request control is disabled rather than left to fail again.
  const [isRateLimited, setIsRateLimited] = useState(false)
  const [verificationId, setVerificationId] = useState('')

  const fieldClass = (invalid) =>
    cn(
      'block min-h-12 w-full rounded-sm border bg-[var(--field-bg)] px-4 py-3.5 pr-11 text-[1rem]',
      'text-[var(--tone-ink)] placeholder:text-[var(--tone-muted)]/55',
      'outline-none transition-[border-color,box-shadow] duration-300 focus-visible:outline-none',
      invalid
        ? 'border-[#E5484D] focus:border-[#E5484D]'
        : 'border-[var(--tone-line-strong)] hover:border-[var(--tone-muted)] focus:border-[var(--tone-accent)] focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--tone-accent)_16%,transparent)]',
    )

  const resetLocalState = () => {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setOtp('')
    setErrors({})
    setVerificationId('')
    setStep('credentials')
  }

  const handleClose = () => {
    if (isSubmitting) return
    // An abandoned verification leaves nothing behind; the next attempt makes a
    // fresh request, which invalidates any previous OTP anyway.
    clearVerificationId(VERIFICATION_KEYS.passwordChange)
    resetLocalState()
    onClose()
  }

  /** Screen A — request the OTP. */
  const handleRequestSubmit = async (e) => {
    e.preventDefault()
    if (isSubmitting) return

    const nextErrors = {}

    if (!currentPassword.trim()) {
      nextErrors.currentPassword = 'Enter your current password.'
    }

    if (!newPassword.trim()) {
      nextErrors.newPassword = 'Enter a new password.'
    } else if (newPassword.length < 8) {
      nextErrors.newPassword = 'Password must be at least 8 characters long.'
    }

    if (!confirmPassword.trim()) {
      nextErrors.confirmPassword = 'Confirm your new password.'
    } else if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match.'
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      const firstKey = Object.keys(nextErrors)[0]
      const inputMap = {
        currentPassword: 'reset-current-password',
        newPassword: 'reset-new-password',
        confirmPassword: 'reset-confirm-password',
      }
      formRef.current?.querySelector(`#${inputMap[firstKey]}`)?.focus()
      showErrorToast(nextErrors[firstKey], { id: 'reset-password-validation' })
      return
    }

    setErrors({})
    setIsSubmitting(true)

    try {
      const result = await requestPasswordChange({ currentPassword, newPassword })

      setVerificationId(
        result?.verification_id ||
          readVerificationId(VERIFICATION_KEYS.passwordChange) ||
          '',
      )

      // Neither password survives a successful request.
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setStep('verify')

      showInfoToast(
        result?.detail || 'A verification code has been sent to your email.',
        { id: 'reset-password-otp-sent' },
      )
    } catch (err) {
      // A 401 is answered by the dashboard boundary's caution modal; one event
      // must not also raise a toast.
      if (err.status === 401) return
      if (err.status === 429) setIsRateLimited(true)
      showErrorToast(err.message, { id: 'reset-password-error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  /** Screen B — confirm the OTP. */
  const handleVerifySubmit = async (e) => {
    e.preventDefault()
    if (isSubmitting) return

    const code = otp.trim()
    if (!/^\d{6}$/.test(code)) {
      setErrors({ otp: 'Enter the six-digit code sent to your email.' })
      formRef.current?.querySelector('#reset-password-otp')?.focus()
      showErrorToast('Enter the six-digit code sent to your email.', {
        id: 'reset-password-otp-validation',
      })
      return
    }

    setErrors({})
    setIsSubmitting(true)

    try {
      await confirmPasswordChange({ otp: code, verificationId })

      showSuccessToast('Password changed successfully. Please log in again.', {
        id: 'reset-password-success',
      })

      resetLocalState()
      onClose()

      // The backend already revoked the session and cleared the cookies, so the
      // client session is dropped without another network call. Both updates
      // batch with the navigation, so the dashboard never renders in the
      // anonymous state on the way out.
      clearSession()
      navigate('/login', { replace: true })
    } catch (err) {
      if (err.status === 401) return
      // 400 — invalid, expired or wrong OTP. The verify screen stays open.
      setErrors({ otp: err.message })
      showErrorToast(err.message, { id: 'reset-password-otp-error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const isVerifyStep = step === 'verify'

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="RESET PASSWORD"
      labelledBy="reset-password-modal-title"
    >
      <div className="mt-3 flex items-center gap-2 text-[0.9375rem] text-[var(--tone-muted)]">
        {isVerifyStep ? (
          <>
            <ShieldCheck
              size={18}
              weight="duotone"
              className="shrink-0 text-[var(--color-brand-deep)]"
            />
            <span>Enter the six-digit verification code sent to your email.</span>
          </>
        ) : (
          <>
            <Key size={18} weight="duotone" className="shrink-0 text-[var(--color-brand-deep)]" />
            <span>Enter your current password and choose a new password.</span>
          </>
        )}
      </div>

      <form
        ref={formRef}
        onSubmit={isVerifyStep ? handleVerifySubmit : handleRequestSubmit}
        noValidate
        className="mt-7 space-y-5"
      >
        {!isVerifyStep && (
          <>
            {/* 1. Current Password Field */}
            <div className="group">
              <label
                htmlFor="reset-current-password"
                className="label-ui block text-[var(--tone-muted)] transition-colors duration-300 group-focus-within:text-[var(--tone-accent)]"
              >
                Current Password
                <span className="ml-1 text-[var(--tone-accent)]" aria-hidden="true">
                  *
                </span>
              </label>
              <div className="relative mt-3">
                <input
                  id="reset-current-password"
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
                  required
                  autoComplete="current-password"
                  aria-invalid={errors.currentPassword ? 'true' : undefined}
                  aria-describedby={
                    errors.currentPassword ? 'reset-current-password-error' : undefined
                  }
                  className={fieldClass(Boolean(errors.currentPassword))}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword((prev) => !prev)}
                  tabIndex={-1}
                  aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center cursor-pointer text-[var(--tone-muted-dark)] opacity-40 transition-all duration-200 hover:opacity-100 hover:text-[var(--tone-ink)]"
                >
                  {showCurrentPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.currentPassword && (
                <p id="reset-current-password-error" className="sr-only">
                  Error — {errors.currentPassword}
                </p>
              )}
            </div>

            {/* 2. New Password Field */}
            <div className="group">
              <label
                htmlFor="reset-new-password"
                className="label-ui block text-[var(--tone-muted)] transition-colors duration-300 group-focus-within:text-[var(--tone-accent)]"
              >
                New Password
                <span className="ml-1 text-[var(--tone-accent)]" aria-hidden="true">
                  *
                </span>
              </label>
              <div className="relative mt-3">
                <input
                  id="reset-new-password"
                  name="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="At least 8 characters"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value)
                    if (errors.newPassword) {
                      setErrors((prev) => ({ ...prev, newPassword: undefined }))
                    }
                  }}
                  required
                  autoComplete="new-password"
                  aria-invalid={errors.newPassword ? 'true' : undefined}
                  aria-describedby={errors.newPassword ? 'reset-new-password-error' : undefined}
                  className={fieldClass(Boolean(errors.newPassword))}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  tabIndex={-1}
                  aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center cursor-pointer text-[var(--tone-muted-dark)] opacity-40 transition-all duration-200 hover:opacity-100 hover:text-[var(--tone-ink)]"
                >
                  {showNewPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.newPassword && (
                <p id="reset-new-password-error" className="sr-only">
                  Error — {errors.newPassword}
                </p>
              )}
            </div>

            {/* 3. Confirm Password Field */}
            <div className="group">
              <label
                htmlFor="reset-confirm-password"
                className="label-ui block text-[var(--tone-muted)] transition-colors duration-300 group-focus-within:text-[var(--tone-accent)]"
              >
                Confirm New Password
                <span className="ml-1 text-[var(--tone-accent)]" aria-hidden="true">
                  *
                </span>
              </label>
              <div className="relative mt-3">
                <input
                  id="reset-confirm-password"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-enter your new password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value)
                    if (errors.confirmPassword) {
                      setErrors((prev) => ({ ...prev, confirmPassword: undefined }))
                    }
                  }}
                  required
                  autoComplete="new-password"
                  aria-invalid={errors.confirmPassword ? 'true' : undefined}
                  aria-describedby={
                    errors.confirmPassword ? 'reset-confirm-password-error' : undefined
                  }
                  className={fieldClass(Boolean(errors.confirmPassword))}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  tabIndex={-1}
                  aria-label={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center cursor-pointer text-[var(--tone-muted-dark)] opacity-40 transition-all duration-200 hover:opacity-100 hover:text-[var(--tone-ink)]"
                >
                  {showConfirmPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p id="reset-confirm-password-error" className="sr-only">
                  Error — {errors.confirmPassword}
                </p>
              )}
            </div>
          </>
        )}

        {/* Verification step — the six-digit code mailed by the request above */}
        {isVerifyStep && (
          <div className="group">
            <label
              htmlFor="reset-password-otp"
              className="label-ui block text-[var(--tone-muted)] transition-colors duration-300 group-focus-within:text-[var(--tone-accent)]"
            >
              Verification Code
              <span className="ml-1 text-[var(--tone-accent)]" aria-hidden="true">
                *
              </span>
            </label>
            <div className="relative mt-3">
              <input
                id="reset-password-otp"
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
                required
                aria-invalid={errors.otp ? 'true' : undefined}
                aria-describedby={errors.otp ? 'reset-password-otp-error' : undefined}
                className={cn(
                  fieldClass(Boolean(errors.otp)),
                  'pr-4 text-center font-mono text-[1.375rem] font-bold tracking-[0.4em]',
                )}
              />
            </div>
            {errors.otp && (
              <p id="reset-password-otp-error" className="sr-only">
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
                if (isSubmitting) return
                clearVerificationId(VERIFICATION_KEYS.passwordChange)
                resetLocalState()
              }}
              disabled={isSubmitting}
              className="mt-3 inline-flex cursor-pointer items-center gap-1.5 text-[0.8125rem] font-semibold text-[var(--color-brand-deep)] transition-opacity duration-150 hover:opacity-75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tone-accent)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ArrowLeft size={14} weight="bold" />
              <span>Start over with a new code</span>
            </button>
          </div>
        )}

        {/* Action Controls */}
        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-[var(--tone-line)] pt-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="label-ui min-h-11 cursor-pointer px-1 text-[var(--tone-muted)] transition-colors duration-150 hover:text-[var(--tone-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tone-accent)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>

          <PrimaryButton
            type="submit"
            size="default"
            align="center"
            loading={isSubmitting}
            loadingLabel={isVerifyStep ? 'Verifying...' : 'Sending Code...'}
            disabled={!isVerifyStep && isRateLimited}
            withArrow={false}
            className="w-full sm:w-auto min-w-44 shadow-[0_4px_16px_rgba(11,94,215,0.22)]"
          >
            {isVerifyStep ? 'Verify & Update' : 'Update Password'}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  )
}
