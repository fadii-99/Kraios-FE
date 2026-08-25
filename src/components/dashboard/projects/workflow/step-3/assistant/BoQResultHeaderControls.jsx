import { CheckCircle } from '@phosphor-icons/react'
import { cn } from '@/lib/cn'

/**
 * Result header controls for Step 3 BoQ Assistant.
 *
 * Provides the interactive toggle approval button in emerald/green theme
 * matching the Design Assistant result header controls.
 */
export default function BoQResultHeaderControls({
  approved,
  busy,
  onApprove,
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2 ml-auto">
      {approved ? (
        <div className="group/app-tip relative inline-flex">
          <button
            type="button"
            onClick={onApprove}
            disabled={busy}
            aria-label="Approved (Click to revoke approval)"
            className={cn(
              'group/btn inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-xs border border-emerald-500/40 bg-emerald-50 text-emerald-600 shadow-[0_1px_6px_rgba(16,185,129,0.18)]',
              'transition-all duration-200 ease-[var(--ease-out-expo)]',
              'hover:border-rose-400/80 hover:bg-rose-50/90 hover:text-rose-600',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            <CheckCircle
              size={14}
              weight="fill"
              aria-hidden="true"
              className="shrink-0 transition-colors"
            />
          </button>

          <div
            role="tooltip"
            className={cn(
              'pointer-events-none absolute right-0 top-full z-50 mt-1.5 whitespace-nowrap rounded-xs border border-emerald-200/90 bg-white/95 px-2 py-0.5 text-[0.5625rem] font-semibold text-emerald-800 shadow-md backdrop-blur-xs',
              'opacity-0 -translate-y-1 transition-all duration-200 ease-out',
              'group-hover/app-tip:opacity-100 group-hover/app-tip:translate-y-0 group-focus-within/app-tip:opacity-100 group-focus-within/app-tip:translate-y-0',
            )}
          >
            Approved · Click to revoke
            <div className="absolute -top-1 right-2.5 h-1.5 w-1.5 rotate-45 border-l border-t border-emerald-200/90 bg-white" />
          </div>
        </div>
      ) : (
        <div className="group/app-tip relative inline-flex">
          <button
            type="button"
            onClick={onApprove}
            disabled={busy}
            aria-label="Approve Bill of Quantities"
            className={cn(
              'inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-xs border border-emerald-500/40 bg-white text-emerald-600 shadow-2xs',
              'transition-all duration-200 ease-[var(--ease-out-expo)]',
              'hover:border-emerald-600 hover:bg-emerald-50/90 hover:text-emerald-700',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            <CheckCircle
              size={14}
              weight="bold"
              aria-hidden="true"
              className="shrink-0 text-emerald-600 transition-colors"
            />
          </button>

          <div
            role="tooltip"
            className={cn(
              'pointer-events-none absolute right-0 top-full z-50 mt-1.5 whitespace-nowrap rounded-xs border border-emerald-200/90 bg-white/95 px-2 py-0.5 text-[0.5625rem] font-semibold text-emerald-800 shadow-md backdrop-blur-xs',
              'opacity-0 -translate-y-1 transition-all duration-200 ease-out',
              'group-hover/app-tip:opacity-100 group-hover/app-tip:translate-y-0 group-focus-within/app-tip:opacity-100 group-focus-within/app-tip:translate-y-0',
            )}
          >
            Approve & lock BoQ
            <div className="absolute -top-1 right-2.5 h-1.5 w-1.5 rotate-45 border-l border-t border-emerald-200/90 bg-white" />
          </div>
        </div>
      )}
    </div>
  )
}
