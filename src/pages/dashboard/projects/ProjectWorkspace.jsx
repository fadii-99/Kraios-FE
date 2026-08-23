import { Suspense, useRef } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import ProjectWorkflowNav from '@/components/dashboard/projects/ProjectWorkflowNav'
import ProjectStepNavigation from '@/components/dashboard/projects/ProjectStepNavigation'
import PageLoader from '@/components/ui/PageLoader'
import { DASHBOARD_MOTION } from '@/lib/dashboard/motion'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

/**
 * Project Workspace — /dashboard/projects/:projectId
 *
 * Clean, minimal project workspace layout:
 * - 4-Step visual workflow navigation cards at the top
 * - Large empty stage workspace area for future stage components
 * - Reusable context-aware bottom workflow navigation (Previous / Next)
 */
export default function ProjectWorkspace() {
  const { projectId } = useParams()
  const scope = useRef(null)
  const reduced = usePrefersReducedMotion()

  useGSAP(
    () => {
      if (reduced) return

      gsap.fromTo(
        '[data-workspace-reveal]',
        { opacity: 0, y: DASHBOARD_MOTION.ySmall },
        {
          opacity: 1,
          y: 0,
          duration: DASHBOARD_MOTION.durationFast,
          ease: DASHBOARD_MOTION.ease,
          stagger: DASHBOARD_MOTION.staggerFast,
        },
      )
    },
    { scope, dependencies: [reduced, projectId] },
  )

  return (
    <div ref={scope} className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      {/* ─── Top 4-Step Workflow Navigation Header Bar (Solid White with Progress Bar as Bottom Border) ─── */}
      <div data-workspace-reveal className="shrink-0 bg-white px-5 pt-3.5 pb-0 sm:px-7 sm:pt-4 sm:pb-0 lg:px-10 lg:pt-4.5 lg:pb-0 xl:px-12">
        <ProjectWorkflowNav projectId={projectId} />
      </div>

      {/* ─── Main Workspace & Stage Content Flow ─── */}
      <div
        data-workspace-reveal
        className="flex flex-1 flex-col justify-between overflow-y-auto px-5 pt-5 pb-3 sm:px-7 sm:pt-6 sm:pb-4 lg:px-10 lg:pt-7 lg:pb-4 xl:px-12 xl:pt-8 xl:pb-5 min-h-0"
      >
        {/* Stage Content Area (Reserved for future stage components) */}
        <div className="flex-1 flex flex-col min-h-[14rem]">
          <Suspense
            fallback={
              <PageLoader
                variant="inline"
                label="Loading Stage"
                className="min-h-[14rem]"
              />
            }
          >
            <Outlet />
          </Suspense>
        </div>

        {/* Reusable Context-Aware Bottom Workflow Navigation */}
        <ProjectStepNavigation projectId={projectId} />
      </div>
    </div>
  )
}
