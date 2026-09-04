import { useEffect, useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

import CurrentPlanCard from '@/components/dashboard/subscription/CurrentPlanCard'
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader'
import PricingPlanCard from '@/components/dashboard/subscription/PricingPlanCard'
import Modal from '@/components/ui/Modal'
import PrimaryButton from '@/components/ui/PrimaryButton'
import { fetchPlans, fetchSubscription } from '@/lib/api'
import { DASHBOARD_GUTTER } from '@/lib/dashboard/layout'
import { toCurrentPlan, toPlanCard } from '@/lib/dashboard/subscriptionPlans'
import { DASHBOARD_MOTION } from '@/lib/dashboard/motion'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { cn } from '@/lib/cn'

/**
 * Billing (/dashboard/subscription) — the account's plan, and what it could be
 * instead.
 *
 * EVERY FIGURE ON THIS PAGE COMES FROM THE SERVER. It used to come from
 * `lib/dashboard/subscriptionPlans.js`: three invented plans in dollars, and an
 * invented "Premium Pro" activation shown to every account as its own. An
 * administrator could create, rename, reprice or deactivate a plan and this
 * page would not move. It now reads `GET /billing/plans/` and
 * `GET /billing/subscription/`, and there is no fallback — an empty catalogue
 * says it is empty, and an account with no plan is told it has none.
 *
 * TWO REQUESTS ON ENTRY, in parallel, because they are independent and the
 * page needs both before it can say which plan is the current one.
 *
 * Sequenced reveal: Header → Current Plan → Available Plans Heading → Cards.
 * The timeline re-runs when the data lands, because on the first pass the
 * cards it animates do not exist yet.
 */

/**
 * Decoration, derived rather than invented: the plate cycles by the plan's
 * position in the price-sorted catalogue the server returns. It carries no
 * meaning the data does not already have, and there is no per-plan `icon`
 * field to read — the old hardcoded module made those up along with the
 * "recommended" ribbon.
 */
const PLATE_ICONS = ['Blueprint', 'Cube', 'Buildings', 'Crown']

/**
 * The one panel every "there is nothing to show" state on this page uses.
 *
 * A notice rather than a silently empty column: an empty grid is
 * indistinguishable from a page that has not finished loading, and this page's
 * empty states are meaningful — no plan, no catalogue, or a read that failed.
 */
function BillingNotice({ title, body, actionLabel, onAction }) {
  return (
    <div
      role="status"
      className="rounded-md border border-[var(--tone-line-strong)] bg-white px-6 py-9 text-center sm:px-10 sm:py-11"
    >
      <h2
        className="text-[1.25rem] font-bold uppercase tracking-[-0.02em] text-[var(--tone-ink)]"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {title}
      </h2>

      <p className="mx-auto mt-3 max-w-[46ch] text-[0.875rem] leading-relaxed text-[var(--tone-muted-dark)]">
        {body}
      </p>

      {actionLabel && (
        <PrimaryButton
          type="button"
          size="compact"
          align="center"
          withArrow={false}
          onClick={onAction}
          className="mt-6 min-w-36"
        >
          {actionLabel}
        </PrimaryButton>
      )}
    </div>
  )
}

export default function Subscription() {
  const scope = useRef(null)
  const reduced = usePrefersReducedMotion()
  const [notice, setNotice] = useState(null)

  // One state object written only from a promise callback — never
  // synchronously inside the effect. `null` is "still loading"; `failed` is a
  // read that came back wrong, which must not render as an empty catalogue.
  const [billing, setBilling] = useState(null)
  const [reloadNonce, setReloadNonce] = useState(0)

  useEffect(() => {
    let cancelled = false

    Promise.all([fetchPlans(), fetchSubscription()])
      .then(([plans, subscription]) => {
        if (!cancelled) setBilling({ plans, subscription, failed: false })
      })
      .catch(() => {
        if (!cancelled) setBilling({ plans: [], subscription: null, failed: true })
      })

    return () => {
      cancelled = true
    }
  }, [reloadNonce])

  const loading = billing === null
  const failed = Boolean(billing?.failed)
  const plans = billing?.plans ?? []
  const current = toCurrentPlan(billing?.subscription, plans)

  useGSAP(
    () => {
      if (reduced) return

      const tl = gsap.timeline({ defaults: { ease: DASHBOARD_MOTION.ease } })

      // 1. Header rule & text
      tl.fromTo(
        '[data-header-rule]',
        { scaleX: 0 },
        { scaleX: 1, duration: 0.4 },
        0,
      ).fromTo(
        '[data-header-eyebrow], [data-header-title], [data-header-slot]',
        { opacity: 0, y: DASHBOARD_MOTION.ySmall },
        { opacity: 1, y: 0, duration: DASHBOARD_MOTION.durationFast, stagger: 0.04 },
        0.06,
      )

      // 2. Current Plan Hero Card
      tl.fromTo(
        '[data-sub-current]',
        { opacity: 0, y: DASHBOARD_MOTION.y, scale: 0.99 },
        { opacity: 1, y: 0, scale: 1, duration: DASHBOARD_MOTION.duration },
        0.12,
      )

      // 3. Available Plans Section Heading & Line Ticks
      tl.fromTo(
        '[data-sub-heading-rule]',
        { scaleX: 0 },
        { scaleX: 1, duration: 0.45, stagger: 0.04 },
        0.22,
      ).fromTo(
        '[data-sub-available-header]',
        { opacity: 0, y: DASHBOARD_MOTION.ySmall },
        { opacity: 1, y: 0, duration: DASHBOARD_MOTION.durationFast },
        0.26,
      )

      // 4. Available Plan Cards Stagger
      tl.fromTo(
        '[data-sub-plan-card]',
        { opacity: 0, y: DASHBOARD_MOTION.y, scale: 0.985 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: DASHBOARD_MOTION.duration,
          stagger: DASHBOARD_MOTION.stagger,
        },
        0.32,
      )
    },
    // `loading` is a dependency: on the first pass the plan cards this
    // timeline animates have not rendered yet.
    { scope, dependencies: [reduced, loading] },
  )

  return (
    <div ref={scope} className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <DashboardPageHeader eyebrow="Billing" title="Subscription">
        <p className="max-w-[38ch] text-[0.875rem] leading-relaxed text-[var(--tone-muted-dark)] sm:text-right">
          Manage your current plan and choose the package that fits your workflow.
        </p>
      </DashboardPageHeader>

      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col overflow-y-auto py-6 sm:py-8 lg:py-10 xl:py-12',
          DASHBOARD_GUTTER,
        )}
      >
        <div className="w-full">
          <div data-sub-current>
            {loading ? (
              <div
                role="status"
                aria-label="Loading your plan"
                className="h-44 animate-pulse rounded-md border border-[var(--tone-line)] bg-[var(--tone-line)]/25"
              />
            ) : failed ? (
              <BillingNotice
                title="Plan Unavailable"
                body="We could not load your subscription just now."
                actionLabel="Try again"
                onAction={() => setReloadNonce((n) => n + 1)}
              />
            ) : current ? (
              <CurrentPlanCard
                subscription={current}
                onManage={() =>
                  setNotice({
                    title: 'Manage Subscription',
                    body: 'There is no self-serve billing yet. Your plan is set by the KRAIOS team — contact us and we will change it for you.',
                  })
                }
              />
            ) : (
              /* No plan is a real state, not an empty slot to fill with a
                 default. Saying so is the whole point of the rewrite. */
              <BillingNotice
                title="No Plan Yet"
                body="This account is not on a subscription plan. The KRAIOS team activates a plan after your onboarding call."
              />
            )}
          </div>

          {/* ── Available Plans Section Header (Center-Aligned, Bold Display) ── */}
          <div className="mt-12 flex flex-col items-center border-t border-[var(--tone-line)] pt-10 text-center sm:mt-14 sm:pt-11 lg:mt-16 lg:pt-12">
            <div data-sub-available-header className="contents">
              <div className="flex items-center justify-center gap-2.5">
                <span data-sub-heading-rule aria-hidden="true" className="h-px w-6 origin-right bg-[var(--color-brand-deep)]" />
                <p className="label-ui text-[var(--color-brand-deep)]">Packages &amp; Tiers</p>
                <span data-sub-heading-rule aria-hidden="true" className="h-px w-6 origin-left bg-[var(--color-brand-deep)]" />
              </div>

              <h2
                className="mt-3.5 text-[1.75rem] font-bold uppercase leading-none tracking-[-0.03em] text-[var(--tone-ink)] sm:mt-4 sm:text-[2.125rem] xl:text-[2.375rem]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Available Plans
              </h2>

              <p className="mt-3.5 max-w-[58ch] text-[0.875rem] leading-relaxed text-[var(--tone-muted-dark)] sm:mt-4 sm:text-[0.9375rem]">
                Every plan runs the same pipeline — plan, model, BoQ. What changes is how
                many projects you can carry and how fast they process.
              </p>
            </div>
          </div>

          {/* Same column rhythm as the project library */}
          {loading ? (
            <div className="mt-8 grid grid-cols-1 gap-5 sm:mt-10 sm:grid-cols-2 sm:gap-6 lg:mt-12 xl:grid-cols-3 xl:gap-7">
              {[0, 1, 2].map((slot) => (
                <div
                  key={slot}
                  aria-hidden="true"
                  className="h-96 animate-pulse rounded-md border border-[var(--tone-line)] bg-[var(--tone-line)]/25"
                />
              ))}
            </div>
          ) : plans.length === 0 ? (
            <div className="mt-8 sm:mt-10 lg:mt-12">
              <BillingNotice
                title={failed ? 'Plans Unavailable' : 'No Plans Published'}
                body={
                  failed
                    ? 'We could not load the plan catalogue just now.'
                    : 'There are no plans on sale at the moment. Contact the KRAIOS team and we will talk you through the options.'
                }
                actionLabel={failed ? 'Try again' : undefined}
                onAction={failed ? () => setReloadNonce((n) => n + 1) : undefined}
              />
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-5 sm:mt-10 sm:grid-cols-2 sm:gap-6 lg:mt-12 xl:grid-cols-3 xl:gap-7">
              {plans.map((plan, index) => (
                <div key={plan.id} data-sub-plan-card className="flex">
                  <PricingPlanCard
                    plan={{
                      ...toPlanCard(plan),
                      icon: PLATE_ICONS[index % PLATE_ICONS.length],
                    }}
                    isCurrent={plan.id === current?.planId}
                    onChoose={(chosen) =>
                      setNotice({
                        title: `Choose ${chosen.name}`,
                        body: `There is no self-serve checkout. To move to ${chosen.name}, contact the KRAIOS team and we will activate it on your account.`,
                      })
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal
        open={Boolean(notice)}
        onClose={() => setNotice(null)}
        title={notice?.title ?? ''}
        labelledBy="subscription-notice-title"
      >
        <p className="mt-4 text-[0.875rem] leading-relaxed text-[var(--tone-muted-dark)]">
          {notice?.body}
        </p>

        <div className="mt-6 flex justify-end">
          <PrimaryButton
            type="button"
            size="compact"
            align="center"
            withArrow={false}
            onClick={() => setNotice(null)}
            className="w-full sm:w-auto min-w-28"
          >
            Close
          </PrimaryButton>
        </div>
      </Modal>
    </div>
  )
}

