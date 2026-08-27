/**
 * Central API module re-exporting client and auth service helpers.
 */
export { API_BASE_URL, apiClient, apiClient as apiRequest, parseApiError } from './api/client'
export { tokenStorage } from './api/tokenStorage'
export {
  AUTH_ENDPOINTS,
  submitSignupRequest,
  loginUser,
  getCurrentUser,
} from './api/auth'
