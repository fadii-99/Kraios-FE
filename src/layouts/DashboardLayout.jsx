import { Suspense, useCallback, useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import DashboardSidebar from '@/components/dashboard/DashboardSidebar'
import DashboardMobileNav from '@/components/dashboard/DashboardMobileNav'
import DashboardPageSurface from '@/components/dashboard/DashboardPageSurface'
import DiscardProjectModal from '@/components/dashboard/projects/workflow/shared/DiscardProjectModal'
import AuthRequiredModal from '@/components/dashboard/AuthRequiredModal'
import PageLoader from '@/components/ui/PageLoader'
import ProjectsProvider from '@/lib/dashboard/projects/ProjectsProvider'
import { SESSION_STATUS, useAuth } from '@/contexts/AuthContext'
import { useScrollToTop } from '@/hooks/useScrollToTop'
import { cn } from '@/lib/cn'

/**
 * Reports that the lazy route chunk has loaded and mounted.
 */
function RouteReady({ onChange }) {
  useEffect(() => {
    onChange(true)
    return () => onChange(false)
  }, [onChange])

  return null
}

/**
 * The authenticated boundary and shell for the whole dashboard.
 *
 * This layout mounts for VALID dashboard routes only. An address like
 * /dashboard/banana matches no route in this branch, so React Router falls
 * through to the global `*` route and answers it as a page that does not exist
 * — a bad URL is never answered as a login wall. That precedence lives in the
 * route table, which is why no route list is restated here.
 *
 * Three states, resolved in order:
 *
 * 1. Session unverified — the ONE GET /auth/me/ bootstrap runs and the shared
 *    loader holds the surface. No protected content mounts behind it, so there
 *    is no flash of sidebar, projects or workflow before access is decided.
 * 2. No session — the red caution modal on the light surface. No request is
 *    made: the status already says there is nothing to verify.
 * 3. Verified — ProjectsProvider, sidebar / mobile nav, page surface, Outlet.
 *
 * Also owned here: useScrollToTop and the DiscardProjectModal guard for
 * navigating away from an active project workflow.
 */
export default function DashboardLayout() {
  const { isAuthenticated, sessionStatus, sessionExpired, verifySession } = useAuth()
  const [ready, setReady] = useState(false)
  const [discardModalOpen, setDiscardModalOpen] = useState(false)
  const [pendingPath, setPendingPath] = useState(null)

  const location = useLocation()
  const navigate = useNavigate()
  const onChange = useCallback((value) => setReady(value), [])

  // The single authenticated bootstrap. It runs on entering the dashboard with
  // an unverified session and never again: navigating Overview → Projects →
  // Profile leaves the status `authenticated`, so no child route refetches the
  // user, and signing out leaves it `anonymous`, so no request is made to
  // confirm what is already known.
  useEffect(() => {
    if (sessionStatus === SESSION_STATUS.unknown) {
      verifySession()
    }
  }, [sessionStatus, verifySession])

  // Navigation guard: intercepts sidebar/nav clicks when inside an active project workflow
  const handleNavClick = useCallback(
    (targetPath, e) => {
      const isInside = /^\/dashboard\/projects\/[^/]+/.test(location.pathname)
      const isCurrentPath = location.pathname === targetPath

      if (isInside && !isCurrentPath) {
        if (e?.preventDefault) e.preventDefault()
        setPendingPath(targetPath)
        setDiscardModalOpen(true)
        return false
      }
      return true
    },
    [location.pathname],
  )

  const handleConfirmDiscard = useCallback(() => {
    setDiscardModalOpen(false)
    if (pendingPath) {
      const dest = pendingPath
      setPendingPath(null)
      navigate(dest)
    }
  }, [navigate, pendingPath])

  const handleCancelDiscard = useCallback(() => {
    setDiscardModalOpen(false)
    setPendingPath(null)
  }, [])

  // Ensure route transitions land at top of view
  useScrollToTop()

  // 1. Session not yet decided — hold the surface with the shared loader.
  if (
    sessionStatus === SESSION_STATUS.unknown ||
    sessionStatus === SESSION_STATUS.verifying
  ) {
    return (
      <div className="tone-light flex h-dvh w-full items-center justify-center bg-[var(--color-light)]">
        <PageLoader variant="inline" label="Loading" />
      </div>
    )
  }

  // 2. Valid dashboard route, no session — red caution modal. The attempted
  //    address travels with it, so signing in returns here.
  if (!isAuthenticated) {
    return (
      <div className="tone-light flex h-dvh w-full items-center justify-center bg-[var(--color-light)]">
        <AuthRequiredModal
          open
          expired={sessionExpired}
          from={`${location.pathname}${location.search}`}
        />
      </div>
    )
  }

  return (
    <ProjectsProvider>
      <div className="tone-light flex h-dvh max-h-dvh overflow-hidden bg-[var(--color-light)] text-[var(--tone-ink)] antialiased">
        {/* Persistent Left Sidebar (Desktop >= 1024px) */}
        <DashboardSidebar onNavigate={handleNavClick} />

        {/* Main Right Workspace Area */}
        <div className="relative flex min-w-0 flex-1 flex-col h-dvh max-h-dvh overflow-hidden">
          {/* Mobile Navigation Header (< 1024px) */}
          <DashboardMobileNav onNavigate={handleNavClick} />

          {/* Centered Loader in the Right Workspace during loading */}
          <div
            className={cn(
              'absolute inset-0 z-40 flex items-center justify-center transition-opacity duration-500 ease-[var(--ease-out-expo)]',
              ready ? 'pointer-events-none opacity-0' : 'opacity-100',
            )}
          >
            <PageLoader variant="inline" label="Loading" hidden={ready} />
          </div>

          {/* Dynamic Dashboard Page Surface & Content — Reveals after loading finishes */}
          <main
            id="dashboard-main"
            className={cn(
              'relative flex min-h-0 flex-1 flex-col overflow-hidden p-2 sm:p-2.5 lg:p-3 xl:p-3.5 transition-opacity duration-500 ease-[var(--ease-out-expo)]',
              ready ? 'opacity-100' : 'pointer-events-none opacity-0',
            )}
          >
            <DashboardPageSurface>
              <Suspense fallback={null}>
                <RouteReady onChange={onChange} />
                <Outlet />
              </Suspense>
            </DashboardPageSurface>
          </main>
        </div>
      </div>

      {/* Discard Project Confirmation Modal */}
      <DiscardProjectModal
        open={discardModalOpen}
        onClose={handleCancelDiscard}
        onConfirm={handleConfirmDiscard}
      />
    </ProjectsProvider>
  )
}
