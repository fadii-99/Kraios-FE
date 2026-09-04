import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarCheck } from '@phosphor-icons/react'

import AuthShell from '@/components/ui/AuthShell'
import FormInput from '@/components/ui/FormInput'
import CountryDropdown from '@/components/ui/CountryDropdown'
import PrimaryButton from '@/components/ui/PrimaryButton'
import Modal from '@/components/ui/Modal'
import CalendarPicker from '@/components/ui/CalendarPicker'
import { useAuth } from '@/contexts/AuthContext'
import { fetchBookingDays, fetchBookingSlots, toMonthKey } from '@/lib/api'
import { toISODate } from '@/lib/date'
import { showErrorToast } from '@/lib/toast'
import { isEmail } from '@/lib/validate'
import { cn } from '@/lib/cn'

const formatDisplayDate = (d) =>
  d?.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

/** `YYYY-MM-DD` as a LOCAL midnight Date — `new Date('…')` would parse it UTC. */
const fromISODate = (iso) => {
  if (!iso) return null
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * Account signup + session booking in one step: firm details plus a date and
 * time for the platform walkthrough.
 *
 * THE CALENDAR IS NOT THIS PAGE'S. Both the open dates and the times on them
 * come from `/auth/booking/…`, which is the availability an administrator set
 * in the console — a weekly pattern plus blackout dates, minus whatever is
 * already booked. This page renders that answer and submits one of its labels
 * back; it never decides what is bookable, and it must never carry a fallback
 * list of times, because a fallback is a promise of a slot nobody can take.
 *
 * The two requests it makes are public reads on a public route (§9): no
 * session, no `/auth/me/`, and no refresh attempt on a 401.
 */
export default function Signup() {
  const { signup } = useAuth()
  const [values, setValues] = useState({ name: '', firm: '', email: '', country: '' })
  const [date, setDate] = useState(null)
  const [time, setTime] = useState(null)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [status, setStatus] = useState('idle')
  const [open, setOpen] = useState(false)
  const formRef = useRef(null)

  // --- the administrator's availability -----------------------------------
  //
  // Both lists are stored WITH the key they answer — `days-2026-09#0`,
  // `slots-2026-09-07#0` — and "loading" is the key on screen not matching the
  // key in state. That is what makes a stale answer unrenderable: a reply for
  // last month's key can land late and it still is not the current key, so it
  // is never shown. It also keeps every write inside a promise callback, which
  // is the only place an effect may set state.
  //
  // The nonce in each key exists to re-ask for a list the visitor has not
  // navigated away from but which is now stale: a slot rejected as taken, or
  // the day a booking just used up. Re-setting the date or the month would not
  // do it — they have not changed, and React bails out of an identical write.
  const [month, setMonth] = useState(null)
  const [daysNonce, setDaysNonce] = useState(0)
  const [slotsNonce, setSlotsNonce] = useState(0)
  const [daysState, setDaysState] = useState(null)
  const [slotsState, setSlotsState] = useState(null)

  const daysKey = month ? `days-${month}#${daysNonce}` : null
  const dateKey = date ? toISODate(date) : null
  const slotsKey = dateKey ? `slots-${dateKey}#${slotsNonce}` : null

  const daysReady = Boolean(daysKey) && daysState?.key === daysKey
  const slotsReady = Boolean(slotsKey) && slotsState?.key === slotsKey

  const daysLoading = !daysReady
  const daysFailed = daysReady && daysState.failed
  // null until answered, which CalendarPicker reads as "unrestricted" — safe
  // only because `loading` disables every cell for exactly as long.
  const openDates = daysReady ? daysState.dates : null
  const horizon = daysReady ? daysState.horizon : null

  const slots = slotsReady ? slotsState.slots : []
  const slotsLoading = Boolean(slotsKey) && !slotsReady
  const slotsFailed = slotsReady && slotsState.failed

  // Stable, because CalendarPicker reports its month from an effect and a new
  // function identity every render would make that effect a loop.
  const handleMonthChange = useCallback(({ year, month: monthIndex }) => {
    setMonth(toMonthKey(year, monthIndex))
  }, [])

  useEffect(() => {
    if (!month || !daysKey) return
    let cancelled = false

    fetchBookingDays(month)
      .then(({ days, maxDate }) => {
        if (cancelled) return
        setDaysState({
          key: daysKey,
          dates: new Set(days),
          horizon: fromISODate(maxDate),
          failed: false,
        })
      })
      .catch(() => {
        if (cancelled) return
        // An empty set, not an open calendar. If availability cannot be read,
        // offering every date would let someone book a slot the server is
        // about to refuse — a closed calendar with a visible reason is the
        // honest failure.
        setDaysState({ key: daysKey, dates: new Set(), horizon: null, failed: true })
      })

    return () => {
      cancelled = true
    }
  }, [month, daysKey])

  useEffect(() => {
    if (!dateKey || !slotsKey) return
    let cancelled = false

    fetchBookingSlots(dateKey)
      .then((next) => {
        if (!cancelled) setSlotsState({ key: slotsKey, slots: next, failed: false })
      })
      .catch(() => {
        if (!cancelled) setSlotsState({ key: slotsKey, slots: [], failed: true })
      })

    return () => {
      cancelled = true
    }
  }, [dateKey, slotsKey])

  const validate = (v = values, d = date, t = time) => {
    const next = {}
    if (!v.name.trim()) next.name = 'Enter your full name.'
    if (!v.firm.trim()) next.firm = 'Enter the name of your firm.'
    if (!v.email.trim()) next.email = 'Enter your email address.'
    else if (!isEmail(v.email)) next.email = 'Enter a valid email address.'
    if (!v.country.trim()) next.country = 'Select the country your firm operates from.'
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
    if (status === 'submitting') return

    // console.log('[Signup Page] 📝 Signup form submit triggered')
    // console.log('[Signup Page] 📋 Form data:', {
    //   ...values,
    //   date: date ? toISODate(date) : null,
    //   time,
    // })

    const next = validate()
    setErrors(next)
    setTouched({ name: true, firm: true, email: true, country: true, date: true, time: true })

    /*
     * Text fields first, then the pickers — and exactly ONE toast, for the
     * first issue in that order.
     */
    const firstField = ['name', 'firm', 'email', 'country'].find((k) => next[k])
    if (firstField) {
      // console.warn('[Signup Page] ⚠️ Validation error on field:', firstField, next[firstField])
      formRef.current?.querySelector(`#${firstField}`)?.focus()
      showErrorToast(next[firstField], { id: 'signup-validation' })
      return
    }
    if (next.date || next.time) {
      // console.warn('[Signup Page] ⚠️ Date/time scheduling incomplete:', next.date || next.time)
      formRef.current?.querySelector('[data-scheduling]')?.scrollIntoView({ block: 'center' })
      showErrorToast(next.date ?? next.time, { id: 'signup-validation' })
      return
    }

    // console.log('[Signup Page] 🚀 Form valid. Dispatching signup API call...')
    setStatus('submitting')

    try {
      const payload = {
        name: values.name.trim(),
        firm: values.firm.trim(),
        email: values.email.trim(),
        country: values.country.trim(),
        date: toISODate(date),
        time,
      }

      // console.log('[Signup Page] 🌐 Calling AuthContext signup with payload:', payload)
      await signup(payload)
      // console.log('[Signup Page] ✅ Signup successfully completed!')

      setOpen(true)
    } catch (err) {
      // console.error('[Signup Page] ❌ Signup submission failed:', {
      //   message: err.message,
      //   status: err.status,
      //   data: err.data,
      // })
      // The server rejects a slot it no longer offers — somebody took it while
      // this form was open. Clearing the choice and re-asking is the only
      // honest response: leaving the taken time selected invites the visitor
      // to submit it again and be refused again.
      if (err?.data?.time) {
        setTime(null)
        setSlotsNonce((n) => n + 1)
      }

      showErrorToast(
        err.message || 'Unable to submit your request. Please try again.',
        { id: 'signup-error' },
      )
    } finally {
      setStatus('idle')
    }
  }




  const reset = () => {
    setOpen(false)
    setValues({ name: '', firm: '', email: '', country: '' })
    setDate(null)
    setTime(null)
    setTouched({})
    setErrors({})
    // Clearing the date empties the slot list through its own effect. The
    // month's open dates are re-read for the same reason a second booking
    // needs them: the slot just taken is one of the ones that changed, and it
    // may have been the last one on that day.
    setDaysNonce((n) => n + 1)
  }

  return (
    <>
      <AuthShell
        eyebrow="Get Started"
        title="Sign Up"
        description="Create your account and pick a time that suits you. We will confirm by email with a calendar invitation for your platform walkthrough."
        width="max-w-3xl"
      >
        <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-10">
          <div className="grid gap-8 sm:grid-cols-2">
            <FormInput
              id="name"
              label="Name"
              autoComplete="name"
              placeholder="Your full name"
              required
              value={values.name}
              onChange={setField('name')}
              onBlur={onBlur('name')}
              error={touched.name ? errors.name : undefined}
            />

            <FormInput
              id="firm"
              label="Firm"
              autoComplete="organization"
              placeholder="Your firm"
              required
              value={values.firm}
              onChange={setField('firm')}
              onBlur={onBlur('firm')}
              error={touched.firm ? errors.firm : undefined}
            />

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

            <CountryDropdown
              id="country"
              name="country"
              label="Country"
              placeholder="Select country"
              required
              value={values.country}
              onChange={setField('country')}
              onBlur={onBlur('country')}
              error={touched.country ? errors.country : undefined}
            />
          </div>


          <div data-scheduling className="grid gap-10 lg:grid-cols-2 lg:gap-8">
            {/* ---- date ---- */}
            <div>
              <p className="label-ui text-[var(--tone-muted)]" id="date-label">
                Select Date
                <span className="ml-1 text-[var(--tone-accent)]" aria-hidden="true">
                  *
                </span>
              </p>

              <div
                role="group"
                aria-labelledby="date-label"
                aria-describedby={touched.date && errors.date ? 'date-error' : undefined}
                className="mt-3"
              >
                <CalendarPicker
                  value={date}
                  availableDates={openDates}
                  loading={daysLoading}
                  maxDate={horizon}
                  onMonthChange={handleMonthChange}
                  onSelect={(d) => {
                    setDate(d)
                    // A time belongs to ITS date. Carrying "10:00 AM" onto a
                    // day whose list does not contain it would submit a slot
                    // the visitor never saw offered.
                    setTime(null)
                    setErrors((prev) => ({ ...prev, date: undefined }))
                  }}
                />
              </div>

              {daysFailed && (
                <p role="status" className="mt-3 text-[0.9375rem] text-[var(--tone-muted)]">
                  We could not load the available dates.{' '}
                  <button
                    type="button"
                    onClick={() => setDaysNonce((n) => n + 1)}
                    className="cursor-pointer text-[var(--tone-ink)] underline underline-offset-4 transition-colors hover:text-[var(--tone-accent)]"
                  >
                    Try again
                  </button>
                </p>
              )}

              {/* The visible copy is the submit toast; this stays for assistive
                  tech, which the scheduling group has no border state to tell. */}
              {touched.date && errors.date && (
                <p id="date-error" className="sr-only">
                  Error — {errors.date}
                </p>
              )}
            </div>

            {/* ---- time ---- */}
            <div>
              <p className="label-ui text-[var(--tone-muted)]" id="time-label">
                Select Time
                <span className="ml-1 text-[var(--tone-accent)]" aria-hidden="true">
                  *
                </span>
              </p>

              {/* Said once, plainly. The whole product schedules in UTC, so a
                  visitor reading "09:00 AM" against their own clock would be an
                  hour — or nine — wrong about when the call is. */}
              <p className="mt-2 text-[0.875rem] text-[var(--tone-muted)]">
                All times are shown in UTC.
              </p>

              <div
                role="group"
                aria-labelledby="time-label"
                aria-describedby={touched.time && errors.time ? 'time-error' : undefined}
                aria-busy={slotsLoading || undefined}
                className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-2"
              >
                {slots.map((slot) => {
                  const selected = time === slot.label
                  return (
                    <button
                      key={slot.time}
                      type="button"
                      disabled={!slot.available}
                      aria-pressed={selected}
                      aria-label={
                        slot.available ? slot.label : `${slot.label} — no longer available`
                      }
                      onClick={() => {
                        setTime(slot.label)
                        setErrors((prev) => ({ ...prev, time: undefined }))
                      }}
                      className={cn(
                        'min-h-12 cursor-pointer border px-3 py-3 text-[0.9375rem] tabular-nums',
                        'transition-colors duration-200',
                        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tone-accent)]',
                        selected
                          ? 'border-[var(--tone-accent)] bg-[var(--tone-accent)] font-semibold text-white'
                          : 'border-[var(--tone-line-strong)] text-[var(--tone-ink)] hover:border-[var(--tone-accent)] hover:text-[var(--tone-accent)]',
                        !slot.available &&
                          'cursor-not-allowed border-[var(--tone-line)] text-[var(--tone-muted)]/45 line-through hover:border-[var(--tone-line)] hover:text-[var(--tone-muted)]/45',
                      )}
                    >
                      {slot.label}
                    </button>
                  )
                })}
              </div>

              {/* One line, whichever of the four states the list is in — an
                  empty grid with no explanation reads as a broken page. */}
              {slots.length === 0 && (
                <p
                  role="status"
                  className="mt-3 text-[0.9375rem] text-[var(--tone-muted)]"
                >
                  {!date
                    ? 'Choose a date to see the times available on it.'
                    : slotsLoading
                      ? 'Loading times…'
                      : slotsFailed
                        ? 'We could not load the times for that date.'
                        : 'No times are left on that date. Please choose another.'}
                  {slotsFailed && (
                    <>
                      {' '}
                      <button
                        type="button"
                        onClick={() => setSlotsNonce((n) => n + 1)}
                        className="cursor-pointer text-[var(--tone-ink)] underline underline-offset-4 transition-colors hover:text-[var(--tone-accent)]"
                      >
                        Try again
                      </button>
                    </>
                  )}
                </p>
              )}

              {touched.time && errors.time && (
                <p id="time-error" className="sr-only">
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
                    <span className="label-ui block text-[var(--tone-muted)]">Selected</span>
                    <span className="mt-2 block font-semibold text-[var(--tone-ink)]">
                      {date ? formatDisplayDate(date) : 'No date yet'}
                      {time ? ` · ${time}` : ''}
                    </span>
                  </>
                ) : (
                  <span className="label-ui">Nothing selected yet</span>
                )}
              </div>
            </div>
          </div>

          <PrimaryButton
            type="submit"
            loading={status === 'submitting'}
            loadingLabel="Booking"
            className="w-full"
          >
            Schedule Session
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

      <Modal open={open} onClose={reset} title="Session Booked">
        <div className="mt-7 flex items-start gap-5">
          <span
            aria-hidden="true"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm border border-[var(--tone-accent)] text-[var(--tone-accent)]"
          >
            <CalendarCheck size={22} weight="light" />
          </span>

          <div>
            <p className="text-[1rem] leading-relaxed text-[var(--tone-muted)]">
              Booked. A calendar invitation is on its way.
            </p>

            {date && time && (
              <p className="mt-4 border-t border-[var(--tone-line)] pt-4">
                <span className="label-ui block text-[var(--tone-muted)]">Booked slot</span>
                <span className="mt-2 block font-semibold text-[var(--tone-ink)]">
                  {formatDisplayDate(date)} · {time}
                </span>
              </p>
            )}
          </div>
        </div>


        <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Link
            to="/"
            className="label-ui inline-flex min-h-13 cursor-pointer items-center justify-center rounded-sm border border-[var(--tone-line-strong)] px-7 py-4 text-[var(--tone-ink)] transition-colors duration-300 hover:border-[var(--tone-accent)] hover:text-[var(--tone-accent)]"
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
