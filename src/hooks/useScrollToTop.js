import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Starts every client-side navigation at the top of the page.
 *
 * React Router keeps the window's scroll position across route changes, so
 * clicking "Sign Up" from halfway down the landing page dropped you into the
 * middle of the auth page.
 *
 * Two deliberate exceptions:
 *
 *  - It skips the first render, so a refresh keeps the browser's own scroll
 *    restoration instead of being yanked to the top.
 *  - It skips when the navigation carries a `scrollTo` target. That is the
 *    Navbar/Footer routing home to reach a landing section — `Home` is about to
 *    scroll there, and jumping to the top first would fight it.
 *
 * `behavior: 'instant'` matters: `html` sets `scroll-behavior: smooth`, so a
 * plain `scrollTo(0, 0)` would animate the whole page height on every route
 * change.
 */
export function useScrollToTop() {
  const { pathname, state } = useLocation()
  const firstRender = useRef(true)

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }

    if (state?.scrollTo) return

    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname, state])
}
