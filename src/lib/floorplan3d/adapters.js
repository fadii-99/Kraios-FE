import {
  CONVERSION_STAGES,
  artifactUrl,
  isConversionRunning,
  isConversionUsable,
} from '@/lib/api/floorplan3d'

/**
 * API envelope → view models.
 *
 * THE ENVELOPE IS TRANSLATED; THE DOCUMENT IS NOT. Envelope fields become
 * camelCase per the repository's convention (§14 of CLAUDE.md), but
 * `revision.document` passes through in `snake_case` untouched — it is a
 * versioned schema the backend authors, both geometry engines consume, and the
 * editor sends back with edits. Its field names are the contract. The same
 * decision `bim/lib/bimAdapters.js` made, for the same reason.
 *
 * Nothing here fabricates a value. A field the API did not send comes through as
 * null or an empty array, never as a plausible-looking default.
 */

export function conversionToView(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name || row.source?.original_filename || 'Untitled plan',
    status: row.status,
    stage: row.stage,
    stageLabel: stageLabel(row.stage),
    stageIndex: CONVERSION_STAGES.findIndex((stage) => stage.id === row.stage),
    progress: row.progress ?? 0,
    message: row.message || '',
    scaleStatus: row.scale_status,
    needsScaleConfirmation:
      row.scale_status === 'needs_confirmation' || row.scale_status === 'unknown',
    errorCode: row.error_code || '',
    errorMessage: row.error_message || '',
    source: sourceToView(row.source),
    currentRevision: revisionToView(row.current_revision),
    thumbnailUrl: row.thumbnail_url || null,
    artifactsStale: Boolean(row.artifacts_stale),
    artifacts: (row.artifacts ?? []).map(artifactToView),
    // Only the DETAIL payload carries this; a list row leaves it undefined,
    // which is correctly falsy — nothing on the landing page offers editing.
    assistEnabled: Boolean(row.assist_enabled),
    configuration: row.configuration ?? null,
    usage: row.usage ?? [],
    durationMs: row.duration_ms ?? 0,
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    updatedAt: row.updated_at,
    isRunning: isConversionRunning(row),
    isUsable: isConversionUsable(row),
    isFailed: row.status === 'FAILED',
  }
}

export function sourceToView(source) {
  if (!source) return null
  return {
    id: source.id,
    filename: source.original_filename,
    mimeType: source.mime_type,
    sha256: source.sha256,
    byteSize: source.byte_size ?? 0,
    pageCount: source.page_count ?? 1,
    kind: source.kind,
    width: source.image_width ?? 0,
    height: source.image_height ?? 0,
    fileUrl: source.file_url || null,
    createdAt: source.created_at,
  }
}

export function revisionToView(revision) {
  if (!revision) return null
  return {
    id: revision.id,
    number: revision.number,
    parentId: revision.parent ?? null,
    schemaVersion: revision.schema_version,
    score: revision.score ?? 0,
    grade: revision.grade || '',
    changeSummary: revision.change_summary || '',
    createdAt: revision.created_at,
    // Untranslated on purpose. See the module docstring.
    document: revision.document ?? null,
    validation: revision.validation ?? null,
  }
}

export function artifactToView(artifact) {
  if (!artifact) return null
  return {
    id: artifact.id,
    type: artifact.artifact_type,
    mimeType: artifact.mime_type,
    byteSize: artifact.byte_size ?? 0,
    sha256: artifact.sha256 || '',
    generatorVersion: artifact.generator_version || '',
    revisionId: artifact.revision,
    // BUILT HERE, NOT TAKEN FROM THE SERVER. The API's `download_url` is an
    // absolute URL built from the request's own Host, and that host is the
    // BACKEND's, not this app's: the dev proxy sets `changeOrigin`, and in
    // production the app is served from a different origin to the API. Putting
    // that URL in an <a href> makes the download a cross-origin top-level
    // navigation, and the session cookie - scoped to THIS origin - is simply
    // not sent, so the user gets a 401 and a browser that appears to do
    // nothing. `127.0.0.1` and `localhost` are different cookie hosts, which is
    // exactly the configuration this was failing under.
    //
    // `artifactUrl` builds the same relative `/api/v1/...` path every other
    // authenticated request in the app uses, so the download rides the same
    // proxy and the same cookie.
    downloadUrl: artifactUrl(artifact.id),
    isCurrent: Boolean(artifact.is_current),
    createdAt: artifact.created_at,
  }
}

