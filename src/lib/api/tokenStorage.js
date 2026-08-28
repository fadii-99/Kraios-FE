/**
 * Centralized auth storage cleanup utility.
 *
 * NOTE: Authentication is handled exclusively via secure, HttpOnly cookies set by the backend.
 * Nothing is stored in localStorage or sessionStorage. All user profile and session state
 * is maintained exclusively in React state in-memory.
 */

const USER_KEY = 'kraios_user'

export const tokenStorage = {
  /**
   * Clear any legacy keys from previous storage implementations.
   */
  clearAuthTokens() {
    try {
      localStorage.removeItem(USER_KEY)
      localStorage.removeItem('kraios_profile')

      // Clean up legacy token keys
      localStorage.removeItem('kraios_access_token')
      localStorage.removeItem('kraios_refresh_token')
      localStorage.removeItem('kraios_token')
      sessionStorage.removeItem('kraios_access_token')
      sessionStorage.removeItem('kraios_refresh_token')
      sessionStorage.removeItem('kraios_token')
    } catch {
      // ignore storage access errors
    }
  },

  /**
   * Stubs kept for backwards compatibility; nothing is read or written to localStorage.
   */
  getUser() {
    return null
  },

  setUser() {
    // No-op: client-side storage of user data is disabled
  },
}
