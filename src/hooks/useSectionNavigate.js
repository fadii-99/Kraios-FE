import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { scrollToSection } from '@/lib/scroll'

/**
 * Landing-section navigation that works from any route.
 *
 * On `/` the sections are mounted, so we simply scroll. From an auth page there
 * is nothing to scroll to — `scrollToSection` finds no element and returns
 * silently — so we route home and hand the target to `Home` through router
 * state, which scrolls once the sections have laid out.
 *
 * Shared by the Navbar and the Footer so the two can never drift: before this
 * existed the Footer called `scrollToSection` directly and its links did
 * nothing at all on /login, /forgot-password and /signup.
 */
export function useSectionNavigate() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const onHome = pathname === '/'

  const goToSection = useCallback(
    (id) => {
      if (onHome) {
        requestAnimationFrame(() => scrollToSection(id))
        return
      }

      navigate('/', { state: { scrollTo: id } })
    },
    [navigate, onHome],
  )

  return { onHome, goToSection }
}
