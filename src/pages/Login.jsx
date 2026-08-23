import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import AuthShell from '@/components/ui/AuthShell'
import FormInput from '@/components/ui/FormInput'
import PrimaryButton from '@/components/ui/PrimaryButton'
import { isEmail } from '@/lib/validate'

const EMPTY = { email: '', password: '' }

function validate(values) {
  const errors = {}

  if (!values.email.trim()) errors.email = 'Enter the email address on your account.'
  else if (!isEmail(values.email)) errors.email = 'That address looks incomplete — check for a missing @ or domain.'

  if (!values.password) errors.password = 'Enter your password.'

  return errors
}

export default function Login() {
  const navigate = useNavigate()
  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [status, setStatus] = useState('idle')
  const formRef = useRef(null)

  const setField = (key) => (e) => {
    const { value } = e.target
    setValues((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) {
      const next = validate({ ...values, [key]: value })
      setErrors((prev) => ({ ...prev, [key]: next[key] }))
    }
  }

  const onBlur = (key) => () => {
    setTouched((prev) => ({ ...prev, [key]: true }))
    setErrors((prev) => ({ ...prev, [key]: validate(values)[key] }))
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    const next = validate(values)
    setErrors(next)
    setTouched({ email: true, password: true })

    const firstInvalid = ['email', 'password'].find((k) => next[k])
    if (firstInvalid) {
      formRef.current?.querySelector(`#${firstInvalid}`)?.focus()
      return
    }

    setStatus('submitting')
    // Frontend only — simulated login. Navigates to dashboard workspace.
    await new Promise((r) => setTimeout(r, 900))
    setStatus('idle')
    navigate('/dashboard')
  }

  return (
    <AuthShell
      eyebrow="Welcome Back"
      title="Login"
      description="Sign in to your Kraios account to pick up a project, refine your 3D model and export your BoQ."
    >
      <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-8">
        <FormInput
          id="email"
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@firm.com"
          required
          value={values.email}
          onChange={setField('email')}
          onBlur={onBlur('email')}
          error={touched.email ? errors.email : undefined}
        />

        <div>
          <FormInput
            id="password"
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            required
            value={values.password}
            onChange={setField('password')}
            onBlur={onBlur('password')}
            error={touched.password ? errors.password : undefined}
          />

          <div className="mt-3.5 flex justify-end">
            <Link
              to="/forgot-password"
              className="label-ui text-[var(--tone-accent)] underline-offset-4 transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tone-accent)]"
            >
              Forgot Password
            </Link>
          </div>
        </div>

        <PrimaryButton type="submit" loading={status === 'submitting'} className="w-full">
          Login
        </PrimaryButton>
      </form>

      <p className="mt-8 border-t border-[var(--tone-line)] pt-6 text-[0.9375rem] text-[var(--tone-muted)]">
        Don’t have an account yet?{' '}
        <Link
          to="/signup"
          className="text-[var(--tone-ink)] underline underline-offset-4 transition-colors hover:text-[var(--tone-accent)]"
        >
          Sign Up
        </Link>
      </p>
    </AuthShell>
  )
}
