/**
 * Presentation for /dashboard/subscription.
 *
 * THIS FILE USED TO BE THE DATA. It held three invented plans — Starter,
 * Premium Pro, Studio at $49/$149/$299 — and an invented active subscription
 * that every account was shown as its own. None of it came from anywhere: an
 * administrator could create, rename, reprice or deactivate a plan in the
 * console and this page would go on showing the same three names. It is now
 * the ADAPTER instead, and the data comes from `GET /billing/plans/` and
 * `GET /billing/subscription/`.
 *
 * Do not add a plan, a price or a feature line to this module. If it is not in
 * the API response it is not on sale, and an empty catalogue is a thing the
 * page has to be able to say.
 *
 * CURRENCY IS POUNDS, because that is what the console prices in
 * (`admin/format.js` → `formatPrice`). The old hardcoded module printed
 * dollars, so the two halves of the product quoted different money for the
 * same plan.
 */

const GBP = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0,
})

/** `0` is free and says so rather than printing a currency zero. */
export function formatPlanPrice(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return '—'
  return amount === 0 ? 'Free' : GBP.format(amount)
}

/**
 * What follows the price — "/ month" or "/ year".
 *
 * NOT "/ seat / month", which is what the hardcoded module said. There are no
 * seats: an account is one login, and a per-seat price implies a multi-seat
 * product that does not exist.
 */
export const cadenceFor = (billingCycle) =>
  billingCycle === 'Annual' ? '/ year' : '/ month'

/**
 * The caps a plan publishes, as lines a card can list.
 *
 * `0` means the plan does not offer that capability at all — the same reading
 * the console's own limit column uses — so it is stated as "No …" rather than
 * dropped, because a missing line and a line that says zero mean different
 * things to somebody choosing a plan.
 */
const LIMIT_LABELS = [
  ['projects', 'projects'],
  ['plans2d', '2D floor plans'],
  ['renders3d', '3D renders'],
  ['boqs', 'BoQs'],
  ['documents', 'documents'],
]

export function limitLines(limits) {
  if (!limits) return []

  const lines = LIMIT_LABELS.map(([key, label]) => {
    const value = Number(limits[key])
    if (!Number.isFinite(value)) return null
    return value === 0 ? `No ${label}` : `${value.toLocaleString('en-GB')} ${label}`
  }).filter(Boolean)

  const storage = Number(limits.storageGb)
  if (Number.isFinite(storage)) {
    lines.push(storage === 0 ? 'No storage' : `${storage.toLocaleString('en-GB')} GB storage`)
  }

  return lines
}

/**
 * One API plan as the pricing card reads it.
 *
 * The checklist is the administrator's own `features` when the plan has any,
 * and the plan's limits when it has none. Never both: a card that lists five
 * authored lines and then repeats them as numbers reads as two plans.
 *
 * There is no `recommended` flag and no per-plan `icon`, because the catalogue
 * has neither. The old module invented both.
 */
export function toPlanCard(plan) {
  const features = Array.isArray(plan.features) ? plan.features.filter(Boolean) : []

  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    price: formatPlanPrice(plan.price),
    cadence: cadenceFor(plan.billingCycle),
    features: features.length > 0 ? features : limitLines(plan.limits),
  }
}

/**
 * The account's own subscription as the hero card reads it, or `null`.
 *
 * `status` is carried through verbatim. An activation that has run out arrives
 * as `Past Due` and must be drawn as `Past Due` — the card no longer says
 * "Active Subscription" over whatever it was given.
 *
 * `features` and the plan's caps are looked up from the catalogue by `planId`,
 * because the subscription record stores the price and the name it was sold
 * at and nothing else. When the plan has since been deactivated it will not be
 * in the catalogue at all, and the card renders without a capability list
 * rather than inventing one.
 */
export function toCurrentPlan(subscription, plans = []) {
  if (!subscription) return null

  const plan = plans.find((candidate) => candidate.id === subscription.planId) ?? null

  return {
    planId: subscription.planId,
    planName: subscription.plan,
    status: subscription.status,
    price: formatPlanPrice(subscription.price),
    cadence: cadenceFor(subscription.billingCycle),
    billingCycle: subscription.billingCycle,
    startDate: subscription.startDate,
    renewalDate: subscription.renewalDate,
    features: plan ? toPlanCard(plan).features : [],
  }
}
