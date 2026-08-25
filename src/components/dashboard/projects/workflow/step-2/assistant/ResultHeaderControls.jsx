import { CheckCircle, PencilSimple } from '@phosphor-icons/react'

import { cn } from '@/lib/cn'

/**
 * The controls that CHANGE or REFINE a render, in that render's own header row:
 * - Edit Plan (sets this render as active base and focuses composer)
 * - Approve Plan button
 */
export default function ResultHeaderControls({
  approved,
  busy,
  onApprove,
  onEdit,
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2 ml-auto">
      {onEdit && (
        <div className="group/edit-tip relative inline-flex">
          <button
            type="button"
            onClick={onEdit}
            disabled={busy}
            aria-label="Edit & refine 3D model"
            className={cn(
              'inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-xs border border-[var(--color-brand-deep)]/35 bg-white text-[var(--color-brand-deep)] shadow-2xs',
              'transition-all duration-200 ease-[var(--ease-out-expo)]',
              'hover:border-[var(--color-brand-deep)] hover:bg-blue-50/80 hover:text-[var(--color-brand-deep)]',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-deep)]',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            <PencilSimple
              size={13}
              weight="bold"
              aria-hidden="true"
              className="shrink-0 text-[var(--color-brand-deep)]"
            />
          </button>

          <div
            role="tooltip"
            className={cn(
              'pointer-events-none absolute left-1/2 -translate-x-1/2 top-full z-50 mt-1.5 whitespace-nowrap rounded-xs border border-slate-200/90 bg-white/95 px-2 py-0.5 text-[0.5625rem] font-semibold text-slate-700 shadow-md backdrop-blur-xs',
              'opacity-0 -translate-y-1 transition-all duration-200 ease-out',
              'group-hover/edit-tip:opacity-100 group-hover/edit-tip:translate-y-0 group-focus-within/edit-tip:opacity-100 group-focus-within/edit-tip:translate-y-0',
            )}
          >
            Edit & refine model
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rotate-45 border-l border-t border-slate-200/90 bg-white" />
          </div>
        </div>
      )}


      <span
        aria-hidden="true"
        className="hidden h-4 w-px shrink-0 bg-[var(--tone-line)] sm:block"
      />

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
            aria-label="Approve 3D design"
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
            Approve & lock design
            <div className="absolute -top-1 right-2.5 h-1.5 w-1.5 rotate-45 border-l border-t border-emerald-200/90 bg-white" />
          </div>
        </div>
      )}
    </div>
  )
}


