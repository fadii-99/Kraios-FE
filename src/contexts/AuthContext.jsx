/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import {
  tokenStorage,
  loginUser,
  logoutUser,
  submitSignupRequest,
  getCurrentUser,
  ensureCsrfToken,
} from '@/lib/api'
import { showErrorToast } from '@/lib/toast'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isRestoring, setIsRestoring] = useState(true)
  const [error, setError] = useState(null)

  const isAuthenticated = Boolean(user)

  /**
   * Session bootstrap on initial application startup:
   * 1. Fetches CSRF token via GET /api/v1/auth/csrf/
   * 2. Calls GET /auth/me/ with skipRefresh: true (does not trigger /auth/refresh/ on startup 401)
   * 3. If response is 200, restores user in React state; if 401, sets user as logged out.
   */
  useEffect(() => {
    let isMounted = true

    async function bootstrap() {
      // 1. Fetch and initialize CSRF token on app startup
      try {
        await ensureCsrfToken(true)
      } catch (csrfErr) {
        // ignore CSRF fetch failure on startup
      }

      // 2. Check for active session via GET /auth/me/ without attempting refresh
      try {
        const userData = await getCurrentUser({ skipRefresh: true })
        if (!isMounted) return
        setUser(userData)
      } catch (err) {
        if (!isMounted) return
        setUser(null)
        tokenStorage.clearAuthTokens()
      } finally {
        if (isMounted) {
          setIsRestoring(false)
        }
      }
    }

    bootstrap()

    return () => {
      isMounted = false
    }
  }, [])

  /**
   * Listen for custom auth expiration events from apiClient when refresh fails.
   */
  useEffect(() => {
    const handleAuthExpired = () => {
      setUser(null)
      tokenStorage.clearAuthTokens()
      showErrorToast('Your session has expired. Please sign in again.', {
        id: 'session-expired',
      })
    }

    window.addEventListener('kraios:auth-expired', handleAuthExpired)
    return () => {
      window.removeEventListener('kraios:auth-expired', handleAuthExpired)
    }
  }, [])

  /**
   * Log in user:
   * 1. Calls GET /auth/csrf/ first, then POST /auth/login/ with email, password, and X-CSRFToken
   * 2. Backend sets HttpOnly cookies
   * 3. Calls GET /auth/me/ to load verified user profile into React state
   *
   * @param {Object} credentials - { email, password }
   * @returns {Promise<Object>}
   */
  const login = useCallback(async ({ email, password }) => {
    setIsLoading(true)
    setError(null)

    try {
      // 1. Submit login credentials (calls CSRF first, sends X-CSRFToken, backend sets cookies)
      const authResult = await loginUser({ email, password })

      // 2. Fetch full verified user identity from GET /auth/me/
      let verifiedUser = authResult.user
      try {
        const meUser = await getCurrentUser()
        if (meUser) {
          verifiedUser = meUser
        }
      } catch (meErr) {
        if (!verifiedUser) {
          verifiedUser = { email, name: email.split('@')[0] }
        }
      }

      // 3. Save verified user in React state
      setUser(verifiedUser)
      setIsLoading(false)

      return { success: true, user: verifiedUser }
    } catch (err) {
      setError(err.message)
      setIsLoading(false)
      throw err
    }
  }, [])

  /**
   * Submit signup session request:
   * Calls POST /auth/signup-request/
   *
   * @param {Object} signupData - { name, firm, email, country, date, time }
   * @returns {Promise<any>}
   */
  const signup = useCallback(async (signupData) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await submitSignupRequest(signupData)
      setIsLoading(false)
      return { success: true, data: response }
    } catch (err) {
      setError(err.message)
      setIsLoading(false)
      throw err
    }
  }, [])

  /**
   * Log out user:
   * Calls POST /auth/logout/ to clear backend cookies and clears React auth state.
   */
  const logout = useCallback(async () => {
    setIsLoading(true)
    try {
      await logoutUser()
    } catch (err) {
      // ignore
    } finally {
      tokenStorage.clearAuthTokens()
      setUser(null)
      setError(null)
      setIsLoading(false)
    }
  }, [])

  const value = {
    user,
    token: null,
    isAuthenticated,
    isLoading,
    isRestoring,
    error,
    login,
    signup,
    logout,
    setUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * Hook to consume AuthContext.
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an <AuthProvider>')
  }
  return context
}

export const useLogin = useAuth
export const LoginProvider = AuthProvider
export const LoginContext = AuthContext
