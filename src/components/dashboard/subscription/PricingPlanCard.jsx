import { Blueprint, Buildings, Check, CheckCircle, Crown, Cube, Sparkle } from '@phosphor-icons/react'
import TechnicalIconFrame from '@/components/dashboard/TechnicalIconFrame'
import PrimaryButton from '@/components/ui/PrimaryButton'
import { cn } from '@/lib/cn'

const ICON_MAP = {
  Blueprint,
  Cube,
  Buildings,
  Crown,
}

/**
 * One plan column on /dashboard/subscription.
 *
 * Technical card geometry with a top setting-out line, a plate, a pricing band
 * between hairline rules, the capability checklist, and one CTA.
 *
 * IT STATES WHICH PLAN, NOT WHETHER IT IS PAID UP. `isCurrent` marks the
 * column the account is on and nothing more; the subscription's actual status
 * — Active, Past Due, Cancelled — is the hero card's to report, and it has the
 * field to report it with. This badge used to read "Active", which put a green
 * claim beside a Past Due hero on the same screen.
 *
 * `plan.icon` and `plan.recommended` are OPTIONAL and both default off. The
 * catalogue has neither field; the page passes a plate by price order as
 * decoration, and nothing marks a plan "recommended" because nobody has said
 * which one is.
 */
export default function PricingPlanCard({ plan, isCurrent = false, onChoose }) {
  const Icon = ICON_MAP[plan.icon] ?? Blueprint
  const isRecommended = Boolean(plan.recommended)
  const headingId = `plan-${plan.id}-heading`

  return (
    <article
      aria-labelledby={headingId}
      className={cn(
        'group relative flex h-full w-full flex-col overflow-hidden rounded-md border bg-white',
        'transition-all duration-300 ease-[var(--ease-out-expo)] hover:-translate-y-1 hover:shadow-xs',
        isCurrent
          ? 'border-emerald-500 shadow-[0_6px_28px_rgba(10,108,72,0.08)] ring-1 ring-emerald-500/30'
          : isRecommended
            ? 'border-[var(--color-brand-deep)]/40 shadow-[0_8px_30px_rgba(11,94,215,0.08)] ring-1 ring-[var(--color-brand-deep)]/20'
            : 'border-[var(--tone-line-strong)] hover:border-[var(--color-brand-deep)]/45',
      )}
    >
      {/* Top Setting-out Datum Line */}
      <span
        aria-hidden="true"
        className={cn(
          'absolute -top-px left-0 h-[3.5px] transition-all duration-500',
          isCurrent
            ? 'w-full rounded-t-md bg-emerald-500 shadow-[0_0_10px_rgba(10,108,72,0.35)]'
            : isRecommended
              ? 'w-full rounded-t-md bg-[var(--color-brand-deep)] shadow-[0_0_10px_rgba(11,94,215,0.3)]'
              : 'w-10 rounded-tl-md group-hover:w-28 bg-[var(--color-brand-deep)]',
        )}
      />

      {/* Technical Corner Crosshairs */}
      <div aria-hidden="true" className="pointer-events-none absolute right-3 top-3 select-none font-mono text-[0.625rem] text-slate-300">
        +
      </div>

      {/* ── Card Header: Plate & Status Badges ── */}
      <div className="flex items-start justify-between gap-3 px-6 pt-7 sm:px-7">
        <TechnicalIconFrame
          icon={Icon}
          size={60}
          iconSize={28}
          accent={isCurrent ? 'var(--color-success)' : isRecommended ? 'var(--color-brand-deep)' : undefined}
          interactive
        />

        {/* Status / Tier Badge */}
        {isCurrent ? (
          <div className="inline-flex items-center gap-1.5 rounded-xs border border-emerald-500/35 bg-emerald-50 px-2.5 py-0.5 text-emerald-800 shadow-2xs">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            {/* "Your plan", not "Active". Whether the subscription is live is
                the hero card's statement and it has the status to make it —
                this badge only marks which column the account is on, and
                saying "Active" here contradicted a Past Due hero on the same
                screen. */}
            <span className="font-display text-[0.625rem] font-bold uppercase tracking-[0.14em]">
              Your Plan
            </span>
          </div>
        ) : isRecommended ? (
          <div className="inline-flex items-center gap-1.5 rounded-xs border border-[var(--color-brand-deep)]/30 bg-[var(--color-brand-deep)]/[0.08] px-2.5 py-0.5 text-[var(--color-brand-deep)] shadow-2xs">
            <Sparkle size={11} weight="fill" />
            <span className="font-display text-[0.625rem] font-bold uppercase tracking-[0.14em]">
              Recommended
            </span>
          </div>
        ) : null}
      </div>

      {/* ── Card Body ── */}
      <div className="flex flex-1 flex-col px-6 pb-7 pt-5 sm:px-7">
        {/* Title */}
        <h3
          id={headingId}
          className="text-[1.375rem] font-black uppercase leading-tight tracking-[-0.02em] text-[var(--tone-ink)] transition-transform duration-300 group-hover:translate-x-1"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {plan.name}
        </h3>

        {/* Description (2 lines reserved for alignment across cards) */}
        <p className="mt-2.5 min-h-[3em] text-[0.8125rem] leading-relaxed text-[var(--tone-muted-dark)]">
          {plan.description}
        </p>

        {/* ── Price Isolation Band ── */}
        <div className="my-5 flex items-baseline gap-x-2 border-y border-[var(--tone-line)] py-4">
          <span
            className="text-[2.25rem] font-black leading-none tracking-[-0.03em] tabular-nums text-[var(--tone-ink)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {plan.price}
          </span>
          <span className="text-[0.75rem] font-medium text-[var(--tone-muted)]">
            {plan.cadence}
          </span>
        </div>

        {/* ── Feature Checklist ── */}
        <div className="flex flex-1 flex-col justify-between">
          <ul className="space-y-3.5 pt-1">
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5">
                <div
                  className={cn(
                    'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-xs shadow-2xs',
                    isCurrent
                      ? 'bg-emerald-100 text-emerald-700'
                      : isRecommended
                        ? 'bg-blue-100 text-[var(--color-brand-deep)]'
                        : 'bg-slate-100 text-slate-600',
                  )}
                >
                  <Check size={11} weight="bold" />
                </div>
                <span className="text-[0.8125rem] leading-snug text-[var(--tone-ink)] font-medium">
                  {feature}
                </span>
              </li>
            ))}
          </ul>

          {/* ── CTA Action ── */}
          <div className="pt-8">
            {isCurrent ? (
              <div className="flex h-11 items-center justify-center gap-2 rounded-xs border border-emerald-500/30 bg-emerald-50/80 px-4 text-center shadow-2xs">
                <CheckCircle size={16} weight="fill" className="text-emerald-600 shrink-0" />
                <span
                  className="font-display text-[0.6875rem] font-bold uppercase tracking-[0.14em] text-emerald-800"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  Your Current Plan
                </span>
              </div>
            ) : (
              <PrimaryButton
                type="button"
                variant={isRecommended ? 'solid' : 'outline'}
                size="compact"
                align="center"
                withArrow={false}
                onClick={() => onChoose?.(plan)}
                className="w-full whitespace-nowrap shadow-2xs"
              >
                <span>Choose {plan.name}</span>
              </PrimaryButton>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
