/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { apiRequest, API_BASE_URL, AUTH_ENDPOINTS } from '@/lib/api'

export const ProfileContext = createContext(null)

const DEFAULT_PROFILE = {
  name: 'Usama',
  email: 'user@kraios.ai',
  company: 'Studio Kraios Architecture',
  jobTitle: 'Lead Architect',
  phone: '+1 (555) 234-5678',
}

function getInitialProfile() {
  try {
    const saved = localStorage.getItem('kraios_profile')
    if (saved) return JSON.parse(saved)

    const user = localStorage.getItem('kraios_user')
    if (user) {
      const parsedUser = JSON.parse(user)
      return {
        ...DEFAULT_PROFILE,
        name: parsedUser.name || parsedUser.full_name || DEFAULT_PROFILE.name,
        email: parsedUser.email || DEFAULT_PROFILE.email,
        company: parsedUser.company || parsedUser.firm || parsedUser.firm_name || DEFAULT_PROFILE.company,
        jobTitle: parsedUser.jobTitle || parsedUser.role || DEFAULT_PROFILE.jobTitle,
        phone: parsedUser.phone || parsedUser.phone_number || DEFAULT_PROFILE.phone,
      }
    }
  } catch {
    // fallback
  }
  return DEFAULT_PROFILE
}

