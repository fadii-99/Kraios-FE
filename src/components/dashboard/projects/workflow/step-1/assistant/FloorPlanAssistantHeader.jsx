import { Link } from 'react-router-dom'
import { ArrowLeft } from '@phosphor-icons/react'

import ApprovalStatus from '@/components/dashboard/projects/workflow/step-2/ApprovalStatus'
import Logo from '@/components/ui/Logo'
import { FLOOR_PLAN_ASSISTANT_COPY } from '@/lib/dashboard/workflow/step-1/floorPlanAssistantConfig'
import { cn } from '@/lib/cn'

/**
 * 2D Floor Plan Assistant Header.
 *
 * Clean architectural header bar:
 * - Left: Back to Step 1 Upload + Kraios Logo + "KRAIOS 2D FLOOR PLAN ASSISTANT" Title + "2D Studio" Badge
 * - Right: Status indicator matching 3D Design Assistant (STATUS · NOT APPROVED / APPROVED)
 */
export default function FloorPlanAssistantHeader({
  backTo,
  approved = false,
}) {
  return (
    <header className="relative z-40 shrink-0 border-b border-[var(--tone-line)] bg-white/95 shadow-[0_1px_3px_rgba(7,20,38,0.03)] backdrop-blur-md">
      <div className="flex w-full items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-5 sm:py-3.5 lg:px-6 lg:py-3.5">
        {/* ── Left Cluster: Back Button + Divider + Kraios Logo & Title ── */}
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <div className="relative group/back">
            <Link
              to={backTo}
              aria-label="Back to Step 1"
              className={cn(
                'flex h-8 w-8 sm:h-8.5 sm:w-8.5 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-[var(--tone-line-strong)] bg-white text-[var(--tone-ink)] shadow-2xs',
                'transition-all duration-200 hover:border-[var(--color-brand-deep)] hover:bg-[var(--color-brand-deep)] hover:text-white active:scale-95',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-deep)]',
              )}
            >
              <ArrowLeft
                size={16}
                weight="bold"
                aria-hidden="true"
                className="shrink-0 transition-transform duration-200 group-hover/back:-translate-x-0.5"
              />
            </Link>

            <div
              role="tooltip"
              className={cn(
                'pointer-events-none absolute left-0 top-full z-50 mt-1.5 whitespace-nowrap rounded-xs border border-slate-200 bg-white/95 px-2 py-0.5 text-[0.625rem] font-semibold text-slate-700 shadow-md backdrop-blur-xs',
                'opacity-0 -translate-y-1 transition-all duration-200 ease-out',
                'group-hover/back:opacity-100 group-hover/back:translate-y-0 group-focus-within/back:opacity-100 group-focus-within/back:translate-y-0',
              )}
            >
              Back to Floor Plan Upload
              <div className="absolute -top-1 left-3 h-1.5 w-1.5 rotate-45 border-l border-t border-slate-200 bg-white" />
            </div>
          </div>

          <span
            aria-hidden="true"
            className="hidden h-5 w-px shrink-0 bg-[var(--tone-line)] sm:block"
          />

          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 sm:h-8.5 sm:w-8.5 shrink-0 items-center justify-center rounded-sm border border-[var(--color-brand-deep)]/20 bg-white p-1 shadow-2xs">
              <Logo size="compact" className="flex items-center justify-center h-full w-full object-contain" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1
                  className="truncate text-[0.875rem] font-black uppercase leading-tight tracking-[-0.02em] text-[var(--tone-ink)] sm:text-[0.9375rem] lg:text-[1rem]"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {FLOOR_PLAN_ASSISTANT_COPY.workspaceTitle}
                </h1>
                <span className="hidden rounded-xs border border-[var(--color-brand-deep)]/20 bg-[var(--color-brand-deep)]/10 px-1.5 py-0.5 text-[0.5625rem] font-bold tracking-wider text-[var(--color-brand-deep)] uppercase md:inline-block">
                  2D Studio
                </span>
              </div>
              <p className="mt-0.5 hidden truncate text-[0.6875rem] leading-none text-[var(--tone-muted-dark)] xl:block">
                {FLOOR_PLAN_ASSISTANT_COPY.assistantSubtitle}
              </p>
            </div>
          </div>
        </div>

        {/* ── Right Cluster: Approval Status (Matching 3D Design Assistant) ── */}
        <div className="ml-auto flex shrink-0 items-center">
          <ApprovalStatus approved={approved} showLabel />
        </div>
      </div>
    </header>
  )
}
