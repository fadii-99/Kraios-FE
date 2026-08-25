import { CalendarBlank, CheckCircle, CreditCard, Crown, GearSix } from '@phosphor-icons/react'
import PrimaryButton from '@/components/ui/PrimaryButton'
import TechnicalIconFrame from '@/components/dashboard/TechnicalIconFrame'

/**
 * CurrentPlanCard — Hero Active Subscription Banner for /dashboard/subscription.
 *
 * Sizable, architectural card layout matching Kraios design system:
 * - Technical squared blueprint backdrop with subtle crosshairs
 * - Prominent Crown plate with active green pulsating badge
 * - Billing cycle & renewal metadata
 * - Feature capability highlight chips
 * - Large price display and Manage Subscription action button
 */
export default function CurrentPlanCard({ subscription, onManage }) {
  return (
    <section
      aria-labelledby="current-plan-heading"
      className="group relative overflow-hidden rounded-md border border-[var(--tone-line-strong)] bg-white shadow-[0_4px_24px_rgba(7,20,38,0.04)] transition-all duration-300 hover:border-emerald-500/50 hover:shadow-xs"
    >
      {/* Top Emerald Active Datum Mark */}
      <span
        aria-hidden="true"
        className="absolute -top-px left-0 h-[3.5px] w-36 rounded-tl-md bg-emerald-500 shadow-[0_0_10px_rgba(10,108,72,0.35)]"
      />

      {/* Technical Corner Crosshair Marks */}
      <div aria-hidden="true" className="pointer-events-none absolute left-3 top-3 select-none font-mono text-[0.625rem] text-slate-300">
        +
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute right-3 top-3 select-none font-mono text-[0.625rem] text-slate-300">
        +
      </div>

      {/* ── Main Hero Card Body ── */}
      <div className="flex flex-col gap-8 px-6 py-8 sm:px-9 sm:py-9 lg:flex-row lg:items-center lg:justify-between lg:gap-10 lg:px-10 lg:py-9">
        {/* Left Side: Icon Plate + Plan Title + Active Badge + Renewal Info */}
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-7 lg:gap-8">
          <div className="relative shrink-0">
            <TechnicalIconFrame
              icon={Crown}
              size={84}
              iconSize={42}
              accent="var(--color-success)"
            />
          </div>

          <div className="min-w-0 space-y-2">
            {/* Live Active Status Badge */}
            <div className="inline-flex items-center gap-2 rounded-xs border border-emerald-500/35 bg-emerald-500/10 px-3 py-0.5 text-emerald-800 shadow-2xs">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="font-display text-[0.625rem] font-bold uppercase tracking-[0.14em]">
                Active Subscription
              </span>
            </div>

            {/* Plan Title */}
            <h2
              id="current-plan-heading"
              className="text-[1.75rem] font-black uppercase leading-[1.05] tracking-[-0.03em] text-[var(--tone-ink)] sm:text-[2rem] lg:text-[2.25rem]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {subscription.planName}
            </h2>

            {/* Renewal & Billing Cadence Details */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.75rem] text-[var(--tone-muted-dark)]">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <CreditCard size={14} weight="bold" className="text-slate-400" />
                <span>Billed {subscription.billingCycle}</span>
              </span>
              <span className="text-slate-300">·</span>
              <span className="inline-flex items-center gap-1.5 font-medium">
                <CalendarBlank size={14} weight="bold" className="text-slate-400" />
                <span>Renews on {subscription.nextRenewal}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Rate Figure & Manage Subscription Action */}
        <div className="flex flex-col gap-4 border-t border-[var(--tone-line)] pt-6 sm:flex-row sm:items-center sm:justify-between lg:flex-col lg:items-end lg:border-t-0 lg:pt-0">
          <div className="text-left lg:text-right">
            <div className="flex items-baseline gap-x-2">
              <span
                className="text-[2.5rem] font-black leading-none tracking-[-0.03em] tabular-nums text-[var(--tone-ink)] sm:text-[2.875rem]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {subscription.price}
              </span>
              <span className="text-[0.8125rem] font-medium text-[var(--tone-muted)]">
                {subscription.cadence}
              </span>
            </div>
            <p className="mt-1 text-[0.6875rem] font-medium text-emerald-700">
              Auto-renews at standard rate
            </p>
          </div>

          <PrimaryButton
            type="button"
            onClick={onManage}
            variant="outline"
            size="compact"
            align="center"
            withArrow={false}
            className="w-full sm:w-auto whitespace-nowrap shadow-2xs"
          >
            <span className="flex items-center justify-center gap-2">
              <GearSix size={16} weight="bold" />
              <span>Manage Subscription</span>
            </span>
          </PrimaryButton>
        </div>
      </div>
    </section>
  )
}
