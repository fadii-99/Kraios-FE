/**
 * Centralized HTTP client for KRAIOS Backend API requests.
 */
import { tokenStorage } from './tokenStorage'

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'https://bdf7-182-182-224-98.ngrok-free.app/api/v1'

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
      return 'You do not have permission to access this resource.'
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
 * Standard API request wrapper.
 *
 * @param {string} endpoint - Path relative to API_BASE_URL (e.g. '/auth/login/') or full URL
 * @param {Object} [options]
 * @param {string} [options.method='GET']
 * @param {any} [options.body] - Request body object or string
 * @param {Object} [options.headers] - Additional custom headers
 * @param {boolean} [options.auth=true] - Whether to send Authorization Bearer header if token exists
 * @returns {Promise<any>}
 */
export async function apiClient(endpoint, options = {}) {
  const base = API_BASE_URL.replace(/\/+$/, '')
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const url = endpoint.startsWith('http') ? endpoint : `${base}${path}`

  const token = options.auth !== false ? tokenStorage.getAccessToken() : null

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'ngrok-skip-browser-warning': 'true',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  }

  const fetchOptions = {
    method: options.method || 'GET',
    headers,
  }

  if (options.body !== undefined) {
    fetchOptions.body =
      typeof options.body === 'string' ? options.body : JSON.stringify(options.body)
  }

  console.log(`[API Request] 🚀 ${fetchOptions.method} ${url}`)

  let response
  try {
    response = await fetch(url, fetchOptions)
  } catch (netErr) {
    console.error(`[API Network Error] ❌ ${fetchOptions.method} ${url}:`, netErr)
    const err = new Error('Unable to connect to the server. Please try again.')
    err.isNetworkError = true
    throw err
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

  console.log(`[API Response] 📥 ${response.status} ${response.statusText} from:`, url)

  if (!response.ok) {
    const message = parseApiError(response, data)
    console.warn(`[API Error] ⚠️ ${response.status} - Normalized Message:`, message)

    const error = new Error(message)
    error.status = response.status
    error.data = data
    error.response = response
    throw error
  }

  return data
}
