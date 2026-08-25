import { Lock } from '@phosphor-icons/react'
import { FLOOR_PLAN_MODES } from '@/lib/dashboard/workflow/step-1/floorPlanSource'
import { cn } from '@/lib/cn'

const OPTIONS = [
  { id: FLOOR_PLAN_MODES.upload, label: 'Upload' },
  { id: FLOOR_PLAN_MODES.generate, label: 'Generate' },
]

/**
 * The Step 1 source selector: styled to match Design Assistant header controls
 * with a crisp uppercase heading label and an architectural segmented toggle.
 */
export default function FloorPlanModeToggle({
  mode,
  lockedMode,
  onModeChange,
  className,
}) {
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div
        role="group"
        aria-label="2D floor plan source mode"
        className={cn(
          'inline-flex h-9 items-center rounded-sm border border-[var(--tone-line-strong)] bg-white p-1 shadow-2xs',
        )}
      >
        {OPTIONS.map((option) => {
          const isActive = option.id === mode
          const isLocked = option.id === lockedMode && !isActive

          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={isActive}
              aria-disabled={isLocked || undefined}
              onClick={() => onModeChange(option.id)}
              className={cn(
                'group relative flex h-7 min-w-[5.25rem] sm:min-w-[6rem] cursor-pointer items-center justify-center gap-1.5 rounded-xs px-3',
                'text-[0.75rem] font-bold uppercase tracking-[0.08em] select-none transition-all duration-200 ease-[var(--ease-out-expo)]',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-deep)]',
                isActive
                  ? 'bg-[var(--color-brand-deep)]/10 text-[var(--color-brand-deep)] shadow-2xs font-bold border border-[var(--color-brand-deep)]/25'
                  : 'text-[var(--tone-muted-dark)] border border-transparent hover:text-[var(--tone-ink)] hover:bg-[var(--color-light)]/70',
                isLocked && 'cursor-not-allowed opacity-50 hover:bg-transparent hover:text-[var(--tone-muted-dark)]',
              )}
              style={{ fontFamily: 'var(--font-display)' }}
            >
              <span className="truncate">{option.label}</span>

              {isLocked && (
                <Lock
                  size={12}
                  weight="fill"
                  aria-hidden="true"
                  className={cn(
                    'shrink-0',
                    isActive ? 'text-[var(--color-brand-deep)]' : 'text-[var(--tone-muted-dark)]',
                  )}
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

