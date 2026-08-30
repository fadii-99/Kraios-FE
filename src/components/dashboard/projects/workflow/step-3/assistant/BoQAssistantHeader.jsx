import { Link } from 'react-router-dom'
import { ArrowLeft } from '@phosphor-icons/react'

import ApprovalStatus from '@/components/dashboard/projects/workflow/step-2/ApprovalStatus'
import FloorPlansDropdown from '@/components/dashboard/projects/workflow/step-2/assistant/FloorPlansDropdown'
import FloorPlans3DDropdown from '@/components/dashboard/projects/workflow/step-3/assistant/FloorPlans3DDropdown'
import UploadedDocumentsDropdown from '@/components/dashboard/projects/workflow/step-3/assistant/UploadedDocumentsDropdown'
import Logo from '@/components/ui/Logo'
import { BOQ_ASSISTANT_COPY } from '@/lib/dashboard/workflow/step-3/boqAssistantConfig'
import { cn } from '@/lib/cn'

/**
 * Step 3 BoQ Assistant Header.
 *
 * Uses the exact same proportions, layout architecture, typography,
 * borders, subtle-radius system, and visual hierarchy as Design Assistant.
 */
export default function BoQAssistantHeader({
  backTo,
  uploadedDocuments = [],
  onRemoveDocument,
  approved,
  busy,
  source,
  approvedRender,
}) {
  return (
    <header className="relative z-40 shrink-0 border-b border-[var(--tone-line)] bg-white/95 shadow-[0_1px_3px_rgba(7,20,38,0.03)] backdrop-blur-md">
      <div className="flex w-full items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-5 sm:py-3.5 lg:px-6 lg:py-3.5">
        {/* Left Cluster: Back Button + Divider + Kraios Logo & Title */}
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <div className="relative group/back">
            <Link
              to={backTo}
              aria-label="Back to BOQ"
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

            {/* Custom Light Tooltip */}
            <div
              role="tooltip"
              className={cn(
                'pointer-events-none absolute left-0 top-full z-50 mt-1.5 whitespace-nowrap rounded-xs border border-slate-200 bg-white/95 px-2 py-0.5 text-[0.625rem] font-semibold text-slate-700 shadow-md backdrop-blur-xs',
                'opacity-0 -translate-y-1 transition-all duration-200 ease-out',
                'group-hover/back:opacity-100 group-hover/back:translate-y-0 group-focus-within/back:opacity-100 group-focus-within/back:translate-y-0',
              )}
            >
              Back to BOQ
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
                  {BOQ_ASSISTANT_COPY.assistantTitle}
                </h1>
                <span className="hidden rounded-xs border border-[var(--color-brand-deep)]/20 bg-[var(--color-brand-deep)]/10 px-1.5 py-0.5 text-[0.5625rem] font-bold tracking-wider text-[var(--color-brand-deep)] uppercase md:inline-block">
                  BOQ Studio
                </span>
              </div>
              <p className="mt-0.5 hidden truncate text-[0.6875rem] leading-none text-[var(--tone-muted-dark)] xl:block">
                {BOQ_ASSISTANT_COPY.assistantSubtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Right Cluster: Uploaded Documents + 2D Plans + 3D Plans + Status */}
        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3 lg:gap-3.5">
          <UploadedDocumentsDropdown
            documents={uploadedDocuments}
            onRemove={onRemoveDocument}
            disabled={busy}
            showLabel={false}
            className="hidden sm:flex"
          />

          <span
            aria-hidden="true"
            className="hidden h-4 w-px shrink-0 bg-[var(--tone-line)] sm:block"
          />

          <FloorPlansDropdown source={source} className="hidden sm:flex" />

          <span
            aria-hidden="true"
            className="hidden h-4 w-px shrink-0 bg-[var(--tone-line)] sm:block"
          />

          <FloorPlans3DDropdown approvedRender={approvedRender} className="hidden sm:flex" />

          <span
            aria-hidden="true"
            className="hidden h-4 w-px shrink-0 bg-[var(--tone-line)] sm:block"
          />

          <ApprovalStatus approved={approved} showLabel />
        </div>
      </div>

      {/* Second row, below sm: dropdowns on narrow mobile viewports */}
      <div className="border-t border-[var(--tone-line)] bg-white/95 px-3.5 py-2 sm:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <UploadedDocumentsDropdown
            documents={uploadedDocuments}
            onRemove={onRemoveDocument}
            disabled={busy}
            showLabel={false}
          />
          <FloorPlansDropdown source={source} />
          <FloorPlans3DDropdown approvedRender={approvedRender} />
        </div>
      </div>
    </header>
  )
}
