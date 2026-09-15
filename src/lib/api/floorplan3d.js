/**
 * FloorPlan3D experiment API services.
 *
 * One module for every `/experiments/floorplan-3d/` endpoint, in the same shape
 * as `bim.js` and `projects.js`: an endpoint register, then a thin service per
 * call. Nothing here holds state, raises a toast or knows about React —
 * `apiClient` owns cookies, CSRF, the single 401 refresh and error
 * normalization.
 *
 * NOT re-exported through `src/lib/api.js`, deliberately. Callers import
 * `@/lib/api/floorplan3d` directly, so removing the experiment touches no
 * shared module. Same reason `bim.js` does it — see `src/pages/bim/README.md`.
 *
 * THREE THINGS THE EDITOR DEPENDS ON
 *
 *   - `POST conversions/` answers `202 Accepted` with a summary. Nothing here
 *     waits on it; the caller polls `getProgress` until the status is terminal.
 *   - The list endpoint never carries the semantic document. Only
 *     `getConversion`, `getCurrentRevision` and `getRevision` do, because a
 *     document runs to tens or hundreds of kilobytes.
 *   - Chunk bodies are sent as RAW BYTES with `Content-Type:
 *     application/octet-stream`, not as multipart. There is exactly one field
 *     and its index is in the URL, so a multipart envelope would be pure
 *     overhead on several megabytes.
 *
 * This file is part of a removable feature. See
 * `src/pages/experiments/floorplan3d/README.md`.
 */

import { apiClient, API_BASE_URL } from './client'

const ROOT = '/experiments/floorplan-3d'

const conversion = (id) => `${ROOT}/conversions/${encodeURIComponent(id)}`
const upload = (id) => `${ROOT}/uploads/${encodeURIComponent(id)}`

export const FLOORPLAN3D_ENDPOINTS = {
  uploads: `${ROOT}/uploads/`,
  upload: (id) => `${upload(id)}/`,
  uploadChunk: (id, index) => `${upload(id)}/chunks/${Number(index)}/`,
  uploadComplete: (id) => `${upload(id)}/complete/`,
  sourceFile: (id) => `${ROOT}/sources/${encodeURIComponent(id)}/file/`,
  conversions: `${ROOT}/conversions/`,
  conversion: (id) => `${conversion(id)}/`,
  progress: (id) => `${conversion(id)}/progress/`,
  currentRevision: (id) => `${conversion(id)}/revision/`,
  revisions: (id) => `${conversion(id)}/revisions/`,
  revision: (id, revisionId) =>
    `${conversion(id)}/revisions/${encodeURIComponent(revisionId)}/`,
  validate: (id) => `${conversion(id)}/validate/`,
  calibrateScale: (id) => `${conversion(id)}/calibrate-scale/`,
  confirmElements: (id) => `${conversion(id)}/confirm/`,
  artifacts: (id) => `${conversion(id)}/artifacts/`,
  regenerate: (id) => `${conversion(id)}/regenerate/`,
  artifactDownload: (artifactId) =>
    `${ROOT}/artifacts/${encodeURIComponent(artifactId)}/download/`,
  assets: `${ROOT}/assets/`,
  schema: `${ROOT}/schema/`,
}

/** Conversion states. The first two are the only ones worth polling. */
export const CONVERSION_STATUS = {
  QUEUED: 'QUEUED',
  PROCESSING: 'PROCESSING',
  NEEDS_REVIEW: 'NEEDS_REVIEW',
  READY: 'READY',
  FAILED: 'FAILED',
  ARCHIVED: 'ARCHIVED',
}

/**
 * The user-visible stages, in order, with the copy the progress rail shows.
 *
 * The backend owns the stage NAMES (`floorplan3d/models.py`); this owns their
 * wording, because that is a product decision and not a data one.
 */
export const CONVERSION_STAGES = [
  { id: 'uploaded', label: 'Upload' },
  { id: 'preprocessing', label: 'Preprocessing' },
  { id: 'understanding', label: 'Understanding plan' },
  { id: 'validating', label: 'Validating geometry' },
  { id: 'review', label: 'Review' },
  { id: 'browser_model', label: 'Browser model' },
  { id: 'artifacts', label: 'Blender artifacts' },
  { id: 'ready', label: 'Ready' },
]

export const ARTIFACT_LABELS = {
  semantic_json: 'Semantic JSON',
  blend: 'Blender file (.blend)',
  glb: '3D model (.glb)',
  thumbnail_high: 'Isometric view (high)',
  thumbnail_low: 'Isometric view (low)',
  report: 'Processing report',
  ifc: 'IFC',
}

