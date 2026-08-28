/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import {
  tokenStorage,
  loginUser,
  submitSignupRequest,
  getCurrentUser,
  API_BASE_URL,
} from '@/lib/api'
import { showErrorToast } from '@/lib/toast'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => tokenStorage.getUser())
  const [token, setToken] = useState(() => tokenStorage.getAccessToken())
  const [isLoading, setIsLoading] = useState(false)
  const [isRestoring, setIsRestoring] = useState(() => Boolean(tokenStorage.getAccessToken()))
  const [error, setError] = useState(null)

  const isAuthenticated = Boolean(token)

  /**
   * Session bootstrap on initial application load:
   * If a stored access token exists, verify it with GET /auth/me/
   * If 401 Unauthorized, clear session immediately (no refresh endpoint exists).
   */
  useEffect(() => {
    let isMounted = true
    const currentToken = tokenStorage.getAccessToken()

    console.log('[AuthContext] 🔄 Bootstrapping Auth State:', {
      hasToken: Boolean(currentToken),
      apiBaseUrl: API_BASE_URL,
    })

    if (!currentToken) {
      return
    }


    getCurrentUser(currentToken)
      .then((userData) => {
        if (!isMounted) return
        console.log('[AuthContext] ✅ Session restored successfully:', userData)
        tokenStorage.setUser(userData)
        setUser(userData)
        setToken(currentToken)
        setIsRestoring(false)
      })
      .catch((err) => {
        if (!isMounted) return
        console.warn('[AuthContext] ⚠️ Session restore error:', err.message)
        // If 401 Unauthorized, token is expired or invalid
        if (err.status === 401) {
          tokenStorage.clearAuthTokens()
          setUser(null)
          setToken(null)
          showErrorToast('Your session has expired. Please sign in again.', {
            id: 'session-expired',
          })
        }
        setIsRestoring(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  /**
   * Log in user:
   * 1. POST /auth/login/
   * 2. Store access & refresh tokens centrally
   * 3. GET /auth/me/ with Bearer access token
   * 4. Save and return real user state
   *
   * @param {Object} credentials - { email, password }
   * @returns {Promise<Object>}
   */
  const login = useCallback(async ({ email, password }) => {
    setIsLoading(true)
    setError(null)

    try {
      // 1. Submit login credentials
      const authResult = await loginUser({ email, password })
      const { accessToken, refreshToken } = authResult

      if (!accessToken) {
        throw new Error('No access token received from authentication server.')
      }

      // 2. Centrally persist tokens
      tokenStorage.setAccessToken(accessToken)
      if (refreshToken) {
        tokenStorage.setRefreshToken(refreshToken)
      }
      setToken(accessToken)

      // 3. Fetch verified user identity from GET /auth/me/
      let verifiedUser = authResult.user
      try {
        verifiedUser = await getCurrentUser(accessToken)
        console.log('[AuthContext] ✅ Current user loaded from /auth/me/:', verifiedUser)
      } catch (meErr) {
        console.warn('[AuthContext] ⚠️ Failed to fetch /auth/me/ during login:', meErr.message)
        if (!verifiedUser) {
          verifiedUser = { email, name: email.split('@')[0] }
        }
      }

      // 4. Save verified user in storage and context
      tokenStorage.setUser(verifiedUser)
      setUser(verifiedUser)
      setIsLoading(false)

      return { success: true, user: verifiedUser, accessToken }
    } catch (err) {
      console.error('[AuthContext] ❌ Login failed:', err.message)
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
      console.log('MEssage is    .........', response)
      setIsLoading(false)
      return { success: true, data: response }
    } catch (err) {
      console.error('[AuthContext] ❌ Signup request failed:', err.message)
      setError(err.message)
      setIsLoading(false)
      throw err
    }
  }, [])

  /**
   * Local logout:
   * Clears stored access token, refresh token, and user session.
   * (No backend logout endpoint exists).
   */
  const logout = useCallback(() => {
    console.log('[AuthContext] 🚪 Performing local logout...')
    tokenStorage.clearAuthTokens()
    setUser(null)
    setToken(null)
    setError(null)
  }, [])

  const value = {
    user,
    token,
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
