/**
 * BIM engine API services.
 *
 * One module for every `/bim` endpoint, in the same shape as `projects.js`: an
 * endpoint register, then a thin service per call. Nothing here holds state,
 * raises a toast or knows about React — `apiClient` owns cookies, CSRF, the
 * single 401 refresh and error normalization.
 *
 * Two rules the workspace depends on:
 *
 *   - `POST .../extractions/` answers `202 Accepted` with a summary. Nothing
 *     here waits on it; the caller polls `getExtraction` until `status` is
 *     COMPLETED or FAILED.
 *   - The list endpoints never carry the plan JSON. Only `getExtraction` does,
 *     because a plan can run to a few hundred kilobytes.
 *
 * This file is part of a removable feature. See `src/pages/bim/README.md`.
 */

import { apiClient, API_BASE_URL } from './client'

const ROOT = '/bim'

const source = (sourceId) => `${ROOT}/sources/${encodeURIComponent(sourceId)}`

export const BIM_ENDPOINTS = {
  sources: `${ROOT}/sources/`,
  source: (id) => `${source(id)}/`,
  sourceFile: (id) => `${source(id)}/file/`,
  extractions: (id) => `${source(id)}/extractions/`,
  extraction: (extractionId) =>
    `${ROOT}/extractions/${encodeURIComponent(extractionId)}/`,
}

/** Terminal extraction states. Polling stops on either. */
export const BIM_STATUS = {
  QUEUED: 'QUEUED',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
}

export function isExtractionFinished(extraction) {
  return (
    extraction?.status === BIM_STATUS.COMPLETED ||
    extraction?.status === BIM_STATUS.FAILED
  )
}

/** The caller's floor plans, newest first, each with its latest extraction. */
export function listSources() {
  return apiClient(BIM_ENDPOINTS.sources, { method: 'GET' })
}

export function getSource(sourceId) {
  return apiClient(BIM_ENDPOINTS.source(sourceId), { method: 'GET' })
}

/**
 * Upload a 2D floor plan.
 *
 * The body is FormData, so no Content-Type is set here — the browser has to
 * write its own multipart boundary, and setting the header by hand is what
 * silently breaks the upload.
 */
export function uploadSource({ file, name }) {
  const body = new FormData()
  body.append('file', file)
  if (name) body.append('name', name)
  return apiClient(BIM_ENDPOINTS.sources, { method: 'POST', body })
}

export function deleteSource(sourceId) {
  return apiClient(BIM_ENDPOINTS.source(sourceId), { method: 'DELETE' })
}

/** Start an extraction. Answers 202 with a summary — poll `getExtraction`. */
export function startExtraction(sourceId) {
  return apiClient(BIM_ENDPOINTS.extractions(sourceId), { method: 'POST' })
}

/** This source's extraction history. Summaries only — no plan JSON. */
export function listExtractions(sourceId) {
  return apiClient(BIM_ENDPOINTS.extractions(sourceId), { method: 'GET' })
}

/** The full result: plan, quality report and attempt record. */
export function getExtraction(extractionId) {
  return apiClient(BIM_ENDPOINTS.extraction(extractionId), { method: 'GET' })
}

/**
 * An `<img src>` for a stored drawing.
 *
 * The route is authenticated by the same session cookie the rest of the app
 * uses, so the browser can load it directly — no blob fetch, no object URL to
 * revoke.
 */
export function sourceFileUrl(sourceId) {
  return `${API_BASE_URL.replace(/\/+$/, '')}${BIM_ENDPOINTS.sourceFile(sourceId)}`
}
