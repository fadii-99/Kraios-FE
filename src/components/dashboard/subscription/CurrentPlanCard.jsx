import { CalendarBlank, CreditCard, Crown, GearSix } from '@phosphor-icons/react'
import PrimaryButton from '@/components/ui/PrimaryButton'
import TechnicalIconFrame from '@/components/dashboard/TechnicalIconFrame'
import { cn } from '@/lib/cn'

/**
 * CurrentPlanCard — the account's OWN subscription, on /dashboard/subscription.
 *
 * Architectural hero layout: technical crosshairs, a Crown plate, the billing
 * cadence and end date, the rate, and the manage action.
 *
 * IT DRAWS WHAT IT IS GIVEN. This card used to hardcode a green "Active
 * Subscription" badge and the line "Auto-renews at standard rate" over
 * whatever it was handed. Both were untrue for two of the three states an
 * activation can be in, and the second was untrue in all three — there is no
 * payment gateway and nothing renews itself. An administrator grants a plan
 * for a fixed number of days; when those run out the status is `Past Due` and
 * this card has to say so.
 *
 * The caller renders nothing at all when there is no subscription — `null` is
 * a real answer and is not this component's to dress up.
 */

/** Tone, wording and whether the dot pulses — one entry per real status. */
const STATUS = {
  Active: {
    label: 'Active Subscription',
    dateLabel: 'Renews on',
    pulse: true,
    badge: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-800',
    dot: 'bg-emerald-500',
    ping: 'bg-emerald-400',
    rule: 'bg-emerald-500 shadow-[0_0_10px_rgba(10,108,72,0.35)]',
    frame: 'var(--color-success)',
  },
  'Past Due': {
    label: 'Past Due',
    dateLabel: 'Ended on',
    pulse: false,
    badge: 'border-amber-500/40 bg-amber-500/10 text-amber-800',
    dot: 'bg-amber-500',
    ping: 'bg-amber-400',
    rule: 'bg-amber-500 shadow-[0_0_10px_rgba(180,83,9,0.3)]',
    frame: 'var(--color-warning, #B45309)',
  },
  Cancelled: {
    label: 'Cancelled',
    dateLabel: 'Ran until',
    pulse: false,
    badge: 'border-slate-400/40 bg-slate-500/10 text-slate-700',
    dot: 'bg-slate-400',
    ping: 'bg-slate-300',
    rule: 'bg-slate-400',
    frame: undefined,
  },
}

/** `2026-09-14` → `14 September 2026`. Returns '' rather than 'Invalid Date'. */
function formatDate(iso) {
  if (!iso) return ''
  const [year, month, day] = String(iso).split('-').map(Number)
  if (!year || !month || !day) return ''
  return new Date(year, month - 1, day).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function CurrentPlanCard({ subscription, onManage }) {
  const tone = STATUS[subscription.status] ?? STATUS.Cancelled
  const endsOn = formatDate(subscription.renewalDate)
  return (
    <section
      aria-labelledby="current-plan-heading"
      className="group relative overflow-hidden rounded-md border border-[var(--tone-line-strong)] bg-white shadow-[0_4px_24px_rgba(7,20,38,0.04)] transition-all duration-300 hover:shadow-xs"
    >
      {/* Top Datum Mark — carries the status colour, so the card reads correctly
          from across the room and not only from the badge. */}
      <span
        aria-hidden="true"
        className={cn('absolute -top-px left-0 h-[3.5px] w-36 rounded-tl-md', tone.rule)}
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
            <TechnicalIconFrame icon={Crown} size={84} iconSize={42} accent={tone.frame} />
          </div>

          <div className="min-w-0 space-y-2">
            {/* Live Active Status Badge */}
            <div
              className={cn(
                'inline-flex items-center gap-2 rounded-xs border px-3 py-0.5 shadow-2xs',
                tone.badge,
              )}
            >
              <span className="relative flex h-2 w-2">
                {/* Only a live subscription pulses. A stopped one that still
                    animated would read as "something is happening". */}
                {tone.pulse && (
                  <span
                    className={cn(
                      'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
                      tone.ping,
                    )}
                  />
                )}
                <span className={cn('relative inline-flex h-2 w-2 rounded-full', tone.dot)} />
              </span>
              <span className="font-display text-[0.625rem] font-bold uppercase tracking-[0.14em]">
                {tone.label}
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
              {endsOn && (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <CalendarBlank size={14} weight="bold" className="text-slate-400" />
                    <span>
                      {tone.dateLabel} {endsOn}
                    </span>
                  </span>
                </>
              )}
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
            {/* No "auto-renews" line. Nothing renews itself — an administrator
                grants a plan for a fixed number of days, and saying otherwise
                would have this card promising a charge that never happens. */}
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
