/**
 * Floor Plan 3D Lab API services.
 *
 * One module for every `/experiments/floorplan-3d/` endpoint, in the same
 * shape as `projects.js` and `bim.js`: an endpoint register, then a thin
 * service per call. Nothing here holds state, raises a toast or knows about
 * React — `apiClient` owns cookies, CSRF, the single 401 refresh and error
 * normalization.
 *
 * NOT RE-EXPORTED THROUGH `@/lib/api`. This is a removable experiment, and a
 * re-export would put its name in a shared module that removal then has to
 * touch. Callers import `@/lib/api/floorplan3d` directly — already the
 * majority pattern for `projects`, `jobs`, `files` and `bim`.
 *
 * Three rules the workspace depends on:
 *
 *   - `POST .../conversions/` answers `202 Accepted` with a summary. Nothing
 *     here waits on it; the caller polls `getConversion` until `status` is
 *     COMPLETED, FAILED or CANCELLED.
 *   - The list endpoints never carry the model document. Only `getConversion`
 *     and `getModel` do, because a model can run to a few hundred kilobytes.
 *   - Every save carries `base_revision`. A 409 means somebody — usually the
 *     same user in another tab — saved first, and the response says what the
 *     current revision is.
 *
 * This file is part of a removable feature. See
 * `src/pages/experiments/floorplan3d/README.md`.
 */

import { apiClient, API_BASE_URL } from './client'

const ROOT = '/experiments/floorplan-3d'

const source = (id) => `${ROOT}/sources/${encodeURIComponent(id)}`
const conversion = (id) => `${ROOT}/conversions/${encodeURIComponent(id)}`
const upload = (id) => `${ROOT}/uploads/${encodeURIComponent(id)}`

export const FP3D_ENDPOINTS = {
  capabilities: `${ROOT}/capabilities/`,

  sources: `${ROOT}/sources/`,
  source: (id) => `${source(id)}/`,
  sourceFile: (id) => `${source(id)}/file/`,

  uploadInit: `${ROOT}/uploads/`,
  uploadChunk: (id, index) => `${upload(id)}/chunks/${index}/`,
  uploadComplete: (id) => `${upload(id)}/complete/`,
  uploadAbort: (id) => `${upload(id)}/`,

  conversions: (id) => `${source(id)}/conversions/`,
  conversion: (id) => `${conversion(id)}/`,
  conversionCancel: (id) => `${conversion(id)}/cancel/`,

  model: (id) => `${conversion(id)}/model/`,
  commands: (id) => `${conversion(id)}/commands/`,
  edit: (id) => `${conversion(id)}/edit/`,
  calibrate: (id) => `${conversion(id)}/calibrate/`,

  revisions: (id) => `${conversion(id)}/revisions/`,
  revisionRestore: (id, number) => `${conversion(id)}/revisions/${number}/restore/`,

  exports: (id) => `${conversion(id)}/exports/`,
  artifacts: (id) => `${conversion(id)}/artifacts/`,
  artifactDownload: (artifactId) =>
    `${ROOT}/artifacts/${encodeURIComponent(artifactId)}/download/`,
}

/** Terminal conversion states. Polling stops on any of them. */
export const FP3D_STATUS = {
  QUEUED: 'QUEUED',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
}

const TERMINAL = [FP3D_STATUS.COMPLETED, FP3D_STATUS.FAILED, FP3D_STATUS.CANCELLED]

export function isConversionFinished(record) {
  return TERMINAL.includes(record?.status)
}

/** The 409 a stale tab gets back when somebody else saved first. */
export const STALE_REVISION_STATUS = 409

export function isStaleRevisionError(error) {
  return error?.status === STALE_REVISION_STATUS
}

// -- capabilities ----------------------------------------------------------

/** What this deployment can actually export, and its upload limits. */
export function getCapabilities() {
  return apiClient(FP3D_ENDPOINTS.capabilities, { method: 'GET' })
}

// -- sources ---------------------------------------------------------------

export function listSources() {
  return apiClient(FP3D_ENDPOINTS.sources, { method: 'GET' })
}

export function getSource(sourceId) {
  return apiClient(FP3D_ENDPOINTS.source(sourceId), { method: 'GET' })
}

export function deleteSource(sourceId) {
  return apiClient(FP3D_ENDPOINTS.source(sourceId), { method: 'DELETE' })
}

/**
 * Upload a small drawing in one request.
 *
 * The body is FormData, so no Content-Type is set here — the browser has to
 * write its own multipart boundary, and setting the header by hand is what
 * silently breaks the upload.
 */
export function uploadSourceDirect({ file, name, scaleRatio, units }) {
  const body = new FormData()
  body.append('file', file)
  if (name) body.append('name', name)
  if (scaleRatio) body.append('declared_scale_ratio', String(scaleRatio))
  if (units) body.append('declared_units', units)
  return apiClient(FP3D_ENDPOINTS.sources, { method: 'POST', body })
}

// -- resumable upload ------------------------------------------------------

export function beginUpload({ file, name }) {
  return apiClient(FP3D_ENDPOINTS.uploadInit, {
    method: 'POST',
    body: {
      filename: file.name,
      content_type: file.type || '',
      total_size: file.size,
      name: name || '',
    },
  })
}

