import { useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import {
  Check,
  Cube,
  Calculator,
  RocketLaunch,
  UploadSimple,
} from '@phosphor-icons/react'
import {
  WORKFLOW_STAGES,
  workflowIndexForPath,
} from '@/lib/dashboard/workflow/projectWorkflow'
import LeaveProjectControl from '@/components/dashboard/projects/workflow/shared/LeaveProjectControl'
import { DASHBOARD_MOTION } from '@/lib/dashboard/motion'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { cn } from '@/lib/cn'

const STEP_ICONS = {
  upload: UploadSimple,
  rendering: Cube,
  boq: Calculator,
  output: RocketLaunch,
}

/**
 * Architectural Workflow Stepper for Project Workspace.
 *
 * Smooth Active Animation:
 * - Active step avatar disc smoothly scales up (scale-110) with glowing ring
 * - Active icon inside smoothly enlarges (scale-115) and rotates (12deg) with custom spring easing
 * - Completed stage smoothly returns to base scale with checkmark
 * - Thick animated bottom border progress bar
 */
export default function ProjectWorkflowNav() {
  const { pathname } = useLocation()
  const scope = useRef(null)
  const reduced = usePrefersReducedMotion()

  // Active step index from the current URL — derived once, in projectWorkflow.
  const activeIndex = workflowIndexForPath(pathname)

  // Calculate overall workflow progress percentage (25%, 50%, 75%, 100%)
  const progressPercentage = ((activeIndex + 1) / WORKFLOW_STAGES.length) * 100

  // Entrance animation for step nodes
  useGSAP(
    () => {
      if (reduced) return

      gsap.fromTo(
        '[data-step-card-node]',
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
    { scope, dependencies: [reduced] },
  )

  return (
    <nav ref={scope} aria-label="Project Workflow Stepper" className="w-full">
      {/* ─── Clean Architectural Stepper (Border-free flat flow) ─── */}
      <div className="relative overflow-hidden bg-transparent pt-0 pb-1 sm:pb-1.5">
        {/* The stepper and the exit share ONE row. The grid keeps `w-full`
            inside a `min-w-0` flex child rather than being sized by its own
            content, so the four columns still divide the space evenly and
            the chip takes only what it needs at the end. */}
        <div className="flex w-full items-center gap-3 sm:gap-4">
          <div className="grid min-w-0 flex-1 grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
            {WORKFLOW_STAGES.map((stage, index) => {
              const isCurrent = index === activeIndex
              const isCompleted = index < activeIndex
              const isPending = index > activeIndex
              const StepIcon = STEP_ICONS[stage.segment] || UploadSimple

              return (
                <div
                  key={stage.id}
                  className="relative flex items-center min-w-0"
                >
                  {/* ─── Step Indicator Item (Non-clickable Progress Step) ─── */}
                  <div
                    data-step-card-node
                    className="flex w-full items-center gap-2.5 sm:gap-3 rounded-sm py-1.5 px-2 min-w-0 cursor-default select-none"
                  >
                    {/* ── Fixed Dimension Avatar Bounding Box ── */}
                    <div className="relative h-9 w-9 sm:h-9.5 sm:w-9.5 shrink-0 flex items-center justify-center">
                      {/* Transforming Avatar Disc */}
                      <div
                        className={cn(
                          'absolute inset-0 flex items-center justify-center rounded-full transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
                          isCurrent &&
                            'bg-[var(--color-brand-deep)] text-white shadow-2xs scale-100',
                          isCompleted &&
                            'bg-[var(--color-brand-deep)] text-white shadow-2xs scale-95',
                          isPending &&
                            'border border-[var(--tone-line-strong)] bg-white text-[var(--tone-muted)] shadow-2xs scale-90',
                        )}
                      >
                        {/* Step Icon */}
                        {isCompleted ? (
                          <Check
                            size={16}
                            weight="bold"
                            className="shrink-0 animate-in zoom-in-50 duration-300"
                          />
                        ) : (
                          <StepIcon
                            size={16}
                            weight={isCurrent ? 'fill' : 'bold'}
                            className={cn(
                              'shrink-0 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
                              isCurrent && 'scale-105',
                            )}
                          />
                        )}
                      </div>
                    </div>

                    {/* ── Text Stack ── */}
                    <div className="flex flex-col text-left min-w-0 overflow-hidden leading-tight">
                      <span
                        className={cn(
                          'text-[0.625rem] sm:text-[0.6875rem] font-bold tracking-wider uppercase transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] truncate',
                          isCurrent
                            ? 'text-[var(--color-brand-deep)]'
                            : isCompleted
                              ? 'text-[var(--tone-muted-dark)]'
                              : 'text-[var(--tone-muted)]',
                        )}
                      >
                        Step {index + 1}
                      </span>

                      <span
                        className={cn(
                          'truncate text-[0.75rem] sm:text-[0.8125rem] md:text-[0.875rem] font-bold tracking-tight uppercase transition-colors duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] mt-0.5',
                          isCurrent
                            ? 'text-[var(--color-brand-deep)] font-black'
                            : isCompleted
                              ? 'text-[var(--tone-ink)] font-bold'
                              : 'text-[var(--tone-muted-dark)]',
                        )}
                        style={{ fontFamily: 'var(--font-display)' }}
                      >
                        {stage.label}
                      </span>
                    </div>
                  </div>

                  {/* ── Subtle Divider (hidden on last item of each row) ── */}
                  {index < WORKFLOW_STAGES.length - 1 && (
                    <div
                      className="absolute right-0 top-1/2 -translate-y-1/2 hidden h-5 w-px bg-[var(--tone-line)] opacity-60 md:block pointer-events-none"
                      aria-hidden="true"
                    />
                  )}
                </div>
              )
            })}
          </div>

          {/* The one control on this bar that is not part of the sequence, so it
              sits past Step 4 rather than among the stages. */}
          <LeaveProjectControl />
        </div>

        {/* ─── Clean Architectural Progress Line (Full Page Width Edge-to-Edge) ─── */}
        <div
          className="-mx-5 sm:-mx-7 lg:-mx-10 xl:-mx-12 mt-2 sm:mt-2.5 relative h-[2.5px] bg-[var(--tone-line)] overflow-hidden"
          aria-hidden="true"
        >
          {/* Active Smoothly Wiping Brand Blue Progress Bar without Glow */}
          <div
            className="relative h-full bg-[var(--color-brand-deep)] transition-[width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>
    </nav>
  )
}
