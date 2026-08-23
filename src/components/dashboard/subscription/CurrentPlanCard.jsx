import { Crown } from '@phosphor-icons/react'

import TechnicalIconFrame from '@/components/dashboard/TechnicalIconFrame'

/**
 * CurrentPlanCard — Hero Active Subscription Banner for /dashboard/subscription.
 *
 * Sizable, architectural card layout:
 * - Upper drawing zone: Large Crown plate, plan title, active badge, and rate figure
 */
export default function CurrentPlanCard({ subscription }) {
  return (
    <section
      aria-labelledby="current-plan-heading"
      className="group relative border border-[var(--tone-line)] bg-white shadow-[0_4px_24px_rgba(7,20,38,0.04)] transition-[border-color,transform] duration-300 ease-[var(--ease-out-expo)] hover:border-emerald-500/50"
    >
      {/* The setting-out mark that opens every Kraios band: emerald green active datum */}
      <span
        aria-hidden="true"
        className="absolute -top-px left-0 h-[3.5px] w-32 bg-emerald-500 shadow-[0_0_8px_rgba(10,108,72,0.35)]"
      />

      {/* ── Main Drawing Zone: Balanced architectural height and clean alignment ──────── */}
      <div className="flex flex-col gap-8 px-6 py-8 sm:px-9 sm:py-9 lg:flex-row lg:items-center lg:justify-between lg:gap-12 lg:px-11 lg:py-10">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:gap-8 lg:gap-10">
          <TechnicalIconFrame
            icon={Crown}
            size={96}
            iconSize={48}
            accent="var(--color-success)"
          />

          <div className="min-w-0">
            <p className="label-ui text-[var(--tone-muted)]">Current Plan</p>

            <h2
              id="current-plan-heading"
              className="mt-2 text-[1.75rem] font-bold uppercase leading-[1.05] tracking-[-0.03em] text-[var(--tone-ink)] sm:text-[2rem] xl:text-[2.25rem] transition-transform duration-300 ease-[var(--ease-out-expo)] group-hover:translate-x-1"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {subscription.planName}
            </h2>

            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-3.5 py-1 text-emerald-700 shadow-xs">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="label-ui text-[0.6875rem] font-bold tracking-[0.14em]">
                ACTIVE SUBSCRIPTION
              </span>
            </div>
          </div>
        </div>

        {/* Baseline-aligned, flushed to the far edge */}
        <p className="flex flex-wrap items-baseline gap-x-3.5 lg:shrink-0 lg:justify-end">
          <span
            className="text-[2.5rem] font-bold leading-none tracking-[-0.03em] tabular-nums text-[var(--tone-ink)] sm:text-[2.875rem] xl:text-[3.25rem]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {subscription.price}
          </span>
          <span className="text-[0.875rem] font-medium text-[var(--tone-muted)] sm:text-[0.9375rem]">
            {subscription.cadence}
          </span>
        </p>
      </div>
    </section>
  )
}
