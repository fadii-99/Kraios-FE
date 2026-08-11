import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarCheck } from '@phosphor-icons/react'

import AuthShell from '@/components/ui/AuthShell'
import FormInput from '@/components/ui/FormInput'
import PrimaryButton from '@/components/ui/PrimaryButton'
import Modal from '@/components/ui/Modal'
import CalendarPicker from '@/components/ui/CalendarPicker'
import { booking } from '@/lib/content'
import { isEmail } from '@/lib/validate'
import { cn } from '@/lib/cn'

const formatDate = (d) =>
  d?.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

/**
 * Booking rather than a password signup: the client wants contact details plus
 * a preferred date and time. No password fields by design.
 */
export default function Signup() {
  const [values, setValues] = useState({ name: '', email: '' })
  const [date, setDate] = useState(null)
  const [time, setTime] = useState(null)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [status, setStatus] = useState('idle')
  const [open, setOpen] = useState(false)
  const formRef = useRef(null)

  const validate = (v = values, d = date, t = time) => {
    const next = {}
    if (!v.name.trim()) next.name = 'Enter your full name.'
    if (!v.email.trim()) next.email = 'Enter an email address so we can confirm.'
    else if (!isEmail(v.email)) next.email = 'That address looks incomplete — check for a missing @ or domain.'
    if (!d) next.date = 'Choose a preferred date.'
    if (!t) next.time = 'Choose a preferred time.'
    return next
  }

  const setField = (key) => (e) => {
    const { value } = e.target
    setValues((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: validate({ ...values, [key]: value })[key] }))
    }
  }

  const onBlur = (key) => () => {
    setTouched((prev) => ({ ...prev, [key]: true }))
    setErrors((prev) => ({ ...prev, [key]: validate()[key] }))
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    const next = validate()
    setErrors(next)
    setTouched({ name: true, email: true, date: true, time: true })

    // text fields first, then the pickers
    const firstField = ['name', 'email'].find((k) => next[k])
    if (firstField) {
      formRef.current?.querySelector(`#${firstField}`)?.focus()
      return
    }
    if (next.date || next.time) {
      formRef.current?.querySelector('[data-scheduling]')?.scrollIntoView({ block: 'center' })
      return
    }

    setStatus('submitting')
    // Frontend only — no backend yet. See PROGRESS.md.
    await new Promise((r) => setTimeout(r, 900))
    setStatus('idle')
    setOpen(true)
  }

  const reset = () => {
    setOpen(false)
    setValues({ name: '', email: '' })
    setDate(null)
    setTime(null)
    setTouched({})
    setErrors({})
  }

  return (
    <>
      <AuthShell
        eyebrow="Book a Session"
        title="Sign Up"
        description="Share your details and pick a time that suits you. We will confirm by email and send a short brief to complete beforehand."
        width="max-w-3xl"
      >
        <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-10">
          <div className="grid gap-8 sm:grid-cols-2">
            <FormInput
              id="name"
              label="Full Name"
              autoComplete="name"
              placeholder="Elena Marchetti"
              required
              value={values.name}
              onChange={setField('name')}
              onBlur={onBlur('name')}
              error={touched.name ? errors.name : undefined}
            />

            <FormInput
              id="email"
              label="Email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@studio.com"
              required
              value={values.email}
              onChange={setField('email')}
              onBlur={onBlur('email')}
              error={touched.email ? errors.email : undefined}
            />
          </div>

          <div data-scheduling className="grid gap-10 lg:grid-cols-2 lg:gap-8">
            {/* ---- date ---- */}
            <div>
              <p className="label-mono text-[var(--tone-muted)]" id="date-label">
                Select Date
                <span className="ml-1 text-[var(--tone-accent)]" aria-hidden="true">
                  *
                </span>
              </p>

              <div className="mt-3">
                <CalendarPicker
                  value={date}
                  onSelect={(d) => {
                    setDate(d)
                    setErrors((prev) => ({ ...prev, date: undefined }))
                  }}
                />
              </div>

              {touched.date && errors.date && (
                <p role="alert" className="label-mono mt-3 text-[#E5484D]">
                  Error — {errors.date}
                </p>
              )}
            </div>

            {/* ---- time ---- */}
            <div>
              <p className="label-mono text-[var(--tone-muted)]" id="time-label">
                Select Time
                <span className="ml-1 text-[var(--tone-accent)]" aria-hidden="true">
                  *
                </span>
              </p>

              <div
                role="group"
                aria-labelledby="time-label"
                className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-2"
              >
                {booking.timeSlots.map((slot) => {
                  const selected = time === slot.value
                  return (
                    <button
                      key={slot.value}
                      type="button"
                      disabled={slot.disabled}
                      aria-pressed={selected}
                      onClick={() => {
                        setTime(slot.value)
                        setErrors((prev) => ({ ...prev, time: undefined }))
                      }}
                      className={cn(
                        'min-h-12 cursor-pointer border px-3 py-3 text-[0.9375rem] tabular-nums',
                        'transition-colors duration-200',
                        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tone-accent)]',
                        selected
                          ? 'border-[var(--tone-accent)] bg-[var(--tone-accent)] font-semibold text-white'
                          : 'border-[var(--tone-line-strong)] text-[var(--tone-ink)] hover:border-[var(--tone-accent)] hover:text-[var(--tone-accent)]',
                        slot.disabled &&
                          'cursor-not-allowed border-[var(--tone-line)] text-[var(--tone-muted)]/45 line-through hover:border-[var(--tone-line)] hover:text-[var(--tone-muted)]/45',
                      )}
                    >
                      {slot.label}
                    </button>
                  )
                })}
              </div>

              {touched.time && errors.time && (
                <p role="alert" className="label-mono mt-3 text-[#E5484D]">
                  Error — {errors.time}
                </p>
              )}

              {/* running summary of what has been chosen */}
              <div
                data-booking-summary
                aria-live="polite"
                className="mt-6 border-t border-[var(--tone-line)] pt-5 text-[0.9375rem] text-[var(--tone-muted)]"
              >
                {date || time ? (
                  <>
                    <span className="label-mono block text-[var(--tone-muted)]">Selected</span>
                    <span className="mt-2 block font-semibold text-[var(--tone-ink)]">
                      {date ? formatDate(date) : 'No date yet'}
                      {time ? ` · ${time}` : ''}
                    </span>
                  </>
                ) : (
                  <span className="label-mono">Nothing selected yet</span>
                )}
              </div>
            </div>
          </div>

          <PrimaryButton type="submit" loading={status === 'submitting'} className="w-full">
            Send Request
          </PrimaryButton>
        </form>

        <p className="mt-8 border-t border-[var(--tone-line)] pt-6 text-[0.9375rem] text-[var(--tone-muted)]">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-[var(--tone-ink)] underline underline-offset-4 transition-colors hover:text-[var(--tone-accent)]"
          >
            Log in
          </Link>
        </p>
      </AuthShell>

      <Modal open={open} onClose={reset} title="Request Received">
        <div className="mt-7 flex items-start gap-5">
          <span
            aria-hidden="true"
            className="flex h-12 w-12 shrink-0 items-center justify-center border border-[var(--tone-accent)] text-[var(--tone-accent)]"
          >
            <CalendarCheck size={22} weight="light" />
          </span>

          <div>
            <p className="text-[1rem] leading-relaxed text-[var(--tone-muted)]">
              Thank you. Our team will review your request and contact you shortly.
            </p>

            {date && time && (
              <p className="mt-4 border-t border-[var(--tone-line)] pt-4">
                <span className="label-mono block text-[var(--tone-muted)]">Requested slot</span>
                <span className="mt-2 block font-semibold text-[var(--tone-ink)]">
                  {formatDate(date)} · {time}
                </span>
              </p>
            )}
          </div>
        </div>

        <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Link
            to="/"
            className="label-mono inline-flex min-h-13 cursor-pointer items-center justify-center border border-[var(--tone-line-strong)] px-7 py-4 text-[var(--tone-ink)] transition-colors duration-300 hover:border-[var(--tone-accent)] hover:text-[var(--tone-accent)]"
          >
            Back Home
          </Link>

          <PrimaryButton onClick={reset} withArrow={false} align="center">
            Done
          </PrimaryButton>
        </div>
      </Modal>
    </>
  )
}
