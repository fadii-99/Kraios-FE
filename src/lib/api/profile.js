/**
 * Authenticated Profile API services for KRAIOS.
 *
 * Covers the three flows in FRONTEND_PROFILE_API_GUIDE.md:
 *   1. profile view / edit          GET, PATCH /profile/
 *   2. change password with OTP     POST /profile/password-change/{request,confirm}/
 *   3. delete account with OTP      POST /profile/delete-account/{request,confirm}/
 *
 * Every call goes through `apiClient`, so cookies (`credentials: 'include'`),
 * the `X-CSRFToken` header on mutating methods, the single 401 refresh retry
 * and `parseApiError` normalization are already handled. Nothing here touches
 * localStorage or sessionStorage for tokens — authentication is HttpOnly
 * cookies.
 */
import { apiClient } from './client'

export const PROFILE_ENDPOINTS = {
  profile: '/profile/',
  passwordChangeRequest: '/profile/password-change/request/',
  passwordChangeConfirm: '/profile/password-change/confirm/',
  deleteAccountRequest: '/profile/delete-account/request/',
  deleteAccountConfirm: '/profile/delete-account/confirm/',
}

/**
 * The ONLY fields the backend accepts on PATCH /profile/.
 * `id`, `email`, `role` and `date_joined` are read-only — email is deliberately
 * not an editable field in the UI.
 */
export const EDITABLE_PROFILE_FIELDS = [
  'full_name',
  'firm_name',
  'country',
  'job_title',
  'phone',
]

/**
 * sessionStorage keys holding the short-lived OTP verification id.
 *
 * This is NOT a credential: it identifies a pending verification the backend
 * already issued, it expires in 10 minutes, and it is the only thing the OTP
 * screen needs. No password — current or new — is ever kept after the request
 * that sent it succeeds.
 */
export const VERIFICATION_KEYS = {
  passwordChange: 'passwordChangeVerificationId',
  deleteAccount: 'deleteAccountVerificationId',
}

/** Reads a stored verification id, tolerating a storage-less environment. */
export function readVerificationId(key) {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

/** Stores a verification id, tolerating a storage-less environment. */
export function storeVerificationId(key, value) {
  try {
    if (value) sessionStorage.setItem(key, value)
  } catch {
    // private mode / storage disabled — the in-flight flow still holds the id
  }
}

/** Clears a stored verification id once the flow has finished or been aborted. */
export function clearVerificationId(key) {
  try {
    sessionStorage.removeItem(key)
  } catch {
    // nothing to clear
  }
}

/**
 * Unwraps the profile object from whichever envelope the backend uses.
 * @param {any} data
 * @returns {Object}
 */
function unwrapProfile(data) {
  if (!data || typeof data !== 'object') return {}
  return data.profile || data.user || data.data?.user || data.data || data
}

/**
 * GET /profile/ — the current authenticated profile.
 * @returns {Promise<Object>}
 */
export async function fetchProfile() {
  const data = await apiClient(PROFILE_ENDPOINTS.profile, { method: 'GET' })
  return unwrapProfile(data)
}

/**
 * PATCH /profile/ — partial update of the editable fields only.
 *
 * Unknown and read-only keys are stripped here rather than at the call site, so
 * a page can hand over its whole form model and never accidentally send
 * `email`, `role` or a password field.
 *
 * @param {Object} fields
 * @returns {Promise<Object>} the updated profile
 */
export async function updateProfile(fields = {}) {
  const body = {}
  for (const key of EDITABLE_PROFILE_FIELDS) {
    if (fields[key] !== undefined) body[key] = fields[key]
  }

  const data = await apiClient(PROFILE_ENDPOINTS.profile, {
    method: 'PATCH',
    body,
  })
  return unwrapProfile(data)
}

/**
 * POST /profile/password-change/request/ — step A of the authenticated change
 * password flow. Requires the current password; this is not a public
 * "forgot password" flow.
 *
 * Responds 202 with { detail, verification_id, expires_at }. The id is stored
 * for the OTP screen; the passwords are not kept anywhere after this resolves.
 *
 * @param {Object} payload
 * @param {string} payload.currentPassword
 * @param {string} payload.newPassword
 * @returns {Promise<{ detail?: string, verification_id?: string, expires_at?: string }>}
 */
export async function requestPasswordChange({ currentPassword, newPassword }) {
  const result = await apiClient(PROFILE_ENDPOINTS.passwordChangeRequest, {
    method: 'POST',
    body: {
      current_password: currentPassword,
      new_password: newPassword,
    },
  })

  storeVerificationId(VERIFICATION_KEYS.passwordChange, result?.verification_id)
  return result || {}
}

/**
 * POST /profile/password-change/confirm/ — step B. On success the backend
 * revokes the session and clears the cookies, so the caller MUST clear the
 * frontend session and send the user to /login.
 *
 * @param {Object} payload
 * @param {string} payload.otp - six digits
 * @param {string} [payload.verificationId] - defaults to the stored id
 * @returns {Promise<any>}
 */
export async function confirmPasswordChange({ otp, verificationId }) {
  const id =
    verificationId || readVerificationId(VERIFICATION_KEYS.passwordChange)

  const result = await apiClient(PROFILE_ENDPOINTS.passwordChangeConfirm, {
    method: 'POST',
    body: {
      verification_id: id,
      otp,
    },
  })

  clearVerificationId(VERIFICATION_KEYS.passwordChange)
  return result
}

/**
 * POST /profile/delete-account/request/ — step A of account deletion.
 * Responds 202 with a verification_id; the OTP screen follows.
 *
 * @param {Object} payload
 * @param {string} payload.currentPassword
 * @returns {Promise<{ detail?: string, verification_id?: string, expires_at?: string }>}
 */
export async function requestAccountDeletion({ currentPassword }) {
  const result = await apiClient(PROFILE_ENDPOINTS.deleteAccountRequest, {
    method: 'POST',
    body: { current_password: currentPassword },
  })

  storeVerificationId(VERIFICATION_KEYS.deleteAccount, result?.verification_id)
  return result || {}
}

/**
 * POST /profile/delete-account/confirm/ — step B. Responds 204 No Content: the
 * backend deletes the user, their projects, database records and stored files,
 * then clears the authentication cookies. `apiClient` returns the empty body
 * unchanged; there is nothing to read from it.
 *
 * @param {Object} payload
 * @param {string} payload.otp - six digits
 * @param {string} [payload.verificationId] - defaults to the stored id
 * @returns {Promise<void>}
 */
export async function confirmAccountDeletion({ otp, verificationId }) {
  const id =
    verificationId || readVerificationId(VERIFICATION_KEYS.deleteAccount)

  await apiClient(PROFILE_ENDPOINTS.deleteAccountConfirm, {
    method: 'POST',
    body: {
      verification_id: id,
      otp,
    },
  })

  clearVerificationId(VERIFICATION_KEYS.deleteAccount)
}
