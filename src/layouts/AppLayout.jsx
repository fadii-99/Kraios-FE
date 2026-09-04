import { Suspense, useCallback, useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'

import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import PageLoader from '@/components/ui/PageLoader'
import { useHistoryFloor } from '@/hooks/useHistoryFloor'
import { useScrollToTop } from '@/hooks/useScrollToTop'

/**
 * Renders nothing. It only exists to report that the lazy route resolved:
 * it mounts as a sibling of the Outlet *inside* Suspense, so it cannot mount
 * until the page chunk has arrived, and it unmounts if the boundary suspends
 * again on a later navigation.
 */
function RouteReady({ onChange }) {
  useEffect(() => {
    onChange(true)
    return () => onChange(false)
  }, [onChange])

  return null
}

/**
 * The single parent route. The Navbar and Footer live here and nowhere else —
 * no page renders its own — and every page arrives through the Outlet.
 *
 * The loader is deliberately NOT the Suspense fallback. A fallback is unmounted
 * the instant the chunk resolves, which leaves no opportunity to animate it
 * away. Instead the overlay stays mounted and `RouteReady` flips it, so it can
 * fade out smoothly.
 */
export default function AppLayout() {
  const [ready, setReady] = useState(false)
  const onChange = useCallback((value) => setReady(value), [])

  // every route change lands at the top — see the hook for the two exceptions
  useScrollToTop()

  // Back cannot walk off a floor entry — the /login this layout is handed
  // after signing out
  useHistoryFloor()

  return (
    <>
      <Navbar />

      <PageLoader hidden={ready} />

      <Suspense fallback={null}>
        <RouteReady onChange={onChange} />
        <Outlet />
      </Suspense>

      <Footer />
    </>
  )
}
