import { CheckCircle, XCircle } from '@phosphor-icons/react'

import { cn } from '@/lib/cn'

/**
 * Premium architectural status indicator.
 * Displays a high-contrast red warning badge with icon when Not Approved,
 * and an emerald badge with glowing live indicator when Approved.
 */
export default function ApprovalStatus({ approved, showLabel = false, className }) {
  return (
    <div className={cn('inline-flex shrink-0 items-center gap-2 sm:gap-2.5', className)}>
      {showLabel && (
        <span
          className="font-display text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-slate-400/80"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Status
        </span>
      )}



      <div
        className={cn(
          'inline-flex h-8 items-center gap-2 rounded-sm px-3 text-[0.6875rem] font-bold uppercase tracking-[0.06em] whitespace-nowrap transition-all duration-200 shadow-2xs font-display',
          approved
            ? 'border border-emerald-500/30 bg-emerald-50 text-emerald-700 shadow-[0_1px_6px_rgba(16,185,129,0.14)]'
            : 'border border-rose-500/30 bg-rose-50 text-rose-600 shadow-[0_1px_6px_rgba(244,63,94,0.12)]',
        )}
        style={{ fontFamily: 'var(--font-display)' }}
      >

        {approved ? (
          <>
            <CheckCircle size={14} weight="fill" className="shrink-0 text-emerald-600" />
            <span className="truncate">Approved</span>
          </>
        ) : (
          <>
            <XCircle size={14} weight="fill" className="shrink-0 text-rose-500" />
            <span className="truncate">Not Approved</span>
          </>
        )}
      </div>
    </div>
  )
}

