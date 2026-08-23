import { Link, useLocation } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from '@phosphor-icons/react'
import {
  WORKFLOW_STAGES,
  projectStagePath,
  workflowIndexForPath,
} from '@/lib/dashboard/projectWorkflow'
import PrimaryButton from '@/components/ui/PrimaryButton'
import { cn } from '@/lib/cn'

/**
 * Reusable Bottom Workflow Navigation Component for Project Workspace.
 *
 * Uses the exact Welcome Screen Button styling for both Previous and Next actions:
 * - `size="default"` (min-h-13, identical height & generous padding)
 * - `align="center"` with `withArrow={false}`
 * - Equal fixed width (`w-full sm:w-64 whitespace-nowrap`)
 * - Next: Solid CTA with subtle blue elevation shadow (`shadow-[0_4px_16px_rgba(11,94,215,0.22)]`)
 * - Previous: Outline CTA with hairline border
 */
export default function ProjectStepNavigation({ projectId, className }) {
  const { pathname } = useLocation()

  // Active workflow stage index — the same derivation the stepper uses.
  const activeIndex = workflowIndexForPath(pathname)

  const prevStage = activeIndex > 0 ? WORKFLOW_STAGES[activeIndex - 1] : null
  const nextStage =
    activeIndex < WORKFLOW_STAGES.length - 1
      ? WORKFLOW_STAGES[activeIndex + 1]
      : null

  return (
    <nav
      aria-label="Workflow Stage Navigation"
      className={cn(
        // Stacked below 640px: both labels are `whitespace-nowrap`, so a
        // half-width column could not hold "3D Rendering" at phone widths and
        // the row overflowed horizontally.
        'mt-auto flex shrink-0 flex-col items-stretch gap-3 border-t border-[var(--tone-line)] pt-3.5 pb-0',
        'sm:flex-row sm:items-center sm:justify-between sm:gap-4',
        className,
      )}
    >
      {/* ─── Left Side: Previous Step / Go to Projects Action ─── */}
      <div className="flex-1">
        {prevStage ? (
          <PrimaryButton
            as={Link}
            to={projectStagePath(projectId, prevStage.segment)}
            variant="outline"
            size="default"
            align="center"
            withArrow={false}
            className="w-full sm:w-64 whitespace-nowrap uppercase"
          >
            <span className="flex items-center justify-center gap-2 whitespace-nowrap">
              <ArrowLeft
                size={17}
                weight="bold"
                className="transition-transform duration-300 ease-[var(--ease-out-expo)] group-hover:-translate-x-1 motion-reduce:transition-none"
              />
              <span className="whitespace-nowrap">{prevStage.label}</span>
            </span>
          </PrimaryButton>
        ) : (
          <PrimaryButton
            as={Link}
            to="/dashboard/projects"
            variant="outline"
            size="default"
            align="center"
            withArrow={false}
            className="w-full sm:w-64 whitespace-nowrap uppercase"
          >
            <span className="flex items-center justify-center gap-2 whitespace-nowrap">
              <ArrowLeft
                size={17}
                weight="bold"
                className="transition-transform duration-300 ease-[var(--ease-out-expo)] group-hover:-translate-x-1 motion-reduce:transition-none"
              />
              <span className="whitespace-nowrap">Go to Projects</span>
            </span>
          </PrimaryButton>
        )}
      </div>

      {/* ─── Right Side: Next Step Action (Welcome Solid Style) ─── */}
      <div className="flex flex-1 justify-end">
        {nextStage ? (
          <PrimaryButton
            as={Link}
            to={projectStagePath(projectId, nextStage.segment)}
            variant="solid"
            size="default"
            align="center"
            withArrow={false}
            className="w-full sm:w-64 whitespace-nowrap uppercase shadow-[0_4px_16px_rgba(11,94,215,0.22)]"
          >
            <span className="flex items-center justify-center gap-2 whitespace-nowrap">
              <span className="whitespace-nowrap">{nextStage.label}</span>
              <ArrowRight
                size={17}
                weight="bold"
                className="transition-transform duration-300 ease-[var(--ease-out-expo)] group-hover:translate-x-1 motion-reduce:transition-none"
              />
            </span>
          </PrimaryButton>
        ) : (
          <div aria-hidden="true" className="hidden h-13 sm:block sm:w-64" />
        )}
      </div>
    </nav>
  )
}
