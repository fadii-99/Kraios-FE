import { useRef, useState } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

import CurrentPlanCard from '@/components/dashboard/subscription/CurrentPlanCard'
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader'
import PricingPlanCard from '@/components/dashboard/subscription/PricingPlanCard'
import Modal from '@/components/ui/Modal'
import PrimaryButton from '@/components/ui/PrimaryButton'
import { DASHBOARD_GUTTER } from '@/lib/dashboard/layout'
import { SUBSCRIPTION_PLANS, currentSubscription } from '@/lib/dashboard/subscriptionPlans'
import { DASHBOARD_MOTION } from '@/lib/dashboard/motion'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { cn } from '@/lib/cn'

/**
 * Billing (/dashboard/subscription) — the account's plan, and what it could be
 * instead.
 *
 * Sequenced, calm architectural reveal:
 * Header → Current Plan Hero Card → Available Plans Heading → 3 Plan Cards Stagger
 */
export default function Subscription() {
  const scope = useRef(null)
  const reduced = usePrefersReducedMotion()
  const [notice, setNotice] = useState(null)

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
    { scope, dependencies: [reduced] },
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
            <CurrentPlanCard
              subscription={currentSubscription}
              onManage={() =>
                setNotice({
                  title: 'Manage Subscription',
                  body: 'Billing is not connected yet. Plan changes, invoices and payment details will open from here once the billing service is live.',
                })
              }
            />
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
          <div className="mt-8 grid grid-cols-1 gap-5 sm:mt-10 sm:grid-cols-2 sm:gap-6 lg:mt-12 xl:grid-cols-3 xl:gap-7">
            {SUBSCRIPTION_PLANS.map((plan) => (
              <div key={plan.id} data-sub-plan-card className="flex">
                <PricingPlanCard
                  plan={plan}
                  isCurrent={plan.id === currentSubscription.planId}
                  onChoose={(chosen) =>
                    setNotice({
                      title: `Choose ${chosen.name}`,
                      body: `Checkout is not connected yet. Selecting ${chosen.name} will start a plan change once the billing service is live.`,
                    })
                  }
                />
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-[0.75rem] leading-relaxed text-[var(--tone-muted)] sm:mt-10">
            Prices shown are placeholders while billing is being set up.
          </p>
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

