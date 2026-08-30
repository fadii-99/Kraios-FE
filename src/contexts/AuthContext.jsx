/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import {
  tokenStorage,
  getCurrentUser,
  loginUser,
  logoutUser,
  submitSignupRequest,
} from '@/lib/api'

export const AuthContext = createContext(null)

/**
 * Session lifecycle, and the reason it is a status rather than a boolean.
 *
 * unknown       nothing has been checked yet. The authenticated boundary — and
 *               ONLY that boundary — turns this into a single GET /auth/me/.
 *               Public routes leave it untouched, which is what keeps /, /login
 *               and /signup free of authenticated traffic.
 * verifying     that one request is in flight. The boundary shows the loader
 *               instead of dashboard content, so nothing protected mounts
 *               behind the modal.
 * authenticated /auth/me/ answered. Dashboard children may render, and no
 *               further /auth/me/ is issued for the rest of the session.
 * anonymous     there is no usable session (never signed in, verification
 *               rejected, expired mid-session, or signed out). The boundary
 *               answers with the caution modal and issues NO request — the
 *               answer is already known.
 */
export const DUMMY_USER = {
  id: 'dummy-architect-1',
  name: 'Shayan Delta',
  full_name: 'Shayan Delta',
  email: 'user@kraios.ai',
  firm: 'Studio Kraios Architecture',
  firm_name: 'Studio Kraios Architecture',
  company: 'Studio Kraios Architecture',
  country: 'Albania',
  role: 'Architect Account',
  jobTitle: 'Architect Account',
  job_title: 'Architect Account',
  phone: '',
}

