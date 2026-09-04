/**
 * The public contact form.
 *
 * ONE endpoint, and it is a write with no read beside it: a visitor has no
 * session, so there is nothing they could be authorised to fetch back. The
 * server answers with a reference and a message, never the stored record.
 *
 * Where the message GOES is the point of this module: straight into the
 * support queue the admin console triages. The console owns status, priority
 * and assignment; this form cannot set any of them, and the server ignores
 * them if they are sent. A "priority" control on a public form is a control
 * everybody sets to Urgent.
 *
 * Public route, so `skipRefresh` — a 401 here means the endpoint is
 * misconfigured, not that a session lapsed, and a refresh attempt from the
 * landing page would be the authenticated request §9 forbids there.
 */
import { apiClient } from './client'

export const SUPPORT_ENDPOINTS = {
  contact: '/support/contact/',
}

/**
 * The topics the form offers, mirrored from `dummy_data.SUPPORT_TOPICS`.
 *
 * The SERVER owns this vocabulary — it validates against it and derives the
 * request's starting priority from it. Declared beside the endpoint (§9) so no
 * component types one of these strings; if the two ever disagree, the server
 * is right and a submission is refused rather than silently recategorised.
 */
export const CONTACT_TOPICS = [
  'Product demo',
  'Pricing and plans',
  'Technical issue',
  'Billing and invoices',
  'Partnerships',
  'Something else',
]

/**
 * POST `/support/contact/`.
 *
 * @param {Object} payload
 * @param {string} payload.name
 * @param {string} payload.email
 * @param {string} payload.firm
 * @param {string} payload.country  canonical country name, from `CountryDropdown`
 * @param {string} payload.topic    one of `CONTACT_TOPICS`
 * @param {string} payload.subject
 * @param {string} payload.message  at least 10 characters, the server agrees
 * @returns {Promise<{ requestId: string|null, message: string }>}
 */
export async function submitContactRequest({
  name,
  firm,
  email,
  country,
  topic,
  subject,
  message,
}) {
  const data = await apiClient(SUPPORT_ENDPOINTS.contact, {
    method: 'POST',
    body: { name, firm, email, country, topic, subject, message },
    skipRefresh: true,
  })

  return {
    requestId: data?.request_id ?? null,
    message: data?.message || '',
  }
}
