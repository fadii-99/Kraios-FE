/**
 * The seam between the BIM API's payloads and the view models components render.
 *
 * Same rule as every other step's `…Adapters.js` (CLAUDE.md §14): a component
 * never sees `snake_case` or an uppercase enum, and a request never carries a
 * lowercase UI id.
 *
 * ONE DELIBERATE EXCEPTION, AND ITS REASON
 * ----------------------------------------
 * `extraction.plan` is passed through UNTRANSLATED, still in `snake_case`.
 *
 * It is not an API payload. It is a versioned document — `schema_version` is a
 * field inside it — that the backend authored, the viewer will render, the IFC
 * builder will consume, and a later phase will send back with edits applied.
 * Camel-casing it here would mean maintaining a bidirectional transform of a
 * deeply nested structure whose field names ARE the contract, and every phase
 * that touches the plan would have to agree on which side of the transform it
 * lives. It is also shown to the user verbatim in the JSON panel, where a
 * renamed field would be a lie about what the engine produced.
 *
 * So the envelope is adapted and the document is not, and the two are kept
 * visibly distinct: `plan` is the only snake_case thing a `bim` component ever
 * receives, and `planGeometry.js` is the only module that reads inside it.
 */

/** One `BimSource` row → the card/library view model. */
export function sourceToView(source) {
  if (!source) return null

  return {
    id: source.id,
    name: source.name,
    originalName: source.original_name,
    mime: source.content_type,
    size: source.size,
    width: source.image_width,
    height: source.image_height,
    // 'pdf' | 'image'. Lowercase already, and used as a UI id, so it passes
    // through as itself rather than being renamed for the sake of renaming.
    kind: source.source_kind,
    isPdf: source.source_kind === 'pdf',
    fileUrl: source.file_url,
    latestExtraction: extractionToView(source.latest_extraction),
    createdAt: source.created_at,
  }
}

export function sourcesToView(rows) {
  return (Array.isArray(rows) ? rows : []).map(sourceToView).filter(Boolean)
}

/** Status as UI ids. The wire values are uppercase; components never see them. */
export const EXTRACTION_STATUS = {
  queued: 'queued',
  processing: 'processing',
  completed: 'completed',
  failed: 'failed',
}

const STATUS_FROM_API = {
  QUEUED: EXTRACTION_STATUS.queued,
  PROCESSING: EXTRACTION_STATUS.processing,
  COMPLETED: EXTRACTION_STATUS.completed,
  FAILED: EXTRACTION_STATUS.failed,
}

/** One `BimExtraction`, summary or full. `plan` and `quality` are absent on a summary. */
export function extractionToView(extraction) {
  if (!extraction) return null

  const status = STATUS_FROM_API[extraction.status] ?? EXTRACTION_STATUS.queued
  const isFinished =
    status === EXTRACTION_STATUS.completed || status === EXTRACTION_STATUS.failed

  return {
    id: extraction.id,
    sourceId: extraction.source,
    status,
    isFinished,
    isRunning: !isFinished,
    hasFailed: status === EXTRACTION_STATUS.failed,
    progress: Math.min(100, Math.max(0, extraction.progress ?? 0)),
    message: extraction.message || '',
    // Already the server's generic sentence — it never carries internal detail.
    error: extraction.error || '',
    score: extraction.score ?? null,
    grade: extraction.grade || '',
    // See the module docstring: the plan document is deliberately not adapted.
    plan: status === EXTRACTION_STATUS.completed ? (extraction.plan ?? null) : null,
    quality:
      status === EXTRACTION_STATUS.completed
        ? qualityToView(extraction.quality)
        : null,
    createdAt: extraction.created_at,
    startedAt: extraction.started_at,
    completedAt: extraction.completed_at,
  }
}

export function extractionsToView(rows) {
  return (Array.isArray(rows) ? rows : []).map(extractionToView).filter(Boolean)
}

/** Issue severities as UI ids. Lowercase on the wire already, listed so the set is explicit. */
export const ISSUE_SEVERITY = {
  error: 'error',
  warning: 'warning',
  info: 'info',
}

/** The grader's report → the quality panel's view model. */
export function qualityToView(quality) {
  if (!quality) return null

  const issues = (quality.issues ?? []).map((issue) => ({
    code: issue.code,
    severity: ISSUE_SEVERITY[issue.severity] ?? ISSUE_SEVERITY.info,
    message: issue.message,
    elementId: issue.element_id || null,
    elementKind: issue.element_kind || null,
    repair: issue.repair || null,
    repaired: Boolean(issue.repaired),
  }))

  const stats = quality.stats ?? {}

  return {
    score: quality.score ?? 0,
    grade: quality.grade || '',
    geometryScore: quality.geometry_score ?? 0,
    // null and 0 mean different things — the audit did not run, versus it ran
    // and found nothing recognisable — so the nullish coalescing that would
    // flatten them is deliberately absent.
    visualScore: quality.visual_score ?? null,
    visualNotes: quality.visual_notes ?? [],
    acceptable: Boolean(quality.acceptable),
    issues,
    attention: issues.filter((issue) => !issue.repaired),
    repaired: issues.filter((issue) => issue.repaired),
    stats: {
      levels: stats.levels ?? null,
      walls: stats.walls ?? null,
      openings: stats.openings ?? null,
      doors: stats.doors ?? null,
      windows: stats.windows ?? null,
      rooms: stats.rooms ?? null,
      fixtures: stats.fixtures ?? null,
      assumptions: stats.assumptions ?? null,
      footprintM2: stats.footprint_m2 ?? null,
      roomAreaM2: stats.room_area_m2 ?? null,
      wallLengthM: stats.total_wall_length_m ?? null,
    },
  }
}

/** The plan document's own header fields, read for display. */
export function planFactsToView(plan) {
  if (!plan) return null

  return {
    buildingType: plan.building_type || '',
    description: plan.description || '',
    scaleSource: plan.scale?.source || 'unknown',
    scaleEvidence: plan.scale?.evidence || '',
    levels: (plan.levels ?? []).map((level) => ({
      id: level.id,
      name: level.name,
      elevation: level.elevation,
      wallHeight: level.wall_height,
      floorToFloor: level.floor_to_floor,
      slabThickness: level.slab_thickness,
    })),
    assumptions: (plan.assumptions ?? []).map((assumption) => ({
      target: assumption.target,
      value: assumption.value,
      confidence: assumption.confidence,
      reason: assumption.reason || '',
    })),
  }
}
