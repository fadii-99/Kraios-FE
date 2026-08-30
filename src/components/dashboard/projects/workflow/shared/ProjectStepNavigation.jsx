import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, CircleNotch } from '@phosphor-icons/react'
import {
  WORKFLOW_STAGES,
  projectStagePath,
  workflowIndexForPath,
} from '@/lib/dashboard/workflow/projectWorkflow'
import { canFinishProject } from '@/lib/dashboard/projects/projectShape'
import { useProject, useProjects } from '@/lib/dashboard/projects/projectsContext'
import { showErrorToast, showInfoToast, showSuccessToast } from '@/lib/toast'
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
  const { finishProject } = useProjects()
  const project = useProject(projectId)
  const [finishing, setFinishing] = useState(false)

  // Active workflow stage index — the same derivation the stepper uses.
  const activeIndex = workflowIndexForPath(pathname)

  const prevStage = activeIndex > 0 ? WORKFLOW_STAGES[activeIndex - 1] : null
  const nextStage =
    activeIndex < WORKFLOW_STAGES.length - 1
      ? WORKFLOW_STAGES[activeIndex + 1]
      : null

  const handlePrevClick = (event) => {
    event.preventDefault()
    if (!prevStage) return

    // Going back is only navigation now. It used to clear Step 1's source so
    // the user "uploads anew", which made sense when the plan lived in browser
    // memory; the approved plan is a backend record, and silently unapproving
    // it because someone pressed Previous would discard real work.
    navigate(projectStagePath(projectId, prevStage.segment))
  }

  /**
   * Finish is a real request: `POST /finish/` succeeds only when a 2D plan and
   * a 3D render are approved and BoQ is either approved or explicitly skipped.
   * Those are the backend's rules, so the button asks the project whether they
   * are met and explains instead of firing a request it knows will 400.
   */
  const finishBlockedMessage = canFinishProject(project)
    ? null
    : 'Approve your 2D plan and 3D design — and approve or skip the BoQ — before finishing.'

  const handleFinishClick = async () => {
    if (finishing) return

    if (finishBlockedMessage) {
      showInfoToast(finishBlockedMessage, { id: 'workflow-finish-gate' })
      return
    }

    setFinishing(true)
    try {
      await finishProject(projectId)
      showSuccessToast('Project finished.', { id: 'project-finished' })
      navigate('/dashboard/projects')
    } catch (thrown) {
      showErrorToast(thrown?.message || 'This project could not be finished yet.', {
        id: 'project-finish-failed',
      })
    } finally {
      setFinishing(false)
    }
  }

  const handleNextClick = (event) => {
    event.preventDefault()
    if (!nextStage) return

    if (nextBlockedMessage) {
      showInfoToast(nextBlockedMessage, { id: 'workflow-stage-gate' })
      return
    }

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
          <button
            type="button"
            onClick={handlePrevClick}
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
          </button>
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

      {/* ─── Right Side: Next Step Action or Finish Project ─── */}
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
              'bg-[var(--btn-bg)] text-[var(--btn-ink)] hover:bg-blue-700 active:bg-blue-800',
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
          <button
            type="button"
            onClick={handleFinishClick}
            aria-disabled={finishBlockedMessage ? true : undefined}
            aria-busy={finishing || undefined}
            title={finishBlockedMessage || undefined}
            className={cn(
              'group label-ui inline-flex cursor-pointer items-center justify-center box-border rounded-sm',
              'h-11 min-h-11 max-h-11 px-5 sm:px-6 w-full sm:w-52 uppercase text-[0.75rem] sm:text-[0.8125rem] font-bold tracking-wider',
              'bg-[var(--btn-bg)] text-[var(--btn-ink)] hover:bg-blue-700 active:bg-blue-800',
              finishBlockedMessage
                ? 'opacity-60'
                : 'shadow-[0_4px_14px_rgba(11,94,215,0.2)]',
              'transition-[background-color,border-color,color,transform] duration-300 ease-[var(--ease-out-expo)]',
              'active:translate-y-px select-none',
              'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--tone-accent)]',
            )}
          >
            <span className="flex items-center justify-center gap-1.5 whitespace-nowrap">
              <span className="whitespace-nowrap">
                {project?.isFinished ? 'Finished' : 'Finish'}
              </span>
              {finishing ? (
                <CircleNotch size={16} weight="bold" className="animate-spin" aria-hidden="true" />
              ) : (
                <Check
                  size={16}
                  weight="bold"
                  className="transition-transform duration-300 ease-[var(--ease-out-expo)] group-hover:scale-110 motion-reduce:transition-none"
                />
              )}
            </span>
          </button>
        )}
      </div>
    </nav>
  )
}
