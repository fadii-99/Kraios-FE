import { useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle } from '@phosphor-icons/react'

import AuthShell from '@/components/ui/AuthShell'
import FormInput from '@/components/ui/FormInput'
import PrimaryButton from '@/components/ui/PrimaryButton'
import Modal from '@/components/ui/Modal'
import { apiRequest, AUTH_ENDPOINTS } from '@/lib/api'
import { showErrorToast, showSuccessToast } from '@/lib/toast'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [status, setStatus] = useState('idle')
  const [open, setOpen] = useState(false)
  const formRef = useRef(null)

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
    console.log('[ResetPassword Page] 📝 Form submitted for password reset')
    console.log('[ResetPassword Page] 📋 Token:', token ? '[PRESENT]' : '[NONE]')

    const next = validate()
    setErrors(next)
    setTouched({ password: true, confirmPassword: true })

    const firstInvalid = ['password', 'confirmPassword'].find((k) => next[k])
    if (firstInvalid) {
      console.warn('[ResetPassword Page] ⚠️ Validation failed on field:', firstInvalid, next[firstInvalid])
      formRef.current?.querySelector(`#${firstInvalid}`)?.focus()
      showErrorToast(next[firstInvalid], { id: 'reset-password-validation' })
      return
    }

    console.log('[ResetPassword Page] 🚀 Form valid. Sending reset request to API...')
    setStatus('submitting')

    try {
      const response = await apiRequest(AUTH_ENDPOINTS.resetPassword, {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      })

      console.log('[ResetPassword Page] ✅ Password reset successful! Response:', response)
      setStatus('idle')
      setOpen(true)
      showSuccessToast('Password reset successfully!')
    } catch (err) {
      console.error('[ResetPassword Page] ❌ Password reset failed:', {
        message: err.message,
        status: err.status,
        data: err.data,
        error: err,
      })
      setStatus('idle')
      showErrorToast(
        err.message || 'Unable to reset password. The link may have expired or backend is unreachable.',
        { id: 'reset-password-api-error' },
      )
    }
  }

  return (
    <>
      <AuthShell
        eyebrow="Account Security"
        title="Reset Password"
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
          Remember your old password?{' '}
          <Link
            to="/login"
            className="text-[var(--tone-ink)] underline underline-offset-4 transition-colors hover:text-[var(--tone-accent)]"
          >
            Back to login
          </Link>
        </p>
      </AuthShell>

      <Modal open={open} onClose={() => navigate('/login')} title="Password Updated">
        <div className="mt-7 flex items-start gap-5">
          <span
            aria-hidden="true"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm border border-[var(--tone-accent)] text-[var(--tone-accent)]"
          >
            <CheckCircle size={22} weight="light" />
          </span>

          <p className="text-[1rem] leading-relaxed text-[var(--tone-muted)]">
            Your password has been successfully updated. You can now sign in with your new credentials.
          </p>
        </div>

        <div className="mt-9 flex justify-end">
          <PrimaryButton onClick={() => navigate('/login')} withArrow={false} align="center">
            Go to Login
          </PrimaryButton>
        </div>
      </Modal>
    </>
  )
}
