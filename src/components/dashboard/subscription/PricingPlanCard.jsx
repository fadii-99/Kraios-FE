import { Blueprint, Buildings, Check, CheckCircle, Crown, Cube } from '@phosphor-icons/react'

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
 * LIGHT, and built from the project library card's vocabulary rather than a
 * pricing template: white fill, one hairline border, radius 0, a blue
 * setting-out rule on the top datum that extends on hover, a `TechnicalIconFrame`
 * plate for the mark, and the same restrained hover — border warms to
 * brand-deep, the card lifts 2px, nothing zooms, blooms or glows. A plan and a
 * project are both product modules on the same sheet, so they are drawn the
 * same way.
 *
 * Reading order is deliberate and identical in all three columns: mark, name,
 * what it is for, what it costs, what is in it, what you do about it. Every
 * column sits on the same datums — the description reserves two lines, the
 * price band is a fixed slot between two hairlines and the feature list takes
 * `flex-1` — so the row can be scanned ACROSS rather than card by card, and
 * `$49 / $149 / $299` land on one line. `h-full` plus that `flex-1` is also
 * what levels the CTAs without a hardcoded height.
 *
 * The price sits in its own band because that is the one figure a plan row is
 * actually compared on; two hairlines and generous air isolate it without a
 * box, a fill or a badge.
 *
 * THE RECOMMENDED PLAN is marked by holding the hover state permanently: its
 * accent rule is already run out to full width and its border already carries
 * the brand tint, plus the word "Recommended". No fill, no glow, no scale and
 * no enlarged column — the distinction survives without colour and the card
 * stays a member of the same family.
 *
 * THE CURRENT PLAN does not get a button. A disabled control sitting at
 * `opacity-55` reads as a weaker button rather than as a state, so the CTA slot
 * takes a status strip on the same 44px box: hairline, light fill, `CheckCircle`
 * and the words. It is a `<p>`, not a `<button>` — there is nothing to press.
 */
export default function PricingPlanCard({ plan, isCurrent = false, onChoose }) {
  const Icon = ICON_MAP[plan.icon] ?? Blueprint
  const emphasised = Boolean(plan.recommended)
  const headingId = `plan-${plan.id}-heading`

  return (
    <article
      aria-labelledby={headingId}
      className={cn(
        'group relative flex h-full w-full flex-col border bg-white',
        'transition-[border-color,transform,box-shadow] duration-300 ease-[var(--ease-out-expo)] motion-reduce:transition-none',
        'hover:-translate-y-0.5 motion-reduce:hover:translate-y-0',
        isCurrent
          ? 'border-emerald-500 shadow-[0_6px_28px_rgba(10,108,72,0.12)] ring-1 ring-emerald-500/30'
          : emphasised
            ? 'border-[var(--color-brand-deep)]/35 hover:border-[var(--color-brand-deep)]/60'
            : 'border-[var(--tone-line)] hover:border-[var(--color-brand-deep)]/45',
      )}
    >
      {/* The card's setting-out rule on the top edge. Green for active, blue for others. */}
      <span
        aria-hidden="true"
        className={cn(
          'absolute -top-px left-0 h-[3.5px]',
          'transition-[width] duration-500 ease-[var(--ease-out-expo)] motion-reduce:transition-none',
          isCurrent
            ? 'w-full bg-emerald-500 shadow-[0_0_10px_rgba(10,108,72,0.35)]'
            : emphasised
              ? 'w-full bg-[var(--color-brand-deep)]'
              : 'w-10 group-hover:w-24 bg-[var(--color-brand-deep)]',
        )}
      />

      {/* ── Identity: the plate, and the column's standing label ───────── */}
      <div className="flex items-start justify-between gap-3 px-6 pt-8 sm:px-8">
        <TechnicalIconFrame icon={Icon} size={64} iconSize={30} interactive />

        {isCurrent ? (
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-3 py-1 shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="label-ui text-[0.6875rem] font-bold tracking-[0.14em] text-emerald-700 uppercase">
              ACTIVE
            </span>
          </div>
        ) : emphasised ? (
          <p className="label-ui inline-flex items-center gap-2 pt-2 text-[var(--color-brand-deep)]">
            <span aria-hidden="true" className="h-1.5 w-1.5 bg-[var(--color-brand-deep)]" />
            Recommended
          </p>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col px-6 pb-8 pt-7 sm:px-8">
        <h3
          id={headingId}
          className="text-[1.25rem] font-bold uppercase leading-[1.15] tracking-[-0.02em] text-[var(--tone-ink)] sm:text-[1.375rem] transition-transform duration-300 ease-[var(--ease-out-expo)] group-hover:translate-x-1"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {plan.name}
        </h3>

        {/* Two lines reserved so the price band below sits on a common datum
            across the row whether a description wraps to one line or two. */}
        <p className="mt-3.5 min-h-[3.25em] text-[0.875rem] leading-relaxed text-[var(--tone-muted)]">
          {plan.description}
        </p>

        {/* The compared figure, isolated by air between two hairlines. Navy,
            not blue: the figure is read, the accent is structural. */}
        <p className="mt-6 flex flex-wrap items-baseline gap-x-2.5 border-y border-[var(--tone-line)] py-6">
          <span
            className="text-[2rem] font-bold leading-none tracking-[-0.03em] tabular-nums text-[var(--tone-ink)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {plan.price}
          </span>
          <span className="text-[0.8125rem] text-[var(--tone-muted)]">{plan.cadence}</span>
        </p>

        {/* What is included. No box and no badges — structure comes from the
            rule above and the whitespace, as everywhere else. */}
        <ul className="mt-7 flex flex-1 flex-col gap-4">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-3">
              <Check
                size={13}
                weight="bold"
                aria-hidden="true"
                className={cn(
                  'mt-[0.25rem] shrink-0',
                  isCurrent ? 'text-emerald-600' : 'text-[var(--color-brand-deep)]',
                )}
              />
              <span className="text-[0.8125rem] leading-snug text-[var(--tone-ink)]">
                {feature}
              </span>
            </li>
          ))}
        </ul>

        {isCurrent ? (
          <div className="label-ui mt-9 flex min-h-11 items-center justify-center gap-2.5 border border-emerald-500/30 bg-emerald-500/[0.08] px-6 py-3 font-semibold text-emerald-700 shadow-xs">
            <CheckCircle size={16} weight="fill" className="text-emerald-600 shrink-0" aria-hidden="true" />
            <span>Active Subscription</span>
          </div>
        ) : (
          <PrimaryButton
            type="button"
            variant={emphasised ? 'solid' : 'outline'}
            size="compact"
            align="center"
            withArrow={false}
            onClick={() => onChoose?.(plan)}
            className="mt-9 w-full whitespace-nowrap"
          >
            Choose {plan.name}
          </PrimaryButton>
        )}
      </div>
    </article>
  )
}
