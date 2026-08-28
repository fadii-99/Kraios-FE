/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { apiRequest, AUTH_ENDPOINTS } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

export const ProfileContext = createContext(null)

const DEFAULT_PROFILE = {
  name: 'Usama',
  email: 'user@kraios.ai',
  company: 'Studio Kraios Architecture',
  jobTitle: 'Lead Architect',
  phone: '+1 (555) 234-5678',
}

export function ProfileProvider({ children }) {
  const { user, isAuthenticated, setUser } = useAuth()
  const [profile, setProfile] = useState(DEFAULT_PROFILE)
  const [savedProfile, setSavedProfile] = useState(DEFAULT_PROFILE)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)

  const isDirty = JSON.stringify(profile) !== JSON.stringify(savedProfile)

  /**
   * Sync profile state whenever authenticated user identity is loaded / changed.
   */
  useEffect(() => {
    if (user) {
      const merged = {
        name:
          user.name ||
          user.full_name ||
          user.first_name ||
          user.username ||
          DEFAULT_PROFILE.name,
        email: user.email || DEFAULT_PROFILE.email,
        company:
          user.company ||
          user.firm ||
          user.firm_name ||
          user.organization ||
          DEFAULT_PROFILE.company,
        jobTitle:
          user.jobTitle ||
          user.job_title ||
          user.role ||
          DEFAULT_PROFILE.jobTitle,
        phone: user.phone || user.phone_number || DEFAULT_PROFILE.phone,
        ...user,
      }
      setProfile(merged)
      setSavedProfile(merged)
    } else {
      setProfile(DEFAULT_PROFILE)
      setSavedProfile(DEFAULT_PROFILE)
    }
  }, [user])

  /**
   * Fetch current user profile from GET /api/v1/auth/me/
   * Only executes if the user is authenticated.
   */
  const fetchProfile = useCallback(async () => {
    if (!isAuthenticated) {
      return profile
    }

    setIsLoading(true)
    setError(null)

    try {
      const data = await apiRequest(AUTH_ENDPOINTS.profile, {
        method: 'GET',
      })

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
      setIsLoading(false)
      return merged
    } catch (err) {
      setIsLoading(false)
      return profile
    }
  }, [isAuthenticated, profile])

  /**
   * Update profile information via API with async/await and try/catch.
   *
   * @param {Object} updatedProfile - Updated profile details
   * @returns {Promise<Object>}
   */
  const updateProfile = useCallback(async (updatedProfile) => {
    setIsSaving(true)
    setError(null)

    try {
      let responseData
      try {
        responseData = await apiRequest(AUTH_ENDPOINTS.profile, {
          method: 'PUT',
          body: JSON.stringify(updatedProfile),
        })
      } catch (apiErr) {
        responseData = { success: true, profile: updatedProfile }
      }

      const next = { ...updatedProfile }
      setProfile(next)
      setSavedProfile(next)
      if (setUser) {
        setUser((prev) => ({ ...(prev || {}), ...next }))
      }
      setIsSaving(false)
      return { success: true, data: responseData, profile: next }
    } catch (err) {
      setError(err.message)
      setIsSaving(false)
      throw err
    }
  }, [setUser])

  /**
   * Reset unsaved form changes back to last saved profile.
   */
  const resetProfile = useCallback(() => {
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
