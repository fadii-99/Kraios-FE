import { useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { CheckCircle } from '@phosphor-icons/react'

import AuthShell from '@/components/ui/AuthShell'
import FormInput from '@/components/ui/FormInput'
import PrimaryButton from '@/components/ui/PrimaryButton'
import Modal from '@/components/ui/Modal'
import { FORGOT_PASSWORD_PATHS, dummyDelay } from '@/lib/auth/forgotPasswordFlow'
import { showErrorToast } from '@/lib/toast'

/**
 * Step 3 of the public recovery flow — the new password.
 *
 * DUMMY: nothing is saved. The success modal below says the password was
 * updated because that is what this screen will say once the endpoint exists;
 * until then it is reached only from the simulated verify step, and no account
 * is touched. See `@/lib/auth/forgotPasswordFlow`.
 *
 * Distinct from `/reset-password`, which is the REAL token-linked page calling
 * `POST /auth/reset-password/`. That one is untouched by this flow.
 */
export default function ForgotPasswordReset() {
  const navigate = useNavigate()
  const location = useLocation()
  const verified = Boolean(location.state?.verified)

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [status, setStatus] = useState('idle')
  const [open, setOpen] = useState(false)
  const formRef = useRef(null)

  // The code has to have been accepted first. A direct visit carries no such
  // mark, so it starts the flow over rather than setting a password on an
  // address nobody verified.
  if (!verified) {
    return <Navigate to={FORGOT_PASSWORD_PATHS.email} replace />
  }

  const validate = () => {
    const next = {}
    if (!password) {
      next.password = 'Enter a new password.'
    } else if (password.length < 8) {
      next.password = 'Password must be at least 8 characters long.'
    }

    if (!confirmPassword) {
      next.confirmPassword = 'Confirm your new password.'
    } else if (confirmPassword !== password) {
      next.confirmPassword = 'Passwords do not match.'
    }
    return next
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (status === 'submitting') return

    const next = validate()
    setErrors(next)
    setTouched({ password: true, confirmPassword: true })

    /*
     * One toast per submit, chosen by declared field order; the fields keep
     * their invalid border and `aria-invalid`.
     */
    const firstInvalid = ['password', 'confirmPassword'].find((key) => next[key])
    if (firstInvalid) {
      formRef.current?.querySelector(`#${firstInvalid}`)?.focus()
      showErrorToast(next[firstInvalid], { id: 'forgot-password-reset-validation' })
      return
    }

    setStatus('submitting')
    await dummyDelay()
    setStatus('idle')
    setOpen(true)
  }

  return (
    <>
      <AuthShell
        eyebrow="Account Recovery"
        title="New Password"
        description="Create a strong new password for your Kraios account."
      >
        <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-8">
          <FormInput
            id="password"
            label="New Password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            required
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              if (errors.password) setErrors(validate())
            }}
            onBlur={() => {
              setTouched((prev) => ({ ...prev, password: true }))
              setErrors(validate())
            }}
            error={touched.password ? errors.password : undefined}
          />

          <FormInput
            id="confirmPassword"
            label="Confirm Password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            required
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value)
              if (errors.confirmPassword) setErrors(validate())
            }}
            onBlur={() => {
              setTouched((prev) => ({ ...prev, confirmPassword: true }))
              setErrors(validate())
            }}
            error={touched.confirmPassword ? errors.confirmPassword : undefined}
          />

          <PrimaryButton type="submit" loading={status === 'submitting'} className="w-full">
            Update Password
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

      <Modal
        open={open}
        onClose={() => navigate('/login', { replace: true })}
        title="Password Updated"
      >
        <div className="mt-7 flex items-start gap-5">
          <span
            aria-hidden="true"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm border border-[var(--tone-accent)] text-[var(--tone-accent)]"
          >
            <CheckCircle size={22} weight="light" />
          </span>

          <p className="text-[1rem] leading-relaxed text-[var(--tone-muted)]">
            Your password has been successfully updated. You can now sign in with your new
            credentials.
          </p>
        </div>

        <div className="mt-9 flex justify-end">
          <PrimaryButton
            onClick={() => navigate('/login', { replace: true })}
            withArrow={false}
            align="center"
          >
            Go to Login
          </PrimaryButton>
        </div>
      </Modal>
    </>
  )
}
