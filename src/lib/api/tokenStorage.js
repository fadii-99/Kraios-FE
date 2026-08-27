/**
 * Centralized token and auth storage utility.
 * Stores access token, refresh token (for future compatibility), and current user session.
 */

const ACCESS_TOKEN_KEY = 'kraios_access_token'
const REFRESH_TOKEN_KEY = 'kraios_refresh_token'
const USER_KEY = 'kraios_user'

export const tokenStorage = {
  /**
   * Get currently stored JWT access token.
   * @returns {string | null}
   */
  getAccessToken() {
    try {
      return (
        localStorage.getItem(ACCESS_TOKEN_KEY) ||
        localStorage.getItem('kraios_token') ||
        null
      )
    } catch {
      return null
    }
  },

  /**
   * Set JWT access token.
   * @param {string | null} token
   */
  setAccessToken(token) {
    try {
      if (token) {
        localStorage.setItem(ACCESS_TOKEN_KEY, token)
        localStorage.setItem('kraios_token', token)
      } else {
        localStorage.removeItem(ACCESS_TOKEN_KEY)
        localStorage.removeItem('kraios_token')
      }
    } catch {
      // ignore storage access errors
    }
  },

  /**
   * Get stored refresh token.
   * Note: There is currently NO token refresh endpoint on the backend.
   * Stored only for future compatibility when a refresh endpoint is introduced.
   * @returns {string | null}
   */
  getRefreshToken() {
    try {
      return localStorage.getItem(REFRESH_TOKEN_KEY) || null
    } catch {
      return null
    }
  },

  /**
   * Set stored refresh token.
   * @param {string | null} token
   */
  setRefreshToken(token) {
    try {
      if (token) {
        localStorage.setItem(REFRESH_TOKEN_KEY, token)
      } else {
        localStorage.removeItem(REFRESH_TOKEN_KEY)
      }
    } catch {
      // ignore
    }
  },

  /**
   * Clear all auth credentials and cached session data.
   */
  clearAuthTokens() {
    try {
      localStorage.removeItem(ACCESS_TOKEN_KEY)
      localStorage.removeItem(REFRESH_TOKEN_KEY)
      localStorage.removeItem('kraios_token')
      localStorage.removeItem(USER_KEY)
      localStorage.removeItem('kraios_profile')
    } catch {
      // ignore
    }
  },

  /**
   * Get cached user profile.
   * @returns {Object | null}
   */
  getUser() {
    try {
      const raw = localStorage.getItem(USER_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  },

  /**
   * Set cached user profile.
   * @param {Object | null} user
   */
  setUser(user) {
    try {
      if (user) {
        localStorage.setItem(USER_KEY, JSON.stringify(user))
      } else {
        localStorage.removeItem(USER_KEY)
      }
    } catch {
      // ignore
    }
  },
}
