import { useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import AuthShell from '@/components/ui/AuthShell'
import FormInput from '@/components/ui/FormInput'
import PrimaryButton from '@/components/ui/PrimaryButton'
import { useAuth } from '@/contexts/AuthContext'
import { showErrorToast } from '@/lib/toast'
import { isEmail } from '@/lib/validate'

const EMPTY = { email: '', password: '' }

/** Submit order — also the order the one validation toast picks from. */
const FIELD_ORDER = ['email', 'password']

function validate(values) {
  const errors = {}

  if (!values.email.trim()) {
    errors.email = 'Enter your email address.'
  } else if (!isEmail(values.email)) {
    errors.email = 'Enter a valid email address.'
  }

  if (!values.password) {
    errors.password = 'Enter your password.'
  }

  return errors
}

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [status, setStatus] = useState('idle')
  const formRef = useRef(null)

  /*
   * Where to land after signing in. The dashboard boundary does not redirect an
   * unauthenticated visitor — it answers in place — so the address they asked
   * for is still known, and its caution modal hands it here in router state.
   * Anything else (a direct visit to /login) goes to the dashboard root.
   */
  const from =
    typeof location.state?.from === 'string' && location.state.from.startsWith('/dashboard')
      ? location.state.from
      : '/dashboard'

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
    if (status === 'submitting') return

    // console.log('[Login Page] 📝 Login form submit triggered')

    // console.log('[Login Page] 📋 Form Values (Sanitized):', {
    //   email: values.email,
    //   password: values.password ? '••••••••' : '(empty)',
    // })

    const next = validate(values)
    setErrors(next)
    setTouched({ email: true, password: true })

    /*
     * ONE toast per invalid submit, for the first field in reading order — the
     * field keeps the red border and `aria-invalid` that says which one it is,
     * so three simultaneous notifications would only bury each other.
     */
    const firstInvalid = FIELD_ORDER.find((k) => next[k])
    if (firstInvalid) {
      // console.warn('[Login Page] ⚠️ Validation failed on field:', firstInvalid, next[firstInvalid])
      formRef.current?.querySelector(`#${firstInvalid}`)?.focus()
      showErrorToast(next[firstInvalid], { id: 'login-validation' })
      return
    }

    // console.log('[Login Page] 🚀 Validation passed. Dispatching login request to AuthContext...')
    setStatus('submitting')

    try {
      await login({
        email: values.email.trim(),
        password: values.password,
      })

      // Replace, so Back does not walk into the login form of a session that
      // is now signed in.
      navigate(from, { replace: true })
    } catch (err) {
      // console.error('[Login Page] ❌ Login failed with error:', {
      //   message: err.message,
      //   status: err.status,
      //   data: err.data,
      // })
      showErrorToast(
        err.message || 'Unable to sign in. Please try again.',
        { id: 'login-error' },
      )
    } finally {
      setStatus('idle')
    }
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
