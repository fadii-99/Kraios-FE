import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { EnvelopeSimple } from '@phosphor-icons/react'

import AuthShell from '@/components/ui/AuthShell'
import FormInput from '@/components/ui/FormInput'
import PrimaryButton from '@/components/ui/PrimaryButton'
import Modal from '@/components/ui/Modal'
import { isEmail } from '@/lib/validate'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState()
  const [touched, setTouched] = useState(false)
  const [status, setStatus] = useState('idle')
  const [open, setOpen] = useState(false)
  const inputRef = useRef(null)

  const check = (value) => {
    if (!value.trim()) return 'Enter the email address on your account.'
    if (!isEmail(value)) return 'That address looks incomplete — check for a missing @ or domain.'
    return undefined
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    const next = check(email)
    setError(next)
    setTouched(true)

    if (next) {
      inputRef.current?.querySelector('#email')?.focus()
      return
    }

    setStatus('submitting')
    // Frontend only — simulated. See PROGRESS.md.
    await new Promise((r) => setTimeout(r, 900))
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

      <Modal open={open} onClose={() => setOpen(false)} title="Email Sent">
        <div className="mt-7 flex items-start gap-5">
          <span
            aria-hidden="true"
            className="flex h-12 w-12 shrink-0 items-center justify-center border border-[var(--tone-accent)] text-[var(--tone-accent)]"
          >
            <EnvelopeSimple size={22} weight="light" />
          </span>

          <p className="text-[1rem] leading-relaxed text-[var(--tone-muted)]">
            Password recovery instructions have been sent to{' '}
            <span className="font-semibold text-[var(--tone-ink)]">{email}</span>. The link stays
            valid for 30 minutes.
          </p>
        </div>

        <div className="mt-9 flex justify-end">
          <PrimaryButton onClick={() => setOpen(false)} withArrow={false} align="center">
            Done
          </PrimaryButton>
        </div>
      </Modal>
    </>
  )
}
