/**
 * The public FORGOT PASSWORD flow — DUMMY / FRONTEND ONLY.
 *
 * The API contract has no endpoint that starts a password recovery: there is
 * `POST /auth/reset-password/` (used by the real, token-linked
 * `/reset-password` page) and nothing that mails a code or verifies one. Until
 * the backend adds them, the three screens below are a UI walkthrough that
 * talks to NOTHING.
 *
 * This module is the seam that makes that honest and reversible. Everything
 * pretended is declared HERE — the fake wait, the fake code, the paths the
 * screens hand each other — so when the endpoints exist, the three pages call
 * them and this file's `dummy*` exports are deleted. Do not scatter simulated
 * behaviour back into the pages.
 *
 * The screens, in order:
 *   1. /forgot-password         email      -> "we sent a code"
 *   2. /forgot-password/verify  OTP        -> "code accepted"
 *   3. /forgot-password/reset   password   -> "password updated"
 *
 * Each step is reached only from the one before it, carrying `location.state`;
 * opening step 2 or 3 directly returns to step 1 rather than presenting a
 * half-started recovery.
 */

/** The three addresses, so no screen types a route string. */
export const FORGOT_PASSWORD_PATHS = {
  email: '/forgot-password',
  verify: '/forgot-password/verify',
  reset: '/forgot-password/reset',
}

/** Digits in the verification code. Matches the backend's own OTP length. */
export const OTP_LENGTH = 6

/** Seconds before "Resend code" becomes available again. */
export const RESEND_COOLDOWN_SECONDS = 45

/**
 * DUMMY — the pause that stands in for a request, so the submit button's
 * loading state is visible and the screens behave like the real ones will.
 */
export const DUMMY_REQUEST_MS = 700

/** DUMMY — resolve after `DUMMY_REQUEST_MS`. Replace with the real call. */
export function dummyDelay(ms = DUMMY_REQUEST_MS) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

/**
 * `name@firm.com` -> `na••••@firm.com`. Used on the verify screen to confirm
 * which address the code went to without reprinting it in full.
 */
export function maskEmail(email) {
  const value = String(email || '').trim()
  const at = value.lastIndexOf('@')
  if (at < 1) return value

  const local = value.slice(0, at)
  const domain = value.slice(at)
  if (local.length <= 2) return `${local[0]}••${domain}`

  return `${local.slice(0, 2)}${'•'.repeat(Math.min(local.length - 2, 6))}${domain}`
}
