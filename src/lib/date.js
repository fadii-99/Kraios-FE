/** Local-time ISO date (yyyy-mm-dd). Avoids the UTC shift `toISOString` causes. */
export const toISODate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

/**
 * Conversation timestamp — `06:18 PM · Aug 24`.
 *
 * `Intl` rather than a date library: the app ships none, and this is the only
 * formatted clock time in the product. Locale is pinned to `en-US` because the
 * format is a design decision (12-hour, zero-padded, short month) rather than a
 * localisation feature — the surrounding UI is English-only.
 */
const MESSAGE_TIME = new Intl.DateTimeFormat('en-US', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
})

const MESSAGE_DATE = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
})

/** @param {number|Date} value epoch ms or a Date. Returns '' if unparseable. */
export function formatMessageTimestamp(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return `${MESSAGE_TIME.format(date)} · ${MESSAGE_DATE.format(date)}`
}

/** Machine-readable form for a `<time datetime>` attribute. */
export function toISOTimestamp(value) {
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}
