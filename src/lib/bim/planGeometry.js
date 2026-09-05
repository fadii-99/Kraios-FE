/**
 * Small readings of the plan JSON that the panels need.
 *
 * This was the geometry behind an SVG plan preview; that view is gone — the 3D
 * model replaced it — and everything it needed went with it. What remains is
 * the two things the model workspace and the facts panel still ask for. The
 * plan's real geometry now lives in `buildModel.js`.
 */

/**
 * Element ids the grader complained about, so the model can tint them.
 *
 * Takes the ADAPTED report from `bimAdapters.qualityToView`. Only unrepaired
 * findings are returned: highlighting something the grader already fixed would
 * point the user at geometry that is now correct.
 */
export function flaggedElementIds(quality) {
  const flagged = new Set()
  for (const issue of quality?.issues ?? []) {
    if (issue.repaired) continue
    if (issue.elementId) flagged.add(issue.elementId)
  }
  return flagged
}

/** An area in m², or an em dash when there is no number to show. */
export function formatArea(value) {
  if (!Number.isFinite(value)) return '\u2014'
  return `${value.toFixed(value < 10 ? 1 : 0)} m\u00b2`
}

/** A length in metres, or an em dash. */
export function formatLength(value) {
  if (!Number.isFinite(value)) return '\u2014'
  return `${value.toFixed(2)} m`
}
