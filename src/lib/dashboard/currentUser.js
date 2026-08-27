import { tokenStorage } from '@/lib/api/tokenStorage'

/**
 * The signed-in user — identity helper reading from session storage or fallback.
 */
function getCurrentUser() {
  const user = tokenStorage.getUser()
  if (user) {
    return {
      name: user.name || user.full_name || user.email?.split('@')[0] || 'Usama',
      role: user.role || user.jobTitle || 'Architect Account',
      email: user.email || '',
    }
  }
  return {
    name: 'Usama',
    role: 'Architect Account',
  }
}

export const currentUser = getCurrentUser()



