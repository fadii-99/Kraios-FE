import { Calculator } from '@phosphor-icons/react'
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader'

/**
 * Structural placeholder page for Estimates (/dashboard/estimates).
 *
 * Nothing links here: the Bill of Quantities is a stage inside a project, not a
 * global destination, so it was dropped from the sidebar. The route still
 * resolves; delete this page once that is confirmed. Until then it uses the
 * shared page header and the shared surface padding so it cannot drift.
 */
export default function Estimates() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <DashboardPageHeader eyebrow="Workspace" title="Estimates" />

      <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-7 sm:py-8 lg:px-10 lg:py-8 xl:px-12 xl:py-10">
        <div className="relative border border-[var(--tone-line)] bg-white p-8 sm:p-10">
          <span aria-hidden="true" className="absolute left-3 top-3 h-3 w-3 border-l border-t border-[var(--tone-line-strong)]" />
          <span aria-hidden="true" className="absolute right-3 top-3 h-3 w-3 border-r border-t border-[var(--tone-line-strong)]" />
          <span aria-hidden="true" className="absolute bottom-3 left-3 h-3 w-3 border-b border-l border-[var(--tone-line-strong)]" />
          <span aria-hidden="true" className="absolute bottom-3 right-3 h-3 w-3 border-b border-r border-[var(--tone-line-strong)]" />

          <div className="flex flex-col items-start gap-4">
            <div className="flex h-11 w-11 items-center justify-center border border-[var(--tone-line)] bg-[var(--color-light)] text-[var(--color-brand-deep)]">
              <Calculator size={22} weight="regular" aria-hidden="true" />
            </div>

            <h2 className="label-ui text-[var(--tone-ink)]">Estimating Engine</h2>

            <p className="max-w-xl text-[0.9375rem] leading-relaxed text-[var(--tone-muted-dark)]">
              The Bill of Quantities lives inside a project, under its BoQ stage.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
