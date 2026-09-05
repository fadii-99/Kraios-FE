/**
 * Billing — the plan catalogue and this account's own subscription.
 *
 * BOTH ARE READS AND THERE IS NOTHING ELSE. An account is put on a plan by an
 * administrator, for a fixed number of days; there is no payment gateway and
 * no checkout. So this module cannot start, change or cancel a subscription,
 * and a control that appeared to do so would be a purchase that never happens.
 *
 * THESE REPLACE A HARDCODED MODULE. `lib/dashboard/subscriptionPlans.js` used
 * to hold three invented plans priced in dollars and an invented "Premium Pro"
 * activation that every account was shown as its own. Nothing in this app may
 * declare a plan again: the catalogue belongs to the admin console, and if it
 * is not in this response it is not on sale.
 *
 * WHAT THE SERVER WITHHOLDS is deliberate and is not worked around here — a
 * plan's administrative status, its subscriber count and the unmetered API cap
 * never reach the browser. Inactive plans are simply absent.
 */
import { apiClient } from './client'

export const BILLING_ENDPOINTS = {
  plans: '/billing/plans/',
  subscription: '/billing/subscription/',
  usage: '/billing/usage/',
}

/**
 * The plans on sale, cheapest first.
 *
 * Active plans only — the server filters, so an empty array means the
 * catalogue is genuinely empty and the page must say so rather than fall back
 * to anything.
 *
 * @returns {Promise<Array<{
 *   id: string, name: string, description: string, price: number,
 *   billingCycle: string, features: string[],
 *   limits: { projects: number, plans2d: number, renders3d: number,
 *             boqs: number, documents: number, storageGb: number },
 * }>>}
 */
export async function fetchPlans() {
  const data = await apiClient(BILLING_ENDPOINTS.plans, { method: 'GET' })
  return Array.isArray(data?.plans) ? data.plans : []
}

/**
 * This account's subscription, or `null`.
 *
 * `null` IS THE ANSWER for an account no administrator has put on a plan, and
 * the caller has to render it as "no plan" — never as a default one. `status`
 * is resolved server-side against today, so `Past Due` arrives as `Past Due`
 * and must not be redrawn as active.
 *
 * @returns {Promise<null | {
 *   planId: string, plan: string, billingCycle: string, price: number,
 *   status: 'Active'|'Past Due'|'Cancelled',
 *   startDate: string, renewalDate: string,
 * }>}
 */
export async function fetchSubscription() {
  const data = await apiClient(BILLING_ENDPOINTS.subscription, { method: 'GET' })
  return data?.subscription ?? null
}

/**
 * What this account has used, against what its plan allows.
 *
 * THE OTHER HALF OF A PLAN. "30 projects" is an allowance; "11 of 30" is the
 * thing a customer actually needs. The server counts it with the same
 * functions the admin Usage screen uses, so there is no second tally to drift.
 *
 * `limit` and `percent` are `null` for an uncapped metric AND for every metric
 * when the account has no plan. A meter drawn at 0% against a cap that does
 * not exist reads as "nothing used" — render the count on its own instead.
 *
 * @returns {Promise<{
 *   usage: Array<{ key: string, label: string, unit: string, used: number,
 *                  limit: number|null, remaining: number|null,
 *                  percent: number|null }>,
 *   overallPercent: number|null,
 *   hasPlan: boolean,
 * }>}
 */
export async function fetchUsage() {
  const data = await apiClient(BILLING_ENDPOINTS.usage, { method: 'GET' })

  return {
    usage: Array.isArray(data?.usage) ? data.usage : [],
    overallPercent: data?.overallPercent ?? null,
    hasPlan: Boolean(data?.hasPlan),
  }
}
