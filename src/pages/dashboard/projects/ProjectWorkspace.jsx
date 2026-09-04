import { Suspense, useRef } from 'react'
import { Outlet, useLocation, useParams } from 'react-router-dom'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import ProjectWorkflowNav from '@/components/dashboard/projects/workflow/shared/ProjectWorkflowNav'
import ProjectStepNavigation from '@/components/dashboard/projects/workflow/shared/ProjectStepNavigation'
import PageLoader from '@/components/ui/PageLoader'
import { DASHBOARD_MOTION } from '@/lib/dashboard/motion'
import { useProject } from '@/lib/dashboard/projects/projectsContext'
import { DASHBOARD_GUTTER } from '@/lib/dashboard/layout'
import {
  WORKFLOW_STAGES,
  stageGateMessage,
  workflowIndexForPath,
} from '@/lib/dashboard/workflow/projectWorkflow'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { cn } from '@/lib/cn'

/**
 * Project Workspace — /dashboard/projects/:projectId
 */
export default function ProjectWorkspace() {
  const { projectId } = useParams()
  const { pathname } = useLocation()
  const scope = useRef(null)
  const reduced = usePrefersReducedMotion()

  const project = useProject(projectId)
  const activeStage = WORKFLOW_STAGES[workflowIndexForPath(pathname)]

  /**
   * Why Next is not available yet, asked of the PROJECT rather than of a stage
   * view model. `workflow_state` is what the backend will enforce anyway, so
   * the nav and the API agree by construction, and no step's history has to be
   * fetched to render this bar.
   */
  const nextBlockedMessage = stageGateMessage(activeStage?.id, project)


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
      <div
        data-workspace-reveal
        className={cn(
          'relative z-20 shrink-0 bg-white pt-3.5 sm:pt-4 lg:pt-4.5 pb-0',
          DASHBOARD_GUTTER,
        )}
      >
        <ProjectWorkflowNav />
      </div>

      {/* ─── MIDDLE: the active stage — the only scrolling zone ─── */}
      <div
        data-workspace-reveal
        className={cn(
          'min-h-0 flex-1 overflow-y-auto pt-3 pb-6 sm:pb-8 flex flex-col justify-start',
          DASHBOARD_GUTTER,
        )}
      >

        {/* `min-h-full` lets a short stage fill the available area while a tall
            one grows this box and scrolls — the stage never has to choose
            between filling the space and being clipped. */}
        <div className="flex min-h-full flex-1 flex-col justify-start">
          <Suspense
            fallback={
              <PageLoader variant="inline" label="Loading Stage" className="min-h-56" />
            }
          >
            <Outlet />
          </Suspense>
        </div>
      </div>


      {/* ─── BOTTOM: permanent workflow navigation. Outside the scroller, so
             it is always visible; the component itself is untouched and still
             draws the hairline that separates it from the stage. ─── */}
      <div
        data-workspace-reveal
        className={cn('shrink-0 pb-3 sm:pb-4 xl:pb-5', DASHBOARD_GUTTER)}
      >
        <ProjectStepNavigation
          projectId={projectId}
          nextBlockedMessage={nextBlockedMessage}
        />
      </div>
    </div>
  )
}
