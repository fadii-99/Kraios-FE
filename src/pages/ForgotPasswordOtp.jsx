import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft } from '@phosphor-icons/react'

import AuthShell from '@/components/ui/AuthShell'
import PrimaryButton from '@/components/ui/PrimaryButton'
import { cn } from '@/lib/cn'
import {
  FORGOT_PASSWORD_PATHS,
  OTP_LENGTH,
  RESEND_COOLDOWN_SECONDS,
  dummyDelay,
  maskEmail,
} from '@/lib/auth/forgotPasswordFlow'
import { showErrorToast, showInfoToast } from '@/lib/toast'

/**
 * Step 2 of the public recovery flow — the verification code.
 *
 * DUMMY: no code was mailed and none is checked. Any six digits pass. See
 * `@/lib/auth/forgotPasswordFlow` for why, and for the one place the pretending
 * is declared.
 *
 * The field follows the code input the Profile's Reset Password modal already
 * uses — one box, monospace, wide tracking — rather than a second style of
 * one-time-code control.
 */
export default function ForgotPasswordOtp() {
  const navigate = useNavigate()
  const location = useLocation()
  const email = location.state?.email || ''

  const [otp, setOtp] = useState('')
  const [error, setError] = useState()
  const [touched, setTouched] = useState(false)
  const [status, setStatus] = useState('idle')
  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS)
  const formRef = useRef(null)

  /*
   * The resend cooldown. One interval, cleared on unmount and whenever it
   * reaches zero, so nothing keeps ticking behind a navigation.
   */
  useEffect(() => {
    if (secondsLeft <= 0) return undefined

    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1))
    }, 1000)

    return () => clearInterval(timer)
  }, [secondsLeft])

  // Step 2 is reached from step 1 and nowhere else. Opening it directly has no
  // address to verify against, so it returns to the start of the flow.
  if (!email) {
    return <Navigate to={FORGOT_PASSWORD_PATHS.email} replace />
  }

  const check = (value) => {
    if (!value.trim()) return `Enter the ${OTP_LENGTH}-digit verification code.`
    if (value.length < OTP_LENGTH) return `The code is ${OTP_LENGTH} digits long.`
    return undefined
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (status === 'submitting') return

    const next = check(otp)
    setError(next)
    setTouched(true)

    /*
     * The field keeps its invalid border and `aria-invalid`; the copy is a
     * toast, raised only here — never while the user types.
     */
    if (next) {
      formRef.current?.querySelector('#otp')?.focus()
      showErrorToast(next, { id: 'forgot-password-otp-validation' })
      return
    }

    setStatus('submitting')
    await dummyDelay()
    setStatus('idle')

    // Step 3 is told the code was accepted; without that mark it sends the user
    // back here rather than letting a password be set on an unverified address.
    navigate(FORGOT_PASSWORD_PATHS.reset, {
      state: { email, verified: true },
      replace: true,
    })
  }

  const onResend = () => {
    if (secondsLeft > 0 || status !== 'idle') return

    setOtp('')
    setError(undefined)
    setTouched(false)
    setSecondsLeft(RESEND_COOLDOWN_SECONDS)
    formRef.current?.querySelector('#otp')?.focus()

    showInfoToast('A new verification code has been sent.', {
      id: 'forgot-password-otp-resent',
    })
  }

  return (
    <AuthShell
      eyebrow="Account Recovery"
      title="Verify Code"
      description={`Enter the ${OTP_LENGTH}-digit verification code we sent to your email address.`}
    >
      <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-8">
        <div className="group">
          <label
            htmlFor="otp"
            className="label-ui block text-[var(--tone-muted)] transition-colors duration-300 group-focus-within:text-[var(--tone-accent)]"
          >
            Verification Code
            <span className="ml-1 text-[var(--tone-accent)]" aria-hidden="true">
              *
            </span>
          </label>

          <input
            id="otp"
            name="otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={OTP_LENGTH}
            placeholder="000000"
            required
            autoFocus
            value={otp}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH)
              setOtp(digits)
              if (error) setError(check(digits))
            }}
            onBlur={() => {
              setTouched(true)
              setError(check(otp))
            }}
            aria-invalid={touched && error ? 'true' : undefined}
            aria-describedby={touched && error ? 'otp-error' : undefined}
            className={cn(
              'mt-3 block min-h-12 w-full rounded-sm border bg-[var(--field-bg)] px-4 py-3.5',
              'text-center font-mono text-[1.375rem] font-bold tracking-[0.4em]',
              'text-[var(--tone-ink)] placeholder:text-[var(--tone-muted)]/55',
              'outline-none transition-[border-color,box-shadow] duration-300 focus-visible:outline-none',
              touched && error
                ? 'border-[#E5484D] focus:border-[#E5484D]'
                : [
                    'border-[var(--tone-line-strong)] hover:border-[var(--tone-muted)]',
                    'focus:border-[var(--tone-accent)]',
                    'focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--tone-accent)_16%,transparent)]',
                  ].join(' '),
            )}
          />

          {touched && error && (
            <p id="otp-error" className="sr-only">
              Error — {error}
            </p>
          )}

          <p className="mt-3.5 text-[0.8125rem] leading-relaxed text-[var(--tone-muted)]">
            Sent to{' '}
            <span className="font-semibold text-[var(--tone-ink)]">{maskEmail(email)}</span>. The
            code expires in 10 minutes.
          </p>

          <div className="mt-3.5 flex justify-end">
            {secondsLeft > 0 ? (
              <span className="label-ui text-[var(--tone-muted)]">
                Resend in {secondsLeft}s
              </span>
            ) : (
              <button
                type="button"
                onClick={onResend}
                className="label-ui cursor-pointer text-[var(--tone-accent)] underline-offset-4 transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tone-accent)]"
              >
                Resend Code
              </button>
            )}
          </div>
        </div>

        <PrimaryButton type="submit" loading={status === 'submitting'} className="w-full">
          Verify Code
        </PrimaryButton>
      </form>

      <p className="mt-8 flex flex-wrap items-center gap-x-2 gap-y-2 border-t border-[var(--tone-line)] pt-6 text-[0.9375rem] text-[var(--tone-muted)]">
        <Link
          to={FORGOT_PASSWORD_PATHS.email}
          className="inline-flex items-center gap-1.5 text-[var(--tone-ink)] underline underline-offset-4 transition-colors hover:text-[var(--tone-accent)]"
        >
          <ArrowLeft size={14} weight="bold" />
          Use a different email
        </Link>
      </p>
    </AuthShell>
  )
}
