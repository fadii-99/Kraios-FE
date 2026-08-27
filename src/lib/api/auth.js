/**
 * Authentication API services for KRAIOS.
 * Implements ONLY the 3 backend endpoints:
 * 1. POST /auth/signup-request/
 * 2. POST /auth/login/
 * 3. GET /auth/me/
 *
 * NOTE: There is currently NO token-refresh endpoint or forgot-password backend endpoint.
 */
import { apiClient } from './client'

export const AUTH_ENDPOINTS = {
  signupRequest: '/auth/signup-request/',
  login: '/auth/login/',
  me: '/auth/me/',
  profile: '/auth/me/',
}


/**
 * Submit signup request.
 *
 * @param {Object} payload
 * @param {string} payload.name - Full name
 * @param {string} payload.firm - Firm / organization
 * @param {string} payload.email - Email address
 * @param {string} payload.country - Country
 * @param {string} payload.date - Formatted date in YYYY-MM-DD (e.g. '2026-09-15')
 * @param {string} payload.time - Formatted time slot string (e.g. '10:00 AM - 11:00 AM')
 * @returns {Promise<any>}
 */
export async function submitSignupRequest({ name, firm, email, country, date, time }) {
  const body = {
    name,
    firm,
    email,
    country,
    date,
    time,
  }

  console.log('[Auth Service] 📝 Submitting signup request:', body)

  return apiClient(AUTH_ENDPOINTS.signupRequest, {
    method: 'POST',
    body,
    auth: false,
  })
}

/**
 * Log in with email and password.
 *
 * @param {Object} credentials
 * @param {string} credentials.email - Email address
 * @param {string} credentials.password - Password
 * @returns {Promise<{ accessToken: string, refreshToken: string | null, user: Object | null, raw: any }>}
 */
export async function loginUser({ email, password }) {
  const body = {
    email,
    password,
  }

  console.log('[Auth Service] 🔑 Submitting login for email:', email)

  const data = await apiClient(AUTH_ENDPOINTS.login, {
    method: 'POST',
    body,
    auth: false,
  })

  // Extract and normalize access and refresh tokens from backend response
  const payload = data && typeof data === 'object' ? (data.data || data) : {}
  const accessToken =
    payload.access ||
    payload.access_token ||
    payload.token ||
    payload.jwt ||
    data.access ||
    data.access_token ||
    data.token ||
    data.jwt ||
    null

  // Stored for future compatibility only; no active refresh logic is used.
  const refreshToken =
    payload.refresh ||
    payload.refresh_token ||
    data.refresh ||
    data.refresh_token ||
    null

  const user = payload.user || data.user || null

  return {
    accessToken,
    refreshToken,
    user,
    raw: data,
  }
}

/**
 * Get current authenticated user profile from GET /auth/me/
 *
 * @param {string} [customToken] - Optional explicit token to use instead of storage
 * @returns {Promise<Object>} User data
 */
export async function getCurrentUser(customToken) {
  console.log('[Auth Service] 👤 Fetching current user via GET /auth/me/')

  const options = {
    method: 'GET',
    auth: true,
  }

  if (customToken) {
    options.headers = {
      Authorization: `Bearer ${customToken}`,
    }
  }

  const data = await apiClient(AUTH_ENDPOINTS.me, options)
  const user = data && typeof data === 'object' ? (data.user || data.data?.user || data.data || data) : data

  return user
}
