import { useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ArrowClockwise, FolderSimpleDashed, WarningCircle } from '@phosphor-icons/react'
import CreateProjectModal from '@/components/dashboard/projects/library/CreateProjectModal'
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader'
import ProjectGrid from '@/components/dashboard/projects/library/ProjectGrid'
import PageLoader from '@/components/ui/PageLoader'
import PrimaryButton from '@/components/ui/PrimaryButton'
import { DASHBOARD_GUTTER } from '@/lib/dashboard/layout'
import {
  RESOURCE_STATUS,
  useProjects,
} from '@/lib/dashboard/projects/projectsContext'
import { DASHBOARD_MOTION } from '@/lib/dashboard/motion'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { cn } from '@/lib/cn'

/**
 * Project library (/dashboard/projects) — all projects, never one project's
 * workflow.
 *
 * Sequenced architectural reveal:
 * - Header: eyebrow rule → eyebrow text & title → CTA button
 * - Empty state (if 0 projects): icon plate settle → heading & description
 * - Grid state (if > 0 projects): project cards staggered entrance
 */
export default function Projects() {
  const { projects, projectsStatus, projectsError, loadProjects } = useProjects()
  const [modalOpen, setModalOpen] = useState(false)
  const hasProjects = projects.length > 0
  const scope = useRef(null)
  const reduced = usePrefersReducedMotion()

  // The list is loaded once by the store when the dashboard mounts. Three
  // states are possible here and they are genuinely different: still loading,
  // failed to load, and loaded-and-empty. Showing the "No Projects Yet" empty
  // state for the first two would claim the account has no projects when the
  // truth is that nobody has managed to ask yet.
  const isFirstLoad = projectsStatus === RESOURCE_STATUS.loading && !hasProjects
  const hasFailed = projectsStatus === RESOURCE_STATUS.error && !hasProjects

  useGSAP(
    () => {
      if (reduced) return

      const tl = gsap.timeline({ defaults: { ease: DASHBOARD_MOTION.ease } })

      // 1. Header rule draws out from left
      tl.fromTo(
        '[data-header-rule]',
        { scaleX: 0 },
        { scaleX: 1, duration: 0.4 },
        0,
      )

      // 2. Header eyebrow and page title reveal
      tl.fromTo(
        '[data-header-eyebrow], [data-header-title]',
        { opacity: 0, y: DASHBOARD_MOTION.ySmall },
        { opacity: 1, y: 0, duration: DASHBOARD_MOTION.durationFast, stagger: 0.04 },
        0.06,
      )

      // 3. Primary CTA button in header
      tl.fromTo(
        '[data-header-slot]',
        { opacity: 0, y: DASHBOARD_MOTION.ySmall },
        { opacity: 1, y: 0, duration: DASHBOARD_MOTION.durationFast },
        0.14,
      )

      // 4. If empty state, reveal icon plate & copy
      if (!hasProjects) {
        tl.fromTo(
          '[data-empty-icon]',
          { opacity: 0, scale: 0.92, y: DASHBOARD_MOTION.ySmall },
          { opacity: 1, scale: 1, y: 0, duration: DASHBOARD_MOTION.duration },
          0.18,
        ).fromTo(
          '[data-empty-text]',
          { opacity: 0, y: DASHBOARD_MOTION.ySmall },
          { opacity: 1, y: 0, duration: DASHBOARD_MOTION.durationFast, stagger: 0.04 },
          0.26,
        )
      }
    },
    { scope, dependencies: [reduced, hasProjects] },
  )

  return (
    <div ref={scope} className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <DashboardPageHeader eyebrow="Project Library" title="Projects">
        <PrimaryButton
          type="button"
          size="compact"
          className="w-full sm:w-auto"
          onClick={() => setModalOpen(true)}
        >
          Create New Project
        </PrimaryButton>
      </DashboardPageHeader>

      {isFirstLoad ? (
        /* STATE 0: THE LIST IS STILL ARRIVING */
        <div className="flex flex-1 items-center justify-center py-8">
          <PageLoader variant="inline" label="Loading Projects" />
        </div>
      ) : hasFailed ? (
        /* STATE 0b: THE LIST COULD NOT BE LOADED */
        <div
          className={cn(
            'relative flex flex-1 items-center justify-center overflow-y-auto py-8 sm:py-10 lg:py-12',
            DASHBOARD_GUTTER,
          )}
        >
          <div className="relative flex max-w-md flex-col items-center text-center">
            <div
              className="flex h-20 w-20 items-center justify-center rounded-md border border-amber-500/25 bg-amber-50/80 shadow-[0_4px_16px_rgba(181,71,8,0.08)]"
              aria-hidden="true"
            >
              <WarningCircle size={38} weight="regular" className="text-[var(--color-warning)]" />
            </div>

            <h2
              className="mt-5 text-[1.25rem] font-bold uppercase leading-tight tracking-[0.02em] text-[var(--tone-ink)] sm:text-[1.5rem]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Projects Unavailable
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--tone-muted-dark)]">
              {projectsError?.message || 'Your projects could not be loaded right now.'}
            </p>

            <PrimaryButton
              type="button"
              size="compact"
              variant="outline"
              withArrow={false}
              className="mt-6"
              onClick={() => {
                loadProjects().catch(() => {
                  // The failure stays on the panel above; retrying is the
                  // action, and a toast would only repeat what is on screen.
                })
              }}
            >
              <span className="inline-flex items-center gap-2">
                <ArrowClockwise size={15} weight="bold" aria-hidden="true" />
                Try Again
              </span>
            </PrimaryButton>
          </div>
        </div>
      ) : !hasProjects ? (
        /* STATE 1: NO PROJECTS YET */
        <div
          className={cn(
            // `overflow-y-auto`, not `hidden`: a landscape phone leaves this
            // band ~200px tall, and a clipped empty state has no way out.
            'relative flex flex-1 items-center justify-center overflow-y-auto py-8 sm:py-10 lg:py-12',
            DASHBOARD_GUTTER,
          )}
        >
          <div className="relative flex flex-col items-center text-center">
            <div
              data-empty-icon
              className="flex h-20 w-20 items-center justify-center rounded-md border border-rose-500/25 bg-rose-50/80 shadow-[0_4px_16px_rgba(225,29,72,0.08)]"
              aria-hidden="true"
            >
              <FolderSimpleDashed
                size={38}
                weight="regular"
                className="text-rose-500"
              />
            </div>


            <div data-empty-text className="contents">
              <h2
                className="mt-5 text-[1.25rem] font-bold uppercase leading-tight tracking-[0.02em] text-[var(--tone-ink)] sm:text-[1.5rem]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                No Projects Yet
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--tone-muted-dark)]">
                Create a project to upload a floor plan and generate your 3D model.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* STATE 2: PROJECTS EXIST */
        <div
          className={cn(
            'flex-1 overflow-y-auto py-6 sm:py-8 xl:py-10',
            DASHBOARD_GUTTER,
          )}
        >
          <ProjectGrid projects={projects} />
        </div>
      )}

      <CreateProjectModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
