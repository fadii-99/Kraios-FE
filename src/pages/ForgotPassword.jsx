import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { EnvelopeSimple } from '@phosphor-icons/react'

import AuthShell from '@/components/ui/AuthShell'
import FormInput from '@/components/ui/FormInput'
import PrimaryButton from '@/components/ui/PrimaryButton'
import Modal from '@/components/ui/Modal'
import { FORGOT_PASSWORD_PATHS, OTP_LENGTH, dummyDelay } from '@/lib/auth/forgotPasswordFlow'
import { showErrorToast } from '@/lib/toast'
import { isEmail } from '@/lib/validate'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')

  const [error, setError] = useState()
  const [touched, setTouched] = useState(false)
  const [status, setStatus] = useState('idle')
  const [open, setOpen] = useState(false)
  const inputRef = useRef(null)

  const check = (value) => {
    if (!value.trim()) return 'Enter your email address.'
    if (!isEmail(value)) return 'Enter a valid email address.'
    return undefined
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    // console.log('[ForgotPassword Page] 📝 Form submitted for password reset')
    // console.log('[ForgotPassword Page] 📋 Email entered:', email)

    const next = check(email)
    setError(next)
    setTouched(true)

    /*
     * The field keeps its invalid border and `aria-invalid`; the copy is a
     * toast, raised only here — never while the user types.
     */
    if (next) {
      // console.warn('[ForgotPassword Page] ⚠️ Validation failed for email:', email, next)
      inputRef.current?.querySelector('#email')?.focus()
      showErrorToast(next, { id: 'forgot-password-validation' })
      return
    }

    setStatus('submitting')
    // DUMMY: the API contract has no endpoint that starts a recovery, so
    // nothing is sent. The pretending is declared in ONE place —
    // @/lib/auth/forgotPasswordFlow.
    await dummyDelay()
    setStatus('idle')
    setOpen(true)
  }



  return (
    <>
      <AuthShell
        eyebrow="Account Recovery"
        title="Forgot Password"
        description="Enter the email address on your account and we will send a link to reset your password."
      >
        <form ref={inputRef} onSubmit={onSubmit} noValidate className="space-y-8">
          <FormInput
            id="email"
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@firm.com"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (error) setError(check(e.target.value))
            }}
            onBlur={() => {
              setTouched(true)
              setError(check(email))
            }}
            error={touched ? error : undefined}
          />

          <PrimaryButton type="submit" loading={status === 'submitting'} className="w-full">
            Send Reset Link
          </PrimaryButton>
        </form>

        <p className="mt-8 border-t border-[var(--tone-line)] pt-6 text-[0.9375rem] text-[var(--tone-muted)]">
          Remembered it?{' '}
          <Link
            to="/login"
            className="text-[var(--tone-ink)] underline underline-offset-4 transition-colors hover:text-[var(--tone-accent)]"
          >
            Back to login
          </Link>
        </p>
      </AuthShell>

      <Modal open={open} onClose={() => setOpen(false)} title="Code Sent">
        <div className="mt-7 flex items-start gap-5">
          <span
            aria-hidden="true"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm border border-[var(--tone-accent)] text-[var(--tone-accent)]"
          >
            <EnvelopeSimple size={22} weight="light" />
          </span>

          <p className="text-[1rem] leading-relaxed text-[var(--tone-muted)]">
            A {OTP_LENGTH}-digit verification code has been sent to{' '}
            <span className="font-semibold text-[var(--tone-ink)]">{email}</span>. The code stays
            valid for 10 minutes.
          </p>
        </div>

        <div className="mt-9 flex justify-end">
          {/* Continues into step 2, carrying the address the code was "sent"
              to — the verify screen has nothing to show without it. */}
          <PrimaryButton
            onClick={() => navigate(FORGOT_PASSWORD_PATHS.verify, { state: { email } })}
            withArrow={false}
            align="center"
          >
            Enter Code
          </PrimaryButton>
        </div>
      </Modal>
    </>
  )
}
