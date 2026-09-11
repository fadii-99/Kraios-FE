/**
 * The seam between the Floor Plan 3D API's payloads and the view models
 * components render.
 *
 * Same rule as every other feature's `…Adapters.js` (CLAUDE.md §14): a
 * component never sees `snake_case` or an uppercase enum, and a request never
 * carries a lowercase UI id.
 *
 * ONE DELIBERATE EXCEPTION, AND ITS REASON
 * ----------------------------------------
 * `conversion.model` — the architectural document — is passed through
 * UNTRANSLATED, still in `snake_case`.
 *
 * It is not an API payload. It is a versioned document (`schema_version` is a
 * field inside it) that the backend authors, the viewer renders, the exporters
 * consume, and this app sends BACK with edits applied. Camel-casing it here
 * would mean maintaining a bidirectional transform of a deeply nested
 * structure whose field names ARE the contract, and every module that touched
 * the model would have to agree on which side of the transform it lives. It is
 * also shown to the user verbatim in the JSON panel, where a renamed field
 * would be a lie about what the engine produced.
 *
 * So the envelope is adapted and the document is not, and the two are kept
 * visibly distinct: `model` is the only snake_case thing a component here ever
 * receives, and `model.js` is the only module that reads inside it.
 */

/** Conversion status as UI ids. The wire values are uppercase. */
export const CONVERSION_STATUS = {
  queued: 'queued',
  processing: 'processing',
  completed: 'completed',
  failed: 'failed',
  cancelled: 'cancelled',
}

const STATUS_FROM_API = {
  QUEUED: CONVERSION_STATUS.queued,
  PROCESSING: CONVERSION_STATUS.processing,
  COMPLETED: CONVERSION_STATUS.completed,
  FAILED: CONVERSION_STATUS.failed,
  CANCELLED: CONVERSION_STATUS.cancelled,
}

const FINISHED = [
  CONVERSION_STATUS.completed,
  CONVERSION_STATUS.failed,
  CONVERSION_STATUS.cancelled,
]

/** One source row → the library card / workspace header view model. */
export function sourceToView(source) {
  if (!source) return null

  return {
    id: source.id,
    name: source.name,
    originalName: source.original_filename,
    mime: source.content_type,
    size: source.size,
    // 'image' | 'pdf' | 'dxf'. Lowercase already and used as a UI id, so it
    // passes through as itself rather than being renamed for its own sake.
    kind: source.source_type,
    isPdf: source.source_type === 'pdf',
    isDxf: source.source_type === 'dxf',
    pageCount: source.page_count ?? 1,
    width: source.image_width,
    height: source.image_height,
    uploadStatus: (source.upload_status || '').toLowerCase(),
    metadata: source.metadata || {},
    declaredScaleRatio: source.declared_scale_ratio ?? null,
    declaredUnits: source.declared_units || '',
    fileUrl: source.file_url,
    latestConversion: conversionToView(source.latest_conversion),
    createdAt: source.created_at,
    updatedAt: source.updated_at,
  }
}

export function sourcesToView(rows) {
  return (Array.isArray(rows) ? rows : []).map(sourceToView).filter(Boolean)
}

/** One conversion, summary or full. `model` and `quality` are absent on a summary. */
export function conversionToView(record) {
  if (!record) return null

  const status = STATUS_FROM_API[record.status] ?? CONVERSION_STATUS.queued
  const isFinished = FINISHED.includes(status)

  return {
    id: record.id,
    sourceId: record.source,
    status,
    isFinished,
    isRunning: !isFinished,
    hasFailed: status === CONVERSION_STATUS.failed,
    wasCancelled: status === CONVERSION_STATUS.cancelled,
    cancelRequested: Boolean(record.cancel_requested),
    progress: Math.min(100, Math.max(0, record.progress ?? 0)),
    message: record.message || '',
    // Already the server's own sentence — it never carries provider detail.
    error: record.error_message || '',
    errorCode: record.error_code || '',
    score: record.score ?? null,
    grade: record.grade || '',
    schemaVersion: record.schema_version || '',
    revision: record.revision_number ?? 0,
    // See the module docstring: the model document is deliberately not adapted.
    model: status === CONVERSION_STATUS.completed ? (record.model ?? null) : null,
    quality:
      status === CONVERSION_STATUS.completed ? qualityToView(record.quality) : null,
    provenance: record.provenance ? provenanceToView(record.provenance) : null,
    createdAt: record.created_at,
    startedAt: record.started_at,
    completedAt: record.completed_at,
  }
}

export function conversionsToView(rows) {
  return (Array.isArray(rows) ? rows : []).map(conversionToView).filter(Boolean)
}

/** Finding severities as UI ids. Lowercase on the wire already; listed so the set is explicit. */
export const FINDING_SEVERITY = {
  error: 'error',
  warning: 'warning',
  info: 'info',
}

