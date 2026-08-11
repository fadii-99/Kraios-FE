/** Local-time ISO date (yyyy-mm-dd). Avoids the UTC shift `toISOString` causes. */
export const toISODate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
