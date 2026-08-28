/**
 * Authentication API services for KRAIOS.
 * Backed by secure HttpOnly cookies and CSRF protection.
 */
import { apiClient, ensureCsrfToken, getCsrfToken } from './client'

export const AUTH_ENDPOINTS = {
  signupRequest: '/auth/signup-request/',
  login: '/auth/login/',
  logout: '/auth/logout/',
  refresh: '/auth/refresh/',
  me: '/auth/me/',
  profile: '/auth/me/',
  csrf: '/auth/csrf/',
  resetPassword: '/auth/reset-password/',
}

/**
 * Submit signup demo/access request.
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

  return apiClient(AUTH_ENDPOINTS.signupRequest, {
    method: 'POST',
    body,
  })
}

/**
 * Log in with email and password.
 * First calls GET /auth/csrf/ to ensure CSRF cookie and token, then submits POST /auth/login/.
 * Backend sets secure HttpOnly cookies.
 *
 * @param {Object} credentials
 * @param {string} credentials.email - Email address
 * @param {string} credentials.password - Password
 * @returns {Promise<{ user: Object | null, raw: any }>}
 */
export async function loginUser({ email, password }) {
  // 1. Fetch fresh CSRF token before login
  await ensureCsrfToken(true)

  const csrfToken = getCsrfToken()
  const headers = {}
  if (csrfToken) {
    headers['X-CSRFToken'] = csrfToken
  }

  // 2. Submit login request with X-CSRFToken and credentials: 'same-origin'
  const data = await apiClient(AUTH_ENDPOINTS.login, {
    method: 'POST',
    body: {
      email,
      password,
    },
    headers,
    skipRefresh: true,
  })

  // Extract non-sensitive user profile if returned in login response
  const payload = data && typeof data === 'object' ? (data.data || data) : {}
  const user = payload.user || data.user || (payload.email ? payload : null)

  return {
    user,
    raw: data,
  }
}

/**
 * Log out user session.
 * Backend clears HttpOnly cookies.
 *
 * @returns {Promise<any>}
 */
export async function logoutUser() {
  try {
    return await apiClient(AUTH_ENDPOINTS.logout, {
      method: 'POST',
      skipRefresh: true,
    })
  } catch (err) {
    return null
  }
}

/**
 * Get current authenticated user profile from GET /auth/me/
 *
 * @param {Object} [options] - Optional apiClient options (e.g. { skipRefresh: true })
 * @returns {Promise<Object>} User data
 */
export async function getCurrentUser(options = {}) {
  const data = await apiClient(AUTH_ENDPOINTS.me, {
    method: 'GET',
    ...options,
  })

  const user =
    data && typeof data === 'object'
      ? data.user || data.data?.user || data.data || data
      : data

  return user
}

/**
 * Fetch and ensure CSRF token cookie from backend.
 * @returns {Promise<string | null>}
 */
export async function fetchCsrfToken() {
  return ensureCsrfToken(true)
}