/** The validator's report → the findings panel's view model. */
export function qualityToView(quality) {
  if (!quality) return null

  const findings = (quality.issues ?? []).map((issue) => ({
    code: issue.code,
    severity: FINDING_SEVERITY[issue.severity] ?? FINDING_SEVERITY.info,
    message: issue.message,
    elementId: issue.element_id || null,
    elementKind: issue.element_kind || null,
    repair: issue.repair || null,
    repaired: Boolean(issue.repaired),
    needsReview: Boolean(issue.needs_review),
    detail: issue.detail || {},
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
    findings,
    // The three lists are split on purpose, and the split is the point of the
    // panel: what a person must decide, what was invented, what was changed
    // on their behalf before they saw it.
    needsReview: findings.filter((finding) => finding.needsReview),
    repaired: findings.filter((finding) => finding.repaired),
    stats: {
      levels: stats.levels ?? null,
      walls: stats.walls ?? null,
      rooms: stats.rooms ?? null,
      doors: stats.doors ?? null,
      windows: stats.windows ?? null,
      passages: stats.passages ?? null,
      columns: stats.columns ?? null,
      beams: stats.beams ?? null,
      stairs: stats.stairs ?? null,
      fixtures: stats.fixtures ?? null,
      furniture: stats.furniture ?? null,
      materials: stats.materials ?? null,
      assumptions: stats.assumptions ?? null,
      footprintM2: stats.footprint_m2 ?? null,
      roomAreaM2: stats.room_area_m2 ?? null,
      wallLengthM: stats.total_wall_length_m ?? null,
      scaleReliable: Boolean(stats.scale_reliable),
    },
  }
}

/** The audit trail — which models ran, what each attempt scored, what it cost. */
export function provenanceToView(provenance) {
  if (!provenance) return null

  return {
    schemaVersion: provenance.schema_version || '',
    models: provenance.models || {},
    stages: (provenance.stages ?? []).map((stage) => ({
      stage: stage.stage,
      status: stage.status,
      at: stage.at,
      detail: Object.fromEntries(
        Object.entries(stage).filter(
          ([key]) => !['stage', 'status', 'at'].includes(key),
        ),
      ),
    })),
    attempts: (provenance.attempts ?? []).map((attempt) => ({
      attempt: attempt.attempt,
      score: attempt.score,
      grade: attempt.grade,
      geometryScore: attempt.geometry_score,
      visualScore: attempt.visual_score,
      schemaRepairs: attempt.schema_repairs,
      accepted: Boolean(attempt.accepted),
      durationMs: attempt.duration_ms,
      error: attempt.error || '',
    })),
    calls: (provenance.calls ?? []).map((call) => ({
      purpose: call.purpose,
      model: call.model,
      provider: call.provider || '',
      latencyMs: call.latency_ms,
      promptTokens: call.prompt_tokens,
      completionTokens: call.completion_tokens,
      structuredOutput: Boolean(call.structured_output),
      validation: call.validation,
      errorCategory: call.error_category || '',
    })),
    survey: provenance.survey || {},
    source: provenance.source || {},
    totalMs: provenance.total_ms ?? 0,
    tokensSpent: provenance.tokens_spent ?? 0,
  }
}

/** One revision row. The model snapshot is not carried in the list. */
export function revisionToView(revision) {
  if (!revision) return null
  const operation = revision.operation || {}
  return {
    id: revision.id,
    number: revision.revision_number,
    summary: revision.summary || '',
    origin: operation.origin || 'edit',
    instruction: operation.instruction || '',
    assumption: operation.assumption || '',
    restoredFrom: operation.restored_from ?? null,
    createdAt: revision.created_at,
  }
}

export function revisionsToView(rows) {
  return (Array.isArray(rows) ? rows : []).map(revisionToView).filter(Boolean)
}

export function artifactToView(artifact) {
  if (!artifact) return null
  return {
    id: artifact.id,
    conversionId: artifact.conversion,
    kind: artifact.kind,
    mime: artifact.content_type,
    size: artifact.size,
    revision: artifact.metadata?.revision ?? null,
    downloadUrl: artifact.download_url,
    createdAt: artifact.created_at,
  }
}

export function artifactsToView(rows) {
  return (Array.isArray(rows) ? rows : []).map(artifactToView).filter(Boolean)
}

/** The export capability report → what the toolbar may offer. */
export function capabilitiesToView(payload) {
  if (!payload) return null
  const exports = payload.exports || {}
  const limits = payload.limits || {}

  return {
    enabled: Boolean(payload.enabled),
    formats: (exports.formats ?? []).map((format) => ({
      key: format.key,
      label: format.label,
      extension: format.extension,
      mime: format.content_type,
      description: format.description,
      available: Boolean(format.available),
      lossless: Boolean(format.lossless),
      unavailableReason: format.unavailable_reason || '',
      remedy: format.remedy || '',
    })),
    skpAvailable: Boolean(exports.skp_available),
    skpReason: exports.skp_reason || '',
    skpRemedy: exports.skp_remedy || '',
    blenderAvailable: Boolean(exports.blender_available),
    limits: {
      maxUploadBytes: limits.max_upload_bytes ?? 0,
      chunkBytes: limits.chunk_bytes ?? 0,
      maxPdfPages: limits.max_pdf_pages ?? 0,
      maxSources: limits.max_sources ?? 0,
      maxLiveConversions: limits.max_live_conversions ?? 0,
      dailyConversionLimit: limits.daily_conversion_limit ?? 0,
      maxRevisions: limits.max_revisions ?? 0,
      acceptedExtensions: limits.accepted_extensions ?? [],
    },
  }
}

/** What an edit or command response says happened. */
export function editOutcomeToView(payload) {
  if (!payload) return null
  const edit = payload.edit || payload.result || {}
  return {
    changed: Boolean(payload.changed),
    revision: payload.revision ?? 0,
    explanation: edit.explanation || '',
    assumption: edit.assumption || '',
    descriptions: edit.descriptions || [],
    rejected: (edit.rejected ?? []).map((entry) => ({
      op: entry.op,
      reason: entry.reason,
      target: entry.target || '',
    })),
    // See the module docstring: the document is not adapted.
    model: payload.model ?? null,
    quality: qualityToView(payload.quality),
  }
}

export function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
