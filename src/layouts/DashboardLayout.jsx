import { Suspense, useCallback, useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import DashboardSidebar from '@/components/dashboard/DashboardSidebar'
import DashboardMobileNav from '@/components/dashboard/DashboardMobileNav'
import DashboardPageSurface from '@/components/dashboard/DashboardPageSurface'
import DiscardProjectModal from '@/components/dashboard/projects/workflow/shared/DiscardProjectModal'
import PageLoader from '@/components/ui/PageLoader'
import ProjectsProvider from '@/lib/dashboard/projects/ProjectsProvider'
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
 * Dedicated layout for the authenticated Kraios dashboard (Light Theme).
 *
 * Architecture:
 * - Persistent Left Sidebar (Desktop >= 1024px)
 * - Mobile Navigation Header (< 1024px)
 * - Loading Phase: Centered loader in the right workspace area
 * - Ready Phase: Right-side white canvas (`DashboardPageSurface`), background grid,
 *   divs, and page content smoothly reveal after loading finishes.
 * - Project Workflow Guard: Shows Discard Project Modal when navigating away from any active project step.
 */
export default function DashboardLayout() {
  const [ready, setReady] = useState(false)
  const [discardModalOpen, setDiscardModalOpen] = useState(false)
  const [pendingPath, setPendingPath] = useState(null)

  const location = useLocation()
  const navigate = useNavigate()
  const onChange = useCallback((value) => setReady(value), [])

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

  /**
   * EVERY dashboard route renders in this one shell — the Design Assistant
   * included. Nothing below branches on the route. "Full screen" for that
   * workspace means the full RIGHT-HAND workspace: the assistant is a sibling
   * of `ProjectWorkspace` in the router, so it already arrives without the
   * stepper and the Previous / Next bar, and that is all the room it needs.
   */
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
