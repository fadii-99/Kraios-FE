/**
 * Subscription content for /dashboard/subscription.
 *
 * Everything on that page — the active plan summary and the three plan
 * columns — is read from here, so replacing it with an API response means
 * touching this module and nothing else. It is shaped the way a billing
 * endpoint would answer: one subscription object, one array of plans.
 *
 * ALL OF IT IS MOCK. There is no billing backend, no checkout and no feature
 * enforcement behind these strings; the prices and limits are placeholders in
 * the same spirit as `site.email` being `hello@example.com` — obviously dummy
 * rather than plausibly real.
 *
 * `icon` names are Phosphor components resolved by the card, not imports, so
 * this file stays plain data.
 */

/** The plan the signed-in account is on. `planId` matches an id below. */
export const currentSubscription = {
  planId: 'premium-pro',
  planName: 'Premium Pro',
  status: 'Active',
  price: '$149',
  cadence: '/ seat / month',
  billingCycle: 'Monthly',
  nextRenewal: 'September 14, 2026',
  features: [
    '25 floor plan projects / month',
    'Full 2D to 3D architectural models',
    'BoQ generation with instant quantities',
    'Priority AI processing queue',
    'Complete exports: CAD, 3D & BoQ',
  ],
}

export const SUBSCRIPTION_PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    icon: 'Blueprint',
    description: 'One architect taking a single plan through the full pipeline.',
    price: '$49',
    cadence: '/ seat / month',
    features: [
      '3 floor plan projects',
      '2D to 3D model generation',
      'Standard processing queue',
      'PDF and image exports',
      'Email support',
    ],
  },
  {
    id: 'premium-pro',
    name: 'Premium Pro',
    icon: 'Crown',
    description: 'A working studio pricing plans and BoQs every week.',
    price: '$149',
    cadence: '/ seat / month',
    recommended: true,
    features: [
      '25 floor plan projects',
      'Edit instructions on every model',
      'BoQ generation with quantities',
      'Priority processing queue',
      'Full export set',
    ],
  },
  {
    id: 'studio',
    name: 'Studio',
    icon: 'Buildings',
    description: 'Several projects and several seats running at once.',
    price: '$299',
    cadence: '/ seat / month',
    features: [
      'Unlimited floor plan projects',
      'Everything in Premium Pro',
      'Multi-seat studio workspace',
      'Shared project library',
      'Dedicated onboarding session',
    ],
  },
]
