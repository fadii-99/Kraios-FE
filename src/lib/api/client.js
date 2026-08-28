/**
 * Centralized HTTP client for KRAIOS Backend API requests.
 * Uses secure HttpOnly cookie authentication and CSRF protection.
 */

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || '/api/v1'

let inMemoryCsrfToken = null

/**
 * Reads the non-HttpOnly CSRF token cookie set by the backend.
 * @returns {string | null}
 */
export function getCsrfToken() {
  if (typeof document !== 'undefined' && document.cookie) {
    const cookies = document.cookie.split(';')
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim()
      if (cookie.startsWith('csrftoken=')) {
        return decodeURIComponent(cookie.substring('csrftoken='.length))
      }
      if (cookie.startsWith('csrf_token=')) {
        return decodeURIComponent(cookie.substring('csrf_token='.length))
      }
      if (cookie.startsWith('XSRF-TOKEN=')) {
        return decodeURIComponent(cookie.substring('XSRF-TOKEN='.length))
      }
    }
  }
  return inMemoryCsrfToken
}

let csrfPromise = null

/**
 * Ensures a valid CSRF token is present in cookies by calling GET /auth/csrf/.
 * @param {boolean} [force=false] - Force a fresh CSRF cookie retrieval
 * @returns {Promise<string | null>}
 */
export async function ensureCsrfToken(force = false) {
  if (!force) {
    const existing = getCsrfToken()
    if (existing) return existing
  }

  if (!csrfPromise) {
    csrfPromise = (async () => {
      try {
        const base = API_BASE_URL.replace(/\/+$/, '')
        const res = await fetch(`${base}/auth/csrf/`, {
          method: 'GET',
          credentials: 'same-origin',
          headers: {
            Accept: 'application/json',
          },
        })

        if (res.ok) {
          try {
            const data = await res.json()
            if (data && typeof data === 'object') {
              const token =
                data.csrfToken ||
                data.csrf_token ||
                data.csrf ||
                data.token ||
                data.data?.csrfToken ||
                data.data?.csrf_token
              if (token && typeof token === 'string') {
                inMemoryCsrfToken = token
              }
            }
          } catch {
            // response was not JSON, cookies are still set via Set-Cookie header
          }
        }
      } catch (err) {
        // network or server error fetching CSRF
      } finally {
        csrfPromise = null
      }
      return getCsrfToken()
    })()
  }

  return csrfPromise
}

let refreshPromise = null

/**
 * Attempts to refresh the user session via POST /auth/refresh/.
 * The backend verifies the HttpOnly refresh token cookie and issues a new access cookie.
 * @returns {Promise<boolean>}
 */
async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const base = API_BASE_URL.replace(/\/+$/, '')
      let csrfToken = getCsrfToken()
      if (!csrfToken) {
        csrfToken = await ensureCsrfToken(true)
      }

      const headers = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      }
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken
      }

      const response = await fetch(`${base}/auth/refresh/`, {
        method: 'POST',
        credentials: 'same-origin',
        headers,
      })

      if (!response.ok) {
        const err = new Error('Session refresh failed')
        err.status = response.status
        throw err
      }

      return true
    })().finally(() => {
      refreshPromise = null
    })
  }

  return refreshPromise
}

/**
 * Notifies the application that the session has expired and refresh failed.
 */
function dispatchAuthExpired() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('kraios:auth-expired'))
  }
}

/**
 * Normalizes Django / DRF / FastAPI error responses into human-readable user messages.
 * Prevents exposing raw HTML, Python tracebacks, or technical error objects.
 *
 * @param {Response} response - Fetch response object
 * @param {any} data - Parsed response payload or text
 * @returns {string} Clean, safe error message
 */