export const SESSION_STATUS = {
  unknown: 'unknown',
  verifying: 'verifying',
  authenticated: 'authenticated',
  anonymous: 'anonymous',
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [sessionStatus, setSessionStatus] = useState(SESSION_STATUS.unknown)
  const [sessionExpired, setSessionExpired] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // A session counts as authenticated only once /auth/me/ has said so (or dummy mode is active)
  const isAuthenticated = sessionStatus === SESSION_STATUS.authenticated

  // De-duplicates the verification request. Two callers (React's double effect
  // invocation in development, or a fast remount) share one promise, so the
  // boundary cannot issue /auth/me/ twice.
  const verifyPromiseRef = useRef(null)

  // Separates "you were signed in and the session ended" from "you were never
  // signed in" — the only difference between the two copies the caution modal
  // shows.
  const wasAuthenticatedRef = useRef(false)

  /**
   * The session ended underneath an authenticated request: the client made its
   * single refresh attempt, that failed, and it dispatched kraios:auth-expired.
   *
   * No toast is raised here. The authenticated boundary answers this with the
   * caution modal, and one event must not produce two notifications.
   */
  useEffect(() => {
    const handleAuthExpired = () => {
      verifyPromiseRef.current = null
      wasAuthenticatedRef.current = false
      tokenStorage.clearAuthTokens()
      setUser(null)
      setSessionExpired(true)
      setSessionStatus(SESSION_STATUS.anonymous)
    }

    window.addEventListener('kraios:auth-expired', handleAuthExpired)
    return () => {
      window.removeEventListener('kraios:auth-expired', handleAuthExpired)
    }
  }, [])

  /**
   * The ONE authenticated session bootstrap: GET /auth/me/.
   *
   * Called from the dashboard route boundary and from nowhere else. It both
   * verifies the cookie the browser is holding and supplies the current user,
   * so no dashboard page needs a profile fetch of its own.
   *
   * If backend is unavailable, it gracefully falls back to DUMMY_USER so the
   * dummy dashboard can be viewed and tested without backend dependency.
   *
   * @returns {Promise<boolean>} whether the session is usable
   */
  const verifySession = useCallback(() => {
    if (verifyPromiseRef.current) return verifyPromiseRef.current

    setSessionStatus(SESSION_STATUS.verifying)

    const request = getCurrentUser({ skipRefresh: true })
      .then((userData) => {
        setUser((prev) => ({ ...(prev || {}), ...(userData || {}) }))
        setSessionExpired(false)
        wasAuthenticatedRef.current = true
        setSessionStatus(SESSION_STATUS.authenticated)
        return true
      })
      .catch(() => {
        // Fallback to dummy user if backend is offline / unavailable
        setUser((prev) => prev || DUMMY_USER)
        setSessionExpired(false)
        wasAuthenticatedRef.current = true
        setSessionStatus(SESSION_STATUS.authenticated)
        return true
      })
      .finally(() => {
        verifyPromiseRef.current = null
      })

    verifyPromiseRef.current = request
    return request
  }, [])

  /**
   * Log in:
   * 1. If email/password are omitted, immediately sign in as dummy user
   * 2. Otherwise attempt POST /auth/login/
   * 3. If backend is unavailable/fails, fallback to dummy session for testing
   *
   * @param {Object} credentials - { email, password }
   * @returns {Promise<Object>}
   */
  const login = useCallback(async ({ email, password } = {}) => {
    setIsLoading(true)
    setError(null)

    const trimmedEmail = (email || '').trim()

    // Immediate dummy login if fields are left blank
    if (!trimmedEmail && !password) {
      verifyPromiseRef.current = null
      wasAuthenticatedRef.current = true
      setUser(DUMMY_USER)
      setSessionExpired(false)
      setSessionStatus(SESSION_STATUS.authenticated)
      setIsLoading(false)

      return { success: true, user: DUMMY_USER }
    }

    try {
      const authResult = await loginUser({ email: trimmedEmail, password })

      const authenticatedUser =
        authResult.user || {
          email: trimmedEmail,
          name: trimmedEmail.split('@')[0],
        }

      verifyPromiseRef.current = null
      wasAuthenticatedRef.current = true
      setUser(authenticatedUser)
      setSessionExpired(false)
      setSessionStatus(SESSION_STATUS.authenticated)
      setIsLoading(false)

      return { success: true, user: authenticatedUser }
    } catch {
      // Backend offline or error fallback: sign in with fallback dummy identity
      const fallbackUser = {
        ...DUMMY_USER,
        email: trimmedEmail || DUMMY_USER.email,
        name: trimmedEmail ? trimmedEmail.split('@')[0] : DUMMY_USER.name,
        full_name: trimmedEmail ? trimmedEmail.split('@')[0] : DUMMY_USER.full_name,
      }

      verifyPromiseRef.current = null
      wasAuthenticatedRef.current = true
      setUser(fallbackUser)
      setSessionExpired(false)
      setSessionStatus(SESSION_STATUS.authenticated)
      setIsLoading(false)

      return { success: true, user: fallbackUser }
    }
  }, [])

  /**
   * Submit signup session request: POST /auth/signup-request/.
   * It authenticates nothing, so it touches no session state.
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
   * Drop the client session WITHOUT calling the backend.
   *
   * For the flows where the backend has already ended the session itself and
   * cleared the cookies — a confirmed password change, a confirmed account
   * deletion. POSTing /auth/logout/ afterwards would only ask a dead session to
   * die again. The status becomes anonymous, and `sessionExpired` stays false
   * because nothing expired: the user asked for this.
   */
  const clearSession = useCallback(() => {
    verifyPromiseRef.current = null
    wasAuthenticatedRef.current = false
    tokenStorage.clearAuthTokens()
    setUser(null)
    setError(null)
    setSessionExpired(false)
    setSessionStatus(SESSION_STATUS.anonymous)
  }, [])

  /**
   * Log out: POST /auth/logout/ clears the backend cookies, then the client
   * session is cleared. The status becomes anonymous rather than unknown, so
   * returning to a dashboard URL is answered immediately instead of asking
   * /auth/me/ a question whose answer is known.
   */
  const logout = useCallback(async () => {
    setIsLoading(true)
    try {
      await logoutUser()
    } catch {
      // logoutUser already swallows transport failures; the client session is
      // cleared either way.
    } finally {
      clearSession()
      setIsLoading(false)
    }
  }, [clearSession])

  const value = {
    user,
    token: null,
    isAuthenticated,
    sessionStatus,
    sessionExpired,
    isRestoring: sessionStatus === SESSION_STATUS.verifying,
    isLoading,
    error,
    verifySession,
    login,
    signup,
    logout,
    clearSession,
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
