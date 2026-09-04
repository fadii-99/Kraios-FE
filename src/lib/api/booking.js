/**
 * Public booking calendar — what the signup form is allowed to offer.
 *
 * The dates and times on /signup are NOT a list this app owns. They are the
 * administrator's availability, set in the admin console and read here, so
 * closing a Friday or blacking out a public holiday takes effect on the public
 * form without a deploy. Never reintroduce a hardcoded slot list beside these:
 * a second source would drift, and it would drift in the direction of offering
 * a visitor a time nobody can take.
 *
 * Both endpoints are unauthenticated by necessity — the visitor has no account
 * yet, which is the point of the form — so both are sent `skipRefresh`. A 401
 * here means the endpoint is misconfigured, not that a session expired, and a
 * refresh attempt on a public page would be exactly the authenticated request
 * §9 says a public route must never make.
 *
 * TIMES ARE UTC, like everything else the backend schedules (see the note the
 * signup form carries). `label` is the string the visitor reads AND the string
 * the form submits back; `time` is the 24-hour key it is identified by.
 */
import { apiClient } from './client'

export const BOOKING_ENDPOINTS = {
  days: '/auth/booking/days/',
  slots: '/auth/booking/slots/',
}

/** `YYYY-MM` for a Date, in local time — the month the calendar is showing. */
export const toMonthKey = (year, month) =>
  `${year}-${String(month + 1).padStart(2, '0')}`

/**
 * The open dates in one month.
 *
 * A month at a time because that is what the calendar draws. Dates NOT in the
 * answer are closed, and the reason is deliberately not given — a closed
 * weekday, a blackout and a fully booked day are the same fact to a visitor.
 *
 * @param {string} month `YYYY-MM`
 * @returns {Promise<{ days: string[], minDate: string|null, maxDate: string|null }>}
 */
export async function fetchBookingDays(month) {
  const data = await apiClient(`${BOOKING_ENDPOINTS.days}?month=${encodeURIComponent(month)}`, {
    method: 'GET',
    skipRefresh: true,
  })

  return {
    days: Array.isArray(data?.days) ? data.days : [],
    minDate: data?.min_date ?? null,
    maxDate: data?.max_date ?? null,
  }
}

/**
 * The slots on one date.
 *
 * Taken and already-passed slots come back with `available: false` rather than
 * missing, so the form can strike them through instead of silently starting
 * the day at 10:30.
 *
 * @param {string} date `YYYY-MM-DD`
 * @returns {Promise<Array<{ time: string, label: string, available: boolean }>>}
 */
export async function fetchBookingSlots(date) {
  const data = await apiClient(`${BOOKING_ENDPOINTS.slots}?date=${encodeURIComponent(date)}`, {
    method: 'GET',
    skipRefresh: true,
  })

  return Array.isArray(data?.slots)
    ? data.slots.map((slot) => ({
        time: slot.time,
        label: slot.label || slot.time,
        available: slot.available !== false,
      }))
    : []
}
