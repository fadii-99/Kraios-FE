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

  // Entrance and continuous glitter laser shimmer
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

      // Continuous subtle glittering laser shimmer across the active progress bar
      gsap.fromTo(
        '[data-progress-glitter]',
        { xPercent: -100 },
        {
          xPercent: 250,
          duration: 2.2,
          repeat: -1,
          ease: 'power1.inOut',
          repeatDelay: 0.5,
        },
      )
    },
    { scope, dependencies: [reduced] },
  )

  return (
    <nav ref={scope} aria-label="Project Workflow Stepper" className="w-full">
      {/* ─── Clean Architectural Stepper (Border-free flat flow) ─── */}
      <div className="relative overflow-hidden bg-transparent pt-0 pb-1 sm:pt-0.5 sm:pb-1.5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 w-full">
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
                  className="flex w-full items-center gap-3 rounded-sm py-1.5 px-2 min-w-0 cursor-default select-none"
                >
                  {/* ── Fixed Dimension Avatar Bounding Box ── */}
                  <div className="relative h-10 w-10 sm:h-10.5 sm:w-10.5 shrink-0 flex items-center justify-center">
                    {/* Transforming Avatar Disc */}
                    <div
                      className={cn(
                        'absolute inset-0 flex items-center justify-center rounded-full transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
                        isCurrent &&
                          'bg-[var(--color-brand-deep)] text-white shadow-[0_4px_18px_rgba(11,94,215,0.4)] ring-4 ring-[var(--color-brand)]/25 scale-110',
                        isCompleted &&
                          'bg-[var(--color-brand-deep)] text-white shadow-xs scale-100',
                        isPending &&
                          'border border-[var(--tone-line-strong)] bg-white text-[var(--tone-muted)] shadow-2xs scale-95',
                      )}
                    >
                      {/* Step Icon */}
                      {isCompleted ? (
                        <Check
                          size={18}
                          weight="bold"
                          className="shrink-0 animate-in zoom-in-50 duration-400"
                        />
                      ) : (
                        <StepIcon
                          size={18}
                          weight={isCurrent ? 'fill' : 'bold'}
                          className={cn(
                            'shrink-0 transition-transform duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
                            isCurrent && 'scale-115 rotate-12',
                          )}
                        />
                      )}
                    </div>
                  </div>

                  {/* ── Text Stack ── */}
                  <div className="flex flex-col text-left min-w-0 overflow-hidden">
                    <span
                      className={cn(
                        'text-[0.6875rem] font-bold tracking-wider uppercase transition-colors duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] truncate',
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
                        'truncate text-[0.875rem] font-black tracking-[-0.01em] uppercase transition-colors duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] sm:text-[0.9375rem] md:text-[1rem]',
                        isCurrent
                          ? 'text-[var(--color-brand-deep)]'
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
                    className="absolute right-0 top-1/2 -translate-y-1/2 hidden h-6 w-px bg-[var(--tone-line)] opacity-60 md:block pointer-events-none"
                    aria-hidden="true"
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* ─── Modern Glittery Architectural Progress Line (Full Page Width Edge-to-Edge) ─── */}
        <div
          className="-mx-5 sm:-mx-7 lg:-mx-10 xl:-mx-12 mt-2.5 sm:mt-3 relative h-[3px] bg-[var(--tone-line)] overflow-hidden"
          aria-hidden="true"
        >
          {/* Active Smoothly Wiping Brand Blue Progress Bar with Glow */}
          <div
            className="relative h-full bg-[var(--color-brand-deep)] shadow-[0_0_10px_rgba(11,94,215,0.5),0_0_20px_rgba(11,94,215,0.25)] transition-[width] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden"
            style={{ width: `${progressPercentage}%` }}
          >
            {/* Continuous Sparkling Glitter / Laser Shimmer Beam */}
            <div
              data-progress-glitter
              className="absolute inset-y-0 -left-full w-full bg-gradient-to-r from-transparent via-white/85 to-transparent blur-[0.5px]"
            />

            {/* Glowing Leading Edge Spark at the Progress Frontier */}
            <div className="absolute right-0 top-0 h-full w-4 bg-gradient-to-l from-white/90 to-transparent shadow-[0_0_8px_#ffffff,0_0_14px_rgba(11,94,215,0.8)]" />
          </div>
        </div>
      </div>
    </nav>
  )
}