export function sendChunk(sessionId, index, blob) {
  const body = new FormData()
  body.append('chunk', blob, `chunk-${index}`)
  return apiClient(FP3D_ENDPOINTS.uploadChunk(sessionId, index), {
    method: 'PUT',
    body,
  })
}

export function completeUpload(sessionId, { scaleRatio, units } = {}) {
  return apiClient(FP3D_ENDPOINTS.uploadComplete(sessionId), {
    method: 'POST',
    body: {
      declared_scale_ratio: scaleRatio ?? null,
      declared_units: units || '',
    },
  })
}

export function abortUpload(sessionId) {
  return apiClient(FP3D_ENDPOINTS.uploadAbort(sessionId), { method: 'DELETE' })
}

/**
 * Upload a file of any supported size, chunked.
 *
 * The server decides the chunk size — the browser must not, because the limit
 * it is sized against is the deployed proxy's, not anything the browser can
 * see. `onProgress(fraction)` is called after each chunk.
 *
 * An abort leaves the session for the server's cleanup task rather than
 * blocking on a DELETE the user is not waiting for.
 */
export async function uploadSource({ file, name, scaleRatio, units, onProgress, signal }) {
  const session = await beginUpload({ file, name })
  const { id, chunk_size: chunkSize, total_chunks: totalChunks } = session

  try {
    for (let index = 0; index < totalChunks; index += 1) {
      if (signal?.aborted) throw new DOMException('Upload cancelled', 'AbortError')
      const start = index * chunkSize
      await sendChunk(id, index, file.slice(start, start + chunkSize))
      onProgress?.((index + 1) / totalChunks)
    }
    return await completeUpload(id, { scaleRatio, units })
  } catch (error) {
    // Best effort. The server prunes abandoned sessions on its own schedule,
    // so a failed abort must not replace the error the caller needs to see.
    abortUpload(id).catch(() => {})
    throw error
  }
}

// -- conversions -----------------------------------------------------------

/** Start a conversion. Answers 202 with a summary — poll `getConversion`. */
export function startConversion(sourceId) {
  return apiClient(FP3D_ENDPOINTS.conversions(sourceId), { method: 'POST' })
}

export function listConversions(sourceId) {
  return apiClient(FP3D_ENDPOINTS.conversions(sourceId), { method: 'GET' })
}

/** The full result: the model, the quality report and the provenance record. */
export function getConversion(conversionId) {
  return apiClient(FP3D_ENDPOINTS.conversion(conversionId), { method: 'GET' })
}

export function cancelConversion(conversionId) {
  return apiClient(FP3D_ENDPOINTS.conversionCancel(conversionId), { method: 'POST' })
}

// -- the model -------------------------------------------------------------

export function getModel(conversionId) {
  return apiClient(FP3D_ENDPOINTS.model(conversionId), { method: 'GET' })
}

export function saveModel(conversionId, { model, baseRevision, summary, operation }) {
  return apiClient(FP3D_ENDPOINTS.model(conversionId), {
    method: 'PUT',
    body: {
      model,
      base_revision: baseRevision,
      summary: summary || '',
      operation: operation || {},
    },
  })
}

/** Apply structured edit commands — the inspector, a drag, an undo, a redo. */
export function applyCommands(conversionId, { commands, baseRevision, summary }) {
  return apiClient(FP3D_ENDPOINTS.commands(conversionId), {
    method: 'POST',
    body: { commands, base_revision: baseRevision, summary: summary || '' },
  })
}

/** Translate an instruction into commands and apply them. */
export function editWithInstruction(conversionId, { instruction, baseRevision, selection }) {
  return apiClient(FP3D_ENDPOINTS.edit(conversionId), {
    method: 'POST',
    body: {
      instruction,
      base_revision: baseRevision,
      selection: selection || [],
    },
  })
}

/** Rescale from two points on the SOURCE IMAGE and the real distance between them. */
export function calibrateScale(conversionId, { pointA, pointB, realDistance, baseRevision }) {
  return apiClient(FP3D_ENDPOINTS.calibrate(conversionId), {
    method: 'POST',
    body: {
      point_a: pointA,
      point_b: pointB,
      real_distance: realDistance,
      base_revision: baseRevision,
    },
  })
}

// -- revisions -------------------------------------------------------------

export function listRevisions(conversionId) {
  return apiClient(FP3D_ENDPOINTS.revisions(conversionId), { method: 'GET' })
}

export function restoreRevision(conversionId, revisionNumber) {
  return apiClient(FP3D_ENDPOINTS.revisionRestore(conversionId, revisionNumber), {
    method: 'POST',
  })
}

// -- exports ---------------------------------------------------------------

export function requestExport(conversionId, { format, levelIds } = {}) {
  return apiClient(FP3D_ENDPOINTS.exports(conversionId), {
    method: 'POST',
    body: { format, level_ids: levelIds || [] },
  })
}

export function listArtifacts(conversionId) {
  return apiClient(FP3D_ENDPOINTS.artifacts(conversionId), { method: 'GET' })
}

/**
 * An `<img src>` for a stored drawing.
 *
 * The route is authenticated by the same session cookie the rest of the app
 * uses, so the browser loads it directly — no blob fetch, no object URL to
 * revoke.
 */
export function sourceFileUrl(sourceId) {
  return `${API_BASE_URL.replace(/\/+$/, '')}${FP3D_ENDPOINTS.sourceFile(sourceId)}`
}