export function isConversionRunning(row) {
  return (
    row?.status === CONVERSION_STATUS.QUEUED ||
    row?.status === CONVERSION_STATUS.PROCESSING
  )
}

export function isConversionUsable(row) {
  return (
    row?.status === CONVERSION_STATUS.READY ||
    row?.status === CONVERSION_STATUS.NEEDS_REVIEW
  )
}

// ---------------------------------------------------------------------------
// Chunked upload
// ---------------------------------------------------------------------------
/**
 * Open a resumable upload session.
 *
 * The whole file is declared up front — its size and its SHA-256 — so the
 * server can refuse an over-large upload before a byte arrives, and can verify
 * the assembly against something the browser committed to before it knew
 * whether the transfer would succeed.
 */
export function startUpload({ filename, totalBytes, sha256, mimeType }) {
  return apiClient(FLOORPLAN3D_ENDPOINTS.uploads, {
    method: 'POST',
    body: {
      filename,
      total_bytes: totalBytes,
      sha256,
      mime_type: mimeType || '',
    },
  })
}

/** Which chunks have arrived. What a resume is built on. */
export function getUpload(uploadId) {
  return apiClient(FLOORPLAN3D_ENDPOINTS.upload(uploadId), { method: 'GET' })
}

/**
 * Send one chunk.
 *
 * The body is an ArrayBuffer / Blob slice, and `Content-Type` is set explicitly
 * because `apiClient` only defaults it for JSON. Idempotent: re-sending a chunk
 * overwrites it, which is what makes a resume after a dropped connection safe.
 */
export function uploadChunk(uploadId, index, chunk) {
  return apiClient(FLOORPLAN3D_ENDPOINTS.uploadChunk(uploadId, index), {
    method: 'PUT',
    body: chunk,
    headers: { 'Content-Type': 'application/octet-stream' },
  })
}

/** Assemble, verify the hash, create the source and (by default) start a conversion. */
export function completeUpload(uploadId, { startConversion = true, name } = {}) {
  return apiClient(FLOORPLAN3D_ENDPOINTS.uploadComplete(uploadId), {
    method: 'POST',
    body: {
      start_conversion: startConversion ? 'true' : 'false',
      ...(name ? { name } : {}),
    },
  })
}

export function cancelUpload(uploadId) {
  return apiClient(FLOORPLAN3D_ENDPOINTS.upload(uploadId), { method: 'DELETE' })
}

// ---------------------------------------------------------------------------
// Conversions
// ---------------------------------------------------------------------------
export function listConversions() {
  return apiClient(FLOORPLAN3D_ENDPOINTS.conversions, { method: 'GET' })
}

export function createConversion({ sourceId, name }) {
  return apiClient(FLOORPLAN3D_ENDPOINTS.conversions, {
    method: 'POST',
    body: { source: sourceId, ...(name ? { name } : {}) },
  })
}

/** The editor's payload: the conversion, its document and its artifacts. */
export function getConversion(conversionId) {
  return apiClient(FLOORPLAN3D_ENDPOINTS.conversion(conversionId), { method: 'GET' })
}

/** The poll endpoint. About 200 bytes; no document, no artifacts. */
export function getProgress(conversionId) {
  return apiClient(FLOORPLAN3D_ENDPOINTS.progress(conversionId), { method: 'GET' })
}

export function archiveConversion(conversionId) {
  return apiClient(FLOORPLAN3D_ENDPOINTS.conversion(conversionId), {
    method: 'DELETE',
  })
}

// ---------------------------------------------------------------------------
// Revisions
// ---------------------------------------------------------------------------
export function getCurrentRevision(conversionId) {
  return apiClient(FLOORPLAN3D_ENDPOINTS.currentRevision(conversionId), {
    method: 'GET',
  })
}

export function listRevisions(conversionId) {
  return apiClient(FLOORPLAN3D_ENDPOINTS.revisions(conversionId), { method: 'GET' })
}

export function getRevision(conversionId, revisionId) {
  return apiClient(FLOORPLAN3D_ENDPOINTS.revision(conversionId, revisionId), {
    method: 'GET',
  })
}

/**
 * Save a browser edit as a new immutable revision.
 *
 * The server re-runs the same deterministic repair the pipeline runs, so the
 * response may contain a document that differs slightly from what was sent —
 * and `warnings` says how. The caller must adopt the RETURNED document rather
 * than keeping its own, or the editor and the database diverge.
 */
