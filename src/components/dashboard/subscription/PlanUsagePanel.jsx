import { cn } from '@/lib/cn'

/**
 * What the account has used, against what its plan allows.
 *
 * THE HALF A PRICING CARD CANNOT SHOW. "30 projects" is an allowance; this is
 * "11 of 30", which is the question somebody opens a billing page to answer.
 *
 * AN UNCAPPED METRIC GETS NO BAR. `limit` is null for a metric the plan does
 * not cap and for every metric when the account has no plan — a bar drawn at
 * 0% against a cap that does not exist reads as "nothing used", which is the
 * opposite of the truth. Those rows show the count and say "no limit" instead.
 *
 * The bar changes colour on the way up rather than only at 100%: an account
 * that has burnt 92% of its renders needs to know before it is refused, not
 * after.
 */
const BAR_TONE = (percent) => {
  if (percent >= 100) return 'bg-rose-500'
  if (percent >= 80) return 'bg-amber-500'
  return 'bg-[var(--color-brand-deep)]'
}

const formatValue = (value, unit) =>
  unit === 'GB'
    ? `${Number(value).toLocaleString('en-GB', { maximumFractionDigits: 1 })} GB`
    : Number(value).toLocaleString('en-GB')

export default function PlanUsagePanel({ usage, hasPlan }) {
  if (!usage || usage.length === 0) return null

  return (
    <section
      aria-labelledby="plan-usage-heading"
      className="rounded-md border border-[var(--tone-line-strong)] bg-white p-6 sm:p-8"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2
          id="plan-usage-heading"
          className="text-[1.125rem] font-bold uppercase tracking-[-0.02em] text-[var(--tone-ink)]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          This Period
        </h2>

        {!hasPlan && (
          /* Said once here rather than eight times in the rows below. */
          <p className="text-[0.75rem] text-[var(--tone-muted-dark)]">
            No plan, so nothing is capped yet
          </p>
        )}
      </div>

      <dl className="mt-6 grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
        {usage.map((metric) => {
          const capped = metric.limit !== null && metric.limit !== undefined
          const percent = capped ? Math.min(100, metric.percent ?? 0) : 0

          return (
            <div key={metric.key} className="min-w-0">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="truncate text-[0.75rem] uppercase tracking-[0.08em] text-[var(--tone-muted)]">
                  {metric.label}
                </dt>
                <dd className="shrink-0 text-[0.8125rem] font-semibold tabular-nums text-[var(--tone-ink)]">
                  {formatValue(metric.used, metric.unit)}
                  {capped ? (
                    <span className="font-normal text-[var(--tone-muted)]">
                      {' / '}
                      {formatValue(metric.limit, metric.unit)}
                    </span>
                  ) : (
                    <span className="ml-1.5 text-[0.6875rem] font-normal text-[var(--tone-muted)]">
                      no limit
                    </span>
                  )}
                </dd>
              </div>

              {capped && (
                <div
                  className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--tone-line)]"
                  role="meter"
                  aria-valuenow={percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${metric.label}: ${metric.used} of ${metric.limit} used`}
                >
                  <span
                    className={cn('block h-full rounded-full transition-all duration-500', BAR_TONE(percent))}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </dl>
    </section>
  )
}
