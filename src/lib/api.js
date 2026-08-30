/**
 * Central API module re-exporting client and auth service helpers.
 */
export {
  API_BASE_URL,
  apiClient,
  apiClient as apiRequest,
  parseApiError,
  ensureCsrfToken,
  getCsrfToken,
} from './api/client'

export { tokenStorage } from './api/tokenStorage'

export {
  AUTH_ENDPOINTS,
  submitSignupRequest,
  loginUser,
  logoutUser,
  getCurrentUser,
  fetchCsrfToken,
} from './api/auth'

export {
  PROFILE_ENDPOINTS,
  EDITABLE_PROFILE_FIELDS,
  VERIFICATION_KEYS,
  readVerificationId,
  clearVerificationId,
  fetchProfile,
  updateProfile,
  requestPasswordChange,
  confirmPasswordChange,
  requestAccountDeletion,
  confirmAccountDeletion,
} from './api/profile'