export function saveRevision(conversionId, { document, changeSummary, parentRevision }) {
  return apiClient(FLOORPLAN3D_ENDPOINTS.revisions(conversionId), {
    method: 'POST',
    body: {
      document,
      ...(changeSummary ? { change_summary: changeSummary } : {}),
      ...(parentRevision ? { parent_revision: parentRevision } : {}),
    },
  })
}

/** Validate an edit without storing it. */
export function validateDocument(conversionId, document) {
  return apiClient(FLOORPLAN3D_ENDPOINTS.validate(conversionId), {
    method: 'POST',
    body: { document },
  })
}

/** Rescale the whole document from two points the user measured. */
/**
 * Settle the document's scale, one of the two ways the endpoint accepts.
 *
 * Pass `candidateIndex` to adopt a scale the pipeline already proposed, or
 * `pixelDistance` + `realDistanceMm` for a distance the user measured. Never
 * both: they say different things about where the number came from, and the
 * server refuses the pair rather than picking one.
 */
export function calibrateScale(
  conversionId,
  { candidateIndex, pixelDistance, realDistanceMm },
) {
  const body =
    candidateIndex === undefined || candidateIndex === null
      ? { pixel_distance: pixelDistance, real_distance_mm: realDistanceMm }
      : { candidate_index: candidateIndex }
  return apiClient(FLOORPLAN3D_ENDPOINTS.calibrateScale(conversionId), {
    method: 'POST',
    body,
  })
}

/** Mark elements as human-confirmed, so no later repair overrides them. */
export function confirmElements(conversionId, elementIds) {
  return apiClient(FLOORPLAN3D_ENDPOINTS.confirmElements(conversionId), {
    method: 'POST',
    body: { element_ids: elementIds },
  })
}

// ---------------------------------------------------------------------------
// Artifacts and reference data
// ---------------------------------------------------------------------------
export function listArtifacts(conversionId) {
  return apiClient(FLOORPLAN3D_ENDPOINTS.artifacts(conversionId), { method: 'GET' })
}

/** Queue a Blender run for the current revision. Answers 202. */
export function regenerateArtifacts(conversionId) {
  return apiClient(FLOORPLAN3D_ENDPOINTS.regenerate(conversionId), { method: 'POST' })
}

/**
 * The furniture catalogue.
 *
 * Fetched rather than bundled because the BACKEND owns it: both geometry
 * engines build furniture from the same part specs, so a copy in the frontend
 * bundle is a copy that drifts. See
 * `backend/floorplan3d/blender/geometry/furniture.py`.
 */
export function getAssetCatalog() {
  return apiClient(FLOORPLAN3D_ENDPOINTS.assets, { method: 'GET' })
}

export function getSchema() {
  return apiClient(FLOORPLAN3D_ENDPOINTS.schema, { method: 'GET' })
}

// ---------------------------------------------------------------------------
// Same-origin URLs for <img src> and downloads
// ---------------------------------------------------------------------------
function absolute(path) {
  return `${API_BASE_URL.replace(/\/+$/, '')}${path}`
}

/**
 * An `<img src>` for the original drawing.
 *
 * The route is authenticated by the same cookie the rest of the app uses and it
 * is same-origin through the proxy, so the browser can load it directly — no
 * blob fetch, no object URL to revoke.
 */
export function sourceFileUrl(sourceId) {
  return absolute(FLOORPLAN3D_ENDPOINTS.sourceFile(sourceId))
}

export function artifactUrl(artifactId) {
  return absolute(FLOORPLAN3D_ENDPOINTS.artifactDownload(artifactId))
}

/**
 * Compute a file's SHA-256 in the browser, as lowercase hex.
 *
 * `crypto.subtle` is available on every https origin and on localhost. There is
 * no fallback on purpose: without a hash the server cannot verify the assembly,
 * and an unverified assembly is the failure mode the chunked upload exists to
 * prevent. A caller on an insecure origin gets a clear error instead of a
 * silent downgrade.
 */
export async function sha256Hex(file) {
  if (!globalThis.crypto?.subtle) {
    throw new Error(
      'This browser cannot compute a checksum on an insecure origin. Use https or localhost.',
    )
  }
  const digest = await globalThis.crypto.subtle.digest(
    'SHA-256',
    await file.arrayBuffer(),
  )
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}