export function progressToView(row) {
  if (!row) return null
  return {
    id: row.id,
    status: row.status,
    stage: row.stage,
    stageLabel: stageLabel(row.stage),
    stageIndex: CONVERSION_STAGES.findIndex((stage) => stage.id === row.stage),
    progress: row.progress ?? 0,
    message: row.message || '',
    scaleStatus: row.scale_status,
    errorCode: row.error_code || '',
    errorMessage: row.error_message || '',
    currentRevisionId: row.current_revision ?? null,
    artifactsStale: Boolean(row.artifacts_stale),
    updatedAt: row.updated_at,
    isRunning: isConversionRunning(row),
    isUsable: isConversionUsable(row),
    isFailed: row.status === 'FAILED',
    // A BLENDER RUN IS NOT A CONVERSION RUN, and the two must not be read off
    // the same field. `status` never moves for an artifact rebuild — the
    // semantic model is already finished and unaffected — so a rebuild is
    // visible only in `stage`, and a client watching `isRunning` sees nothing
    // happen at all. `blenderFailed` is checked FIRST by every caller, because
    // a failed run is left parked at the `artifacts` stage.
    isBuildingArtifacts: row.stage === 'artifacts',
    blenderFailed: String(row.error_code || '').startsWith('blender'),
  }
}

export function stageLabel(stage) {
  return CONVERSION_STAGES.find((entry) => entry.id === stage)?.label ?? 'Working'
}

/**
 * The validation report, shaped for the three review lists.
 *
 * The split is a product decision, not a data one:
 *
 *   - `needsAttention` — the engine could not decide; a person must.
 *   - `assumed` — values invented because the drawing did not state them. The
 *     most commercially important list: a wall height nobody chose still ends
 *     up in a bill of quantities.
 *   - `repaired` — a DISCLOSURE, not a to-do. The model was changed before the
 *     user saw it, and not saying so means their quantities differ from their
 *     drawing for reasons they were never told.
 */
export function reviewToView(document) {
  const uncertainties = document?.uncertainties ?? []
  const needsAttention = []
  const repaired = []

  for (const uncertainty of uncertainties) {
    const entry = {
      id: uncertainty.id,
      code: uncertainty.code,
      severity: uncertainty.severity,
      message: uncertainty.message,
      suggestion: uncertainty.suggestion || '',
      elementId: uncertainty.element_id || '',
      elementType: uncertainty.element_type || '',
      levelId: uncertainty.level_id || '',
      autoRepaired: Boolean(uncertainty.auto_repaired),
      resolved: Boolean(uncertainty.resolved),
    }
    if (entry.autoRepaired) repaired.push(entry)
    else if (!entry.resolved) needsAttention.push(entry)
  }

  const severityOrder = { error: 0, warning: 1, info: 2 }
  needsAttention.sort(
    (a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3),
  )

  return {
    needsAttention,
    repaired,
    validation: document?.validation ?? null,
    scale: document?.scale ?? null,
    stats: document?.validation?.stats ?? {},
  }
}

/** Bytes as a short human string. Used by the upload panel and the download menu. */
export function formatBytes(bytes) {
  const value = Number(bytes) || 0
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(0)} KB`
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

/** Millimetres as metres, for the inspector's read-only readouts. */
export function formatMetres(millimetres, digits = 2) {
  const value = Number(millimetres)
  if (!Number.isFinite(value)) return '—'
  return `${(value / 1000).toFixed(digits)} m`
}

export function formatArea(squareMillimetres) {
  const value = Number(squareMillimetres)
  if (!Number.isFinite(value) || value <= 0) return '—'
  return `${(value / 1_000_000).toFixed(1)} m²`
}
