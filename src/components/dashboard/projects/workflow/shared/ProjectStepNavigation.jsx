import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from '@phosphor-icons/react'
import {
  WORKFLOW_STAGES,
  projectStagePath,
  workflowIndexForPath,
} from '@/lib/dashboard/workflow/projectWorkflow'
import { showInfoToast } from '@/lib/toast'
import { cn } from '@/lib/cn'

/**
 * The permanent bottom workflow navigation of the project workspace.
 *
 * Previous and Next share one measured button shape — equal height, equal
 * width, nowrap labels — so the row reads as a pair at every breakpoint and
 * stacks rather than overflowing below 640px.
 *
 * It stays DOMAIN-AGNOSTIC: it never asks what a floor plan or a 3D render is.
 * A stage that is not reachable yet arrives as `nextBlockedMessage`, and this
 * nav only explains it.
 */
export default function ProjectStepNavigation({
  projectId,
  nextBlockedMessage = null,
  className,
}) {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  // Active workflow stage index — the same derivation the stepper uses.
  const activeIndex = workflowIndexForPath(pathname)

  const prevStage = activeIndex > 0 ? WORKFLOW_STAGES[activeIndex - 1] : null
  const nextStage =
    activeIndex < WORKFLOW_STAGES.length - 1
      ? WORKFLOW_STAGES[activeIndex + 1]
      : null

  const handleNextClick = (event) => {
    event.preventDefault()
    if (!nextStage) return

    /**
     * Gated stage — explain, do not navigate.
     *
     * The control stays clickable on purpose. A genuinely `disabled` button
     * cannot receive a click, so it can never tell the user WHY the next stage
     * is closed; `aria-disabled` plus the quieted fill says "not yet" to
     * assistive tech and to the eye, and the toast says what to do about it.
     */
    if (nextBlockedMessage) {
      showInfoToast(nextBlockedMessage, { id: 'workflow-stage-gate' })
      return
    }

    /**
     * Navigate immediately. The stage route is lazy, so the only wait is the
     * real one — the chunk loading behind `ProjectWorkspace`'s Suspense
     * fallback. Nothing is processed on the way out of a stage, so nothing
     * here pretends otherwise.
     */
    navigate(projectStagePath(projectId, nextStage.segment))
  }

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
          <Link
            to={projectStagePath(projectId, prevStage.segment)}
            className={cn(
              'group label-ui inline-flex cursor-pointer items-center justify-center box-border rounded-sm',
              'h-11 min-h-11 max-h-11 px-5 sm:px-6 w-full sm:w-52 uppercase text-[0.75rem] sm:text-[0.8125rem] font-bold tracking-wider',
              'border border-[var(--tone-line-strong)] bg-white text-[var(--tone-ink)] hover:border-[var(--tone-muted)] hover:bg-[var(--tone-panel)]',
              'transition-[background-color,border-color,color,transform] duration-300 ease-[var(--ease-out-expo)]',
              'active:translate-y-px select-none',
              'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--tone-accent)]',
            )}
          >
            <span className="flex items-center justify-center gap-1.5 whitespace-nowrap">
              <ArrowLeft
                size={15}
                weight="bold"
                className="transition-transform duration-300 ease-[var(--ease-out-expo)] group-hover:-translate-x-1 motion-reduce:transition-none"
              />
              <span className="whitespace-nowrap">{prevStage.label}</span>
            </span>
          </Link>
        ) : (
          <Link
            to="/dashboard/projects"
            className={cn(
              'group label-ui inline-flex cursor-pointer items-center justify-center box-border rounded-sm',
              'h-11 min-h-11 max-h-11 px-5 sm:px-6 w-full sm:w-52 uppercase text-[0.75rem] sm:text-[0.8125rem] font-bold tracking-wider',
              'border border-[var(--tone-line-strong)] bg-white text-[var(--tone-ink)] hover:border-[var(--tone-muted)] hover:bg-[var(--tone-panel)]',
              'transition-[background-color,border-color,color,transform] duration-300 ease-[var(--ease-out-expo)]',
              'active:translate-y-px select-none',
              'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--tone-accent)]',
            )}
          >
            <span className="flex items-center justify-center gap-1.5 whitespace-nowrap">
              <ArrowLeft
                size={15}
                weight="bold"
                className="transition-transform duration-300 ease-[var(--ease-out-expo)] group-hover:-translate-x-1 motion-reduce:transition-none"
              />
              <span className="whitespace-nowrap">Go to Projects</span>
            </span>
          </Link>
        )}
      </div>

      {/* ─── Right Side: Next Step Action ─── */}
      <div className="flex flex-1 justify-end">
        {nextStage ? (
          <button
            type="button"
            onClick={handleNextClick}
            aria-disabled={nextBlockedMessage ? true : undefined}
            title={nextBlockedMessage || undefined}
            className={cn(
              'group label-ui inline-flex cursor-pointer items-center justify-center box-border rounded-sm',
              'h-11 min-h-11 max-h-11 px-5 sm:px-6 w-full sm:w-52 uppercase text-[0.75rem] sm:text-[0.8125rem] font-bold tracking-wider',
              'bg-[var(--btn-bg)] text-[var(--btn-ink)] hover:bg-[var(--btn-bg-hover)]',
              // Swapped, not layered: `shadow-none` alongside the shadow class
              // would be decided by stylesheet order, not by this list.
              nextBlockedMessage
                ? 'opacity-60'
                : 'shadow-[0_4px_14px_rgba(11,94,215,0.2)]',
              'transition-[background-color,border-color,color,transform] duration-300 ease-[var(--ease-out-expo)]',
              'active:translate-y-px select-none',
              'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--tone-accent)]',
            )}
          >
            <span className="flex items-center justify-center gap-1.5 whitespace-nowrap">
              <span className="whitespace-nowrap">{nextStage.label}</span>
              <ArrowRight
                size={15}
                weight="bold"
                className="transition-transform duration-300 ease-[var(--ease-out-expo)] group-hover:translate-x-1 motion-reduce:transition-none"
              />
            </span>
          </button>
        ) : (
          <div aria-hidden="true" className="hidden h-11 sm:block sm:w-52" />
        )}
      </div>
    </nav>
  )
}
