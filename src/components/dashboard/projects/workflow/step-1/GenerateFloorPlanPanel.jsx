import { useNavigate } from 'react-router-dom'
import { CheckCircle, CircleDashed } from '@phosphor-icons/react'
import FloorPlanWorkArea from '@/components/dashboard/projects/workflow/shared/FloorPlanWorkArea'
import PrimaryButton from '@/components/ui/PrimaryButton'
import { floorPlanAssistantPath } from '@/lib/dashboard/workflow/projectWorkflow'
import { cn } from '@/lib/cn'

/**
 * Step 1 — Generate Mode Gateway Card.
 *
 * Designed with Step 2's Architectural Gateway aesthetics:
 * - Centered Heading & Description
 * - Centered Primary "GENERATE NOW" CTA Button (no icon)
 * - Full-width bottom status strip matching Step 2 (green when approved, red when not approved)
 */
export default function GenerateFloorPlanPanel({
  projectId,
  source,
  className,
}) {
  const navigate = useNavigate()

  const handleOpenAssistant = () => {
    navigate(floorPlanAssistantPath(projectId))
  }

  const isGeneratedAndApproved = Boolean(source)

  return (
    <div className={cn('flex w-full flex-1 flex-col', className)}>
      <FloorPlanWorkArea
        className={cn(
          'group relative w-full h-[430px] sm:h-[445px] lg:h-[455px] flex flex-col justify-between overflow-hidden',
          'transition-all duration-300 ease-[var(--ease-out-expo)]',
          'hover:border-[var(--tone-line-strong)]',
        )}
      >
        {/* ── Main Centered Content ── */}
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-6 text-center sm:px-8 sm:py-7 lg:px-10 lg:py-8">
          {/* 1. Main Heading in Center */}
          <h3
            className="text-[1.4375rem] font-black uppercase leading-tight tracking-[-0.02em] text-[var(--tone-ink)] sm:text-[1.75rem]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Generate Now
          </h3>

          {/* 2. Brief Description in Center */}
          <p className="mt-3 max-w-[44ch] text-[0.8125rem] sm:text-[0.875rem] leading-relaxed text-[var(--tone-muted-dark)]">
            Describe the floor plan you need and let KRAIOS generate a starting design. Refine the result with the assistant, edit it in the canvas, and approve the final plan when it is ready.
          </p>

          {/* 3. Primary CTA Button (Centered, with No Icon) */}
          <PrimaryButton
            type="button"
            onClick={handleOpenAssistant}
            size="compact"
            align="center"
            withArrow={false}
            className="mt-5 sm:mt-6 cursor-pointer px-6 uppercase text-[0.75rem] sm:text-[0.8125rem] font-bold tracking-wider"
          >
            Generate Now
          </PrimaryButton>
        </div>

        {/* ── Bottom Status Notice Strip (Identical to Step 2) ── */}
        <div
          className={cn(
            'flex w-full items-center justify-center border-t px-5 py-3 sm:px-7 sm:py-3.5 transition-colors duration-300 shrink-0',
            isGeneratedAndApproved
              ? 'border-emerald-500/20 bg-emerald-500/[0.045]'
              : 'border-red-500/15 bg-red-500/[0.035]',
          )}
        >
          <p
            className={cn(
              'flex items-center justify-center gap-2.5 text-center text-[0.75rem] font-medium sm:text-[0.8125rem]',
              isGeneratedAndApproved
                ? 'text-emerald-700'
                : 'text-[var(--color-danger,#b42318)]',
            )}
          >
            {isGeneratedAndApproved ? (
              <CheckCircle
                size={16}
                weight="bold"
                aria-hidden="true"
                className="shrink-0 text-emerald-600"
              />
            ) : (
              <CircleDashed
                size={15}
                weight="bold"
                aria-hidden="true"
                className="shrink-0 text-[var(--color-danger,#b42318)]"
              />
            )}
            <span>
              {isGeneratedAndApproved
                ? 'Floor plan generated and approved. You can now continue to Step 2: 3D Rendering.'
                : 'Floor plan not yet approved. Generate and approve a 2D plan to continue.'}
            </span>
          </p>
        </div>
      </FloorPlanWorkArea>
    </div>
  )
}
