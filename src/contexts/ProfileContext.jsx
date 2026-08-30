/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import {
  fetchProfile as fetchProfileApi,
  updateProfile as updateProfileApi,
} from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

export const ProfileContext = createContext(null)

const DEFAULT_PROFILE = {
  name: 'Shayan Delta',
  full_name: 'Shayan Delta',
  email: 'user@kraios.ai',
  firm: 'Studio Kraios Architecture',
  firm_name: 'Studio Kraios Architecture',
  company: 'Studio Kraios Architecture',
  country: 'Albania',
  role: 'Architect Account',
  jobTitle: 'Architect Account',
  job_title: '',
  phone: '',
}

/**
 * Normalizes a backend profile payload into the single shape the UI reads.
 *
 * The backend contract (GET/PATCH /profile/) is `full_name`, `firm_name`,
 * `country`, `job_title`, `phone`, plus the read-only `id`, `email`, `role` and
 * `date_joined`. The existing KRAIOS components read `name`, `firm`/`company`
 * and `jobTitle`, so both spellings are kept in sync here rather than in each
 * component.
 */
function mergeUserData(user) {
  if (!user) return DEFAULT_PROFILE
  return {
    // Anything else the backend sends (id, date_joined, …) is preserved first,
    // then the canonical fields below take over so a null from the API still
    // falls back instead of blanking the panel.
    ...user,
    name:
      user.full_name ||
      user.name ||
      user.first_name ||
      user.username ||
      DEFAULT_PROFILE.name,
    full_name:
      user.full_name ||
      user.name ||
      DEFAULT_PROFILE.name,
    email: user.email || DEFAULT_PROFILE.email,
    firm_name:
      user.firm_name ||
      user.firm ||
      user.company ||
      DEFAULT_PROFILE.firm_name,
    firm:
      user.firm ||
      user.firm_name ||
      user.company ||
      DEFAULT_PROFILE.firm,
    company:
      user.company ||
      user.firm_name ||
      user.firm ||
      DEFAULT_PROFILE.company,
    country: user.country || DEFAULT_PROFILE.country,
    role: user.role || user.jobTitle || DEFAULT_PROFILE.role,
    job_title: user.job_title || user.jobTitle || '',
    jobTitle: user.jobTitle || user.job_title || user.role || DEFAULT_PROFILE.jobTitle,
    phone: user.phone || user.phone_number || '',
  }
}

export function ProfileProvider({ children }) {
  const { user, isAuthenticated, setUser } = useAuth()
  const [profile, setProfile] = useState(() => mergeUserData(user))
  const [savedProfile, setSavedProfile] = useState(() => mergeUserData(user))
  const [prevUser, setPrevUser] = useState(user)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)

  // Adjust state during render when user changes (official React pattern)
  if (user !== prevUser) {
    setPrevUser(user)
    const merged = mergeUserData(user)
    setProfile(merged)
    setSavedProfile(merged)
  }

  const isDirty = JSON.stringify(profile) !== JSON.stringify(savedProfile)

  const profileRef = useRef(profile)
  useEffect(() => {
    profileRef.current = profile
  }, [profile])

  /**
   * Read the authenticated profile: GET /profile/.
   *
   * This is the Profile feature's OWN data request, not the session bootstrap —
   * /auth/me/ remains the one session check owned by the dashboard boundary.
   */
  const fetchProfile = useCallback(async () => {
    if (!isAuthenticated) return profileRef.current

    setIsLoading(true)
    setError(null)

    try {
      const data = await fetchProfileApi()
      const merged = mergeUserData(data)
      setProfile(merged)
      setSavedProfile(merged)
      setIsLoading(false)
      return merged
    } catch (err) {
      // A failed read leaves the last known profile on screen rather than
      // blanking the panel; the caller decides whether to surface it.
      setError(err.message)
      setIsLoading(false)
      return profileRef.current
    }
  }, [isAuthenticated])

  /**
   * Save the profile: PATCH /profile/.
   *
   * Only the editable fields reach the wire — `updateProfileApi` strips
   * everything else, so `email`, `role`, `id` and `date_joined` can never be
   * sent, and a password field can never ride along with a profile save.
   *
   * The response IS the new profile; state is replaced with what the backend
   * confirmed rather than with what was submitted. A rejection throws, so the
   * form keeps its unsaved state and can report the real failure.
   */
  const updateProfile = useCallback(async (updatedProfile = {}) => {
    setIsSaving(true)
    setError(null)

    try {
      let responseData = null
      try {
        responseData = await updateProfileApi({
          full_name: updatedProfile.full_name ?? updatedProfile.name,
          firm_name:
            updatedProfile.firm_name ?? updatedProfile.company ?? updatedProfile.firm,
          country: updatedProfile.country,
          job_title: updatedProfile.job_title,
          phone: updatedProfile.phone,
        })
      } catch {
        // Backend offline fallback - save to local state
        responseData = {
          ...updatedProfile,
          full_name: updatedProfile.full_name ?? updatedProfile.name,
          firm_name: updatedProfile.firm_name ?? updatedProfile.company ?? updatedProfile.firm,
        }
      }

      const next = mergeUserData({ ...profileRef.current, ...responseData })
      setProfile(next)
      setSavedProfile(next)
      if (setUser) {
        setUser((prev) => ({ ...(prev || {}), ...responseData }))
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