export function parseApiError(response, data) {
  // If backend returned Django DisallowedHost (HTTP 400 with text/html)
  if (response.status === 400 && typeof data === 'string' && data.includes('DisallowedHost')) {
    return 'Backend host configuration error. The server must add this domain to DJANGO_ALLOWED_HOSTS.'
  }

  // Handle standard JSON error payloads
  if (data && typeof data === 'object') {
    // 1. Direct detail string (e.g. {"detail": "Invalid credentials."})
    if (typeof data.detail === 'string' && data.detail.trim()) {
      return data.detail
    }

    // 2. FastAPI validation error list (e.g. {"detail": [{"msg": "Field required"}]})
    if (Array.isArray(data.detail) && data.detail.length > 0) {
      const messages = data.detail
        .map((item) => (typeof item === 'object' && item.msg ? item.msg : String(item)))
        .filter(Boolean)
      if (messages.length > 0) return messages.join(', ')
    }

    // 3. Simple message or error string
    if (typeof data.message === 'string' && data.message.trim()) {
      return data.message
    }
    if (typeof data.error === 'string' && data.error.trim()) {
      return data.error
    }

    // 4. Django non_field_errors array
    if (Array.isArray(data.non_field_errors) && data.non_field_errors.length > 0) {
      return String(data.non_field_errors[0])
    }

    // 5. Django field-level validation errors (e.g. {"email": ["Enter a valid email address."]})
    const fieldKeys = Object.keys(data).filter((k) => k !== 'status' && k !== 'code')
    for (const key of fieldKeys) {
      const val = data[key]
      if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'string') {
        return val[0]
      }
      if (typeof val === 'string' && val.trim()) {
        return val
      }
    }
  }

  // Fallback status code messages
  switch (response.status) {
    case 400:
      return 'Invalid request. Please verify your submitted information.'
    case 401:
      return 'Email or password is incorrect.'
    case 403:
      return 'CSRF verification failed or you do not have permission to perform this action.'
    case 404:
      return 'Requested resource not found.'
    case 500:
    case 502:
    case 503:
    case 504:
      return 'Server error. Please try again later.'
    default:
      return 'An unexpected error occurred. Please try again.'
  }
}

/**
 * Standard API request wrapper with HttpOnly cookie credentials, CSRF protection,
 * and automatic 401 token refresh retry.
 *
 * @param {string} endpoint - Path relative to API_BASE_URL (e.g. '/auth/login/') or full URL
 * @param {Object} [options]
 * @param {string} [options.method='GET']
 * @param {any} [options.body] - Request body object or string
 * @param {Object} [options.headers] - Additional custom headers
 * @param {boolean} [options.skipRefresh=false] - If true, do not attempt token refresh on 401
 * @param {boolean} [options._retry=false] - Internal flag to prevent infinite refresh loops
 * @returns {Promise<any>}
 */
export async function apiClient(endpoint, options = {}) {
  const base = API_BASE_URL.replace(/\/+$/, '')
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const url = endpoint.startsWith('http') ? endpoint : `${base}${path}`
  const method = (options.method || 'GET').toUpperCase()

  const headers = {
    Accept: 'application/json',
    ...(options.headers || {}),
  }

  // Attach Content-Type for JSON payloads if not already set or FormData
  if (options.body !== undefined && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  // Attach CSRF token on unsafe/mutating requests (POST, PUT, PATCH, DELETE)
  const isMutatingMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
  if (isMutatingMethod && !path.includes('/auth/csrf/')) {
    let csrfToken = getCsrfToken()
    if (!csrfToken) {
      csrfToken = await ensureCsrfToken(true)
    }
    if (csrfToken && !headers['X-CSRFToken']) {
      headers['X-CSRFToken'] = csrfToken
    }
  }

  const fetchOptions = {
    method,
    headers,
    credentials: 'same-origin',
  }

  if (options.body !== undefined) {
    fetchOptions.body =
      typeof options.body === 'string' || options.body instanceof FormData
        ? options.body
        : JSON.stringify(options.body)
  }

  let response
  try {
    response = await fetch(url, fetchOptions)
  } catch (netErr) {
    const err = new Error('Unable to connect to the server. Please try again.')
    err.isNetworkError = true
    throw err
  }

  // Automatic 401 Refresh Handling:
  // Refresh is ONLY attempted when:
  // 1. Status is 401 (never 403 or other codes)
  // 2. options.skipRefresh is not true (e.g. not startup /auth/me/ or public checks)
  // 3. Request is not already a retry
  // 4. Endpoint is not an auth endpoint (login, refresh, csrf, signup-request)
  if (response.status === 401) {
    const isAuthEndpoint =
      path.includes('/auth/login/') ||
      path.includes('/auth/refresh/') ||
      path.includes('/auth/csrf/') ||
      path.includes('/auth/signup-request/')

    if (!options._retry && !options.skipRefresh && !isAuthEndpoint) {
      try {
        await refreshSession()
        return await apiClient(endpoint, {
          ...options,
          _retry: true,
        })
      } catch (refreshErr) {
        dispatchAuthExpired()
      }
    }
  }

  let data
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    try {
      data = await response.json()
    } catch {
      data = null
    }
  } else {
    try {
      data = await response.text()
    } catch {
      data = null
    }
  }

  if (!response.ok) {
    const message = parseApiError(response, data)

    const error = new Error(message)
    error.status = response.status
    error.data = data
    error.response = response
    throw error
  }

  return data
}
