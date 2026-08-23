import { Suspense, useCallback, useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import DashboardSidebar from '@/components/dashboard/DashboardSidebar'
import DashboardMobileNav from '@/components/dashboard/DashboardMobileNav'
import DashboardPageSurface from '@/components/dashboard/DashboardPageSurface'
import PageLoader from '@/components/ui/PageLoader'
import ProjectsProvider from '@/lib/dashboard/ProjectsProvider'
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
 */
export default function DashboardLayout() {
  const [ready, setReady] = useState(false)
  const onChange = useCallback((value) => setReady(value), [])

  // Ensure route transitions land at top of view
  useScrollToTop()

  return (
    <ProjectsProvider>
      <div className="tone-light flex h-dvh max-h-dvh overflow-hidden bg-[var(--color-light)] text-[var(--tone-ink)] antialiased">
        {/* Persistent Left Sidebar (Desktop >= 1024px) */}
        <DashboardSidebar />

        {/* Main Right Workspace Area */}
        <div className="relative flex min-w-0 flex-1 flex-col h-dvh max-h-dvh overflow-hidden">
          {/* Mobile Navigation Header (< 1024px) */}
          <DashboardMobileNav />

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
    </ProjectsProvider>
  )
}