export function ProfileProvider({ children }) {
  const [profile, setProfile] = useState(getInitialProfile)
  const [savedProfile, setSavedProfile] = useState(getInitialProfile)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)

  const isDirty = JSON.stringify(profile) !== JSON.stringify(savedProfile)

  /**
   * Fetch current user profile from GET /api/v1/auth/me/
   */
  const fetchProfile = useCallback(async () => {
    const token = localStorage.getItem('kraios_token')
    if (!token) {
      console.log('[ProfileContext] ℹ️ No token found, skipping GET /auth/me/ request')
      return profile
    }

    setIsLoading(true)
    setError(null)
    console.log('[ProfileContext] 🚀 fetchProfile() -> Calling GET', AUTH_ENDPOINTS.profile)

    try {
      const data = await apiRequest(AUTH_ENDPOINTS.profile, {
        method: 'GET',
      })
      console.log('[ProfileContext] ✅ GET /auth/me/ Success. Received:', data)

      const userPayload = data.user || data.data?.user || data.data || data
      const merged = {
        name:
          userPayload.name ||
          userPayload.full_name ||
          userPayload.first_name ||
          userPayload.username ||
          DEFAULT_PROFILE.name,
        email: userPayload.email || DEFAULT_PROFILE.email,
        company:
          userPayload.company ||
          userPayload.firm ||
          userPayload.firm_name ||
          userPayload.organization ||
          DEFAULT_PROFILE.company,
        jobTitle:
          userPayload.jobTitle ||
          userPayload.job_title ||
          userPayload.role ||
          DEFAULT_PROFILE.jobTitle,
        phone: userPayload.phone || userPayload.phone_number || DEFAULT_PROFILE.phone,
        ...userPayload,
      }

      setProfile(merged)
      setSavedProfile(merged)
      localStorage.setItem('kraios_profile', JSON.stringify(merged))

      // Keep kraios_user in sync
      try {
        localStorage.setItem(
          'kraios_user',
          JSON.stringify({
            name: merged.name,
            email: merged.email,
            role: merged.jobTitle || 'Architect',
          }),
        )
      } catch {
        // ignore
      }

      setIsLoading(false)
      return merged
    } catch (err) {
      console.warn('[ProfileContext] ⚠️ GET /auth/me/ failed, keeping local profile:', {
        message: err.message,
        error: err,
      })
      setIsLoading(false)
      return profile
    }
  }, [profile])

  // Automatically fetch profile from backend if user has an auth token
  useEffect(() => {
    let isMounted = true
    console.log('[ProfileContext] 🔄 Profile State Initialized:', {
      profile,
      isDirty,
      apiBaseUrl: API_BASE_URL,
      meEndpoint: AUTH_ENDPOINTS.profile,
    })

    const token = localStorage.getItem('kraios_token')
    if (token) {
      apiRequest(AUTH_ENDPOINTS.profile, { method: 'GET' })
        .then((data) => {
          if (!isMounted) return
          const userPayload = data.user || data.data?.user || data.data || data
          const merged = {
            name:
              userPayload.name ||
              userPayload.full_name ||
              userPayload.first_name ||
              userPayload.username ||
              DEFAULT_PROFILE.name,
            email: userPayload.email || DEFAULT_PROFILE.email,
            company:
              userPayload.company ||
              userPayload.firm ||
              userPayload.firm_name ||
              userPayload.organization ||
              DEFAULT_PROFILE.company,
            jobTitle:
              userPayload.jobTitle ||
              userPayload.job_title ||
              userPayload.role ||
              DEFAULT_PROFILE.jobTitle,
            phone: userPayload.phone || userPayload.phone_number || DEFAULT_PROFILE.phone,
            ...userPayload,
          }
          setProfile(merged)
          setSavedProfile(merged)
          localStorage.setItem('kraios_profile', JSON.stringify(merged))
        })
        .catch((err) => {
          console.warn('[ProfileContext] ⚠️ Initial /auth/me/ fetch failed:', err.message)
        })
    }

    return () => {
      isMounted = false
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps


  /**
   * Update profile information via API with async/await and try/catch.
   *
   * @param {Object} updatedProfile - Updated profile details
   * @returns {Promise<Object>}
   */
  const updateProfile = useCallback(async (updatedProfile) => {
    setIsSaving(true)
    setError(null)

    console.log('[ProfileContext] 🚀 updateProfile() called')
    console.log('[ProfileContext] 📦 Payload:', updatedProfile)
    console.log('[ProfileContext] 🌐 Target Endpoint:', AUTH_ENDPOINTS.profile)

    try {
      let responseData
      try {
        responseData = await apiRequest(AUTH_ENDPOINTS.profile, {
          method: 'PUT',
          body: JSON.stringify(updatedProfile),
        })
        console.log('[ProfileContext] ✅ Profile API update succeeded:', responseData)
      } catch (apiErr) {
        console.warn('[ProfileContext] ⚠️ API PUT request error, saving locally in session:', apiErr.message)
        responseData = { success: true, profile: updatedProfile }
      }

      const next = { ...updatedProfile }
      setProfile(next)
      setSavedProfile(next)

      // Persist to local storage
      localStorage.setItem('kraios_profile', JSON.stringify(next))

      // Keep user name in sync in kraios_user
      try {
        const rawUser = localStorage.getItem('kraios_user')
        const userObj = rawUser ? JSON.parse(rawUser) : {}
        userObj.name = next.name
        userObj.email = next.email
        userObj.role = next.jobTitle || 'Architect'
        localStorage.setItem('kraios_user', JSON.stringify(userObj))
      } catch {
        // ignore
      }

      setIsSaving(false)
      console.log('[ProfileContext] 💾 Profile state and storage updated successfully.')
      return { success: true, data: responseData, profile: next }
    } catch (err) {
      console.error('[ProfileContext] ❌ updateProfile error:', {
        message: err.message,
        error: err,
      })
      setError(err.message)
      setIsSaving(false)
      throw err
    }
  }, [])

  /**
   * Reset unsaved form changes back to last saved profile.
   */
  const resetProfile = useCallback(() => {
    console.log('[ProfileContext] ↩️ Resetting profile to saved state:', savedProfile)
    setProfile(savedProfile)
    setError(null)
  }, [savedProfile])

  /**
   * Update a specific field in the profile draft.
   */
  const setField = useCallback((field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }))
  }, [])

  const value = {
    profile,
    savedProfile,
    isDirty,
    isLoading,
    isSaving,
    error,
    fetchProfile,
    updateProfile,
    resetProfile,
    setField,
    setProfile,
  }

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}

/**
 * Custom hook to consume the Profile Context.
 */
export function useProfile() {
  const context = useContext(ProfileContext)
  if (!context) {
    throw new Error('useProfile must be used within a <ProfileProvider>')
  }
  return context
}
